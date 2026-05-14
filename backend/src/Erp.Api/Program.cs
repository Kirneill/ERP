using System.Diagnostics;
using Erp.Api.Data;
using Erp.Api.Dtos;
using Erp.Api.Services;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
const string FrontendCorsPolicy = "FrontendCors";
var corsAllowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddOpenApi();
builder.Services.Configure<RouteHandlerOptions>(options => options.ThrowOnBadRequest = true);
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        if (corsAllowedOrigins.Length > 0)
        {
            policy.WithOrigins(corsAllowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});
builder.Services.AddDbContext<ErpDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("ErpDb") ?? "Data Source=erp-demo.db"));
builder.Services.AddScoped<IProjectHealthService, ProjectHealthService>();
builder.Services.AddScoped<ITimeEntryImportService, TimeEntryImportService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async context =>
    {
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
        var exception = context.Features.Get<IExceptionHandlerPathFeature>()?.Error;
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("UnhandledException");
        logger.LogError(
            exception,
            "Unhandled API exception {ExceptionType}: {ExceptionMessage} for trace {TraceId}",
            exception?.GetType().Name ?? "UnknownException",
            exception?.Message ?? "No exception message available.",
            traceId);

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new ApiErrorResponseDto(new ApiErrorDto(
            "UnhandledError",
            "An unexpected error occurred.",
            null,
            traceId)));
    });
});

app.Use(async (context, next) =>
{
    var stopwatch = Stopwatch.StartNew();
    var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("RequestLogging");
    var traceId = Activity.Current?.Id ?? context.TraceIdentifier;

    using (logger.BeginScope(new Dictionary<string, object> { ["TraceId"] = traceId }))
    {
        try
        {
            await next();
        }
        catch (BadHttpRequestException exception)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new ApiErrorResponseDto(new ApiErrorDto(
                "InvalidRequest",
                exception.Message,
                null,
                traceId)));
        }
        finally
        {
            stopwatch.Stop();
            logger.LogInformation(
                "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMilliseconds} ms with trace {TraceId}",
                context.Request.Method,
                context.Request.Path.Value,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds,
                traceId);
        }
    }
});

app.UseCors(FrontendCorsPolicy);

app.MapGet("/health", () => new HealthCheckDto("ok", "erp-api", DateTime.UtcNow));

app.MapGet("/api/projects/health", async (ErpDbContext db, IProjectHealthService healthService, CancellationToken cancellationToken) =>
{
    var projects = await db.ProjectHealth
        .AsNoTracking()
        .OrderBy(project => project.ProjectNumber)
        .ToListAsync(cancellationToken);

    return Results.Ok(projects.Select(healthService.Calculate).ToList());
});

app.MapPost("/api/time-entries/import", async (
    TimeEntryImportRequest? request,
    ITimeEntryImportService importService,
    HttpContext context,
    CancellationToken cancellationToken) =>
{
    if (request is null)
    {
        return Results.BadRequest(new ApiErrorResponseDto(new ApiErrorDto(
            "InvalidRequest",
            "Request body is required.",
            null,
            Activity.Current?.Id ?? context.TraceIdentifier)));
    }

    var response = await importService.ImportAsync(request, cancellationToken);
    return Results.Ok(response);
});

