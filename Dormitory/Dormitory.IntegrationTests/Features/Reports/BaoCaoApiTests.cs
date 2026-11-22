using ClosedXML.Excel;
using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Reports.Api;
using Dormitory.Web.Features.Reports.DTOs;
using Dormitory.Web.Features.Reports.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Reports
{
    public class BaoCaoApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public BaoCaoApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetSummary_ReturnsReportSummary()
        {
            using var context = _fixture.CreateDbContext();
            var service = new BaoCaoService(context);
            var controller = new BaoCaoApiController(service);

            var result = await controller.GetSummary(null, null);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ReportSummaryDto>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotNull(res.Data);
        }

        [Fact]
        public async Task Export_ReturnsFormattedWorkbookWithAllDashboardSections()
        {
            using var context = _fixture.CreateDbContext();
            var service = new BaoCaoService(context);
            var controller = new BaoCaoApiController(service);

            var result = await controller.Export(SqlServerFixture.AcademicYear, null);
            var fileResult = Assert.IsType<FileContentResult>(result);
            Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileResult.ContentType);
            Assert.Equal($"BaoCaoTongQuanKTX_{SqlServerFixture.AcademicYear}.xlsx", fileResult.FileDownloadName);
            Assert.NotEmpty(fileResult.FileContents);

            using var stream = new MemoryStream(fileResult.FileContents);
            using var workbook = new XLWorkbook(stream);

            Assert.True(workbook.Worksheets.Contains("Tổng quan Dashboard"));
            Assert.True(workbook.Worksheets.Contains("Vận hành Tòa nhà & Phòng"));
            Assert.True(workbook.Worksheets.Contains("Sinh viên theo Khóa"));
            Assert.True(workbook.Worksheets.Contains("Doanh thu & Dòng tiền"));

            var overview = workbook.Worksheet("Tổng quan Dashboard");
            var overviewTexts = overview.CellsUsed().Select(c => c.GetString()).ToList();

            Assert.Contains(overviewTexts, t => t.Contains("PHẦN I.", StringComparison.Ordinal));
            Assert.Contains(overviewTexts, t => t.Contains("PHẦN II.", StringComparison.Ordinal));
            Assert.Contains(overviewTexts, t => t.Contains("PHẦN III.", StringComparison.Ordinal));
            Assert.Contains(overviewTexts, t => t.Contains("PHẦN IV.", StringComparison.Ordinal));
            Assert.Contains(overviewTexts, t => t.Contains("PHẦN V.", StringComparison.Ordinal));
            Assert.Contains(overviewTexts, t => t.Contains("PHẦN VI.", StringComparison.Ordinal));
            Assert.Contains(overviewTexts, t => t.Contains("Sinh viên đang nội trú", StringComparison.Ordinal));
            Assert.Contains(overviewTexts, t => t.Contains("Tiêu chuẩn Nam", StringComparison.Ordinal));

            var cohortSheet = workbook.Worksheet("Sinh viên theo Khóa");
            Assert.Contains(cohortSheet.CellsUsed().Select(c => c.GetString()), t => t.Contains("TỔNG CỘNG", StringComparison.Ordinal));

            // Trường hợp không có dữ liệu (năm học không tồn tại) vẫn xuất workbook hợp lệ không lỗi.
            var emptyYearResult = await controller.Export("NH9999-0000", null);
            var emptyFile = Assert.IsType<FileContentResult>(emptyYearResult);
            using var emptyStream = new MemoryStream(emptyFile.FileContents);
            using var emptyWb = new XLWorkbook(emptyStream);
            Assert.Equal(4, emptyWb.Worksheets.Count);
        }
    }
}

