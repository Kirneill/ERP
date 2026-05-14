namespace Erp.Api.Models;

public sealed class Client
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string MarketSector { get; set; }
    public List<Project> Projects { get; set; } = [];
}

public sealed class Project
{
    public int Id { get; set; }
    public required string ProjectNumber { get; set; }
    public required string Name { get; set; }
    public int ClientId { get; set; }
    public Client? Client { get; set; }
    public required string ProjectManager { get; set; }
    public required string Status { get; set; }
    public decimal ContractValue { get; set; }
    public decimal CostToDate { get; set; }
    public decimal EstimatedCostAtCompletion { get; set; }
    public DateTime PlannedStartDate { get; set; }
    public DateTime PlannedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime ForecastEndDate { get; set; }
    public decimal PercentComplete { get; set; }
    public DateTime LastUpdatedUtc { get; set; }
    public List<ResourceAssignment> ResourceAssignments { get; set; } = [];
    public List<TimeEntry> TimeEntries { get; set; } = [];
}

public sealed class Employee
{
    public int Id { get; set; }
    public required string EmployeeNumber { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public List<ResourceAssignment> ResourceAssignments { get; set; } = [];
    public List<TimeEntry> TimeEntries { get; set; } = [];
}

public sealed class ResourceAssignment
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public Project? Project { get; set; }
    public int EmployeeId { get; set; }
    public Employee? Employee { get; set; }
    public required string Role { get; set; }
    public decimal PlannedHours { get; set; }
    public DateTime AssignedAtUtc { get; set; }
}

public sealed class TimeEntry
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public Project? Project { get; set; }
    public int EmployeeId { get; set; }
    public Employee? Employee { get; set; }
    public DateTime WorkDate { get; set; }
    public decimal Hours { get; set; }
    public required string ExternalReference { get; set; }
    public string? Description { get; set; }
    public int ImportBatchId { get; set; }
    public ImportBatch? ImportBatch { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public sealed class ImportBatch
{
    public int Id { get; set; }
    public required string SourceSystem { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public int TotalCount { get; set; }
    public int AcceptedCount { get; set; }
    public int RejectedCount { get; set; }
    public List<TimeEntry> TimeEntries { get; set; } = [];
}

public sealed class IntegrationError
{
    public int Id { get; set; }
    public required string SourceSystem { get; set; }
    public required string Operation { get; set; }
    public required string Severity { get; set; }
    public required string Message { get; set; }
    public string? ExternalReference { get; set; }
    public string? ProjectNumber { get; set; }
    public string? EmployeeNumber { get; set; }
    public DateTime OccurredAtUtc { get; set; }
    public string? Details { get; set; }
}

public sealed class AuditLog
{
    public int Id { get; set; }
    public required string EntityType { get; set; }
    public required string EntityId { get; set; }
    public required string Action { get; set; }
    public required string Message { get; set; }
    public required string Actor { get; set; }
    public DateTime OccurredAtUtc { get; set; }
    public string? Details { get; set; }
}
