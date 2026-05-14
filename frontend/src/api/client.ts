import { buildMockDashboardData } from './mockData';
import type {
  AuditLogEntry,
  DashboardData,
  DashboardLoadResult,
  DashboardSummary,
  HealthStatus,
  ImportResult,
  IntegrationError,
  PanelLoadIssue,
  ProjectHealth
} from '../types';

const DEFAULT_API_BASE_URL = 'http://localhost:5000';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface ApiClientOptions {
  baseUrl?: string;
  fetchFn?: FetchLike;
}

interface ApiClient {
  loadDashboardData: () => Promise<DashboardLoadResult>;
  runSampleImport: () => Promise<ImportResult>;
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly endpoint: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const RECENT_PANEL_LIMIT = 6;

interface SampleImportRecordTemplate {
  projectNumber: string;
  employeeNumber: string;
  workDate: string;
  hours: number;
  externalReference: string;
  description: string;
}

const sampleImportRecordTemplates: SampleImportRecordTemplate[] = [
  {
    projectNumber: 'AEC-2026-001',
    employeeNumber: 'EMP-1001',
    workDate: '2026-05-11',
    hours: 7.5,
    externalReference: 'sample-valid-001',
    description: 'Project controls coordination'
  },
  {
    projectNumber: 'AEC-2026-002',
    employeeNumber: 'EMP-1002',
    workDate: '2026-05-11',
    hours: 6,
    externalReference: 'sample-valid-002',
    description: 'Field progress verification'
  },
  {
    projectNumber: 'AEC-2026-003',
    employeeNumber: 'EMP-1003',
    workDate: '2026-05-11',
    hours: -2,
    externalReference: 'sample-invalid-negative-hours',
    description: 'Invalid sample: negative hours should be rejected'
  },
  {
    projectNumber: 'AEC-2026-004',
    employeeNumber: 'EMP-1004',
    workDate: '',
    hours: 4,
    externalReference: 'sample-invalid-missing-date',
    description: 'Invalid sample: missing work date should be rejected'
  },
  {
    projectNumber: 'AEC-2026-005',
    employeeNumber: 'EMP-1005',
    workDate: '2026-05-11',
    hours: 25,
    externalReference: 'sample-invalid-excess-hours',
    description: 'Invalid sample: daily hours exceed the accepted range'
  }
];

let sampleImportRunSequence = 0;

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? getConfiguredBaseUrl());
  const fetchFn = options.fetchFn ?? fetch.bind(globalThis);

  return {
    async loadDashboardData() {
      const [projectResult, integrationResult, auditResult] = await Promise.allSettled([
        getJson(fetchFn, baseUrl, '/api/projects/health'),
        getJson(fetchFn, baseUrl, `/api/integration-errors/recent?limit=${RECENT_PANEL_LIMIT}`),
        getJson(fetchFn, baseUrl, `/api/audit-logs/recent?limit=${RECENT_PANEL_LIMIT}`)
      ]);

      if (projectResult.status === 'rejected') {
        return {
          data: buildMockDashboardData(),
          isOffline: true,
          message: formatOfflineMessage(projectResult.reason),
          panelIssues: []
        };
      }

      const { projects, summary } = normalizeProjectHealthResponse(projectResult.value);
      const panelIssues: PanelLoadIssue[] = [];

      const integrationErrors = integrationResult.status === 'fulfilled'
        ? normalizeIntegrationErrors(integrationResult.value)
        : collectPanelIssue(panelIssues, 'integration-errors', integrationResult.reason);

      const auditLogs = auditResult.status === 'fulfilled'
        ? normalizeAuditLogs(auditResult.value)
        : collectPanelIssue(panelIssues, 'audit-logs', auditResult.reason);

      const data: DashboardData = {
        projects,
        summary: summary ?? summarizeProjects(projects, integrationErrors),
        integrationErrors,
        auditLogs
      };

      return {
        data,
        isOffline: false,
        panelIssues
      };
    },

    async runSampleImport() {
      const response = await getJson(fetchFn, baseUrl, '/api/time-entries/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSampleImportPayload())
      });

      return normalizeImportResult(response);
    }
  };
}

function buildSampleImportPayload() {
  const runId = createSampleImportRunId();

  return {
    sourceSystem: 'ManualImport',
    records: sampleImportRecordTemplates.map((record) => ({
      ...record,
      externalReference: `${record.externalReference}-${runId}`
    }))
  };
}

