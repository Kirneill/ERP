import type { ProjectHealth } from '../types';
import { formatCurrency, formatDays, formatPercent } from './format';
import { HealthBadge } from './HealthBadge';
import { EmptyState } from './StateBlocks';

interface ProjectHealthTableProps {
  projects: ProjectHealth[];
}

export function ProjectHealthTable({ projects }: ProjectHealthTableProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="No project health data yet"
        message="Start the backend API with seeded projects or run an import to populate this dashboard."
      />
    );
  }

  return (
    <section className="panel panel--wide" aria-labelledby="project-health-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Project controls</p>
          <h2 id="project-health-heading">Project health</h2>
        </div>
        <p>{projects.length} tracked projects</p>
      </div>

      <div className="table-wrap">
        <table>
          <caption>Project health by score, budget variance, schedule variance, risk count, and integration failures</caption>
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Health</th>
              <th scope="col">Score</th>
              <th scope="col">Budget</th>
              <th scope="col">Schedule</th>
              <th scope="col">Risks</th>
              <th scope="col">Sync fails</th>
              <th scope="col">Progress</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <th scope="row">
                  <span className="project-name">{project.name}</span>
                  <span className="project-meta">{project.projectNumber} · {project.clientName}</span>
                </th>
                <td><HealthBadge status={project.healthStatus} /></td>
                <td className="number-cell">{project.healthScore}</td>
                <td className="number-cell">{formatPercent(project.budgetVariancePercent)}</td>
                <td>{formatDays(project.scheduleVarianceDays)}</td>
                <td>{project.criticalRiskCount > 0 ? `${project.criticalRiskCount} critical / ${project.riskCount} open` : `${project.riskCount} open`}</td>
                <td className="number-cell">{project.integrationFailureCount}</td>
                <td>
                  <span className="progress-label">{project.percentComplete}%</span>
                  <span className="progress-track" aria-hidden="true">
                    <span style={{ width: `${project.percentComplete}%` }} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={8}>Portfolio value: {formatCurrency(projects.reduce((sum, project) => sum + project.contractValue, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
