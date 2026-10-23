using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Features.Accounts.Entities;
using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Maintenance.Entities;
using Dormitory.Web.Features.Payments.Entities;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Staff.Entities;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Features.Violations.Entities;

namespace Dormitory.Web.Data.Seeding
{
    public static class DemoDataSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            // 1. Nhân viên
            if (!await context.NhanViens.AnyAsync())
            {
                var nhanViens = new List<NhanVien>
                {
                    new()
                    {
                        MaNhanVien = "NV01",
                        HoTen = "Nguyễn Văn An",
                        ChucVu = "Trưởng Ban Quản lý KTX",
                        DienThoai = "0903 112 458",
                        Email = "vanan.ktx@utc2.edu.vn",
                        MaToaNhaPhuTrach = "A01",
                        TrangThai = "dangLam"
                    },
                    new()
                    {
                        MaNhanVien = "NV02",
                        HoTen = "Lê Thị Bình",
                        ChucVu = "Kế toán Quản lý Thu chi",
                        DienThoai = "0918 342 990",
                        Email = "thibinh.kt@utc2.edu.vn",
                        MaToaNhaPhuTrach = "B01",
                        TrangThai = "dangLam"
                    },
                    new()
                    {
                        MaNhanVien = "NV03",
                        HoTen = "Nguyễn Hoàng Admin",
                        ChucVu = "Quản trị viên Hệ thống",
                        DienThoai = "028 3896 6780",
                        Email = "admin.portal@utc2.edu.vn",
                        MaToaNhaPhuTrach = null,
                        TrangThai = "dangLam"
                    }
                };
                await context.NhanViens.AddRangeAsync(nhanViens);
                await context.SaveChangesAsync();
            }

            // 2. Lớp học & Sinh viên
            if (!await context.LopHocs.AnyAsync())
            {
                var lopHocs = new List<LopHoc>
                {
                    new() { MaLop = "CNTT01_K64", TenLop = "Công nghệ Thông tin 01", TenKhoa = "CNTT", NienKhoa = 2024 },
                    new() { MaLop = "CNTT02_K64", TenLop = "Công nghệ Thông tin 02", TenKhoa = "CNTT", NienKhoa = 2024 },
                    new() { MaLop = "KTVT02_K64", TenLop = "Kinh tế Vận tải 02", TenKhoa = "Kinh tế vận tải", NienKhoa = 2024 },
                    new() { MaLop = "CKOT01_K63", TenLop = "Cơ khí Ô tô 01", TenKhoa = "Cơ khí", NienKhoa = 2023 },
                    new() { MaLop = "LOG02_K65", TenLop = "Logistics 02", TenKhoa = "Logistics", NienKhoa = 2025 },
                    new() { MaLop = "CTGT01_K62", TenLop = "Công trình Giao thông 01", TenKhoa = "Công trình", NienKhoa = 2022 }
                };
                await context.LopHocs.AddRangeAsync(lopHocs);
                await context.SaveChangesAsync();
            }

            if (!await context.SinhViens.AnyAsync())
            {
                var sinhViens = new List<SinhVien>
                {
                    new()
                    {
                        MaSinhVien = "6451071012",
                        HoTen = "Trần Minh Hoàng",
                        NgaySinh = new DateTime(2004, 5, 14),
                        GioiTinh = "nam",
                        Cccd = "079203001842",
                        DienThoai = "0938 124 991",
                        Email = "minhtr.245108@sinhvien.utc2.edu.vn",
                        DiaChiThuongTru = "Đồng Nai",
                        MaLop = "CNTT01_K64",
                        NamNhapHoc = 2024,
                        DoiTuongUuTien = "Con thương binh",
                        TrangThai = "dangHoc"
                    },
                    new()
                    {
                        MaSinhVien = "6451071088",
                        HoTen = "Lê Ngọc Phương Anh",
                        NgaySinh = new DateTime(2004, 9, 22),
                        GioiTinh = "nu",
                        Cccd = "075302008914",
                        DienThoai = "0912 455 832",
                        Email = "phuonganh.le@sinhvien.utc2.edu.vn",
                        DiaChiThuongTru = "Bình Định",
                        MaLop = "KTVT02_K64",
                        NamNhapHoc = 2024,
                        DoiTuongUuTien = "Vùng sâu KV1",
                        TrangThai = "dangHoc"
                    },
                    new()
                    {
                        MaSinhVien = "6351020045",
                        HoTen = "Võ Đăng Khôi",
                        NgaySinh = new DateTime(2003, 2, 8),
                        GioiTinh = "nam",
                        Cccd = "082201007731",
                        DienThoai = "0978 903 211",
                        Email = "dangkhoi.vo@sinhvien.utc2.edu.vn",
                        DiaChiThuongTru = "Lâm Đồng",
                        MaLop = "CKOT01_K63",
                        NamNhapHoc = 2023,
                        DoiTuongUuTien = null,
                        TrangThai = "dangHoc"
                    },
                    new()
                    {
                        MaSinhVien = "6551080319",
                        HoTen = "Đinh Gia Huy",
                        NgaySinh = new DateTime(2005, 11, 19),
                        GioiTinh = "nam",
                        Cccd = "074204005118",
                        DienThoai = "0865 332 910",
                        Email = "giahuy.dinh@sinhvien.utc2.edu.vn",
                        DiaChiThuongTru = "Khánh Hòa",
                        MaLop = "LOG02_K65",
                        NamNhapHoc = 2025,
                        DoiTuongUuTien = "Khoảng cách > 350km",
                        TrangThai = "dangHoc"
                    },
                    new()
                    {
                        MaSinhVien = "6451071064",
                        HoTen = "Nguyễn Thảo Nguyên",
                        NgaySinh = new DateTime(2004, 8, 30),
                        GioiTinh = "nu",
                        Cccd = "072303004492",
                        DienThoai = "0908 671 223",
                        Email = "thaonguyen.ng@sinhvien.utc2.edu.vn",
                        DiaChiThuongTru = "Tây Ninh",
                        MaLop = "CNTT02_K64",
                        NamNhapHoc = 2024,
                        DoiTuongUuTien = null,
                        TrangThai = "dangHoc"
                    },
                    new()
                    {
                        MaSinhVien = "6251010023",
                        HoTen = "Phan Quốc Bảo",
                        NgaySinh = new DateTime(2002, 4, 11),
                        GioiTinh = "nam",
                        Cccd = "077200009825",
                        DienThoai = "0944 881 726",
                        Email = "quocbao.phan@sinhvien.utc2.edu.vn",
                        DiaChiThuongTru = "Bà Rịa - Vũng Tàu",
                        MaLop = "CTGT01_K62",
                        NamNhapHoc = 2022,
                        DoiTuongUuTien = null,
                        TrangThai = "dangHoc"
                    }
                };
                await context.SinhViens.AddRangeAsync(sinhViens);
                await context.SaveChangesAsync();
            }

