using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Shared.Constants;

namespace Dormitory.Web.Features.Registrations.Api
{
    [ApiController]
    [Route("api/dotdangky-rounds")]
    public class DotDangKyRoundApiController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DotDangKyRoundApiController(ApplicationDbContext context)
        {
            _context = context;
        }

        [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? academicYear)
        {
            var query = _context.DotDangKys
                .AsNoTracking()
                .Include(d => d.KyHoc)
                .Include(d => d.DanhSachDonDangKy)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(academicYear))
            {
                query = query.Where(d => d.KyHoc != null && d.KyHoc.MaNamHoc == academicYear);
            }

            var entities = await query
                .OrderByDescending(d => d.NgayMo)
                .ToListAsync();

            var rounds = entities.Select(d => new
            {
                d.MaDotDangKy,
                TenDot = d.TenDotHienThi,
                d.MaKyHoc,
                MaNamHoc = d.KyHoc != null ? d.KyHoc.MaNamHoc : academicYear,
                KyHoc = d.KyHoc != null ? d.KyHoc.TenKyHoc : null,
                d.NgayMo,
                d.NgayDong,
                DaPhatHanh = d.DaPhatHanh,
                SoDonDangKy = d.DanhSachDonDangKy.Count
            }).ToList();

            return Ok(rounds);
        }

        [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDotDangKyRequest req, [FromQuery] string? academicYear)
        {
            var cleanCode = req.MaDotDangKy?.Trim() ?? string.Empty;
            var cleanName = req.TenDot?.Trim() ?? string.Empty;
            if (cleanName.StartsWith(DotDangKy.DraftPrefix, StringComparison.Ordinal))
            {
                cleanName = cleanName[DotDangKy.DraftPrefix.Length..].Trim();
            }

            if (string.IsNullOrWhiteSpace(cleanCode))
                return BadRequest(new { message = "Mã đợt không được để trống." });
            if (cleanCode.Length > 20)
                return BadRequest(new { message = "Mã đợt không được vượt quá 20 ký tự." });
            if (string.IsNullOrWhiteSpace(cleanName))
                return BadRequest(new { message = "Tên đợt không được để trống." });
            if (cleanName.Length > 93)
                return BadRequest(new { message = "Tên đợt không được vượt quá 93 ký tự." });
            if (req.NgayDong.Date < req.NgayMo.Date)
                return BadRequest(new { message = "Ngày đóng phải sau hoặc bằng ngày mở." });

            if (await _context.DotDangKys.AnyAsync(d => d.MaDotDangKy == cleanCode))
                return BadRequest(new { message = "Mã đợt đã tồn tại." });

            var targetYear = !string.IsNullOrWhiteSpace(req.MaNamHoc)
                ? req.MaNamHoc.Trim()
                : academicYear?.Trim();

            string resolvedKyHoc;
            string? resolvedNamHoc = targetYear;

            if (!string.IsNullOrWhiteSpace(req.MaKyHoc))
            {
                var kyHoc = await _context.KyHocs.FirstOrDefaultAsync(k =>
                    k.MaKyHoc == req.MaKyHoc &&
                    (string.IsNullOrWhiteSpace(targetYear) || k.MaNamHoc == targetYear));
                if (kyHoc == null)
                    return BadRequest(new { message = "Kỳ học không tồn tại." });
                resolvedKyHoc = kyHoc.MaKyHoc;
                resolvedNamHoc = kyHoc.MaNamHoc;
            }
            else if (!string.IsNullOrWhiteSpace(targetYear))
            {
                var namHoc = await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == targetYear);
                if (namHoc == null)
                    return BadRequest(new { message = "Năm học không tồn tại." });

                var kyHoc = await _context.KyHocs
                    .Where(k => k.MaNamHoc == targetYear)
                    .OrderBy(k => k.NgayBatDau)
                    .FirstOrDefaultAsync();

                if (kyHoc == null)
                {
                    kyHoc = new KyHoc
                    {
                        MaKyHoc = $"AY{Guid.NewGuid():N}"[..14],
                        MaNamHoc = namHoc.MaNamHoc,
                        TenKyHoc = $"Cả năm {namHoc.NgayBatDau:yyyy}-{namHoc.NgayKetThuc:yyyy}",
                        NgayBatDau = namHoc.NgayBatDau,
                        NgayKetThuc = namHoc.NgayKetThuc
                    };
                    _context.KyHocs.Add(kyHoc);
                }

                resolvedKyHoc = kyHoc.MaKyHoc;
                resolvedNamHoc = namHoc.MaNamHoc;
            }
            else
            {
                return BadRequest(new { message = "Vui lòng chọn năm học." });
            }

            var round = new DotDangKy
            {
                MaDotDangKy = cleanCode,
                TenDot = req.DaPhatHanh ? cleanName : DotDangKy.DraftPrefix + cleanName,
                MaKyHoc = resolvedKyHoc,
                NgayMo = req.NgayMo,
                NgayDong = req.NgayDong
            };

            _context.DotDangKys.Add(round);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                round.MaDotDangKy,
                TenDot = round.TenDotHienThi,
                round.MaKyHoc,
                MaNamHoc = resolvedNamHoc,
                round.NgayMo,
                round.NgayDong,
                DaPhatHanh = round.DaPhatHanh
            });
        }

        [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
        [HttpPost("{id}/publish")]
        public async Task<IActionResult> Publish(string id)
        {
            var cleanId = id?.Trim() ?? string.Empty;
            var round = await _context.DotDangKys
                .Include(d => d.KyHoc)
                .FirstOrDefaultAsync(d => d.MaDotDangKy == cleanId);

            if (round == null)
                return NotFound(new { success = false, message = "Không tìm thấy đợt đăng ký." });

            var displayName = round.TenDotHienThi;
            if (!round.DaPhatHanh)
            {
                round.TenDot = displayName;
            }

            var notifTitle = $"Thông báo mở đợt đăng ký KTX: {displayName}";
            var alreadyNotifiedIds = await _context.ThongBaos
                .Where(t => t.Loai == "dotDangKy" && t.TieuDe == notifTitle)
                .Select(t => t.MaSinhVien)
                .ToHashSetAsync();

            var activeStudentIds = await _context.SinhViens
                .Where(s => s.TrangThai == "dangHoc")
                .Select(s => s.MaSinhVien)
                .ToListAsync();

            var now = DateTime.Now;
            var notifications = new List<ThongBao>();
            foreach (var mssv in activeStudentIds)
            {
                if (alreadyNotifiedIds.Contains(mssv)) continue;
                notifications.Add(new ThongBao
                {
                    MaSinhVien = mssv,
                    TieuDe = notifTitle,
                    NoiDung = $"Ban quản lý KTX đã chính thức mở đợt đăng ký \"{displayName}\" (từ {round.NgayMo:dd/MM/yyyy} đến {round.NgayDong:dd/MM/yyyy}). Sinh viên có nhu cầu lưu trú vui lòng truy cập mục Đăng ký nội trú để nộp hồ sơ.",
                    Loai = "dotDangKy",
                    LienKet = "sv-dot-dang-ky",
                    DaDoc = false,
                    NgayTao = now
                });
            }

            if (notifications.Count > 0)
            {
                await _context.ThongBaos.AddRangeAsync(notifications);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = $"Đã áp dụng và gửi đợt đăng ký \"{displayName}\" đến toàn hệ thống.",
                daPhatHanh = true
            });
        }
    }

    public class CreateDotDangKyRequest
    {
        public string MaDotDangKy { get; set; } = string.Empty;
        public string TenDot { get; set; } = string.Empty;
        public string? MaNamHoc { get; set; }
        public string? MaKyHoc { get; set; }
        public DateTime NgayMo { get; set; }
        public DateTime NgayDong { get; set; }
        public bool DaPhatHanh { get; set; } = false;
    }
}
