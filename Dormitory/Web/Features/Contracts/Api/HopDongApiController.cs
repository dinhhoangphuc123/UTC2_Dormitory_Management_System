using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Contracts.DTOs;
using Dormitory.Web.Features.Contracts.Services;
using Dormitory.Web.Features.Contracts.Validators;

namespace Dormitory.Web.Features.Contracts.Api
{
    [ApiController]
    [Route("api/hopdong")]
    public class HopDongApiController : ControllerBase
    {
        private readonly IHopDongService _hopDongService;

        public HopDongApiController(IHopDongService hopDongService)
        {
            _hopDongService = hopDongService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? statusTab,
            [FromQuery] string? building,
            [FromQuery] string? search)
        {
            var contracts = await _hopDongService.GetAllContractsAsync(statusTab, building, search);
            return Ok(ApiResponse<List<ContractListItemDto>>.Ok(contracts));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var contract = await _hopDongService.GetContractByIdAsync(id);
            if (contract == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy hợp đồng."));
            }

            return Ok(ApiResponse<ContractListItemDto>.Ok(contract));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateContractRequestDto req)
        {
            var (isValid, errorMessage) = CreateContractValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            var created = await _hopDongService.CreateContractAsync(req, "NV01");
            return Ok(ApiResponse<ContractListItemDto>.Ok(created, "Ban hành hợp đồng mới thành công!"));
        }

        [HttpPost("{id}/renew")]
        public async Task<IActionResult> Renew(string id, [FromQuery] int months = 5)
        {
            bool success = await _hopDongService.RenewContractAsync(id, months);
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

        [HttpPost("{id}/liquidate")]
        public async Task<IActionResult> Liquidate(string id, [FromBody] LiquidateRequest? req)
        {
            bool success = await _hopDongService.LiquidateContractAsync(id, req?.Reason);
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã thanh lý và tất toán tiền cọc hợp đồng {id}!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể thanh lý hợp đồng."));
        }
    }
}

