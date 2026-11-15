using Dormitory.Web.Features.Registrations.DTOs;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Academic.Mappings;

namespace Dormitory.Web.Features.Registrations.Mappings
{
    public static class RegistrationMappings
    {
        public static ApplicationListItemDto ToApplicationListItemDto(this DonDangKy d)
        {
            string status = d.TrangThai switch
            {
                "daDuyet" => "Đã duyệt",
                "tuChoi" => "Bị từ chối",
                "hetHan" => "Hết hạn",
                _ => "Chờ duyệt"
            };

            string priorityStr = d.SinhVien?.DoiTuongUuTien ?? "—";
            string roomPref = d.Phong != null 
                ? $"{d.Phong.MaPhong} ({(d.Phong.LoaiPhong?.TenLoaiPhong ?? d.LoaiPhong?.TenLoaiPhong ?? "—")})"
                : (d.LoaiPhong?.TenLoaiPhong ?? "—");

            return new ApplicationListItemDto
            {
                Id = d.MaDonDangKy,
                ApplicationCode = $"#{d.MaDonDangKy}",
                StudentName = d.SinhVien?.HoTen ?? "Sinh viên",
                Mssv = d.MaSinhVien,
                Major = d.SinhVien?.LopHoc?.TenKhoa ?? "—",
                Cohort = d.SinhVien != null
                    ? AcademicMappings.GetCohortCode(d.SinhVien.MaLop, d.SinhVien.NamNhapHoc).ToUpperInvariant()
                    : "—",
                Gender = d.SinhVien?.GioiTinh switch
                {
                    "nu" => "Nữ",
                    "nam" => "Nam",
                    _ => "—"
                },
                AvatarUrl = "",
                PriorityCategory = priorityStr,
                RoomPreference = roomPref,
                ScoreDX = null,
                EntranceScore = "—",
                Hometown = d.SinhVien?.DiaChiThuongTru ?? "—",
                ProofDocument = "—",
                SubmittedAt = d.NgayDangKy.ToString("HH:mm, dd/MM/yyyy"),
                Status = status,
                ClassName = d.SinhVien?.MaLop ?? "—",
                IntakeYear = d.SinhVien?.NamNhapHoc,
                DateOfBirth = d.SinhVien != null ? d.SinhVien.NgaySinh.ToString("dd/MM/yyyy") : "—",
                Cccd = d.SinhVien?.Cccd ?? "—",
                Phone = d.SinhVien?.DienThoai ?? "—",
                Email = d.SinhVien?.Email ?? "—",
                RoundCode = d.MaDotDangKy,
                RoundName = d.DotDangKy?.TenDotHienThi ?? d.MaDotDangKy,
                BuildingName = d.Phong?.ToaNha?.TenToaNha ?? "—",
                RoomCode = d.Phong?.MaPhong ?? d.MaPhong ?? "—",
                RoomTypeName = d.Phong?.LoaiPhong?.TenLoaiPhong ?? d.LoaiPhong?.TenLoaiPhong ?? "—",
                MonthlyFee = d.Phong?.LoaiPhong?.GiaThueThang ?? d.LoaiPhong?.GiaThueThang,
                RejectionReason = d.TrangThai == "tuChoi"
                    ? (string.IsNullOrWhiteSpace(d.GhiChu) ? "Không đạt điều kiện xét duyệt" : d.GhiChu)
                    : null,
                Note = d.GhiChu,
                ApprovedBy = d.MaNhanVienDuyet,
                ApprovedAt = d.NgayDuyet?.ToString("HH:mm, dd/MM/yyyy")
            };
        }
    }
}
