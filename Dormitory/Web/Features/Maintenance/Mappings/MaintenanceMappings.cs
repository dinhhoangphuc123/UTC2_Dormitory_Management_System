using Dormitory.Web.Features.Maintenance.DTOs;
using Dormitory.Web.Features.Maintenance.Entities;

namespace Dormitory.Web.Features.Maintenance.Mappings
{
    public static class MaintenanceMappings
    {
        public static MaintenanceTicketDto ToMaintenanceTicketDto(this YeuCauSuaChua t)
        {
            string bld = t.Phong?.MaToaNha ?? string.Empty;
            string roomLabel = t.Phong != null ? $"{t.Phong.MaToaNha}-{t.Phong.MaPhong.Split('_').Last()}" : string.Empty;
            string rep = t.SinhVienGui?.HoTen ?? string.Empty;
            string phone = t.SinhVienGui?.DienThoai ?? string.Empty;

            string cat = "Điện dân dụng";
            if (t.MoTa.Contains("nước") || t.MoTa.Contains("lavabo") || t.MoTa.Contains("van")) cat = "Nước / Vệ sinh";
            else if (t.MoTa.Contains("cửa") || t.MoTa.Contains("khóa")) cat = "Khóa cửa / Cửa sổ";
            else if (t.MoTa.Contains("giường") || t.MoTa.Contains("tủ") || t.MoTa.Contains("gỗ")) cat = "Đồ gỗ / Giường tủ";
            else if (t.MoTa.Contains("mạng") || t.MoTa.Contains("LAN") || t.MoTa.Contains("wifi")) cat = "Thiết bị mạng";

            string pri = t.MoTa.Contains("khẩn") || t.MoTa.Contains("chập") || t.MoTa.Contains("khét") || t.MoTa.Contains("ngập") ? "Khẩn cấp" : "Bình thường";

            string st = t.TrangThai switch
            {
                "dangXuLy" => "IN_PROGRESS",
                "hoanThanh" => "COMPLETED",
                _ => "PENDING"
            };

            return new MaintenanceTicketDto
            {
                Id = t.MaYeuCau.ToString(),
                Code = $"SC-{t.MaYeuCau:D6}",
                Room = roomLabel,
                Building = bld,
                Category = cat,
                Title = t.MoTa.Length > 48 ? t.MoTa.Substring(0, 48) : t.MoTa,
                Description = t.MoTa,
                Reporter = rep,
                Phone = phone,
                Technician = t.NhanVienXuLy?.HoTen,
                Priority = pri,
                Status = st,
                CreatedAt = t.NgayGui.ToString("dd/MM/yyyy HH:mm")
            };
        }
    }
}
