using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Payments.Api;
using Dormitory.Web.Features.Payments.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Payments
{
    public class ThanhToanApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public ThanhToanApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetTotalRevenue_ReturnsNumber()
        {
            using var context = _fixture.CreateDbContext();
            var service = new ThanhToanService(context);
            var controller = new ThanhToanApiController(service);

            var result = await controller.GetTotalRevenue();
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<decimal>>(ok.Value);
            Assert.True(res.Success);
        }
    }
}

