using Microsoft.AspNetCore.Mvc;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Controllers.Api
{
    [ApiController]
    [Route("api/dondangky")]
    public class DonDangKyApiController : ControllerBase
    {
        private readonly IDonDangKyService _donDangKyService;

        public DonDangKyApiController(IDonDangKyService donDangKyService)
        {
            _donDangKyService = donDangKyService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? statusTab,
            [FromQuery] string? priority,
            [FromQuery] string? cohort,
            [FromQuery] string? gender)
        {
            var apps = await _donDangKyService.GetAllApplicationsAsync(statusTab, priority, cohort, gender);
            return Ok(ApiResponse<List<ApplicationListItemDto>>.Ok(apps));
        }

        [HttpPost("{id}/approve")]
        public async Task<IActionResult> Approve(string id)
        {
            bool success = await _donDangKyService.ApproveApplicationAsync(id, "NV01");
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã duyệt hồ sơ đăng ký {id} và tự động xếp phòng thành công!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể duyệt hồ sơ."));
        }

        public class RejectRequest
        {
            public string? Reason { get; set; }
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> Reject(string id, [FromBody] RejectRequest? req)
        {
            bool success = await _donDangKyService.RejectApplicationAsync(id, "NV01", req?.Reason);
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã từ chối đơn đăng ký {id}."));
            }

            return BadRequest(ApiResponse.Fail("Không thể từ chối đơn đăng ký."));
        }
    }
}
