using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Features.Utilities.DTOs;
using Dormitory.Web.Features.Utilities.Entities;
using Dormitory.Web.Shared.Constants;

namespace Dormitory.Web.Features.Utilities.Services
{
    public class DichVuService : IDichVuService
    {
        private readonly ApplicationDbContext _context;

        public DichVuService(ApplicationDbContext context)
        {
            _context = context;
        }

        // ============ DANH MỤC DỊCH VỤ (BQL quản lý) ============

        public async Task<List<ServiceItemDto>> GetCatalogAsync()
        {
            var services = await _context.DichVus
                .Include(d => d.DanhSachDangKyDichVu)
                .OrderBy(d => d.MaDichVu)
                .AsSplitQuery()
                .ToListAsync();

            return services.Select(s => new ServiceItemDto
            {
                Id = s.MaDichVu,
                Name = s.TenDichVu,
                Unit = s.DonViTinh,
                Price = s.DonGia,
                IsActive = s.LaDangHoat,
                ActiveRegistrations = s.DanhSachDangKyDichVu.Count(r => r.TrangThai == AppDefaults.ServiceActive)
            }).ToList();
        }

        public async Task<(bool Success, string? ErrorMessage, ServiceItemDto? Data)> CreateServiceAsync(SaveServiceDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Name))
                return (false, "Tên dịch vụ không được để trống.", null);
            if (req.Name.Trim().Length > 100)
                return (false, "Tên dịch vụ không được vượt quá 100 ký tự.", null);
            if (string.IsNullOrWhiteSpace(req.Unit))
                return (false, "Đơn vị tính không được để trống.", null);
            if (req.Unit.Trim().Length > 30)
                return (false, "Đơn vị tính không được vượt quá 30 ký tự.", null);
            if (req.Price < 0)
                return (false, "Đơn giá dịch vụ không được âm.", null);
            if (req.Price == 0 || req.Price > 100_000_000m)
                return (false, "Đơn giá dịch vụ phải lớn hơn 0 và không vượt quá 100.000.000 đ.", null);

