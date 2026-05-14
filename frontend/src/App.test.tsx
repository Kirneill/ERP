import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { buildMockDashboardData } from './api/mockData';
import type { DashboardLoadResult, ImportResult, ResetResult } from './types';

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
      rejected: 3,
      message: 'Import complete: 2 accepted, 3 rejected.'
    })),
    resetDemoData: vi.fn(async (): Promise<ResetResult> => ({
      message: 'Demo data reset.'
    }))
  };
}

describe('App', () => {
  it('renders the dashboard with portfolio health data', async () => {
    render(<App client={createReadyClient()} />);

    expect(await screen.findByRole('heading', { name: /project health command center/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run sample import/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset demo data/i })).toBeInTheDocument();
    expect(screen.getByText(/what this proves/i)).toBeInTheDocument();
    expect(screen.getByText(/integration validation/i)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /project health by score/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /audit log/i })).toBeInTheDocument();
    expect(screen.getByText(/sample imports intentionally include rejected rows/i)).toBeInTheDocument();
    expect(screen.getByText(/manual import/i)).toBeInTheDocument();
    expect(screen.getByText(/time entry batch/i)).toBeInTheDocument();
    expect(screen.getAllByText(/north tower hospital expansion/i).length).toBeGreaterThan(0);
  });

  it('clearly labels offline fallback mode', async () => {
    render(<App client={createReadyClient({ isOffline: true, message: 'Network request failed.' })} />);

    expect(await screen.findByText(/demo\/offline mode/i)).toBeInTheDocument();
    expect(screen.getByText(/network request failed/i)).toBeInTheDocument();
  });

  it('runs the sample import and shows success feedback', async () => {
    const user = userEvent.setup();
    const client = createReadyClient();
    render(<App client={client} />);

    await user.click(await screen.findByRole('button', { name: /run sample import/i }));

    expect(client.runSampleImport).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/import complete: 2 accepted, 3 rejected/i)).toBeInTheDocument();
  });

  it('resets demo data, reloads the dashboard, and shows success feedback', async () => {
    const user = userEvent.setup();
    const client = createReadyClient();
    render(<App client={client} />);

    await user.click(await screen.findByRole('button', { name: /reset demo data/i }));

    expect(client.resetDemoData).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/demo data reset/i)).toBeInTheDocument();
    expect(client.loadDashboardData).toHaveBeenCalledTimes(2);
  });

  it('shows a backend-required error before reset when using offline fallback data', async () => {
    const user = userEvent.setup();
    const client = createReadyClient({ isOffline: true, message: 'Network request failed.' });
    render(<App client={client} />);

    await user.click(await screen.findByRole('button', { name: /reset demo data/i }));

    expect(client.resetDemoData).not.toHaveBeenCalled();
    expect(await screen.findByText(/reset demo data requires the backend api/i)).toBeInTheDocument();
  });
});
