using Dormitory.Web.Features.Staff.Entities;
using Dormitory.Web.Features.Staff.Mappings;

namespace Dormitory.UnitTests.Features.Staff
{
    public class StaffMappingsTests
    {
        [Fact]
        public void ToStaffItemDto_MapsCorrectly()
        {
            var nv = new NhanVien
            {
                MaNhanVien = "NV01",
                HoTen = "Nguyễn Văn An",
                ChucVu = "Trưởng Ban Quản lý",
                DienThoai = "0903112458",
                Email = "an@utc2.edu.vn",
                TrangThai = "dangLam"
            };

            var dto = nv.ToStaffItemDto();
            Assert.Equal("NV01", dto.Id);
            Assert.Equal("Nguyễn Văn An", dto.Name);
            Assert.Equal("active", dto.Status);
            Assert.Equal("Chưa đăng nhập", dto.LastLogin);
            Assert.Equal("Chưa phân quyền", dto.Role);
            Assert.Equal("Chưa phân công", dto.ManagedArea);
        }
    }
}
