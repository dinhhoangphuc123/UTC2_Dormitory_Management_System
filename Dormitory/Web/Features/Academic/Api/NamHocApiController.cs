using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Academic.Entities;

namespace Dormitory.Web.Features.Academic.Api
{
    [ApiController]
    [Route("api/namhoc")]
    public class NamHocApiController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public NamHocApiController(ApplicationDbContext context)
        {
            _context = context;
        }

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

        [HttpPost]
        public async Task<IActionResult> CreateYear([FromBody] CreateNamHocRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.MaNamHoc))
                return BadRequest("Mã năm học không được để trống.");
            if (await _context.NamHocs.AnyAsync(n => n.MaNamHoc == req.MaNamHoc))
                return BadRequest("Mã năm học đã tồn tại.");

            var year = new NamHoc
            {
                MaNamHoc = req.MaNamHoc.Trim(),
                NgayBatDau = req.NgayBatDau,
                NgayKetThuc = req.NgayKetThuc,
                LaDangHoat = req.LaDangHoat
            };
            _context.NamHocs.Add(year);
            await _context.SaveChangesAsync();
            return Ok(year);
        }

        [HttpPost("{maNamHoc}/kyhoc")]
        public async Task<IActionResult> CreateSemester(string maNamHoc, [FromBody] CreateKyHocRequest req)
        {
            if (!await _context.NamHocs.AnyAsync(n => n.MaNamHoc == maNamHoc))
                return NotFound("Không tìm thấy năm học.");
            if (string.IsNullOrWhiteSpace(req.MaKyHoc))
                return BadRequest("Mã kỳ học không được để trống.");
            if (await _context.KyHocs.AnyAsync(k => k.MaKyHoc == req.MaKyHoc))
                return BadRequest("Mã kỳ học đã tồn tại.");

            var semester = new KyHoc
            {
                MaKyHoc = req.MaKyHoc.Trim(),
                MaNamHoc = maNamHoc,
                TenKyHoc = req.TenKyHoc.Trim(),
                NgayBatDau = req.NgayBatDau,
                NgayKetThuc = req.NgayKetThuc
            };
            _context.KyHocs.Add(semester);
            await _context.SaveChangesAsync();
            return Ok(semester);
        }
    }

    public class CreateNamHocRequest
    {
        public string MaNamHoc { get; set; } = string.Empty;
        public DateTime NgayBatDau { get; set; }
        public DateTime NgayKetThuc { get; set; }
        public bool LaDangHoat { get; set; } = true;
    }

    public class CreateKyHocRequest
    {
        public string MaKyHoc { get; set; } = string.Empty;
        public string TenKyHoc { get; set; } = string.Empty;
        public DateTime NgayBatDau { get; set; }
        public DateTime NgayKetThuc { get; set; }
    }
}
