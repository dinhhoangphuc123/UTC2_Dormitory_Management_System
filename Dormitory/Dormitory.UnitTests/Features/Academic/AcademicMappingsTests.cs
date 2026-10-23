using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Academic.Mappings;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Students.Entities;

namespace Dormitory.UnitTests.Features.Academic
{
    public class AcademicMappingsTests
    {
        [Fact]
        public void ToClassItemDto_UsesPersistedClassAndStudentData()
        {
            var entity = new LopHoc
            {
                MaLop = "CNTT01_K64",
                TenLop = "Công nghệ Thông tin 01",
                TenKhoa = "CNTT",
                NienKhoa = 2024,
                DanhSachSinhVien =
                [
                    new SinhVien
                    {
                        DanhSachHopDong =
                        [
                            new HopDong { TrangThai = "hieuLuc" }
                        ]
                    },
                    new SinhVien()
                ]
            };

            var dto = entity.ToClassItemDto();

            Assert.Equal("k64", dto.Cohort);
            Assert.Equal("Chưa phân công", dto.Advisor);
            Assert.Equal(2, dto.TotalStudents);
            Assert.Equal(1, dto.Residents);
            Assert.Equal(50, dto.Rate);
        }

        [Fact]
        public void ToClassItemDto_ReportsZeroCountsWhenClassHasNoStudents()
        {
            var entity = new LopHoc
            {
                MaLop = "CNTT01_K65",
                TenLop = "Công nghệ Thông tin 01",
                TenKhoa = "CNTT",
                NienKhoa = 2025
            };

            var dto = entity.ToClassItemDto();

            Assert.Equal(0, dto.TotalStudents);
            Assert.Equal(0, dto.Residents);
            Assert.Equal(0, dto.Rate);
        }
    }
}
