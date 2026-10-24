using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Registrations.Entities;

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

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var rounds = await _context.DotDangKys
                .Include(d => d.KyHoc)
                .OrderByDescending(d => d.NgayMo)
                .Select(d => new
                {
                    d.MaDotDangKy,
                    d.TenDot,
                    d.MaKyHoc,
                    KyHoc = d.KyHoc != null ? d.KyHoc.TenKyHoc : null,
                    d.NgayMo,
                    d.NgayDong
                })
                .ToListAsync();
            return Ok(rounds);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDotDangKyRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.MaDotDangKy))
                return BadRequest("Mã đợt không được để trống.");
            if (string.IsNullOrWhiteSpace(req.TenDot))
                return BadRequest("Tên đợt không được để trống.");
            if (string.IsNullOrWhiteSpace(req.MaKyHoc))
                return BadRequest("Vui lòng chọn kỳ học.");
            if (!await _context.KyHocs.AnyAsync(k => k.MaKyHoc == req.MaKyHoc))
                return BadRequest("Kỳ học không tồn tại.");
            if (await _context.DotDangKys.AnyAsync(d => d.MaDotDangKy == req.MaDotDangKy))
                return BadRequest("Mã đợt đã tồn tại.");

            var round = new DotDangKy
            {
                MaDotDangKy = req.MaDotDangKy.Trim(),
                TenDot = req.TenDot.Trim(),
                MaKyHoc = req.MaKyHoc,
                NgayMo = req.NgayMo,
                NgayDong = req.NgayDong
            };
            _context.DotDangKys.Add(round);
            await _context.SaveChangesAsync();
            return Ok(round);
        }
    }

    public class CreateDotDangKyRequest
    {
        public string MaDotDangKy { get; set; } = string.Empty;
        public string TenDot { get; set; } = string.Empty;
        public string MaKyHoc { get; set; } = string.Empty;
        public DateTime NgayMo { get; set; }
        public DateTime NgayDong { get; set; }
    }
}
