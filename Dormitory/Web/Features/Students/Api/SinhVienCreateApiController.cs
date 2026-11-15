using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Accounts.Entities;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Students.Entities;
using ClosedXML.Excel;
using Dormitory.Web.Shared.Constants;

namespace Dormitory.Web.Features.Students.Api
{
    [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
    [ApiController]
    [Route("api/sinhvien")]
    public class SinhVienCreateApiController : ControllerBase
    {
        private static readonly Regex EmailRegex = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);
        private static readonly Regex PhoneRegex = new(@"^0\d{9,10}$", RegexOptions.Compiled);

        private readonly ApplicationDbContext _context;
        private readonly IPasswordHasher _passwordHasher;

        public SinhVienCreateApiController(ApplicationDbContext context, IPasswordHasher? passwordHasher = null)
        {
            _context = context;
            _passwordHasher = passwordHasher ?? new PasswordHasher();
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSinhVienRequest req, [FromQuery] string? academicYear)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null || req.NamNhapHoc < year.NgayBatDau.Year || req.NamNhapHoc > year.NgayKetThuc.Year)
                return BadRequest(ApiResponse.Fail("Năm nhập học của sinh viên phải thuộc năm học đang chọn."));

            var validationError = await ValidateStudentInputAsync(
                req.MaSinhVien, req.HoTen, req.Cccd, req.DienThoai, req.Email, req.MaLop,
                req.NgaySinh, req.GioiTinh);
            if (validationError != null)
                return BadRequest(ApiResponse.Fail(validationError));

            var mssv = req.MaSinhVien.Trim();
            var initialPassword = PasswordPolicy.GenerateTemporaryPassword();

            var student = new SinhVien
            {
                MaSinhVien = mssv,
                HoTen = req.HoTen.Trim(),
                NgaySinh = req.NgaySinh.Date,
                GioiTinh = NormalizeGender(req.GioiTinh),
                Cccd = req.Cccd.Trim(),
                DienThoai = string.IsNullOrWhiteSpace(req.DienThoai) ? null : req.DienThoai.Trim(),
                Email = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim().ToLowerInvariant(),
                DiaChiThuongTru = string.IsNullOrWhiteSpace(req.DiaChiThuongTru) ? null : req.DiaChiThuongTru.Trim(),
                MaLop = req.MaLop,
                NamNhapHoc = req.NamNhapHoc,
                DoiTuongUuTien = string.IsNullOrWhiteSpace(req.DoiTuongUuTien) ? null : req.DoiTuongUuTien.Trim(),
                TrangThai = "dangHoc"
            };

