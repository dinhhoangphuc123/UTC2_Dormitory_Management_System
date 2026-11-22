using System.Text.RegularExpressions;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Accounts.Entities;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Contracts.Services;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Features.Students.Services;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Helpers;
using Dormitory.Web.Shared.Security;

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
        private readonly IHopDongService? _hopDongService;
        private readonly ICurrentUser? _currentUser;

        public SinhVienCreateApiController(
            ApplicationDbContext context,
            IPasswordHasher? passwordHasher = null,
            IHopDongService? hopDongService = null,
            ICurrentUser? currentUser = null)
        {
            _context = context;
            _passwordHasher = passwordHasher ?? new PasswordHasher();
            _hopDongService = hopDongService;
            _currentUser = currentUser;
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
        public async Task<IActionResult> Import(IFormFile? file, [FromQuery] string? academicYear = null)
        {
            var resolvedYear = !string.IsNullOrWhiteSpace(academicYear)
                ? academicYear
                : Request?.Query["academicYear"].FirstOrDefault();

            var year = string.IsNullOrWhiteSpace(resolvedYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == resolvedYear);
            if (year == null)
                return BadRequest(ApiResponse.Fail("Vui lòng chọn một năm học hợp lệ trước khi nhập dữ liệu."));

            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse.Fail("Vui lòng chọn file Excel."));
            if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
                return BadRequest(ApiResponse.Fail("Chỉ hỗ trợ file .xlsx."));

            int imported = 0;
            int updated = 0;
            int skipped = 0;
            int contractsImported = 0;
            int contractsSkipped = 0;
            var errors = new List<ImportRowError>();
            var accounts = new List<string>();
            bool hasContractColumns = false;

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            try
            {
                using var workbook = new XLWorkbook(stream);
                var ws = workbook.Worksheets.FirstOrDefault();
                var usedRange = ws?.RangeUsed();
                if (usedRange is null)
                    return BadRequest(ApiResponse.Fail("File Excel không có dữ liệu."));

                var headerRow = usedRange.FirstRow();
                var cols = ExcelImportHelper.BuildColumnMap(headerRow);
                bool isNamedLayout = cols.ContainsKey("mssv") &&
                                     (cols.ContainsKey("hoTen") || cols.ContainsKey("cccd") || cols.ContainsKey("maLop"));

                if (!isNamedLayout)
                {
                    // Hỗ trợ file mẫu 11 cột truyền thống theo đúng thứ tự cố định
                    cols = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                    {
                        ["mssv"] = 1,
                        ["hoTen"] = 2,
                        ["ngaySinh"] = 3,
                        ["gioiTinh"] = 4,
                        ["cccd"] = 5,
                        ["dienThoai"] = 6,
                        ["email"] = 7,
                        ["diaChi"] = 8,
                        ["maLop"] = 9,
                        ["namNhapHoc"] = 10,
                        ["doiTuongUuTien"] = 11
                    };
                }

                hasContractColumns = cols.ContainsKey("roomCode") || cols.ContainsKey("bedId");

                foreach (var row in usedRange.RowsUsed().Skip(1))
                {
                    int rowNumber = row.RowNumber();
                    string mssv = ExcelImportHelper.ReadCellText(row, cols, "mssv");
                    if (string.IsNullOrWhiteSpace(mssv))
                    {
                        continue;
                    }

                    string appStatus = ExcelImportHelper.ReadCellText(row, cols, "appStatus");
                    if (ExcelImportHelper.IsIgnoredApplicationStatus(appStatus))
                    {
                        skipped++;
                        continue;
                    }

                    if (!ExcelImportHelper.TryReadDate(row, cols, "ngaySinh", null, out var ngaySinh))
                    {
                        errors.Add(new ImportRowError(rowNumber, mssv, "Ngày sinh không hợp lệ."));
                        continue;
                    }

                    string namNhapHocText = ExcelImportHelper.ReadCellText(row, cols, "namNhapHoc");
                    int namNhapHoc;
                    if (string.IsNullOrWhiteSpace(namNhapHocText))
                    {
                        namNhapHoc = year.NgayBatDau.Year;
                    }
                    else if (!int.TryParse(namNhapHocText, out namNhapHoc))
                    {
                        errors.Add(new ImportRowError(rowNumber, mssv, "Năm nhập học không hợp lệ."));
                        continue;
                    }

                    var upsertResult = await StudentExcelHelper.UpsertStudentAsync(
                        _context,
                        _passwordHasher,
                        new StudentExcelRowInput
                        {
                            Mssv = mssv,
                            HoTen = ExcelImportHelper.ReadCellText(row, cols, "hoTen"),
                            NgaySinh = ngaySinh,
                            GioiTinh = ExcelImportHelper.ReadCellText(row, cols, "gioiTinh"),
                            Cccd = ExcelImportHelper.ReadCellText(row, cols, "cccd"),
                            DienThoai = ExcelImportHelper.ReadCellText(row, cols, "dienThoai"),
                            Email = ExcelImportHelper.ReadCellText(row, cols, "email"),
                            DiaChiThuongTru = ExcelImportHelper.ReadCellText(row, cols, "diaChi"),
                            MaLop = ExcelImportHelper.ReadCellText(row, cols, "maLop"),
                            NamNhapHoc = namNhapHoc,
                            DoiTuongUuTien = ExcelImportHelper.ReadCellText(row, cols, "doiTuongUuTien")
                        },
                        minAdmissionYear: 1990,
                        maxAdmissionYear: year.NgayKetThuc.Year + 1);

                    if (!upsertResult.Success)
                    {
                        errors.Add(new ImportRowError(rowNumber, mssv, upsertResult.ErrorMessage ?? "Dữ liệu sinh viên không hợp lệ."));
                        continue;
                    }

                    if (upsertResult.IsCreated)
                    {
                        imported++;
                        if (!string.IsNullOrEmpty(upsertResult.TemporaryPassword))
                        {
                            accounts.Add($"{mssv}: {upsertResult.TemporaryPassword}");
                        }
                    }
                    else
                    {
                        updated++;
                    }
                }
            }
            catch (Exception ex) when (ex is InvalidDataException or FormatException or ArgumentException)
            {
                return BadRequest(ApiResponse.Fail("Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng .xlsx."));
            }

            if (hasContractColumns)
            {
                stream.Position = 0;
                var contractService = _hopDongService ?? new HopDongService(_context, _passwordHasher);
                var contractResult = await contractService.ImportContractsFromExcelAsync(stream, _currentUser?.StaffId, resolvedYear);
                if (contractResult != null)
                {
                    contractsImported = contractResult.Imported;
                    contractsSkipped = contractResult.Skipped;
                    foreach (var ce in contractResult.Errors)
                    {
                        if (!errors.Any(e => e.Row == ce.Row && e.Mssv == ce.Mssv))
                        {
                            errors.Add(new ImportRowError(ce.Row, ce.Mssv, ce.Message));
                        }
                    }
                }
            }

            var msgParts = new List<string> { $"Đã nhập {imported} hồ sơ sinh viên mới" };
            if (updated > 0) msgParts.Add($"cập nhật {updated} hồ sơ");
            if (hasContractColumns) msgParts.Add($"tạo {contractsImported} hợp đồng mới");
            if (skipped > 0) msgParts.Add($"bỏ qua {skipped} đơn từ chối/hết hạn");
            if (errors.Count > 0) msgParts.Add($"{errors.Count} dòng lỗi");
            var message = string.Join(", ", msgParts) + ".";

            return Ok(new
            {
                success = true,
                message,
                imported,
                updated,
                skipped,
                contractsImported,
                contractsSkipped,
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
