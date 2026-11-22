using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Features.Accounts.Entities;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Maintenance.Entities;
using Dormitory.Web.Features.Payments.Entities;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Staff.Entities;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Features.Utilities.Entities;
using Dormitory.Web.Features.Violations.Entities;

namespace Dormitory.Web.Data.Seeding
{
    public static class DemoDataSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            var passwordHasher = new PasswordHasher();

            // 1. Nhân viên (20 nhân viên)
            if (await context.NhanViens.CountAsync() < 20)
            {
                var existingStaffIds = await context.NhanViens.Select(n => n.MaNhanVien).ToHashSetAsync();
                var nhanViens = new List<NhanVien>
                {
                    new() { MaNhanVien = "NV01", HoTen = "Nguyễn Văn An", ChucVu = "Trưởng Ban Giám thị KTX", DienThoai = "0903 112 458", Email = "vanan.ktx@utc2.edu.vn", MaToaNhaPhuTrach = "A01", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV02", HoTen = "Lê Thị Bình", ChucVu = "Kế toán Quản lý Thu chi", DienThoai = "0918 342 990", Email = "thibinh.kt@utc2.edu.vn", MaToaNhaPhuTrach = "B01", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV03", HoTen = "Nguyễn Hoàng Admin", ChucVu = "Quản trị viên Hệ thống", DienThoai = "028 3896 6780", Email = "admin.portal@utc2.edu.vn", MaToaNhaPhuTrach = null, TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV04", HoTen = "Trần Quốc Tuấn", ChucVu = "Kỹ thuật viên Điện nước", DienThoai = "0933 554 112", Email = "quoctuan.kt@utc2.edu.vn", MaToaNhaPhuTrach = "A02", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV05", HoTen = "Hoàng Minh Tâm", ChucVu = "Cán bộ An ninh KTX", DienThoai = "0977 889 001", Email = "minhtam.an@utc2.edu.vn", MaToaNhaPhuTrach = "C01", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV06", HoTen = "Phạm Thu Trang", ChucVu = "Giám thị Tòa B01", DienThoai = "0988 776 655", Email = "thutrang.ql@utc2.edu.vn", MaToaNhaPhuTrach = "B01", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV07", HoTen = "Đặng Hữu Phước", ChucVu = "Giám thị Tòa A02", DienThoai = "0909 221 334", Email = "huuphuoc.gt@utc2.edu.vn", MaToaNhaPhuTrach = "A02", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV08", HoTen = "Vũ Thị Ngọc Mai", ChucVu = "Giám thị Tòa B02", DienThoai = "0914 556 778", Email = "ngocmai.gt@utc2.edu.vn", MaToaNhaPhuTrach = "B02", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV09", HoTen = "Bùi Văn Hùng", ChucVu = "Kỹ thuật viên Điện lạnh", DienThoai = "0938 667 889", Email = "vanhung.kt@utc2.edu.vn", MaToaNhaPhuTrach = "C01", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV10", HoTen = "Ngô Thị Thanh Thảo", ChucVu = "Kế toán Thu ngân", DienThoai = "0945 112 233", Email = "thanhthao.tc@utc2.edu.vn", MaToaNhaPhuTrach = "A01", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV11", HoTen = "Lý Minh Đức", ChucVu = "Bảo vệ Ca trưởng", DienThoai = "0962 334 455", Email = "minhduc.bv@utc2.edu.vn", MaToaNhaPhuTrach = "A01", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV12", HoTen = "Trương Văn Kiệt", ChucVu = "Kỹ thuật viên Cấp thoát nước", DienThoai = "0971 445 566", Email = "vankiet.kt@utc2.edu.vn", MaToaNhaPhuTrach = "B02", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV13", HoTen = "Phan Thị Kim Ngân", ChucVu = "Chuyên viên Thu chi & Hóa đơn", DienThoai = "0983 556 677", Email = "kimngan.tc@utc2.edu.vn", MaToaNhaPhuTrach = "B01", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV14", HoTen = "Đỗ Quang Huy", ChucVu = "Giám thị Tòa A03", DienThoai = "0905 667 788", Email = "quanghuy.gt@utc2.edu.vn", MaToaNhaPhuTrach = "A03", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV15", HoTen = "Hồ Văn Phúc", ChucVu = "Bảo vệ Trực cổng chính", DienThoai = "0919 778 899", Email = "vanphuc.bv@utc2.edu.vn", MaToaNhaPhuTrach = "A02", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV16", HoTen = "Dương Thị Mỹ Linh", ChucVu = "Giám thị Quản sinh Nữ", DienThoai = "0932 889 900", Email = "mylinh.gt@utc2.edu.vn", MaToaNhaPhuTrach = "B02", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV17", HoTen = "Cao Xuân Trường", ChucVu = "Kỹ sư Vận hành tòa nhà", DienThoai = "0948 990 011", Email = "xuantruong.kt@utc2.edu.vn", MaToaNhaPhuTrach = "C01", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV18", HoTen = "Lâm Quốc Cường", ChucVu = "An ninh Tuần tra đêm", DienThoai = "0966 101 112", Email = "quoccuong.an@utc2.edu.vn", MaToaNhaPhuTrach = "A03", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV19", HoTen = "Mai Thị Hồng Nhung", ChucVu = "Kế toán Tổng hợp KTX", DienThoai = "0975 212 223", Email = "hongnhung.kt@utc2.edu.vn", MaToaNhaPhuTrach = "C01", TrangThai = "dangLam" },
                    new() { MaNhanVien = "NV20", HoTen = "Tạ Minh Khang", ChucVu = "Kỹ thuật viên Mạng & Thiết bị", DienThoai = "0989 323 334", Email = "minhkhang.kt@utc2.edu.vn", MaToaNhaPhuTrach = "A01", TrangThai = "dangLam" }
                };

                var newStaff = nhanViens.Where(n => !existingStaffIds.Contains(n.MaNhanVien)).ToList();
                if (newStaff.Count > 0)
                {
                    await context.NhanViens.AddRangeAsync(newStaff);
                    await context.SaveChangesAsync();
                }
            }

            // 2. Lớp học (20 lớp thuộc các khoa của UTC2)
            if (await context.LopHocs.CountAsync() < 20)
            {
                var existingClassIds = await context.LopHocs.Select(l => l.MaLop).ToHashSetAsync();
                var lopHocs = new List<LopHoc>
                {
                    new() { MaLop = "CNTT01_K64", TenLop = "Công nghệ Thông tin 01 - K64", TenKhoa = "Công nghệ thông tin", NienKhoa = 2023 },
                    new() { MaLop = "CNTT02_K64", TenLop = "Công nghệ Thông tin 02 - K64", TenKhoa = "Công nghệ thông tin", NienKhoa = 2023 },
                    new() { MaLop = "CNTT01_K65", TenLop = "Công nghệ Thông tin 01 - K65", TenKhoa = "Công nghệ thông tin", NienKhoa = 2024 },
                    new() { MaLop = "CNTT02_K65", TenLop = "Kỹ thuật Phần mềm 02 - K65", TenKhoa = "Công nghệ thông tin", NienKhoa = 2024 },
                    new() { MaLop = "CNTT01_K66", TenLop = "Công nghệ Thông tin 01 - K66", TenKhoa = "Công nghệ thông tin", NienKhoa = 2025 },
                    new() { MaLop = "CNTT02_K66", TenLop = "Hệ thống Thông tin 02 - K66", TenKhoa = "Công nghệ thông tin", NienKhoa = 2025 },
                    new() { MaLop = "CNTT01_K67", TenLop = "Trí tuệ Nhân tạo 01 - K67", TenKhoa = "Công nghệ thông tin", NienKhoa = 2026 },
                    new() { MaLop = "KTVT01_K64", TenLop = "Kinh tế Vận tải 01 - K64", TenKhoa = "Kinh tế vận tải", NienKhoa = 2023 },
                    new() { MaLop = "KTVT02_K64", TenLop = "Kinh tế Vận tải 02 - K64", TenKhoa = "Kinh tế vận tải", NienKhoa = 2023 },
                    new() { MaLop = "LOG01_K65", TenLop = "Logistics & Chuỗi cung ứng 01 - K65", TenKhoa = "Kinh tế vận tải", NienKhoa = 2024 },
                    new() { MaLop = "LOG02_K65", TenLop = "Logistics & Chuỗi cung ứng 02 - K65", TenKhoa = "Kinh tế vận tải", NienKhoa = 2024 },
                    new() { MaLop = "LOG01_K66", TenLop = "Quản trị Logistics 01 - K66", TenKhoa = "Kinh tế vận tải", NienKhoa = 2025 },
                    new() { MaLop = "KTVT01_K67", TenLop = "Kinh tế Vận tải Biển 01 - K67", TenKhoa = "Kinh tế vận tải", NienKhoa = 2026 },
                    new() { MaLop = "CKOT01_K63", TenLop = "Cơ khí Ô tô 01 - K63", TenKhoa = "Cơ khí", NienKhoa = 2022 },
                    new() { MaLop = "CKOT02_K64", TenLop = "Kỹ thuật Cơ khí Ô tô 02 - K64", TenKhoa = "Cơ khí", NienKhoa = 2023 },
                    new() { MaLop = "CKDL01_K65", TenLop = "Cơ khí Động lực 01 - K65", TenKhoa = "Cơ khí", NienKhoa = 2024 },
                    new() { MaLop = "CKCD01_K66", TenLop = "Cơ điện tử 01 - K66", TenKhoa = "Cơ khí", NienKhoa = 2025 },
                    new() { MaLop = "CTGT01_K62", TenLop = "Công trình Giao thông 01 - K62", TenKhoa = "Công trình", NienKhoa = 2021 },
                    new() { MaLop = "KTXD01_K65", TenLop = "Kỹ thuật Xây dựng Cầu đường 01 - K65", TenKhoa = "Kỹ thuật xây dựng", NienKhoa = 2024 },
                    new() { MaLop = "DTVT01_K66", TenLop = "Kỹ thuật Điện - Điện tử 01 - K66", TenKhoa = "Điện - Điện tử", NienKhoa = 2025 }
                };

                var newClasses = lopHocs.Where(l => !existingClassIds.Contains(l.MaLop)).ToList();
                if (newClasses.Count > 0)
                {
                    await context.LopHocs.AddRangeAsync(newClasses);
                    await context.SaveChangesAsync();
                }
            }

