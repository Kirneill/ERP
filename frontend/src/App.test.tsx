import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { buildMockDashboardData } from './api/mockData';
import type { DashboardLoadResult, ImportResult } from './types';

function createReadyClient(result?: Partial<DashboardLoadResult>) {
  return {
    loadDashboardData: vi.fn(async (): Promise<DashboardLoadResult> => ({
      data: buildMockDashboardData(),
      isOffline: false,
      panelIssues: [],
      ...result
    })),
    runSampleImport: vi.fn(async (): Promise<ImportResult> => ({
      accepted: 2,
      rejected: 2,
      message: 'Import complete: 2 accepted, 2 rejected.'
    }))
  };
}

describe('App', () => {
  it('renders the dashboard with portfolio health data', async () => {
    render(<App client={createReadyClient()} />);

    expect(await screen.findByRole('heading', { name: /project health command center/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run sample import/i })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /project health by score/i })).toBeInTheDocument();
    expect(screen.getAllByText(/north tower hospital expansion/i).length).toBeGreaterThan(0);
  });

  it('clearly labels offline fallback mode', async () => {
    render(<App client={createReadyClient({ isOffline: true, message: 'Network request failed.' })} />);

    expect(await screen.findByText(/demo\/offline mode/i)).toBeInTheDocument();
    expect(screen.getByText(/network request failed/i)).toBeInTheDocument();
  });
});