            _context.SinhViens.Add(student);
            _context.TaiKhoans.Add(new TaiKhoan
            {
                TenDangNhap = mssv,
                MatKhauHash = _passwordHasher.HashPassword(initialPassword),
                MaVaiTro = RoleNames.SinhVien,
                MaSinhVien = mssv,
                LaDangHoat = true
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = $"Đã tiếp nhận sinh viên {student.HoTen}. Tài khoản: {mssv} - mật khẩu tạm: {initialPassword} (hãy đổi sau lần đăng nhập đầu tiên).",
                data = new { student.MaSinhVien, student.HoTen, username = mssv, initialPassword }
            });
        }

        [HttpPost("import")]
        public async Task<IActionResult> Import(IFormFile file, [FromQuery] string? academicYear)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null)
                return BadRequest(ApiResponse.Fail("Vui lòng chọn một năm học hợp lệ trước khi nhập dữ liệu."));

            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse.Fail("Vui lòng chọn file Excel."));
            if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
                return BadRequest(ApiResponse.Fail("Chỉ hỗ trợ file .xlsx."));

            int imported = 0;
            var errors = new List<ImportRowError>();
            var accounts = new List<string>();

            using (var stream = file.OpenReadStream())
            using (var workbook = new XLWorkbook(stream))
            {
                var ws = workbook.Worksheet(1);
                var usedRange = ws.RangeUsed();
                if (usedRange is null)
                    return BadRequest(ApiResponse.Fail("File Excel không có dữ liệu."));

                var rows = usedRange.RowsUsed().Skip(1); // bỏ dòng tiêu đề
                foreach (var row in rows)
                {
                    int rowNumber = row.RowNumber();
                    var mssv = row.Cell(1).GetString().Trim();
                    if (string.IsNullOrWhiteSpace(mssv))
                    {
                        continue;
                    }

                    var hoTen = row.Cell(2).GetString().Trim();
                    var ngaySinhText = row.Cell(3).GetString().Trim();
                    var gioiTinh = row.Cell(4).GetString().Trim();
                    var cccd = row.Cell(5).GetString().Trim();
                    var dienThoai = row.Cell(6).GetString().Trim();
                    var email = row.Cell(7).GetString().Trim();
                    var diaChi = row.Cell(8).GetString().Trim();
                    var maLop = row.Cell(9).GetString().Trim();
                    var namNhapHocText = row.Cell(10).GetString().Trim();
                    var doiTuongUuTien = row.Cell(11).GetString().Trim();

                    if (!DateTime.TryParse(ngaySinhText, out var ngaySinh))
                    {
                        errors.Add(new ImportRowError(rowNumber, mssv, "Ngày sinh không hợp lệ."));
                        continue;
                    }

                    if (!int.TryParse(namNhapHocText, out var namNhapHoc))
                    {
                        errors.Add(new ImportRowError(rowNumber, mssv, "Năm nhập học không hợp lệ."));
                        continue;
                    }

                    if (namNhapHoc < year.NgayBatDau.Year || namNhapHoc > year.NgayKetThuc.Year)
                    {
                        errors.Add(new ImportRowError(rowNumber, mssv, "Năm nhập học phải thuộc năm học đang chọn."));
                        continue;
                    }

                    var validationError = await ValidateStudentInputAsync(
                        mssv, hoTen, cccd, dienThoai, email, maLop, ngaySinh, gioiTinh);
                    if (validationError != null)
                    {
                        errors.Add(new ImportRowError(rowNumber, mssv, validationError));
                        continue;
                    }

                    var initialPassword = PasswordPolicy.GenerateTemporaryPassword();
                    var normalizedMssv = mssv.Trim();

                    var student = new SinhVien
                    {
                        MaSinhVien = normalizedMssv,
                        HoTen = hoTen,
                        NgaySinh = ngaySinh.Date,
                        GioiTinh = NormalizeGender(gioiTinh),
                        Cccd = cccd.Trim(),
                        DienThoai = string.IsNullOrWhiteSpace(dienThoai) ? null : dienThoai.Trim(),
                        Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant(),
                        DiaChiThuongTru = string.IsNullOrWhiteSpace(diaChi) ? null : diaChi.Trim(),
                        MaLop = maLop,
                        NamNhapHoc = namNhapHoc,
                        DoiTuongUuTien = string.IsNullOrWhiteSpace(doiTuongUuTien) ? null : doiTuongUuTien.Trim(),
                        TrangThai = "dangHoc"
                    };

                    _context.SinhViens.Add(student);
                    _context.TaiKhoans.Add(new TaiKhoan
                    {
                        TenDangNhap = normalizedMssv,
                        MatKhauHash = _passwordHasher.HashPassword(initialPassword),
                        MaVaiTro = RoleNames.SinhVien,
                        MaSinhVien = normalizedMssv,
                        LaDangHoat = true
                    });

                    // Lưu từng dòng để lỗi khóa ngoại/trùng lặp không làm hỏng cả file.
                    try
                    {
                        await _context.SaveChangesAsync();
                        imported++;
                        accounts.Add($"{normalizedMssv}: {initialPassword}");
                    }
                    catch (DbUpdateException ex)
                    {
                        _context.ChangeTracker.Clear();
                        errors.Add(new ImportRowError(rowNumber, mssv, "Không thể lưu dòng này: " + (ex.InnerException?.Message ?? ex.Message)));
                    }
                }
            }

            var message = errors.Count == 0
                ? $"Đã nhập {imported} sinh viên thành công."
                : $"Đã nhập {imported} sinh viên, {errors.Count} dòng bị bỏ qua. Xem danh sách lỗi để sửa lại.";

            return Ok(new
            {
                success = true,
                message,
                imported,
                failed = errors.Count,
                errors,
                accounts
            });
        }

        private async Task<string?> ValidateStudentInputAsync(
            string? mssv,
            string? hoTen,
            string? cccd,
            string? dienThoai,
            string? email,
            string? maLop,
            DateTime ngaySinh,
            string? gioiTinh)
        {
            if (string.IsNullOrWhiteSpace(mssv))
                return "MSSV không được để trống.";
            if (await _context.SinhViens.AnyAsync(s => s.MaSinhVien == mssv.Trim()))
                return $"MSSV {mssv.Trim()} đã tồn tại.";
            if (string.IsNullOrWhiteSpace(hoTen))
                return "Họ tên không được để trống.";
            if (hoTen.Trim().Length > 100)
                return "Họ tên không được vượt quá 100 ký tự.";
            if (ngaySinh == default || ngaySinh.Date > DateTime.Today)
                return "Ngày sinh không hợp lệ.";
            if (string.IsNullOrWhiteSpace(maLop))
                return "Vui lòng chọn lớp.";
            if (!await _context.LopHocs.AnyAsync(l => l.MaLop == maLop))
                return $"Lớp {maLop} không tồn tại.";

            var normalizedCccd = cccd?.Trim() ?? string.Empty;
            if (normalizedCccd.Length is not (9 or 12) || !normalizedCccd.All(char.IsDigit))
                return "CCCD/CMND phải gồm 9 hoặc 12 chữ số.";
            if (await _context.SinhViens.AnyAsync(s => s.Cccd == normalizedCccd))
                return $"CCCD {normalizedCccd} đã được dùng cho sinh viên khác.";

            if (!string.IsNullOrWhiteSpace(dienThoai) && !PhoneRegex.IsMatch(dienThoai.Trim()))
                return "Số điện thoại không đúng định dạng Việt Nam.";
            if (!string.IsNullOrWhiteSpace(email))
            {
                var normalizedEmail = email.Trim().ToLowerInvariant();
                if (!EmailRegex.IsMatch(normalizedEmail))
                    return "Email không đúng định dạng.";
                if (await _context.SinhViens.AnyAsync(s => s.Email != null && s.Email.ToLower() == normalizedEmail))
                    return $"Email {normalizedEmail} đã được dùng cho sinh viên khác.";
            }

            if (!string.IsNullOrWhiteSpace(gioiTinh))
            {
                var normalizedGender = gioiTinh.Trim().ToLowerInvariant();
                if (normalizedGender is not ("nam" or "nu" or "khac"))
                    return "Giới tính chỉ nhận nam, nu hoặc khac.";
            }

            return null;
        }

        private static string NormalizeGender(string? gender)
        {
            var value = gender?.Trim().ToLowerInvariant();
            return value is "nu" or "khac" ? value : "nam";
        }
    }

    public class ImportRowError
    {
        public ImportRowError(int row, string mssv, string message)
        {
            Row = row;
            Mssv = mssv;
            Message = message;
        }

        public int Row { get; }
        public string Mssv { get; }
        public string Message { get; }
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
