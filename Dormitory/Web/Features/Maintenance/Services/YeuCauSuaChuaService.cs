using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Maintenance.DTOs;
using Dormitory.Web.Features.Maintenance.Entities;
using Dormitory.Web.Features.Maintenance.Mappings;

namespace Dormitory.Web.Features.Maintenance.Services
{
    public class YeuCauSuaChuaService : IYeuCauSuaChuaService
    {
        private readonly ApplicationDbContext _context;

        public YeuCauSuaChuaService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<MaintenanceTicketDto>> GetAllTicketsAsync(
            string? building = null,
            string? category = null,
            string? priority = null,
            string? status = null,
            string? search = null,
            string? academicYear = null)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null) return new List<MaintenanceTicketDto>();

            var endExclusive = year.NgayKetThuc.Date.AddDays(1);
            var tickets = await _context.YeuCauSuaChuas
                .Where(y => y.NgayGui >= year.NgayBatDau && y.NgayGui < endExclusive)
                .Include(y => y.Phong)
                .Include(y => y.SinhVienGui)
                .Include(y => y.NhanVienXuLy)
                .OrderByDescending(y => y.NgayGui)
                .ToListAsync();

            var result = tickets.Select(t => t.ToMaintenanceTicketDto()).ToList();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                result = result.Where(t => t.Code.ToLower().Contains(s) || t.Room.ToLower().Contains(s) || t.Reporter.ToLower().Contains(s) || t.Title.ToLower().Contains(s)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(building) && building != "ALL")
            {
                result = result.Where(t => t.Building.Equals(building, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(category) && category != "ALL")
            {
                result = result.Where(t => t.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(priority) && priority != "ALL")
            {
                result = result.Where(t => t.Priority.Equals(priority, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                result = result.Where(t => t.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return result;
        }

        public async Task<MaintenanceTicketDto?> CreateTicketAsync(CreateTicketDto req, string? academicYear = null)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null || DateTime.Today < year.NgayBatDau.Date || DateTime.Today > year.NgayKetThuc.Date)
                return null;

            var activeContract = await _context.HopDongs
                .Include(h => h.Giuong)
                .FirstOrDefaultAsync(h =>
                    h.MaSinhVien == req.StudentId &&
                    h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear &&
                    h.TrangThai == "hieuLuc" &&
                    h.NgayBatDau <= DateTime.Today &&
                    h.NgayKetThuc >= DateTime.Today);
            if (activeContract?.Giuong == null)
            {
                return null;
            }

            var entity = new YeuCauSuaChua
            {
                MaPhong = activeContract.Giuong.MaPhong,
                MaSinhVienGui = activeContract.MaSinhVien,
                MoTa = req.Description.Trim(),
                NgayGui = DateTime.Now,
                TrangThai = "moiGui"
            };

            _context.YeuCauSuaChuas.Add(entity);
            await _context.SaveChangesAsync();

            return (await _context.YeuCauSuaChuas
                .Include(y => y.Phong)
                .Include(y => y.SinhVienGui)
                .Include(y => y.NhanVienXuLy)
                .FirstAsync(y => y.MaYeuCau == entity.MaYeuCau))
                .ToMaintenanceTicketDto();
        }

        public async Task<bool> AssignTicketAsync(AssignTicketDto req, string? academicYear = null)
        {
            if (!int.TryParse(req.TicketId, out int id) || string.IsNullOrWhiteSpace(req.Technician))
                return false;

            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null) return false;
            var ticket = await _context.YeuCauSuaChuas.FirstOrDefaultAsync(y => y.MaYeuCau == id &&
                y.NgayGui >= year.NgayBatDau && y.NgayGui < year.NgayKetThuc.Date.AddDays(1));
            var technician = await _context.NhanViens
                .FirstOrDefaultAsync(n => n.MaNhanVien == req.Technician && n.TrangThai == "dangLam");
            if (ticket == null || technician == null || ticket.TrangThai == "hoanThanh")
                return false;

            ticket.TrangThai = "dangXuLy";
            ticket.MaNhanVienXuLy = technician.MaNhanVien;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CompleteTicketAsync(string ticketId, string? academicYear = null)
        {
            if (int.TryParse(ticketId, out int id))
            {
                var year = string.IsNullOrWhiteSpace(academicYear)
                    ? null
                    : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
                if (year == null) return false;
                var ticket = await _context.YeuCauSuaChuas.FirstOrDefaultAsync(y => y.MaYeuCau == id &&
                    y.NgayGui >= year.NgayBatDau && y.NgayGui < year.NgayKetThuc.Date.AddDays(1));
                if (ticket == null || ticket.TrangThai != "dangXuLy")
                    return false;

                ticket.TrangThai = "hoanThanh";
                ticket.NgayHoanThanh = DateTime.Now;
                await _context.SaveChangesAsync();
                return true;
            }
            return false;
        }
    }
}
