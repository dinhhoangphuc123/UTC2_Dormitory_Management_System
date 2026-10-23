using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Staff.Api;
using Dormitory.Web.Features.Staff.DTOs;
using Dormitory.Web.Features.Staff.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Staff
{
    public class NhanVienApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public NhanVienApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAll_ReturnsStaffList()
        {
            using var context = _fixture.CreateDbContext();
            var service = new NhanVienService(context);
            var controller = new NhanVienApiController(service);

            var result = await controller.GetAll(null, null, null, null);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<StaffItemDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotEmpty(res.Data!);
        }
    }
}

