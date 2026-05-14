import { useCallback, useEffect, useState } from 'react';
import { createApiClient } from './api/client';
import { Dashboard } from './components/Dashboard';
import { ErrorState, LoadingState } from './components/StateBlocks';
import type { DashboardLoadResult, ImportResult } from './types';

const defaultClient = createApiClient();

type ApiClient = ReturnType<typeof createApiClient>;

interface AppProps {
  client?: ApiClient;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; result: DashboardLoadResult }
  | { status: 'error'; message: string };

export function App({ client = defaultClient }: AppProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | undefined>();
  const [importError, setImportError] = useState<string | undefined>();

  const loadDashboard = useCallback(async () => {
    setLoadState({ status: 'loading' });
    try {
      const result = await client.loadDashboardData();
      setLoadState({ status: 'ready', result });
    } catch (error) {
      setLoadState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Dashboard data could not be loaded.'
      });
    }
  }, [client]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const runImport = async () => {
    setIsImporting(true);
    setImportResult(undefined);
    setImportError(undefined);

    try {
      const result = await client.runSampleImport();
      setImportResult(result);
      await loadDashboard();
    } catch (error) {
      setImportError(error instanceof Error
        ? `Sample import failed: ${error.message}`
        : 'Sample import failed. Verify the backend API is running.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <main className="app-shell">
      {loadState.status === 'loading' ? <LoadingState /> : null}
      {loadState.status === 'error' ? (
        <ErrorState
          title="Dashboard unavailable"
          message={loadState.message}
          onRetry={loadDashboard}
        />
      ) : null}
      {loadState.status === 'ready' ? (
        <Dashboard
          data={loadState.result.data}
          isOffline={loadState.result.isOffline}
          offlineMessage={loadState.result.message}
          panelIssues={loadState.result.panelIssues}
          isImporting={isImporting}
          importResult={importResult}
          importError={importError}
          onRunImport={runImport}
        />
      ) : null}
    </main>
  );
}
