using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Contracts.Api;
using Dormitory.Web.Features.Contracts.DTOs;
using Dormitory.Web.Features.Contracts.Services;
using Dormitory.Web.Features.Registrations.Api;
using Dormitory.Web.Features.Registrations.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Contracts
{
    public class HopDongApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public HopDongApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAll_ReturnsContracts()
        {
            using var context = _fixture.CreateDbContext();
            var service = new HopDongService(context);
            var controller = new HopDongApiController(service);

            var result = await controller.GetAll(null, null, null, SqlServerFixture.AcademicYear);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<ContractListItemDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotEmpty(res.Data!);
        }

        [Fact]
        public async Task Import_FromExportedRegistrationExcel_CreatesContractsAndIsIdempotent()
        {
            using var context = _fixture.CreateDbContext();
            var donService = new DonDangKyService(context);
            var donController = new DonDangKyApiController(donService);

            var exportResult = await donController.Export(null, null, null, null, SqlServerFixture.AcademicYear);
            var fileResult = Assert.IsType<FileContentResult>(exportResult);

            var hopDongService = new HopDongService(context);
            var hopDongController = new HopDongApiController(hopDongService);

            using var ms1 = new MemoryStream(fileResult.FileContents);
            IFormFile upload1 = new FormFile(ms1, 0, ms1.Length, "file", "DanhSachDonDangKy_NH2026-2027.xlsx");

            var importAction1 = await hopDongController.Import(upload1, SqlServerFixture.AcademicYear);
            var ok1 = Assert.IsType<OkObjectResult>(importAction1);
            var res1 = Assert.IsType<ApiResponse<ImportContractsResultDto>>(ok1.Value);

            Assert.True(res1.Success);
            Assert.NotNull(res1.Data);
            Assert.Equal(8, res1.Data!.Imported);
            Assert.Equal(18, res1.Data.Skipped);
            Assert.Equal(0, res1.Data.Failed);

            var createdContract = await context.HopDongs
                .AsNoTracking()
                .FirstOrDefaultAsync(h => h.MaSinhVien == "6551080319" && h.TrangThai == "hieuLuc");
            Assert.NotNull(createdContract);
            Assert.Equal("DK-65089", createdContract!.MaDonDangKy);

            var updatedApp = await context.DonDangKys
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.MaDonDangKy == "DK-65089");
            Assert.NotNull(updatedApp);
            Assert.Equal("daDuyet", updatedApp!.TrangThai);

            // Nhập lại đúng file đó lần 2 phải bỏ qua toàn bộ, không tạo trùng
            using var ms2 = new MemoryStream(fileResult.FileContents);
            IFormFile upload2 = new FormFile(ms2, 0, ms2.Length, "file", "DanhSachDonDangKy_NH2026-2027.xlsx");

            var importAction2 = await hopDongController.Import(upload2, SqlServerFixture.AcademicYear);
            var ok2 = Assert.IsType<OkObjectResult>(importAction2);
            var res2 = Assert.IsType<ApiResponse<ImportContractsResultDto>>(ok2.Value);

            Assert.True(res2.Success);
            Assert.NotNull(res2.Data);
            Assert.Equal(0, res2.Data!.Imported);
            Assert.Equal(26, res2.Data.Skipped);
            Assert.Equal(0, res2.Data.Failed);
        }

        [Fact]
        public async Task Import_WithInvalidOrEmptyFile_ReturnsBadRequest()
        {
            using var context = _fixture.CreateDbContext();
            var service = new HopDongService(context);
            var controller = new HopDongApiController(service);

            var emptyStream = new MemoryStream();
            IFormFile emptyFile = new FormFile(emptyStream, 0, 0, "file", "empty.xlsx");
            var emptyResult = await controller.Import(emptyFile, SqlServerFixture.AcademicYear);
            Assert.IsType<BadRequestObjectResult>(emptyResult);

            var textBytes = System.Text.Encoding.UTF8.GetBytes("not an excel file");
            using var txtStream = new MemoryStream(textBytes);
            IFormFile txtFile = new FormFile(txtStream, 0, textBytes.Length, "file", "contracts.txt");
            var txtResult = await controller.Import(txtFile, SqlServerFixture.AcademicYear);
            Assert.IsType<BadRequestObjectResult>(txtResult);

            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Sheet1");
            ws.Cell(1, 1).Value = "MSSV";
            ws.Cell(2, 1).Value = "6551080319";
            using var xlsxStream = new MemoryStream();
            wb.SaveAs(xlsxStream);
            xlsxStream.Position = 0;
            IFormFile validFile = new FormFile(xlsxStream, 0, xlsxStream.Length, "file", "contracts.xlsx");

            var badYearResult = await controller.Import(validFile, "NH9999-0000");
            Assert.IsType<BadRequestObjectResult>(badYearResult);
        }

        [Fact]
        public async Task Import_WithInvalidStudentOrGenderMismatch_ReportsRowErrors()
        {
            using var context = _fixture.CreateDbContext();
            var service = new HopDongService(context);
            var controller = new HopDongApiController(service);

            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Contracts");
            ws.Cell(1, 1).Value = "MSSV";
            ws.Cell(1, 2).Value = "Mã phòng";
            ws.Cell(1, 3).Value = "Ngày bắt đầu";
            ws.Cell(1, 4).Value = "Ngày kết thúc";

            ws.Cell(2, 1).Value = "9999999999";
            ws.Cell(2, 2).Value = "A01_A103";
            ws.Cell(2, 3).Value = "2026-09-01";
            ws.Cell(2, 4).Value = "2027-06-30";

            // Sinh viên nữ (6551081016) xếp vào tòa nam A01
            ws.Cell(3, 1).Value = "6551081016";
            ws.Cell(3, 2).Value = "A01_A103";
            ws.Cell(3, 3).Value = "2026-09-01";
            ws.Cell(3, 4).Value = "2027-06-30";

            using var stream = new MemoryStream();
            wb.SaveAs(stream);
            stream.Position = 0;

            IFormFile file = new FormFile(stream, 0, stream.Length, "file", "errors.xlsx");
            var action = await controller.Import(file, SqlServerFixture.AcademicYear);
            var ok = Assert.IsType<OkObjectResult>(action);
            var res = Assert.IsType<ApiResponse<ImportContractsResultDto>>(ok.Value);

            Assert.True(res.Success);
            Assert.NotNull(res.Data);
            Assert.Equal(0, res.Data!.Imported);
            Assert.Equal(2, res.Data.Failed);
            Assert.Equal(2, res.Data.Errors.Count);
        }

        [Fact]
        public async Task Import_WithNewStudentProfile_CreatesStudentAccountAndContract()
        {
            using var context = _fixture.CreateDbContext();
            var donService = new DonDangKyService(context);
            var donController = new DonDangKyApiController(donService);

            var exportResult = await donController.Export(null, null, null, null, SqlServerFixture.AcademicYear);
            var fileResult = Assert.IsType<FileContentResult>(exportResult);

            using var editStream = new MemoryStream();
            editStream.Write(fileResult.FileContents, 0, fileResult.FileContents.Length);
            editStream.Position = 0;

            using var wb = new XLWorkbook(editStream);
            var ws = wb.Worksheet("DonDangKy");
            int newRow = ws.LastRowUsed()!.RowNumber() + 1;
            ws.Cell(newRow, 1).Value = "";
            ws.Cell(newRow, 2).Value = "6751078888";
            ws.Cell(newRow, 3).Value = "Nguyễn Minh Anh Thư";
            ws.Cell(newRow, 4).Value = "2008-03-20";
            ws.Cell(newRow, 5).Value = "Nữ";
            ws.Cell(newRow, 6).Value = "079308008888";
            ws.Cell(newRow, 7).Value = "0909888777";
            ws.Cell(newRow, 8).Value = "thunm.6751078888@sinhvien.utc2.edu.vn";
            ws.Cell(newRow, 9).Value = "Biên Hòa, Đồng Nai";
            ws.Cell(newRow, 10).Value = "CNTT01_K67";
            ws.Cell(newRow, 11).Value = "Công nghệ thông tin";
            ws.Cell(newRow, 12).Value = 2026;
            ws.Cell(newRow, 13).Value = "Tân sinh viên K67";
            ws.Cell(newRow, 14).Value = "Đợt 1";
            ws.Cell(newRow, 15).Value = "B01";
            ws.Cell(newRow, 16).Value = "B01_B103";
            ws.Cell(newRow, 17).Value = "";
            ws.Cell(newRow, 18).Value = "Tiêu chuẩn Nữ 8 chỗ";
            ws.Cell(newRow, 19).Value = 500000m;
            ws.Cell(newRow, 20).Value = 500000m;
            ws.Cell(newRow, 21).Value = "2026-09-01";
            ws.Cell(newRow, 22).Value = "2027-06-30";
            ws.Cell(newRow, 23).Value = "Chờ duyệt";

            using var uploadStream = new MemoryStream();
            wb.SaveAs(uploadStream);
            uploadStream.Position = 0;

            var hopDongController = new HopDongApiController(new HopDongService(context));
            IFormFile file = new FormFile(uploadStream, 0, uploadStream.Length, "file", "unified.xlsx");

            var action = await hopDongController.Import(file, SqlServerFixture.AcademicYear);
            var ok = Assert.IsType<OkObjectResult>(action);
            var res = Assert.IsType<ApiResponse<ImportContractsResultDto>>(ok.Value);

            Assert.True(res.Success);
            Assert.NotNull(res.Data);
            Assert.Equal(9, res.Data!.Imported);
            Assert.Equal(0, res.Data.Failed);

            var createdStudent = await context.SinhViens.AsNoTracking().FirstOrDefaultAsync(s => s.MaSinhVien == "6751078888");
            Assert.NotNull(createdStudent);
            Assert.Equal("nu", createdStudent!.GioiTinh);

            var createdAccount = await context.TaiKhoans.AsNoTracking().FirstOrDefaultAsync(t => t.MaSinhVien == "6751078888");
            Assert.NotNull(createdAccount);

            var createdContract = await context.HopDongs.AsNoTracking().FirstOrDefaultAsync(h => h.MaSinhVien == "6751078888" && h.TrangThai == "hieuLuc");
            Assert.NotNull(createdContract);
        }
    }
}
