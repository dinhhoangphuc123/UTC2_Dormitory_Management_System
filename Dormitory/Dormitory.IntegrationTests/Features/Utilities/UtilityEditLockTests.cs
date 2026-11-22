using Microsoft.EntityFrameworkCore;
using Dormitory.IntegrationTests.Support;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.Utilities.DTOs;
using Dormitory.Web.Features.Utilities.Entities;
using Dormitory.Web.Features.Utilities.Mappings;
using Dormitory.Web.Features.Utilities.Services;

namespace Dormitory.IntegrationTests.Features.Utilities
{
    // Chỉ số điện nước reset theo tháng, khóa chỉnh sửa khi sinh viên đã trả tiền/nộp minh chứng
    // và cập nhật hóa đơn đã gửi khi BQL sửa lại số liệu.
    public class UtilityEditLockTests : IClassFixture<SqlServerFixture>
    {
        private readonly SqlServerFixture _fixture;

        public UtilityEditLockTests(SqlServerFixture fixture)
        {
            _fixture = fixture;
        }

        private const int BillMonth = 10;
        private const int BillYear = 2026;

        private static async Task<(Phong Phong, List<HopDong> Contracts)> BuildRoomAsync(
            ApplicationDbContext context, string tag, int soNguoi)
        {
            var building = await context.ToaNhas.FirstAsync();
            var loaiPhong = await context.LoaiPhongs.FirstAsync();
            var phong = new Phong
            {
                MaPhong = $"A8_L{tag}",
                MaToaNha = building.MaToaNha,
                MaLoaiPhong = loaiPhong.MaLoaiPhong,
                SoTang = 1
            };
            context.Phongs.Add(phong);

            var contracts = new List<HopDong>();
            for (int i = 1; i <= soNguoi; i++)
            {
                var giuong = new Giuong { MaGiuong = $"{phong.MaPhong}_{i}", MaPhong = phong.MaPhong, SoThuTu = i };
                context.Giuongs.Add(giuong);
                var sv = await TestDataBuilder.CreateTestStudentAsync(context, $"SV{tag}{i:D3}");
                var hopDong = new HopDong
                {
                    MaHopDong = $"HDL{tag}{i}",
                    MaSinhVien = sv.MaSinhVien,
                    MaGiuong = giuong.MaGiuong,
                    MaKyHoc = "HK1_2026_2027",
                    NgayBatDau = new DateTime(2026, 9, 1),
                    NgayKetThuc = new DateTime(2027, 5, 31),
                    GiaThueThang = 500000,
                    TrangThai = "hieuLuc"
                };
                context.HopDongs.Add(hopDong);
                contracts.Add(hopDong);
            }

            await context.SaveChangesAsync();
            return (phong, contracts);
        }

        private static async Task AddReadingAsync(ApplicationDbContext context, string maPhong, string loai,
            int thang, int nam, decimal chiSoCu, decimal chiSoMoi)
        {
            var gia = await context.GiaDienNuocs.FirstAsync(g => g.Loai == loai);
            context.ChiSoDienNuocs.Add(new ChiSoDienNuoc
            {
                MaPhong = maPhong,
                Loai = loai,
                Thang = thang,
                Nam = nam,
                ChiSoCu = chiSoCu,
                ChiSoMoi = chiSoMoi,
                MaGia = gia.MaGia,
                NgayGhi = new DateTime(nam, thang, 26)
            });
            await context.SaveChangesAsync();
        }

        private static HoaDon BuildInvoice(string maHoaDon, string maHopDong, int thang, int nam, bool coChiTietDienNuoc = true)
        {
            var invoice = new HoaDon
            {
                MaHoaDon = maHoaDon,
                MaHopDong = maHopDong,
                Thang = thang,
                Nam = nam,
                HanThanhToan = new DateTime(nam, thang, 15).AddMonths(1),
                TrangThai = "chuaThanhToan"
            };
            if (coChiTietDienNuoc)
            {
                invoice.DanhSachChiTietHoaDon.Add(new ChiTietHoaDon
                {
                    MaHoaDon = maHoaDon,
                    LoaiKhoan = "dien",
                    NoiDung = "Tiền điện",
                    SoLuong = 1,
                    DonGia = 100000m,
                    ThanhTien = 100000m
                });
            }
            else
            {
                invoice.DanhSachChiTietHoaDon.Add(new ChiTietHoaDon
                {
                    MaHoaDon = maHoaDon,
                    LoaiKhoan = "tienPhong",
                    NoiDung = "Tiền phòng",
                    SoLuong = 1,
                    DonGia = 500000m,
                    ThanhTien = 500000m
                });
            }
            return invoice;
        }

