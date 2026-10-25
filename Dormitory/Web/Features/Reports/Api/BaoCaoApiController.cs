using Microsoft.AspNetCore.Mvc;
using ClosedXML.Excel;
using Dormitory.Web.Features.Reports.DTOs;
using Dormitory.Web.Features.Reports.Services;

namespace Dormitory.Web.Features.Reports.Api
{
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
            var summary = await _baoCaoService.GetReportSummaryAsync(academicYear, scope);

            using (var workbook = new XLWorkbook())
            {
                var ws = workbook.Worksheets.Add("BaoCao");
                ws.Cell(1, 1).Value = "Báo cáo tổng hợp KTX";
                ws.Cell(2, 1).Value = $"Năm học: {summary.AcademicYear}";
                ws.Cell(3, 1).Value = $"Tổng phòng: {summary.TotalRooms}";
                ws.Cell(4, 1).Value = $"Tổng giường: {summary.TotalBeds}";
                ws.Cell(5, 1).Value = $"Đang ở: {summary.OccupiedBeds}";
                ws.Cell(6, 1).Value = $"Trống: {summary.VacantBeds}";
                ws.Cell(7, 1).Value = $"Tỷ lệ lấp đầy: {summary.OccupancyRate}%";
                ws.Cell(8, 1).Value = $"Tổng doanh thu: {summary.TotalRevenue}";

                int row = 10;
                ws.Cell(row, 1).Value = "Tòa";
                ws.Cell(row, 2).Value = "Phòng";
                ws.Cell(row, 3).Value = "Giường";
                ws.Cell(row, 4).Value = "Đang ở";
                ws.Cell(row, 5).Value = "Trống";
                ws.Cell(row, 6).Value = "Tỷ lệ %";
                ws.Cell(row, 7).Value = "Doanh thu";
                row++;

                foreach (var b in summary.BuildingOperations)
                {
                    ws.Cell(row, 1).Value = b.Name;
                    ws.Cell(row, 2).Value = b.Rooms;
                    ws.Cell(row, 3).Value = b.Beds;
                    ws.Cell(row, 4).Value = b.Occupied;
                    ws.Cell(row, 5).Value = b.Vacant;
                    ws.Cell(row, 6).Value = b.Rate;
                    ws.Cell(row, 7).Value = b.Revenue;
                    row++;
                }

                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    stream.Position = 0;
                    return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "BaoCaoKTX.xlsx");
                }
            }
        }
    }
}

