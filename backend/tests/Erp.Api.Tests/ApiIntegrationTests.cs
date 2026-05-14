using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Erp.Api.Data;
using Erp.Api.Dtos;
using Erp.Api.Models;
using Erp.Api.Services;
using Erp.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Erp.Api.Tests;

public sealed class ApiIntegrationTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task HealthEndpoint_ReturnsSeededProjectRiskStatuses()
    {
        using var factory = new ErpApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/projects/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var projects = await response.Content.ReadFromJsonAsync<List<ProjectHealthDto>>(JsonOptions);
        Assert.NotNull(projects);
        Assert.True(projects.Count >= 5);
        Assert.Contains(projects, project => project.ProjectNumber == "AEC-2026-001" && project.RiskStatus == "GREEN");
        Assert.Contains(projects, project => project.ProjectNumber == "AEC-2026-002" && project.RiskStatus == "YELLOW");
        Assert.Contains(projects, project => project.ProjectNumber == "AEC-2026-003" && project.RiskStatus == "RED");
        Assert.Contains(projects, project => project.ProjectNumber == "AEC-2026-004" && project.RiskStatus == "RED");
    }

    [Fact]
    public async Task ViteOrigin_GetRequest_IncludesCorsAllowOriginHeader()
    {
        using var factory = new ErpApiFactory();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.TryAddWithoutValidation("Origin", "http://localhost:5173");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var origins));
        Assert.Equal("http://localhost:5173", Assert.Single(origins));
    }

    [Fact]
    public async Task ProjectHealthView_ExposesSqlReportingFields()
    {
        using var factory = new ErpApiFactory();

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ErpDbContext>();
        await using var command = db.Database.GetDbConnection().CreateCommand();
        command.CommandText = """
            SELECT ProjectNumber, ClientName, BudgetUtilizationPercent, RiskStatus
            FROM vw_project_health
            WHERE ProjectNumber = 'AEC-2026-002';
            """;

        await using var reader = await command.ExecuteReaderAsync();

        Assert.True(await reader.ReadAsync());
        Assert.Equal("AEC-2026-002", reader.GetString(0));
        Assert.Equal("Metro Health Authority", reader.GetString(1));
        Assert.Equal(75m, Convert.ToDecimal(reader.GetValue(2), CultureInfo.InvariantCulture));
        Assert.Equal("YELLOW", reader.GetString(3));
    }

    [Fact]
    public async Task DashboardSummary_ReturnsHealthCountsAndFinancialRollups()
    {
        using var factory = new ErpApiFactory();
        using var client = factory.CreateClient();

        var summary = await client.GetFromJsonAsync<DashboardSummaryDto>("/api/dashboard/summary", JsonOptions);

        Assert.NotNull(summary);
        Assert.Equal(5, summary.TotalProjects);
        Assert.Equal(153_000_000m, summary.TotalContractValue);
        Assert.Equal(1_100_000m, summary.TotalForecastOverrun);
        Assert.True(summary.AverageHealthScore > 0);
        Assert.Equal(0, summary.RecentIntegrationFailures);
        Assert.Equal(5, summary.HealthyProjects + summary.WatchProjects + summary.AtRiskProjects + summary.CriticalProjects);
    }

    [Fact]
    public async Task TimeEntryImport_MixedRows_AcceptsValidRowsAndPersistsErrorsAndAuditLogs()
    {
        using var factory = new ErpApiFactory();
        using var client = factory.CreateClient();
        var request = new TimeEntryImportRequest(
            "UnitTestImport",
            [
                new TimeEntryImportRecord("AEC-2026-001", "EMP-1001", "2026-05-12", 8m, "UT-IMPORT-001", "Valid row"),
                new TimeEntryImportRecord("AEC-UNKNOWN", "EMP-1001", "2026-05-12", 8m, "UT-IMPORT-002", "Unknown project"),
                new TimeEntryImportRecord("AEC-2026-001", "EMP-9999", "2026-05-12", 8m, "UT-IMPORT-003", "Unknown employee"),
                new TimeEntryImportRecord("AEC-2026-001", "EMP-1001", "2026-05-12", 25m, "UT-IMPORT-004", "Invalid hours"),
                new TimeEntryImportRecord("AEC-2026-001", "EMP-1001", "not-a-date", 8m, "UT-IMPORT-005", "Invalid date"),
                new TimeEntryImportRecord("AEC-2026-001", "EMP-1001", "2026-05-13", 4m, "UT-IMPORT-001", "Duplicate external ref"),
                new TimeEntryImportRecord("AEC-2026-001", "EMP-1001", "2026-05-13", 4m, null, "Missing external ref"),
                null
            ]);

        var importResponse = await client.PostAsJsonAsync("/api/time-entries/import", request, JsonOptions);

        Assert.Equal(HttpStatusCode.OK, importResponse.StatusCode);
        var importResult = await importResponse.Content.ReadFromJsonAsync<TimeEntryImportResponse>(JsonOptions);
        Assert.NotNull(importResult);
        Assert.Equal(8, importResult.TotalCount);
        Assert.Equal(1, importResult.AcceptedCount);
        Assert.Equal(7, importResult.RejectedCount);
        Assert.Contains(importResult.Errors, error => error.Code == "UnknownProject");
        Assert.Contains(importResult.Errors, error => error.Code == "UnknownEmployee");
        Assert.Contains(importResult.Errors, error => error.Code == "InvalidHours");
        Assert.Contains(importResult.Errors, error => error.Code == "InvalidWorkDate");
        Assert.Contains(importResult.Errors, error => error.Code == "DuplicateExternalReference");
        Assert.Contains(importResult.Errors, error => error.Code == "MissingExternalReference");
        Assert.Contains(importResult.Errors, error => error.Code == "InvalidRecord");

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ErpDbContext>();
            Assert.Equal(1, await db.TimeEntries.CountAsync(entry => entry.ExternalReference.StartsWith("UT-IMPORT-")));
            var batch = await db.ImportBatches.SingleAsync(importBatch => importBatch.Id == importResult.ImportBatchId);
            Assert.Equal(8, batch.TotalCount);
            Assert.Equal(1, batch.AcceptedCount);
            Assert.Equal(7, batch.RejectedCount);
            Assert.NotNull(batch.CompletedAtUtc);
        }

        var errors = await client.GetFromJsonAsync<List<IntegrationErrorDto>>("/api/integration-errors/recent?limit=10", JsonOptions);
        Assert.NotNull(errors);
        Assert.True(errors.Count(error => error.SourceSystem == "UnitTestImport" && error.Operation == "TimeEntryImport") >= 7);

        var auditLogs = await client.GetFromJsonAsync<List<AuditLogDto>>("/api/audit-logs/recent?limit=10", JsonOptions);
        Assert.NotNull(auditLogs);
        Assert.Contains(auditLogs, log => log.Actor == "UnitTestImport" && log.Action == "Imported" && log.EntityId == "UT-IMPORT-001");
        Assert.Contains(auditLogs, log => log.Actor == "UnitTestImport" && log.EntityType == "ImportBatch" && log.Action == "Completed");
    }

    [Fact]
    public async Task TimeEntryImport_NullBody_ReturnsConsistentApiError()
    {
        using var factory = new ErpApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsync("/api/time-entries/import", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ApiErrorResponseDto>(JsonOptions);
        Assert.NotNull(error);
        Assert.Equal("InvalidRequest", error.Error.Code);
        Assert.Equal("Request body is required.", error.Error.Message);
        Assert.Null(error.Error.Details);
        Assert.False(string.IsNullOrWhiteSpace(error.Error.TraceId));
    }

    [Fact]
    public async Task TimeEntryImport_MalformedJson_ReturnsNestedApiError()
    {
        using var factory = new ErpApiFactory();
        using var client = factory.CreateClient();
        using var content = new StringContent("{", Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/time-entries/import", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ApiErrorResponseDto>(JsonOptions);
        Assert.NotNull(error);
        Assert.Equal("InvalidRequest", error.Error.Code);
        Assert.False(string.IsNullOrWhiteSpace(error.Error.Message));
        Assert.Null(error.Error.Details);
        Assert.False(string.IsNullOrWhiteSpace(error.Error.TraceId));
    }

    [Fact]
    public async Task UnhandledException_ReturnsNestedApiError()
    {
        using var factory = new ErpApiFactory(services =>
        {
            services.RemoveAll<IProjectHealthService>();
            services.AddScoped<IProjectHealthService, ThrowingProjectHealthService>();
        });
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/projects/health");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ApiErrorResponseDto>(JsonOptions);
        Assert.NotNull(error);
        Assert.Equal("UnhandledError", error.Error.Code);
        Assert.Equal("An unexpected error occurred.", error.Error.Message);
        Assert.Null(error.Error.Details);
        Assert.False(string.IsNullOrWhiteSpace(error.Error.TraceId));
    }

    [Fact]
    public async Task HealthCheck_ReturnsOkServiceStatus()
    {
        using var factory = new ErpApiFactory();
        using var client = factory.CreateClient();

        var health = await client.GetFromJsonAsync<HealthCheckDto>("/health", JsonOptions);

        Assert.NotNull(health);
        Assert.Equal("ok", health.Status);
        Assert.Equal("erp-api", health.Service);
    }

    private sealed class ThrowingProjectHealthService : IProjectHealthService
    {
        public ProjectHealthDto Calculate(Project project) => throw new InvalidOperationException("Test exception");

        public ProjectHealthDto Calculate(ProjectHealthView project) => throw new InvalidOperationException("Test exception");

        public string CalculateRiskStatus(decimal contractValue, decimal estimatedCostAtCompletion) => throw new InvalidOperationException("Test exception");
    }
}