        [Fact]
        public async Task Mapping_ThangMoiChuaGhiSo_GiuChiSoCuVaQuayVeChoChotSo()
        {
            using var context = _fixture.CreateDbContext();
            var (phong, _) = await BuildRoomAsync(context, "M01", 1);
            await AddReadingAsync(context, phong.MaPhong, "dien", BillMonth, BillYear, 100, 180);
            await AddReadingAsync(context, phong.MaPhong, "nuoc", BillMonth, BillYear, 10, 14);
            context.HoaDonPhongs.Add(new HoaDonPhong
            {
                MaPhong = phong.MaPhong,
                Thang = BillMonth,
                Nam = BillYear,
                TienDien = 200000m,
                TienNuoc = 48000m,
                TongTien = 248000m,
                SoNguoiChia = 1,
                TienMoiNguoi = 248000m,
                TrangThai = "daChot",
                NgayTao = new DateTime(BillYear, BillMonth, 26)
            });
            // Hóa đơn tháng 9 còn tồn chờ chốt để kiểm tra gợi ý chốt bù.
            context.HoaDonPhongs.Add(new HoaDonPhong
            {
                MaPhong = phong.MaPhong,
                Thang = 9,
                Nam = BillYear,
                TienDien = 100000m,
                TienNuoc = 24000m,
                TongTien = 124000m,
                SoNguoiChia = 1,
                TienMoiNguoi = 124000m,
                TrangThai = "chuaChot",
                NgayTao = new DateTime(BillYear, 9, 26)
            });
            await context.SaveChangesAsync();

            var loaded = await context.Phongs
                .Include(p => p.DanhSachChiSoDienNuoc)
                .Include(p => p.DanhSachHoaDonPhong)
                .SingleAsync(p => p.MaPhong == phong.MaPhong);

            // Sang tháng 11: tháng 10 đã lập hóa đơn nhưng dòng tháng 11 phải reset về chờ chốt số.
            var dto = loaded.ToUtilityItemDto(11, 2026, true, null, new List<string>(), new List<string>());

            Assert.Equal("PENDING", dto.Status);
            Assert.Equal(180m, dto.OldElectric);
            Assert.Null(dto.NewElectric);
            Assert.Null(dto.UsageElectric);
            Assert.Equal(14m, dto.OldWater);
            Assert.Null(dto.NewWater);
            Assert.Null(dto.BillStatus);
            Assert.Null(dto.BillThang);
            Assert.Equal(9, dto.PendingBillThang);
            Assert.Equal(2026, dto.PendingBillNam);
            Assert.Equal(11, dto.PeriodMonth);
            Assert.Equal(2026, dto.PeriodYear);
        }

        [Fact]
        public async Task Mapping_ThangHienTaiDaGhiSo_HienChiSoVaHoaDonCuaDungThang()
        {
            using var context = _fixture.CreateDbContext();
            var (phong, _) = await BuildRoomAsync(context, "M02", 1);
            await AddReadingAsync(context, phong.MaPhong, "dien", 10, 2026, 100, 180);
            await AddReadingAsync(context, phong.MaPhong, "dien", 11, 2026, 180, 250);
            await AddReadingAsync(context, phong.MaPhong, "nuoc", 11, 2026, 14, 20);
            context.HoaDonPhongs.Add(new HoaDonPhong
            {
                MaPhong = phong.MaPhong,
                Thang = 11,
                Nam = 2026,
                TienDien = 175000m,
                TienNuoc = 72000m,
                TongTien = 247000m,
                SoNguoiChia = 1,
                TienMoiNguoi = 247000m,
                TrangThai = "chuaChot",
                NgayTao = new DateTime(2026, 11, 10)
            });
            await context.SaveChangesAsync();

            var loaded = await context.Phongs
                .Include(p => p.DanhSachChiSoDienNuoc)
                .Include(p => p.DanhSachHoaDonPhong)
                .SingleAsync(p => p.MaPhong == phong.MaPhong);

            var dto = loaded.ToUtilityItemDto(11, 2026, true, null, new List<string>(), new List<string>());

            Assert.Equal("RECORDED", dto.Status);
            Assert.Equal(180m, dto.OldElectric);
            Assert.Equal(250m, dto.NewElectric);
            Assert.Equal(70m, dto.UsageElectric);
            Assert.Equal("chuaChot", dto.BillStatus);
            Assert.Equal(11, dto.BillThang);
        }

