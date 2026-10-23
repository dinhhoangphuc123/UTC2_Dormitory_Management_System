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
            string bld = phong?.MaToaNha ?? "A01";
            string room = phong != null ? $"P.{phong.MaPhong.Split('_').Last()}" : "P.304";

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
                Code = $"BB-2026-{v.MaViPham:D3}",
                StudentId = sv?.MaSinhVien ?? "72DCHT21045",
                StudentName = sv?.HoTen ?? "Trần Minh Hoàng",
                Room = room,
                Building = bld,
                Violation = v.LoaiViPham?.TenLoaiViPham ?? "Nấu ăn sai quy định",
                ViolationType = vType,
                Date = v.NgayViPham.ToString("dd/MM/yyyy"),
                Penalty = pLabel,
                PenaltyType = pType,
                Status = "Đã thi hành",
                Notes = v.NoiDung ?? "Biên bản ghi nhận tại chỗ."
            };
        }
    }
}

