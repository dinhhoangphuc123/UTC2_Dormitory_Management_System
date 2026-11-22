using Microsoft.EntityFrameworkCore;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Invoices.DTOs;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Invoices.Services;
using Dormitory.Web.Features.Payments.DTOs;
using Dormitory.Web.Features.Payments.Services;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Invoices
{
    // Nghiệp vụ thông báo cho sinh viên quanh vòng đời hóa đơn:
    // tạo hóa đơn tay chỉ lưu nháp, khi BQL gửi mới phát hành + báo, tất toán hóa đơn thường phải có biên nhận điện tử.
    public class InvoiceNotificationTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public InvoiceNotificationTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        private const int RecMonth = 10;
        private const int RecYear = 2026;

        // Phòng mới với hợp đồng trạng thái cho trước (không đụng dữ liệu demo).
        private static async Task<(Phong Phong, HopDong Contract)> BuildRoomWithContractAsync(
            ApplicationDbContext context, string tag, string contractStatus)
        {
            var building = await context.ToaNhas.FirstAsync();
            var loaiPhong = await context.LoaiPhongs.FirstAsync();
            var phong = new Phong
            {
                MaPhong = $"A9_N{tag}",
                MaToaNha = building.MaToaNha,
                MaLoaiPhong = loaiPhong.MaLoaiPhong,
                SoTang = 1
            };
            context.Phongs.Add(phong);

            var giuong = new Giuong { MaGiuong = $"{phong.MaPhong}_1", MaPhong = phong.MaPhong, SoThuTu = 1 };
            context.Giuongs.Add(giuong);
            var sv = await TestDataBuilder.CreateTestStudentAsync(context, $"SVN{tag}");
            var hopDong = new HopDong
            {
                MaHopDong = $"HDN{tag}",
                MaSinhVien = sv.MaSinhVien,
                MaGiuong = giuong.MaGiuong,
                MaKyHoc = "HK1_2026_2027",
                NgayBatDau = new DateTime(2026, 9, 1),
                NgayKetThuc = new DateTime(2027, 5, 31),
                GiaThueThang = 500000,
                TrangThai = contractStatus,
                HanGiuCho = contractStatus == "choThanhToan" ? DateTime.Now.AddDays(3) : (DateTime?)null
            };
            context.HopDongs.Add(hopDong);

            await context.SaveChangesAsync();
            return (phong, hopDong);
        }

        private static async Task<HoaDon> AddInvoiceAsync(
            ApplicationDbContext context, HopDong contract, decimal soTien, string maHoaDon)
        {
            var hoaDon = new HoaDon
            {
                MaHoaDon = maHoaDon,
                MaHopDong = contract.MaHopDong,
                Thang = RecMonth,
                Nam = RecYear,
                HanThanhToan = new DateTime(RecYear, RecMonth, 20),
                TrangThai = "chuaThanhToan",
                NgayLap = DateTime.Now
            };
            hoaDon.DanhSachChiTietHoaDon.Add(new()
            {
                LoaiKhoan = "tienPhong",
                NoiDung = "Tiền phòng",
                SoLuong = 1,
                DonGia = soTien,
                ThanhTien = soTien
            });
            context.HoaDons.Add(hoaDon);
            await context.SaveChangesAsync();
            return hoaDon;
        }

        private CreateInvoiceDto MakeCreateRequest(ApplicationDbContext context, HopDong contract)
        {
            var phong = context.Phongs.First(p => p.MaPhong == contract.Giuong!.MaPhong);
            var maToaNha = context.ToaNhas.First(t => t.MaToaNha == phong.MaToaNha).MaToaNha;
            return new CreateInvoiceDto
            {
                StudentId = contract.MaSinhVien,
                Building = maToaNha,
                Room = $"{maToaNha}-{phong.MaPhong.Split('_').Last()}",
                Title = "Tiền phòng",
                Category = "phong",
                Amount = 800_000,
                DueDate = $"20/{RecMonth:D2}/{RecYear}",
                Month = RecMonth,
                Year = RecYear
            };
        }

        // ============ Tạo hóa đơn tay: lưu nháp, BQL gửi mới phát hành ============

        [Fact]
        public async Task CreateInvoice_Ok_LuuNhap_ChiGuiKhiBqlBamGui()
        {
            using var context = _fixture.CreateDbContext();
            var (_, contract) = await BuildRoomWithContractAsync(context, "01", "hieuLuc");
            var service = new HoaDonService(context);

            var dto = await service.CreateInvoiceAsync(MakeCreateRequest(context, contract), SqlServerFixture.AcademicYear);

            Assert.NotNull(dto);
            Assert.False(dto!.IsSent);
            Assert.True(dto.IsDraft);
            Assert.True(dto.CanEdit);
            Assert.Equal("draft", dto.Status);

            var invoice = await context.HoaDons.Include(h => h.HopDong)
                .FirstAsync(h => h.MaHoaDon == dto.Code);
            Assert.Null(invoice.NgayGui);
            Assert.Equal("nhap", invoice.TrangThai);
            Assert.False(await context.ThongBaos.AnyAsync(t => t.TieuDe.Contains(dto.Code)));

            // BQL bấm Gửi mới phát hành và báo cho sinh viên.
            Assert.True(await service.SendInvoiceAsync(dto.Code, SqlServerFixture.AcademicYear));
            Assert.Equal("chuaThanhToan", invoice.TrangThai);
            Assert.NotNull(invoice.NgayGui);

            var notice = await context.ThongBaos.FirstOrDefaultAsync(t =>
                t.Loai == "hoaDon" && t.TieuDe.Contains(dto.Code));
            Assert.NotNull(notice);
            Assert.Equal(contract.MaSinhVien, notice!.MaSinhVien);
            Assert.Equal("/student/invoice", notice.LienKet);
            Assert.Contains("VietQR", notice.NoiDung);

            // Gửi lần hai bị chặn để tránh báo trùng.
            Assert.False(await service.SendInvoiceAsync(dto.Code, SqlServerFixture.AcademicYear));
            Assert.Equal(1, await context.ThongBaos.CountAsync(t => t.TieuDe.Contains(dto.Code)));
        }

        [Fact]
        public async Task CreateInvoice_Sai_HopDongKhongHieuLuc_TraNull()
        {
            using var context = _fixture.CreateDbContext();
            var (_, contract) = await BuildRoomWithContractAsync(context, "02", "choThanhToan");
            var service = new HoaDonService(context);

            var dto = await service.CreateInvoiceAsync(MakeCreateRequest(context, contract), SqlServerFixture.AcademicYear);

            Assert.Null(dto);
            Assert.False(await context.HoaDons.AnyAsync(h => h.MaHopDong == contract.MaHopDong));
            Assert.False(await context.ThongBaos.AnyAsync(t => t.MaSinhVien == contract.MaSinhVien));
        }

        [Fact]
        public async Task CreateInvoice_Duplicate_ReturnHoaDonCu_KhongBaoLanHai()
        {
            using var context = _fixture.CreateDbContext();
            var (_, contract) = await BuildRoomWithContractAsync(context, "03", "hieuLuc");
            var service = new HoaDonService(context);

            var lan1 = await service.CreateInvoiceAsync(MakeCreateRequest(context, contract), SqlServerFixture.AcademicYear);
            var lan2 = await service.CreateInvoiceAsync(MakeCreateRequest(context, contract), SqlServerFixture.AcademicYear);

            Assert.NotNull(lan1);
            Assert.Equal(lan1!.Code, lan2!.Code);
            // Bấm lưu nhiều lần vẫn chỉ một hóa đơn nháp và chưa báo cho sinh viên.
            Assert.Equal(0, await context.ThongBaos.CountAsync(t => t.TieuDe.Contains(lan1.Code)));
        }

        // ============ Tất toán hóa đơn thường: biên nhận điện tử ============

        [Fact]
        public async Task ConfirmPayment_HoaDonThuong_CoThongBaoBienNhan()
        {
            using var context = _fixture.CreateDbContext();
            var (_, contract) = await BuildRoomWithContractAsync(context, "04", "hieuLuc");
            var invoice = await AddInvoiceAsync(context, contract, 800_000m, "HDTHUONG04");
            var service = new HoaDonService(context);

            var success = await service.ConfirmPaymentAsync(invoice.MaHoaDon, "Tiền mặt (BQL)", "NH2026-2027", "NV02");

            Assert.True(success);
            Assert.Equal("daThanhToan", invoice.TrangThai);
            var notice = await context.ThongBaos.FirstOrDefaultAsync(t =>
                t.Loai == "thanhToan" && t.TieuDe.Contains(invoice.MaHoaDon));
            Assert.NotNull(notice);
            Assert.Equal(contract.MaSinhVien, notice!.MaSinhVien);
            Assert.Equal("/student/invoice", notice.LienKet);
        }

        [Fact]
        public async Task ConfirmPayment_HopDongChoThanhToan_ChiMotThongBaoKichHoat()
        {
            using var context = _fixture.CreateDbContext();
            var (_, contract) = await BuildRoomWithContractAsync(context, "05", "choThanhToan");
            var invoice = await AddInvoiceAsync(context, contract, 500_000m, "HDKDONG05");
            var service = new HoaDonService(context);

            var success = await service.ConfirmPaymentAsync(invoice.MaHoaDon, "Chuyển khoản ngân hàng", "NH2026-2027", "NV02");

            Assert.True(success);
            Assert.Equal("hieuLuc", contract.TrangThai);
            // Nhánh kích hoạt hợp đồng thắng: chỉ một thông báo cho sinh viên này, dẫn về trang hợp đồng.
            var soThongBao = await context.ThongBaos.CountAsync(t =>
                t.Loai == "thanhToan" && t.MaSinhVien == contract.MaSinhVien);
            Assert.Equal(1, soThongBao);
            var notice = await context.ThongBaos.SingleAsync(t =>
                t.Loai == "thanhToan" && t.MaSinhVien == contract.MaSinhVien);
            Assert.Equal("Xác nhận thanh toán thành công", notice.TieuDe);
            Assert.Equal("/student/contract", notice.LienKet);
        }

        [Fact]
        public async Task ProcessPayment_NopMotPhan_KhongThongBaoChoDenKhiTatToan()
        {
            using var context = _fixture.CreateDbContext();
            var (_, contract) = await BuildRoomWithContractAsync(context, "06", "hieuLuc");
            var invoice = await AddInvoiceAsync(context, contract, 1_000_000m, "HDBANGK06");
            var service = new ThanhToanService(context);

            var motPhan = await service.ProcessPaymentAsync(
                new ConfirmPaymentDto { InvoiceId = invoice.MaHoaDon, PaymentMethod = "Tiền mặt (BQL)", Amount = 400_000m },
                "NH2026-2027", "NV13");
            Assert.True(motPhan);
            Assert.Equal("chuaThanhToan", invoice.TrangThai);
            Assert.Equal(0, await context.ThongBaos.CountAsync(t =>
                t.Loai == "thanhToan" && t.MaSinhVien == contract.MaSinhVien));

            var phanCon = await service.ProcessPaymentAsync(
                new ConfirmPaymentDto { InvoiceId = invoice.MaHoaDon, PaymentMethod = "Tiền mặt (BQL)", Amount = 600_000m },
                "NH2026-2027", "NV13");
            Assert.True(phanCon);
            Assert.Equal("daThanhToan", invoice.TrangThai);

            var notice = await context.ThongBaos.FirstOrDefaultAsync(t =>
                t.Loai == "thanhToan" && t.TieuDe.Contains(invoice.MaHoaDon));
            Assert.NotNull(notice);
            Assert.Equal("/student/invoice", notice!.LienKet);
        }

        [Fact]
        public async Task ProcessPayment_HoaDonDaTatToan_TraFalse_KhongThemThongBao()
        {
            using var context = _fixture.CreateDbContext();
            var (_, contract) = await BuildRoomWithContractAsync(context, "07", "hieuLuc");
            var invoice = await AddInvoiceAsync(context, contract, 700_000m, "HDTRUNG07");
            var service = new ThanhToanService(context);

            Assert.True(await service.ProcessPaymentAsync(
                new ConfirmPaymentDto { InvoiceId = invoice.MaHoaDon, PaymentMethod = "Tiền mặt (BQL)", Amount = 700_000m },
                "NH2026-2027", "NV13"));

            var lan2 = await service.ProcessPaymentAsync(
                new ConfirmPaymentDto { InvoiceId = invoice.MaHoaDon, PaymentMethod = "Tiền mặt (BQL)", Amount = 10_000m },
                "NH2026-2027", "NV13");

            Assert.False(lan2);
            Assert.Equal(1, await context.ThongBaos.CountAsync(t =>
                t.Loai == "thanhToan" && t.MaSinhVien == contract.MaSinhVien));
        }
    }
}
