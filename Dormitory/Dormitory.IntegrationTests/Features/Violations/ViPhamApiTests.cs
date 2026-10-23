using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Violations.Api;
using Dormitory.Web.Features.Violations.DTOs;
using Dormitory.Web.Features.Violations.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Violations
{
    public class ViPhamApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public ViPhamApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAll_ReturnsViolations()
        {
            using var context = _fixture.CreateDbContext();
            var service = new ViPhamService(context);
            var controller = new ViPhamApiController(service);

            var result = await controller.GetAll(null, null, null, null);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<ViolationRecordDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotEmpty(res.Data!);
        }
    }
}

