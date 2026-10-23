using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Academic.Api;
using Dormitory.Web.Features.Academic.DTOs;
using Dormitory.Web.Features.Academic.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Academic
{
    public class LopHocApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public LopHocApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAll_ReturnsClassList()
        {
            using var context = _fixture.CreateDbContext();
            var service = new LopHocService(context);
            var controller = new LopHocApiController(service);

            var result = await controller.GetAll(null, null, null);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<ClassItemDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotEmpty(res.Data!);
        }
    }
}