app.MapPost("/api/demo/reset", async (ErpDbContext db, ILogger<Program> logger, CancellationToken cancellationToken) =>
{
    var resetAtUtc = DateTime.UtcNow;
    logger.LogInformation("Starting demo reset at {ResetAtUtc}", resetAtUtc);

    await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

    var deletedTimeEntries = await db.TimeEntries.ExecuteDeleteAsync(cancellationToken);
    var deletedImportBatches = await db.ImportBatches.ExecuteDeleteAsync(cancellationToken);
    var deletedIntegrationErrors = await db.IntegrationErrors.ExecuteDeleteAsync(cancellationToken);
    var deletedAuditLogs = await db.AuditLogs.ExecuteDeleteAsync(cancellationToken);

    db.AuditLogs.Add(SeedData.CreateSeedAuditLog());
    await db.SaveChangesAsync(cancellationToken);

    var remainingProjects = await db.Projects.CountAsync(cancellationToken);
    await transaction.CommitAsync(cancellationToken);

    logger.LogInformation(
        "Completed demo reset at {ResetAtUtc}: deleted {DeletedTimeEntries} time entries, {DeletedImportBatches} import batches, {DeletedIntegrationErrors} integration errors, {DeletedAuditLogs} audit logs; {RemainingProjects} projects remain",
        resetAtUtc,
        deletedTimeEntries,
        deletedImportBatches,
        deletedIntegrationErrors,
        deletedAuditLogs,
        remainingProjects);

    return Results.Ok(new DemoResetResponseDto(
        resetAtUtc,
        deletedTimeEntries,
        deletedImportBatches,
        deletedIntegrationErrors,
        deletedAuditLogs,
        remainingProjects,
        "Demo mutable state reset and seed audit log restored."));
});

app.MapGet("/api/integration-errors/recent", async (ErpDbContext db, int? limit, CancellationToken cancellationToken) =>
{
    var take = Math.Clamp(limit ?? 20, 1, 100);
    var errors = await db.IntegrationErrors
        .AsNoTracking()
        .OrderByDescending(error => error.OccurredAtUtc)
        .ThenByDescending(error => error.Id)
        .Take(take)
        .Select(error => new IntegrationErrorDto(
            error.Id,
            error.SourceSystem,
            error.Operation,
            error.Severity,
            error.Message,
            error.ExternalReference,
            error.ProjectNumber,
            error.EmployeeNumber,
            error.OccurredAtUtc,
            error.Details))
        .ToListAsync(cancellationToken);

    return Results.Ok(errors);
});

app.MapGet("/api/audit-logs/recent", async (ErpDbContext db, int? limit, CancellationToken cancellationToken) =>
{
    var take = Math.Clamp(limit ?? 20, 1, 100);
    var auditLogs = await db.AuditLogs
        .AsNoTracking()
        .OrderByDescending(log => log.OccurredAtUtc)
        .ThenByDescending(log => log.Id)
        .Take(take)
        .Select(log => new AuditLogDto(
            log.Id,
            log.EntityType,
            log.EntityId,
            log.Action,
            log.Message,
            log.Actor,
            log.OccurredAtUtc,
            log.Details))
        .ToListAsync(cancellationToken);

    return Results.Ok(auditLogs);
});

app.MapGet("/api/dashboard/summary", async (ErpDbContext db, IProjectHealthService healthService, CancellationToken cancellationToken) =>
{
    var projects = await db.Projects
        .AsNoTracking()
        .Include(project => project.Client)
        .ToListAsync(cancellationToken);
    var health = projects.Select(healthService.Calculate).ToList();
    var recentCutoffUtc = DateTime.UtcNow.AddDays(-7);
    var recentErrors = await db.IntegrationErrors.CountAsync(error => error.OccurredAtUtc >= recentCutoffUtc, cancellationToken);

    var summary = new DashboardSummaryDto(
        projects.Count,
        health.Count(project => project.HealthStatus == "Healthy"),
        health.Count(project => project.HealthStatus == "Watch"),
        health.Count(project => project.HealthStatus == "AtRisk"),
        health.Count(project => project.HealthStatus == "Critical"),
        projects.Sum(project => project.ContractValue),
        projects.Sum(project => Math.Max(0m, project.EstimatedCostAtCompletion - project.ContractValue)),
        health.Count == 0 ? 0 : decimal.Round((decimal)health.Average(project => project.HealthScore), 2, MidpointRounding.AwayFromZero),
        recentErrors);

    return Results.Ok(summary);
});

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ErpDbContext>();
    await SeedData.InitializeAsync(db);
}

app.Run();

public partial class Program;
