using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Middleware;

namespace Dormitory.Web.Features.Academic.Api
{
    [SkipAcademicYearScope]
    [ApiController]
    [Route("api/namhoc")]
    public class NamHocApiController : ControllerBase
    {
        /// <summary>Mã năm học hợp lệ: NH&lt;năm bắt đầu 4 chữ số&gt;-&lt;năm kết thúc 4 chữ số&gt;, ví dụ NH2026-2027.</summary>
        private static readonly Regex AcademicYearCodePattern = new(@"^NH(\d{4})-(\d{4})$", RegexOptions.Compiled);

        private readonly ApplicationDbContext _context;

        public NamHocApiController(ApplicationDbContext context)
        {
            _context = context;
        }

        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var years = await _context.NamHocs
                .Include(n => n.DanhSachKyHoc)
                .OrderByDescending(n => n.NgayBatDau)
                .Select(n => new
                {
                    n.MaNamHoc,
                    n.NgayBatDau,
                    n.NgayKetThuc,
                    n.LaDangHoat,
                    KyHocs = n.DanhSachKyHoc.Select(k => new
                    {
                        k.MaKyHoc,
                        k.TenKyHoc,
                        k.NgayBatDau,
                        k.NgayKetThuc
                    }).ToList()
                })
                .ToListAsync();
            return Ok(years);
        }

        [Authorize(Roles = RoleNames.Admin)]
        [HttpPost]
        public async Task<IActionResult> CreateYear([FromBody] CreateNamHocRequest req)
        {
            if (req == null)
                return BadRequest(new { message = "Dữ liệu năm học không hợp lệ." });

            var error = await ValidateYearAsync(req, null);
            if (error != null)
                return BadRequest(new { message = error });

            var yearCode = NormalizeCode(req.MaNamHoc);
            var year = new NamHoc
            {
                MaNamHoc = yearCode,
                NgayBatDau = req.NgayBatDau.Date,
                NgayKetThuc = req.NgayKetThuc.Date,
                LaDangHoat = req.LaDangHoat
            };

            // Existing registration and contract records still reference KyHoc.
            // Create one hidden full-year period so new years remain usable without
            // asking the manager to create semesters in the UI.
            var annualPeriod = new KyHoc
            {
                MaKyHoc = $"AY{Guid.NewGuid():N}"[..14],
                MaNamHoc = yearCode,
                TenKyHoc = $"Cả năm {req.NgayBatDau:yyyy}-{req.NgayKetThuc:yyyy}",
                NgayBatDau = req.NgayBatDau.Date,
                NgayKetThuc = req.NgayKetThuc.Date
            };

            _context.NamHocs.Add(year);
            _context.KyHocs.Add(annualPeriod);
            if (req.LaDangHoat)
            {
                await DeactivateOtherYearsAsync(yearCode);
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Trường hợp hai người tạo cùng lúc hoặc DB đã có mã này.
                return BadRequest(new { message = $"Mã năm học {yearCode} đã tồn tại. Vui lòng nhập mã năm học khác." });
            }

            // Trả DTO phẳng: trả thẳng entity sẽ vướng vòng tham chiếu NamHoc <-> KyHoc
            // và làm response 500 dù dữ liệu đã ghi vào CSDL.
            return Ok(ToSummary(year));
        }

        [Authorize(Roles = RoleNames.Admin)]
        [HttpPut("{maNamHoc}")]
        public async Task<IActionResult> UpdateYear(string maNamHoc, [FromBody] CreateNamHocRequest req)
        {
            if (req == null)
                return BadRequest(new { message = "Dữ liệu năm học không hợp lệ." });

            var targetCode = NormalizeCode(maNamHoc);
            var year = await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == targetCode);
            if (year == null)
                return NotFound(new { message = $"Không tìm thấy năm học {targetCode} để chỉnh sửa." });

            var error = await ValidateYearAsync(req, year.MaNamHoc);
            if (error != null)
                return BadRequest(new { message = error });

            var newCode = NormalizeCode(req.MaNamHoc);
            var oldStart = year.NgayBatDau;
            var oldEnd = year.NgayKetThuc;
            var codeChanged = !string.Equals(year.MaNamHoc, newCode, StringComparison.OrdinalIgnoreCase);

            if (codeChanged)
            {
                // Mã năm học là khóa chính của kyHoc nên phải cập nhật theo.
                var periods = await _context.KyHocs.Where(k => k.MaNamHoc == year.MaNamHoc).ToListAsync();
                foreach (var period in periods)
                {
                    period.MaNamHoc = newCode;
                }
                year.MaNamHoc = newCode;
            }

            year.NgayBatDau = req.NgayBatDau.Date;
            year.NgayKetThuc = req.NgayKetThuc.Date;
            year.LaDangHoat = req.LaDangHoat;

