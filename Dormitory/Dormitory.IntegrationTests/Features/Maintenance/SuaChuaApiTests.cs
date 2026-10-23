using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Maintenance.Api;
using Dormitory.Web.Features.Maintenance.DTOs;
using Dormitory.Web.Features.Maintenance.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Maintenance
{
    public class SuaChuaApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public SuaChuaApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAll_ReturnsTickets()
        {
            using var context = _fixture.CreateDbContext();
            var service = new YeuCauSuaChuaService(context);
            var controller = new SuaChuaApiController(service);

            var result = await controller.GetAll(null, null, null, null, null);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<MaintenanceTicketDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotEmpty(res.Data!);
        }
    }
}

