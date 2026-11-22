using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Invoices.Api;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Invoices.Services;
using Dormitory.Web.Features.Payments.DTOs;
using Dormitory.Web.Features.Payments.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Invoices
{
    public class HoaDonSendAndProofTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public HoaDonSendAndProofTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        // Thư mục tạm riêng cho mỗi test để không đụng App_Data thật.
        private static string NewProofDir() =>
            Path.Combine(Path.GetTempPath(), "ktx-proof-test", Guid.NewGuid().ToString("N"));

        private static void CleanDir(string dir)
        {
            if (Directory.Exists(dir)) Directory.Delete(dir, true);
        }

        private static FormFile MakeProof(string fileName, byte[] bytes)
        {
            var stream = new MemoryStream(bytes);
            return new FormFile(stream, 0, bytes.Length, "proof", fileName);
        }

        private static byte[] FakeImageBytes() =>
            new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 42, 43, 44 };

        private static async Task<HoaDon> GetUnpaidInvoiceAsync(ApplicationDbContext context)
        {
            return await context.HoaDons
                .Include(h => h.HopDong)
                .Include(h => h.DanhSachChiTietHoaDon)
                .Include(h => h.DanhSachThanhToan)
                .Where(h => h.TrangThai == "chuaThanhToan" && h.NgayGui == null)
                .OrderBy(h => h.MaHoaDon)
                .FirstAsync();
        }

        [Fact]
        public async Task SendInvoiceAsync_Ok_DatNgayGuiVaTaoThongBao()
        {
            using var context = _fixture.CreateDbContext();
            var invoice = await GetUnpaidInvoiceAsync(context);
            var service = new HoaDonService(context);

            var success = await service.SendInvoiceAsync(invoice.MaHoaDon, SqlServerFixture.AcademicYear);

            Assert.True(success);
            Assert.NotNull(invoice.NgayGui);
            var notice = await context.ThongBaos.FirstOrDefaultAsync(t =>
                t.Loai == "hoaDon" && t.TieuDe.Contains(invoice.MaHoaDon));
            Assert.NotNull(notice);
            Assert.Equal(invoice.HopDong!.MaSinhVien, notice!.MaSinhVien);
            Assert.Equal("/student/invoice", notice.LienKet);
        }

        [Fact]
        public async Task SendInvoiceAsync_Sai_GuiLanThuHai_TraFalse()
        {
            using var context = _fixture.CreateDbContext();
            var invoice = await GetUnpaidInvoiceAsync(context);
            var service = new HoaDonService(context);

            Assert.True(await service.SendInvoiceAsync(invoice.MaHoaDon, SqlServerFixture.AcademicYear));
            Assert.False(await service.SendInvoiceAsync(invoice.MaHoaDon, SqlServerFixture.AcademicYear));

            var soThongBao = await context.ThongBaos.CountAsync(t => t.TieuDe.Contains(invoice.MaHoaDon));
            Assert.Equal(1, soThongBao);
        }

        [Fact]
        public async Task SendController_Ok_Tra200()
        {
            using var context = _fixture.CreateDbContext();
            var invoice = await GetUnpaidInvoiceAsync(context);
            var service = new HoaDonService(context);
            var controller = new HoaDonApiController(service);

            var result = await controller.Send(
                new HoaDonApiController.SendInvoiceRequest { InvoiceId = invoice.MaHoaDon },
                SqlServerFixture.AcademicYear);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse>(ok.Value);
            Assert.True(res.Success);
        }

        [Fact]
        public async Task SendController_Sai_MaHoaDonTrong_Tra400()
        {
            using var context = _fixture.CreateDbContext();
            var service = new HoaDonService(context);
            var controller = new HoaDonApiController(service);

            var blankResult = await controller.Send(
                new HoaDonApiController.SendInvoiceRequest { InvoiceId = "  " }, SqlServerFixture.AcademicYear);
            Assert.IsType<BadRequestObjectResult>(blankResult);

            var notFoundResult = await controller.Send(
                new HoaDonApiController.SendInvoiceRequest { InvoiceId = "HD000000000" }, SqlServerFixture.AcademicYear);
            Assert.IsType<BadRequestObjectResult>(notFoundResult);
        }

        [Fact]
        public async Task SubmitPaymentProofAsync_Ok_LuuTepVaCapNhatHoaDon()
        {
            var dir = NewProofDir();
            try
            {
                using var context = _fixture.CreateDbContext();
                var invoice = await GetUnpaidInvoiceAsync(context);
                var studentId = invoice.HopDong!.MaSinhVien;
                var service = new HoaDonService(context);
                var bytes = FakeImageBytes();

                var (success, error) = await service.SubmitPaymentProofAsync(
                    invoice.MaHoaDon, studentId, MakeProof("bien-lai.png", bytes), dir);

                Assert.True(success);
                Assert.Null(error);
                Assert.NotNull(invoice.AnhMinhChung);
                Assert.NotNull(invoice.NgayNopMinhChung);

                var savedPath = Path.Combine(dir, "payment-proof", invoice.AnhMinhChung!);
                Assert.True(File.Exists(savedPath));
                Assert.Equal(bytes, await File.ReadAllBytesAsync(savedPath));

                // Đọc lại đúng ảnh đã nộp theo phạm vi sinh viên.
                var (readBytes, contentType) = await service.GetInvoiceProofAsync(invoice.MaHoaDon, studentId, dir);
                Assert.Equal("image/png", contentType);
                Assert.Equal(bytes, readBytes);

                // Nộp lại lần hai thì tệp cũ bị xóa, không tồn đọng tệp rác.
                string oldFileName = invoice.AnhMinhChung!;
                var (success2, _) = await service.SubmitPaymentProofAsync(
                    invoice.MaHoaDon, studentId, MakeProof("lai-lan-2.jpg", bytes), dir);
                Assert.True(success2);
                Assert.NotEqual(oldFileName, invoice.AnhMinhChung);
                Assert.False(File.Exists(Path.Combine(dir, "payment-proof", oldFileName)));
            }
            finally { CleanDir(dir); }
        }

        [Fact]
        public async Task SubmitPaymentProofAsync_Sai_FileKhongPhaiAnh()
        {
            var dir = NewProofDir();
            try
            {
                using var context = _fixture.CreateDbContext();
                var invoice = await GetUnpaidInvoiceAsync(context);
                var service = new HoaDonService(context);

                var (success, error) = await service.SubmitPaymentProofAsync(
                    invoice.MaHoaDon, invoice.HopDong!.MaSinhVien,
                    MakeProof("to-khai.txt", FakeImageBytes()), dir);

                Assert.False(success);
                Assert.NotNull(error);
                Assert.Null(invoice.AnhMinhChung);
                Assert.False(Directory.Exists(Path.Combine(dir, "payment-proof")));
            }
            finally { CleanDir(dir); }
        }

        [Fact]
        public async Task SubmitPaymentProofAsync_Sai_HoaDonCuaSinhVienKhac()
        {
            var dir = NewProofDir();
            try
            {
                using var context = _fixture.CreateDbContext();
                var invoice = await GetUnpaidInvoiceAsync(context);
                var service = new HoaDonService(context);

                var (success, error) = await service.SubmitPaymentProofAsync(
                    invoice.MaHoaDon, "KHONGTONTAI", MakeProof("bien-lai.png", FakeImageBytes()), dir);

                Assert.False(success);
                Assert.Equal("Không tìm thấy hóa đơn.", error);
                Assert.Null(invoice.AnhMinhChung);

                // Sinh viên khác cũng không đọc được ảnh của hóa đơn này.
                var (bytes, contentType) = await service.GetInvoiceProofAsync(invoice.MaHoaDon, "KHONGTONTAI", dir);
                Assert.Null(bytes);
                Assert.Null(contentType);
            }
            finally { CleanDir(dir); }
        }

        [Fact]
        public async Task SubmitPaymentProofAsync_Sai_HoaDonDaThanhToan()
        {
            var dir = NewProofDir();
            try
            {
                using var context = _fixture.CreateDbContext();
                var invoice = await GetUnpaidInvoiceAsync(context);
                invoice.TrangThai = "daThanhToan";
                await context.SaveChangesAsync();
                var service = new HoaDonService(context);

                var (success, error) = await service.SubmitPaymentProofAsync(
                    invoice.MaHoaDon, invoice.HopDong!.MaSinhVien, MakeProof("bien-lai.png", FakeImageBytes()), dir);

                Assert.False(success);
                Assert.Contains("đã được thanh toán", error!);
                Assert.Null(invoice.AnhMinhChung);
            }
            finally { CleanDir(dir); }
        }

        [Fact]
        public async Task ConfirmPaymentAsync_Ok_LuuMinhChungLenThanhToan()
        {
            var dir = NewProofDir();
            try
            {
                using var context = _fixture.CreateDbContext();
                var invoice = await GetUnpaidInvoiceAsync(context);
                var service = new HoaDonService(context);
                var bytes = FakeImageBytes();

                var success = await service.ConfirmPaymentAsync(
                    invoice.MaHoaDon, "Tiền mặt (BQL)", SqlServerFixture.AcademicYear, "NV02",
                    MakeProof("receipt.jpg", bytes), dir);

                Assert.True(success);
                Assert.Equal("daThanhToan", invoice.TrangThai);

                var payment = await context.ThanhToans
                    .Where(t => t.MaHoaDon == invoice.MaHoaDon)
                    .OrderByDescending(t => t.MaThanhToan)
                    .FirstAsync();
                Assert.NotNull(payment.AnhMinhChung);
                Assert.Equal("tienMat", payment.PhuongThuc);
                var savedPath = Path.Combine(dir, "payment-proof", payment.AnhMinhChung!);
                Assert.True(File.Exists(savedPath));
                Assert.Equal(bytes, await File.ReadAllBytesAsync(savedPath));

                // Đọc lại chứng từ theo phiếu thu.
                var (readBytes, contentType) = await service.GetPaymentProofAsync(payment.MaThanhToan, dir);
                Assert.Equal("image/jpeg", contentType);
                Assert.Equal(bytes, readBytes);
            }
            finally { CleanDir(dir); }
        }

        [Fact]
        public async Task ConfirmPaymentAsync_Sai_HoaDonDaThanhToan_TraFalse()
        {
            using var context = _fixture.CreateDbContext();
            var invoice = await GetUnpaidInvoiceAsync(context);
            var service = new HoaDonService(context);

            Assert.True(await service.ConfirmPaymentAsync(invoice.MaHoaDon, "Tiền mặt (BQL)", SqlServerFixture.AcademicYear, "NV02"));
            Assert.False(await service.ConfirmPaymentAsync(invoice.MaHoaDon, "Tiền mặt (BQL)", SqlServerFixture.AcademicYear, "NV02"));
        }

        [Fact]
        public async Task RejectPaymentProofAsync_Ok_LuuLyDoVaLichSu_NopLaiXoaLyDo()
        {
            var dir = NewProofDir();
            try
            {
                using var context = _fixture.CreateDbContext();
                var invoice = await GetUnpaidInvoiceAsync(context);
                var studentId = invoice.HopDong!.MaSinhVien;
                var service = new HoaDonService(context);

                Assert.True((await service.SubmitPaymentProofAsync(
                    invoice.MaHoaDon, studentId, MakeProof("bien-lai.png", FakeImageBytes()), dir)).Success);

                // Mới nộp minh chứng: phải nằm trong trạng thái chờ xác nhận thanh toán.
                var submittedList = await service.GetAllInvoicesAsync(null, null, "choXacNhan", null, SqlServerFixture.AcademicYear);
                var submittedDto = submittedList.Single(x => x.Code == invoice.MaHoaDon);
                Assert.Equal("choXacNhan", submittedDto.PaymentStatus);

                var (success, error) = await service.RejectPaymentProofAsync(invoice.MaHoaDon, "Ảnh minh chứng bị mờ");
                Assert.True(success);
                Assert.Null(error);
                Assert.Equal("Ảnh minh chứng bị mờ", invoice.LyDoTuChoiMinhChung);
                Assert.NotNull(invoice.NgayTuChoiMinhChung);
                Assert.NotNull(invoice.AnhMinhChung);

                var notice = await context.ThongBaos.FirstOrDefaultAsync(t =>
                    t.TieuDe == "Minh chứng thanh toán bị từ chối" && t.MaSinhVien == studentId);
                Assert.NotNull(notice);
                Assert.Contains("Ảnh minh chứng bị mờ", notice!.NoiDung);

                // Dòng hóa đơn phải quay về chuaThanhToan và biến mất khỏi bộ lọc choXacNhan.
                var reviewerDto = (await service.GetAllInvoicesAsync(null, null, null, null, SqlServerFixture.AcademicYear))
                    .Single(x => x.Code == invoice.MaHoaDon);
                Assert.True(reviewerDto.HasStudentProof);
                Assert.True(reviewerDto.IsProofRejected);
                Assert.Equal("chuaThanhToan", reviewerDto.PaymentStatus);
                Assert.Equal("Ảnh minh chứng bị mờ", reviewerDto.ProofRejectReason);
                Assert.NotNull(reviewerDto.ProofRejectedAt);
                Assert.DoesNotContain(
                    await service.GetAllInvoicesAsync(null, null, "choXacNhan", null, SqlServerFixture.AcademicYear),
                    x => x.Code == invoice.MaHoaDon);
                // Chặn xác nhận nhầm minh chứng đã bị từ chối khi không có chứng từ mới.
                Assert.False(await service.ConfirmPaymentAsync(
                    invoice.MaHoaDon, "Chuyển khoản", SqlServerFixture.AcademicYear, "NV02"));

                // Sinh viên nộp lại thì lý do từ chối cũ phải được xóa và quay lại choXacNhan.
                var resubmit = await service.SubmitPaymentProofAsync(
                    invoice.MaHoaDon, studentId, MakeProof("bien-lai-2.png", FakeImageBytes()), dir);
                Assert.True(resubmit.Success);
                Assert.Null(invoice.LyDoTuChoiMinhChung);
                Assert.Null(invoice.NgayTuChoiMinhChung);
                var resubmittedDto = (await service.GetAllInvoicesAsync(null, null, "choXacNhan", null, SqlServerFixture.AcademicYear))
                    .Single(x => x.Code == invoice.MaHoaDon);
                Assert.False(resubmittedDto.IsProofRejected);
                Assert.Equal("choXacNhan", resubmittedDto.PaymentStatus);
            }
            finally { CleanDir(dir); }
        }

        [Fact]
        public async Task RejectPaymentProofAsync_Sai_ThieuLyDoHoacChuaNopMinhChung_TraFalse()
        {
            var dir = NewProofDir();
            try
            {
                using var context = _fixture.CreateDbContext();
                var invoice = await GetUnpaidInvoiceAsync(context);
                var service = new HoaDonService(context);

                var (success, error) = await service.RejectPaymentProofAsync(invoice.MaHoaDon, "   ");
                Assert.False(success);
                Assert.Contains("lý do", error!);

                // Chưa nộp minh chứng thì không có gì để từ chối.
                var (success2, error2) = await service.RejectPaymentProofAsync(invoice.MaHoaDon, "Sai số tiền");
                Assert.False(success2);
                Assert.Contains("chưa nộp minh chứng", error2!);
                Assert.Null(invoice.LyDoTuChoiMinhChung);
            }
            finally { CleanDir(dir); }
        }

        [Fact]
        public async Task SubmitPaymentProofAsync_Sai_HetHanGiuCho_TraFalse()
        {
            var dir = NewProofDir();
            try
            {
                using var context = _fixture.CreateDbContext();
                var invoice = await GetUnpaidInvoiceAsync(context);
                invoice.HopDong!.TrangThai = "choThanhToan";
                invoice.HopDong.HanGiuCho = DateTime.Now.AddHours(-1);
                await context.SaveChangesAsync();

                var service = new HoaDonService(context);
                var (success, error) = await service.SubmitPaymentProofAsync(
                    invoice.MaHoaDon, invoice.HopDong.MaSinhVien, MakeProof("bien-lai.png", FakeImageBytes()), dir);

                Assert.False(success);
                Assert.Contains("24 giờ", error!);
                Assert.Null(invoice.AnhMinhChung);
            }
            finally { CleanDir(dir); }
        }

        [Fact]
        public async Task RejectPaymentProofController_Ok_Tra200_Sai_Tra400()
        {
            var dir = NewProofDir();
            try
            {
                using var context = _fixture.CreateDbContext();
                var invoice = await GetUnpaidInvoiceAsync(context);
                var service = new HoaDonService(context);
                var controller = new HoaDonApiController(service);

                Assert.True((await service.SubmitPaymentProofAsync(
                    invoice.MaHoaDon, invoice.HopDong!.MaSinhVien, MakeProof("bien-lai.png", FakeImageBytes()), dir)).Success);

                var okResult = await controller.RejectPaymentProof(
                    invoice.MaHoaDon,
                    new HoaDonApiController.RejectPaymentProofRequest { Reason = "Nội dung chuyển khoản sai" },
                    SqlServerFixture.AcademicYear);
                Assert.IsType<OkObjectResult>(okResult);

                var badResult = await controller.RejectPaymentProof(
                    invoice.MaHoaDon,
                    new HoaDonApiController.RejectPaymentProofRequest { Reason = "" },
                    SqlServerFixture.AcademicYear);
                Assert.IsType<BadRequestObjectResult>(badResult);
            }
            finally { CleanDir(dir); }
        }

        [Fact]
        public async Task ProcessPaymentAsync_Ok_LuuMinhChungLenThanhToan()
        {
            var dir = NewProofDir();
            try
            {
                using var context = _fixture.CreateDbContext();
                var invoice = await GetUnpaidInvoiceAsync(context);
                var service = new ThanhToanService(context);
                var bytes = FakeImageBytes();
                var outstanding = invoice.DanhSachChiTietHoaDon.Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia)
                    - invoice.DanhSachThanhToan.Sum(t => t.SoTien);

                var success = await service.ProcessPaymentAsync(
                    new ConfirmPaymentDto
                    {
                        InvoiceId = invoice.MaHoaDon,
                        PaymentMethod = "Chuyển khoản ngân hàng",
                        Amount = outstanding
                    },
                    SqlServerFixture.AcademicYear, "NV13",
                    MakeProof("chuyen-khoan.webp", bytes), dir);

                Assert.True(success);
                var payment = await context.ThanhToans
                    .Where(t => t.MaHoaDon == invoice.MaHoaDon)
                    .OrderByDescending(t => t.MaThanhToan)
                    .FirstAsync();
                Assert.NotNull(payment.AnhMinhChung);
                Assert.True(File.Exists(Path.Combine(dir, "payment-proof", payment.AnhMinhChung!)));
            }
            finally { CleanDir(dir); }
        }

        [Fact]
        public async Task ProcessPaymentAsync_Sai_SoTienVuotConPhaiNop_TraFalse()
        {
            using var context = _fixture.CreateDbContext();
            var invoice = await GetUnpaidInvoiceAsync(context);
            var service = new ThanhToanService(context);

            var success = await service.ProcessPaymentAsync(
                new ConfirmPaymentDto
                {
                    InvoiceId = invoice.MaHoaDon,
                    PaymentMethod = "Tiền mặt (BQL)",
                    Amount = 999_999_999m
                },
                SqlServerFixture.AcademicYear, "NV13");

            Assert.False(success);
            Assert.False(await context.ThanhToans.AnyAsync(t => t.MaHoaDon == invoice.MaHoaDon));
        }
    }
}
