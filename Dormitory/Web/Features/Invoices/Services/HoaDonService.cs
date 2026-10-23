using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Invoices.DTOs;
using Dormitory.Web.Features.Invoices.Mappings;
using Dormitory.Web.Features.Payments.Entities;

namespace Dormitory.Web.Features.Invoices.Services
{
    public class HoaDonService : IHoaDonService
    {
        private readonly ApplicationDbContext _context;

        public HoaDonService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<InvoiceItemDto>> GetAllInvoicesAsync(string? building = null, string? category = null, string? status = null, string? search = null)
        {
            var invoices = await _context.HoaDons
                .Include(h => h.HopDong)
                    .ThenInclude(hd => hd!.SinhVien)
                .Include(h => h.HopDong)
                    .ThenInclude(hd => hd!.Giuong)
                        .ThenInclude(g => g!.Phong)
                            .ThenInclude(p => p!.ToaNha)
                .Include(h => h.DanhSachThanhToan)
                .OrderByDescending(h => h.NgayLap)
                .ToListAsync();

            var result = invoices.Select(h => h.ToInvoiceItemDto()).ToList();

            if (!result.Any())
            {
                result = GetDefaultDemoInvoices();
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                result = result.Where(i => i.Code.ToLower().Contains(s) || i.StudentName.ToLower().Contains(s) || i.StudentId.ToLower().Contains(s) || i.Room.ToLower().Contains(s)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(building) && building != "all")
            {
                result = result.Where(i => i.Building.Equals(building, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(category) && category != "all")
            {
                result = result.Where(i => i.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
            {
                result = result.Where(i => i.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return result;
        }

        public async Task<InvoiceItemDto> CreateInvoiceAsync(CreateInvoiceDto req)
        {
            var nextCode = $"HD-{DateTime.Now:yyyyMM}-{Random.Shared.Next(1000, 9999)}";
            var item = new InvoiceItemDto
            {
                Id = nextCode,
                Code = nextCode,
                Room = req.Room,
                Building = req.Building,
                StudentId = req.StudentId,
                StudentName = req.StudentName,
                Title = req.Title,
                Category = req.Category,
                CategoryColor = req.Category == "diennuoc" ? "#0b2a5b" : (req.Category == "phong" ? "#88a9fd" : "#375ba9"),
                Amount = req.Amount,
                DueDate = string.IsNullOrWhiteSpace(req.DueDate) ? DateTime.Today.AddDays(10).ToString("dd/MM/yyyy") : req.DueDate,
                IsOverdue = false,
                Method = "Chưa có",
                MethodIcon = "",
                Status = "pending",
                StatusLabel = "Chờ nộp"
            };

            return await Task.FromResult(item);
        }

        public async Task<bool> ConfirmPaymentAsync(string invoiceId, string paymentMethod)
        {
            var invoice = await _context.HoaDons
                .Include(h => h.DanhSachThanhToan)
                .FirstOrDefaultAsync(h => h.MaHoaDon == invoiceId);

            if (invoice != null)
            {
                invoice.TrangThai = "daThanhToan";
                _context.ThanhToans.Add(new ThanhToan
                {
                    MaThanhToan = $"TT-{DateTime.Now.Ticks % 1000000}",
                    MaHoaDon = invoice.MaHoaDon,
                    SoTien = 1480000,
                    NgayThanhToan = DateTime.Now,
                    PhuongThuc = paymentMethod.Contains("VNPAY") ? "viDienTu" : (paymentMethod.Contains("khoản") ? "chuyenKhoan" : "tienMat"),
                    GhiChu = "Đã thu tại quầy BQL KTX"
                });
                await _context.SaveChangesAsync();
            }

            return true;
        }

        public async Task<int> SendRemindersAsync()
        {
            await Task.Delay(50);
            return 22;
        }

        private static List<InvoiceItemDto> GetDefaultDemoInvoices()
        {
            return new List<InvoiceItemDto>
            {
                new() { Id = "inv1", Code = "HD-202603-0891", Room = "A2-304", Building = "A2", StudentName = "Trần Minh Hoàng", StudentId = "72DCHT21045", Title = "Tổng hợp T03 (Phòng + Điện nước)", Category = "tonghop", CategoryColor = "#375ba9", Amount = 1480000, DueDate = "15/03/2026", IsOverdue = false, Method = "VNPAY QR", MethodIcon = "qr_code_2", Status = "paid", StatusLabel = "Đã nộp" },
                new() { Id = "inv2", Code = "HD-202603-0892", Room = "B1-102", Building = "B1", StudentName = "Lê Thị Mai Khanh", StudentId = "72DCOT22019", Title = "Điện nước Tháng 02/2026", Category = "diennuoc", CategoryColor = "#0b2a5b", Amount = 340000, DueDate = "15/03/2026", IsOverdue = false, Method = "Chuyển khoản", MethodIcon = "account_balance", Status = "paid", StatusLabel = "Đã nộp" },
                new() { Id = "inv3", Code = "HD-202603-0904", Room = "A3-512", Building = "A3", StudentName = "Nguyễn Quốc Tuấn", StudentId = "71DCCK20112", Title = "Tiền phòng KTX HK2", Category = "phong", CategoryColor = "#88a9fd", Amount = 2750000, DueDate = "10/03/2026", IsOverdue = true, OverdueText = "Quá 4 ngày", Method = "Chưa có", MethodIcon = "", Status = "pending", StatusLabel = "Chờ nộp" },
                new() { Id = "inv4", Code = "HD-202603-0915", Room = "A1-205", Building = "A1", StudentName = "Võ Đăng Khôi", StudentId = "73DCVT23004", Title = "Phí gửi xe máy (6 tháng)", Category = "guixe", CategoryColor = "#747780", Amount = 420000, DueDate = "20/03/2026", IsOverdue = false, Method = "Tiền mặt", MethodIcon = "payments", Status = "paid", StatusLabel = "Đã nộp" },
                new() { Id = "inv5", Code = "HD-202603-0922", Room = "B2-401", Building = "B2", StudentName = "Phạm Thị Bích Ngọc", StudentId = "72DCKT22081", Title = "Tổng hợp T03 (Phòng + Điện nước)", Category = "tonghop", CategoryColor = "#375ba9", Amount = 1620000, DueDate = "20/03/2026", IsOverdue = false, Method = "Chờ cổng TT", MethodIcon = "", Status = "pending", StatusLabel = "Chờ nộp" },
                new() { Id = "inv6", Code = "HD-202603-0938", Room = "A2-110", Building = "A2", StudentName = "Đỗ Văn Hùng", StudentId = "70DCDD19054", Title = "Truy thu Điện vượt định mức T01, T02", Category = "diennuoc", CategoryColor = "#ba1a1a", Amount = 890000, DueDate = "28/02/2026", IsOverdue = true, OverdueText = "Quá 14 ngày", Method = "Chưa có", MethodIcon = "", Status = "overdue", StatusLabel = "Nợ khó đòi" }
            };
        }
    }
}

