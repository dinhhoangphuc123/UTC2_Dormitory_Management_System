using ClosedXML.Excel;
using Microsoft.AspNetCore.Mvc;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Violations.Api;
using Dormitory.Web.Features.Violations.DTOs;
using Dormitory.Web.Features.Violations.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Violations
{
    public class ViPhamApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public ViPhamApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAll_ReturnsViolations()
        {
            using var context = _fixture.CreateDbContext();
            var service = new ViPhamService(context);
            var controller = new ViPhamApiController(service);

            var result = await controller.GetAll(null, null, null, null, null);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<ViolationRecordDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotNull(res.Data);
        }

        [Fact]
        public async Task Export_ReturnsStyledXlsxWorkbook()
        {
            using var context = _fixture.CreateDbContext();
            var controller = new ViPhamApiController(new ViPhamService(context));

            var result = await controller.Export(null, null, null, null, SqlServerFixture.AcademicYear);
            var fileResult = Assert.IsType<FileContentResult>(result);
            Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileResult.ContentType);
            Assert.EndsWith(".xlsx", fileResult.FileDownloadName, StringComparison.OrdinalIgnoreCase);

            using var stream = new MemoryStream(fileResult.FileContents);
            using var wb = new XLWorkbook(stream);
            var ws = wb.Worksheet("ViPhamKyLuat");
            Assert.Equal("Times New Roman", ws.Cell(4, 1).Style.Font.FontName);
            Assert.Equal(16, ws.Cell(4, 1).Style.Font.FontSize);
            Assert.Equal("Mã biên bản", ws.Cell(7, 2).GetString());
        }
    }
}

