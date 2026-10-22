using Microsoft.AspNetCore.Mvc;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Controllers.Api
{
    [ApiController]
    [Route("api/sinhvien")]
    public class SinhVienApiController : ControllerBase
    {
        private readonly ISinhVienService _sinhVienService;

        public SinhVienApiController(ISinhVienService sinhVienService)
        {
            _sinhVienService = sinhVienService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? cohort,
            [FromQuery] string? major,
            [FromQuery] string? status,
            [FromQuery] string? search)
        {
            var students = await _sinhVienService.GetAllStudentsAsync(cohort, major, status, search);
            return Ok(ApiResponse<List<SinhVienListItemDto>>.Ok(students));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var student = await _sinhVienService.GetStudentByIdAsync(id);
            if (student == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy hồ sơ sinh viên."));
            }

            return Ok(ApiResponse<SinhVienListItemDto>.Ok(student));
        }

        public class TransferRoomRequest
        {
            public string StudentId { get; set; } = string.Empty;
            public string RoomNumber { get; set; } = string.Empty;
            public string BedNumber { get; set; } = string.Empty;
        }

        [HttpPost("transfer")]
        public async Task<IActionResult> TransferRoom([FromBody] TransferRoomRequest req)
        {
            bool result = await _sinhVienService.TransferRoomAsync(req.StudentId, req.RoomNumber, req.BedNumber);
            if (result)
            {
                return Ok(ApiResponse.Ok($"Đã điều chuyển sinh viên sang phòng {req.RoomNumber} - giường {req.BedNumber} thành công!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể điều chuyển phòng. Vui lòng kiểm tra lại giường đích."));
        }
    }
}
