using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Buildings.Entities;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.Utilities.Entities;
using Dormitory.Web.Features.Violations.Entities;

namespace Dormitory.Web.Data.Seeding
{
    public static class ReferenceDataSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            // 1. Năm học & Kỳ học
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

            // 2. Tòa nhà
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

            // 3. Loại phòng
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

            // 4. Phòng & Giường (48 phòng và 384 giường)
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

            // 5. Giá điện nước
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

            // 6. Dịch vụ
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

            // 7. Loại vi phạm
            if (!await context.LoaiViPhams.AnyAsync())
            {
                var vp = new LoaiViPham
                {
                    MaLoaiViPham = "VP_BEPDIEN",
                    TenLoaiViPham = "Sử dụng thiết bị nhiệt / bếp điện trái phép",
                    MucDo = "trungBinh",
                    DiemTru = 5,
                    MucPhatTien = 200000
                };
                await context.LoaiViPhams.AddAsync(vp);
                await context.SaveChangesAsync();
            }
        }
    }
}

