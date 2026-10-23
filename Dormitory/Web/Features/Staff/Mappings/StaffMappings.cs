using Dormitory.Web.Features.Staff.DTOs;
using Dormitory.Web.Features.Staff.Entities;

namespace Dormitory.Web.Features.Staff.Mappings
{
    public static class StaffMappings
    {
        public static StaffItemDto ToStaffItemDto(this NhanVien n)
        {
            var tk = n.TaiKhoan;
            var vt = tk?.VaiTro;

            string dKey = "other";
            string dept = "Chưa phân công";
            string pos = n.ChucVu;

            if (pos.Contains("Giám thị")) { dKey = "gt"; dept = "Tổ Giám thị & Sinh viên"; }
            else if (pos.Contains("Kỹ sư") || pos.Contains("Kỹ thuật") || pos.Contains("Điện")) { dKey = "kt"; dept = "Tổ Kỹ thuật - Vận hành"; }
            else if (pos.Contains("Kế toán") || pos.Contains("Thu chi")) { dKey = "tc"; dept = "Tổ Thu chi & Hóa đơn"; }
            else if (pos.Contains("Bảo vệ") || pos.Contains("An ninh")) { dKey = "bv"; dept = "Tổ An ninh Trật tự"; }

            string rName = vt?.TenVaiTro ?? "Chưa phân quyền";
            string rKey = vt?.MaVaiTro switch
            {
                "admin" => "admin",
                "quanLy" => "manager",
                "keToan" or "nhanVien" => "operator",
                _ => "other"
            };

            bool isActive = (tk == null || tk.LaDangHoat) && n.TrangThai == "dangLam";

            string initials = string.Concat(
                n.HoTen.Trim()
                    .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                    .TakeLast(2)
                    .Select(w => char.ToUpper(w[0]))
            );

            return new StaffItemDto
            {
                Id = n.MaNhanVien,
                Code = n.MaNhanVien.StartsWith("NV-") ? n.MaNhanVien : $"NV-{n.MaNhanVien}",
                Name = n.HoTen,
                AvatarText = string.IsNullOrEmpty(initials) ? "NV" : initials,
                LastLogin = tk?.LanDangNhapCuoi?.ToString("dd/MM/yyyy HH:mm") ?? "Chưa đăng nhập",
                Position = n.ChucVu,
                Department = dept,
                DepartmentKey = dKey,
                ManagedArea = n.ToaNhaPhuTrach != null ? $"Tòa {n.ToaNhaPhuTrach.MaToaNha}" : "Chưa phân công",
                Phone = n.DienThoai ?? "—",
                Email = n.Email ?? "—",
                Role = rName,
                RoleKey = rKey,
                Status = isActive ? "active" : "locked"
            };
        }
    }
}
