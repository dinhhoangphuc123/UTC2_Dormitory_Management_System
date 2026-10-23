using Dormitory.Web.Features.Registrations.DTOs;
using Dormitory.Web.Features.Registrations.Entities;

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

            string priorityStr = d.GhiChu?.Contains("Hộ nghèo") == true ? "Hộ nghèo"
                : d.GhiChu?.Contains("chính sách") == true ? "Gia đình CS"
                : d.SinhVien?.DoiTuongUuTien ?? "Điểm > 27.5";

            return new ApplicationListItemDto
            {
                Id = d.MaDonDangKy,
                ApplicationCode = $"#{d.MaDonDangKy}",
                StudentName = d.SinhVien?.HoTen ?? "Sinh viên",
                Mssv = d.MaSinhVien,
                Major = d.SinhVien?.LopHoc?.TenKhoa ?? "CNTT",
                Cohort = "K65",
                Gender = d.SinhVien?.GioiTinh == "nu" ? "Nữ" : "Nam",
                AvatarUrl = (d.SinhVien?.GioiTinh == "nu")
                    ? "https://lh3.googleusercontent.com/aida-public/AB6AXuDrIKIyFhAEn57rlV_Izz6q-E-d6K3XzKRc8-IbeneR8D2fkV8v1Qnyd1wFHOJZg41Fz8BfUUhwoFdgHiFy-0wnVT0nzp2XzeRKZoe0GtqdHvMpbNa9-hSEuvxOxhO_nWPwGkuGWsdmqPw1EtFSSVbnoNnkpnT3TnZdSjvyT9vIxRrmAZxVH3825PE4ufvF56eDncofbyWs4lCxNUnBXxxjF-Xz8KLVw5kRC2YIN1Ss5ngMe9RRQlUQfw"
                    : "https://lh3.googleusercontent.com/aida-public/AB6AXuD798jURCF5IV70n9oR_4AGjJxXADv4s1sLIDoOeoGfGLquw4Z_AOp2-KrB-T3aZ482WZOSbnB_Kptt5DsMZgoVxkV5gavSZ4XILDyt-qa7Aq_HMIVUcAYfD3O6mJ_luZWc5x9VZqnoH_QknwEqfS-VhHJj8Pl9D7CDzMyVHXkskNinfbhfNK_bmIT7_DrE2CBs_u9kjFWmXmB1JniogXSuccZUGH3c42-AixoRZ_AMdOHpXvNx82EQNA",
                PriorityCategory = priorityStr,
                RoomPreference = d.LoaiPhong?.TenLoaiPhong ?? "Tòa A01 • 8C",
                ScoreDX = priorityStr == "Hộ nghèo" ? 9.5 : 9.0,
                EntranceScore = "27.65 điểm",
                Hometown = d.SinhVien?.DiaChiThuongTru ?? "Khu vực 1",
                ProofDocument = "Giấy chứng nhận diện chính sách (PDF)",
                SubmittedAt = d.NgayDangKy.ToString("HH:mm, dd/MM"),
                Status = status
            };
        }
    }
}