            // Kỳ "Cả năm" do hệ thống tự sinh phải đi theo ngày của năm học.
            var annualPeriod = await _context.KyHocs
                .FirstOrDefaultAsync(k => k.MaNamHoc == newCode && k.TenKyHoc.StartsWith("Cả năm"));
            if (annualPeriod != null && annualPeriod.NgayBatDau.Date == oldStart.Date && annualPeriod.NgayKetThuc.Date == oldEnd.Date)
            {
                annualPeriod.NgayBatDau = req.NgayBatDau.Date;
                annualPeriod.NgayKetThuc = req.NgayKetThuc.Date;
                annualPeriod.TenKyHoc = $"Cả năm {req.NgayBatDau:yyyy}-{req.NgayKetThuc:yyyy}";
            }

            if (req.LaDangHoat)
            {
                await DeactivateOtherYearsAsync(newCode);
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest(new { message = $"Không lưu được năm học {newCode}. Mã năm học có thể đã tồn tại." });
            }

            return Ok(ToSummary(year));
        }

        private static string NormalizeCode(string? code) => (code ?? string.Empty).Trim().ToUpperInvariant();

        private static object ToSummary(NamHoc year) => new
        {
            year.MaNamHoc,
            year.NgayBatDau,
            year.NgayKetThuc,
            year.LaDangHoat
        };

        private async Task DeactivateOtherYearsAsync(string keepCode)
        {
            var others = await _context.NamHocs
                .Where(n => n.MaNamHoc != keepCode && n.LaDangHoat)
                .ToListAsync();
            foreach (var other in others)
            {
                other.LaDangHoat = false;
            }
        }

        /// <summary>
        /// Trả về thông báo lỗi nếu dữ liệu năm học không hợp lệ, null nếu hợp lệ.
        /// <paramref name="ignoreCode"/> dùng khi cập nhật để bỏ qua chính bản ghi đang sửa.
        /// </summary>
        private async Task<string?> ValidateYearAsync(CreateNamHocRequest req, string? ignoreCode)
        {
            var yearCode = NormalizeCode(req.MaNamHoc);
            if (string.IsNullOrWhiteSpace(yearCode))
                return "Mã năm học không được để trống.";

            var parsed = AcademicYearCodePattern.Match(yearCode);
            if (!parsed.Success)
            {
                return $"Mã năm học \"{yearCode}\" không đúng định dạng. Phải nhập theo mẫu NH<năm bắt đầu>-<năm kết thúc>, ví dụ NH2026-2027.";
            }

            var startYear = int.Parse(parsed.Groups[1].Value, CultureInfo.InvariantCulture);
            var endYear = int.Parse(parsed.Groups[2].Value, CultureInfo.InvariantCulture);
            if (endYear != startYear + 1)
            {
                return $"Năm kết thúc phải là {startYear + 1}. Mỗi năm học chỉ gồm 2 năm liền nhau, ví dụ NH{startYear}-{startYear + 1}.";
            }

            if (req.NgayBatDau == default || req.NgayKetThuc == default)
                return "Vui lòng chọn ngày bắt đầu và ngày kết thúc của năm học.";

            if (req.NgayKetThuc.Date <= req.NgayBatDau.Date)
                return "Ngày kết thúc phải sau ngày bắt đầu.";

            if (req.NgayBatDau.Year != startYear || req.NgayKetThuc.Year != endYear)
            {
                return $"Ngày bắt đầu phải thuộc năm {startYear} và ngày kết thúc phải thuộc năm {endYear} để khớp với mã {yearCode}.";
            }

            var others = await _context.NamHocs
                .Select(n => new { n.MaNamHoc, n.NgayBatDau, n.NgayKetThuc })
                .ToListAsync();

            var duplicate = others.FirstOrDefault(n =>
                !string.Equals(n.MaNamHoc, ignoreCode, StringComparison.OrdinalIgnoreCase)
                && string.Equals(n.MaNamHoc.ToUpper(), yearCode, StringComparison.Ordinal));
            if (duplicate != null)
            {
                return $"Mã năm học {yearCode} đã tồn tại. Mỗi năm học chỉ được tạo một lần, vui lòng nhập mã khác (ví dụ NH{startYear + 1}-{endYear + 1}).";
            }

            // Mỗi năm học là một khoảng thời gian riêng: không được chồng lấn năm học khác.
            var conflict = others.FirstOrDefault(n =>
                !string.Equals(n.MaNamHoc, ignoreCode, StringComparison.OrdinalIgnoreCase)
                && req.NgayBatDau.Date <= n.NgayKetThuc.Date
                && req.NgayKetThuc.Date >= n.NgayBatDau.Date);
            if (conflict != null)
            {
                return $"Khoảng thời gian bị trùng với năm học {conflict.MaNamHoc} ({conflict.NgayBatDau:dd/MM/yyyy} – {conflict.NgayKetThuc:dd/MM/yyyy}). "
                    + $"Ngày bắt đầu của năm học mới phải sau ngày kết thúc năm học cũ, tức sau {conflict.NgayKetThuc.AddDays(1):dd/MM/yyyy}.";
            }

            return null;
        }
    }

    public class CreateNamHocRequest
    {
        public string MaNamHoc { get; set; } = string.Empty;
        public DateTime NgayBatDau { get; set; }
        public DateTime NgayKetThuc { get; set; }
        public bool LaDangHoat { get; set; } = true;
    }
}