            // 3. Sinh viên (28 sinh viên trải đều 20 lớp học)
            if (await context.SinhViens.CountAsync() < 28)
            {
                var existingStudentIds = await context.SinhViens.Select(s => s.MaSinhVien).ToHashSetAsync();
                var sinhViens = new List<SinhVien>
                {
                    new() { MaSinhVien = "6451071012", HoTen = "Trần Minh Hoàng", NgaySinh = new DateTime(2005, 5, 14), GioiTinh = "nam", Cccd = "079205001842", DienThoai = "0938 124 991", Email = "minhtr.245108@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Biên Hòa, Đồng Nai", MaLop = "CNTT01_K64", NamNhapHoc = 2023, DoiTuongUuTien = "Con thương binh", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6451071088", HoTen = "Lê Ngọc Phương Anh", NgaySinh = new DateTime(2005, 9, 22), GioiTinh = "nu", Cccd = "052305008914", DienThoai = "0912 455 832", Email = "phuonganh.le@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Quy Nhơn, Bình Định", MaLop = "KTVT02_K64", NamNhapHoc = 2023, DoiTuongUuTien = "Vùng sâu KV1", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6351020045", HoTen = "Võ Đăng Khôi", NgaySinh = new DateTime(2004, 2, 8), GioiTinh = "nam", Cccd = "068204007731", DienThoai = "0978 903 211", Email = "dangkhoi.vo@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Đà Lạt, Lâm Đồng", MaLop = "CKOT01_K63", NamNhapHoc = 2022, DoiTuongUuTien = null, TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6551080319", HoTen = "Đinh Gia Huy", NgaySinh = new DateTime(2006, 11, 19), GioiTinh = "nam", Cccd = "056206005118", DienThoai = "0865 332 910", Email = "giahuy.dinh@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Nha Trang, Khánh Hòa", MaLop = "LOG02_K65", NamNhapHoc = 2024, DoiTuongUuTien = "Khoảng cách > 350km", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6451071064", HoTen = "Nguyễn Thảo Nguyên", NgaySinh = new DateTime(2005, 8, 30), GioiTinh = "nu", Cccd = "072305004492", DienThoai = "0908 671 223", Email = "thaonguyen.ng@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Tây Ninh", MaLop = "CNTT02_K64", NamNhapHoc = 2023, DoiTuongUuTien = null, TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6251010023", HoTen = "Phan Quốc Bảo", NgaySinh = new DateTime(2003, 4, 11), GioiTinh = "nam", Cccd = "077203009825", DienThoai = "0944 881 726", Email = "quocbao.phan@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Bà Rịa - Vũng Tàu", MaLop = "CTGT01_K62", NamNhapHoc = 2021, DoiTuongUuTien = null, TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6551071001", HoTen = "Nguyễn Tuấn Kiệt", NgaySinh = new DateTime(2006, 3, 15), GioiTinh = "nam", Cccd = "079206001001", DienThoai = "0901 234 501", Email = "tuankiet.65@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Long Khánh, Đồng Nai", MaLop = "CNTT01_K65", NamNhapHoc = 2024, DoiTuongUuTien = "Hộ cận nghèo", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6551071002", HoTen = "Phạm Hoàng Khang", NgaySinh = new DateTime(2006, 7, 20), GioiTinh = "nam", Cccd = "079206001002", DienThoai = "0901 234 502", Email = "hoangkhang.65@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Thuận An, Bình Dương", MaLop = "CNTT02_K65", NamNhapHoc = 2024, DoiTuongUuTien = null, TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6651071003", HoTen = "Hoàng Đức Anh", NgaySinh = new DateTime(2007, 1, 10), GioiTinh = "nam", Cccd = "066207001003", DienThoai = "0901 234 503", Email = "ducanh.66@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Buôn Ma Thuột, Đắk Lắk", MaLop = "CNTT01_K66", NamNhapHoc = 2025, DoiTuongUuTien = "Vùng sâu KV1", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6651071004", HoTen = "Đỗ Minh Quân", NgaySinh = new DateTime(2007, 4, 25), GioiTinh = "nam", Cccd = "060207001004", DienThoai = "0901 234 504", Email = "minhquan.66@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Phan Thiết, Bình Thuận", MaLop = "CNTT02_K66", NamNhapHoc = 2025, DoiTuongUuTien = null, TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6751071005", HoTen = "Lý Gia Bảo", NgaySinh = new DateTime(2008, 6, 12), GioiTinh = "nam", Cccd = "058208001005", DienThoai = "0901 234 505", Email = "giabao.67@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Phan Rang, Ninh Thuận", MaLop = "CNTT01_K67", NamNhapHoc = 2026, DoiTuongUuTien = "Tân sinh viên K67", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6451041006", HoTen = "Trịnh Quốc Huy", NgaySinh = new DateTime(2005, 10, 5), GioiTinh = "nam", Cccd = "082205001006", DienThoai = "0901 234 506", Email = "quochuy.64@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Mỹ Tho, Tiền Giang", MaLop = "KTVT01_K64", NamNhapHoc = 2023, DoiTuongUuTien = null, TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6551081007", HoTen = "Bùi Thanh Tùng", NgaySinh = new DateTime(2006, 12, 18), GioiTinh = "nam", Cccd = "083206001007", DienThoai = "0901 234 507", Email = "thanhtung.65@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Bến Tre", MaLop = "LOG01_K65", NamNhapHoc = 2024, DoiTuongUuTien = "Con thương binh", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6651081008", HoTen = "Đặng Tuấn Phát", NgaySinh = new DateTime(2007, 8, 9), GioiTinh = "nam", Cccd = "064207001008", DienThoai = "0901 234 508", Email = "tuanphat.66@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Pleiku, Gia Lai", MaLop = "LOG01_K66", NamNhapHoc = 2025, DoiTuongUuTien = "Vùng sâu KV1", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6751041009", HoTen = "Vũ Hải Đăng", NgaySinh = new DateTime(2008, 2, 14), GioiTinh = "nam", Cccd = "054208001009", DienThoai = "0901 234 509", Email = "haidang.67@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Tuy Hòa, Phú Yên", MaLop = "KTVT01_K67", NamNhapHoc = 2026, DoiTuongUuTien = "Khoảng cách > 350km", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6451021010", HoTen = "Ngô Văn Thịnh", NgaySinh = new DateTime(2005, 7, 7), GioiTinh = "nam", Cccd = "051205001010", DienThoai = "0901 234 510", Email = "vanthinh.64@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Quảng Ngãi", MaLop = "CKOT02_K64", NamNhapHoc = 2023, DoiTuongUuTien = null, TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6551021011", HoTen = "Dương Nhật Minh", NgaySinh = new DateTime(2006, 5, 29), GioiTinh = "nam", Cccd = "049206001011", DienThoai = "0901 234 511", Email = "nhatminh.65@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Tam Kỳ, Quảng Nam", MaLop = "CKDL01_K65", NamNhapHoc = 2024, DoiTuongUuTien = "Hộ nghèo", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6651021012", HoTen = "Hồ Quốc Việt", NgaySinh = new DateTime(2007, 9, 17), GioiTinh = "nam", Cccd = "046207001012", DienThoai = "0901 234 512", Email = "quocviet.66@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Huế, Thừa Thiên Huế", MaLop = "CKCD01_K66", NamNhapHoc = 2025, DoiTuongUuTien = "Khoảng cách > 350km", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6551011013", HoTen = "Trương Trọng Nghĩa", NgaySinh = new DateTime(2006, 4, 3), GioiTinh = "nam", Cccd = "070206001013", DienThoai = "0901 234 513", Email = "trongnghia.65@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Đồng Xoài, Bình Phước", MaLop = "KTXD01_K65", NamNhapHoc = 2024, DoiTuongUuTien = null, TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6651031014", HoTen = "Lâm Hoàng Phúc", NgaySinh = new DateTime(2007, 11, 21), GioiTinh = "nam", Cccd = "087207001014", DienThoai = "0901 234 514", Email = "hoangphuc.66@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Cao Lãnh, Đồng Tháp", MaLop = "DTVT01_K66", NamNhapHoc = 2025, DoiTuongUuTien = null, TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6551071015", HoTen = "Trần Thị Bảo Ngọc", NgaySinh = new DateTime(2006, 2, 16), GioiTinh = "nu", Cccd = "089306001015", DienThoai = "0901 234 515", Email = "baongoc.65@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Long Xuyên, An Giang", MaLop = "CNTT01_K65", NamNhapHoc = 2024, DoiTuongUuTien = "Con thương binh", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6551081016", HoTen = "Nguyễn Khánh Linh", NgaySinh = new DateTime(2006, 6, 28), GioiTinh = "nu", Cccd = "092306001016", DienThoai = "0901 234 516", Email = "khanhlinh.65@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Ninh Kiều, Cần Thơ", MaLop = "LOG01_K65", NamNhapHoc = 2024, DoiTuongUuTien = null, TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6651081017", HoTen = "Phạm Ngọc Quỳnh Hương", NgaySinh = new DateTime(2007, 10, 12), GioiTinh = "nu", Cccd = "068307001017", DienThoai = "0901 234 517", Email = "quynhhuong.66@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Bảo Lộc, Lâm Đồng", MaLop = "LOG01_K66", NamNhapHoc = 2025, DoiTuongUuTien = "Vùng sâu KV1", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6751041018", HoTen = "Lê Thị Mai Phương", NgaySinh = new DateTime(2008, 3, 24), GioiTinh = "nu", Cccd = "056308001018", DienThoai = "0901 234 518", Email = "maiphuong.67@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Cam Ranh, Khánh Hòa", MaLop = "KTVT01_K67", NamNhapHoc = 2026, DoiTuongUuTien = "Tân sinh viên K67", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6451071019", HoTen = "Đoàn Minh Triết", NgaySinh = new DateTime(2005, 1, 22), GioiTinh = "nam", Cccd = "079205001019", DienThoai = "0901 234 519", Email = "minhtriet.64@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Trảng Bom, Đồng Nai", MaLop = "CNTT01_K64", NamNhapHoc = 2023, DoiTuongUuTien = "Hộ cận nghèo", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6451071020", HoTen = "Vương Thị Yến Nhi", NgaySinh = new DateTime(2005, 11, 8), GioiTinh = "nu", Cccd = "074305001020", DienThoai = "0901 234 520", Email = "yennhi.64@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Dĩ An, Bình Dương", MaLop = "CNTT02_K64", NamNhapHoc = 2023, DoiTuongUuTien = "Con thương binh", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6551071021", HoTen = "Huỳnh Gia Khiêm", NgaySinh = new DateTime(2006, 8, 14), GioiTinh = "nam", Cccd = "080206001021", DienThoai = "0901 234 521", Email = "giakhiem.65@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Tân An, Long An", MaLop = "CNTT01_K65", NamNhapHoc = 2024, DoiTuongUuTien = "Vùng sâu KV1", TrangThai = "dangHoc" },
                    new() { MaSinhVien = "6651071022", HoTen = "Châu Ngọc Trâm", NgaySinh = new DateTime(2007, 5, 30), GioiTinh = "nu", Cccd = "086307001022", DienThoai = "0901 234 522", Email = "ngoctram.66@sinhvien.utc2.edu.vn", DiaChiThuongTru = "Vĩnh Long", MaLop = "CNTT01_K66", NamNhapHoc = 2025, DoiTuongUuTien = "Khoảng cách > 350km", TrangThai = "dangHoc" }
                };

                var newStudents = sinhViens.Where(s => !existingStudentIds.Contains(s.MaSinhVien)).ToList();
                if (newStudents.Count > 0)
                {
                    await context.SinhViens.AddRangeAsync(newStudents);
                    await context.SaveChangesAsync();
                }
            }

