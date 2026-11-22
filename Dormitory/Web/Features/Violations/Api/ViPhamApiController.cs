using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Violations.DTOs;
using Dormitory.Web.Features.Violations.Services;
using Dormitory.Web.Features.Violations.Validators;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Helpers;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.Violations.Api
{
    [Authorize(Policy = RoleNames.ManagerOnlyPolicy)]
    [ApiController]
    [Route("api/vipham")]
    public class ViPhamApiController : ControllerBase
    {
        private readonly IViPhamService _viPhamService;
        private readonly ICurrentUser? _currentUser;

        public ViPhamApiController(IViPhamService viPhamService, ICurrentUser? currentUser = null)
        {
            _viPhamService = viPhamService;
            _currentUser = currentUser;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? building,
            [FromQuery] string? penalty,
            [FromQuery] string? violationType,
            [FromQuery] string? search,
            [FromQuery] string? academicYear)
        {
            var violations = await _viPhamService.GetAllViolationsAsync(building, penalty, violationType, search, academicYear);
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

            var record = await _viPhamService.CreateViolationAsync(req, Request.Query["academicYear"].FirstOrDefault(), _currentUser?.StaffId);
            if (record == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy sinh viên hoặc loại vi phạm trong dữ liệu."));
            }

            return Ok(ApiResponse<ViolationRecordDto>.Ok(record, $"Đã lập thành công biên bản {record.Code}!"));
        }

        [HttpGet("types")]
        public async Task<IActionResult> GetTypes([FromQuery] string? academicYear)
        {
            var types = await _viPhamService.GetViolationTypesAsync(academicYear);
            return Ok(ApiResponse<List<ViolationTypeOptionDto>>.Ok(types));
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export(
            [FromQuery] string? building,
            [FromQuery] string? penalty,
            [FromQuery] string? violationType,
            [FromQuery] string? search,
            [FromQuery] string? academicYear)
        {
            var violations = await _viPhamService.GetAllViolationsAsync(building, penalty, violationType, search, academicYear);
            var yearLabel = string.IsNullOrWhiteSpace(academicYear) ? "Tất cả năm học" : academicYear.Trim();
            var safeYear = string.IsNullOrWhiteSpace(academicYear) ? "KTX" : academicYear.Trim();

            string[] headers =
            [
                "STT",
                "Mã biên bản",
                "MSSV",
                "Họ và tên",
                "Phòng",
                "Tòa nhà",
                "Nội dung vi phạm",
                "Hình thức xử lý",
                "Ngày lập",
                "Trạng thái",
                "Ghi chú"
            ];

            XLAlignmentHorizontalValues[] alignments =
            [
                XLAlignmentHorizontalValues.Center,
                XLAlignmentHorizontalValues.Center,
                XLAlignmentHorizontalValues.Center,
                XLAlignmentHorizontalValues.Left,
                XLAlignmentHorizontalValues.Center,
                XLAlignmentHorizontalValues.Center,
                XLAlignmentHorizontalValues.Left,
                XLAlignmentHorizontalValues.Center,
                XLAlignmentHorizontalValues.Center,
                XLAlignmentHorizontalValues.Center,
                XLAlignmentHorizontalValues.Left
            ];

            var rows = violations.Select((v, idx) => new object?[]
            {
                idx + 1,
                v.Code,
                v.StudentId,
                v.StudentName,
                v.Room,
                v.Building,
                v.Violation,
                v.Penalty,
                v.Date,
                v.Status,
                v.Notes
            });

            var bytes = ExcelExportHelper.BuildStyledTableWorkbook(
                "ViPhamKyLuat",
                "DANH SÁCH VI PHẠM & KỶ LUẬT KÝ TÚC XÁ UTC2",
                $"Năm học: {yearLabel}   |   Ngày xuất: {DateTime.Now:dd/MM/yyyy HH:mm}   |   Tổng số biên bản: {violations.Count}",
                headers,
                rows,
                alignments);

            return File(bytes, ExcelExportHelper.ContentType, $"ViPhamKyLuat_{safeYear}.xlsx");
        }
    }
}
