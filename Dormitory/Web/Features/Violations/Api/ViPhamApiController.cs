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
            [FromQuery] string? search)
        {
            var violations = await _viPhamService.GetAllViolationsAsync(building, penalty, violationType, search);
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

            var record = await _viPhamService.CreateViolationAsync(req);
            return Ok(ApiResponse<ViolationRecordDto>.Ok(record, $"Đã lập thành công biên bản {record.Code}!"));
        }

        [HttpPost("{id}/close")]
        public async Task<IActionResult> Close(string id)
        {
            bool success = await _viPhamService.CloseViolationAsync(id);
            if (success)
            {
                return Ok(ApiResponse.Ok("Đã hoàn tất thi hành và đóng hồ sơ kỷ luật!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể cập nhật hồ sơ biên bản."));
        }
    }
}

