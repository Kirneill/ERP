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

        logger.LogInformation(
            "Calculated project health for {ProjectNumber}: contract {ContractValue}, estimate {EstimatedCostAtCompletion}, utilization {BudgetUtilizationPercent}, scheduleVarianceDays {ScheduleVarianceDays}, riskStatus {RiskStatus}",
            project.ProjectNumber,
            project.ContractValue,
            project.EstimatedCostAtCompletion,
            budgetUtilization,
            scheduleVarianceDays,
            riskStatus);

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

    private static decimal CalculateBudgetUtilization(decimal contractValue, decimal estimatedCostAtCompletion)
    {
        if (contractValue <= 0)
        {
            return 100m;
        }

        return decimal.Round(estimatedCostAtCompletion / contractValue * 100m, 2, MidpointRounding.AwayFromZero);
    }
}
