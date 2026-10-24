using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Rooms.Entities;

namespace Dormitory.Web.Features.Rooms.Api
{
    [ApiController]
    [Route("api/phong")]
    public class PhongCreateApiController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PhongCreateApiController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateRoomRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.MaPhong))
                return BadRequest("Mã phòng không được để trống.");
            if (string.IsNullOrWhiteSpace(req.MaToaNha))
                return BadRequest("Vui lòng chọn tòa nhà.");
            if (string.IsNullOrWhiteSpace(req.MaLoaiPhong))
                return BadRequest("Vui lòng chọn loại phòng.");
            if (req.SoGiuong < 1)
                return BadRequest("Số giường phải lớn hơn 0.");
            if (await _context.Phongs.AnyAsync(p => p.MaPhong == req.MaPhong))
                return BadRequest("Mã phòng đã tồn tại.");
            if (!await _context.ToaNhas.AnyAsync(t => t.MaToaNha == req.MaToaNha))
                return BadRequest("Tòa nhà không tồn tại.");
            if (!await _context.LoaiPhongs.AnyAsync(l => l.MaLoaiPhong == req.MaLoaiPhong))
                return BadRequest("Loại phòng không tồn tại.");

            var room = new Phong
            {
                MaPhong = req.MaPhong.Trim(),
                MaToaNha = req.MaToaNha,
                MaLoaiPhong = req.MaLoaiPhong,
                SoTang = req.SoTang,
                TrangThai = string.IsNullOrWhiteSpace(req.TrangThai) ? "hoatDong" : req.TrangThai
            };
            _context.Phongs.Add(room);

            for (int i = 1; i <= req.SoGiuong; i++)
            {
                _context.Giuongs.Add(new Giuong
                {
                    MaGiuong = $"{room.MaPhong}_G{i}",
                    MaPhong = room.MaPhong,
                    SoThuTu = i,
                    LaDangHoat = true
                });
            }

            await _context.SaveChangesAsync();
            return Ok(room);
        }
    }

    public class CreateRoomRequest
    {
        public string MaPhong { get; set; } = string.Empty;
        public string MaToaNha { get; set; } = string.Empty;
        public string MaLoaiPhong { get; set; } = string.Empty;
        public int SoTang { get; set; }
        public int SoGiuong { get; set; } = 8;
        public string TrangThai { get; set; } = "hoatDong";
    }
}
