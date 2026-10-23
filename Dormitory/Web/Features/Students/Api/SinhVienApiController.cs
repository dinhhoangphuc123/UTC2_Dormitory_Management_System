using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Students.DTOs;
using Dormitory.Web.Features.Students.Services;
using Dormitory.Web.Features.Students.Validators;

namespace Dormitory.Web.Features.Students.Api
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

        [HttpPost("transfer")]
        public async Task<IActionResult> TransferRoom([FromBody] TransferRoomDto req)
        {
            var (isValid, errorMessage) = TransferRoomValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            bool result = await _sinhVienService.TransferRoomAsync(req.StudentId, req.NewRoomNumber, req.NewBedNumber);
            if (result)
            {
                return Ok(ApiResponse.Ok($"Đã điều chuyển sinh viên sang phòng {req.NewRoomNumber} - giường {req.NewBedNumber} thành công!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể điều chuyển phòng. Vui lòng kiểm tra lại giường đích."));
        }
    }
}

