using Microsoft.AspNetCore.Mvc;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Controllers.Api
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
            if (string.IsNullOrWhiteSpace(req.StudentId) || string.IsNullOrWhiteSpace(req.StudentName) || string.IsNullOrWhiteSpace(req.Room))
            {
                return BadRequest(ApiResponse.Fail("Vui lòng điền đầy đủ MSSV, tên sinh viên và số phòng!"));
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

