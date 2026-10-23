using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Dashboard.Api;
using Dormitory.Web.Features.Dashboard.DTOs;
using Dormitory.Web.Features.Dashboard.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Dashboard
{
    public class DashboardApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public DashboardApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetSummary_ReturnsValidDashboardSummary()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DashboardService(context);
            var controller = new DashboardApiController(service);

            var result = await controller.GetSummary();
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<DashboardSummaryDto>>(ok.Value);
            Assert.True(res.Success);
            Assert.True(res.Data?.TotalStudents > 0);
        }
    }
}