            // Phụ huynh liên hệ (cho các sinh viên nội trú)
            if (await context.PhuHuynhLienHes.CountAsync() < 20)
            {
                var existingGuardianIds = await context.PhuHuynhLienHes.Select(p => p.MaPhuHuynh).ToHashSetAsync();
                var studentList = await context.SinhViens.OrderBy(s => s.MaSinhVien).Take(20).ToListAsync();
                var phuHuynhs = new List<PhuHuynhLienHe>();
                for (int i = 0; i < studentList.Count; i++)
                {
                    string phId = $"PH26_{i + 1:D3}";
                    if (!existingGuardianIds.Contains(phId))
                    {
                        var sv = studentList[i];
                        phuHuynhs.Add(new PhuHuynhLienHe
                        {
                            MaPhuHuynh = phId,
                            MaSinhVien = sv.MaSinhVien,
                            HoTen = $"Phụ huynh em {sv.HoTen}",
                            QuanHe = i % 2 == 0 ? "Cha" : "Mẹ",
                            DienThoai = $"0913 880 {100 + i:D3}",
                            LaLienHeKhanCap = true
                        });
                    }
                }
                if (phuHuynhs.Count > 0)
                {
                    await context.PhuHuynhLienHes.AddRangeAsync(phuHuynhs);
                    await context.SaveChangesAsync();
                }
            }

            // 4. Tài khoản đăng nhập (Giữ nguyên các tài khoản chính + tạo tài khoản cho 20 nhân viên & sinh viên)
            var existingUsernames = await context.TaiKhoans.Select(t => t.TenDangNhap).ToHashSetAsync();
            var existingStaffAccounts = await context.TaiKhoans.Where(t => t.MaNhanVien != null).Select(t => t.MaNhanVien!).ToHashSetAsync();
            var existingStudentAccounts = await context.TaiKhoans.Where(t => t.MaSinhVien != null).Select(t => t.MaSinhVien!).ToHashSetAsync();

            var taiKhoansToAdd = new List<TaiKhoan>();

            void AddAccountIfMissing(string username, string plainPass, string role, string? staffId = null, string? studentId = null, string? customHash = null)
            {
                if (existingUsernames.Contains(username)) return;
                if (staffId != null && existingStaffAccounts.Contains(staffId)) return;
                if (studentId != null && existingStudentAccounts.Contains(studentId)) return;

                taiKhoansToAdd.Add(new TaiKhoan
                {
                    TenDangNhap = username,
                    MatKhauHash = customHash ?? passwordHasher.HashPassword(plainPass),
                    MaVaiTro = role,
                    MaNhanVien = staffId,
                    MaSinhVien = studentId,
                    LaDangHoat = true,
                    LanDangNhapCuoi = DateTime.Now.AddMinutes(-15)
                });
                existingUsernames.Add(username);
                if (staffId != null) existingStaffAccounts.Add(staffId);
                if (studentId != null) existingStudentAccounts.Add(studentId);
            }

            // 5 tài khoản chính để đăng nhập
            AddAccountIfMissing("ql_an", "quanly123", "quanLy", staffId: "NV01");
            AddAccountIfMissing("kt_binh", "ketoan123", "keToan", staffId: "NV02");
            AddAccountIfMissing("admin", "admin123", "admin", staffId: "NV03");
            AddAccountIfMissing("sv_minh", "sinhvien123", "sinhVien", studentId: "6451071012");
            AddAccountIfMissing("dinhhoangphuc264@gmail.com", "quanly123", "quanLy", customHash: "PBKDF2$100000$C4ZcpTgkp9sSzH+lTuMb7w==$xm4xLJDmdRkuo3LgMc02NcYGY2ZmRJwyMZ6a+twCqaI=");

            // Tài khoản cho các nhân viên còn lại (NV04 -> NV20)
            for (int i = 4; i <= 20; i++)
            {
                string nvCode = $"NV{i:D2}";
                string role = (i == 10 || i == 13 || i == 19) ? "keToan" : "quanLy";
                AddAccountIfMissing($"nv_{nvCode.ToLower()}", "quanly123", role, staffId: nvCode);
            }

            // Tài khoản cho các sinh viên còn lại
            var allStudents = await context.SinhViens.Select(s => s.MaSinhVien).ToListAsync();
            foreach (var mssv in allStudents)
            {
                if (mssv == "6451071012") continue;
                AddAccountIfMissing($"sv_{mssv[^4..]}", "sinhvien123", "sinhVien", studentId: mssv);
            }

            if (taiKhoansToAdd.Count > 0)
            {
                await context.TaiKhoans.AddRangeAsync(taiKhoansToAdd);
                await context.SaveChangesAsync();
            }

