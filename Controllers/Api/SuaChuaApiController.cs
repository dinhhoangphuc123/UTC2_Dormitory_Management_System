using Microsoft.AspNetCore.Mvc;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Controllers.Api
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
            if (string.IsNullOrWhiteSpace(req.Room) || string.IsNullOrWhiteSpace(req.Reporter) || string.IsNullOrWhiteSpace(req.Description))
            {
                return BadRequest(ApiResponse.Fail("Vui lòng điền đầy đủ số phòng, người báo và mô tả sự cố!"));
            }

            var ticket = await _suaChuaService.CreateTicketAsync(req);
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

            return BadRequest(ApiResponse.Fail("Không thể điều phối phiếu sửa chữa."));
        }

        [HttpPost("{id}/complete")]
        public async Task<IActionResult> Complete(string id)
        {
            bool success = await _suaChuaService.CompleteTicketAsync(id);
            if (success)
            {
                return Ok(ApiResponse.Ok("Đã nghiệm thu và hoàn tất sửa chữa!"));
            }

            return BadRequest(ApiResponse.Fail("Không thể cập nhật trạng thái phiếu."));
        }
    }
}

