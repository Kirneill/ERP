namespace Erp.Api.Dtos;

public sealed record ApiErrorDto(
    string Code,
    string Message,
    string TraceId,
    IReadOnlyDictionary<string, string[]>? Errors = null);

public sealed record ProjectHealthDto(
    int ProjectId,
    string ProjectNumber,
    string Name,
    string ClientName,
    string MarketSector,
    string ProjectManager,
    string Status,
    decimal ContractValue,
    decimal CostToDate,
    decimal EstimatedCostAtCompletion,
    decimal BudgetUtilizationPercent,
    int ScheduleVarianceDays,
    decimal PercentComplete,
    string RiskStatus,
    DateTime LastUpdatedUtc);

public sealed record TimeEntryImportRequest(
    string? SourceSystem,
    IReadOnlyList<TimeEntryImportRecord?>? Records);

public sealed record TimeEntryImportRecord(
    string? ProjectNumber,
    string? EmployeeNumber,
    string? WorkDate,
    decimal Hours,
    string? ExternalReference,
    string? Description);

public sealed record TimeEntryImportResponse(
    int ImportBatchId,
    int TotalCount,
    int AcceptedCount,
    int RejectedCount,
    IReadOnlyList<TimeEntryImportErrorDto> Errors);

public sealed record TimeEntryImportErrorDto(
    int RowNumber,
    string? ExternalReference,
    string Code,
    string Message);

public sealed record IntegrationErrorDto(
    int Id,
    string SourceSystem,
    string Operation,
    string Severity,
    string Message,
    string? ExternalReference,
    string? ProjectNumber,
    string? EmployeeNumber,
    DateTime OccurredAtUtc,
    string? Details);

public sealed record AuditLogDto(
    int Id,
    string EntityType,
    string EntityId,
    string Action,
    string Message,
    string Actor,
    DateTime OccurredAtUtc,
    string? Details);

public sealed record DashboardSummaryDto(
    int TotalProjects,
    int GreenProjects,
    int YellowProjects,
    int RedProjects,
    decimal TotalContractValue,
    decimal TotalForecastOverrun,
    decimal AverageBudgetUtilizationPercent,
    int RecentIntegrationErrors);

public sealed record HealthCheckDto(string Status, string Service, DateTime TimestampUtc);
