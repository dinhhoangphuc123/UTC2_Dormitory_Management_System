using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Registrations.Mappings;

namespace Dormitory.UnitTests.Features.Registrations
{
    public class RegistrationMappingsTests
    {
        [Fact]
        public void ToApplicationListItemDto_MapsCorrectly()
        {
            var d = new DonDangKy
            {
                MaDonDangKy = "DK-65089",
                MaSinhVien = "6551080319",
                MaDotDangKy = "DOT_K65_2026",
                NgayDangKy = DateTime.Now,
                TrangThai = "choDuyet"
            };

            var dto = d.ToApplicationListItemDto();
            Assert.Equal("DK-65089", dto.Id);
            Assert.Equal("Chờ duyệt", dto.Status);
        }
    }
}

