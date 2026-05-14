using Erp.Api.Dtos;
using Erp.Api.Models;

namespace Erp.Api.Services;

public interface IProjectHealthService
{
    ProjectHealthDto Calculate(Project project);
    string CalculateRiskStatus(decimal contractValue, decimal estimatedCostAtCompletion);
}

public sealed class ProjectHealthService(ILogger<ProjectHealthService> logger) : IProjectHealthService
{
    public ProjectHealthDto Calculate(Project project)
    {
        var budgetUtilization = CalculateBudgetUtilization(project.ContractValue, project.EstimatedCostAtCompletion);
        var riskStatus = CalculateRiskStatus(project.ContractValue, project.EstimatedCostAtCompletion);
        var scheduleVarianceDays = (project.ForecastEndDate.Date - project.PlannedEndDate.Date).Days;
        var healthScore = CalculateHealthScore(budgetUtilization, scheduleVarianceDays, project.EstimatedCostAtCompletion > project.ContractValue);
        var healthStatus = CalculateHealthStatus(healthScore);

        logger.LogInformation(
            "Calculated project health for {ProjectNumber}: contract {ContractValue}, estimate {EstimatedCostAtCompletion}, utilization {BudgetUtilizationPercent}, scheduleVarianceDays {ScheduleVarianceDays}, riskStatus {RiskStatus}, healthScore {HealthScore}, healthStatus {HealthStatus}",
            project.ProjectNumber,
            project.ContractValue,
            project.EstimatedCostAtCompletion,
            budgetUtilization,
            scheduleVarianceDays,
            riskStatus,
            healthScore,
            healthStatus);

        return new ProjectHealthDto(
            project.Id,
            project.ProjectNumber,
            project.Name,
            project.Client?.Name ?? string.Empty,
            project.Client?.MarketSector ?? string.Empty,
            project.ProjectManager,
            project.Status,
            project.ContractValue,
            project.CostToDate,
            project.EstimatedCostAtCompletion,
            budgetUtilization,
            scheduleVarianceDays,
            project.PercentComplete,
            riskStatus,
            healthScore,
            healthStatus,
            project.LastUpdatedUtc);
    }

    public string CalculateRiskStatus(decimal contractValue, decimal estimatedCostAtCompletion)
    {
        if (contractValue <= 0 || estimatedCostAtCompletion > contractValue)
        {
            return "RED";
        }

        var utilization = CalculateBudgetUtilization(contractValue, estimatedCostAtCompletion);

        return utilization switch
        {
            < 75m => "GREEN",
            < 90m => "YELLOW",
            _ => "RED"
        };
    }

    private static int CalculateHealthScore(decimal budgetUtilizationPercent, int scheduleVarianceDays, bool isOverBudget)
    {
        var budgetPenalty = budgetUtilizationPercent switch
        {
            <= 75m => 0m,
            <= 90m => (budgetUtilizationPercent - 75m) * 1.25m,
            _ => 18.75m + ((budgetUtilizationPercent - 90m) * 1.75m)
        };
        var overBudgetPenalty = isOverBudget ? 20m : 0m;
        var schedulePenalty = Math.Max(0, scheduleVarianceDays) * 0.5m;
        var score = 100m - budgetPenalty - overBudgetPenalty - schedulePenalty;

        return (int)Math.Clamp(decimal.Round(score, 0, MidpointRounding.AwayFromZero), 0m, 100m);
    }

    private static string CalculateHealthStatus(int healthScore) => healthScore switch
    {
        >= 85 => "Healthy",
        >= 70 => "Watch",
        >= 50 => "AtRisk",
        _ => "Critical"
    };

    private static decimal CalculateBudgetUtilization(decimal contractValue, decimal estimatedCostAtCompletion)
    {
        if (contractValue <= 0)
        {
            return 100m;
        }

        return decimal.Round(estimatedCostAtCompletion / contractValue * 100m, 2, MidpointRounding.AwayFromZero);
    }
}
