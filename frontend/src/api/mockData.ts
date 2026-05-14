import type { AuditLogEntry, DashboardData, IntegrationError, ProjectHealth } from '../types';

export const mockProjects: ProjectHealth[] = [
  {
    id: 'north-tower-hospital',
    projectNumber: 'AEC-2026-014',
    name: 'North Tower Hospital Expansion',
    clientName: 'Metro Health Authority',
    marketSector: 'Healthcare',
    projectManager: 'Maya Patel',
    status: 'Active',
    contractValue: 42_500_000,
    percentComplete: 63,
    healthScore: 68,
    healthStatus: 'AtRisk',
    budgetVariancePercent: 5.8,
    scheduleVarianceDays: 18,
    riskCount: 7,
    criticalRiskCount: 1,
    integrationFailureCount: 2,
    lastUpdatedUtc: '2026-05-12T18:42:00Z'
  },
  {
    id: 'civic-center-retrofit',
    projectNumber: 'AEC-2026-015',
    name: 'Civic Center Seismic Retrofit',
    clientName: 'City Capital Projects',
    marketSector: 'Civic',
    projectManager: 'Dana Lee',
    status: 'Active',
    contractValue: 18_500_000,
    percentComplete: 44,
    healthScore: 81,
    healthStatus: 'Watch',
    budgetVariancePercent: 2.3,
    scheduleVarianceDays: 9,
    riskCount: 4,
    criticalRiskCount: 0,
    integrationFailureCount: 1,
    lastUpdatedUtc: '2026-05-13T01:15:00Z'
  },
  {
    id: 'riverfront-rail',
    projectNumber: 'AEC-2026-021',
    name: 'Riverfront Rail Terminal',
    clientName: 'Harbor Transit Authority',
    marketSector: 'Infrastructure',
    projectManager: 'Owen Brooks',
    status: 'Active',
    contractValue: 76_200_000,
    percentComplete: 37,
    healthScore: 43,
    healthStatus: 'Critical',
    budgetVariancePercent: 11.4,
    scheduleVarianceDays: 42,
    riskCount: 11,
    criticalRiskCount: 3,
    integrationFailureCount: 4,
    lastUpdatedUtc: '2026-05-12T21:05:00Z'
  },
  {
    id: 'west-campus-lab',
    projectNumber: 'AEC-2026-008',
    name: 'West Campus Research Lab',
    clientName: 'State University',
    marketSector: 'Education',
    projectManager: 'Priya Shah',
    status: 'Closing',
    contractValue: 31_800_000,
    percentComplete: 91,
    healthScore: 91,
    healthStatus: 'Healthy',
    budgetVariancePercent: -1.2,
    scheduleVarianceDays: -4,
    riskCount: 1,
    criticalRiskCount: 0,
    integrationFailureCount: 0,
    lastUpdatedUtc: '2026-05-11T14:30:00Z'
  }
];

export const mockIntegrationErrors: IntegrationError[] = [
  {
    id: 'err-procore-rfi-8941',
    projectId: 'north-tower-hospital',
    projectName: 'North Tower Hospital Expansion',
    sourceSystem: 'Procore',
    eventType: 'RfiSync',
    status: 'Failed',
    message: 'External API timeout while syncing 18 open RFIs.',
    externalReference: 'procore-sync-8941',
    occurredAtUtc: '2026-05-13T02:22:00Z',
    durationMs: 30_000
  },
  {
    id: 'err-sage-cost-3310',
    projectId: 'riverfront-rail',
    projectName: 'Riverfront Rail Terminal',
    sourceSystem: 'Sage',
    eventType: 'CostImport',
    status: 'Failed',
    message: 'Cost code 03-410 was rejected because the project phase is closed.',
    externalReference: 'sage-batch-3310',
    occurredAtUtc: '2026-05-12T23:51:00Z',
    durationMs: 8_420
  },
  {
    id: 'err-deltek-labor-1127',
    projectId: 'civic-center-retrofit',
    projectName: 'Civic Center Seismic Retrofit',
    sourceSystem: 'Deltek',
    eventType: 'LaborImport',
    status: 'Partial',
    message: '12 time entries imported; 3 records require PM review.',
    externalReference: 'deltek-payroll-1127',
    occurredAtUtc: '2026-05-12T19:10:00Z',
    durationMs: 3_760
  }
];

export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'audit-import-882',
    actor: 'ManualImport',
    action: 'Imported time entries',
    entityType: 'TimeEntryBatch',
    entityId: 'sample-import-882',
    message: 'Accepted 12 of 15 records from Deltek payroll export.',
    occurredAtUtc: '2026-05-13T02:26:00Z'
  },
  {
    id: 'audit-risk-441',
    actor: 'Maya Patel',
    action: 'Raised risk severity',
    entityType: 'Risk',
    entityId: 'risk-switchgear-delay',
    message: 'Switchgear delivery moved from High to Critical after vendor update.',
    occurredAtUtc: '2026-05-12T20:14:00Z'
  },
  {
    id: 'audit-forecast-293',
    actor: 'Owen Brooks',
    action: 'Updated forecast',
    entityType: 'Project',
    entityId: 'riverfront-rail',
    message: 'Forecast completion moved 21 days due to permitting hold.',
    occurredAtUtc: '2026-05-12T18:05:00Z'
  }
];

export function buildMockDashboardData(): DashboardData {
  const totalContractValue = mockProjects.reduce((sum, project) => sum + project.contractValue, 0);
  const totalForecastOverrun = mockProjects.reduce((sum, project) => {
    const overrun = Math.max(0, project.contractValue * (project.budgetVariancePercent / 100));
    return sum + overrun;
  }, 0);

  return {
    summary: {
      totalProjects: mockProjects.length,
      healthyProjects: mockProjects.filter((project) => project.healthStatus === 'Healthy').length,
      watchProjects: mockProjects.filter((project) => project.healthStatus === 'Watch').length,
      atRiskProjects: mockProjects.filter((project) => project.healthStatus === 'AtRisk').length,
      criticalProjects: mockProjects.filter((project) => project.healthStatus === 'Critical').length,
      totalContractValue,
      totalForecastOverrun,
      averageHealthScore: Math.round(mockProjects.reduce((sum, project) => sum + project.healthScore, 0) / mockProjects.length),
      recentIntegrationFailures: mockIntegrationErrors.filter((error) => error.status !== 'Succeeded').length
    },
    projects: mockProjects,
    integrationErrors: mockIntegrationErrors,
    auditLogs: mockAuditLogs
  };
}
