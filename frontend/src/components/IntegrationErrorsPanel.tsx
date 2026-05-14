import type { IntegrationError } from '../types';
import { formatDateTime } from './format';

export function IntegrationErrorsPanel({ errors, issue }: { errors: IntegrationError[]; issue?: string }) {
  const downloadExceptionReport = () => {
    downloadCsv('integration-exception-report.csv', buildExceptionReportCsv(errors));
  };

  return (
    <section className="panel" aria-labelledby="integration-errors-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">External systems</p>
          <h2 id="integration-errors-heading">Recent integration errors</h2>
        </div>
        {errors.length > 0 ? (
          <button className="secondary-button secondary-button--compact" type="button" onClick={downloadExceptionReport}>
            Download exception report
          </button>
        ) : null}
      </div>

      {issue ? <p className="inline-alert" role="alert">{issue}</p> : null}

      {errors.length === 0 ? (
        <div className="panel-empty" role="status">No recent integration errors returned.</div>
      ) : (
        <ul className="event-list event-list--bounded">
          {errors.map((error) => (
            <li key={error.id}>
              <div className="event-list__marker" aria-hidden="true" />
              <div>
                <strong>{error.sourceSystem} · {error.eventType}</strong>
                <p>{error.message}</p>
                <span>{error.projectName} · {error.externalReference} · {formatDateTime(error.occurredAtUtc)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const exceptionReportColumns = [
  'sourceSystem',
  'eventType',
  'status',
  'project',
  'externalReference',
  'message',
  'occurredAtUtc'
] as const;

function buildExceptionReportCsv(errors: IntegrationError[]): string {
  const rows = errors.map((error) => [
    error.sourceSystem,
    error.eventType,
    error.status,
    error.projectName,
    error.externalReference,
    error.message,
    error.occurredAtUtc
  ]);

  return [exceptionReportColumns, ...rows]
    .map((row) => row.map(formatCsvValue).join(','))
    .join('\r\n');
}

function formatCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