            // 3. Tài khoản đăng nhập (Hỗ trợ 4 vai trò demo)
            if (!await context.TaiKhoans.AnyAsync())
            {
                var taiKhoans = new List<TaiKhoan>
                {
                    new()
                    {
                        TenDangNhap = "ql_an",
                        MatKhauHash = "quanly123",
                        MaVaiTro = "quanLy",
                        MaNhanVien = "NV01",
                        LaDangHoat = true,
                        LanDangNhapCuoi = DateTime.Now
                    },
                    new()
                    {
                        TenDangNhap = "kt_binh",
                        MatKhauHash = "ketoan123",
                        MaVaiTro = "keToan",
                        MaNhanVien = "NV02",
                        LaDangHoat = true,
                        LanDangNhapCuoi = DateTime.Now
                    },
                    new()
                    {
                        TenDangNhap = "admin",
                        MatKhauHash = "admin123",
                        MaVaiTro = "admin",
                        MaNhanVien = "NV03",
                        LaDangHoat = true,
                        LanDangNhapCuoi = DateTime.Now
                    },
                    new()
                    {
                        TenDangNhap = "sv_minh",
                        MatKhauHash = "sinhvien123",
                        MaVaiTro = "sinhVien",
                        MaSinhVien = "6451071012",
                        LaDangHoat = true,
                        LanDangNhapCuoi = DateTime.Now
                    }
                };
                await context.TaiKhoans.AddRangeAsync(taiKhoans);
                await context.SaveChangesAsync();
            }

            // 4. Đợt đăng ký & Đơn đăng ký
            if (!await context.DotDangKys.AnyAsync())
            {
                var dot1 = new DotDangKy
                {
                    MaDotDangKy = "DOT_K65_2026",
                    TenDot = "Đợt xét tuyển KTX Tân sinh viên Khóa 65",
                    MaKyHoc = "HK1_2026_2027",
                    NgayMo = new DateTime(2026, 8, 15),
                    NgayDong = new DateTime(2026, 9, 30)
                };
                await context.DotDangKys.AddAsync(dot1);
                await context.SaveChangesAsync();

                var donDangKys = new List<DonDangKy>
                {
                    new()
                    {
                        MaDonDangKy = "DK-65089",
                        MaSinhVien = "6551080319",
                        MaDotDangKy = "DOT_K65_2026",
                        MaLoaiPhong = "LP_TC_NAM",
                        NgayDangKy = DateTime.Now.AddHours(-3),
                        TrangThai = "choDuyet",
                        GhiChu = "Diện: Hộ nghèo (Khu vực 1), Điểm xét: 9.5"
                    },
                    new()
                    {
                        MaDonDangKy = "DK-65090",
                        MaSinhVien = "6451071088",
                        MaDotDangKy = "DOT_K65_2026",
                        MaLoaiPhong = "LP_TC_NU",
                        NgayDangKy = DateTime.Now.AddHours(-2),
                        TrangThai = "choDuyet",
                        GhiChu = "Diện: Gia đình chính sách, Điểm xét: 9.0"
                    }
                };
                await context.DonDangKys.AddRangeAsync(donDangKys);
                await context.SaveChangesAsync();
            }

