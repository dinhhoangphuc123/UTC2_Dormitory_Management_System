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
                .AsNoTracking()
                .Include(h => h.SinhVien)
                .Include(h => h.Giuong)
                    .ThenInclude(g => g!.Phong)
                        .ThenInclude(p => p!.ToaNha)
                .AsSplitQuery()
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
                    .ThenInclude(p => p!.ToaNha)
                .FirstOrDefaultAsync(g => g.MaGiuong == req.BedId && g.LaDangHoat);
            if (student == null || bed?.Phong == null)
            {
                return null;
            }

            if (!DateTime.TryParseExact(req.StartDate, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var start) ||
                !DateTime.TryParseExact(req.EndDate, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var end) ||
                end <= start)
            {
                return null;
            }

            var namHoc = await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (namHoc == null)
            {
                return null;
            }

            var term = await _context.KyHocs
                .Where(k => k.MaNamHoc == academicYear && k.NgayBatDau <= start && k.NgayKetThuc >= end)
                .OrderBy(k => k.NgayBatDau)
                .FirstOrDefaultAsync();

            // Hợp đồng có thể kéo dài cả năm học (qua nhiều kỳ); ưu tiên kỳ đầu tiên của năm học thay vì từ chối.
            if (term == null)
            {
                term = await _context.KyHocs
                    .Where(k => k.MaNamHoc == academicYear)
                    .OrderBy(k => k.NgayBatDau)
                    .FirstOrDefaultAsync();
            }

            if (term == null)
            {
                term = new Academic.Entities.KyHoc
                {
                    MaKyHoc = $"AY{Guid.NewGuid():N}"[..14],
                    MaNamHoc = namHoc.MaNamHoc,
                    TenKyHoc = $"Cả năm {namHoc.NgayBatDau:yyyy}-{namHoc.NgayKetThuc:yyyy}",
                    NgayBatDau = namHoc.NgayBatDau,
                    NgayKetThuc = namHoc.NgayKetThuc
                };
                _context.KyHocs.Add(term);
            }

            // Giới tính sinh viên phải khớp quy định của tòa nhà.
            if (!ContractRules.IsGenderCompatible(student.GioiTinh, bed.Phong.ToaNha?.GioiTinhQuyDinh ?? "nam"))
            {
                return null;
            }

            // Tiền cọc không được âm.
            if (req.DepositAmount < 0 || req.MonthlyFee <= 0)
            {
                return null;
            }

            // Một sinh viên chỉ được có một hợp đồng còn hiệu lực trong năm học.
            bool studentHasContract = await _context.HopDongs.AnyAsync(h =>
                h.MaSinhVien == student.MaSinhVien &&
                h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy" &&
                h.NgayBatDau <= end && h.NgayKetThuc >= start);
            if (studentHasContract)
            {
                return null;
            }

            // Kiểm tra chồng lấn thời gian trên cùng giường bằng quy tắc dùng chung.
            var bedContracts = await _context.HopDongs
                .Where(h => h.MaGiuong == bed.MaGiuong &&
                            h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy")
                .Select(h => new { h.NgayBatDau, h.NgayKetThuc })
                .ToListAsync();
            if (bedContracts.Any(h => ContractRules.HasTimeOverlap(h.NgayBatDau, h.NgayKetThuc, start, end)))
            {
                return null;
            }

            string maHopDong = Shared.Helpers.IdGenerator.Next("HD", DateTime.Today);
            var newContract = new HopDong
            {
                MaHopDong = maHopDong,
                MaSinhVien = student.MaSinhVien,
                MaGiuong = bed.MaGiuong,
                MaKyHoc = term.MaKyHoc,
                NgayBatDau = start,
                NgayKetThuc = end,
                NgayNhanPhongThucTe = null,
                GiaThueThang = req.MonthlyFee,
                TienCoc = req.DepositAmount,
                TienHoanCoc = 0,
                TrangThai = "hieuLuc",
                MaNhanVienLap = staffId
            };

            _context.HopDongs.Add(newContract);
            await _context.SaveChangesAsync();

            newContract.SinhVien = student;
            newContract.Giuong = bed;
            newContract.KyHoc = term;
            return newContract.ToContractListItemDto();
        }

        public async Task<bool> RenewContractAsync(string contractId, int months = 5, string? academicYear = null)
        {
            if (months <= 0 || months > 12 || string.IsNullOrWhiteSpace(academicYear))
            {
                return false;
            }

            var contract = await _context.HopDongs
                .FirstOrDefaultAsync(h => h.MaHopDong == contractId && h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear);
            if (contract == null || contract.TrangThai != "hieuLuc")
            {
                return false;
            }

            var newEnd = contract.NgayKetThuc.AddMonths(months);
            if (newEnd <= contract.NgayKetThuc)
            {
                return false;
            }

            // Không được gia hạn đè lên hợp đồng khác đã đặt cùng giường.
            var otherContracts = await _context.HopDongs
                .Where(h => h.MaGiuong == contract.MaGiuong &&
                            h.MaHopDong != contract.MaHopDong &&
                            h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy")
                .Select(h => new { h.NgayBatDau, h.NgayKetThuc })
                .ToListAsync();
            if (otherContracts.Any(h => ContractRules.HasTimeOverlap(h.NgayBatDau, h.NgayKetThuc, contract.NgayKetThuc, newEnd)))
            {
                return false;
            }

            contract.NgayKetThuc = newEnd;
            var renewalNote = $"Gia hạn +{months} tháng đến {newEnd:dd/MM/yyyy}";
            var combinedNote = string.IsNullOrWhiteSpace(contract.GhiChu)
                ? renewalNote
                : $"{contract.GhiChu}; {renewalNote}";
            contract.GhiChu = combinedNote.Length > 255
                ? renewalNote[..Math.Min(renewalNote.Length, 255)]
                : combinedNote;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> LiquidateContractAsync(string contractId, string? reason = null, string? academicYear = null)
        {
            var contract = await _context.HopDongs
                .FirstOrDefaultAsync(h => h.MaHopDong == contractId && h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear);
            if (contract == null)
            {
                return false;
            }

            // Chỉ thanh lý hợp đồng đang hiệu lực hoặc đang giữ chỗ; không thanh lý hai lần.
            if (contract.TrangThai is not ("hieuLuc" or "choThanhToan") || contract.NgayThanhLy.HasValue)
            {
                return false;
            }

            var today = DateTime.Today;
            contract.TrangThai = "daKetThuc";
            contract.NgayThanhLy = today;
            contract.NgayTraPhongThucTe ??= today;
            contract.TienHoanCoc = ContractRules.CalculateDepositRefund(contract.TienCoc);
            contract.GhiChu = string.IsNullOrWhiteSpace(reason)
                ? $"Thanh lý hợp đồng, hoàn cọc {contract.TienHoanCoc:N0} đ"
                : reason.Trim();

            _context.ThongBaos.Add(new ThongBao
            {
                MaSinhVien = contract.MaSinhVien,
                TieuDe = "Hợp đồng nội trú đã được thanh lý",
                NoiDung = string.IsNullOrWhiteSpace(reason)
                    ? $"Hợp đồng {contract.MaHopDong} đã được thanh lý. Tiền cọc hoàn lại: {contract.TienHoanCoc:N0} đ."
                    : $"Hợp đồng {contract.MaHopDong} đã được thanh lý. Lý do: {reason.Trim()}. Tiền cọc hoàn lại: {contract.TienHoanCoc:N0} đ.",
                Loai = "hopDong",
                LienKet = "/student/contract",
                DaDoc = false,
                NgayTao = DateTime.Now
            });

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CheckInAsync(string contractId, DateTime? checkInDate = null, string? academicYear = null)
        {
            var contract = await _context.HopDongs
                .FirstOrDefaultAsync(h => h.MaHopDong == contractId && (academicYear == null || (h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear)));
            if (contract == null || contract.TrangThai != "hieuLuc")
            {
                return false;
            }

            // Chỉ ghi nhận nhận phòng một lần.
            if (contract.NgayNhanPhongThucTe.HasValue)
            {
                return false;
            }

            var actualDate = (checkInDate ?? DateTime.Today).Date;
            if (actualDate < contract.NgayBatDau || actualDate > contract.NgayKetThuc)
            {
                return false;
            }

            contract.NgayNhanPhongThucTe = actualDate;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
