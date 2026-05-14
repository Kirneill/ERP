import type { IntegrationError } from '../types';
import { formatDateTime } from './format';

export function IntegrationErrorsPanel({ errors, issue }: { errors: IntegrationError[]; issue?: string }) {
  return (
    <section className="panel" aria-labelledby="integration-errors-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">External systems</p>
          <h2 id="integration-errors-heading">Recent integration errors</h2>
        </div>
      </div>

      {issue ? <p className="inline-alert" role="alert">{issue}</p> : null}

      {errors.length === 0 ? (
        <div className="panel-empty" role="status">No recent integration errors returned.</div>
      ) : (
        <ul className="event-list">
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