            // 5. Đợt đăng ký & 26 Đơn đăng ký cho năm học 2026-2027
            if (await context.DonDangKys.CountAsync() < 26)
            {
                if (!await context.DotDangKys.AnyAsync(d => d.MaDotDangKy == "DOT_K65_2026"))
                {
                    await context.DotDangKys.AddAsync(new DotDangKy
                    {
                        MaDotDangKy = "DOT_K65_2026",
                        TenDot = "Đợt xét tuyển KTX Học kỳ 1 Năm học 2026-2027",
                        MaKyHoc = "HK1_2026_2027",
                        NgayMo = new DateTime(2026, 8, 15),
                        NgayDong = new DateTime(2026, 12, 31)
                    });
                    await context.SaveChangesAsync();
                }

                var existingAppIds = await context.DonDangKys.Select(d => d.MaDonDangKy).ToHashSetAsync();
                var existingStudentRoundPairs = await context.DonDangKys
                    .Where(d => d.MaDotDangKy == "DOT_K65_2026")
                    .Select(d => d.MaSinhVien)
                    .ToHashSetAsync();

                var donSamples = new (string Id, string Mssv, string LoaiPhong, string Phong, string TrangThai, string GhiChu)[]
                {
                    ("DK-65089", "6551080319", "LP_TC_NAM", "A01_A103", "choDuyet", "Diện: Hộ nghèo (Khu vực 1), Điểm xét: 9.5"),
                    ("DK-65090", "6451071088", "LP_TC_NU", "B02_B201", "choDuyet", "Diện: Gia đình chính sách, Điểm xét: 9.0"),
                    ("DK-65091", "6451071012", "LP_TC_NAM", "A01_A101", "daDuyet", "Đã duyệt bố trí phòng tiêu chuẩn A101"),
                    ("DK-65092", "6351020045", "LP_TC_NAM", "A01_A101", "daDuyet", "Đã duyệt bố trí phòng A101"),
                    ("DK-65093", "6551071001", "LP_TC_NAM", "A01_A101", "daDuyet", "Đã duyệt ưu tiên hộ cận nghèo"),
                    ("DK-65094", "6551071002", "LP_TC_NAM", "A01_A102", "daDuyet", "Đã duyệt nội trú HK1 2026-2027"),
                    ("DK-65095", "6651071003", "LP_TC_NAM", "A01_A102", "daDuyet", "Đã duyệt diện vùng sâu KV1"),
                    ("DK-65096", "6651071004", "LP_TC_NAM", "A01_A102", "daDuyet", "Đã duyệt nội trú HK1 2026-2027"),
                    ("DK-65097", "6751071005", "LP_TC_NAM", "A02_A101", "daDuyet", "Đã duyệt tân sinh viên K67"),
                    ("DK-65098", "6451041006", "LP_TC_NAM", "A02_A101", "daDuyet", "Đã duyệt nội trú HK1 2026-2027"),
                    ("DK-65099", "6551081007", "LP_TC_NAM", "A02_A101", "daDuyet", "Đã duyệt diện con thương binh"),
                    ("DK-65100", "6651081008", "LP_TC_NAM", "A02_A102", "daDuyet", "Đã duyệt diện vùng sâu KV1"),
                    ("DK-65101", "6751041009", "LP_TC_NAM", "A02_A102", "daDuyet", "Đã duyệt diện khoảng cách xa"),
                    ("DK-65102", "6451021010", "LP_CLC", "C01_C101", "daDuyet", "Đã duyệt phòng chất lượng cao C101"),
                    ("DK-65103", "6551021011", "LP_CLC", "C01_C101", "daDuyet", "Đã duyệt phòng chất lượng cao C101"),
                    ("DK-65104", "6651021012", "LP_CLC", "C01_C102", "daDuyet", "Đã duyệt phòng chất lượng cao C102"),
                    ("DK-65105", "6451071064", "LP_TC_NU", "B01_B101", "daDuyet", "Đã duyệt nội trú nữ B101"),
                    ("DK-65106", "6551071015", "LP_TC_NU", "B01_B101", "daDuyet", "Đã duyệt diện con thương binh"),
                    ("DK-65107", "6551081016", "LP_TC_NU", "B01_B102", "choDuyet", "Đang chờ xét duyệt hồ sơ đợt 1"),
                    ("DK-65108", "6651081017", "LP_TC_NU", "B02_B101", "choDuyet", "Diện vùng sâu KV1 chờ kiểm tra minh chứng"),
                    ("DK-65109", "6751041018", "LP_TC_NU", "B02_B102", "choDuyet", "Tân sinh viên K67 đăng ký trực tuyến"),
                    ("DK-65110", "6251010023", "LP_CLC", "C01_C101", "tuChoi", "Đã hoàn thành khóa học và thanh lý hợp đồng"),
                    ("DK-65111", "6451071019", "LP_TC_NAM", "A01_A104", "choDuyet", "Diện hộ cận nghèo, đăng ký phòng tiêu chuẩn"),
                    ("DK-65112", "6451071020", "LP_TC_NU", "B01_B103", "choDuyet", "Diện con thương binh, chờ xét duyệt ưu tiên"),
                    ("DK-65113", "6551071021", "LP_TC_NAM", "A02_A103", "choDuyet", "Diện vùng sâu KV1, điểm rèn luyện 88"),
                    ("DK-65114", "6651071022", "LP_TC_NU", "B02_B103", "choDuyet", "Diện khoảng cách > 350km, chờ bố trí phòng")
                };

                var donsToAdd = new List<DonDangKy>();
                int idx = 0;
                foreach (var item in donSamples)
                {
                    idx++;
                    if (existingAppIds.Contains(item.Id) || existingStudentRoundPairs.Contains(item.Mssv))
                        continue;

                    donsToAdd.Add(new DonDangKy
                    {
                        MaDonDangKy = item.Id,
                        MaSinhVien = item.Mssv,
                        MaDotDangKy = "DOT_K65_2026",
                        MaLoaiPhong = item.LoaiPhong,
                        MaPhong = item.Phong,
                        NgayDangKy = new DateTime(2026, 9, 1).AddHours(idx * 4),
                        TrangThai = item.TrangThai,
                        MaNhanVienDuyet = item.TrangThai == "choDuyet" ? null : "NV01",
                        NgayDuyet = item.TrangThai == "choDuyet" ? null : new DateTime(2026, 9, 2).AddHours(idx * 2),
                        GhiChu = item.GhiChu
                    });
                    existingAppIds.Add(item.Id);
                    existingStudentRoundPairs.Add(item.Mssv);
                }

                if (donsToAdd.Count > 0)
                {
                    await context.DonDangKys.AddRangeAsync(donsToAdd);
                    await context.SaveChangesAsync();
                }
            }

