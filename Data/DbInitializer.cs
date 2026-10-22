using Microsoft.EntityFrameworkCore;
using Quan_ly_Ky_tuc_xa.Models.Entities;

namespace Quan_ly_Ky_tuc_xa.Data
{
    public static class DbInitializer
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            await context.Database.EnsureCreatedAsync();

            // 1. Vai trò
            if (!await context.VaiTros.AnyAsync())
            {
                var vaiTros = new List<VaiTro>
                {
                    new() { MaVaiTro = "admin", TenVaiTro = "Quản trị viên" },
                    new() { MaVaiTro = "quanLy", TenVaiTro = "Quản lý KTX" },
                    new() { MaVaiTro = "keToan", TenVaiTro = "Kế toán" },
                    new() { MaVaiTro = "sinhVien", TenVaiTro = "Sinh viên" }
                };
                await context.VaiTros.AddRangeAsync(vaiTros);
                await context.SaveChangesAsync();
            }

            // 2. Năm học & Kỳ học
            if (!await context.NamHocs.AnyAsync())
            {
                var namHoc = new NamHoc
                {
                    MaNamHoc = "NH2026-2027",
                    NgayBatDau = new DateTime(2026, 9, 1),
                    NgayKetThuc = new DateTime(2027, 6, 30),
                    LaDangHoat = true
                };
                await context.NamHocs.AddAsync(namHoc);
                await context.SaveChangesAsync();

                var kyHoc1 = new KyHoc
                {
                    MaKyHoc = "HK1_2026_2027",
                    MaNamHoc = "NH2026-2027",
                    TenKyHoc = "Học kỳ 1",
                    NgayBatDau = new DateTime(2026, 9, 1),
                    NgayKetThuc = new DateTime(2027, 1, 15)
                };
                var kyHoc2 = new KyHoc
                {
                    MaKyHoc = "HK2_2026_2027",
                    MaNamHoc = "NH2026-2027",
                    TenKyHoc = "Học kỳ 2",
                    NgayBatDau = new DateTime(2027, 1, 16),
                    NgayKetThuc = new DateTime(2027, 6, 30)
                };
                await context.KyHocs.AddRangeAsync(kyHoc1, kyHoc2);
                await context.SaveChangesAsync();
            }

            // 3. Tòa nhà
            if (!await context.ToaNhas.AnyAsync())
            {
                var toaNhas = new List<ToaNha>
                {
                    new() { MaToaNha = "A01", TenToaNha = "Tòa A01 (Nam sinh)", SoTang = 4, GioiTinhQuyDinh = "nam", TrangThai = "hoatDong" },
                    new() { MaToaNha = "A02", TenToaNha = "Tòa A02 (Nam sinh)", SoTang = 4, GioiTinhQuyDinh = "nam", TrangThai = "hoatDong" },
                    new() { MaToaNha = "A03", TenToaNha = "Tòa A03 (Nam sinh)", SoTang = 4, GioiTinhQuyDinh = "nam", TrangThai = "hoatDong" },
                    new() { MaToaNha = "B01", TenToaNha = "Tòa B01 (Nữ sinh)", SoTang = 4, GioiTinhQuyDinh = "nu", TrangThai = "hoatDong" },
                    new() { MaToaNha = "B02", TenToaNha = "Tòa B02 (Nữ sinh)", SoTang = 4, GioiTinhQuyDinh = "nu", TrangThai = "hoatDong" },
                    new() { MaToaNha = "C01", TenToaNha = "Tòa C01 (Chất lượng cao)", SoTang = 3, GioiTinhQuyDinh = "nam", TrangThai = "hoatDong" }
                };
                await context.ToaNhas.AddRangeAsync(toaNhas);
                await context.SaveChangesAsync();
            }

            // 4. Loại phòng
            if (!await context.LoaiPhongs.AnyAsync())
            {
                var loaiPhongs = new List<LoaiPhong>
                {
                    new() { MaLoaiPhong = "LP_TC_NAM", TenLoaiPhong = "Tiêu chuẩn Nam 8 chỗ", SoNguoiToiDa = 8, GiaThueThang = 500000, CoDieuHoa = false, CoNhaVeSinhRieng = true },
                    new() { MaLoaiPhong = "LP_TC_NU", TenLoaiPhong = "Tiêu chuẩn Nữ 8 chỗ", SoNguoiToiDa = 8, GiaThueThang = 500000, CoDieuHoa = false, CoNhaVeSinhRieng = true },
                    new() { MaLoaiPhong = "LP_CLC", TenLoaiPhong = "Chất lượng cao có máy lạnh", SoNguoiToiDa = 8, GiaThueThang = 700000, CoDieuHoa = true, CoNhaVeSinhRieng = true }
                };
                await context.LoaiPhongs.AddRangeAsync(loaiPhongs);
                await context.SaveChangesAsync();
            }

