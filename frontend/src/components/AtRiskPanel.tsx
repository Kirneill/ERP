import type { ProjectHealth } from '../types';
import { formatDays, formatPercent } from './format';
import { HealthBadge } from './HealthBadge';

export function AtRiskPanel({ projects }: { projects: ProjectHealth[] }) {
  const atRiskProjects = projects
    .filter((project) => project.healthStatus === 'AtRisk' || project.healthStatus === 'Critical')
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, 4);

  return (
    <section className="panel" aria-labelledby="at-risk-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Management focus</p>
          <h2 id="at-risk-heading">At-risk projects</h2>
        </div>
      </div>

      {atRiskProjects.length === 0 ? (
        <div className="panel-empty" role="status">No at-risk projects. Keep monitoring forecast changes.</div>
      ) : (
        <ul className="risk-list" aria-label="At-risk project drivers">
          {atRiskProjects.map((project) => (
            <li key={project.id}>
              <div>
                <strong>{project.name}</strong>
                <span>{project.projectManager} · {project.marketSector}</span>
              </div>
              <HealthBadge status={project.healthStatus} />
              <dl>
                <div>
                  <dt>Budget</dt>
                  <dd>{formatPercent(project.budgetVariancePercent)}</dd>
                </div>
                <div>
                  <dt>Schedule</dt>
                  <dd>{formatDays(project.scheduleVarianceDays)}</dd>
                </div>
                <div>
                  <dt>Risks</dt>
                  <dd>{formatRiskSummary(project)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatRiskSummary(project: ProjectHealth): string {
  if (!project.hasExplicitRiskCounts && project.riskStatus) {
    const normalized = project.riskStatus.toLowerCase();
    return `${normalized.charAt(0).toUpperCase() + normalized.slice(1)} status`;
  }

  return `${project.criticalRiskCount} critical`;
}
