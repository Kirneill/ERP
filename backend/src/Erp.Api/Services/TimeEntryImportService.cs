using System.Globalization;
using Erp.Api.Data;
using Erp.Api.Dtos;
using Erp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Services;

public interface ITimeEntryImportService
{
    Task<TimeEntryImportResponse> ImportAsync(TimeEntryImportRequest request, CancellationToken cancellationToken);
}

public sealed class TimeEntryImportService(ErpDbContext db, ILogger<TimeEntryImportService> logger) : ITimeEntryImportService
{
    public async Task<TimeEntryImportResponse> ImportAsync(TimeEntryImportRequest request, CancellationToken cancellationToken)
    {
        var sourceSystem = string.IsNullOrWhiteSpace(request.SourceSystem) ? "ManualImport" : request.SourceSystem.Trim();
        var records = request.Records ?? [];
        var startedAtUtc = DateTime.UtcNow;

        logger.LogInformation("Starting time entry import from {SourceSystem} with {RecordCount} records", sourceSystem, records.Count);

        var batch = new ImportBatch
        {
            SourceSystem = sourceSystem,
            StartedAtUtc = startedAtUtc,
            TotalCount = records.Count
        };

        db.ImportBatches.Add(batch);
        await db.SaveChangesAsync(cancellationToken);

        var projects = await db.Projects.ToDictionaryAsync(project => project.ProjectNumber, StringComparer.OrdinalIgnoreCase, cancellationToken);
        var employees = await db.Employees.ToDictionaryAsync(employee => employee.EmployeeNumber, StringComparer.OrdinalIgnoreCase, cancellationToken);
        var existingReferences = await db.TimeEntries.Select(entry => entry.ExternalReference).ToHashSetAsync(StringComparer.OrdinalIgnoreCase, cancellationToken);
        var seenReferences = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var errors = new List<TimeEntryImportErrorDto>();
        var accepted = 0;

        for (var index = 0; index < records.Count; index++)
        {
            var rowNumber = index + 1;
            var record = records[index];
            var validationError = Validate(record, rowNumber, projects, employees, existingReferences, seenReferences, out var project, out var employee, out var workDate);

            if (validationError is not null)
            {
                errors.Add(validationError);
                db.IntegrationErrors.Add(new IntegrationError
                {
                    SourceSystem = sourceSystem,
                    Operation = "TimeEntryImport",
                    Severity = "Warning",
                    Message = validationError.Message,
                    ExternalReference = record.ExternalReference,
                    ProjectNumber = record.ProjectNumber,
                    EmployeeNumber = record.EmployeeNumber,
                    OccurredAtUtc = DateTime.UtcNow,
                    Details = $"Row {rowNumber}: {validationError.Code}"
                });

                logger.LogWarning(
                    "Rejected time entry import row {RowNumber} from {SourceSystem}: {RejectionCode} {RejectionMessage}",
                    rowNumber,
                    sourceSystem,
                    validationError.Code,
                    validationError.Message);
                continue;
            }

            db.TimeEntries.Add(new TimeEntry
            {
                ProjectId = project.Id,
                EmployeeId = employee.Id,
                WorkDate = workDate,
                Hours = record.Hours,
                ExternalReference = record.ExternalReference!.Trim(),
                Description = record.Description,
                ImportBatchId = batch.Id,
                CreatedAtUtc = DateTime.UtcNow
            });

            db.AuditLogs.Add(new AuditLog
            {
                EntityType = "TimeEntry",
                EntityId = record.ExternalReference!.Trim(),
                Action = "Imported",
                Actor = sourceSystem,
                Message = $"Imported {record.Hours} hours for {employee.EmployeeNumber} on {project.ProjectNumber}.",
                OccurredAtUtc = DateTime.UtcNow,
                Details = $"Batch {batch.Id}, work date {workDate:yyyy-MM-dd}"
            });

            accepted++;
        }

        batch.AcceptedCount = accepted;
        batch.RejectedCount = errors.Count;
        batch.CompletedAtUtc = DateTime.UtcNow;

        db.AuditLogs.Add(new AuditLog
        {
            EntityType = "ImportBatch",
            EntityId = batch.Id.ToString(CultureInfo.InvariantCulture),
            Action = "Completed",
            Actor = sourceSystem,
            Message = $"Time entry import completed with {accepted} accepted and {errors.Count} rejected rows.",
            OccurredAtUtc = batch.CompletedAtUtc.Value,
            Details = $"Total rows: {records.Count}"
        });

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Completed time entry import {ImportBatchId} from {SourceSystem}: accepted {AcceptedCount}, rejected {RejectedCount}",
            batch.Id,
            sourceSystem,
            accepted,
            errors.Count);

        return new TimeEntryImportResponse(batch.Id, records.Count, accepted, errors.Count, errors);
    }

    private static TimeEntryImportErrorDto? Validate(
        TimeEntryImportRecord record,
        int rowNumber,
        IReadOnlyDictionary<string, Project> projects,
        IReadOnlyDictionary<string, Employee> employees,
        ISet<string> existingReferences,
        ISet<string> seenReferences,
        out Project project,
        out Employee employee,
        out DateTime workDate)
    {
        project = null!;
        employee = null!;
        workDate = default;

        if (string.IsNullOrWhiteSpace(record.ProjectNumber))
        {
            return Error(rowNumber, record.ExternalReference, "UnknownProject", $"Unknown project '{record.ProjectNumber}'.");
        }

        if (!projects.TryGetValue(record.ProjectNumber.Trim(), out var matchedProject))
        {
            return Error(rowNumber, record.ExternalReference, "UnknownProject", $"Unknown project '{record.ProjectNumber}'.");
        }

        project = matchedProject;

        if (string.IsNullOrWhiteSpace(record.EmployeeNumber))
        {
            return Error(rowNumber, record.ExternalReference, "UnknownEmployee", $"Unknown employee '{record.EmployeeNumber}'.");
        }

        if (!employees.TryGetValue(record.EmployeeNumber.Trim(), out var matchedEmployee))
        {
            return Error(rowNumber, record.ExternalReference, "UnknownEmployee", $"Unknown employee '{record.EmployeeNumber}'.");
        }

        employee = matchedEmployee;

        if (record.Hours <= 0m || record.Hours > 24m)
        {
            return Error(rowNumber, record.ExternalReference, "InvalidHours", "Hours must be greater than 0 and less than or equal to 24.");
        }

        if (!TryParseWorkDate(record.WorkDate, out workDate))
        {
            return Error(rowNumber, record.ExternalReference, "InvalidWorkDate", $"Invalid work date '{record.WorkDate}'.");
        }

        if (string.IsNullOrWhiteSpace(record.ExternalReference))
        {
            return Error(rowNumber, record.ExternalReference, "MissingExternalReference", "External reference is required.");
        }

        var externalReference = record.ExternalReference.Trim();
        if (existingReferences.Contains(externalReference) || !seenReferences.Add(externalReference))
        {
            return Error(rowNumber, externalReference, "DuplicateExternalReference", $"Duplicate external reference '{externalReference}'.");
        }

        return null;
    }

    private static bool TryParseWorkDate(string? value, out DateTime workDate)
    {
        workDate = default;

        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        if (!DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed))
        {
            return false;
        }

        workDate = parsed.UtcDateTime.Date;
        return workDate.Year is >= 2000 and <= 2100;
    }

    private static TimeEntryImportErrorDto Error(int rowNumber, string? externalReference, string code, string message) =>
        new(rowNumber, externalReference, code, message);
}
