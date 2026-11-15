using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.Utilities.Api;
using Dormitory.Web.Features.Utilities.DTOs;
using Dormitory.Web.Features.Utilities.Entities;
using Dormitory.Web.Features.Utilities.Services;
using Dormitory.Web.Shared.Models;

namespace Dormitory.IntegrationTests.Features.Utilities
{
    public class FinalizeUtilityTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public FinalizeUtilityTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        private const int BillMonth = 10;
        private const int BillYear = 2026;

        // Phòng mới tinh (không đụng dữ liệu demo) với N hợp đồng hiệu lực phủ qua kỳ hóa đơn.
        private static async Task<Phong> BuildRoomAsync(ApplicationDbContext context, string tag, int soNguoi)
        {
            var building = await context.ToaNhas.FirstAsync();
            var loaiPhong = await context.LoaiPhongs.FirstAsync();
            var phong = new Phong
            {
                MaPhong = $"A9_P{tag}",
                MaToaNha = building.MaToaNha,
                MaLoaiPhong = loaiPhong.MaLoaiPhong,
                SoTang = 1
            };
            context.Phongs.Add(phong);

            for (int i = 1; i <= soNguoi; i++)
            {
                var giuong = new Giuong { MaGiuong = $"{phong.MaPhong}_{i}", MaPhong = phong.MaPhong, SoThuTu = i };
                context.Giuongs.Add(giuong);
                var sv = await TestDataBuilder.CreateTestStudentAsync(context, $"SV{tag}{i:D3}");
                context.HopDongs.Add(new HopDong
                {
                    MaHopDong = $"HDP{tag}{i}",
                    MaSinhVien = sv.MaSinhVien,
                    MaGiuong = giuong.MaGiuong,
                    MaKyHoc = "HK1_2026_2027",
                    NgayBatDau = new DateTime(2026, 9, 1),
                    NgayKetThuc = new DateTime(2027, 5, 31),
                    GiaThueThang = 500000,
                    TrangThai = "hieuLuc"
                });
            }

            await context.SaveChangesAsync();
            return phong;
        }

        private static async Task AddPendingBillAsync(ApplicationDbContext context, string maPhong,
            decimal tienDien = 100000m, decimal tienNuoc = 48000m)
        {
            context.HoaDonPhongs.Add(new HoaDonPhong
            {
                MaPhong = maPhong,
                Thang = BillMonth,
                Nam = BillYear,
                TienDien = tienDien,
                TienNuoc = tienNuoc,
                TongTien = tienDien + tienNuoc,
                SoNguoiChia = 1,
                TienMoiNguoi = tienDien + tienNuoc,
                TrangThai = "chuaChot",
                NgayTao = new DateTime(BillYear, BillMonth, 26)
            });
            await context.SaveChangesAsync();
        }

