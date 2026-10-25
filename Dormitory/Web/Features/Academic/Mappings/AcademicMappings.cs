using Dormitory.Web.Features.Academic.DTOs;
using Dormitory.Web.Features.Academic.Entities;
using System.Text.RegularExpressions;

namespace Dormitory.Web.Features.Academic.Mappings
{
    public static class AcademicMappings
    {
        public static ClassItemDto ToClassItemDto(this LopHoc l, DateTime? yearStart = null, DateTime? yearEnd = null)
        {
            int residents = l.DanhSachSinhVien.Count(sv => sv.DanhSachHopDong.Any(hd => yearStart.HasValue && yearEnd.HasValue
                ? hd.NgayBatDau <= yearEnd.Value && (hd.NgayTraPhongThucTe ?? hd.NgayKetThuc) >= yearStart.Value
                : hd.TrangThai == "hieuLuc"));
            int total = l.DanhSachSinhVien.Count;

            double rate = total > 0 ? Math.Round((double)residents / total * 100, 1) : 0;
            string fKey = MapFacultyKey(l.TenKhoa);

            return new ClassItemDto
            {
                Id = l.MaLop,
                Code = l.MaLop,
                Name = l.TenLop,
                Faculty = l.TenKhoa,
                FacultyKey = fKey,
                Advisor = "Chưa phân công",
                Cohort = GetCohortCode(l.MaLop, l.NienKhoa),
                Residents = residents,
                TotalStudents = total,
                Rate = rate
            };
        }

        public static string GetCohortCode(string classCode, int academicYear)
        {
            var match = Regex.Match(classCode, @"(?:^|[_-])K(?<cohort>\d+)", RegexOptions.IgnoreCase);
            if (match.Success)
                return $"k{match.Groups["cohort"].Value}";

            return academicYear > 0 ? $"k{academicYear}" : "—";
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
            return "other";
        }
    }
}
