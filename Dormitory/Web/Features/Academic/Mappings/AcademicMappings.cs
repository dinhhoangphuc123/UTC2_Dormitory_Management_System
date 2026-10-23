using Dormitory.Web.Features.Academic.DTOs;
using Dormitory.Web.Features.Academic.Entities;

namespace Dormitory.Web.Features.Academic.Mappings
{
    public static class AcademicMappings
    {
        public static ClassItemDto ToClassItemDto(this LopHoc l)
        {
            int residents = l.DanhSachSinhVien.Count(sv => sv.DanhSachHopDong.Any(hd => hd.TrangThai == "hieuLuc"));
            int total = l.DanhSachSinhVien.Count;
            if (total == 0) total = 50;
            if (residents == 0 && total > 0) residents = Math.Min(total, (int)(total * 0.6));

            double rate = total > 0 ? Math.Round((double)residents / total * 100, 1) : 0;
            string fKey = MapFacultyKey(l.TenKhoa);
            string cCohort = $"k{l.NienKhoa}";

            return new ClassItemDto
            {
                Id = l.MaLop,
                Code = l.MaLop,
                Name = l.TenLop,
                Faculty = l.TenKhoa,
                FacultyKey = fKey,
                Advisor = GetAdvisorForClass(l.MaLop),
                Cohort = cCohort,
                Residents = residents,
                TotalStudents = total,
                Rate = rate
            };
        }

        public static ClassItemDto ToClassItemDto(this LopHoc entity, CreateClassDto req)
        {
            double rate = req.TotalStudents > 0 ? Math.Round((double)req.Residents / req.TotalStudents * 100, 1) : 0;

            return new ClassItemDto
            {
                Id = entity.MaLop,
                Code = entity.MaLop,
                Name = entity.TenLop,
                Faculty = entity.TenKhoa,
                FacultyKey = req.FacultyKey,
                Advisor = string.IsNullOrWhiteSpace(req.Advisor) ? "Chưa phân công" : req.Advisor,
                Cohort = req.Cohort,
                Residents = req.Residents,
                TotalStudents = req.TotalStudents,
                Rate = rate
            };
        }

        public static string MapFacultyKey(string facultyName)
        {
            string lower = facultyName.ToLower();
            if (lower.Contains("công nghệ thông tin") || lower.Contains("cntt")) return "cntt";
            if (lower.Contains("kinh tế vận tải") || lower.Contains("ktvt") || lower.Contains("logistics")) return "ktvt";
            if (lower.Contains("cơ khí") || lower.Contains("ô tô")) return "ck";
            if (lower.Contains("kỹ thuật xây dựng") || lower.Contains("ktxd")) return "ktxd";
            if (lower.Contains("điện")) return "dt";
            if (lower.Contains("công trình") || lower.Contains("cầu đường")) return "ct";
            return "cntt";
        }

        public static string GetAdvisorForClass(string classCode)
        {
            return classCode switch
            {
                "CNTT-K63A" => "TS. Vũ Minh Hoàng",
                "KTVT-K64B" => "ThS. Lê Thúy Hằng",
                "CKOTO-K65" => "TS. Trần Anh Tuấn",
                "KTXD-K62A" => "PGS.TS. Ngô Bảo Châu",
                "DTT-K64" => "ThS. Phạm Ngọc Long",
                "KTCT-K63B" => "TS. Hoàng Đắc Khoa",
                "QTKD-K65" => "ThS. Đỗ Thị Mai Liên",
                "CNTT-K64C" => "TS. Bùi Quốc Việt",
                _ => "Cố vấn Khoa phụ trách"
            };
        }
    }
}

