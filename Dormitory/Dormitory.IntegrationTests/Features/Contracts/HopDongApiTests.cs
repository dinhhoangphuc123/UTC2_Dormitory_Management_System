using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Contracts.Api;
using Dormitory.Web.Features.Contracts.DTOs;
using Dormitory.Web.Features.Contracts.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Contracts
{
    public class HopDongApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public HopDongApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAll_ReturnsContracts()
        {
            using var context = _fixture.CreateDbContext();
            var service = new HopDongService(context);
            var controller = new HopDongApiController(service);

            var result = await controller.GetAll(null, null, null, null);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<ContractListItemDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotEmpty(res.Data!);
        }
    }
}
