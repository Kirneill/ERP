import type { HealthStatus } from '../types';

const statusLabels: Record<HealthStatus, string> = {
  Healthy: 'Healthy',
  Watch: 'Watch',
  AtRisk: 'At risk',
  Critical: 'Critical'
};

export function HealthBadge({ status }: { status: HealthStatus }) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`} aria-label={`Health status: ${statusLabels[status]}`}>
      <span aria-hidden="true" className="status-badge__dot" />
      {statusLabels[status]}
    </span>
  );
}