            // 6. Hợp đồng nội trú năm học 2026-2027 (20 hợp đồng)
            if (await context.HopDongs.CountAsync() < 20)
            {
                var existingContractIds = await context.HopDongs.Select(h => h.MaHopDong).ToHashSetAsync();
                var activeStudentContracts = await context.HopDongs
                    .Where(h => h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy")
                    .Select(h => h.MaSinhVien)
                    .ToHashSetAsync();
                var activeBedContracts = await context.HopDongs
                    .Where(h => h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy")
                    .Select(h => h.MaGiuong)
                    .ToHashSetAsync();

                var contractSamples = new (string Id, string Mssv, string BedId, decimal Fee, string TrangThai, int DaysToEnd, string? DonId)[]
                {
                    ("HD-2026-A101-01", "6451071012", "A01_A101_G1", 500000m, "hieuLuc", 230, "DK-65091"),
                    ("HD-2026-B205-04", "6451071088", "B02_B201_G1", 500000m, "hieuLuc", 10, null),
                    ("HD-2025-C102-01", "6251010023", "C01_C101_G1", 700000m, "daKetThuc", 0, null),
                    ("HD-2026-A101-02", "6351020045", "A01_A101_G2", 500000m, "hieuLuc", 230, "DK-65092"),
                    ("HD-2026-A101-03", "6551071001", "A01_A101_G3", 500000m, "hieuLuc", 230, "DK-65093"),
                    ("HD-2026-A102-01", "6551071002", "A01_A102_G1", 500000m, "hieuLuc", 230, "DK-65094"),
                    ("HD-2026-A102-02", "6651071003", "A01_A102_G2", 500000m, "hieuLuc", 230, "DK-65095"),
                    ("HD-2026-A102-03", "6651071004", "A01_A102_G3", 500000m, "hieuLuc", 12, "DK-65096"),
                    ("HD-2026-A201-01", "6751071005", "A02_A101_G1", 500000m, "hieuLuc", 230, "DK-65097"),
                    ("HD-2026-A201-02", "6451041006", "A02_A101_G2", 500000m, "hieuLuc", 230, "DK-65098"),
                    ("HD-2026-A201-03", "6551081007", "A02_A101_G3", 500000m, "hieuLuc", 230, "DK-65099"),
                    ("HD-2026-A202-01", "6651081008", "A02_A102_G1", 500000m, "hieuLuc", 230, "DK-65100"),
                    ("HD-2026-A202-02", "6751041009", "A02_A102_G2", 500000m, "hieuLuc", 9, "DK-65101"),
                    ("HD-2026-C101-02", "6451021010", "C01_C101_G2", 700000m, "hieuLuc", 230, "DK-65102"),
                    ("HD-2026-C101-03", "6551021011", "C01_C101_G3", 700000m, "hieuLuc", 230, "DK-65103"),
                    ("HD-2026-C102-02", "6651021012", "C01_C102_G1", 700000m, "hieuLuc", 230, "DK-65104"),
                    ("HD-2026-A103-01", "6551011013", "A01_A103_G1", 500000m, "hieuLuc", 230, null),
                    ("HD-2026-A103-02", "6651031014", "A01_A103_G2", 500000m, "hieuLuc", 230, null),
                    ("HD-2026-B101-01", "6451071064", "B01_B101_G1", 500000m, "hieuLuc", 230, "DK-65105"),
                    ("HD-2026-B101-02", "6551071015", "B01_B101_G2", 500000m, "hieuLuc", 230, "DK-65106")
                };

                var contractsToAdd = new List<HopDong>();
                foreach (var c in contractSamples)
                {
                    if (existingContractIds.Contains(c.Id)) continue;
                    if (c.TrangThai != "daKetThuc" && (activeStudentContracts.Contains(c.Mssv) || activeBedContracts.Contains(c.BedId)))
                        continue;

                    bool isEnded = c.TrangThai == "daKetThuc";
                    DateTime startDate = isEnded ? new DateTime(2025, 9, 1) : new DateTime(2026, 9, 1);
                    DateTime endDate = isEnded
                        ? new DateTime(2026, 1, 15)
                        : (c.DaysToEnd <= 15 ? DateTime.Today.AddDays(c.DaysToEnd) : new DateTime(2027, 6, 30));

                    contractsToAdd.Add(new HopDong
                    {
                        MaHopDong = c.Id,
                        MaDonDangKy = c.DonId,
                        MaSinhVien = c.Mssv,
                        MaGiuong = c.BedId,
                        MaKyHoc = "HK1_2026_2027",
                        NgayBatDau = startDate,
                        NgayKetThuc = endDate,
                        NgayNhanPhongThucTe = startDate,
                        NgayTraPhongThucTe = isEnded ? endDate : null,
                        GiaThueThang = c.Fee,
                        TienCoc = c.Fee,
                        TienHoanCoc = isEnded ? c.Fee : 0m,
                        TrangThai = c.TrangThai,
                        NgayThanhLy = isEnded ? endDate : null,
                        GhiChu = isEnded ? "Hết hạn học kỳ và tất toán trả phòng" : "Đang lưu trú năm học 2026-2027",
                        MaNhanVienLap = "NV01"
                    });

                    existingContractIds.Add(c.Id);
                    if (!isEnded)
                    {
                        activeStudentContracts.Add(c.Mssv);
                        activeBedContracts.Add(c.BedId);
                    }
                }

                if (contractsToAdd.Count > 0)
                {
                    await context.HopDongs.AddRangeAsync(contractsToAdd);
                    await context.SaveChangesAsync();
                }
            }

            // 7. Đăng ký dịch vụ & Chỉ số điện nước cho 20 phòng (Tháng 10 & 11/2026)
            if (await context.DangKyDichVus.CountAsync() < 20)
            {
                var activeContracts = await context.HopDongs
                    .Where(h => h.TrangThai == "hieuLuc")
                    .OrderBy(h => h.MaHopDong)
                    .Take(15)
                    .ToListAsync();

                var existingRegPairs = await context.DangKyDichVus
                    .Select(d => new { d.MaHopDong, d.MaDichVu })
                    .ToListAsync();
                var regSet = existingRegPairs.Select(x => $"{x.MaHopDong}|{x.MaDichVu}").ToHashSet();

                var dvRegs = new List<DangKyDichVu>();
                string[] dvCodes = ["DV_INTERNET", "DV_GUIXE", "DV_GIATLA"];
                for (int i = 0; i < activeContracts.Count; i++)
                {
                    var hd = activeContracts[i];
                    string dv1 = dvCodes[i % dvCodes.Length];
                    if (regSet.Add($"{hd.MaHopDong}|{dv1}"))
                    {
                        dvRegs.Add(new DangKyDichVu
                        {
                            MaHopDong = hd.MaHopDong,
                            MaDichVu = dv1,
                            SoLuong = 1,
                            NgayBatDau = new DateTime(2026, 9, 1),
                            TrangThai = "dangDung"
                        });
                    }

                    if (i < 8)
                    {
                        string dv2 = dvCodes[(i + 1) % dvCodes.Length];
                        if (regSet.Add($"{hd.MaHopDong}|{dv2}"))
                        {
                            dvRegs.Add(new DangKyDichVu
                            {
                                MaHopDong = hd.MaHopDong,
                                MaDichVu = dv2,
                                SoLuong = 1,
                                NgayBatDau = new DateTime(2026, 9, 1),
                                TrangThai = "dangDung"
                            });
                        }
                    }
                }

                if (dvRegs.Count > 0)
                {
                    await context.DangKyDichVus.AddRangeAsync(dvRegs);
                    await context.SaveChangesAsync();
                }
            }

            if (await context.HoaDonPhongs.CountAsync() < 20)
            {
                var targetRooms = await context.Phongs
                    .Where(p => p.TrangThai == "hoatDong")
                    .OrderBy(p => p.MaToaNha)
                    .ThenBy(p => p.MaPhong)
                    .Skip(1)
                    .Take(22)
                    .ToListAsync();

                var existingMeterKeys = await context.ChiSoDienNuocs
                    .Select(c => $"{c.MaPhong}|{c.Loai}|{c.Thang}|{c.Nam}")
                    .ToHashSetAsync();
                var existingBillKeys = await context.HoaDonPhongs
                    .Select(b => $"{b.MaPhong}|{b.Thang}|{b.Nam}")
                    .ToHashSetAsync();

                var metersToAdd = new List<ChiSoDienNuoc>();
                var roomBillsToAdd = new List<HoaDonPhong>();

                for (int i = 0; i < targetRooms.Count; i++)
                {
                    var room = targetRooms[i];
                    decimal eOld = 1200 + i * 35;
                    decimal eUsage = (i % 6 == 0) ? 340 : (95 + (i % 7) * 18); // Một số phòng vượt ngưỡng cảnh báo >300 kWh
                    decimal eNew = eOld + eUsage;

                    decimal wOld = 110 + i * 6;
                    decimal wUsage = (i % 8 == 0) ? 45 : (12 + (i % 5) * 3);
                    decimal wNew = wOld + wUsage;

                    if (existingMeterKeys.Add($"{room.MaPhong}|dien|10|2026"))
                    {
                        metersToAdd.Add(new ChiSoDienNuoc
                        {
                            MaPhong = room.MaPhong,
                            Loai = "dien",
                            Thang = 10,
                            Nam = 2026,
                            ChiSoCu = eOld,
                            ChiSoMoi = eNew,
                            MaGia = "GIA_DIEN_2026",
                            NgayGhi = new DateTime(2026, 10, 25, 9, 30, 0),
                            MaNhanVienGhi = "NV04"
                        });
                    }

                    if (existingMeterKeys.Add($"{room.MaPhong}|nuoc|10|2026"))
                    {
                        metersToAdd.Add(new ChiSoDienNuoc
                        {
                            MaPhong = room.MaPhong,
                            Loai = "nuoc",
                            Thang = 10,
                            Nam = 2026,
                            ChiSoCu = wOld,
                            ChiSoMoi = wNew,
                            MaGia = "GIA_NUOC_2026",
                            NgayGhi = new DateTime(2026, 10, 25, 9, 35, 0),
                            MaNhanVienGhi = "NV04"
                        });
                    }

                    if (existingBillKeys.Add($"{room.MaPhong}|10|2026"))
                    {
                        decimal tienDien = eUsage * 2500m;
                        decimal tienNuoc = wUsage * 12000m;
                        decimal tong = tienDien + tienNuoc;
                        int soNguoi = 4;
                        roomBillsToAdd.Add(new HoaDonPhong
                        {
                            MaPhong = room.MaPhong,
                            Thang = 10,
                            Nam = 2026,
                            TienDien = tienDien,
                            TienNuoc = tienNuoc,
                            TongTien = tong,
                            SoNguoiChia = soNguoi,
                            TienMoiNguoi = Math.Round(tong / soNguoi, 0),
                            TrangThai = i < 16 ? "daChot" : "chuaChot",
                            NgayTao = new DateTime(2026, 10, 26)
                        });
                    }
                }

                if (metersToAdd.Count > 0) await context.ChiSoDienNuocs.AddRangeAsync(metersToAdd);
                if (roomBillsToAdd.Count > 0) await context.HoaDonPhongs.AddRangeAsync(roomBillsToAdd);
                if (metersToAdd.Count > 0 || roomBillsToAdd.Count > 0) await context.SaveChangesAsync();
            }

            // 8. Hóa đơn & Thanh toán (22 Hóa đơn tháng 10 & 11/2026)
            if (await context.HoaDons.CountAsync() < 20)
            {
                var existingInvoiceIds = await context.HoaDons.Select(h => h.MaHoaDon).ToHashSetAsync();
                var contracts = await context.HopDongs
                    .OrderBy(h => h.MaHopDong)
                    .Take(20)
                    .ToListAsync();

                var methods = new[] { "chuyenKhoan", "viDienTu", "tienMat" };

                for (int i = 0; i < contracts.Count; i++)
                {
                    var hd = contracts[i];
                    string invId = $"HD-T10-2026-{i + 1:D3}";
                    if (existingInvoiceIds.Contains(invId)) continue;

                    bool isPaid = i < 14;
                    bool isOverdue = !isPaid && (i % 2 == 0);
                    int month = i < 15 ? 10 : 11;
                    var issueDate = new DateTime(2026, month, 1);
                    var dueDate = isOverdue
                        ? new DateTime(2026, 10, 15)
                        : (isPaid ? new DateTime(2026, month, 15) : DateTime.Today.AddDays(10));

                    var hoaDon = new HoaDon
                    {
                        MaHoaDon = invId,
                        MaHopDong = hd.MaHopDong,
                        Thang = month,
                        Nam = 2026,
                        NgayLap = issueDate,
                        HanThanhToan = dueDate,
                        TrangThai = isPaid ? "daThanhToan" : "chuaThanhToan"
                    };
                    await context.HoaDons.AddAsync(hoaDon);
                    await context.SaveChangesAsync();

                    var lines = new List<ChiTietHoaDon>();
                    decimal rent = hd.GiaThueThang;
                    decimal elecQty = 25 + (i % 5) * 5;
                    decimal waterQty = 3 + (i % 3);

                    if (i % 4 == 1)
                    {
                        // Hóa đơn chỉ tiền phòng
                        lines.Add(new() { MaHoaDon = invId, LoaiKhoan = "tienPhong", NoiDung = $"Tiền phòng KTX tháng {month:D2}/2026", SoLuong = 1, DonGia = rent, ThanhTien = rent });
                    }
                    else if (i % 4 == 2)
                    {
                        // Hóa đơn điện nước
                        lines.Add(new() { MaHoaDon = invId, LoaiKhoan = "dien", NoiDung = $"Điện sinh hoạt tháng {month:D2}/2026 ({elecQty} kWh)", SoLuong = elecQty, DonGia = 2500, ThanhTien = elecQty * 2500 });
                        lines.Add(new() { MaHoaDon = invId, LoaiKhoan = "nuoc", NoiDung = $"Nước sinh hoạt tháng {month:D2}/2026 ({waterQty} m3)", SoLuong = waterQty, DonGia = 12000, ThanhTien = waterQty * 12000 });
                    }
                    else
                    {
                        // Hóa đơn tổng hợp
                        lines.Add(new() { MaHoaDon = invId, LoaiKhoan = "tienPhong", NoiDung = $"Tiền phòng & phí nội trú tháng {month:D2}/2026", SoLuong = 1, DonGia = rent, ThanhTien = rent });
                        lines.Add(new() { MaHoaDon = invId, LoaiKhoan = "dien", NoiDung = $"Điện chia đầu người ({elecQty} kWh)", SoLuong = elecQty, DonGia = 2500, ThanhTien = elecQty * 2500 });
                        lines.Add(new() { MaHoaDon = invId, LoaiKhoan = "nuoc", NoiDung = $"Nước chia đầu người ({waterQty} m3)", SoLuong = waterQty, DonGia = 12000, ThanhTien = waterQty * 12000 });
                    }

                    await context.ChiTietHoaDons.AddRangeAsync(lines);
                    decimal totalAmount = lines.Sum(l => l.ThanhTien ?? 0m);

                    if (isPaid)
                    {
                        string payId = $"TT-2026{month:D2}-{i + 1:D2}";
                        if (!await context.ThanhToans.AnyAsync(t => t.MaThanhToan == payId))
                        {
                            await context.ThanhToans.AddAsync(new ThanhToan
                            {
                                MaThanhToan = payId,
                                MaHoaDon = invId,
                                SoTien = totalAmount,
                                NgayThanhToan = issueDate.AddDays(3 + (i % 8)),
                                PhuongThuc = methods[i % methods.Length],
                                MaNhanVienThu = "NV02",
                                GhiChu = "Đã đối soát thanh toán phí nội trú KTX"
                            });
                        }
                    }

                    await context.SaveChangesAsync();
                }

                // Thêm 2 hóa đơn riêng cho sinh viên mẫu sv_minh (6451071012) để cổng sinh viên có cả hóa đơn đã thanh toán & chờ thanh toán
                if (!await context.HoaDons.AnyAsync(h => h.MaHoaDon == "HD-T11-2026-001"))
                {
                    var hdMinh = new HoaDon
                    {
                        MaHoaDon = "HD-T11-2026-001",
                        MaHopDong = "HD-2026-A101-01",
                        Thang = 11,
                        Nam = 2026,
                        NgayLap = new DateTime(2026, 11, 1),
                        HanThanhToan = new DateTime(2026, 11, 20),
                        TrangThai = "chuaThanhToan"
                    };
                    await context.HoaDons.AddAsync(hdMinh);
                    await context.SaveChangesAsync();

                    await context.ChiTietHoaDons.AddRangeAsync(
                        new ChiTietHoaDon { MaHoaDon = "HD-T11-2026-001", LoaiKhoan = "tienPhong", NoiDung = "Tiền phòng KTX tháng 11/2026", SoLuong = 1, DonGia = 500000, ThanhTien = 500000 },
                        new ChiTietHoaDon { MaHoaDon = "HD-T11-2026-001", LoaiKhoan = "dien", NoiDung = "Điện chia đầu người tháng 11/2026 (32 kWh)", SoLuong = 32, DonGia = 2500, ThanhTien = 80000 },
                        new ChiTietHoaDon { MaHoaDon = "HD-T11-2026-001", LoaiKhoan = "nuoc", NoiDung = "Nước chia đầu người tháng 11/2026 (4 m3)", SoLuong = 4, DonGia = 12000, ThanhTien = 48000 },
                        new ChiTietHoaDon { MaHoaDon = "HD-T11-2026-001", LoaiKhoan = "dichVu", NoiDung = "Wifi Tốc độ cao tháng 11/2026", SoLuong = 1, DonGia = 50000, ThanhTien = 50000 }
                    );
                    await context.SaveChangesAsync();
                }
            }

            // 9. Tài sản phòng & 20 Yêu cầu sửa chữa trong năm học 2026-2027
            if (!await context.TaiSanPhongs.AnyAsync())
            {
                var firstRooms = await context.Phongs.OrderBy(p => p.MaPhong).Take(10).ToListAsync();
                var assets = new List<TaiSanPhong>();
                int aIdx = 1;
                foreach (var r in firstRooms)
                {
                    assets.Add(new TaiSanPhong { MaTaiSan = $"TS_{aIdx++:D3}", MaPhong = r.MaPhong, TenTaiSan = "Quạt trần Panasonic 3 cánh", SoLuong = 2, TinhTrang = "tot", NgayCap = new DateTime(2026, 8, 1) });
                    assets.Add(new TaiSanPhong { MaTaiSan = $"TS_{aIdx++:D3}", MaPhong = r.MaPhong, TenTaiSan = "Bộ đèn LED tuýp đôi 1.2m", SoLuong = 4, TinhTrang = "tot", NgayCap = new DateTime(2026, 8, 1) });
                }
                if (assets.Count > 0)
                {
                    await context.TaiSanPhongs.AddRangeAsync(assets);
                    await context.SaveChangesAsync();
                }
            }

            if (await context.YeuCauSuaChuas.CountAsync() < 20)
            {
                var existingCount = await context.YeuCauSuaChuas.CountAsync();
                var repairSamples = new (string Room, string Mssv, string MoTa, string Loai, string MucDo, string TrangThai, string? NvXuLy, string? PhanHoi)[]
                {
                    ("A01_A101", "6451071012", "Rò rỉ vòi nước bồn rửa lavabo trong nhà vệ sinh phòng A101", "Nước / Vệ sinh", "binhThuong", "moiGui", null, null),
                    ("A01_A101", "6351020045", "Bóng đèn tuýp LED khu vực bàn học số 2 bị nhấp nháy không sáng", "Điện dân dụng", "binhThuong", "dangXuLy", "NV04", "Đã tiếp nhận, kỹ thuật viên đang mang bóng mới xuống thay"),
                    ("A01_A102", "6551071002", "Ổ cắm điện đầu giường G1 có mùi khét và tia lửa điện khẩn cấp", "Điện dân dụng", "khanCap", "dangXuLy", "NV04", "Đã ngắt aptomat nhánh và đang thay ổ cắm chống cháy"),
                    ("A01_A102", "6651071003", "Bản lề cửa sổ hướng hành lang bị gãy chốt chống gió", "Khóa cửa / Cửa sổ", "binhThuong", "hoanThanh", "NV09", "Đã thay bản lề inox mới"),
                    ("A02_A101", "6751071005", "Đường ống thoát nước sàn nhà tắm bị nghẹt gây ngập cục bộ", "Nước / Vệ sinh", "khanCap", "dangXuLy", "NV12", "Đang thông tắc đường ống thoát sàn"),
                    ("A02_A101", "6451041006", "Thang sắt leo giường tầng G3 bị lỏng mối hàn cần gia cố", "Đồ gỗ / Giường tủ", "binhThuong", "hoanThanh", "NV09", "Đã hàn cố định và sơn chống gỉ"),
                    ("A02_A102", "6651081008", "Bộ phát Wifi hànhlang trước phòng A102 mất tín hiệu mạng LAN", "Thiết bị mạng", "binhThuong", "moiGui", null, null),
                    ("C01_C101", "6451021010", "Máy lạnh Inverter chảy nước ở dàn lạnh và kém lạnh", "Điện dân dụng", "binhThuong", "hoanThanh", "NV09", "Đã vệ sinh lưới lọc và thông ống xả nước ngưng"),
                    ("C01_C101", "6551021011", "Ổ khóa tay nắm cửa chính bị kẹt chìa không xoay được", "Khóa cửa / Cửa sổ", "khanCap", "hoanThanh", "NV04", "Đã tra dầu và căn chỉnh lại cò khóa"),
                    ("C01_C102", "6651021012", "Vòi sen tắm bị gãy cổ ren rò nước mạnh", "Nước / Vệ sinh", "binhThuong", "moiGui", null, null),
                    ("B01_B101", "6451071064", "Cánh tủ đồ cá nhân số 1 bị bung bản lề gỗ", "Đồ gỗ / Giường tủ", "binhThuong", "dangXuLy", "NV12", "Đang thay bản lề giảm chấn mới"),
                    ("B01_B101", "6551071015", "Quạt trần quay chậm và phát tiếng kêu lạch cạch ở tốc độ số 3", "Điện dân dụng", "binhThuong", "hoanThanh", "NV04", "Đã thay tụ quạt và siết lại ốc bầu quạt"),
                    ("B02_B201", "6451071088", "Van xả bồn cầu không tự ngắt nước sau khi nhấn xả", "Nước / Vệ sinh", "binhThuong", "dangXuLy", "NV12", "Đang thay cụm phao cấp nước bồn cầu"),
                    ("A01_A103", "6551011013", "Mất kết nối порт mạng LAN âm tường tại bàn học G1", "Thiết bị mạng", "binhThuong", "hoanThanh", "NV20", "Đã bấm lại hạt mạng RJ45 chuẩn B"),
                    ("A01_A103", "6651031014", "Đèn chiếu sáng ban công bị cháy bóng sau cơn mưa tối qua", "Điện dân dụng", "binhThuong", "moiGui", null, null),
                    ("A01_A101", "6551071001", "Chốt khóa trong cửa nhà vệ sinh bị lệch không gài được", "Khóa cửa / Cửa sổ", "binhThuong", "hoanThanh", "NV04", "Đã chỉnh lại bát khóa cửa"),
                    ("A02_A102", "6751041009", "Mặt bàn học gỗ ép bị phồng rộp và bung thanh đỡ ngăn kéo", "Đồ gỗ / Giường tủ", "binhThuong", "moiGui", null, null),
                    ("B01_B102", "6551081016", "Aptomat tổng của phòng tự nhảy khi bật bình siêu tốc", "Điện dân dụng", "khanCap", "hoanThanh", "NV04", "Đã kiểm tra tải và thay MCB 32A chính hãng"),
                    ("B02_B101", "6651081017", "Lưới chắn côn trùng cửa sổ tầng 1 bị rách góc dưới", "Khóa cửa / Cửa sổ", "binhThuong", "dangXuLy", "NV12", "Đã đo kích thước, chiều nay lắp lưới mới"),
                    ("C01_C101", "6451071012", "Bộ chia mạng Switch tầng 1 chập chờn làm rớt mạng buổi tối", "Thiết bị mạng", "binhThuong", "hoanThanh", "NV20", "Đã thay nguồn Adapter 12V cho Switch")
                };

                var ticketsToAdd = new List<YeuCauSuaChua>();
                for (int i = existingCount; i < repairSamples.Length; i++)
                {
                    var item = repairSamples[i];
                    var createdTime = new DateTime(2026, 9, 10).AddDays(i * 2).AddHours(8 + (i % 8));
                    ticketsToAdd.Add(new YeuCauSuaChua
                    {
                        MaPhong = item.Room,
                        MaSinhVienGui = item.Mssv,
                        MoTa = item.MoTa,
                        LoaiSuCo = item.Loai,
                        MucDoKhanCap = item.MucDo,
                        PhanHoi = item.PhanHoi,
                        NgayGui = createdTime,
                        TrangThai = item.TrangThai,
                        MaNhanVienXuLy = item.NvXuLy,
                        NgayHoanThanh = item.TrangThai == "hoanThanh" ? createdTime.AddHours(18) : null
                    });
                }

                if (ticketsToAdd.Count > 0)
                {
                    await context.YeuCauSuaChuas.AddRangeAsync(ticketsToAdd);
                    await context.SaveChangesAsync();
                }
            }

            // 10. Kỷ luật & Vi phạm (6 loại vi phạm & 20 biên bản vi phạm trong năm học 2026-2027)
            var extraViolationTypes = new List<LoaiViPham>
            {
                new() { MaLoaiViPham = "VP_BEPDIEN", TenLoaiViPham = "Sử dụng thiết bị nhiệt / bếp điện trái phép", MucDo = "trungBinh", TienPhat = 200000 },
                new() { MaLoaiViPham = "VP_TIENGON", TenLoaiViPham = "Gây ồn ào, mở nhạc lớn sau 23h00", MucDo = "nhe", TienPhat = 50000 },
                new() { MaLoaiViPham = "VP_NGUOINGOAI", TenLoaiViPham = "Đưa người ngoài vào phòng ở qua đêm trái phép", MucDo = "nang", TienPhat = 500000 },
                new() { MaLoaiViPham = "VP_VESINH", TenLoaiViPham = "Không đảm bảo vệ sinh phòng ở, vứt rác bừa bãi", MucDo = "nhe", TienPhat = 50000 },
                new() { MaLoaiViPham = "VP_HUTTHUOC", TenLoaiViPham = "Hút thuốc lá trong khuôn viên buồng phòng KTX", MucDo = "trungBinh", TienPhat = 150000 },
                new() { MaLoaiViPham = "VP_GIOCAM", TenLoaiViPham = "Về trễ quá giờ đóng cổng KTX nhiều lần", MucDo = "nhe", TienPhat = 100000 }
            };

            var existingVpTypeIds = await context.LoaiViPhams.Select(v => v.MaLoaiViPham).ToHashSetAsync();
            var newVpTypes = extraViolationTypes.Where(v => !existingVpTypeIds.Contains(v.MaLoaiViPham)).ToList();
            if (newVpTypes.Count > 0)
            {
                await context.LoaiViPhams.AddRangeAsync(newVpTypes);
                await context.SaveChangesAsync();
            }

            if (await context.ViPhams.CountAsync() < 20)
            {
                var existingCount = await context.ViPhams.CountAsync();
                var violationSamples = new (string Mssv, string LoaiId, string NoiDung, string HinhThuc, string NvLap)[]
                {
                    ("6351020045", "VP_TIENGON", "Tụ tập chơi game gây ồn ào trong phòng sau 23h30", "nhacNho", "NV01"),
                    ("6551071001", "VP_VESINH", "Để rác sinh hoạt trước hành lang phòng A101 qua đêm", "nhacNho", "NV01"),
                    ("6551071002", "VP_BEPDIEN", "Sử dụng nồi lẩu điện công suất lớn trong phòng ở A102", "canhCao", "NV07"),
                    ("6651071003", "VP_GIOCAM", "Về KTX sau 23h30 không có giấy xác nhận ca làm thêm", "nhacNho", "NV05"),
                    ("6651071004", "VP_HUTTHUOC", "Hút thuốc lá điện tử tại khu vực ban công tầng 1", "khienTrach", "NV05"),
                    ("6751071005", "VP_VESINH", "Không trực nhật vệ sinh khu vực bồn rửa chung theo lịch", "nhacNho", "NV07"),
                    ("6451041006", "VP_TIENGON", "Mở loa bluetooth công suất lớn trong giờ nghỉ trưa", "nhacNho", "NV07"),
                    ("6551081007", "VP_BEPDIEN", "Cắm ấm đun siêu tốc không đúng khu vực quy định", "khienTrach", "NV01"),
                    ("6651081008", "VP_NGUOINGOAI", "Cho bạn học khác trường vào phòng khi chưa đăng ký tại bàn trực", "canhCao", "NV05"),
                    ("6751041009", "VP_GIOCAM", "Trèo rào vào KTX sau giờ đóng cổng chính 23h15", "canhCao", "NV11"),
                    ("6451021010", "VP_HUTTHUOC", "Hút thuốc lá tại cầu thang thoát hiểm tòa C01", "khienTrach", "NV05"),
                    ("6551021011", "VP_TIENGON", "Đàn hát gây ồn sau giờ giới nghiêm tại phòng C101", "nhacNho", "NV01"),
                    ("6651021012", "VP_VESINH", "Phơi quần áo chắn lối đi hành lang chung tầng 1", "nhacNho", "NV01"),
                    ("6551011013", "VP_BEPDIEN", "Tự ý câu móc dây điện ổ cắm nối dài không an toàn cháy nổ", "canhCao", "NV04"),
                    ("6651031014", "VP_GIOCAM", "Về trễ quá giờ quy định lần thứ 2 trong tháng 10/2026", "khienTrach", "NV15"),
                    ("6451071064", "VP_VESINH", "Để giày dép lấn chiếm hành lang thoát hiểm tòa B01", "nhacNho", "NV06"),
                    ("6551071015", "VP_TIENGON", "Gọi điện thoại nói chuyện lớn tiếng ngoài hành lang lúc 0h15", "nhacNho", "NV06"),
                    ("6451071088", "VP_BEPDIEN", "Sử dụng bếp từ mini nấu ăn trong phòng B201", "canhCao", "NV08"),
                    ("6551081016", "VP_VESINH", "Chưa sắp xếp chăn màn gọn gàng khi đoàn kiểm tra nội vụ", "nhacNho", "NV01"),
                    ("6251010023", "VP_NGUOINGOAI", "Đưa người lạ vào lưu trú trái phép nhiều lần, buộc chấm dứt hợp đồng", "buocRaKhoi", "NV01")
                };

                var violationsToAdd = new List<ViPham>();
                for (int i = existingCount; i < violationSamples.Length; i++)
                {
                    var v = violationSamples[i];
                    violationsToAdd.Add(new ViPham
                    {
                        MaSinhVien = v.Mssv,
                        MaLoaiViPham = v.LoaiId,
                        NgayViPham = new DateTime(2026, 9, 15).AddDays(i * 2),
                        NoiDung = v.NoiDung,
                        HinhThucXuLy = v.HinhThuc,
                        MaNhanVienLap = v.NvLap
                    });
                }

                if (violationsToAdd.Count > 0)
                {
                    await context.ViPhams.AddRangeAsync(violationsToAdd);
                    await context.SaveChangesAsync();
                }
            }

            // 11. Thông báo cho sinh viên (20 thông báo) & Yêu cầu điều chỉnh hồ sơ
            if (await context.ThongBaos.CountAsync() < 20)
            {
                var existingCount = await context.ThongBaos.CountAsync();
                var notifs = new List<ThongBao>();
                var notifTemplates = new (string Title, string Content, string Type, string Link)[]
                {
                    ("Thông báo phát hành hóa đơn tháng 10/2026", "Hóa đơn tiền phòng và điện nước tháng 10/2026 đã được cập nhật. Sinh viên vui lòng kiểm tra và thanh toán đúng hạn.", "hoaDon", "/student/invoice"),
                    ("Lịch kiểm tra an toàn điện và PCCC định kỳ", "Ban Quản lý KTX phối hợp cùng Tổ Kỹ thuật kiểm tra an toàn thiết bị điện tại các tòa A01, A02, B01 vào sáng thứ Bảy.", "chung", "/student/support"),
                    ("Xác nhận hoàn tất thanh toán phí nội trú", "Hệ thống đã ghi nhận khoản thanh toán hóa đơn tháng 10/2026 của bạn qua cổng VietinBank.", "thanhToan", "/student/invoice"),
                    ("Nhắc nhở thực hiện nội quy giờ đóng mở cửa KTX", "Cổng chính KTX UTC2 đóng lúc 23h00 hàng ngày. Sinh viên đi làm thêm về trễ cần đăng ký trước với Giám thị tòa nhà.", "chung", "/student/support"),
                    ("Cập nhật tiến độ xử lý yêu cầu sửa chữa", "Yêu cầu sửa chữa vòi nước phòng A101 đã được phân công cho kỹ thuật viên phụ trách tòa nhà.", "suaChua", "/student/maintenance")
                };

                string[] targetStudents = ["6451071012", "6451071088", "6351020045", "6551071001", "6451071064"];
                for (int i = existingCount; i < 20; i++)
                {
                    var tpl = notifTemplates[i % notifTemplates.Length];
                    string mssv = i < 8 ? "6451071012" : targetStudents[i % targetStudents.Length];
                    notifs.Add(new ThongBao
                    {
                        MaSinhVien = mssv,
                        TieuDe = $"{tpl.Title} (#{i + 1})",
                        NoiDung = tpl.Content,
                        Loai = tpl.Type,
                        LienKet = tpl.Link,
                        DaDoc = i % 3 == 0,
                        NgayTao = new DateTime(2026, 10, 1).AddDays(i)
                    });
                }

                if (notifs.Count > 0)
                {
                    await context.ThongBaos.AddRangeAsync(notifs);
                    await context.SaveChangesAsync();
                }
            }

            if (!await context.YeuCauDieuChinhHoSos.AnyAsync())
            {
                await context.YeuCauDieuChinhHoSos.AddRangeAsync(
                    new YeuCauDieuChinhHoSo
                    {
                        MaSinhVien = "6451071012",
                        Truong = "doiTuongUuTien",
                        GiaTriMoi = "Con thương binh hạng 2/4",
                        LyDo = "Bổ sung giấy xác nhận ưu tiên chính sách mới cấp năm 2026",
                        TrangThai = "daDuyet",
                        NgayGui = new DateTime(2026, 9, 12),
                        MaNhanVienDuyet = "NV01",
                        NgayDuyet = new DateTime(2026, 9, 13),
                        GhiChu = "Đã đối chiếu bản chính hợp lệ"
                    },
                    new YeuCauDieuChinhHoSo
                    {
                        MaSinhVien = "6451071012",
                        Truong = "cccd",
                        GiaTriMoi = "079205001842",
                        LyDo = "Cập nhật căn cước gắn chip mới đổi",
                        TrangThai = "choDuyet",
                        NgayGui = new DateTime(2026, 10, 20)
                    }
                );
                await context.SaveChangesAsync();
            }

            await RefreshDemoTestScenariosAsync(context);
        }

        private static async Task RefreshDemoTestScenariosAsync(ApplicationDbContext context)
        {
            var now = DateTime.Now;
            var today = DateTime.Today;

            // 1. Chuẩn hóa giới tính ('nam' / 'nu') để tránh hiển thị sai giới tính
            var invalidGenderStudents = await context.SinhViens
                .Where(s => s.GioiTinh != "nam" && s.GioiTinh != "nu")
                .ToListAsync();
            foreach (var sv in invalidGenderStudents)
            {
                sv.GioiTinh = string.Equals(sv.GioiTinh?.Trim(), "nam", StringComparison.OrdinalIgnoreCase)
                    ? "nam"
                    : "nu";
            }

            // 2. Đảm bảo đủ 3 đợt đăng ký (Đang mở, Sắp mở, Đã đóng)
            var mainRound = await context.DotDangKys.FirstOrDefaultAsync(d => d.MaDotDangKy == "DOT_K65_2026");
            if (mainRound != null)
            {
                if (mainRound.NgayDong < today.AddMonths(2))
                {
                    mainRound.NgayDong = today.AddMonths(4);
                }
            }

            if (!await context.DotDangKys.AnyAsync(d => d.MaDotDangKy == "DOT_BS_2026"))
            {
                await context.DotDangKys.AddAsync(new DotDangKy
                {
                    MaDotDangKy = "DOT_BS_2026",
                    TenDot = "Đợt xét tuyển bổ sung đầu khóa Năm học 2026-2027",
                    MaKyHoc = "HK1_2026_2027",
                    NgayMo = new DateTime(2026, 8, 1),
                    NgayDong = new DateTime(2026, 9, 15)
                });
            }

            if (!await context.DotDangKys.AnyAsync(d => d.MaDotDangKy == "DOT_HK2_2027"))
            {
                await context.DotDangKys.AddAsync(new DotDangKy
                {
                    MaDotDangKy = "DOT_HK2_2027",
                    TenDot = "Đợt đăng ký nội trú Học kỳ 2 Năm học 2026-2027",
                    MaKyHoc = "HK1_2026_2027",
                    NgayMo = today.AddDays(45),
                    NgayDong = today.AddDays(90)
                });
            }

            // 3. Tự động gia hạn thời gian giữ chỗ 24h cho 3 tài khoản demo giữ chỗ (sv_huy, sv_han, sv_kiet) nếu bị quá hạn
            var reservationScenarios = new (string DonId, string ContractId, string InvoiceId, int HoursLeft, string? ProofImg, string? RejectReason)[]
            {
                ("DK-004", "HD-2026-004", "HD-GC-004", 23, null, null),
                ("DK-005", "HD-2026-005", "HD-GC-005", 22, "proof_sv05_dk.png", null),
                ("DK-006", "HD-2026-006", "HD-GC-006", 21, "proof_sv06_rej.png", "Ảnh minh chứng bị mờ, vui lòng chụp rõ số tiền và mã giao dịch")
            };

            foreach (var item in reservationScenarios)
            {
                var don = await context.DonDangKys.FirstOrDefaultAsync(d => d.MaDonDangKy == item.DonId);
                var hd = await context.HopDongs.FirstOrDefaultAsync(h => h.MaHopDong == item.ContractId);
                var inv = await context.HoaDons.FirstOrDefaultAsync(i => i.MaHoaDon == item.InvoiceId);

                if (don != null && (don.TrangThai == "hetHan" || (hd != null && hd.HanGiuCho <= now.AddHours(2))))
                {
                    don.TrangThai = "daDuyet";
                    don.MaDotDangKy = "DOT_K65_2026";
                    don.NgayDuyet = now.AddHours(-1);
                }

                if (hd != null && (hd.TrangThai == "daHuy" || hd.HanGiuCho == null || hd.HanGiuCho <= now.AddHours(2)))
                {
                    hd.TrangThai = "choThanhToan";
                    hd.HanGiuCho = now.AddHours(item.HoursLeft);
                    hd.NgayBatDau = today;
                }

                if (inv != null && (inv.TrangThai == "daHuy" || inv.HanThanhToan <= today))
                {
                    inv.TrangThai = "chuaThanhToan";
                    inv.HanThanhToan = today.AddDays(1);
                    inv.AnhMinhChung = item.ProofImg;
                    inv.NgayNopMinhChung = item.ProofImg != null ? now.AddMinutes(-35) : null;
                    inv.LyDoTuChoiMinhChung = item.RejectReason;
                    inv.NgayTuChoiMinhChung = item.RejectReason != null ? now.AddMinutes(-15) : null;
                }
            }

            await context.SaveChangesAsync();
        }
    }
}
