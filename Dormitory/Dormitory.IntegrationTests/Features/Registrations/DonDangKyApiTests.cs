using ClosedXML.Excel;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Features.Registrations.Api;
using Dormitory.Web.Features.Registrations.DTOs;
using Dormitory.Web.Features.Registrations.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Registrations
{
    public class DonDangKyApiTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public DonDangKyApiTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetAll_ReturnsApplications()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DonDangKyService(context);
            var controller = new DonDangKyApiController(service);

            var result = await controller.GetAll(null, null, null, null, SqlServerFixture.AcademicYear);
            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<List<ApplicationListItemDto>>>(ok.Value);
            Assert.True(res.Success);
            Assert.NotEmpty(res.Data!);
            Assert.All(res.Data!, a =>
                Assert.Contains(a.PaymentStatus, new[] { "daNhanThanhToan", "choXacNhan", "chuaThanhToan" }));
        }

        [Fact]
        public async Task Export_ReturnsValidXlsxWith23ColumnsForStudentsAndContracts()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DonDangKyService(context);
            var controller = new DonDangKyApiController(service);

            var result = await controller.Export(null, null, null, null, SqlServerFixture.AcademicYear);
            var fileResult = Assert.IsType<FileContentResult>(result);
            Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileResult.ContentType);
            Assert.EndsWith(".xlsx", fileResult.FileDownloadName, StringComparison.OrdinalIgnoreCase);
            Assert.NotEmpty(fileResult.FileContents);

            using var stream = new MemoryStream(fileResult.FileContents);
            using var workbook = new XLWorkbook(stream);
            var ws = workbook.Worksheet("DonDangKy");

            string[] expectedHeaders =
            [
                "Mã đơn",
                "MSSV",
                "Họ và tên",
                "Ngày sinh",
                "Giới tính",
                "CCCD",
                "Điện thoại",
                "Email",
                "Địa chỉ thường trú",
                "Lớp",
                "Khoa",
                "Năm nhập học",
                "Diện ưu tiên",
                "Đợt đăng ký",
                "Tòa nhà",
                "Mã phòng",
                "Mã giường",
                "Loại phòng",
                "Giá thuê tháng",
                "Tiền cọc",
                "Ngày bắt đầu",
                "Ngày kết thúc",
                "Trạng thái đơn"
            ];

            Assert.Equal("Times New Roman", ws.Cell(4, 1).Style.Font.FontName);
            Assert.Equal(16, ws.Cell(4, 1).Style.Font.FontSize);

            for (int col = 1; col <= expectedHeaders.Length; col++)
            {
                Assert.Equal(expectedHeaders[col - 1], ws.Cell(7, col).GetString());
            }

            var usedRows = ws.RangeUsed()!.RowsUsed().Where(r => r.RowNumber() > 7).ToList();
            Assert.NotEmpty(usedRows);

            var dk65089Row = usedRows.FirstOrDefault(r => r.Cell(1).GetString() == "DK-65089");
            Assert.NotNull(dk65089Row);
            Assert.Equal("6551080319", dk65089Row!.Cell(2).GetString());
            Assert.False(string.IsNullOrWhiteSpace(dk65089Row.Cell(4).GetString()));  // Ngày sinh
            Assert.False(string.IsNullOrWhiteSpace(dk65089Row.Cell(6).GetString()));  // CCCD
            Assert.False(string.IsNullOrWhiteSpace(dk65089Row.Cell(10).GetString())); // Lớp
            Assert.False(string.IsNullOrWhiteSpace(dk65089Row.Cell(16).GetString())); // Mã phòng
            Assert.False(string.IsNullOrWhiteSpace(dk65089Row.Cell(17).GetString())); // Mã giường gợi ý
            Assert.True(dk65089Row.Cell(19).GetValue<decimal>() > 0);                 // Giá thuê tháng
            Assert.False(string.IsNullOrWhiteSpace(dk65089Row.Cell(21).GetString())); // Ngày bắt đầu
            Assert.False(string.IsNullOrWhiteSpace(dk65089Row.Cell(22).GetString())); // Ngày kết thúc
        }

        [Fact]
        public async Task GetAll_PhanLoaiThuPhiTheoMinhChungVaLyDoTuChoi()
        {
            using var context = _fixture.CreateDbContext();
            var invoice = await context.HoaDons
                .Include(h => h.HopDong)
                .Where(h => h.HopDong != null && h.HopDong.MaDonDangKy == "DK-65091")
                // Dịch vụ chọn hóa đơn mới nhất của đơn để tính trạng thái thu phí.
                .OrderByDescending(h => h.MaHoaDon)
                .FirstOrDefaultAsync();
            Assert.NotNull(invoice);

            invoice!.AnhMinhChung = "bien-lai.png";
            invoice.NgayNopMinhChung = DateTime.Now;
            invoice.LyDoTuChoiMinhChung = null;
            await context.SaveChangesAsync();

            var service = new DonDangKyService(context);
            var submitted = (await service.GetAllApplicationsAsync(null, null, null, null, SqlServerFixture.AcademicYear))
                .First(a => a.Id == "DK-65091");
            Assert.Equal("choXacNhan", submitted.PaymentStatus);
            Assert.Equal(invoice.MaHoaDon, submitted.InvoiceId);
            Assert.NotNull(submitted.ProofSubmittedAt);

            // BQL từ chối: dòng đơn quay lại "chưa thanh toán" kèm lý do để sinh viên nộp lại.
            invoice.LyDoTuChoiMinhChung = "Ảnh minh chứng bị mờ";
            invoice.NgayTuChoiMinhChung = DateTime.Now;
            await context.SaveChangesAsync();

            var rejected = (await service.GetAllApplicationsAsync(null, null, null, null, SqlServerFixture.AcademicYear))
                .First(a => a.Id == "DK-65091");
            Assert.Equal("chuaThanhToan", rejected.PaymentStatus);
            Assert.Equal("Ảnh minh chứng bị mờ", rejected.ProofRejectionReason);
            Assert.NotNull(rejected.ProofRejectedAt);
        }

        [Fact]
        public async Task Export_RespectsStatusAndFilterCriteria()
        {
            using var context = _fixture.CreateDbContext();
            var service = new DonDangKyService(context);
            var controller = new DonDangKyApiController(service);

            List<string> ReadStatuses(IActionResult actionResult)
            {
                var fileResult = Assert.IsType<FileContentResult>(actionResult);
                using var stream = new MemoryStream(fileResult.FileContents);
                using var workbook = new XLWorkbook(stream);
                var ws = workbook.Worksheet("DonDangKy");
                return ws.RangeUsed()!.RowsUsed().Where(r => r.RowNumber() > 7).Select(r => r.Cell(23).GetString()).ToList();
            }

            var approvedStatuses = ReadStatuses(await controller.Export("approved", null, null, null, SqlServerFixture.AcademicYear));
            Assert.NotEmpty(approvedStatuses);
            Assert.All(approvedStatuses, s => Assert.Equal("Đã duyệt", s));

            var pendingStatuses = ReadStatuses(await controller.Export("pending", null, null, null, SqlServerFixture.AcademicYear));
            Assert.NotEmpty(pendingStatuses);
            Assert.All(pendingStatuses, s => Assert.Equal("Chờ duyệt", s));

            var rejectedStatuses = ReadStatuses(await controller.Export("rejected", null, null, null, SqlServerFixture.AcademicYear));
            Assert.NotEmpty(rejectedStatuses);
            Assert.All(rejectedStatuses, s => Assert.True(s is "Bị từ chối" or "Hết hạn"));

            var allStatuses = ReadStatuses(await controller.Export("all", null, null, null, SqlServerFixture.AcademicYear));
            Assert.Equal(approvedStatuses.Count + pendingStatuses.Count + rejectedStatuses.Count, allStatuses.Count);

            // Kiểm tra lọc kết hợp tìm kiếm theo MSSV
            var searchedRows = ReadStatuses(await controller.Export("all", null, null, null, SqlServerFixture.AcademicYear, search: "6551080319"));
            Assert.Single(searchedRows);
        }
    }
}

