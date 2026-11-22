using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Shared.Constants;

namespace Dormitory.Web.Features.Rooms.Api
{
    [Authorize(Roles = RoleNames.Admin)]
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
                return BadRequest(ApiResponse.Fail("Mã phòng không được để trống."));
            if (req.MaPhong.Trim().Length > 20)
                return BadRequest(ApiResponse.Fail("Mã phòng không được vượt quá 20 ký tự."));
            if (string.IsNullOrWhiteSpace(req.MaToaNha))
                return BadRequest(ApiResponse.Fail("Vui lòng chọn tòa nhà."));
            if (string.IsNullOrWhiteSpace(req.MaLoaiPhong))
                return BadRequest(ApiResponse.Fail("Vui lòng chọn loại phòng."));
            if (req.SoTang < 1 || req.SoTang > 50)
                return BadRequest(ApiResponse.Fail("Số tầng phải nằm trong khoảng từ 1 đến 50."));
            if (req.SoGiuong < 1)
                return BadRequest(ApiResponse.Fail("Số giường phải lớn hơn 0."));
            if (await _context.Phongs.AnyAsync(p => p.MaPhong == req.MaPhong.Trim()))
                return BadRequest(ApiResponse.Fail("Mã phòng đã tồn tại."));
            if (!await _context.ToaNhas.AnyAsync(t => t.MaToaNha == req.MaToaNha))
                return BadRequest(ApiResponse.Fail("Tòa nhà không tồn tại."));
            var roomType = await _context.LoaiPhongs.FirstOrDefaultAsync(l => l.MaLoaiPhong == req.MaLoaiPhong);
            if (roomType == null)
                return BadRequest(ApiResponse.Fail("Loại phòng không tồn tại."));
            if (roomType.SoNguoiToiDa > 0 && req.SoGiuong > roomType.SoNguoiToiDa)
                return BadRequest(ApiResponse.Fail($"Số giường ({req.SoGiuong}) vượt quá sức chứa tối đa của loại phòng ({roomType.SoNguoiToiDa})."));

            var status = string.IsNullOrWhiteSpace(req.TrangThai) ? "hoatDong" : req.TrangThai.Trim();
            if (status is not ("hoatDong" or "baoTri" or "ngungHoatDong"))
                return BadRequest(ApiResponse.Fail("Trạng thái phòng không hợp lệ."));

            var room = new Phong
            {
                MaPhong = req.MaPhong.Trim(),
                MaToaNha = req.MaToaNha,
                MaLoaiPhong = req.MaLoaiPhong,
                SoTang = req.SoTang,
                TrangThai = status
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
            return Ok(new { maPhong = room.MaPhong, maToaNha = room.MaToaNha, maLoaiPhong = room.MaLoaiPhong, soTang = room.SoTang, soGiuong = req.SoGiuong, trangThai = room.TrangThai });
        }
    }

    public class CreateRoomRequest
    {
        public string MaPhong { get; set; } = string.Empty;
        public string MaToaNha { get; set; } = string.Empty;
        public string MaLoaiPhong { get; set; } = string.Empty;
        public int SoTang { get; set; } = 1;
        public int SoGiuong { get; set; } = 4;
        public string TrangThai { get; set; } = "hoatDong";
    }
}
