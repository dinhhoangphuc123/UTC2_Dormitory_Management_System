using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Contracts.Services;
using Dormitory.Web.Features.Registrations.Api;
using Dormitory.Web.Features.Registrations.Services;
using Dormitory.Web.Features.Students.Api;
using Dormitory.Web.Features.Students.DTOs;
using Dormitory.Web.Features.Students.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Students
{
    public class SinhVienApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public SinhVienApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAll_ReturnsStudents()
        {
            using var context = _fixture.CreateDbContext();
            var service = new SinhVienService(context);
            var controller = new SinhVienApiController(service);

            var result = await controller.GetAll(null, null, null, null, SqlServerFixture.AcademicYear);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<SinhVienListItemDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotEmpty(res.Data!);
        }

        [Fact]
        public async Task Import_FromExportedRegistrationExcel_SavesStudentsAndCreatesContracts()
        {
            using var context = _fixture.CreateDbContext();
            var donService = new DonDangKyService(context);
            var donController = new DonDangKyApiController(donService);

            var exportResult = await donController.Export(null, null, null, null, SqlServerFixture.AcademicYear);
            var fileResult = Assert.IsType<FileContentResult>(exportResult);

            // Bổ sung 1 sinh viên hoàn toàn mới vào chính file vừa xuất để kiểm chứng tạo mới cả SV + Hợp đồng.
            using var editStream = new MemoryStream();
            editStream.Write(fileResult.FileContents, 0, fileResult.FileContents.Length);
            editStream.Position = 0;

            using var wb = new XLWorkbook(editStream);
            var ws = wb.Worksheet("DonDangKy");
            int newRow = ws.LastRowUsed()!.RowNumber() + 1;
            ws.Cell(newRow, 1).Value = "";
            ws.Cell(newRow, 2).Value = "6651079999";
            ws.Cell(newRow, 3).Value = "Trần Hoàng Minh Khang";
            ws.Cell(newRow, 4).Value = "2007-04-15";
            ws.Cell(newRow, 5).Value = "Nam";
            ws.Cell(newRow, 6).Value = "079207009999";
            ws.Cell(newRow, 7).Value = "0912345999";
            ws.Cell(newRow, 8).Value = "khang.6651079999@sinhvien.utc2.edu.vn";
            ws.Cell(newRow, 9).Value = "TP. Thủ Đức, TP.HCM";
            ws.Cell(newRow, 10).Value = "CNTT01_K66";
            ws.Cell(newRow, 11).Value = "Công nghệ thông tin";
            ws.Cell(newRow, 12).Value = 2025;
            ws.Cell(newRow, 13).Value = "Hộ cận nghèo";
            ws.Cell(newRow, 14).Value = "Đợt 1";
            ws.Cell(newRow, 15).Value = "A01";
            ws.Cell(newRow, 16).Value = "A01_A104";
            ws.Cell(newRow, 17).Value = "";
            ws.Cell(newRow, 18).Value = "Tiêu chuẩn Nam 8 chỗ";
            ws.Cell(newRow, 19).Value = 500000m;
            ws.Cell(newRow, 20).Value = 500000m;
            ws.Cell(newRow, 21).Value = "2026-09-01";
            ws.Cell(newRow, 22).Value = "2027-06-30";
            ws.Cell(newRow, 23).Value = "Chờ duyệt";

            using var uploadStream = new MemoryStream();
            wb.SaveAs(uploadStream);
            uploadStream.Position = 0;

            var createController = new SinhVienCreateApiController(
                context,
                hopDongService: new HopDongService(context));
            IFormFile formFile = new FormFile(uploadStream, 0, uploadStream.Length, "file", "DanhSachDonDangKy_NH2026-2027.xlsx");

            var action = await createController.Import(formFile, SqlServerFixture.AcademicYear);
            var ok = Assert.IsType<OkObjectResult>(action);
            var payload = JsonSerializer.SerializeToElement(ok.Value);

            Assert.True(payload.GetProperty("success").GetBoolean());
            Assert.Equal(1, payload.GetProperty("imported").GetInt32());
            Assert.Equal(25, payload.GetProperty("updated").GetInt32());
            Assert.Equal(9, payload.GetProperty("contractsImported").GetInt32());
            Assert.Equal(0, payload.GetProperty("failed").GetInt32());

            var newStudent = await context.SinhViens.AsNoTracking().FirstOrDefaultAsync(s => s.MaSinhVien == "6651079999");
            Assert.NotNull(newStudent);
            Assert.Equal("Trần Hoàng Minh Khang", newStudent!.HoTen);

            var newContract = await context.HopDongs.AsNoTracking().FirstOrDefaultAsync(h => h.MaSinhVien == "6651079999" && h.TrangThai == "hieuLuc");
            Assert.NotNull(newContract);
        }

        [Fact]
        public async Task Import_WithEmptyOrInvalidFile_ReturnsBadRequest()
        {
            using var context = _fixture.CreateDbContext();
            var createController = new SinhVienCreateApiController(context);

            var emptyStream = new MemoryStream();
            IFormFile emptyFile = new FormFile(emptyStream, 0, 0, "file", "empty.xlsx");
            var emptyResult = await createController.Import(emptyFile, SqlServerFixture.AcademicYear);
            Assert.IsType<BadRequestObjectResult>(emptyResult);

            var bytes = System.Text.Encoding.UTF8.GetBytes("invalid");
            using var txtStream = new MemoryStream(bytes);
            IFormFile txtFile = new FormFile(txtStream, 0, bytes.Length, "file", "students.txt");
            var txtResult = await createController.Import(txtFile, SqlServerFixture.AcademicYear);
            Assert.IsType<BadRequestObjectResult>(txtResult);
        }
    }
}

