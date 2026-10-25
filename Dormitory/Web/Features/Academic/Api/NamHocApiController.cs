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
            var yearCode = req.MaNamHoc?.Trim();
            if (string.IsNullOrWhiteSpace(yearCode))
                return BadRequest("Mã năm học không được để trống.");
            if (yearCode.Length > 20)
                return BadRequest("Mã năm học không được vượt quá 20 ký tự.");
            if (req.NgayKetThuc.Date <= req.NgayBatDau.Date)
                return BadRequest("Ngày kết thúc phải sau ngày bắt đầu.");
            if (await _context.NamHocs.AnyAsync(n => n.MaNamHoc == yearCode))
                return BadRequest("Mã năm học đã tồn tại.");

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
            await _context.SaveChangesAsync();
            return Ok(year);
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
