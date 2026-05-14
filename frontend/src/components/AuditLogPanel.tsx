import type { AuditLogEntry } from '../types';
import { formatDateTime } from './format';

export function AuditLogPanel({ logs, issue }: { logs: AuditLogEntry[]; issue?: string }) {
  return (
    <section className="panel" aria-labelledby="audit-log-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Traceability</p>
          <h2 id="audit-log-heading">Audit log</h2>
        </div>
      </div>

      {issue ? <p className="inline-alert" role="alert">{issue}</p> : null}

      {logs.length === 0 ? (
        <div className="panel-empty" role="status">No audit log entries returned.</div>
      ) : (
        <ol className="audit-list">
          {logs.map((log) => (
            <li key={log.id}>
              <time dateTime={log.occurredAtUtc}>{formatDateTime(log.occurredAtUtc)}</time>
              <div>
                <strong>{log.action}</strong>
                <p>{log.message}</p>
                <span>{log.actor} · {log.entityType} {log.entityId}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
