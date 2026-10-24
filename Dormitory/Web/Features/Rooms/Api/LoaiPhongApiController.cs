using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;

namespace Dormitory.Web.Features.Rooms.Api
{
    [ApiController]
    [Route("api/loaiphong")]
    public class LoaiPhongApiController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public LoaiPhongApiController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var types = await _context.LoaiPhongs
                .OrderBy(l => l.TenLoaiPhong)
                .Select(l => new { l.MaLoaiPhong, l.TenLoaiPhong, l.SoNguoiToiDa })
                .ToListAsync();
            return Ok(types);
        }
    }
}
