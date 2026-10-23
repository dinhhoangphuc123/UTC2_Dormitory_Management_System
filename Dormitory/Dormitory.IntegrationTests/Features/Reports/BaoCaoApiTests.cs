using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Reports.Api;
using Dormitory.Web.Features.Reports.DTOs;
using Dormitory.Web.Features.Reports.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Reports
{
    public class BaoCaoApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public BaoCaoApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetSummary_ReturnsReportSummary()
        {
            using var context = _fixture.CreateDbContext();
            var service = new BaoCaoService(context);
            var controller = new BaoCaoApiController(service);

            var result = await controller.GetSummary(null, null);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ReportSummaryDto>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotNull(res.Data);
        }
    }
}

