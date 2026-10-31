using Microsoft.AspNetCore.Http;

namespace Dormitory.Web.Features.StudentPortal.DTOs
{
    // 1. Dashboard
    public class StudentDashboardDto
    {
        public string RegistrationState { get; set; } = string.Empty;
        public StudentDashboardRoomDto? Room { get; set; }
        public decimal AmountDue { get; set; }
        public string? NextDueDate { get; set; }
        public int UnpaidInvoiceCount { get; set; }
        public int UnreadNotificationCount { get; set; }
        public int OpenMaintenanceCount { get; set; }
        public string? HoldDeadline { get; set; }
    }

    public class StudentDashboardRoomDto
    {
        public string Toa { get; set; } = string.Empty;
        public string Phong { get; set; } = string.Empty;
        public string Giuong { get; set; } = string.Empty;
        public string? NgayNhanPhong { get; set; }
    }

    // 2. Profile & Guardians & Request
    public class StudentProfileDto
    {
        public string Mssv { get; set; } = string.Empty;
        public string HoTen { get; set; } = string.Empty;
        public string NgaySinh { get; set; } = string.Empty;
        public string GioiTinh { get; set; } = string.Empty;
        public string Cccd { get; set; } = string.Empty;
        public string? DienThoai { get; set; }
        public string? Email { get; set; }
        public string? DiaChiThuongTru { get; set; }
        public string MaLop { get; set; } = string.Empty;
        public string? TenKhoa { get; set; }
        public int NamNhapHoc { get; set; }
        public string? DoiTuongUuTien { get; set; }
        public string TrangThai { get; set; } = string.Empty;
    }

    public class UpdateProfileDto
    {
        public string? DienThoai { get; set; }
        public string? Email { get; set; }
        public string? DiaChiThuongTru { get; set; }
    }

    public class GuardianDto
    {
        public string Id { get; set; } = string.Empty;
        public string HoTen { get; set; } = string.Empty;
        public string QuanHe { get; set; } = string.Empty;
        public string MoiQuanHe { get => QuanHe; set => QuanHe = value; }
        public string DienThoai { get; set; } = string.Empty;
        public bool LaLienHeKhanCap { get; set; }
    }

    public class CreateGuardianDto
    {
        public string HoTen { get; set; } = string.Empty;
        public string QuanHe { get; set; } = string.Empty;
        public string MoiQuanHe { get => QuanHe; set => QuanHe = value; }
        public string DienThoai { get; set; } = string.Empty;
        public bool LaLienHeKhanCap { get; set; }
    }

    public class ProfileChangeRequestDto
    {
        public int Id { get; set; }
        public string Truong { get; set; } = string.Empty;
        public string GiaTriMoi { get; set; } = string.Empty;
        public string LyDo { get; set; } = string.Empty;
        public string TrangThai { get; set; } = string.Empty;
        public string NgayGui { get; set; } = string.Empty;
        public string? NgayDuyet { get; set; }
        public string? GhiChu { get; set; }
    }

    public class CreateProfileChangeRequestDto
    {
        public string Truong { get; set; } = string.Empty;
        public string GiaTriMoi { get; set; } = string.Empty;
        public string LyDo { get; set; } = string.Empty;
    }

    public class ChangePasswordRequestDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    // 3. Rounds & Buildings & Rooms
    public class RegistrationRoundDto
    {
        public string Id { get; set; } = string.Empty;
        public string TenDot { get; set; } = string.Empty;
        public string MaKyHoc { get; set; } = string.Empty;
        public string NgayMo { get; set; } = string.Empty;
        public string NgayDong { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // sapMo, dangMo, daDong
        public bool Eligible { get; set; }
        public List<string> Reasons { get; set; } = new();
    }

