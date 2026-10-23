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

            string dKey = "bql";
            string dept = "Ban Quản trị KTX";
            string pos = n.ChucVu;

            if (pos.Contains("Giám thị")) { dKey = "gt"; dept = "Tổ Giám thị & Sinh viên"; }
            else if (pos.Contains("Kỹ sư") || pos.Contains("Kỹ thuật") || pos.Contains("Điện")) { dKey = "kt"; dept = "Tổ Kỹ thuật - Vận hành"; }
            else if (pos.Contains("Kế toán") || pos.Contains("Thu chi")) { dKey = "tc"; dept = "Tổ Thu chi & Hóa đơn"; }
            else if (pos.Contains("Bảo vệ") || pos.Contains("An ninh")) { dKey = "bv"; dept = "Tổ An ninh Trật tự"; }

            string rName = vt?.TenVaiTro ?? (n.MaNhanVien == "NV001" ? "System Admin" : "Ban Quản lý");
            string rKey = rName switch
            {
                "System Admin" => "admin",
                "Kỹ thuật viên" => "operator",
                "Kế toán" => "operator",
                "Chỉ xem (Viewer)" => "viewer",
                _ => "manager"
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
                LastLogin = tk?.LanDangNhapCuoi?.ToString("dd/MM/yyyy HH:mm") ?? "10 phút trước",
                Position = n.ChucVu,
                Department = dept,
                DepartmentKey = dKey,
                ManagedArea = n.ToaNhaPhuTrach != null ? $"Tòa {n.ToaNhaPhuTrach.MaToaNha}" : "Toàn bộ KTX",
                Phone = n.DienThoai ?? "0918.234.567",
                Email = n.Email ?? $"{n.MaNhanVien.ToLower()}@utc2.edu.vn",
                Role = rName,
                RoleKey = rKey,
                Status = isActive ? "active" : "locked"
            };
        }

        public static StaffItemDto ToStaffItemDto(this NhanVien entity, CreateStaffDto req)
        {
            string initials = string.Concat(
                req.Name.Trim()
                    .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                    .TakeLast(2)
                    .Select(w => char.ToUpper(w[0]))
            );

            return new StaffItemDto
            {
                Id = entity.MaNhanVien,
                Code = entity.MaNhanVien,
                Name = req.Name,
                AvatarText = string.IsNullOrEmpty(initials) ? "NV" : initials,
                LastLogin = "Chưa đăng nhập",
                Position = req.Position,
                Department = req.Department,
                DepartmentKey = req.DepartmentKey,
                ManagedArea = req.ManagedArea,
                Phone = req.Phone,
                Email = req.Email,
                Role = req.Role,
                RoleKey = req.Role == "System Admin" ? "admin" : "manager",
                Status = "active"
            };
        }
    }
}

