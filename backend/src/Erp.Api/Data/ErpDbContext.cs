using Erp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Erp.Api.Data;

public sealed class ErpDbContext(DbContextOptions<ErpDbContext> options) : DbContext(options)
{
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<ResourceAssignment> ResourceAssignments => Set<ResourceAssignment>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();
    public DbSet<ImportBatch> ImportBatches => Set<ImportBatch>();
    public DbSet<IntegrationError> IntegrationErrors => Set<IntegrationError>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Client>().HasIndex(client => client.Name).IsUnique();
        modelBuilder.Entity<Project>().HasIndex(project => project.ProjectNumber).IsUnique();
        modelBuilder.Entity<Employee>().HasIndex(employee => employee.EmployeeNumber).IsUnique();
        modelBuilder.Entity<TimeEntry>().HasIndex(entry => entry.ExternalReference).IsUnique();

        modelBuilder.Entity<Project>().Property(project => project.ContractValue).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Project>().Property(project => project.CostToDate).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Project>().Property(project => project.EstimatedCostAtCompletion).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Project>().Property(project => project.PercentComplete).HasColumnType("decimal(5,2)");
        modelBuilder.Entity<ResourceAssignment>().Property(assignment => assignment.PlannedHours).HasColumnType("decimal(10,2)");
        modelBuilder.Entity<TimeEntry>().Property(entry => entry.Hours).HasColumnType("decimal(5,2)");
    }
}
