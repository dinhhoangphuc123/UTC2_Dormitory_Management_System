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
                _ => "Chờ duyệt"
            };

            string priorityStr = d.SinhVien?.DoiTuongUuTien ?? "—";

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
                RoomPreference = d.LoaiPhong?.TenLoaiPhong ?? "—",
                ScoreDX = null,
                EntranceScore = "—",
                Hometown = d.SinhVien?.DiaChiThuongTru ?? "—",
                ProofDocument = "—",
                SubmittedAt = d.NgayDangKy.ToString("HH:mm, dd/MM"),
                Status = status
            };
        }
    }
}