    public class StudentBuildingDto
    {
        public string Id { get; set; } = string.Empty;
        public string TenToaNha { get; set; } = string.Empty;
        public string GioiTinhQuyDinh { get; set; } = string.Empty;
        public int SoTang { get; set; }
        public int TotalRooms { get; set; }
        public int AvailableRooms { get; set; }
    }

    public class StudentRoomDto
    {
        public string Id { get; set; } = string.Empty;
        public string MaPhong { get; set; } = string.Empty;
        public string TenLoaiPhong { get; set; } = string.Empty;
        public decimal GiaThueThang { get; set; }
        public int SucChua { get; set; }
        public int AvailableBedsCount { get; set; }
        public bool Selectable { get; set; }
        public string? UnselectableReason { get; set; }
    }

    // 4. Applications
    public class SubmitApplicationRequestDto
    {
        public string MaDotDangKy { get; set; } = string.Empty;
        public string MaPhong { get; set; } = string.Empty;
        public bool AcceptRules { get; set; }
    }

    public class StudentApplicationDto
    {
        public string Id { get; set; } = string.Empty;
        public string MaDonDangKy { get; set; } = string.Empty;
        public string MaDotDangKy { get; set; } = string.Empty;
        public string TenDot { get; set; } = string.Empty;
        public string? MaPhong { get; set; }
        public string? TenToaNha { get; set; }
        public string? TenLoaiPhong { get; set; }
        public decimal? GiaThueThang { get; set; }
        public string NgayDangKy { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty; // 1 trong 6 trang thai
        public string? RejectionReason { get; set; }
        public string? HanGiuCho { get; set; }
        public string? AssignedBed { get; set; }
        public bool CanPay { get; set; }
    }

    public class ApplicationPaymentInfoDto
    {
        public PaymentInvoiceDto? Invoice { get; set; }
        public string Deadline { get; set; } = string.Empty;
        public string ServerNow { get; set; } = string.Empty;
        public VietQrDto? Qr { get; set; }
        public string Verification { get; set; } = "dangChoXacMinh"; // dangChoXacMinh, daXacNhan, hetHan
        public string? Message { get; set; }
    }

    public class PaymentInvoiceDto
    {
        public string Code { get; set; } = string.Empty;
        public List<PaymentInvoiceLineDto> Lines { get; set; } = new();
        public decimal Total { get; set; }
    }

    public class PaymentInvoiceLineDto
    {
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }

    public class VietQrDto
    {
        public string ImageUrl { get; set; } = string.Empty;
        public string BankId { get; set; } = string.Empty;
        public string AccountNo { get; set; } = string.Empty;
        public string AccountName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Content { get; set; } = string.Empty;
    }

    // 5. Contracts
    public class StudentContractDto
    {
        public string Id { get; set; } = string.Empty;
        public string MaHopDong { get; set; } = string.Empty;
        public string ToaNha { get; set; } = string.Empty;
        public string Phong { get; set; } = string.Empty;
        public string Giuong { get; set; } = string.Empty;
        public string NgayBatDau { get; set; } = string.Empty;
        public string NgayKetThuc { get; set; } = string.Empty;
        public string? NgayNhanPhongThucTe { get; set; }
        public decimal GiaThueThang { get; set; }
        public decimal TienCoc { get; set; }
        public decimal PhanTramMienGiam { get; set; }
        public string Status { get; set; } = string.Empty;
        public string StatusCode { get; set; } = string.Empty;
        public bool CheckedIn { get; set; }
    }

    // 6. Invoices & Utilities
    public class StudentInvoiceListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string MaHoaDon { get; set; } = string.Empty;
        public int Thang { get; set; }
        public int Nam { get; set; }
        public string NgayLap { get; set; } = string.Empty;
        public string HanThanhToan { get; set; } = string.Empty;
        public string TrangThai { get; set; } = string.Empty;
        public decimal TongTien { get; set; }
        public decimal DaThanhToan { get; set; }
        public decimal ConLai { get; set; }
        public bool IsRegistration { get; set; }
    }

