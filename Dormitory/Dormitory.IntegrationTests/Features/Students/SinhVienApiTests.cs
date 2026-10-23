using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Students.Api;
using Dormitory.Web.Features.Students.DTOs;
using Dormitory.Web.Features.Students.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Students
{
    public class SinhVienApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public SinhVienApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAll_ReturnsStudents()
        {
            using var context = _fixture.CreateDbContext();
            var service = new SinhVienService(context);
            var controller = new SinhVienApiController(service);

            var result = await controller.GetAll(null, null, null, null);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<SinhVienListItemDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotEmpty(res.Data!);
        }
    }
}

