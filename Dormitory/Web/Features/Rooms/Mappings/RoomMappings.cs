using Dormitory.Web.Features.Rooms.DTOs;
using Dormitory.Web.Features.Rooms.Entities;

namespace Dormitory.Web.Features.Rooms.Mappings
{
    public static class RoomMappings
    {
        public static RoomListItemDto ToRoomListItemDto(this Phong p)
        {
            string roomNum = p.MaPhong.Split('_').Last();
            int capacity = p.LoaiPhong?.SoNguoiToiDa ?? 8;
            decimal price = p.LoaiPhong?.GiaThueThang ?? 500000;

            var beds = p.DanhSachGiuong.OrderBy(g => g.SoThuTu).Select(g =>
            {
                var activeContract = g.DanhSachHopDong?.FirstOrDefault(h => h.TrangThai == "hieuLuc");
                string bedStatus = !g.LaDangHoat
                    ? "Bảo trì"
                    : (activeContract != null ? "Đang ở" : "Giường trống");

                return new BedItemDto
                {
                    Id = g.MaGiuong,
                    BedNumber = $"G{g.SoThuTu}",
                    StudentId = activeContract?.MaSinhVien,
                    StudentName = activeContract?.SinhVien?.HoTen,
                    Mssv = activeContract?.MaSinhVien,
                    Status = bedStatus
                };
            }).ToList();

            if (beds.Count == 0)
            {
                for (int i = 1; i <= 8; i++)
                {
                    beds.Add(new BedItemDto
                    {
                        Id = $"{p.MaPhong}_G{i}",
                        BedNumber = $"G{i}",
                        Status = "Giường trống"
                    });
                }
            }

            int occupied = beds.Count(b => b.Status == "Đang ở");
            bool isMaint = p.TrangThai == "baoTri" || beds.Any(b => b.Status == "Bảo trì");
            string roomStatus = isMaint ? "Bảo trì" : (occupied >= capacity ? "Đầy" : "Còn chỗ");

            return new RoomListItemDto
            {
                Id = p.MaPhong,
                BuildingId = p.MaToaNha,
                BuildingName = p.ToaNha?.TenToaNha ?? $"Tòa {p.MaToaNha}",
                Floor = p.SoTang,
                RoomNumber = roomNum,
                Capacity = capacity,
                Occupied = occupied,
                Gender = p.ToaNha?.GioiTinhQuyDinh == "nu" ? "Nữ" : "Nam",
                RoomType = p.LoaiPhong?.TenLoaiPhong ?? "Tiêu chuẩn",
                PricePerMonth = price,
                Status = roomStatus,
                Beds = beds
            };
        }
    }
}