function createSampleImportRunId(): string {
  sampleImportRunSequence = sampleImportRunSequence >= Number.MAX_SAFE_INTEGER ? 1 : sampleImportRunSequence + 1;
  const timestamp = Date.now().toString(36);
  const randomId = Math.random().toString(36).slice(2, 8) || '000000';

  return `${timestamp}-${sampleImportRunSequence.toString(36)}-${randomId}`;
}

async function getJson(fetchFn: FetchLike, baseUrl: string, endpoint: string, init?: RequestInit): Promise<unknown> {
  const response = await fetchFn(`${baseUrl}${endpoint}`, init);
  if (!response.ok) {
    throw new ApiError(`Request failed with ${response.status}`, endpoint, response.status);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json() as Promise<unknown>;
}

function getConfiguredBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

function collectPanelIssue(panelIssues: PanelLoadIssue[], panel: PanelLoadIssue['panel'], reason: unknown): [] {
  panelIssues.push({ panel, message: formatOfflineMessage(reason) });
  return [];
}

function formatOfflineMessage(reason: unknown): string {
  if (reason instanceof ApiError) {
    return `${reason.endpoint} returned ${reason.status ?? 'an error'}.`;
  }

  if (reason instanceof Error) {
    return reason.message;
  }

  return 'The API is unavailable.';
}

function normalizeProjectHealthResponse(raw: unknown): { projects: ProjectHealth[]; summary?: DashboardSummary } {
  const record = asRecord(raw);
  const projectItems = readArrayPayload(raw, ['projects', 'items', 'data', 'projectHealth']);
  const projects = projectItems.map((item, index) => normalizeProject(item, index));
  const summaryRecord = record ? asRecord(record.summary) ?? asRecord(record.dashboardSummary) : undefined;

  return {
    projects,
    summary: summaryRecord ? normalizeSummary(summaryRecord, projects) : undefined
  };
}

function normalizeProject(raw: unknown, index: number): ProjectHealth {
  const record = asRecord(raw) ?? {};
  const id = readString(record, ['projectId', 'id']) || `project-${index + 1}`;
  const contractValue = readNumber(record, ['contractValue', 'contractAmount']);
  const estimatedCostAtCompletion = readOptionalNumber(record, ['estimatedCostAtCompletion', 'forecastCostAtCompletion']);
  const budgetUtilizationPercent = readOptionalNumber(record, ['budgetUtilizationPercent']);
  const budgetVariancePercent = deriveBudgetVariancePercent({
    explicitVariance: readOptionalNumber(record, ['budgetVariancePercent', 'budgetVariance']),
    budgetUtilizationPercent,
    estimatedCostAtCompletion,
    contractValue
  });
  const riskStatus = readString(record, ['riskStatus']);
  const explicitRiskCount = readOptionalNumber(record, ['riskCount', 'openRiskCount']);
  const explicitCriticalRiskCount = readOptionalNumber(record, ['criticalRiskCount']);
  const riskCounts = deriveRiskCounts({
    riskStatus,
    riskCount: explicitRiskCount,
    criticalRiskCount: explicitCriticalRiskCount
  });
  const integrationFailureCount = readOptionalNumber(record, ['integrationFailureCount', 'recentIntegrationFailures']);

  return {
    id,
    projectNumber: readString(record, ['projectNumber', 'number']) || `AEC-2026-${String(index + 1).padStart(3, '0')}`,
    name: readString(record, ['name', 'projectName']) || 'Unnamed project',
    clientName: readString(record, ['clientName', 'client']) || 'Client pending',
    marketSector: readString(record, ['marketSector', 'sector']) || 'AEC',
    projectManager: readString(record, ['projectManager', 'manager', 'pm']) || 'Unassigned',
    status: readString(record, ['status']) || 'Active',
    contractValue,
    percentComplete: clamp(readNumber(record, ['percentComplete', 'completionPercent']), 0, 100),
    healthScore: clamp(readNumber(record, ['healthScore', 'score']), 0, 100),
    healthStatus: normalizeHealthStatus(readString(record, ['healthStatus', 'statusBand', 'health']) || 'Watch'),
    budgetVariancePercent,
    scheduleVarianceDays: readNumber(record, ['scheduleVarianceDays', 'scheduleVariance']),
    riskStatus: riskStatus || undefined,
    riskCount: riskCounts.riskCount,
    criticalRiskCount: riskCounts.criticalRiskCount,
    hasExplicitRiskCounts: explicitRiskCount !== undefined || explicitCriticalRiskCount !== undefined,
    integrationFailureCount,
    lastUpdatedUtc: readString(record, ['lastUpdatedUtc', 'calculatedAtUtc', 'updatedAtUtc']) || new Date(0).toISOString()
  };
}

function deriveBudgetVariancePercent({
  explicitVariance,
  budgetUtilizationPercent,
  estimatedCostAtCompletion,
  contractValue
}: {
  explicitVariance?: number;
  budgetUtilizationPercent?: number;
  estimatedCostAtCompletion?: number;
  contractValue: number;
}): number {
  if (explicitVariance !== undefined) return explicitVariance;
  if (budgetUtilizationPercent !== undefined) return budgetUtilizationPercent - 100;
  if (estimatedCostAtCompletion !== undefined && contractValue > 0) {
    return (estimatedCostAtCompletion / contractValue) * 100 - 100;
  }

  return 0;
}

function deriveRiskCounts({
  riskStatus,
  riskCount,
  criticalRiskCount
}: {
  riskStatus: string;
  riskCount?: number;
  criticalRiskCount?: number;
}): { riskCount: number; criticalRiskCount: number } {
  if (riskCount !== undefined || criticalRiskCount !== undefined) {
    return {
      riskCount: riskCount ?? criticalRiskCount ?? 0,
      criticalRiskCount: criticalRiskCount ?? 0
    };
  }

  const key = riskStatus.toLowerCase().replace(/[\s_-]/g, '');
  if (!key || key === 'none' || key === 'low' || key === 'healthy' || key === 'green') {
    return { riskCount: 0, criticalRiskCount: 0 };
  }

  if (key === 'critical' || key === 'red') {
    return { riskCount: 1, criticalRiskCount: 1 };
  }

  return { riskCount: 1, criticalRiskCount: 0 };
}

function normalizeSummary(record: Record<string, unknown>, projects: ProjectHealth[]): DashboardSummary {
  const computed = summarizeProjects(projects, []);

  return {
    totalProjects: readNumber(record, ['totalProjects']) || computed.totalProjects,
    healthyProjects: readNumber(record, ['healthyProjects']) || computed.healthyProjects,
    watchProjects: readNumber(record, ['watchProjects']) || computed.watchProjects,
    atRiskProjects: readNumber(record, ['atRiskProjects']) || computed.atRiskProjects,
    criticalProjects: readNumber(record, ['criticalProjects']) || computed.criticalProjects,
    totalContractValue: readNumber(record, ['totalContractValue']) || computed.totalContractValue,
    totalForecastOverrun: readNumber(record, ['totalForecastOverrun']) || computed.totalForecastOverrun,
    averageHealthScore: readNumber(record, ['averageHealthScore']) || computed.averageHealthScore,
    recentIntegrationFailures: readNumber(record, ['recentIntegrationFailures']) || computed.recentIntegrationFailures
  };
}

function normalizeIntegrationErrors(raw: unknown): IntegrationError[] {
  return readArrayPayload(raw, ['items', 'errors', 'integrationErrors', 'data']).map((item, index) => {
    const record = asRecord(item) ?? {};
    const projectNumber = readString(record, ['projectNumber']);
    const employeeNumber = readString(record, ['employeeNumber']);
    const message = readString(record, ['message']);
    const details = readString(record, ['details', 'detail']);
    const messageDetails = formatMessageDetails(message, details);

    return {
      id: readString(record, ['id']) || `integration-error-${index + 1}`,
      projectId: readString(record, ['projectId']) || undefined,
      projectName: readString(record, ['projectName', 'project']) || projectNumber || 'Unassigned project',
      sourceSystem: readString(record, ['sourceSystem']) || 'External system',
      eventType: readString(record, ['eventType', 'type', 'operation']) || 'Sync',
      status: normalizeIntegrationStatus(readString(record, ['status', 'severity']) || 'Failed'),
      message: formatIntegrationErrorMessage(messageDetails, projectNumber, employeeNumber),
      externalReference: readString(record, ['externalReference', 'reference']) || 'not provided',
      occurredAtUtc: readString(record, ['occurredAtUtc', 'createdAtUtc', 'timestampUtc']) || new Date(0).toISOString(),
      durationMs: readNumber(record, ['durationMs'])
    };
  });
}

function formatMessageDetails(message: string, details: string): string {
  if (message && details && message !== details) return `${message} Details: ${details}`;
  return message || details || 'Integration event reported without additional details.';
}

function formatIntegrationErrorMessage(details: string, projectNumber: string, employeeNumber: string): string {
  const context = [
    projectNumber ? `Project ${projectNumber}` : '',
    employeeNumber ? `Employee ${employeeNumber}` : ''
  ].filter(Boolean);

  return context.length > 0 ? `${context.join(' · ')} — ${details}` : details;
}

function normalizeAuditLogs(raw: unknown): AuditLogEntry[] {
  return readArrayPayload(raw, ['items', 'logs', 'auditLogs', 'data']).map((item, index) => {
    const record = asRecord(item) ?? {};

    return {
      id: readString(record, ['id']) || `audit-log-${index + 1}`,
      actor: readString(record, ['actor', 'userName', 'source']) || 'System',
      action: readString(record, ['action', 'eventName']) || 'Updated record',
      entityType: readString(record, ['entityType', 'resourceType']) || 'Record',
      entityId: readString(record, ['entityId', 'resourceId']) || 'unknown',
      message: readString(record, ['message', 'description']) || 'Audit entry recorded.',
      occurredAtUtc: readString(record, ['occurredAtUtc', 'createdAtUtc', 'timestampUtc']) || new Date(0).toISOString()
    };
  });
}

function normalizeImportResult(raw: unknown): ImportResult {
  const record = asRecord(raw) ?? {};
  const accepted = readNumber(record, ['accepted', 'acceptedCount', 'createdCount', 'succeeded']);
  const rejected = readNumber(record, ['rejected', 'rejectedCount', 'failedCount', 'errors']);

  return {
    accepted,
    rejected,
    message: readString(record, ['message', 'summary']) || `Import complete: ${accepted} accepted, ${rejected} rejected.`,
    correlationId: readString(record, ['correlationId', 'requestId']) || undefined
  };
}

function summarizeProjects(projects: ProjectHealth[], integrationErrors: IntegrationError[]): DashboardSummary {
  const totalContractValue = projects.reduce((sum, project) => sum + project.contractValue, 0);
  const totalForecastOverrun = projects.reduce((sum, project) => {
    const overrun = Math.max(0, project.contractValue * (project.budgetVariancePercent / 100));
    return sum + overrun;
  }, 0);

  return {
    totalProjects: projects.length,
    healthyProjects: projects.filter((project) => project.healthStatus === 'Healthy').length,
    watchProjects: projects.filter((project) => project.healthStatus === 'Watch').length,
    atRiskProjects: projects.filter((project) => project.healthStatus === 'AtRisk').length,
    criticalProjects: projects.filter((project) => project.healthStatus === 'Critical').length,
    totalContractValue,
    totalForecastOverrun,
    averageHealthScore: projects.length === 0
      ? 0
      : Math.round((projects.reduce((sum, project) => sum + project.healthScore, 0) / projects.length) * 10) / 10,
    recentIntegrationFailures: integrationErrors.filter((error) => error.status !== 'Succeeded').length
  };
}

function normalizeHealthStatus(value: string): HealthStatus {
  const key = value.toLowerCase().replace(/[\s_-]/g, '');
  if (key === 'healthy' || key === 'green') return 'Healthy';
  if (key === 'critical' || key === 'red') return 'Critical';
  if (key === 'atrisk' || key === 'orange') return 'AtRisk';
  return 'Watch';
}

function normalizeIntegrationStatus(value: string): IntegrationError['status'] {
  const key = value.toLowerCase().replace(/[\s_-]/g, '');
  if (key === 'succeeded' || key === 'success' || key === 'info' || key === 'informational') return 'Succeeded';
  if (key === 'partial' || key === 'warning' || key === 'warn') return 'Partial';
  return 'Failed';
}

function readArrayPayload(raw: unknown, keys: string[]): unknown[] {
  if (Array.isArray(raw)) return raw;

  const record = asRecord(raw);
  if (!record) return [];

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }

  return [];
}

function readString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
  }

  return '';
}

function readNumber(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return 0;
}

function readOptionalNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
