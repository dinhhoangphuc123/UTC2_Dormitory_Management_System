using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Rooms.Api;
using Dormitory.Web.Features.Rooms.DTOs;
using Dormitory.Web.Features.Rooms.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Rooms
{
    public class PhongApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public PhongApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAll_ReturnsRooms()
        {
            using var context = _fixture.CreateDbContext();
            var service = new PhongService(context);
            var controller = new PhongApiController(service);

            var result = await controller.GetAll(null, null, null, null);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<RoomListItemDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotEmpty(res.Data!);
        }
    }
}

