import type { DashboardSummary } from '../types';
import { formatCurrency } from './format';

interface KpiSummaryProps {
  summary: DashboardSummary;
}

export function KpiSummary({ summary }: KpiSummaryProps) {
  const cards = [
    {
      label: 'Average health',
      value: `${summary.averageHealthScore.toFixed(1)}`,
      detail: `${summary.atRiskProjects + summary.criticalProjects} projects need intervention`
    },
    {
      label: 'Active portfolio',
      value: summary.totalProjects.toString(),
      detail: `${summary.healthyProjects} healthy · ${summary.watchProjects} watch`
    },
    {
      label: 'Contract value',
      value: formatCurrency(summary.totalContractValue),
      detail: `${formatCurrency(summary.totalForecastOverrun)} forecast overrun`
    },
    {
      label: 'Sync failures',
      value: summary.recentIntegrationFailures.toString(),
      detail: 'Recent integration events requiring review'
    }
  ];

  return (
    <section className="kpi-grid" aria-label="Portfolio KPI summary">
      {cards.map((card, index) => (
        <article className={index === 0 ? 'kpi-card kpi-card--primary' : 'kpi-card'} key={card.label}>
          <p>{card.label}</p>
          <strong>{card.value}</strong>
          <span>{card.detail}</span>
        </article>
      ))}
    </section>
  );
}
