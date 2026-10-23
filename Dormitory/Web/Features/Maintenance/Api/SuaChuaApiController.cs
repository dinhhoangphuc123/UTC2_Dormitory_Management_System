using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Maintenance.DTOs;
using Dormitory.Web.Features.Maintenance.Services;
using Dormitory.Web.Features.Maintenance.Validators;

namespace Dormitory.Web.Features.Maintenance.Api
{
    [ApiController]
    [Route("api/suachua")]
    public class SuaChuaApiController : ControllerBase
    {
        private readonly IYeuCauSuaChuaService _suaChuaService;

        public SuaChuaApiController(IYeuCauSuaChuaService suaChuaService)
        {
            _suaChuaService = suaChuaService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? building,
            [FromQuery] string? category,
            [FromQuery] string? priority,
            [FromQuery] string? status,
            [FromQuery] string? search)
        {
            var tickets = await _suaChuaService.GetAllTicketsAsync(building, category, priority, status, search);
            return Ok(ApiResponse<List<MaintenanceTicketDto>>.Ok(tickets));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTicketDto req)
        {
            var (isValid, errorMessage) = CreateTicketValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            var ticket = await _suaChuaService.CreateTicketAsync(req);
            if (ticket == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy hợp đồng nội trú đang hiệu lực cho sinh viên này."));
            }

            return Ok(ApiResponse<MaintenanceTicketDto>.Ok(ticket, $"Đã tạo phiếu báo hỏng {ticket.Code} thành công!"));
        }

        [HttpPost("assign")]
        public async Task<IActionResult> Assign([FromBody] AssignTicketDto req)
        {
            bool success = await _suaChuaService.AssignTicketAsync(req);
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã điều phối kỹ thuật viên {req.Technician} xử lý phiếu!"));
            }

            return NotFound(ApiResponse.Fail("Không tìm thấy phiếu hoặc nhân viên kỹ thuật đang làm việc."));
        }

        [HttpPost("{id}/complete")]
        public async Task<IActionResult> Complete(string id)
        {
            bool success = await _suaChuaService.CompleteTicketAsync(id);
            if (success)
            {
                return Ok(ApiResponse.Ok("Đã nghiệm thu và hoàn tất sửa chữa!"));
            }

            return NotFound(ApiResponse.Fail("Không tìm thấy phiếu sửa chữa."));
        }
    }
}
