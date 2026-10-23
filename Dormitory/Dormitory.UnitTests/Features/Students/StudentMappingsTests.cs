using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Features.Students.Mappings;

namespace Dormitory.UnitTests.Features.Students
{
    public class StudentMappingsTests
    {
        [Fact]
        public void ToSinhVienListItemDto_MapsCorrectly()
        {
            var sv = new SinhVien
            {
                MaSinhVien = "6451071012",
                HoTen = "Trần Minh Hoàng",
                GioiTinh = "nam",
                Cccd = "079203001842",
                NamNhapHoc = 2024,
                NgaySinh = new DateTime(2004, 5, 14),
                TrangThai = "dangHoc"
            };

            var dto = sv.ToSinhVienListItemDto();
            Assert.Equal("6451071012", dto.Mssv);
            Assert.Equal("Trần Minh Hoàng", dto.Name);
            Assert.Equal("K64", dto.Cohort);
            Assert.Equal("Nam", dto.Gender);
        }
    }
}

