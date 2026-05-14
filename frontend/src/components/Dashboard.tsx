import type { DashboardData, ImportResult, PanelLoadIssue } from '../types';
import { AtRiskPanel } from './AtRiskPanel';
import { AuditLogPanel } from './AuditLogPanel';
import { IntegrationErrorsPanel } from './IntegrationErrorsPanel';
import { KpiSummary } from './KpiSummary';
import { ProjectHealthTable } from './ProjectHealthTable';

interface DashboardProps {
  data: DashboardData;
  isOffline: boolean;
  offlineMessage?: string;
  panelIssues: PanelLoadIssue[];
  isImporting: boolean;
  importResult?: ImportResult;
  importError?: string;
  onRunImport: () => void;
}

export function Dashboard({
  data,
  isOffline,
  offlineMessage,
  panelIssues,
  isImporting,
  importResult,
  importError,
  onRunImport
}: DashboardProps) {
  const integrationIssue = panelIssues.find((issue) => issue.panel === 'integration-errors')?.message;
  const auditIssue = panelIssues.find((issue) => issue.panel === 'audit-logs')?.message;

  return (
    <>
      <header className="hero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">AEC ERP project controls</p>
          <h1 id="page-title">Project health command center</h1>
          <p className="hero-copy">
            Stop budget drift and integration noise from hiding in disconnected tools. This dashboard brings project
            health, import quality, and audit activity into one operational view.
          </p>
        </div>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={onRunImport} disabled={isImporting}>
            {isImporting ? 'Running import…' : 'Run sample import'}
          </button>
          <p>Posts mixed valid and invalid time entries to the API.</p>
        </div>
      </header>

      {isOffline ? (
        <section className="offline-banner" role="status" aria-live="polite">
          <strong>Demo/offline mode</strong>
          <span>{offlineMessage ?? 'The backend API is unavailable, so realistic mock data is shown.'}</span>
        </section>
      ) : null}

      <div className="import-feedback" aria-live="polite">
        {importResult ? (
          <p className="success-message">
            {importResult.message} {importResult.correlationId ? <span>Correlation: {importResult.correlationId}</span> : null}
          </p>
        ) : null}
        {importError ? <p className="error-message" role="alert">{importError}</p> : null}
      </div>

      <KpiSummary summary={data.summary} />

      <div className="dashboard-grid">
        <ProjectHealthTable projects={data.projects} />
        <AtRiskPanel projects={data.projects} />
        <IntegrationErrorsPanel errors={data.integrationErrors} issue={integrationIssue} />
        <AuditLogPanel logs={data.auditLogs} issue={auditIssue} />
      </div>
    </>
  );
}