        [Fact]
        public async Task LockMap_KhoaKhiDaThanhToanHoacCoMinhChungChoXacNhan()
        {
            using var context = _fixture.CreateDbContext();
            var (phong, contracts) = await BuildRoomAsync(context, "L01", 1);
            var invoice = BuildInvoice("HDLL0101", contracts[0].MaHopDong, 11, 2026);
            context.HoaDons.Add(invoice);
            await context.SaveChangesAsync();

            var service = new DienNuocDichVuService(context);

            // Chưa gửi hóa đơn cho sinh viên thì BQL còn sửa được.
            Assert.Null(await service.GetUtilityEditLockReasonAsync(phong.MaPhong, 11, 2026));

            // Đã gửi và sinh viên nộp minh chứng đang chờ xác nhận -> khóa.
            invoice.NgayGui = new DateTime(2026, 11, 5);
            invoice.AnhMinhChung = "proof.jpg";
            await context.SaveChangesAsync();
            Assert.Contains("minh chứng", (await service.GetUtilityEditLockReasonAsync(phong.MaPhong, 11, 2026))!);

            // Minh chứng bị từ chối -> mở khóa để BQL sửa lại số liệu.
            invoice.LyDoTuChoiMinhChung = "Ảnh mờ";
            await context.SaveChangesAsync();
            Assert.Null(await service.GetUtilityEditLockReasonAsync(phong.MaPhong, 11, 2026));

            // Đã thanh toán -> khóa kể cả khi không còn minh chứng.
            invoice.TrangThai = "daThanhToan";
            invoice.AnhMinhChung = null;
            invoice.LyDoTuChoiMinhChung = null;
            await context.SaveChangesAsync();
            Assert.Contains("thanh toán", (await service.GetUtilityEditLockReasonAsync(phong.MaPhong, 11, 2026))!);
        }

        [Fact]
        public async Task LockMap_HoaDonChiTienPhongKhongKhoaChiSoDienNuoc()
        {
            using var context = _fixture.CreateDbContext();
            var (phong, contracts) = await BuildRoomAsync(context, "L02", 1);
            var invoice = BuildInvoice("HDLL0201", contracts[0].MaHopDong, 11, 2026, coChiTietDienNuoc: false);
            invoice.TrangThai = "daThanhToan";
            context.HoaDons.Add(invoice);
            await context.SaveChangesAsync();

            var service = new DienNuocDichVuService(context);
            Assert.Null(await service.GetUtilityEditLockReasonAsync(phong.MaPhong, 11, 2026));
        }

        [Fact]
        public async Task RecordUtility_SauKhiChot_CapNhatHoaDonDaGui_VaKhoaKhiCoMinhChung()
        {
            using var context = _fixture.CreateDbContext();
            var (phong, contracts) = await BuildRoomAsync(context, "L03", 2);
            var service = new DienNuocDichVuService(context);

            Assert.NotNull(await service.RecordUtilityAsync(
                new RecordUtilityDto { RoomId = phong.MaPhong, NewElectric = 100, NewWater = 10, Thang = BillMonth, Nam = BillYear },
                SqlServerFixture.AcademicYear, "NV13"));

            var (finalized, error, _) = await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = phong.MaPhong, SendNow = true },
                SqlServerFixture.AcademicYear, "NV13");
            Assert.True(finalized);
            Assert.Null(error);

            // Chưa ai thanh toán/nộp minh chứng nên được sửa lại chỉ số đã chốt.
            Assert.NotNull(await service.RecordUtilityAsync(
                new RecordUtilityDto { RoomId = phong.MaPhong, NewElectric = 200, NewWater = 20, Thang = BillMonth, Nam = BillYear },
                SqlServerFixture.AcademicYear, "NV13"));

            var contractIds = contracts.Select(c => c.MaHopDong).ToList();
            var invoices = await context.HoaDons
                .Include(h => h.DanhSachChiTietHoaDon)
                .Where(h => contractIds.Contains(h.MaHopDong) && h.Thang == BillMonth && h.Nam == BillYear)
                .ToListAsync();
            Assert.Equal(2, invoices.Count);
            Assert.All(invoices, invoice =>
            {
                // 200 kWh * 2.500 đ / 2 người và 20 m3 * 12.000 đ / 2 người.
                Assert.Equal(250000m, invoice.DanhSachChiTietHoaDon.Single(d => d.LoaiKhoan == "dien").DonGia);
                Assert.Equal(120000m, invoice.DanhSachChiTietHoaDon.Single(d => d.LoaiKhoan == "nuoc").DonGia);
            });

