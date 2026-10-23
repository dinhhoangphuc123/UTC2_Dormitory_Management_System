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
            string? search = null)
        {
            var tickets = await _context.YeuCauSuaChuas
                .Include(y => y.Phong)
                .Include(y => y.SinhVienGui)
                .Include(y => y.NhanVienXuLy)
                .OrderByDescending(y => y.NgayGui)
                .ToListAsync();

            var result = tickets.Select(t => t.ToMaintenanceTicketDto()).ToList();

            if (!result.Any())
            {
                result = GetDefaultDemoTickets();
            }

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

        public async Task<MaintenanceTicketDto> CreateTicketAsync(CreateTicketDto req)
        {
            var phong = await _context.Phongs.FirstOrDefaultAsync(p => p.MaToaNha == req.Building && p.MaPhong.EndsWith(req.Room));
            string maPhong = phong?.MaPhong ?? $"{req.Building}_{req.Room}";

            var entity = new YeuCauSuaChua
            {
                MaPhong = maPhong,
                MaSinhVienGui = "6451071012",
                MoTa = req.Description.Trim(),
                NgayGui = DateTime.Now,
                TrangThai = "moiGui"
            };

            _context.YeuCauSuaChuas.Add(entity);
            await _context.SaveChangesAsync();

            return new MaintenanceTicketDto
            {
                Id = entity.MaYeuCau.ToString(),
                Code = $"SC-{2600 + entity.MaYeuCau}",
                Room = $"{req.Building}-{req.Room}",
                Building = req.Building,
                Category = req.Category,
                Title = req.Description.Length > 48 ? req.Description.Substring(0, 48) : req.Description,
                Description = req.Description,
                Reporter = req.Reporter,
                Phone = req.Phone,
                Technician = null,
                Priority = req.Priority,
                Status = "PENDING",
                CreatedAt = DateTime.Now.ToString("dd/MM/yyyy HH:mm")
            };
        }

        public async Task<bool> AssignTicketAsync(AssignTicketDto req)
        {
            if (int.TryParse(req.TicketId, out int id))
            {
                var ticket = await _context.YeuCauSuaChuas.FindAsync(id);
                if (ticket != null)
                {
                    ticket.TrangThai = "dangXuLy";
                    ticket.MaNhanVienXuLy = "NV01";
                    await _context.SaveChangesAsync();
                }
            }
            return true;
        }

        public async Task<bool> CompleteTicketAsync(string ticketId)
        {
            if (int.TryParse(ticketId, out int id))
            {
                var ticket = await _context.YeuCauSuaChuas.FindAsync(id);
                if (ticket != null)
                {
                    ticket.TrangThai = "hoanThanh";
                    ticket.NgayHoanThanh = DateTime.Now;
                    await _context.SaveChangesAsync();
                }
            }
            return true;
        }

        private static List<MaintenanceTicketDto> GetDefaultDemoTickets()
        {
            return new List<MaintenanceTicketDto>
            {
                new() { Id = "1", Code = "SC-2601", Room = "A2-308", Building = "A2", Category = "Điện dân dụng", Title = "Chập aptomat chính gây mất điện phòng, có khét", Description = "Chập aptomat chính gây mất điện toàn phòng, có mùi khét nguy hiểm khi bật điều hòa", Reporter = "Lê Quốc Bảo", Phone = "0918.442.190", Technician = null, Priority = "Khẩn cấp", Status = "PENDING", CreatedAt = "22/10/2026 08:30" },
                new() { Id = "2", Code = "SC-2598", Room = "B1-112", Building = "B1", Category = "Nước / Vệ sinh", Title = "Bể van cấp nước lavabo rò rỉ sàn nhà tắm", Description = "Bể vòi van cấp nước lavabo rò rỉ ngập sàn nhà tắm gây trơn trượt", Reporter = "Trần Thu Hà", Phone = "0982.114.733", Technician = "Phạm Thành", Priority = "Khẩn cấp", Status = "IN_PROGRESS", CreatedAt = "21/10/2026 14:15" },
                new() { Id = "3", Code = "SC-2595", Room = "A1-405", Building = "A1", Category = "Khóa cửa / Cửa sổ", Title = "Kẹt chìa khóa cửa chính, chốt lỏng", Description = "Kẹt chìa khóa phòng cửa chính, chốt bị lỏng khó khóa khi ra ngoài", Reporter = "Nguyễn Văn Huy", Phone = "0903.665.129", Technician = "Vũ Tuấn", Priority = "Bình thường", Status = "IN_PROGRESS", CreatedAt = "21/10/2026 09:20" },
                new() { Id = "4", Code = "SC-2592", Room = "C1-201", Building = "C1", Category = "Thiết bị mạng", Title = "Cổng LAN giường 03 gãy lẫy tiếp xúc", Description = "Cổng mạng dây LAN góc giường 03 gãy lẫy tiếp xúc, không nhận tín hiệu", Reporter = "Hoàng Minh Đức", Phone = "0934.789.201", Technician = null, Priority = "Bình thường", Status = "PENDING", CreatedAt = "20/10/2026 16:45" },
                new() { Id = "5", Code = "SC-2589", Room = "B2-504", Building = "B2", Category = "Đồ gỗ / Giường tủ", Title = "Thanh giát giường nứt gãy", Description = "Thanh giát giường tầng dưới bị nứt gãy cần thay thanh gỗ mới", Reporter = "Đỗ Mỹ Linh", Phone = "0977.892.441", Technician = "Đặng Long", Priority = "Bình thường", Status = "COMPLETED", CreatedAt = "19/10/2026 10:10" },
                new() { Id = "6", Code = "SC-2588", Room = "A2-202", Building = "A2", Category = "Điện dân dụng", Title = "Quạt trần kêu to và rung mạnh số 2", Description = "Quạt trần phòng rung lắc mạnh kêu to khi bật số 2, số 3", Reporter = "Vũ Trọng Nam", Phone = "0945.332.118", Technician = "Phạm Thành", Priority = "Bình thường", Status = "COMPLETED", CreatedAt = "18/10/2026 11:05" }
            };
        }
    }
}

