using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Contracts.DTOs;
using Dormitory.Web.Features.Contracts.Services;
using Dormitory.Web.Features.Contracts.Validators;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.Contracts.Api
{
    [ApiController]
    [Route("api/hopdong")]
    public class HopDongApiController : ControllerBase
    {
        private readonly IHopDongService _hopDongService;
        private readonly ICurrentUser? _currentUser;

        public HopDongApiController(IHopDongService hopDongService, ICurrentUser? currentUser = null)
        {
            _hopDongService = hopDongService;
            _currentUser = currentUser;
        }

        [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? statusTab,
            [FromQuery] string? building,
            [FromQuery] string? search,
            [FromQuery] string? academicYear)
        {
            var contracts = await _hopDongService.GetAllContractsAsync(statusTab, building, search, academicYear);
            return Ok(ApiResponse<List<ContractListItemDto>>.Ok(contracts));
        }

        [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id, [FromQuery] string? academicYear)
        {
            var contract = await _hopDongService.GetContractByIdAsync(id, academicYear);
            if (contract == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy hợp đồng."));
            }

            return Ok(ApiResponse<ContractListItemDto>.Ok(contract));
        }

        [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateContractRequestDto req)
        {
            var (isValid, errorMessage) = CreateContractValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            var created = await _hopDongService.CreateContractAsync(req, _currentUser?.StaffId, Request.Query["academicYear"].FirstOrDefault());
            if (created == null)
            {
                return BadRequest(ApiResponse.Fail("Không tìm thấy sinh viên, giường khả dụng hoặc kỳ học phù hợp với dữ liệu đã chọn."));
            }

            return Ok(ApiResponse<ContractListItemDto>.Ok(created, "Ban hành hợp đồng mới thành công!"));
        }

        [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
        [HttpPost("{id}/renew")]
        public async Task<IActionResult> Renew(string id, [FromQuery] int months = 5)
        {
            bool success = await _hopDongService.RenewContractAsync(id, months, Request.Query["academicYear"].FirstOrDefault());
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã gia hạn hợp đồng {id} thêm {months} tháng thành công!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể gia hạn hợp đồng."));
        }

        public class LiquidateRequest
        {
            public string? Reason { get; set; }
        }

        [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
        [HttpPost("{id}/liquidate")]
        public async Task<IActionResult> Liquidate(string id, [FromBody] LiquidateRequest? req)
        {
            bool success = await _hopDongService.LiquidateContractAsync(id, req?.Reason, Request.Query["academicYear"].FirstOrDefault());
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã thanh lý và tất toán tiền cọc hợp đồng {id}!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể thanh lý hợp đồng."));
        }

        public class CheckInRequestDto
        {
            public DateTime? CheckInDate { get; set; }
        }

        [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
        [HttpPost("{id}/check-in")]
        public async Task<IActionResult> CheckIn(string id, [FromBody] CheckInRequestDto? req)
        {
            bool success = await _hopDongService.CheckInAsync(id, req?.CheckInDate, Request.Query["academicYear"].FirstOrDefault());
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã ghi nhận sinh viên nhận phòng thực tế cho hợp đồng {id} thành công!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể ghi nhận nhận phòng. Hợp đồng không tồn tại hoặc chưa có hiệu lực."));
        }
    }
}
