using Microsoft.AspNetCore.Mvc;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Controllers.Api
{
    [ApiController]
    [Route("api/lophoc")]
    public class LopHocApiController : ControllerBase
    {
        private readonly ILopHocService _lopHocService;

        public LopHocApiController(ILopHocService lopHocService)
        {
            _lopHocService = lopHocService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? faculty,
            [FromQuery] string? cohort,
            [FromQuery] string? search)
        {
            var classes = await _lopHocService.GetAllClassesAsync(faculty, cohort, search);
            return Ok(ApiResponse<List<ClassItemDto>>.Ok(classes));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateClassDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Code) || string.IsNullOrWhiteSpace(req.Name))
            {
                return BadRequest(ApiResponse.Fail("Vui lòng điền đầy đủ mã và tên lớp!"));
            }

            var created = await _lopHocService.CreateClassAsync(req);
            return Ok(ApiResponse<ClassItemDto>.Ok(created, $"Đã thêm thành công lớp {created.Code}!"));
        }
    }
}

