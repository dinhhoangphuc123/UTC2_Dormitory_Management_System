using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Students.DTOs;
using Dormitory.Web.Features.Students.Services;

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
            [FromQuery] string? search,
            [FromQuery] string? academicYear)
        {
            var students = await _sinhVienService.GetAllStudentsAsync(cohort, major, status, search, academicYear);
            return Ok(ApiResponse<List<SinhVienListItemDto>>.Ok(students));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id, [FromQuery] string? academicYear)
        {
            var student = await _sinhVienService.GetStudentByIdAsync(id, academicYear);
            if (student == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy hồ sơ sinh viên."));
            }

            return Ok(ApiResponse<SinhVienListItemDto>.Ok(student));
        }

    }
}