    public class StudentInvoiceDetailDto : StudentInvoiceListItemDto
    {
        public List<PaymentInvoiceLineDto> Lines { get; set; } = new();
        public List<StudentPaymentReceiptDto> Payments { get; set; } = new();
    }

    public class StudentPaymentReceiptDto
    {
        public string MaThanhToan { get; set; } = string.Empty;
        public decimal SoTien { get; set; }
        public string NgayThanhToan { get; set; } = string.Empty;
        public string PhuongThuc { get; set; } = string.Empty;
        public string? GhiChu { get; set; }
    }

    public class StudentUtilityDto
    {
        public List<StudentMeterReadingDto> MeterReadings { get; set; } = new();
        public List<StudentRegisteredServiceDto> RegisteredServices { get; set; } = new();
    }

    public class StudentMeterReadingDto
    {
        public int Thang { get; set; }
        public int Nam { get; set; }
        public decimal ChiSoDienCu { get; set; }
        public decimal ChiSoDienMoi { get; set; }
        public decimal DienTieuThu { get; set; }
        public decimal ChiSoNuocCu { get; set; }
        public decimal ChiSoNuocMoi { get; set; }
        public decimal NuocTieuThu { get; set; }
        public string? NgayGhi { get; set; }
    }

    public class StudentRegisteredServiceDto
    {
        public string TenDichVu { get; set; } = string.Empty;
        public decimal DonGia { get; set; }
        public int SoLuong { get; set; }
        public string NgayBatDau { get; set; } = string.Empty;
        public string? NgayKetThuc { get; set; }
    }

    // 7. Maintenance
    public class StudentMaintenanceDto
    {
        public int Id { get; set; }
        public string MaPhong { get; set; } = string.Empty;
        public string? TenTaiSan { get; set; }
        public string? LoaiSuCo { get; set; }
        public string? MucDoKhanCap { get; set; }
        public string MoTa { get; set; } = string.Empty;
        public string NgayGui { get; set; } = string.Empty;
        public string TrangThai { get; set; } = string.Empty;
        public string TrangThaiText { get; set; } = string.Empty;
        public string? PhanHoi { get; set; }
        public bool HasImage { get; set; }
    }

    public class CreateMaintenanceRequestDto
    {
        public string? LoaiSuCo { get; set; }
        public string? MucDoKhanCap { get; set; }
        public string MoTa { get; set; } = string.Empty;
        public IFormFile? Image { get; set; }
    }

    // 8. Violations
    public class StudentViolationDto
    {
        public int Id { get; set; }
        public string TenLoaiViPham { get; set; } = string.Empty;
        public string MucDo { get; set; } = string.Empty;
        public string NgayViPham { get; set; } = string.Empty;
        public string MoTa { get; set; } = string.Empty;
        public string HinhThucXuLy { get; set; } = string.Empty;
        public decimal TienPhat { get; set; }
        public bool DaNopPhat { get; set; }
    }

    // 9. Notifications
    public class StudentNotificationDto
    {
        public int Id { get; set; }
        public string TieuDe { get; set; } = string.Empty;
        public string NoiDung { get; set; } = string.Empty;
        public string Loai { get; set; } = string.Empty;
        public string? LienKet { get; set; }
        public bool DaDoc { get; set; }
        public string NgayTao { get; set; } = string.Empty;
    }

    public class BroadcastNotificationDto
    {
        public string? ToaNha { get; set; }
        public string TieuDe { get; set; } = string.Empty;
        public string NoiDung { get; set; } = string.Empty;
    }

    // 10. Support Info
    public class StudentSupportInfoDto
    {
        public string Regulations { get; set; } = string.Empty;
        public string RegistrationGuide { get; set; } = string.Empty;
        public string PaymentGuide { get; set; } = string.Empty;
        public string CheckInOutProcess { get; set; } = string.Empty;
        public string ContactInfo { get; set; } = string.Empty;
    }
}
