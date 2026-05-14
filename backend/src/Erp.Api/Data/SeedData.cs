using Erp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Data;

public static class SeedData
{
    private static readonly DateTime Now = new(2026, 5, 13, 12, 0, 0, DateTimeKind.Utc);

    public static async Task InitializeAsync(ErpDbContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.EnsureCreatedAsync(cancellationToken);

        if (await db.Projects.AnyAsync(cancellationToken))
        {
            return;
        }

        var clients = new[]
        {
            new Client { Name = "Metro Health Authority", MarketSector = "Healthcare" },
            new Client { Name = "City Capital Projects", MarketSector = "Civic" },
            new Client { Name = "River County Schools", MarketSector = "Education" },
            new Client { Name = "Port Transit Agency", MarketSector = "Infrastructure" },
            new Client { Name = "Northstar Biotech", MarketSector = "Industrial" }
        };

        var employees = new[]
        {
            new Employee { EmployeeNumber = "EMP-1001", Name = "Maya Patel", Email = "maya.patel@example.com" },
            new Employee { EmployeeNumber = "EMP-1002", Name = "Dana Lee", Email = "dana.lee@example.com" },
            new Employee { EmployeeNumber = "EMP-1003", Name = "Owen Grant", Email = "owen.grant@example.com" },
            new Employee { EmployeeNumber = "EMP-1004", Name = "Riley Chen", Email = "riley.chen@example.com" },
            new Employee { EmployeeNumber = "EMP-1005", Name = "Sam Rivera", Email = "sam.rivera@example.com" }
        };

        await db.Clients.AddRangeAsync(clients, cancellationToken);
        await db.Employees.AddRangeAsync(employees, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        var projects = new[]
        {
            new Project
            {
                ProjectNumber = "AEC-2026-001",
                Name = "River County Elementary Addition",
                ClientId = clients[2].Id,
                ProjectManager = "Dana Lee",
                Status = "Active",
                ContractValue = 10_000_000m,
                CostToDate = 3_200_000m,
                EstimatedCostAtCompletion = 7_000_000m,
                PlannedStartDate = Utc(2026, 1, 5),
                PlannedEndDate = Utc(2026, 11, 20),
                ActualStartDate = Utc(2026, 1, 8),
                ForecastEndDate = Utc(2026, 11, 15),
                PercentComplete = 46m,
                LastUpdatedUtc = Now
            },
            new Project
            {
                ProjectNumber = "AEC-2026-002",
                Name = "North Tower Hospital Expansion",
                ClientId = clients[0].Id,
                ProjectManager = "Maya Patel",
                Status = "Active",
                ContractValue = 42_500_000m,
                CostToDate = 19_500_000m,
                EstimatedCostAtCompletion = 31_875_000m,
                PlannedStartDate = Utc(2025, 8, 1),
                PlannedEndDate = Utc(2027, 4, 30),
                ActualStartDate = Utc(2025, 8, 5),
                ForecastEndDate = Utc(2027, 5, 12),
                PercentComplete = 63m,
                LastUpdatedUtc = Now
            },
            new Project
            {
                ProjectNumber = "AEC-2026-003",
                Name = "Port Light Rail Maintenance Yard",
                ClientId = clients[3].Id,
                ProjectManager = "Owen Grant",
                Status = "Active",
                ContractValue = 58_000_000m,
                CostToDate = 35_000_000m,
                EstimatedCostAtCompletion = 52_200_000m,
                PlannedStartDate = Utc(2025, 5, 15),
                PlannedEndDate = Utc(2027, 8, 31),
                ActualStartDate = Utc(2025, 5, 20),
                ForecastEndDate = Utc(2027, 10, 15),
                PercentComplete = 71m,
                LastUpdatedUtc = Now
            },
            new Project
            {
                ProjectNumber = "AEC-2026-004",
                Name = "Northstar Cleanroom Retrofit",
                ClientId = clients[4].Id,
                ProjectManager = "Riley Chen",
                Status = "Active",
                ContractValue = 18_500_000m,
                CostToDate = 12_400_000m,
                EstimatedCostAtCompletion = 19_600_000m,
                PlannedStartDate = Utc(2026, 2, 1),
                PlannedEndDate = Utc(2026, 12, 15),
                ActualStartDate = Utc(2026, 2, 3),
                ForecastEndDate = Utc(2027, 1, 21),
                PercentComplete = 58m,
                LastUpdatedUtc = Now
            },
            new Project
            {
                ProjectNumber = "AEC-2026-005",
                Name = "Civic Center Seismic Upgrade",
                ClientId = clients[1].Id,
                ProjectManager = "Sam Rivera",
                Status = "Planning",
                ContractValue = 24_000_000m,
                CostToDate = 1_100_000m,
                EstimatedCostAtCompletion = 16_800_000m,
                PlannedStartDate = Utc(2026, 7, 1),
                PlannedEndDate = Utc(2027, 6, 30),
                ActualStartDate = null,
                ForecastEndDate = Utc(2027, 6, 30),
                PercentComplete = 8m,
                LastUpdatedUtc = Now
            }
        };

        await db.Projects.AddRangeAsync(projects, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        var assignments = projects.SelectMany((project, index) => new[]
        {
            new ResourceAssignment { ProjectId = project.Id, EmployeeId = employees[index % employees.Length].Id, Role = "Project Manager", PlannedHours = 320m, AssignedAtUtc = Now.AddDays(-30) },
            new ResourceAssignment { ProjectId = project.Id, EmployeeId = employees[(index + 1) % employees.Length].Id, Role = "Project Engineer", PlannedHours = 480m, AssignedAtUtc = Now.AddDays(-30) }
        });

        var auditLogs = new[]
        {
            new AuditLog { EntityType = "SeedData", EntityId = "projects", Action = "Seeded", Actor = "system", Message = "Deterministic AEC demo data seeded.", OccurredAtUtc = Now, Details = "5 projects, 5 employees" }
        };

        await db.ResourceAssignments.AddRangeAsync(assignments, cancellationToken);
        await db.AuditLogs.AddRangeAsync(auditLogs, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static DateTime Utc(int year, int month, int day) => new(year, month, day, 0, 0, 0, DateTimeKind.Utc);
}
