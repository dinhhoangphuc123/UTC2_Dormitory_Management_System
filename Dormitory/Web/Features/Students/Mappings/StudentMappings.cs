using Dormitory.Web.Features.Students.DTOs;
using Dormitory.Web.Features.Students.Entities;

namespace Dormitory.Web.Features.Students.Mappings
{
    public static class StudentMappings
    {
        public static SinhVienListItemDto ToSinhVienListItemDto(this SinhVien s)
        {
            var activeContract = s.DanhSachHopDong?.FirstOrDefault(h => h.TrangThai == "hieuLuc");
            var phong = activeContract?.Giuong?.Phong;
            var toa = phong?.ToaNha;

            string roomNumber = phong != null ? phong.MaPhong.Split('_').Last() : "Chưa xếp";
            string bedNumber = activeContract?.Giuong != null ? $"G0{activeContract.Giuong.SoThuTu}" : "Chưa có";
            string buildingId = toa?.MaToaNha ?? "A01";
            int floor = phong?.SoTang ?? 1;

            string cohortStr = s.NamNhapHoc switch
            {
                2025 => "K65",
                2024 => "K64",
                2023 => "K63",
                2022 => "K62",
                _ => "K64"
            };

            string avatar = s.GioiTinh == "nu"
                ? "https://lh3.googleusercontent.com/aida-public/AB6AXuC4eBy4iKqJSSJaK36G-uNk6bORYFLSwK3hhn5u4Zt-x7LoLjuRgo6_eqZ-4yCQNFfOvCByJSsoUltlvv89Ccx_zqOlPTHU5370_87_53BkRiNvK_T3DmJrqzeQnuu8aPManRY2Jkv6htn6iZbjRYIAlpJzSQ-ZoXfuo89D8s8C9ynbwfdQ5L_gob1dgOVsycNqMXcoWVQn0PkY2dARObOpvSqfJ8Xrk3cwZstOicCWbxrkHxLUDwnyDw"
                : "https://lh3.googleusercontent.com/aida-public/AB6AXuApy05bQf0n4X_3prqg9yRnz1Up26ewX2j1XKbV6Xt4a-hJZehP0j72pEsQwNuUzh_nPoWXQGNOgFkC2Me0lALOeEj0dQADljvkwQMdtiZQzuASphPArI_NMYnujwIu8_vxfXfLlucOEC-ZSM50VINW56baL0PSL5VAHyQNPkgrhhNC18YFXZgdM9I51O-AR2Xn0aYBoy4fwCLeh5tLezRdOv5KlpxttMInEo_NnrWTT7t_2jRPIDcxwQ";

            return new SinhVienListItemDto
            {
                Id = s.MaSinhVien,
                Mssv = s.MaSinhVien,
                Name = s.HoTen,
                Cccd = s.Cccd,
                AvatarUrl = avatar,
                Gender = s.GioiTinh == "nu" ? "Nữ" : "Nam",
                Cohort = cohortStr,
                Major = s.LopHoc?.TenKhoa ?? "CNTT",
                ClassName = s.LopHoc?.TenLop ?? s.MaLop,
                BuildingId = buildingId,
                Floor = floor,
                RoomNumber = roomNumber,
                BedNumber = bedNumber,
                Phone = s.DienThoai ?? "0900 000 000",
                Hometown = s.DiaChiThuongTru ?? "TP. Hồ Chí Minh",
                PaymentStatus = (s.MaSinhVien == "6451071088") ? "Nợ" : "Đủ",
                DebtAmount = (s.MaSinhVien == "6451071088") ? 250000 : 0,
                ResidenceStatus = (s.MaSinhVien == "6351020045") ? "Tạm vắng" : "Đang ở",
                AdmissionDate = activeContract != null ? activeContract.NgayBatDau.ToString("dd/MM/yyyy") : "05/09/2026",
                BirthDate = s.NgaySinh.ToString("dd/MM/yyyy"),
                PriorityCategory = s.DoiTuongUuTien
            };
        }
    }
}

