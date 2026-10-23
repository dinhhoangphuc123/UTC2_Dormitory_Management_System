using Dormitory.Web.Features.Violations.DTOs;
using Dormitory.Web.Features.Violations.Entities;

namespace Dormitory.Web.Features.Violations.Mappings
{
    public static class ViolationMappings
    {
        public static ViolationRecordDto ToViolationRecordDto(this ViPham v)
        {
            var sv = v.SinhVien;
            var hd = sv?.DanhSachHopDong?.FirstOrDefault(h => h.TrangThai == "hieuLuc");
            var phong = hd?.Giuong?.Phong;
            string bld = phong?.MaToaNha ?? string.Empty;
            string room = phong != null ? $"P.{phong.MaPhong.Split('_').Last()}" : string.Empty;

            string pType = v.HinhThucXuLy switch
            {
                "nhacNho" => "remind",
                "canhCao" => "warning",
                "buocRaKhoi" => "expel",
                _ => "reprimand"
            };

            string pLabel = v.HinhThucXuLy switch
            {
                "nhacNho" => "Nhắc nhở",
                "canhCao" => "Cảnh cáo",
                "buocRaKhoi" => "Buộc rời KTX",
                _ => "Khiển trách"
            };

            string vType = "cook";
            string content = (v.NoiDung ?? v.LoaiViPham?.TenLoaiViPham ?? "").ToLower();
            if (content.Contains("ồn")) vType = "noise";
            else if (content.Contains("người") || content.Contains("ngoài")) vType = "guest";
            else if (content.Contains("bạc") || content.Contains("cấm")) vType = "gambling";
            else if (content.Contains("điện")) vType = "electric";
            else if (content.Contains("thuốc")) vType = "smoke";

            return new ViolationRecordDto
            {
                Id = v.MaViPham.ToString(),
                Code = $"BB-{v.NgayViPham:yyyy}-{v.MaViPham:D4}",
                StudentId = sv?.MaSinhVien ?? string.Empty,
                StudentName = sv?.HoTen ?? string.Empty,
                Room = room,
                Building = bld,
                Violation = v.LoaiViPham?.TenLoaiViPham ?? string.Empty,
                ViolationType = vType,
                Date = v.NgayViPham.ToString("dd/MM/yyyy"),
                Penalty = pLabel,
                PenaltyType = pType,
                Status = "Đã ghi nhận",
                Notes = v.NoiDung ?? string.Empty
            };
        }
    }
}
