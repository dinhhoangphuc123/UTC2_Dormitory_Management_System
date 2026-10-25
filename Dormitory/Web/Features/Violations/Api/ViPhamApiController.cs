using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Violations.DTOs;
using Dormitory.Web.Features.Violations.Services;
using Dormitory.Web.Features.Violations.Validators;

namespace Dormitory.Web.Features.Violations.Api
{
    [ApiController]
    [Route("api/vipham")]
    public class ViPhamApiController : ControllerBase
    {
        private readonly IViPhamService _viPhamService;

        public ViPhamApiController(IViPhamService viPhamService)
        {
            _viPhamService = viPhamService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? building,
            [FromQuery] string? penalty,
            [FromQuery] string? violationType,
            [FromQuery] string? search,
            [FromQuery] string? academicYear)
        {
            var violations = await _viPhamService.GetAllViolationsAsync(building, penalty, violationType, search, academicYear);
            return Ok(ApiResponse<List<ViolationRecordDto>>.Ok(violations));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateViolationDto req)
        {
            var (isValid, errorMessage) = CreateViolationValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            var record = await _viPhamService.CreateViolationAsync(req, Request.Query["academicYear"].FirstOrDefault());
            if (record == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy sinh viên hoặc loại vi phạm trong dữ liệu."));
            }

            return Ok(ApiResponse<ViolationRecordDto>.Ok(record, $"Đã lập thành công biên bản {record.Code}!"));
        }

        [HttpGet("types")]
        public async Task<IActionResult> GetTypes([FromQuery] string? academicYear)
        {
            var types = await _viPhamService.GetViolationTypesAsync(academicYear);
            return Ok(ApiResponse<List<ViolationTypeOptionDto>>.Ok(types));
        }
    }
}
