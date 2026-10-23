using Dormitory.Web.Features.Contracts.DTOs;
using Dormitory.Web.Features.Contracts.Entities;

namespace Dormitory.Web.Features.Contracts.Mappings
{
    public static class ContractMappings
    {
        public static ContractListItemDto ToContractListItemDto(this HopDong h)
        {
            var phong = h.Giuong?.Phong;
            var toa = phong?.ToaNha;

            string roomNum = phong != null ? phong.MaPhong.Split('_').Last() : string.Empty;
            string bedNum = h.Giuong != null ? $"G{h.Giuong.SoThuTu}" : string.Empty;
            string buildingId = toa?.MaToaNha ?? string.Empty;

            int remainingDays = (h.TrangThai == "daKetThuc")
                ? 0
                : Math.Max(0, (int)(h.NgayKetThuc - DateTime.Today).TotalDays);

            string status;
            string? statusNote = null;

            if (h.TrangThai == "daKetThuc")
            {
                status = "Đã thanh lý";
                statusNote = "Hợp đồng đã kết thúc";
            }
            else if (remainingDays <= 15)
            {
                status = "Sắp hết hạn";
                statusNote = $"Sắp hết hạn {remainingDays} ngày";
            }
            else
            {
                status = "Hiệu lực";
            }

            string initials = "SV";
            if (!string.IsNullOrEmpty(h.SinhVien?.HoTen))
            {
                var parts = h.SinhVien.HoTen.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length >= 2)
                    initials = $"{parts[^2][0]}{parts[^1][0]}".ToUpper();
                else if (parts.Length == 1)
                    initials = parts[0][0].ToString().ToUpper();
            }

            return new ContractListItemDto
            {
                Id = h.MaHopDong,
                ContractNumber = h.MaHopDong,
                StudentId = h.MaSinhVien,
                StudentName = h.SinhVien?.HoTen ?? string.Empty,
                Mssv = h.MaSinhVien,
                AvatarInitials = initials,
                Gender = h.SinhVien?.GioiTinh switch
                {
                    "nu" => "Nữ",
                    "nam" => "Nam",
                    _ => "—"
                },
                RoomNumber = roomNum,
                BedNumber = bedNum,
                BuildingId = buildingId,
                StartDate = h.NgayBatDau.ToString("dd/MM/yyyy"),
                EndDate = h.NgayKetThuc.ToString("dd/MM/yyyy"),
                RemainingDays = remainingDays,
                MonthlyFee = h.GiaThueThang,
                DepositAmount = h.TienCoc,
                DepositStatus = h.TienCoc > 0 ? "Theo hợp đồng" : "Chưa ghi nhận",
                Status = status,
                StatusNote = statusNote
            };
        }
    }
}
