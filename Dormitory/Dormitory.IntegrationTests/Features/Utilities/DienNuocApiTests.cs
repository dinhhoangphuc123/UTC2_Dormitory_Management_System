using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Utilities.Api;
using Dormitory.Web.Features.Utilities.DTOs;
using Dormitory.Web.Features.Utilities.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Utilities
{
    public class DienNuocApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public DienNuocApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAll_ReturnsUtilitiesList()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DienNuocDichVuService(context);
            var controller = new DienNuocApiController(service);

            var result = await controller.GetAll(null, null, null, null);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<UtilityItemDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotEmpty(res.Data!);
        }
    }
}

