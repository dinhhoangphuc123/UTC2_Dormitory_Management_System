using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Academic.DTOs;
using Dormitory.Web.Features.Academic.Services;
using Dormitory.Web.Features.Academic.Validators;
using Dormitory.Web.Shared.Constants;

namespace Dormitory.Web.Features.Academic.Api
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

        [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? faculty,
            [FromQuery] string? cohort,
            [FromQuery] string? search,
            [FromQuery] string? academicYear)
        {
            var classes = await _lopHocService.GetAllClassesAsync(faculty, cohort, search, academicYear);
            return Ok(ApiResponse<List<ClassItemDto>>.Ok(classes));
        }

        [Authorize(Roles = RoleNames.Admin)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateClassDto req)
        {
            var (isValid, errorMessage) = CreateClassValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            var created = await _lopHocService.CreateClassAsync(req);
            return Ok(ApiResponse<ClassItemDto>.Ok(created, $"Đã thêm thành công lớp {created.Code}!"));
        }
    }
}
