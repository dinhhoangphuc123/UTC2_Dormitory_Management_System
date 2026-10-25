using Dormitory.Web.Features.Students.DTOs;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Features.Academic.Mappings;

namespace Dormitory.Web.Features.Students.Mappings
{
    public static class StudentMappings
    {
        public static SinhVienListItemDto ToSinhVienListItemDto(this SinhVien s)
        {
            var selectedYearContract = s.DanhSachHopDong?
                .OrderByDescending(h => h.NgayBatDau)
                .FirstOrDefault();
            var activeContract = s.DanhSachHopDong?.FirstOrDefault(h =>
                h.TrangThai == "hieuLuc" && h.NgayBatDau <= DateTime.Today &&
                (h.NgayTraPhongThucTe ?? h.NgayKetThuc) >= DateTime.Today);
            var displayedContract = activeContract ?? selectedYearContract;
            var phong = displayedContract?.Giuong?.Phong;
            var toa = phong?.ToaNha;
            var invoices = s.DanhSachHopDong?.SelectMany(h => h.DanhSachHoaDon).ToList() ?? [];
            var debtAmount = invoices.Sum(i => Math.Max(
                0,
                i.DanhSachChiTietHoaDon.Sum(line => line.ThanhTien ?? line.SoLuong * line.DonGia) -
                i.DanhSachThanhToan.Sum(p => p.SoTien)));

            string roomNumber = phong != null ? phong.MaPhong.Split('_').Last() : "Chưa xếp";
            string bedNumber = displayedContract?.Giuong != null ? $"G{displayedContract.Giuong.SoThuTu}" : "—";
            string buildingId = toa?.MaToaNha ?? "";
            int floor = phong?.SoTang ?? 0;

            string cohortStr = AcademicMappings.GetCohortCode(s.MaLop, s.NamNhapHoc).ToUpperInvariant();

            return new SinhVienListItemDto
            {
                Id = s.MaSinhVien,
                Mssv = s.MaSinhVien,
                Name = s.HoTen,
                Cccd = s.Cccd,
                AvatarUrl = "",
                Gender = s.GioiTinh switch
                {
                    "nu" => "Nữ",
                    "nam" => "Nam",
                    _ => "—"
                },
                Cohort = cohortStr,
                Major = s.LopHoc?.TenKhoa ?? "—",
                ClassName = s.LopHoc?.TenLop ?? s.MaLop,
                BuildingId = buildingId,
                Floor = floor,
                RoomNumber = roomNumber,
                BedNumber = bedNumber,
                Phone = s.DienThoai ?? "—",
                Hometown = s.DiaChiThuongTru ?? "—",
                PaymentStatus = invoices.Count == 0 ? "Chưa có hóa đơn" : debtAmount > 0 ? "Nợ" : "Đủ",
                DebtAmount = debtAmount,
                ResidenceStatus = activeContract != null ? "Đang ở" : selectedYearContract != null ? "Đã nội trú" : "Chưa nội trú",
                AdmissionDate = displayedContract?.NgayBatDau.ToString("dd/MM/yyyy") ?? "—",
                BirthDate = s.NgaySinh.ToString("dd/MM/yyyy"),
                PriorityCategory = s.DoiTuongUuTien
            };
        }
    }
}
