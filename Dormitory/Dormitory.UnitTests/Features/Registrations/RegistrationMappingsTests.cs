using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Buildings.Entities;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Registrations.Mappings;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.Students.Entities;

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

        [Fact]
        public void ToApplicationListItemDto_MapsFullProfileAndRejectionReason()
        {
            var d = new DonDangKy
            {
                MaDonDangKy = "DK-65110",
                MaSinhVien = "6451071012",
                MaDotDangKy = "DOT_2026",
                MaPhong = "A01_A101",
                NgayDangKy = new DateTime(2026, 9, 5, 9, 30, 0),
                TrangThai = "tuChoi",
                GhiChu = "Hồ sơ thiếu giấy xác nhận hộ nghèo",
                MaNhanVienDuyet = "NV01",
                NgayDuyet = new DateTime(2026, 9, 6, 14, 0, 0),
                DotDangKy = new DotDangKy
                {
                    MaDotDangKy = "DOT_2026",
                    TenDot = "Đợt tuyển sinh KTX 2026"
                },
                SinhVien = new SinhVien
                {
                    MaSinhVien = "6451071012",
                    HoTen = "Trần Minh Hoàng",
                    NgaySinh = new DateTime(2005, 5, 14),
                    GioiTinh = "nam",
                    Cccd = "079205001842",
                    DienThoai = "0938124991",
                    Email = "hoang@utc2.edu.vn",
                    DiaChiThuongTru = "Biên Hòa, Đồng Nai",
                    MaLop = "CNTT01_K64",
                    NamNhapHoc = 2023,
                    DoiTuongUuTien = "Hộ nghèo",
                    LopHoc = new LopHoc { MaLop = "CNTT01_K64", TenKhoa = "CNTT" }
                },
                Phong = new Phong
                {
                    MaPhong = "A01_A101",
                    ToaNha = new ToaNha { MaToaNha = "A01", TenToaNha = "Tòa A1" },
                    LoaiPhong = new LoaiPhong { MaLoaiPhong = "LP_TC", TenLoaiPhong = "Tiêu chuẩn", GiaThueThang = 450000m }
                }
            };

            var dto = d.ToApplicationListItemDto();
            Assert.Equal("Bị từ chối", dto.Status);
            Assert.Equal("Hồ sơ thiếu giấy xác nhận hộ nghèo", dto.RejectionReason);
            Assert.Equal("14/05/2005", dto.DateOfBirth);
            Assert.Equal("079205001842", dto.Cccd);
            Assert.Equal("0938124991", dto.Phone);
            Assert.Equal("hoang@utc2.edu.vn", dto.Email);
            Assert.Equal("CNTT01_K64", dto.ClassName);
            Assert.Equal(2023, dto.IntakeYear);
            Assert.Equal("Đợt tuyển sinh KTX 2026", dto.RoundName);
            Assert.Equal("Tòa A1", dto.BuildingName);
            Assert.Equal("A01_A101", dto.RoomCode);
            Assert.Equal(450000m, dto.MonthlyFee);
            Assert.Equal("NV01", dto.ApprovedBy);
        }
    }
}

