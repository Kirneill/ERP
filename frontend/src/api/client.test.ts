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

  it('normalizes successful project health responses', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ items: [{ id: 'p-1', projectNumber: 'AEC-1', name: 'Library Renovation', healthStatus: 'Critical', healthScore: 41 }] }))
      .mockResolvedValueOnce(Response.json({ items: [] }))
      .mockResolvedValueOnce(Response.json({ items: [] }));
    const client = createApiClient({ baseUrl: 'http://localhost:5000/', fetchFn });

    const result = await client.loadDashboardData();

    expect(result.isOffline).toBe(false);
    expect(result.data.projects[0]).toMatchObject({
      id: 'p-1',
      projectNumber: 'AEC-1',
      name: 'Library Renovation',
      healthStatus: 'Critical',
      healthScore: 41
    });
    expect(result.data.summary.criticalProjects).toBe(1);
  });
});
