export type HealthStatus = 'Healthy' | 'Watch' | 'AtRisk' | 'Critical';

export interface ProjectHealth {
  id: string;
  projectNumber: string;
  name: string;
  clientName: string;
  marketSector: string;
  projectManager: string;
  status: string;
  contractValue: number;
  percentComplete: number;
  healthScore: number;
  healthStatus: HealthStatus;
  budgetVariancePercent: number;
  scheduleVarianceDays: number;
  riskStatus?: string;
  riskCount: number;
  criticalRiskCount: number;
  hasExplicitRiskCounts?: boolean;
  integrationFailureCount?: number;
  lastUpdatedUtc: string;
}

export interface DashboardSummary {
  totalProjects: number;
  healthyProjects: number;
  watchProjects: number;
  atRiskProjects: number;
  criticalProjects: number;
  totalContractValue: number;
  totalForecastOverrun: number;
  averageHealthScore: number;
  recentIntegrationFailures: number;
}

export interface IntegrationError {
  id: string;
  projectId?: string;
  projectName: string;
  sourceSystem: string;
  eventType: string;
  status: 'Failed' | 'Partial' | 'Succeeded';
  message: string;
  externalReference: string;
  occurredAtUtc: string;
  durationMs: number;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  occurredAtUtc: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  projects: ProjectHealth[];
  integrationErrors: IntegrationError[];
  auditLogs: AuditLogEntry[];
}

export interface PanelLoadIssue {
  panel: 'integration-errors' | 'audit-logs';
  message: string;
}

export interface DashboardLoadResult {
  data: DashboardData;
  isOffline: boolean;
  message?: string;
  panelIssues: PanelLoadIssue[];
}

export interface ImportResult {
  accepted: number;
  rejected: number;
  message: string;
  correlationId?: string;
}
