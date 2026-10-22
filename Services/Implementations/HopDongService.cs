using Microsoft.EntityFrameworkCore;
using Quan_ly_Ky_tuc_xa.Data;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Models.Entities;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Services.Implementations
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
            string? search = null)
        {
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

            var entities = await query.ToListAsync();

            var list = entities.Select(h =>
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
            }).ToList();

            // Filter by UI tab
            if (!string.IsNullOrWhiteSpace(statusTab))
            {
                if (statusTab == "valid") list = list.Where(c => c.Status == "Hiệu lực").ToList();
                else if (statusTab == "expiring") list = list.Where(c => c.Status == "Sắp hết hạn").ToList();
                else if (statusTab == "ended") list = list.Where(c => c.Status == "Đã thanh lý").ToList();
            }

            return list;
        }

        public async Task<ContractListItemDto?> GetContractByIdAsync(string id)
        {
            var contracts = await GetAllContractsAsync();
            return contracts.FirstOrDefault(c => c.Id == id || c.ContractNumber == id);
        }

        public async Task<ContractListItemDto> CreateContractAsync(CreateContractRequestDto req, string staffId)
        {
            // Find or create student
            var sv = await _context.SinhViens.FirstOrDefaultAsync(s => s.MaSinhVien == req.Mssv);
            if (sv == null)
            {
                sv = new SinhVien
                {
                    MaSinhVien = req.Mssv,
                    HoTen = req.StudentName,
                    NgaySinh = new DateTime(2005, 1, 1),
                    GioiTinh = "nam",
                    Cccd = "07920" + DateTime.Now.Ticks.ToString()[^7..],
                    MaLop = "CNTT01_K64",
                    NamNhapHoc = 2024,
                    TrangThai = "dangHoc"
                };
                await _context.SinhViens.AddAsync(sv);
                await _context.SaveChangesAsync();
            }

            // Find matching bed
            var bed = await _context.Giuongs
                .FirstOrDefaultAsync(g => g.MaPhong.EndsWith(req.RoomNumber) && g.SoThuTu == int.Parse(req.BedNumber.Replace("G", "").TrimStart('0')));

            string maGiuong = bed?.MaGiuong ?? $"A01_{req.RoomNumber}_{req.BedNumber}";

            string maHĐ = $"HĐ-2026-{req.RoomNumber}-{req.BedNumber}";

            DateTime start = DateTime.TryParseExact(req.StartDate, "dd/MM/yyyy", null, System.Globalization.DateTimeStyles.None, out var sDate)
                ? sDate : DateTime.Today;
            DateTime end = DateTime.TryParseExact(req.EndDate, "dd/MM/yyyy", null, System.Globalization.DateTimeStyles.None, out var eDate)
                ? eDate : start.AddMonths(9);

            var newContract = new HopDong
            {
                MaHopDong = maHĐ,
                MaSinhVien = sv.MaSinhVien,
                MaGiuong = maGiuong,
                MaKyHoc = "HK1_2026_2027",
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

            return (await GetContractByIdAsync(maHĐ))!;
        }

        public async Task<bool> RenewContractAsync(string contractId, int months = 5)
        {
            var contract = await _context.HopDongs.FirstOrDefaultAsync(h => h.MaHopDong == contractId);
            if (contract == null) return false;

            contract.NgayKetThuc = contract.NgayKetThuc.AddMonths(months);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> LiquidateContractAsync(string contractId, string? reason = null)
        {
            var contract = await _context.HopDongs.FirstOrDefaultAsync(h => h.MaHopDong == contractId);
            if (contract == null) return false;

            contract.TrangThai = "daKetThuc";
            contract.NgayThanhLy = DateTime.Today;
            contract.LyDoThanhLy = reason ?? "Thanh lý hợp đồng và hoàn trả cọc thiết bị";
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

