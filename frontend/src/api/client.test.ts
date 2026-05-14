import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';

interface SampleImportRecord extends Record<string, unknown> {
  externalReference: string;
}

interface SampleImportPayload {
  sourceSystem: string;
  records: SampleImportRecord[];
}

const expectedSampleReferencePrefixes = [
  'sample-valid-001-',
  'sample-valid-002-',
  'sample-invalid-negative-hours-',
  'sample-invalid-missing-date-',
  'sample-invalid-excess-hours-'
];

function readImportRequest(call: [RequestInfo | URL, RequestInit?]): SampleImportPayload {
  const [url, init] = call;
  expect(url).toBe('http://localhost:5000/api/time-entries/import');
  expect(init?.method).toBe('POST');
  expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
  expect(typeof init?.body).toBe('string');
  if (typeof init?.body !== 'string') {
    throw new Error('Expected sample import request body to be serialized JSON.');
  }

  return JSON.parse(init.body) as SampleImportPayload;
}

function isBackendShapedImportRecord(record: SampleImportRecord): boolean {
  return !('employeeId' in record) && !('employeeName' in record);
}

describe('createApiClient', () => {
  it('returns clearly marked mock fallback data when the backend is unavailable', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchFn });

    const result = await client.loadDashboardData();

    expect(result.isOffline).toBe(true);
    expect(result.message).toContain('Failed to fetch');
    expect(result.data.projects.length).toBeGreaterThan(0);
    expect(result.data.integrationErrors.length).toBeGreaterThan(0);
    expect(fetchFn).toHaveBeenCalledWith('http://localhost:5000/api/projects/health', undefined);
  });

  it('normalizes backend-shaped project health and integration error responses', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(Response.json({
        projects: [
          {
            projectId: '9f9b0d34-b780-40e6-a510-2ed60d19ef4f',
            projectNumber: 'AEC-2026-001',
            name: 'Central Utility Plant',
            clientName: 'Metro Health Authority',
            marketSector: 'Healthcare',
            projectManager: 'Maya Patel',
            status: 'Active',
            contractValue: 10_000_000,
            costToDate: 7_400_000,
            estimatedCostAtCompletion: 11_250_000,
            budgetUtilizationPercent: 112.5,
            scheduleVarianceDays: 14,
            percentComplete: 64,
            riskStatus: 'RED',
            healthScore: 42,
            healthStatus: 'RED',
            lastUpdatedUtc: '2026-05-12T18:42:00Z'
          },
          {
            projectId: 'green-risk-project',
            projectNumber: 'AEC-2026-002',
            name: 'Low Risk Office Fit-Out',
            clientName: 'City Capital Projects',
            marketSector: 'Civic',
            projectManager: 'Dana Lee',
            status: 'Active',
            contractValue: 5_000_000,
            costToDate: 2_000_000,
            estimatedCostAtCompletion: 4_000_000,
            scheduleVarianceDays: -2,
            percentComplete: 50,
            riskStatus: 'GREEN',
            healthScore: 91,
            healthStatus: 'GREEN',
            lastUpdatedUtc: '2026-05-12T19:42:00Z'
          }
        ]
      }))
      .mockResolvedValueOnce(Response.json({
        items: [
          {
            id: 'err-1',
            sourceSystem: 'Deltek',
            operation: 'TimeEntryImport',
            severity: 'Warning',
            projectNumber: 'AEC-2026-001',
            employeeNumber: 'EMP-1004',
            message: 'Time entry import failed.',
            details: 'Work date is required.',
            externalReference: 'sample-invalid-missing-date',
            occurredAtUtc: '2026-05-13T02:22:00Z'
          }
        ]
      }))
      .mockResolvedValueOnce(Response.json({ items: [] }));
    const client = createApiClient({ baseUrl: 'http://localhost:5000/', fetchFn });

    const result = await client.loadDashboardData();

    expect(result.isOffline).toBe(false);
    expect(result.data.projects[0]).toMatchObject({
      id: '9f9b0d34-b780-40e6-a510-2ed60d19ef4f',
      projectNumber: 'AEC-2026-001',
      name: 'Central Utility Plant',
      clientName: 'Metro Health Authority',
      marketSector: 'Healthcare',
      projectManager: 'Maya Patel',
      status: 'Active',
      contractValue: 10_000_000,
      percentComplete: 64,
      healthStatus: 'Critical',
      healthScore: 42,
      budgetVariancePercent: 12.5,
      scheduleVarianceDays: 14,
      riskStatus: 'RED',
      riskCount: 1,
      criticalRiskCount: 1,
      hasExplicitRiskCounts: false,
      integrationFailureCount: undefined,
      lastUpdatedUtc: '2026-05-12T18:42:00Z'
    });
    expect(result.data.projects[1]).toMatchObject({
      id: 'green-risk-project',
      budgetVariancePercent: -20,
      riskStatus: 'GREEN',
      riskCount: 0,
      criticalRiskCount: 0,
      hasExplicitRiskCounts: false,
      integrationFailureCount: undefined
    });
    expect(fetchFn).toHaveBeenNthCalledWith(2, 'http://localhost:5000/api/integration-errors/recent?limit=6', undefined);
    expect(fetchFn).toHaveBeenNthCalledWith(3, 'http://localhost:5000/api/audit-logs/recent?limit=6', undefined);
    expect(result.data.summary.criticalProjects).toBe(1);
    expect(result.data.integrationErrors[0]).toMatchObject({
      id: 'err-1',
      projectName: 'AEC-2026-001',
      sourceSystem: 'Deltek',
      eventType: 'TimeEntryImport',
      status: 'Partial',
      message: 'Project AEC-2026-001 · Employee EMP-1004 — Time entry import failed. Details: Work date is required.',
      externalReference: 'sample-invalid-missing-date'
    });
  });

  it('posts backend-shaped sample import payloads with unique references across runs', async () => {
    const fetchFn = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => (
      Response.json({ acceptedCount: 2, rejectedCount: 3, correlationId: 'corr-123' })
    ));
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchFn });

    const firstResult = await client.runSampleImport();
    const secondResult = await client.runSampleImport();

    expect(fetchFn).toHaveBeenCalledTimes(2);
    const firstPayload = readImportRequest(fetchFn.mock.calls[0]);
    const secondPayload = readImportRequest(fetchFn.mock.calls[1]);

    expect(firstPayload).toMatchObject({
      sourceSystem: 'ManualImport',
      records: [
        {
          projectNumber: 'AEC-2026-001',
          employeeNumber: 'EMP-1001',
          workDate: '2026-05-11',
          hours: 7.5,
          description: 'Project controls coordination'
        },
        {
          projectNumber: 'AEC-2026-002',
          employeeNumber: 'EMP-1002',
          workDate: '2026-05-11',
          hours: 6,
          description: 'Field progress verification'
        },
        {
          projectNumber: 'AEC-2026-003',
          employeeNumber: 'EMP-1003',
          workDate: '2026-05-11',
          hours: -2,
          description: 'Invalid sample: negative hours should be rejected'
        },
        {
          projectNumber: 'AEC-2026-004',
          employeeNumber: 'EMP-1004',
          workDate: '',
          hours: 4,
          description: 'Invalid sample: missing work date should be rejected'
        },
        {
          projectNumber: 'AEC-2026-005',
          employeeNumber: 'EMP-1005',
          workDate: '2026-05-11',
          hours: 25,
          description: 'Invalid sample: daily hours exceed the accepted range'
        }
      ]
    });

    const firstReferences = firstPayload.records.map((record) => record.externalReference);
    const secondReferences = secondPayload.records.map((record) => record.externalReference);
    expect(firstReferences).toHaveLength(5);
    expect(new Set(firstReferences).size).toBe(5);
    expect(secondReferences).toHaveLength(5);
    expect(new Set(secondReferences).size).toBe(5);
    expect(firstReferences).not.toEqual(secondReferences);
    expect(firstReferences.every((reference, index) => reference.startsWith(expectedSampleReferencePrefixes[index]))).toBe(true);
    expect(secondReferences.every((reference, index) => reference.startsWith(expectedSampleReferencePrefixes[index]))).toBe(true);
    expect([...firstReferences, ...secondReferences].every((reference) => /^[a-z0-9-]+$/.test(reference))).toBe(true);
    expect(firstPayload.records.every(isBackendShapedImportRecord)).toBe(true);
    expect(secondPayload.records.every(isBackendShapedImportRecord)).toBe(true);
    expect(firstResult).toEqual({
      accepted: 2,
      rejected: 3,
      message: 'Import complete: 2 accepted, 3 rejected.',
      correlationId: 'corr-123'
    });
    expect(secondResult).toEqual(firstResult);
  });
});
