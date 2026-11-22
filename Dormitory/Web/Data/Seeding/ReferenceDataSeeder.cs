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

            // 3. Loại phòng — đúng 4 loại: Tiêu chuẩn Nam/Nữ và Chất lượng cao Nam/Nữ
            {
                var chuanLoaiPhongs = new List<LoaiPhong>
                {
                    new() { MaLoaiPhong = "LP_TC_NAM", TenLoaiPhong = "Tiêu chuẩn Nam 8 chỗ", SoNguoiToiDa = 8, GiaThueThang = 500000, CoDieuHoa = false, CoNhaVeSinhRieng = true },
                    new() { MaLoaiPhong = "LP_TC_NU", TenLoaiPhong = "Tiêu chuẩn Nữ 8 chỗ", SoNguoiToiDa = 8, GiaThueThang = 500000, CoDieuHoa = false, CoNhaVeSinhRieng = true },
                    new() { MaLoaiPhong = "LP_CLC", TenLoaiPhong = "Chất lượng cao Nam 8 chỗ", SoNguoiToiDa = 8, GiaThueThang = 700000, CoDieuHoa = true, CoNhaVeSinhRieng = true },
                    new() { MaLoaiPhong = "LP_CLC_NU", TenLoaiPhong = "Chất lượng cao Nữ 8 chỗ", SoNguoiToiDa = 8, GiaThueThang = 700000, CoDieuHoa = true, CoNhaVeSinhRieng = true }
                };

                var existingRoomTypeCodes = await context.LoaiPhongs.Select(l => l.MaLoaiPhong).ToHashSetAsync();
                var missingRoomTypes = chuanLoaiPhongs.Where(l => !existingRoomTypeCodes.Contains(l.MaLoaiPhong)).ToList();
                bool roomTypeChanged = missingRoomTypes.Count > 0;
                if (missingRoomTypes.Count > 0)
                {
                    await context.LoaiPhongs.AddRangeAsync(missingRoomTypes);
                }

                // DB đã seed trước đây: LP_CLC đang mang tên chung, cập nhật lại cho rõ giới tính.
                var legacyClc = await context.LoaiPhongs.FirstOrDefaultAsync(l => l.MaLoaiPhong == "LP_CLC");
                if (legacyClc != null && legacyClc.TenLoaiPhong != "Chất lượng cao Nam 8 chỗ")
                {
                    legacyClc.TenLoaiPhong = "Chất lượng cao Nam 8 chỗ";
                    legacyClc.CoDieuHoa = true;
                    roomTypeChanged = true;
                }

                if (roomTypeChanged)
                {
                    await context.SaveChangesAsync();
                }
            }

            // 4. Phòng & Giường (61 phòng và 488 giường)
            if (!await context.Phongs.AnyAsync())
            {
                var buildings = new[]
                {
                    new { Id = "A01", Floors = 4, RoomsPerFloor = 4, Loai = "LP_TC_NAM", HighTierTopFloor = false },
                    new { Id = "A02", Floors = 4, RoomsPerFloor = 3, Loai = "LP_TC_NAM", HighTierTopFloor = false },
                    new { Id = "B01", Floors = 4, RoomsPerFloor = 3, Loai = "LP_TC_NU", HighTierTopFloor = true },
                    new { Id = "B02", Floors = 4, RoomsPerFloor = 3, Loai = "LP_TC_NU", HighTierTopFloor = true },
                    new { Id = "C01", Floors = 3, RoomsPerFloor = 3, Loai = "LP_CLC", HighTierTopFloor = false }
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
                            // Tầng trên cùng của tòa nữ là phòng Chất lượng cao Nữ
                            string loaiPhongId = (b.HighTierTopFloor && f == b.Floors) ? "LP_CLC_NU" : b.Loai;

                            var p = new Phong
                            {
                                MaPhong = maPhong,
                                MaToaNha = b.Id,
                                MaLoaiPhong = loaiPhongId,
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

            // 4b. DB đã seed trước đây chỉ có 3 loại phòng: chuyển tầng trên cùng của các tòa nữ
            // sang loại "Chất lượng cao Nữ" để dashboard luôn đủ 4 loại phòng.
            if (!await context.Phongs.AnyAsync(p => p.MaLoaiPhong == "LP_CLC_NU"))
            {
                var nuBuildings = await context.ToaNhas
                    .Where(t => t.GioiTinhQuyDinh == "nu")
                    .Select(t => t.MaToaNha)
                    .ToListAsync();

                var roomsToConvert = new List<Phong>();
                foreach (var maToaNha in nuBuildings)
                {
                    var topFloor = await context.Phongs
                        .Where(p => p.MaToaNha == maToaNha)
                        .MaxAsync(p => (int?)p.SoTang);
                    if (topFloor == null) continue;

                    roomsToConvert.AddRange(await context.Phongs
                        .Where(p => p.MaToaNha == maToaNha && p.SoTang == topFloor.Value)
                        .ToListAsync());
                }

                if (roomsToConvert.Count > 0)
                {
                    foreach (var phong in roomsToConvert)
                    {
                        phong.MaLoaiPhong = "LP_CLC_NU";
                    }
                    await context.SaveChangesAsync();
                }
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
            {
                // Thêm từng bản ghi theo mã: DB đã seed trước đây vẫn nhận được dịch vụ mới (DV_TRASH).
                var dichVus = new List<DichVu>
                {
                    new() { MaDichVu = "DV_INTERNET", TenDichVu = "Wifi Tốc độ cao", DonViTinh = "thang", DonGia = 50000, LaDangHoat = true },
                    new() { MaDichVu = "DV_TRASH", TenDichVu = "Vệ sinh & Rác", DonViTinh = "thang", DonGia = 30000, LaDangHoat = true },
                    new() { MaDichVu = "DV_GUIXE", TenDichVu = "Gửi xe máy nội trú", DonViTinh = "thang", DonGia = 70000, LaDangHoat = true },
                    new() { MaDichVu = "DV_GIATLA", TenDichVu = "Gói giặt sấy tự động", DonViTinh = "thang", DonGia = 80000, LaDangHoat = true }
                };
                var existingServiceCodes = await context.DichVus.Select(d => d.MaDichVu).ToHashSetAsync();
                var missingServices = dichVus.Where(d => !existingServiceCodes.Contains(d.MaDichVu)).ToList();
                if (missingServices.Count > 0)
                {
                    await context.DichVus.AddRangeAsync(missingServices);
                    await context.SaveChangesAsync();
                }
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

