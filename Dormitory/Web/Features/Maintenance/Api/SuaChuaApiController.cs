using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Maintenance.DTOs;
using Dormitory.Web.Features.Maintenance.Services;
using Dormitory.Web.Features.Maintenance.Validators;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Helpers;

namespace Dormitory.Web.Features.Maintenance.Api
{
    [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
    [ApiController]
    [Route("api/suachua")]
    public class SuaChuaApiController : ControllerBase
    {
        private readonly IYeuCauSuaChuaService _suaChuaService;
        private readonly IWebHostEnvironment _env;

        public SuaChuaApiController(IYeuCauSuaChuaService suaChuaService, IWebHostEnvironment env)
        {
            _suaChuaService = suaChuaService;
            _env = env;
        }

        private string AppDataPath => Path.Combine(_env.ContentRootPath, "App_Data");

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? building,
            [FromQuery] string? category,
            [FromQuery] string? priority,
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] string? academicYear)
        {
            var tickets = await _suaChuaService.GetAllTicketsAsync(building, category, priority, status, search, academicYear);
            return Ok(ApiResponse<List<MaintenanceTicketDto>>.Ok(tickets));
        }

        [HttpPost]
        [RequestSizeLimit(6 * 1024 * 1024)]
        public async Task<IActionResult> Create([FromForm] CreateTicketDto req, IFormFile? image)
        {
            var (isValid, errorMessage) = CreateTicketValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            string? savedImage = null;
            if (image != null && image.Length > 0)
            {
                var (fileName, imageError) = await MaintenanceImageStorage.SaveAsync(image, AppDataPath);
                if (imageError != null)
                {
                    return BadRequest(ApiResponse.Fail(imageError));
                }
                savedImage = fileName;
            }

            var ticket = await _suaChuaService.CreateTicketAsync(req, Request.Query["academicYear"].FirstOrDefault(), savedImage);
            if (ticket == null)
            {
                MaintenanceImageStorage.Delete(savedImage, AppDataPath);
                return NotFound(ApiResponse.Fail("Không tìm thấy hợp đồng nội trú đang hiệu lực cho sinh viên này."));
            }

            return Ok(ApiResponse<MaintenanceTicketDto>.Ok(ticket, $"Đã tạo phiếu báo hỏng {ticket.Code} thành công!"));
        }

        [HttpGet("{id}/image")]
        public async Task<IActionResult> GetImage(string id, [FromQuery] string? academicYear)
        {
            var fileName = await _suaChuaService.GetTicketImageFileNameAsync(id, academicYear);
            var (bytes, contentType) = await MaintenanceImageStorage.ReadAsync(fileName, AppDataPath);
            if (bytes == null || contentType == null)
            {
                return NotFound();
            }

            return File(bytes, contentType);
        }

        [HttpPost("assign")]
        public async Task<IActionResult> Assign([FromBody] AssignTicketDto req, [FromQuery] string? academicYear)
        {
            bool success = await _suaChuaService.AssignTicketAsync(req, academicYear);
            if (success)
            {
                return Ok(ApiResponse.Ok($"Đã điều phối kỹ thuật viên {req.Technician} xử lý phiếu!"));
            }

            return NotFound(ApiResponse.Fail("Không tìm thấy phiếu hoặc nhân viên kỹ thuật đang làm việc."));
        }

        [HttpPost("{id}/complete")]
        public async Task<IActionResult> Complete(string id, [FromBody] CompleteTicketDto? req, [FromQuery] string? academicYear)
        {
            bool success = await _suaChuaService.CompleteTicketAsync(id, academicYear, req?.PhanHoi);
            if (success)
            {
                return Ok(ApiResponse.Ok("Đã nghiệm thu và hoàn tất sửa chữa!"));
            }

            return NotFound(ApiResponse.Fail("Không tìm thấy phiếu sửa chữa."));
        }
    }
}