            // 5. Phòng & Giường (Tạo 48 phòng và 384 giường tương thích với demo)
            if (!await context.Phongs.AnyAsync())
            {
                var buildings = new[]
                {
                    new { Id = "A01", Floors = 4, RoomsPerFloor = 4, Loai = "LP_TC_NAM" },
                    new { Id = "A02", Floors = 4, RoomsPerFloor = 3, Loai = "LP_TC_NAM" },
                    new { Id = "B01", Floors = 4, RoomsPerFloor = 3, Loai = "LP_TC_NU" },
                    new { Id = "B02", Floors = 4, RoomsPerFloor = 3, Loai = "LP_TC_NU" },
                    new { Id = "C01", Floors = 3, RoomsPerFloor = 3, Loai = "LP_CLC" }
                };

                int roomIndex = 0;
                var phongList = new List<Phong>();
                var giuongList = new List<Giuong>();

                foreach (var b in buildings)
                {
                    for (int f = 1; f <= b.Floors; f++)
                    {
                        for (int r = 1; r <= b.RoomsPerFloor; r++)
                        {
                            roomIndex++;
                            string roomNum = $"{b.Id[0]}{f}0{r}";
                            string maPhong = $"{b.Id}_{roomNum}";

                            bool isMaintenance = (roomIndex == 12);

                            var p = new Phong
                            {
                                MaPhong = maPhong,
                                MaToaNha = b.Id,
                                MaLoaiPhong = b.Loai,
                                SoTang = f,
                                TrangThai = isMaintenance ? "baoTri" : "hoatDong"
                            };
                            phongList.Add(p);

                            for (int g = 1; g <= 8; g++)
                            {
                                giuongList.Add(new Giuong
                                {
                                    MaGiuong = $"{maPhong}_G{g}",
                                    MaPhong = maPhong,
                                    SoThuTu = g,
                                    LaDangHoat = !(isMaintenance && g <= 4)
                                });
                            }
                        }
                    }
                }

                await context.Phongs.AddRangeAsync(phongList);
                await context.Giuongs.AddRangeAsync(giuongList);
                await context.SaveChangesAsync();
            }

            // 6. Nhân viên
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

            // 7. Lớp học & Sinh viên
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

            // 8. Tài khoản đăng nhập (Hỗ trợ 4 vai trò demo)
            if (!await context.TaiKhoans.AnyAsync())
            {
                var taiKhoans = new List<TaiKhoan>
                {
                    new()
                    {
                        TenDangNhap = "ql_an",
                        MatKhauHash = "quanly123", // Password đơn giản cho demo
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

            // 9. Đợt đăng ký & Đơn đăng ký tuyển sinh
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

            // 10. Hợp đồng cư xá
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
                        NgayKetThuc = DateTime.Today.AddDays(10), // Sắp hết hạn 10 ngày
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
                        LyDoThanhLy = "Hết hạn học kỳ và tất toán trả phòng",
                        MaNhanVienLap = "NV01"
                    }
                };
                await context.HopDongs.AddRangeAsync(hopDongs);
                await context.SaveChangesAsync();
            }

            // 11. Dịch vụ & Giá điện nước
            if (!await context.GiaDienNuocs.AnyAsync())
            {
                var giaList = new List<GiaDienNuoc>
                {
                    new() { MaGia = "GIA_DIEN_2026", Loai = "dien", Gia = 2500, NgayApDung = new DateTime(2026, 1, 1) },
                    new() { MaGia = "GIA_NUOC_2026", Loai = "nuoc", Gia = 12000, NgayApDung = new DateTime(2026, 1, 1) }
                };
                await context.GiaDienNuocs.AddRangeAsync(giaList);
                await context.SaveChangesAsync();
            }

            if (!await context.DichVus.AnyAsync())
            {
                var dichVus = new List<DichVu>
                {
                    new() { MaDichVu = "DV_INTERNET", TenDichVu = "Wifi Tốc độ cao", DonViTinh = "thang", DonGia = 50000, LaDangHoat = true },
                    new() { MaDichVu = "DV_GUIXE", TenDichVu = "Gửi xe máy nội trú", DonViTinh = "thang", DonGia = 70000, LaDangHoat = true },
                    new() { MaDichVu = "DV_GIATLA", TenDichVu = "Gói giặt sấy tự động", DonViTinh = "thang", DonGia = 80000, LaDangHoat = true }
                };
                await context.DichVus.AddRangeAsync(dichVus);
                await context.SaveChangesAsync();
            }

            // 12. Hóa đơn tháng mẫu
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
                    new() { MaHoaDon = hd.MaHoaDon, LoaiKhoan = "tienPhong", DienGiai = "Tiền phòng KTX tháng 10/2026", SoLuong = 1, DonGia = 500000 },
                    new() { MaHoaDon = hd.MaHoaDon, LoaiKhoan = "dien", DienGiai = "Điện chia đầu người (30 kWh)", SoLuong = 30, DonGia = 2500 },
                    new() { MaHoaDon = hd.MaHoaDon, LoaiKhoan = "nuoc", DienGiai = "Nước chia đầu người (4 m3)", SoLuong = 4, DonGia = 12000 }
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

            // 13. Yêu cầu sửa chữa & Vi phạm
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

            if (!await context.LoaiViPhams.AnyAsync())
            {
                var vp = new LoaiViPham
                {
                    MaLoaiViPham = "VP_BEPDIEN",
                    TenLoaiViPham = "Sử dụng thiết bị nhiệt / bếp điện trái phép",
                    MucDo = "trungBinh",
                    TienPhat = 200000
                };
                await context.LoaiViPhams.AddAsync(vp);
                await context.SaveChangesAsync();
            }
        }
    }
}

