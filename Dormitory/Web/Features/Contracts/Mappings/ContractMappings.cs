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

            string roomNum = phong != null ? phong.MaPhong.Split('_').Last() : "A101";
            string bedNum = h.Giuong != null ? $"G0{h.Giuong.SoThuTu}" : "G01";
            string buildingId = toa?.MaToaNha ?? "A";

            int remainingDays = (h.TrangThai == "daKetThuc")
                ? 0
                : Math.Max(0, (int)(h.NgayKetThuc - DateTime.Today).TotalDays);

            string status;
            string? statusNote = null;

            if (h.TrangThai == "daKetThuc")
            {
                status = "Đã thanh lý";
                statusNote = "Đã tất toán";
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
                StudentName = h.SinhVien?.HoTen ?? "Sinh viên",
                Mssv = h.MaSinhVien,
                AvatarInitials = initials,
                Gender = h.SinhVien?.GioiTinh == "nu" ? "Nữ" : "Nam",
                RoomNumber = roomNum,
                BedNumber = bedNum,
                BuildingId = buildingId,
                StartDate = h.NgayBatDau.ToString("dd/MM/yyyy"),
                EndDate = h.NgayKetThuc.ToString("dd/MM/yyyy"),
                RemainingDays = remainingDays,
                MonthlyFee = h.GiaThueThang,
                DepositAmount = h.TienCoc,
                DepositStatus = (h.TrangThai == "daKetThuc") ? "Đã hoàn" : "Đã nộp",
                Status = status,
                StatusNote = statusNote
            };
        }
    }
}

