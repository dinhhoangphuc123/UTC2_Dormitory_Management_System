using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Reports.DTOs;
using Dormitory.Web.Features.Reports.Services;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Helpers;

namespace Dormitory.Web.Features.Reports.Api
{
    [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
    [ApiController]
    [Route("api/baocao")]
    public class BaoCaoApiController : ControllerBase
    {
        private readonly IBaoCaoService _baoCaoService;

        public BaoCaoApiController(IBaoCaoService baoCaoService)
        {
            _baoCaoService = baoCaoService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary(
            [FromQuery] string? academicYear,
            [FromQuery] string? scope)
        {
            var summary = await _baoCaoService.GetReportSummaryAsync(academicYear, scope);
            return Ok(ApiResponse<ReportSummaryDto>.Ok(summary));
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export(
            [FromQuery] string? academicYear,
            [FromQuery] string? scope)
        {
            var fileBytes = await _baoCaoService.ExportDashboardAndReportExcelAsync(academicYear, scope);
            var safeYear = string.IsNullOrWhiteSpace(academicYear) ? "KTX" : academicYear.Trim();
            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"BaoCaoTongQuanKTX_{safeYear}.xlsx");
        }

        [HttpPost("export-table")]
        public IActionResult ExportTable([FromBody] ExportTableRequestDto req)
        {
            if (req == null || req.Headers == null || req.Headers.Count == 0)
            {
                return BadRequest(ApiResponse.Fail("Thiếu cấu trúc cột để xuất Excel."));
            }
            if (req.Rows != null && req.Rows.Count > 10000)
            {
                return BadRequest(ApiResponse.Fail("Số lượng dòng xuất Excel không được vượt quá 10.000 dòng."));
            }

            string title = string.IsNullOrWhiteSpace(req.Title)
                ? "BÁO CÁO DỮ LIỆU KÝ TÚC XÁ UTC2"
                : req.Title.Trim().ToUpperInvariant();
            string yearLabel = string.IsNullOrWhiteSpace(req.AcademicYear) ? "KTX UTC2" : req.AcademicYear.Trim();
            int rowCount = req.Rows?.Count ?? 0;
            string subtitle = $"Năm học: {yearLabel}   |   Ngày xuất: {DateTime.Now:dd/MM/yyyy HH:mm}   |   Tổng số dòng: {rowCount}";

            var rows = (req.Rows ?? []).Select(r => r.Cast<object?>().ToArray());
            var bytes = ExcelExportHelper.BuildStyledTableWorkbook(
                req.SheetName ?? "BaoCao",
                title,
                subtitle,
                req.Headers.ToArray(),
                rows);

            string safeFile = string.IsNullOrWhiteSpace(req.FileName) ? "BaoCao_KTX_UTC2.xlsx" : req.FileName.Trim();
            if (!safeFile.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            {
                safeFile += ".xlsx";
            }

            return File(bytes, ExcelExportHelper.ContentType, safeFile);
        }
    }

    public class ExportTableRequestDto
    {
        public string? Title { get; set; }
        public string? SheetName { get; set; }
        public string? FileName { get; set; }
        public string? AcademicYear { get; set; }
        public List<string> Headers { get; set; } = [];
        public List<List<string>> Rows { get; set; } = [];
    }
}
