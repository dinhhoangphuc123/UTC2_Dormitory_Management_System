using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Invoices.Api;
using Dormitory.Web.Features.Invoices.DTOs;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Invoices.Services;
using Dormitory.Web.Features.Payments.DTOs;
using Dormitory.Web.Features.Registrations.Services;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.StudentPortal.DTOs;
using Dormitory.Web.Features.StudentPortal.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Invoices
{
    // Vòng đời hóa đơn nháp: BQL lập hóa đơn thì lưu nháp, chỉnh sửa được;
    // sinh viên không thấy gì cho tới khi BQL bấm gửi, lúc đó mới có QR và nộp minh chứng được.
    public class InvoiceDraftWorkflowTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public InvoiceDraftWorkflowTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        private const int BillMonth = 10;
        private const int BillYear = 2026;

        private static async Task<HopDong> BuildContractAsync(ApplicationDbContext context, string tag)
        {
            var building = await context.ToaNhas.FirstAsync();
            var loaiPhong = await context.LoaiPhongs.FirstAsync();
            var phong = new Phong
            {
                MaPhong = $"A9_D{tag}",
                MaToaNha = building.MaToaNha,
                MaLoaiPhong = loaiPhong.MaLoaiPhong,
                SoTang = 1
            };
            context.Phongs.Add(phong);

            var giuong = new Giuong { MaGiuong = $"{phong.MaPhong}_1", MaPhong = phong.MaPhong, SoThuTu = 1 };
            context.Giuongs.Add(giuong);
            var sv = await TestDataBuilder.CreateTestStudentAsync(context, $"SVD{tag}");
            var hopDong = new HopDong
            {
                MaHopDong = $"HDD{tag}",
                MaSinhVien = sv.MaSinhVien,
                MaGiuong = giuong.MaGiuong,
                MaKyHoc = "HK1_2026_2027",
                NgayBatDau = new DateTime(2026, 9, 1),
                NgayKetThuc = new DateTime(2027, 5, 31),
                GiaThueThang = 500000,
                TrangThai = "hieuLuc"
            };
            context.HopDongs.Add(hopDong);
            await context.SaveChangesAsync();
            return hopDong;
        }

        private static CreateInvoiceDto MakeCreateRequest(ApplicationDbContext context, HopDong contract)
        {
            var phong = context.Phongs.First(p => p.MaPhong == contract.Giuong!.MaPhong);
            return new CreateInvoiceDto
            {
                StudentId = contract.MaSinhVien,
                Building = phong.MaToaNha,
                Room = $"{phong.MaToaNha}-{phong.MaPhong.Split('_').Last()}",
                Title = "Tiền phòng",
                Category = "phong",
                Amount = 800_000,
                DueDate = $"20/{BillMonth:D2}/{BillYear}",
                Month = BillMonth,
                Year = BillYear
            };
        }

        private static StudentPortalService BuildPortal(ApplicationDbContext context) =>
            new(context,
                new PasswordHasher(),
                Options.Create(new StudentPortalOptions()),
                Options.Create(new PaymentOptions { BankId = "VietinBank", AccountNo = "102873456789", AccountName = "KTX UTC2" }),
                new ReservationExpiryService(context, NullLogger<ReservationExpiryService>.Instance),
                NullLogger<StudentPortalService>.Instance);

        [Fact]
        public async Task Draft_SinhVienKhongThay_ChiHienKhiBqlBamGui()
        {
            using var context = _fixture.CreateDbContext();
            var contract = await BuildContractAsync(context, "01");
            var admin = new HoaDonService(context);
            var dto = await admin.CreateInvoiceAsync(MakeCreateRequest(context, contract), SqlServerFixture.AcademicYear);
            Assert.NotNull(dto);
            var portal = BuildPortal(context);

            // Chưa gửi: cổng sinh viên không thấy danh sách, chi tiết hay mã QR.
            Assert.Empty(await portal.GetInvoicesAsync(contract.MaSinhVien));
            Assert.Null(await portal.GetInvoiceByIdAsync(contract.MaSinhVien, dto!.Code));
            Assert.Null(await portal.GetInvoiceQrAsync(contract.MaSinhVien, dto.Code));

            Assert.True(await admin.SendInvoiceAsync(dto.Code, SqlServerFixture.AcademicYear));

            // Gửi xong: hiện đủ và mã QR chứa đúng số tiền, nội dung là mã hóa đơn.
            var list = await portal.GetInvoicesAsync(contract.MaSinhVien);
            Assert.Single(list);
            Assert.NotNull(await portal.GetInvoiceByIdAsync(contract.MaSinhVien, dto.Code));
            var qr = await portal.GetInvoiceQrAsync(contract.MaSinhVien, dto.Code);
            Assert.NotNull(qr);
            Assert.Equal(800_000m, qr!.Amount);
            Assert.Equal(dto.Code, qr.Content);
            Assert.Contains("800000", qr.Payload);
            Assert.Contains(dto.Code, qr.Payload);
        }

        [Fact]
        public async Task UpdateDraft_Ok_DoiNoiDungSoTienHan_ChiTruocKhiGui()
        {
            using var context = _fixture.CreateDbContext();
            var contract = await BuildContractAsync(context, "02");
            var service = new HoaDonService(context);
            var dto = await service.CreateInvoiceAsync(MakeCreateRequest(context, contract), SqlServerFixture.AcademicYear);

            var (success, error) = await service.UpdateDraftInvoiceAsync(dto!.Code, new UpdateInvoiceDraftDto
            {
                Title = "Tiền phòng tháng 10 (điều chỉnh)",
                Amount = 750_000,
                DueDate = "25/10/2026"
            }, SqlServerFixture.AcademicYear);

            Assert.True(success);
            Assert.Null(error);

            var invoice = await context.HoaDons.Include(h => h.DanhSachChiTietHoaDon)
                .SingleAsync(h => h.MaHoaDon == dto.Code);
            var line = invoice.DanhSachChiTietHoaDon.Single();
            Assert.Equal("Tiền phòng tháng 10 (điều chỉnh)", line.NoiDung);
            Assert.Equal(750_000m, line.ThanhTien);
            Assert.Equal(new DateTime(2026, 10, 25), invoice.HanThanhToan);

            // Gửi rồi thì khóa, không sửa được nữa.
            Assert.True(await service.SendInvoiceAsync(dto.Code, SqlServerFixture.AcademicYear));
            var (sauKhiGui, loi) = await service.UpdateDraftInvoiceAsync(dto.Code, new UpdateInvoiceDraftDto
            {
                Title = "Sửa lần hai",
                Amount = 1_000_000,
                DueDate = "30/10/2026"
            }, SqlServerFixture.AcademicYear);
            Assert.False(sauKhiGui);
            Assert.Equal("Chỉ chỉnh sửa được hóa đơn nháp chưa gửi sinh viên.", loi);
        }

        [Fact]
        public async Task UpdateDraft_HoaDonDienNuocNhieuKhoan_TuChoi()
        {
            using var context = _fixture.CreateDbContext();
            var contract = await BuildContractAsync(context, "03");
            var invoice = new HoaDon
            {
                MaHoaDon = "HDD03_MULTI",
                MaHopDong = contract.MaHopDong,
                Thang = BillMonth,
                Nam = BillYear,
                HanThanhToan = new DateTime(BillYear, BillMonth, 20),
                TrangThai = "nhap",
                NgayLap = DateTime.Now
            };
            invoice.DanhSachChiTietHoaDon.Add(new() { LoaiKhoan = "dien", NoiDung = "Điện", SoLuong = 1, DonGia = 100_000, ThanhTien = 100_000 });
            invoice.DanhSachChiTietHoaDon.Add(new() { LoaiKhoan = "nuoc", NoiDung = "Nước", SoLuong = 1, DonGia = 48_000, ThanhTien = 48_000 });
            context.HoaDons.Add(invoice);
            await context.SaveChangesAsync();

            var (success, error) = await new HoaDonService(context).UpdateDraftInvoiceAsync(
                invoice.MaHoaDon,
                new UpdateInvoiceDraftDto { Title = "Sửa tay", Amount = 200_000, DueDate = "20/10/2026" },
                SqlServerFixture.AcademicYear);

            Assert.False(success);
            Assert.Equal("Hóa đơn điện nước nhiều khoản phải chỉnh sửa ở trang Điện nước & Dịch vụ.", error);
        }

        [Fact]
        public async Task Draft_KhongTheXacNhanThanhToan_HayNopMinhChung()
        {
            using var context = _fixture.CreateDbContext();
            var contract = await BuildContractAsync(context, "04");
            var service = new HoaDonService(context);
            var dto = await service.CreateInvoiceAsync(MakeCreateRequest(context, contract), SqlServerFixture.AcademicYear);

            Assert.False(await service.ConfirmPaymentAsync(dto!.Code, "Tiền mặt (BQL)", SqlServerFixture.AcademicYear, "NV02"));

            var (proofOk, proofError) = await service.SubmitPaymentProofAsync(dto.Code, contract.MaSinhVien, null, string.Empty);
            Assert.False(proofOk);
            Assert.Equal("Hóa đơn chưa được gửi cho sinh viên nên chưa thể nộp minh chứng.", proofError);
        }

        [Fact]
        public async Task UpdateDraftApi_TraOkKhiHopLe_VaBadRequestKhiSai()
        {
            using var context = _fixture.CreateDbContext();
            var contract = await BuildContractAsync(context, "05");
            var service = new HoaDonService(context);
            var dto = await service.CreateInvoiceAsync(MakeCreateRequest(context, contract), SqlServerFixture.AcademicYear);
            var controller = new HoaDonApiController(service);

            var ok = await controller.UpdateDraft(dto!.Code, new UpdateInvoiceDraftDto
            {
                Title = "Tiền phòng đã sửa",
                Amount = 900_000,
                DueDate = "2026-10-22"
            }, SqlServerFixture.AcademicYear);
            Assert.IsType<OkObjectResult>(ok);

            var badAmount = await controller.UpdateDraft(dto.Code, new UpdateInvoiceDraftDto
            {
                Title = "Tiền phòng",
                Amount = 0,
                DueDate = "22/10/2026"
            }, SqlServerFixture.AcademicYear);
            Assert.IsType<BadRequestObjectResult>(badAmount);

            var badDate = await controller.UpdateDraft(dto.Code, new UpdateInvoiceDraftDto
            {
                Title = "Tiền phòng",
                Amount = 900_000,
                DueDate = "22-10-2026"
            }, SqlServerFixture.AcademicYear);
            Assert.IsType<BadRequestObjectResult>(badDate);
        }
    }
}
