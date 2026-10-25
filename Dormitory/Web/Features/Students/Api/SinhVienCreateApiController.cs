using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Students.Entities;
using ClosedXML.Excel;

namespace Dormitory.Web.Features.Students.Api
{
    [ApiController]
    [Route("api/sinhvien")]
    public class SinhVienCreateApiController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SinhVienCreateApiController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSinhVienRequest req, [FromQuery] string? academicYear)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null || req.NamNhapHoc < year.NgayBatDau.Year || req.NamNhapHoc > year.NgayKetThuc.Year)
                return BadRequest("Năm nhập học của sinh viên phải thuộc năm học đang chọn.");

            if (string.IsNullOrWhiteSpace(req.MaSinhVien))
                return BadRequest("MSSV không được để trống.");
            if (string.IsNullOrWhiteSpace(req.HoTen))
                return BadRequest("Họ tên không được để trống.");
            if (string.IsNullOrWhiteSpace(req.MaLop))
                return BadRequest("Vui lòng chọn lớp.");
            if (await _context.SinhViens.AnyAsync(s => s.MaSinhVien == req.MaSinhVien))
                return BadRequest("MSSV đã tồn tại.");
            if (!await _context.LopHocs.AnyAsync(l => l.MaLop == req.MaLop))
                return BadRequest("Lớp không tồn tại.");

            var student = new SinhVien
            {
                MaSinhVien = req.MaSinhVien.Trim(),
                HoTen = req.HoTen.Trim(),
                NgaySinh = req.NgaySinh,
                GioiTinh = string.IsNullOrWhiteSpace(req.GioiTinh) ? "nam" : req.GioiTinh,
                Cccd = req.Cccd?.Trim() ?? string.Empty,
                DienThoai = string.IsNullOrWhiteSpace(req.DienThoai) ? null : req.DienThoai.Trim(),
                Email = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim(),
                DiaChiThuongTru = string.IsNullOrWhiteSpace(req.DiaChiThuongTru) ? null : req.DiaChiThuongTru.Trim(),
                MaLop = req.MaLop,
                NamNhapHoc = req.NamNhapHoc,
                DoiTuongUuTien = string.IsNullOrWhiteSpace(req.DoiTuongUuTien) ? null : req.DoiTuongUuTien.Trim(),
                TrangThai = "dangHoc"
            };
            _context.SinhViens.Add(student);
            await _context.SaveChangesAsync();
            return Ok(student);
        }

        [HttpPost("import")]
        public async Task<IActionResult> Import(IFormFile file, [FromQuery] string? academicYear)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null)
                return BadRequest("Vui lòng chọn một năm học hợp lệ trước khi nhập dữ liệu.");

            if (file == null || file.Length == 0)
                return BadRequest("Vui lòng chọn file Excel.");
            if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
                return BadRequest("Chỉ hỗ trợ file .xlsx.");

            int imported = 0;
            using (var stream = file.OpenReadStream())
            using (var workbook = new XLWorkbook(stream))
            {
                var ws = workbook.Worksheet(1);
                var usedRange = ws.RangeUsed();
                if (usedRange is null)
                    return BadRequest("File Excel không có dữ liệu.");

                var rows = usedRange.RowsUsed().Skip(1); // skip header
                foreach (var row in rows)
                {
                    var mssv = row.Cell(1).GetString().Trim();
                    if (string.IsNullOrWhiteSpace(mssv)) continue;
                    if (await _context.SinhViens.AnyAsync(s => s.MaSinhVien == mssv)) continue;

                    var maLop = row.Cell(9).GetString().Trim();
                    if (!await _context.LopHocs.AnyAsync(l => l.MaLop == maLop)) continue;

                    DateTime.TryParse(row.Cell(3).GetString(), out var ngaySinh);
                    int.TryParse(row.Cell(10).GetString(), out var namNhapHoc);
                    if (namNhapHoc < year.NgayBatDau.Year || namNhapHoc > year.NgayKetThuc.Year) continue;

                    var student = new SinhVien
                    {
                        MaSinhVien = mssv,
                        HoTen = row.Cell(2).GetString().Trim(),
                        NgaySinh = ngaySinh == default ? DateTime.Today : ngaySinh,
                        GioiTinh = string.IsNullOrWhiteSpace(row.Cell(4).GetString()) ? "nam" : row.Cell(4).GetString().Trim().ToLower(),
                        Cccd = row.Cell(5).GetString().Trim(),
                        DienThoai = string.IsNullOrWhiteSpace(row.Cell(6).GetString()) ? null : row.Cell(6).GetString().Trim(),
                        Email = string.IsNullOrWhiteSpace(row.Cell(7).GetString()) ? null : row.Cell(7).GetString().Trim(),
                        DiaChiThuongTru = string.IsNullOrWhiteSpace(row.Cell(8).GetString()) ? null : row.Cell(8).GetString().Trim(),
                        MaLop = maLop,
                        NamNhapHoc = namNhapHoc,
                        DoiTuongUuTien = string.IsNullOrWhiteSpace(row.Cell(11).GetString()) ? null : row.Cell(11).GetString().Trim(),
                        TrangThai = "dangHoc"
                    };
                    _context.SinhViens.Add(student);
                    imported++;
                }
                await _context.SaveChangesAsync();
            }
            return Ok(new { success = true, message = $"Đã nhập {imported} sinh viên.", imported });
        }
    }

    public class CreateSinhVienRequest
    {
        public string MaSinhVien { get; set; } = string.Empty;
        public string HoTen { get; set; } = string.Empty;
        public DateTime NgaySinh { get; set; }
        public string GioiTinh { get; set; } = "nam";
        public string Cccd { get; set; } = string.Empty;
        public string? DienThoai { get; set; }
        public string? Email { get; set; }
        public string? DiaChiThuongTru { get; set; }
        public string MaLop { get; set; } = string.Empty;
        public int NamNhapHoc { get; set; }
        public string? DoiTuongUuTien { get; set; }
    }
}
