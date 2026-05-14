import type { DashboardData, ImportResult, PanelLoadIssue, ResetResult } from '../types';
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
  isResetting: boolean;
  importResult?: ImportResult;
  resetResult?: ResetResult;
  importError?: string;
  resetError?: string;
  onRunImport: () => void;
  onResetDemoData: () => void;
}

export function Dashboard({
  data,
  isOffline,
  offlineMessage,
  panelIssues,
  isImporting,
  isResetting,
  importResult,
  resetResult,
  importError,
  resetError,
  onRunImport,
  onResetDemoData
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
          <div className="hero-action-buttons">
            <button className="primary-button" type="button" onClick={onRunImport} disabled={isImporting || isResetting}>
              {isImporting ? 'Running import…' : 'Run sample import'}
            </button>
            <button className="secondary-button" type="button" onClick={onResetDemoData} disabled={isImporting || isResetting}>
              {isResetting ? 'Resetting…' : 'Reset demo data'}
            </button>
          </div>
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
        {resetResult ? <p className="success-message">{resetResult.message}</p> : null}
        {importError ? <p className="error-message" role="alert">{importError}</p> : null}
        {resetError ? <p className="error-message" role="alert">{resetError}</p> : null}
      </div>

      <KpiSummary summary={data.summary} />

      <details className="proof-panel" open>
        <summary>
          <span>What this proves</span>
          <small>Business signal to production path</small>
        </summary>
        <div className="proof-grid">
          <p><strong>Business signal</strong> Health bands translate budget, schedule, and risk into one prioritization view.</p>
          <p><strong>Integration validation</strong> The import accepts usable rows and rejects bad references, hours, and dates at the API boundary.</p>
          <p><strong>Exception management</strong> Failed rows remain visible as actionable integration errors instead of disappearing into logs.</p>
          <p><strong>Traceability</strong> Accepted imports and batch outcomes create audit entries for reviewer confidence.</p>
          <p><strong>Production next steps</strong> Add auth/RBAC, real ERP connectors, monitoring, and deployment controls.</p>
        </div>
      </details>

      <div className="dashboard-grid">
        <ProjectHealthTable projects={data.projects} />
        <AtRiskPanel projects={data.projects} />
        <IntegrationErrorsPanel errors={data.integrationErrors} issue={integrationIssue} />
        <AuditLogPanel logs={data.auditLogs} issue={auditIssue} />
      </div>
    </>
  );
}
