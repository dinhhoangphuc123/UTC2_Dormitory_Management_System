using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.Rooms.Mappings;

namespace Dormitory.UnitTests.Features.Rooms
{
    public class RoomMappingsTests
    {
        [Fact]
        public void ToRoomListItemDto_MapsCorrectly()
        {
            var p = new Phong
            {
                MaPhong = "A01_101",
                MaToaNha = "A01",
                SoTang = 1,
                TrangThai = "hoatDong"
            };

            var dto = p.ToRoomListItemDto();
            Assert.Equal("A01_101", dto.Id);
            Assert.Equal("101", dto.RoomNumber);
            Assert.Equal("A01", dto.BuildingId);
        }
    }
}