            string id = $"DV_{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
            var service = new DichVu
            {
                MaDichVu = id,
                TenDichVu = req.Name.Trim(),
                DonViTinh = req.Unit.Trim(),
                DonGia = req.Price,
                LaDangHoat = req.IsActive
            };
            _context.DichVus.Add(service);
            await _context.SaveChangesAsync();
            return (true, null, ToCatalogDto(service));
        }

        public async Task<(bool Success, string? ErrorMessage, ServiceItemDto? Data)> UpdateServiceAsync(string serviceId, SaveServiceDto req)
        {
            var service = await _context.DichVus.FirstOrDefaultAsync(d => d.MaDichVu == serviceId);
            if (service == null)
                return (false, "Không tìm thấy dịch vụ.", null);
            if (string.IsNullOrWhiteSpace(req.Name))
                return (false, "Tên dịch vụ không được để trống.", null);
            if (req.Name.Trim().Length > 100)
                return (false, "Tên dịch vụ không được vượt quá 100 ký tự.", null);
            if (string.IsNullOrWhiteSpace(req.Unit))
                return (false, "Đơn vị tính không được để trống.", null);
            if (req.Unit.Trim().Length > 30)
                return (false, "Đơn vị tính không được vượt quá 30 ký tự.", null);
            if (req.Price < 0)
                return (false, "Đơn giá dịch vụ không được âm.", null);
            if (req.Price == 0 || req.Price > 100_000_000m)
                return (false, "Đơn giá dịch vụ phải lớn hơn 0 và không vượt quá 100.000.000 đ.", null);

            service.TenDichVu = req.Name.Trim();
            service.DonViTinh = req.Unit.Trim();
            service.DonGia = req.Price;
            service.LaDangHoat = req.IsActive;
            await _context.SaveChangesAsync();

            await _context.Entry(service).Collection(s => s.DanhSachDangKyDichVu).LoadAsync();
            return (true, null, ToCatalogDto(service));
        }

        public async Task<(bool Success, string? ErrorMessage)> DeleteServiceAsync(string serviceId)
        {
            var service = await _context.DichVus.FirstOrDefaultAsync(d => d.MaDichVu == serviceId);
            if (service == null)
                return (false, "Không tìm thấy dịch vụ.");

            bool referenced = await _context.DangKyDichVus.AnyAsync(r => r.MaDichVu == serviceId) ||
                              await _context.ChiTietHoaDons.AnyAsync(c => c.MaDichVu == serviceId);
            if (referenced)
                return (false, "Dịch vụ đã có đăng ký hoặc hóa đơn tham chiếu, chỉ có thể ngừng hoạt động thay vì xóa.");

            _context.DichVus.Remove(service);
            await _context.SaveChangesAsync();
            return (true, null);
        }

        // ============ ĐƠN ĐĂNG KÝ DỊCH VỤ (duyệt / từ chối) ============

        public async Task<List<ServiceRegistrationDto>> GetRegistrationsAsync(string? status, string? academicYear)
        {
            var query = _context.DangKyDichVus
                .Include(r => r.DichVu)
                .Include(r => r.HopDong)
                    .ThenInclude(h => h!.SinhVien)
                .Include(r => r.HopDong)
                    .ThenInclude(h => h!.Giuong)
                        .ThenInclude(g => g!.Phong)
                .Include(r => r.HopDong)
                    .ThenInclude(h => h!.KyHoc)
                .AsSplitQuery()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "ALL", StringComparison.OrdinalIgnoreCase))
                query = query.Where(r => r.TrangThai == status);
            if (!string.IsNullOrWhiteSpace(academicYear))
                query = query.Where(r => r.HopDong != null && r.HopDong.KyHoc != null && r.HopDong.KyHoc.MaNamHoc == academicYear);

            // Đơn chờ duyệt nổi lên đầu, phần còn lại theo ngày tạo mới nhất.
            var rows = await query
                .OrderByDescending(r => r.TrangThai == AppDefaults.ServicePending)
                .ThenByDescending(r => r.NgayBatDau)
                .ToListAsync();

            return rows.Select(ToRegistrationDto).ToList();
        }

        public async Task<(bool Success, string? ErrorMessage)> ApproveRegistrationAsync(int registrationId, string? staffId)
        {
            var registration = await _context.DangKyDichVus
                .Include(r => r.DichVu)
                .Include(r => r.HopDong)
                .FirstOrDefaultAsync(r => r.MaDangKyDV == registrationId);
            if (registration == null)
                return (false, "Không tìm thấy đơn đăng ký dịch vụ.");
            if (registration.TrangThai != AppDefaults.ServicePending)
                return (false, "Đơn này không còn ở trạng thái chờ duyệt.");

            string? validStaffId = null;
            if (!string.IsNullOrWhiteSpace(staffId))
            {
                var trimmedStaff = staffId.Trim();
                if (await _context.NhanViens.AnyAsync(n => n.MaNhanVien == trimmedStaff))
                {
                    validStaffId = trimmedStaff;
                }
            }

            registration.TrangThai = AppDefaults.ServiceActive;
            registration.MaNhanVienDuyet = validStaffId;
            registration.NgayDuyet = DateTime.Now;
            AddServiceNotification(registration.HopDong?.MaSinhVien,
                $"Đăng ký dịch vụ {registration.DichVu?.TenDichVu} đã được duyệt",
                $"BQL đã duyệt đăng ký dịch vụ {registration.DichVu?.TenDichVu} (số lượng {registration.SoLuong}, từ {registration.NgayBatDau:dd/MM/yyyy}). Phí dịch vụ sẽ xuất hiện trên hóa đơn của bạn.");

            await _context.SaveChangesAsync();
            return (true, null);
        }

        public async Task<(bool Success, string? ErrorMessage)> RejectRegistrationAsync(int registrationId, string? staffId, string? reason)
        {
            if (string.IsNullOrWhiteSpace(reason))
                return (false, "Vui lòng nhập lý do từ chối.");

            var registration = await _context.DangKyDichVus
                .Include(r => r.DichVu)
                .Include(r => r.HopDong)
                .FirstOrDefaultAsync(r => r.MaDangKyDV == registrationId);
            if (registration == null)
                return (false, "Không tìm thấy đơn đăng ký dịch vụ.");
            if (registration.TrangThai != AppDefaults.ServicePending)
                return (false, "Đơn này không còn ở trạng thái chờ duyệt.");

            string? validStaffId = null;
            if (!string.IsNullOrWhiteSpace(staffId))
            {
                var trimmedStaff = staffId.Trim();
                if (await _context.NhanViens.AnyAsync(n => n.MaNhanVien == trimmedStaff))
                {
                    validStaffId = trimmedStaff;
                }
            }

            registration.TrangThai = AppDefaults.ServiceRejected;
            registration.MaNhanVienDuyet = validStaffId;
            registration.NgayDuyet = DateTime.Now;
            registration.LyDoTuChoi = reason.Trim();
            AddServiceNotification(registration.HopDong?.MaSinhVien,
                $"Đăng ký dịch vụ {registration.DichVu?.TenDichVu} bị từ chối",
                $"BQL đã từ chối đăng ký dịch vụ {registration.DichVu?.TenDichVu}. Lý do: {reason.Trim()}");

            await _context.SaveChangesAsync();
            return (true, null);
        }

        // ============ SINH VIÊN đăng ký / hủy ============

        public async Task<(bool Success, string? ErrorMessage, int? RegistrationId)> RegisterServiceForStudentAsync(string studentId, string serviceId,
            int? soLuong = null, string? ngayBatDau = null)
        {
            var contract = await GetActiveContractAsync(studentId);
            if (contract == null)
                return (false, "Bạn chưa có hợp đồng nội trú hiệu lực nên chưa đăng ký được dịch vụ.", null);

            var service = await _context.DichVus.FirstOrDefaultAsync(d => d.MaDichVu == serviceId);
            if (service == null || !service.LaDangHoat)
                return (false, "Dịch vụ không tồn tại hoặc đã ngừng hoạt động.", null);

            int quantity = soLuong ?? 1;
            if (quantity < 1 || quantity > 10)
                return (false, "Số lượng phải từ 1 đến 10.", null);

            // Ngày bắt đầu trống thì lấy hôm nay; đã nhập thì phải là ngày hợp lệ,
            // không quá hạn hợp đồng và không phải ngày đã qua.
            DateTime startDate = DateTime.Today;
            if (!string.IsNullOrWhiteSpace(ngayBatDau))
            {
                if (!DateTime.TryParseExact(ngayBatDau.Trim(),
                        new[] { "dd/MM/yyyy", "yyyy-MM-dd" },
                        System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None, out startDate))
                    return (false, "Ngày bắt đầu không hợp lệ (định dạng dd/MM/yyyy).", null);
                if (startDate < DateTime.Today)
                    return (false, "Ngày bắt đầu không được là ngày đã qua.", null);
                if (startDate > contract.NgayKetThuc)
                    return (false, $"Ngày bắt đầu vượt quá hạn hợp đồng ({contract.NgayKetThuc:dd/MM/yyyy}).", null);
            }

            bool alreadyRequested = await _context.DangKyDichVus.AnyAsync(r =>
                r.MaHopDong == contract.MaHopDong && r.MaDichVu == serviceId &&
                (r.TrangThai == AppDefaults.ServicePending || r.TrangThai == AppDefaults.ServiceActive));
            if (alreadyRequested)
                return (false, "Bạn đã có đơn đăng ký hoặc đang dùng dịch vụ này.", null);

            var registration = new DangKyDichVu
            {
                MaHopDong = contract.MaHopDong,
                MaDichVu = serviceId,
                SoLuong = quantity,
                NgayBatDau = startDate,
                TrangThai = AppDefaults.ServicePending
            };
            _context.DangKyDichVus.Add(registration);
            await _context.SaveChangesAsync();
            return (true, null, registration.MaDangKyDV);
        }

        public async Task<(bool Success, string? ErrorMessage)> CancelServiceForStudentAsync(string studentId, int registrationId)
        {
            var registration = await _context.DangKyDichVus
                .Include(r => r.DichVu)
                .Include(r => r.HopDong)
                .FirstOrDefaultAsync(r => r.MaDangKyDV == registrationId &&
                    r.HopDong != null && r.HopDong.MaSinhVien == studentId);
            if (registration == null)
                return (false, "Không tìm thấy đơn đăng ký của bạn.");

            if (registration.TrangThai != AppDefaults.ServicePending && registration.TrangThai != AppDefaults.ServiceActive)
                return (false, "Đơn này đã kết thúc, không hủy được.");

            // Đăng ký đang dùng thì dừng từ hôm nay; đơn chờ duyệt chỉ cần đánh dấu hủy.
            registration.TrangThai = AppDefaults.ServiceCancelled;
            if (registration.NgayKetThuc == null)
                registration.NgayKetThuc = DateTime.Today;

            await _context.SaveChangesAsync();
            return (true, null);
        }

        public async Task<List<StudentServiceOptionDto>> GetStudentServicesAsync(string studentId)
        {
            var contract = await GetActiveContractAsync(studentId);
            var services = await _context.DichVus
                .Where(d => d.LaDangHoat)
                .OrderBy(d => d.MaDichVu)
                .ToListAsync();

            var myRegistrations = contract == null
                ? new List<DangKyDichVu>()
                : await _context.DangKyDichVus
                    .Where(r => r.MaHopDong == contract.MaHopDong)
                    .ToListAsync();

            return services.Select(s =>
            {
                // Ưu tiên đơn còn hiệu lực (chờ duyệt hoặc đang dùng) của chính dịch vụ đó.
                var current = myRegistrations
                    .Where(r => r.MaDichVu == s.MaDichVu &&
                        (r.TrangThai == AppDefaults.ServicePending || r.TrangThai == AppDefaults.ServiceActive))
                    .OrderByDescending(r => r.MaDangKyDV)
                    .FirstOrDefault()
                    ?? myRegistrations
                        .Where(r => r.MaDichVu == s.MaDichVu)
                        .OrderByDescending(r => r.MaDangKyDV)
                        .FirstOrDefault();

                return new StudentServiceOptionDto
                {
                    ServiceId = s.MaDichVu,
                    Name = s.TenDichVu,
                    Unit = s.DonViTinh,
                    Price = s.DonGia,
                    RegistrationId = current?.MaDangKyDV,
                    Status = current?.TrangThai,
                    SoLuong = current?.SoLuong,
                    NgayBatDau = current?.NgayBatDau.ToString("dd/MM/yyyy"),
                    LyDoTuChoi = current?.LyDoTuChoi
                };
            }).ToList();
        }

        // ============ Helpers ============

        private async Task<HopDong?> GetActiveContractAsync(string studentId)
        {
            return await _context.HopDongs
                .Include(h => h.Giuong)
                .Where(h => h.MaSinhVien == studentId && h.TrangThai == AppDefaults.ContractActive)
                .OrderByDescending(h => h.NgayBatDau)
                .FirstOrDefaultAsync();
        }

        private void AddServiceNotification(string? studentId, string title, string content)
        {
            if (string.IsNullOrWhiteSpace(studentId)) return;
            _context.ThongBaos.Add(new ThongBao
            {
                MaSinhVien = studentId,
                TieuDe = title,
                NoiDung = content,
                Loai = "dichVu",
                LienKet = "/student/invoice",
                DaDoc = false,
                NgayTao = DateTime.Now
            });
        }

        private static ServiceItemDto ToCatalogDto(DichVu s) => new()
        {
            Id = s.MaDichVu,
            Name = s.TenDichVu,
            Unit = s.DonViTinh,
            Price = s.DonGia,
            IsActive = s.LaDangHoat,
            ActiveRegistrations = s.DanhSachDangKyDichVu.Count(r => r.TrangThai == AppDefaults.ServiceActive)
        };

        private static ServiceRegistrationDto ToRegistrationDto(DangKyDichVu r)
        {
            var phong = r.HopDong?.Giuong?.Phong;
            string room = phong != null ? $"{phong.MaToaNha}-{phong.MaPhong.Split('_').Last()}" : "—";
            return new ServiceRegistrationDto
            {
                Id = r.MaDangKyDV,
                ServiceId = r.MaDichVu,
                ServiceName = r.DichVu?.TenDichVu ?? r.MaDichVu,
                Price = r.DichVu?.DonGia ?? 0,
                StudentId = r.HopDong?.MaSinhVien ?? "—",
                StudentName = r.HopDong?.SinhVien?.HoTen ?? "—",
                Room = room,
                SoLuong = r.SoLuong,
                NgayBatDau = r.NgayBatDau.ToString("dd/MM/yyyy"),
                NgayKetThuc = r.NgayKetThuc?.ToString("dd/MM/yyyy"),
                TrangThai = r.TrangThai,
                StaffApprovedBy = r.MaNhanVienDuyet,
                NgayDuyet = r.NgayDuyet?.ToString("dd/MM/yyyy HH:mm"),
                RejectReason = r.LyDoTuChoi
            };
        }
    }
}
