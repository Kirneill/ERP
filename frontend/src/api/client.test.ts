import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';

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

  it('posts the backend-shaped sample import payload and normalizes accepted and rejected counts', async () => {
    const fetchFn = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => (
      Response.json({ acceptedCount: 2, rejectedCount: 3, correlationId: 'corr-123' })
    ));
    const client = createApiClient({ baseUrl: 'http://localhost:5000', fetchFn });

    const result = await client.runSampleImport();

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://localhost:5000/api/time-entries/import');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(typeof init?.body).toBe('string');
    if (typeof init?.body !== 'string') {
      throw new Error('Expected sample import request body to be serialized JSON.');
    }

    const payload = JSON.parse(init.body);
    expect(payload).toEqual({
      sourceSystem: 'ManualImport',
      records: [
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
      ]
    });
    expect(payload.records.every((record: Record<string, unknown>) => !('employeeId' in record) && !('employeeName' in record))).toBe(true);
    expect(result).toEqual({
      accepted: 2,
      rejected: 3,
      message: 'Import complete: 2 accepted, 3 rejected.',
      correlationId: 'corr-123'
    });
  });
});