            // 5. Hợp đồng
            if (!await context.HopDongs.AnyAsync())
            {
                var hopDongs = new List<HopDong>
                {
                    new()
                    {
                        MaHopDong = "HD-2026-A101-01",
                        MaSinhVien = "6451071012",
                        MaGiuong = "A01_A101_G1",
                        MaKyHoc = "HK1_2026_2027",
                        NgayBatDau = new DateTime(2026, 9, 1),
                        NgayKetThuc = new DateTime(2027, 6, 30),
                        NgayNhanPhongThucTe = new DateTime(2026, 9, 1),
                        GiaThueThang = 500000,
                        TienCoc = 500000,
                        TrangThai = "hieuLuc",
                        MaNhanVienLap = "NV01"
                    },
                    new()
                    {
                        MaHopDong = "HD-2026-B205-04",
                        MaSinhVien = "6451071088",
                        MaGiuong = "B02_B201_G1",
                        MaKyHoc = "HK1_2026_2027",
                        NgayBatDau = new DateTime(2026, 9, 1),
                        NgayKetThuc = DateTime.Today.AddDays(10),
                        NgayNhanPhongThucTe = new DateTime(2026, 9, 1),
                        GiaThueThang = 500000,
                        TienCoc = 500000,
                        TrangThai = "hieuLuc",
                        MaNhanVienLap = "NV01"
                    },
                    new()
                    {
                        MaHopDong = "HD-2025-C102-01",
                        MaSinhVien = "6251010023",
                        MaGiuong = "C01_C101_G1",
                        MaKyHoc = "HK1_2026_2027",
                        NgayBatDau = new DateTime(2025, 9, 1),
                        NgayKetThuc = new DateTime(2026, 1, 15),
                        NgayNhanPhongThucTe = new DateTime(2025, 9, 1),
                        NgayTraPhongThucTe = new DateTime(2026, 1, 15),
                        GiaThueThang = 700000,
                        TienCoc = 700000,
                        TrangThai = "daKetThuc",
                        NgayThanhLy = new DateTime(2026, 1, 15),
                        GhiChu = "Hết hạn học kỳ và tất toán trả phòng",
                        MaNhanVienLap = "NV01"
                    }
                };
                await context.HopDongs.AddRangeAsync(hopDongs);
                await context.SaveChangesAsync();
            }

            // 6. Hóa đơn tháng mẫu & Thanh toán
            if (!await context.HoaDons.AnyAsync())
            {
                var hd = new HoaDon
                {
                    MaHoaDon = "HD-T10-2026-001",
                    MaHopDong = "HD-2026-A101-01",
                    Thang = 10,
                    Nam = 2026,
                    NgayLap = new DateTime(2026, 10, 1),
                    HanThanhToan = new DateTime(2026, 10, 15),
                    TrangThai = "daThanhToan"
                };
                await context.HoaDons.AddAsync(hd);
                await context.SaveChangesAsync();

                var cthd = new List<ChiTietHoaDon>
                {
                    new() { MaHoaDon = hd.MaHoaDon, LoaiKhoan = "tienPhong", NoiDung = "Tiền phòng KTX tháng 10/2026", SoLuong = 1, DonGia = 500000, ThanhTien = 500000 },
                    new() { MaHoaDon = hd.MaHoaDon, LoaiKhoan = "dien", NoiDung = "Điện chia đầu người (30 kWh)", SoLuong = 30, DonGia = 2500, ThanhTien = 75000 },
                    new() { MaHoaDon = hd.MaHoaDon, LoaiKhoan = "nuoc", NoiDung = "Nước chia đầu người (4 m3)", SoLuong = 4, DonGia = 12000, ThanhTien = 48000 }
                };
                await context.ChiTietHoaDons.AddRangeAsync(cthd);

                var tt = new ThanhToan
                {
                    MaThanhToan = "TT-20261005-01",
                    MaHoaDon = hd.MaHoaDon,
                    SoTien = 623000,
                    NgayThanhToan = new DateTime(2026, 10, 5),
                    PhuongThuc = "chuyenKhoan",
                    MaNhanVienThu = "NV02",
                    GhiChu = "Chuyển khoản qua cổng ngân hàng VietinBank"
                };
                await context.ThanhToans.AddAsync(tt);
                await context.SaveChangesAsync();
            }

            // 7. Yêu cầu sửa chữa
            if (!await context.YeuCauSuaChuas.AnyAsync())
            {
                var p = await context.Phongs.FirstOrDefaultAsync();
                if (p != null)
                {
                    var yc = new YeuCauSuaChua
                    {
                        MaPhong = p.MaPhong,
                        MaSinhVienGui = "6451071012",
                        MoTa = "Rò rỉ vòi nước bồn rửa tầng 3 phòng A302",
                        NgayGui = DateTime.Now.AddHours(-1),
                        TrangThai = "moiGui"
                    };
                    await context.YeuCauSuaChuas.AddAsync(yc);
                    await context.SaveChangesAsync();
                }
            }
        }
    }
}