            // Một sinh viên nộp minh chứng -> khóa toàn bộ chỉnh sửa của kỳ.
            invoices[0].AnhMinhChung = "proof.jpg";
            invoices[0].NgayNopMinhChung = DateTime.Now;
            await context.SaveChangesAsync();

            Assert.Null(await service.RecordUtilityAsync(
                new RecordUtilityDto { RoomId = phong.MaPhong, NewElectric = 300, NewWater = 30, Thang = BillMonth, Nam = BillYear },
                SqlServerFixture.AcademicYear, "NV13"));
        }

        [Fact]
        public async Task Finalize_ChiDinhKy_ChotHoaDonTonCuaThangTruoc()
        {
            using var context = _fixture.CreateDbContext();
            var (phong, _) = await BuildRoomAsync(context, "L05", 1);
            context.HoaDonPhongs.AddRange(
                new HoaDonPhong
                {
                    MaPhong = phong.MaPhong,
                    Thang = 10,
                    Nam = 2026,
                    TienDien = 100000m,
                    TienNuoc = 48000m,
                    TongTien = 148000m,
                    SoNguoiChia = 1,
                    TienMoiNguoi = 148000m,
                    TrangThai = "chuaChot",
                    NgayTao = new DateTime(2026, 10, 26)
                },
                new HoaDonPhong
                {
                    MaPhong = phong.MaPhong,
                    Thang = 11,
                    Nam = 2026,
                    TienDien = 200000m,
                    TienNuoc = 60000m,
                    TongTien = 260000m,
                    SoNguoiChia = 1,
                    TienMoiNguoi = 260000m,
                    TrangThai = "chuaChot",
                    NgayTao = new DateTime(2026, 11, 10)
                });
            await context.SaveChangesAsync();

            var service = new DienNuocDichVuService(context);
            var (success, error, data) = await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = phong.MaPhong, SendNow = false, Thang = 10, Nam = 2026 },
                SqlServerFixture.AcademicYear, "NV13");

            Assert.True(success);
            Assert.Null(error);
            Assert.Equal(10, data!.Thang);

            var bills = await context.HoaDonPhongs.Where(b => b.MaPhong == phong.MaPhong).ToListAsync();
            Assert.Equal("daChot", bills.Single(b => b.Thang == 10).TrangThai);
            // Kỳ 11 vẫn còn chờ chốt, không bị chốt lây.
            Assert.Equal("chuaChot", bills.Single(b => b.Thang == 11).TrangThai);
        }

        [Fact]
        public async Task Finalize_KhiCoMinhChungChoXacNhan_KhongChotLai()
        {
            using var context = _fixture.CreateDbContext();
            var (phong, contracts) = await BuildRoomAsync(context, "L04", 1);
            context.HoaDonPhongs.Add(new HoaDonPhong
            {
                MaPhong = phong.MaPhong,
                Thang = BillMonth,
                Nam = BillYear,
                TienDien = 100000m,
                TienNuoc = 48000m,
                TongTien = 148000m,
                SoNguoiChia = 1,
                TienMoiNguoi = 148000m,
                TrangThai = "chuaChot",
                NgayTao = new DateTime(BillYear, BillMonth, 26)
            });
            var existing = BuildInvoice("HDLL0401", contracts[0].MaHopDong, BillMonth, BillYear);
            existing.NgayGui = new DateTime(BillYear, BillMonth, 27);
            existing.AnhMinhChung = "proof.jpg";
            context.HoaDons.Add(existing);
            await context.SaveChangesAsync();

            var service = new DienNuocDichVuService(context);
            var (success, error, data) = await service.FinalizeUtilityBillsAsync(
                new FinalizeUtilityDto { RoomId = phong.MaPhong, SendNow = true },
                SqlServerFixture.AcademicYear, "NV13");

            Assert.False(success);
            Assert.Contains("minh chứng", error!);
            Assert.Null(data);
            Assert.Equal("chuaChot", (await context.HoaDonPhongs.SingleAsync(b => b.MaPhong == phong.MaPhong)).TrangThai);
        }
    }
}