        [Fact]
        public async Task Finalize_Ok_MotNguoiO_TaoHoaDonCaNhanVaChotHDonPhong()
        {
            using var context = _fixture.CreateDbContext();
            var phong = await BuildRoomAsync(context, "F01", 1);
            await AddPendingBillAsync(context, phong.MaPhong);
            var service = new DienNuocDichVuService(context);

            var (success, error, data) = await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = phong.MaPhong, SendNow = false },
                SqlServerFixture.AcademicYear, "NV13");

            Assert.True(success);
            Assert.Null(error);
            Assert.NotNull(data);
            Assert.Equal(1, data!.InvoicesCreated);
            Assert.Equal(100000m, data.TienDienMoiNguoi);
            Assert.Equal(48000m, data.TienNuocMoiNguoi);

            // Hóa đơn phòng chuyển sang trạng thái chốt, số người chia tính lại theo hợp đồng thực tế.
            var roomBill = await context.HoaDonPhongs.SingleAsync(b => b.MaPhong == phong.MaPhong);
            Assert.Equal("daChot", roomBill.TrangThai);
            Assert.Equal(1, roomBill.SoNguoiChia);

            var contract = await context.HopDongs.SingleAsync(h => h.MaGiuong == $"{phong.MaPhong}_1");
            var invoice = await context.HoaDons
                .Include(h => h.DanhSachChiTietHoaDon)
                .SingleAsync(h => h.MaHopDong == contract.MaHopDong && h.Thang == BillMonth && h.Nam == BillYear);
            Assert.Equal("chuaThanhToan", invoice.TrangThai);
            Assert.Null(invoice.NgayGui); // SendNow=false thì BQL bấm Gửi sau
            Assert.Equal(new DateTime(BillYear, BillMonth + 1, 15), invoice.HanThanhToan);

            var dien = invoice.DanhSachChiTietHoaDon.Single(d => d.LoaiKhoan == "dien");
            var nuoc = invoice.DanhSachChiTietHoaDon.Single(d => d.LoaiKhoan == "nuoc");
            Assert.Equal(100000m, dien.DonGia);
            Assert.Equal(48000m, nuoc.DonGia);
            Assert.All(invoice.DanhSachChiTietHoaDon, d => Assert.Equal(d.DonGia, d.ThanhTien!.Value));
        }

        [Fact]
        public async Task Finalize_Ok_HaiNguoiO_ChiaDungTienMoiNguoi()
        {
            using var context = _fixture.CreateDbContext();
            var phong = await BuildRoomAsync(context, "F02", 2);
            await AddPendingBillAsync(context, phong.MaPhong);
            var service = new DienNuocDichVuService(context);

            var (success, _, data) = await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = phong.MaPhong }, SqlServerFixture.AcademicYear, "NV13");

            Assert.True(success);
            Assert.Equal(2, data!.InvoicesCreated);
            Assert.Equal(2, data.SoNguoiChia);
            Assert.Equal(50000m, data.TienDienMoiNguoi);
            Assert.Equal(24000m, data.TienNuocMoiNguoi);

            var contractIds = await context.HopDongs
                .Where(h => h.MaGiuong == $"{phong.MaPhong}_1" || h.MaGiuong == $"{phong.MaPhong}_2")
                .Select(h => h.MaHopDong)
                .ToListAsync();
            var invoices = await context.HoaDons
                .Include(h => h.DanhSachChiTietHoaDon)
                .Where(h => contractIds.Contains(h.MaHopDong) && h.Thang == BillMonth && h.Nam == BillYear)
                .ToListAsync();
            Assert.Equal(2, invoices.Count);
            Assert.All(invoices, h =>
                Assert.Equal(74000m, h.DanhSachChiTietHoaDon.Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia)));

            var roomBill = await context.HoaDonPhongs.SingleAsync(b => b.MaPhong == phong.MaPhong);
            Assert.Equal(74000m, roomBill.TienMoiNguoi);
        }

        [Fact]
        public async Task Finalize_Ok_SendNow_DatNgayGuiVaKemThongBao()
        {
            using var context = _fixture.CreateDbContext();
            var phong = await BuildRoomAsync(context, "F03", 1);
            await AddPendingBillAsync(context, phong.MaPhong);
            var service = new DienNuocDichVuService(context);

            var (success, _, _) = await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = phong.MaPhong, SendNow = true },
                SqlServerFixture.AcademicYear, "NV13");

            Assert.True(success);
            var contract = await context.HopDongs.SingleAsync(h => h.MaGiuong == $"{phong.MaPhong}_1");
            var invoice = await context.HoaDons
                .SingleAsync(h => h.MaHopDong == contract.MaHopDong && h.Thang == BillMonth && h.Nam == BillYear);
            Assert.NotNull(invoice.NgayGui);

            var notice = await context.ThongBaos.FirstOrDefaultAsync(t =>
                t.Loai == "hoaDon" && t.TieuDe.Contains("T10/2026"));
            Assert.NotNull(notice);
            Assert.Equal(contract.MaSinhVien, notice!.MaSinhVien);
        }

        [Fact]
        public async Task Finalize_Ok_CongPhiDichVuDangDungVaoHoaDonSinhVien()
        {
            using var context = _fixture.CreateDbContext();
            var phong = await BuildRoomAsync(context, "F05", 1);
            await AddPendingBillAsync(context, phong.MaPhong);
            var contract = await context.HopDongs.SingleAsync(h => h.MaGiuong == $"{phong.MaPhong}_1");

            context.DichVus.Add(new DichVu { MaDichVu = "DV_TESTNET", TenDichVu = "Wifi tốc độ cao", DonViTinh = "thang", DonGia = 50000, LaDangHoat = true });
            context.DangKyDichVus.Add(new DangKyDichVu
            {
                MaHopDong = contract.MaHopDong,
                MaDichVu = "DV_TESTNET",
                SoLuong = 2,
                NgayBatDau = new DateTime(2026, 9, 1),
                TrangThai = "dangDung"
            });
            await context.SaveChangesAsync();

            var service = new DienNuocDichVuService(context);
            var (success, _, data) = await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = phong.MaPhong, SendNow = true },
                SqlServerFixture.AcademicYear, "NV13");

            Assert.True(success);
            Assert.Equal(100000m, data!.TienDichVu);

            var invoice = await context.HoaDons
                .Include(h => h.DanhSachChiTietHoaDon)
                .SingleAsync(h => h.MaHopDong == contract.MaHopDong && h.Thang == BillMonth && h.Nam == BillYear);
            var dvLine = invoice.DanhSachChiTietHoaDon.Single(d => d.LoaiKhoan == "dichVu");
            Assert.Equal(2, dvLine.SoLuong);
            Assert.Equal(50000m, dvLine.DonGia);
            Assert.Equal(100000m, dvLine.ThanhTien);
            Assert.Equal(248000m, invoice.DanhSachChiTietHoaDon.Sum(d => d.ThanhTien ?? 0));

            var notice = await context.ThongBaos.FirstOrDefaultAsync(t =>
                t.Loai == "hoaDon" && t.TieuDe.Contains("T10/2026") && t.MaSinhVien == contract.MaSinhVien);
            Assert.NotNull(notice);
            // Số tiền dùng format văn hóa nên chỉ kiểm tra cụm từ, số tiền đã xác nhận qua data.TienDichVu.
            Assert.Contains("phí dịch vụ", notice!.NoiDung);
        }

        [Fact]
        public async Task Finalize_Ok_DonChoDuyetKhongBiTinhPhi()
        {
            using var context = _fixture.CreateDbContext();
            var phong = await BuildRoomAsync(context, "F06", 1);
            await AddPendingBillAsync(context, phong.MaPhong);
            var contract = await context.HopDongs.SingleAsync(h => h.MaGiuong == $"{phong.MaPhong}_1");

            context.DichVus.Add(new DichVu { MaDichVu = "DV_TESTPARK", TenDichVu = "Giữ xe", DonViTinh = "thang", DonGia = 100000, LaDangHoat = true });
            context.DangKyDichVus.Add(new DangKyDichVu
            {
                MaHopDong = contract.MaHopDong,
                MaDichVu = "DV_TESTPARK",
                SoLuong = 1,
                NgayBatDau = new DateTime(2026, 10, 1),
                TrangThai = "choDuyet"
            });
            await context.SaveChangesAsync();

            var service = new DienNuocDichVuService(context);
            var (success, _, data) = await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = phong.MaPhong }, SqlServerFixture.AcademicYear, "NV13");

            Assert.True(success);
            Assert.Equal(0, data!.TienDichVu);
            var invoice = await context.HoaDons
                .Include(h => h.DanhSachChiTietHoaDon)
                .SingleAsync(h => h.MaHopDong == contract.MaHopDong && h.Thang == BillMonth && h.Nam == BillYear);
            Assert.DoesNotContain(invoice.DanhSachChiTietHoaDon, d => d.LoaiKhoan == "dichVu");
        }

        [Fact]
        public async Task Finalize_Ok_SkipHopDongDaCoHoaDonDienCungKy()
        {
            using var context = _fixture.CreateDbContext();
            var phong = await BuildRoomAsync(context, "F04", 1);
            await AddPendingBillAsync(context, phong.MaPhong);

            // Hợp đồng đã có hóa đơn tiền điện T10/2026 (ví dụ BQL đã tạo tay) -> chốt không được tạo trùng.
            var contract = await context.HopDongs.SingleAsync(h => h.MaGiuong == $"{phong.MaPhong}_1");
            var oldInvoice = new HoaDon
            {
                MaHoaDon = "HDTESTF04",
                MaHopDong = contract.MaHopDong,
                Thang = BillMonth,
                Nam = BillYear,
                HanThanhToan = new DateTime(BillYear, BillMonth + 1, 15),
                TrangThai = "chuaThanhToan"
            };
            oldInvoice.DanhSachChiTietHoaDon.Add(new ChiTietHoaDon
            {
                MaHoaDon = oldInvoice.MaHoaDon,
                LoaiKhoan = "dien",
                NoiDung = "Tiền điện T10/2026 (du lieu cu)",
                SoLuong = 1,
                DonGia = 100000m,
                ThanhTien = 100000m
            });
            context.HoaDons.Add(oldInvoice);
            await context.SaveChangesAsync();

            var service = new DienNuocDichVuService(context);
            var (success, _, data) = await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = phong.MaPhong }, SqlServerFixture.AcademicYear, "NV13");

            Assert.True(success);
            Assert.Equal(0, data!.InvoicesCreated);
            Assert.Equal(1, data.InvoicesSkipped);
            Assert.Equal("daChot", (await context.HoaDonPhongs.SingleAsync(b => b.MaPhong == phong.MaPhong)).TrangThai);

            var soHoaDonCuaHopDong = await context.HoaDons.CountAsync(h => h.MaHopDong == contract.MaHopDong);
            Assert.Equal(1, soHoaDonCuaHopDong);
        }

        [Fact]
        public async Task Finalize_Sai_KhongConHoaDonChoChot()
        {
            using var context = _fixture.CreateDbContext();
            var phong = await BuildRoomAsync(context, "F05", 1);
            await AddPendingBillAsync(context, phong.MaPhong);
            var service = new DienNuocDichVuService(context);

            Assert.True((await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = phong.MaPhong }, SqlServerFixture.AcademicYear, "NV13")).Success);

            var (secondSuccess, secondError, secondData) = await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = phong.MaPhong }, SqlServerFixture.AcademicYear, "NV13");
            Assert.False(secondSuccess);
            Assert.Contains("chờ chốt", secondError!);
            Assert.Null(secondData);
        }

        [Fact]
        public async Task Finalize_Sai_PhongKhongCoNguoiO_VaMaPhongTrong()
        {
            using var context = _fixture.CreateDbContext();
            var building = await context.ToaNhas.FirstAsync();
            var loaiPhong = await context.LoaiPhongs.FirstAsync();
            var phong = new Phong { MaPhong = "A9_P06", MaToaNha = building.MaToaNha, MaLoaiPhong = loaiPhong.MaLoaiPhong, SoTang = 1 };
            context.Phongs.Add(phong);
            await context.SaveChangesAsync();
            await AddPendingBillAsync(context, phong.MaPhong);
            var service = new DienNuocDichVuService(context);

            var (noResident, noResidentError, _) = await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = phong.MaPhong }, SqlServerFixture.AcademicYear, "NV13");
            Assert.False(noResident);
            Assert.Contains("không có sinh viên ở", noResidentError!);

            var (emptyRoom, emptyRoomError, _) = await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = "" }, SqlServerFixture.AcademicYear, "NV13");
            Assert.False(emptyRoom);
            Assert.NotNull(emptyRoomError);

            var (noYear, noYearError, _) = await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = phong.MaPhong }, null, "NV13");
            Assert.False(noYear);
            Assert.NotNull(noYearError);
        }

        [Fact]
        public async Task FinalizeController_Ok_Tra200_Sai_Tra400()
        {
            using var context = _fixture.CreateDbContext();
            var phong = await BuildRoomAsync(context, "F07", 1);
            await AddPendingBillAsync(context, phong.MaPhong);
            var service = new DienNuocDichVuService(context);
            var controller = new DienNuocApiController(service);

            var okResult = await controller.Finalize(
                new FinalizeUtilityDto { RoomId = phong.MaPhong }, SqlServerFixture.AcademicYear);
            var ok = Assert.IsType<OkObjectResult>(okResult);
            var res = Assert.IsType<ApiResponse<FinalizeUtilityResultDto>>(ok.Value);
            Assert.True(res.Success);

            var badResult = await controller.Finalize(
                new FinalizeUtilityDto { RoomId = "PHONGKHONGTONTAI" }, SqlServerFixture.AcademicYear);
            Assert.IsType<BadRequestObjectResult>(badResult);
        }
    }
}
