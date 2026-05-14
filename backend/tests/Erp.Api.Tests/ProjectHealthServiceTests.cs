using Erp.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace Erp.Api.Tests;

public sealed class ProjectHealthServiceTests
{
    private readonly ProjectHealthService _service = new(NullLogger<ProjectHealthService>.Instance);

    [Theory]
    [InlineData(100, 74.99, "GREEN")]
    [InlineData(100, 75, "YELLOW")]
    [InlineData(100, 89.99, "YELLOW")]
    [InlineData(100, 90, "RED")]
    [InlineData(100, 101, "RED")]
    public void CalculateRiskStatus_UsesBudgetUtilizationBands(decimal contractValue, decimal estimateAtCompletion, string expectedStatus)
    {
        var status = _service.CalculateRiskStatus(contractValue, estimateAtCompletion);

        Assert.Equal(expectedStatus, status);
    }

    [Fact]
    public void CalculateRiskStatus_TreatsOverBudgetAsRed()
    {
        var status = _service.CalculateRiskStatus(18_500_000m, 19_600_000m);

        Assert.Equal("RED", status);
    }
}
