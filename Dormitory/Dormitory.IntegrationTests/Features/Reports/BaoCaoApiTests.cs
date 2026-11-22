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

        [Fact]
        public void ExportTable_ReturnsSymmetricalStyledXlsxWorkbook()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new BaoCaoApiController(new BaoCaoService(context));

            var result = controller.ExportTable(new ExportTableRequestDto
            {
                Title = "DANH SÁCH LỚP CHUYÊN NGÀNH & KHOA VIỆN KÝ TÚC XÁ UTC2",
                SheetName = "LopHoc",
                FileName = "DanhSachLop.xlsx",
                AcademicYear = SqlServerFixture.AcademicYear,
                Headers = ["Mã Lớp", "Tên Lớp", "Khoa Viện", "Sĩ Số"],
                Rows = [["CNTT01_K65", "Công nghệ thông tin 01", "CNTT", "45"]]
            });

            var fileResult = Assert.IsType<FileContentResult>(result);
            using var stream = new MemoryStream(fileResult.FileContents);
            using var wb = new XLWorkbook(stream);
            var ws = wb.Worksheet("LopHoc");
            Assert.Equal("Times New Roman", ws.Cell(4, 1).Style.Font.FontName);
            Assert.Equal(16, ws.Cell(4, 1).Style.Font.FontSize);
            Assert.Equal("Mã Lớp", ws.Cell(7, 1).GetString());
            Assert.Equal(13, ws.Cell(8, 1).Style.Font.FontSize);

            var badResult = controller.ExportTable(new ExportTableRequestDto());
            Assert.IsType<BadRequestObjectResult>(badResult);
        }
    }
}

