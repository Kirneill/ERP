import type { AuditLogEntry } from '../types';
import { formatDateTime } from './format';

function formatTraceLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function AuditLogPanel({ logs, issue }: { logs: AuditLogEntry[]; issue?: string }) {
  return (
    <section className="panel" aria-labelledby="audit-log-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Traceability</p>
          <h2 id="audit-log-heading">Audit log</h2>
          <p className="section-kicker">Sample imports intentionally include rejected rows; accepted changes stay traceable here.</p>
        </div>
      </div>

      {issue ? <p className="inline-alert" role="alert">{issue}</p> : null}

      {logs.length === 0 ? (
        <div className="panel-empty" role="status">No audit log entries returned.</div>
      ) : (
        <ol className="audit-list">
          {logs.map((log) => (
            <li key={log.id}>
              <div className="audit-list__card">
                <div className="audit-list__heading">
                  <strong>{log.action}</strong>
                  <time dateTime={log.occurredAtUtc}>{formatDateTime(log.occurredAtUtc)}</time>
                </div>
                <p className="audit-list__message">{log.message}</p>
                <dl className="audit-list__meta" aria-label={`Trace metadata for ${log.action}`}>
                  <div>
                    <dt>Actor</dt>
                    <dd>{formatTraceLabel(log.actor)}</dd>
                  </div>
                  <div>
                    <dt>Entity</dt>
                    <dd>
                      <span>{formatTraceLabel(log.entityType)}</span>
                      <code>{log.entityId}</code>
                    </dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
