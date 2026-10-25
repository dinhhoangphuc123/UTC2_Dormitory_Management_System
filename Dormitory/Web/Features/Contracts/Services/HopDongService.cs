using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Contracts.DTOs;
using Dormitory.Web.Features.Contracts.Mappings;
using Dormitory.Web.Features.Students.Entities;

namespace Dormitory.Web.Features.Contracts.Services
{
    public class HopDongService : IHopDongService
    {
        private readonly ApplicationDbContext _context;

        public HopDongService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<ContractListItemDto>> GetAllContractsAsync(
            string? statusTab = null,
            string? building = null,
            string? search = null,
            string? academicYear = null)
        {
            if (string.IsNullOrWhiteSpace(academicYear) ||
                !await _context.NamHocs.AnyAsync(n => n.MaNamHoc == academicYear))
                return new List<ContractListItemDto>();

            var query = _context.HopDongs
                .Include(h => h.SinhVien)
                .Include(h => h.Giuong)
                    .ThenInclude(g => g!.Phong)
                        .ThenInclude(p => p!.ToaNha)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string q = search.Trim().ToLower();
                query = query.Where(h =>
                    h.MaHopDong.ToLower().Contains(q) ||
                    h.SinhVien!.HoTen.ToLower().Contains(q) ||
                    h.MaSinhVien.Contains(q) ||
                    h.MaGiuong.ToLower().Contains(q));
            }

            if (!string.IsNullOrWhiteSpace(building) && building != "all")
            {
                query = query.Where(h => h.Giuong != null && h.Giuong.Phong != null && h.Giuong.Phong.MaToaNha.Contains(building));
            }

            query = query.Where(h => h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear);

            var entities = await query.ToListAsync();

            var list = entities.Select(h => h.ToContractListItemDto()).ToList();

            if (!string.IsNullOrWhiteSpace(statusTab))
            {
                if (statusTab == "valid") list = list.Where(c => c.Status == "Hiệu lực").ToList();
                else if (statusTab == "expiring") list = list.Where(c => c.Status == "Sắp hết hạn").ToList();
                else if (statusTab == "ended") list = list.Where(c => c.Status == "Đã thanh lý").ToList();
            }

            return list;
        }

        public async Task<ContractListItemDto?> GetContractByIdAsync(string id, string? academicYear = null)
        {
            var contracts = await GetAllContractsAsync(academicYear: academicYear);
            return contracts.FirstOrDefault(c => c.Id == id || c.ContractNumber == id);
        }

        public async Task<ContractListItemDto?> CreateContractAsync(CreateContractRequestDto req, string? staffId, string? academicYear = null)
        {
            if (string.IsNullOrWhiteSpace(academicYear)) return null;
            var student = await _context.SinhViens
                .FirstOrDefaultAsync(s => s.MaSinhVien == req.Mssv);
            var bed = await _context.Giuongs
                .Include(g => g.Phong)
                .FirstOrDefaultAsync(g => g.MaGiuong == req.BedId && g.LaDangHoat);
            if (student == null || bed?.Phong == null)
            {
                return null;
            }

            DateTime.TryParseExact(req.StartDate, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var start);
            DateTime.TryParseExact(req.EndDate, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var end);

            var term = await _context.KyHocs.FirstOrDefaultAsync(k =>
                k.MaNamHoc == academicYear && k.NgayBatDau <= start && k.NgayKetThuc >= start);
            if (term == null)
            {
                return null;
            }

            bool bedIsTaken = await _context.HopDongs.AnyAsync(h =>
                h.MaGiuong == bed.MaGiuong &&
                h.TrangThai != "daKetThuc" &&
                h.NgayBatDau <= end &&
                h.NgayKetThuc >= start);
            if (bedIsTaken)
            {
                return null;
            }

            string maHopDong = $"HD-{DateTime.Today:yyMMdd}-{Guid.NewGuid().ToString("N")[..8]}";
            var newContract = new HopDong
            {
                MaHopDong = maHopDong,
                MaSinhVien = student.MaSinhVien,
                MaGiuong = bed.MaGiuong,
                MaKyHoc = term.MaKyHoc,
                NgayBatDau = start,
                NgayKetThuc = end,
                NgayNhanPhongThucTe = start,
                GiaThueThang = req.MonthlyFee,
                TienCoc = req.DepositAmount,
                TrangThai = "hieuLuc",
                MaNhanVienLap = staffId
            };

            await _context.HopDongs.AddAsync(newContract);
            await _context.SaveChangesAsync();

            newContract.SinhVien = student;
            newContract.Giuong = bed;
            newContract.KyHoc = term;
            return newContract.ToContractListItemDto();
        }

        public async Task<bool> RenewContractAsync(string contractId, int months = 5, string? academicYear = null)
        {
            var contract = await _context.HopDongs.FirstOrDefaultAsync(h => h.MaHopDong == contractId && h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear);
            if (contract == null) return false;

            contract.NgayKetThuc = contract.NgayKetThuc.AddMonths(months);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> LiquidateContractAsync(string contractId, string? reason = null, string? academicYear = null)
        {
            var contract = await _context.HopDongs.FirstOrDefaultAsync(h => h.MaHopDong == contractId && h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear);
            if (contract == null) return false;

            contract.TrangThai = "daKetThuc";
            contract.NgayThanhLy = DateTime.Today;
            contract.GhiChu = reason ?? "Thanh lý hợp đồng và hoàn trả cọc thiết bị";
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
