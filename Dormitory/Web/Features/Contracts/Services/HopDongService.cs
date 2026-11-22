using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Contracts.DTOs;
using Dormitory.Web.Features.Contracts.Mappings;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Features.Students.Services;
using Dormitory.Web.Shared.Helpers;

namespace Dormitory.Web.Features.Contracts.Services
{
    public class HopDongService : IHopDongService
    {
        private readonly ApplicationDbContext _context;
        private readonly IPasswordHasher _passwordHasher;

        public HopDongService(ApplicationDbContext context, IPasswordHasher? passwordHasher = null)
        {
            _context = context;
            _passwordHasher = passwordHasher ?? new PasswordHasher();
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

            var unpaidInvoices = await _context.HoaDons
                .Where(h => h.MaHopDong == contract.MaHopDong && h.TrangThai != "daThanhToan" && h.TrangThai != "daHuy" && h.TrangThai != "nhap")
                .Include(h => h.DanhSachChiTietHoaDon)
                .Include(h => h.DanhSachThanhToan)
                .ToListAsync();
            decimal unpaidDebt = unpaidInvoices.Sum(h => Math.Max(0m,
                h.DanhSachChiTietHoaDon.Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia) - h.DanhSachThanhToan.Sum(t => t.SoTien)));

            var draftInvoices = await _context.HoaDons
                .Where(h => h.MaHopDong == contract.MaHopDong && h.TrangThai == "nhap")
                .ToListAsync();
            foreach (var draft in draftInvoices)
            {
                draft.TrangThai = "daHuy";
            }

            var today = DateTime.Today;
            contract.TrangThai = "daKetThuc";
            contract.NgayThanhLy = today;
            contract.NgayTraPhongThucTe ??= today;
            var baseRefund = ContractRules.CalculateDepositRefund(contract.TienCoc);
            contract.TienHoanCoc = Math.Max(0m, baseRefund - unpaidDebt);
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

        public async Task<ImportContractsResultDto?> ImportContractsFromExcelAsync(
            Stream fileStream,
            string? staffId,
            string? academicYear = null)
        {
            if (string.IsNullOrWhiteSpace(academicYear))
            {
                return null;
            }

            var namHoc = await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (namHoc == null)
            {
                return null;
            }

            var kyHocs = await _context.KyHocs
                .Where(k => k.MaNamHoc == academicYear)
                .OrderBy(k => k.NgayBatDau)
                .ToListAsync();

            var defaultTerm = kyHocs.FirstOrDefault();
            if (defaultTerm == null)
            {
                defaultTerm = new KyHoc
                {
                    MaKyHoc = $"AY{Guid.NewGuid():N}"[..14],
                    MaNamHoc = namHoc.MaNamHoc,
                    TenKyHoc = $"Cả năm {namHoc.NgayBatDau:yyyy}-{namHoc.NgayKetThuc:yyyy}",
                    NgayBatDau = namHoc.NgayBatDau,
                    NgayKetThuc = namHoc.NgayKetThuc
                };
                _context.KyHocs.Add(defaultTerm);
                await _context.SaveChangesAsync();
                kyHocs.Add(defaultTerm);
            }

            string? validStaffId = null;
            if (!string.IsNullOrWhiteSpace(staffId))
            {
                var trimmedStaff = staffId.Trim();
                if (await _context.NhanViens.AnyAsync(n => n.MaNhanVien == trimmedStaff))
                {
                    validStaffId = trimmedStaff;
                }
            }

            using var workbook = new XLWorkbook(fileStream);
            var ws = workbook.Worksheets.FirstOrDefault();
            var usedRange = ws?.RangeUsed();
            if (usedRange == null)
            {
                return new ImportContractsResultDto
                {
                    Message = "File Excel không có dữ liệu."
                };
            }

            var headerRow = ExcelImportHelper.FindHeaderRow(usedRange);
            int headerRowNumber = headerRow.RowNumber();
            var cols = ExcelImportHelper.BuildColumnMap(headerRow);
            if (!cols.TryGetValue("mssv", out int mssvCol))
            {
                return new ImportContractsResultDto
                {
                    Failed = 1,
                    Errors = { new ImportContractRowErrorDto(headerRow.RowNumber(), string.Empty, "Không tìm thấy cột MSSV ở dòng tiêu đề.") },
                    Message = "File Excel thiếu cột bắt buộc: MSSV."
                };
            }

            var result = new ImportContractsResultDto();

            var occupiedBedIds = new HashSet<string>(
                await _context.HopDongs
                    .AsNoTracking()
                    .Where(h => h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy")
                    .Select(h => h.MaGiuong)
                    .ToListAsync(),
                StringComparer.OrdinalIgnoreCase);

            var allRooms = await _context.Phongs
                .AsNoTracking()
                .Include(p => p.ToaNha)
                .Include(p => p.LoaiPhong)
                .Include(p => p.DanhSachGiuong)
                .OrderBy(p => p.MaPhong)
                .AsSplitQuery()
                .ToListAsync();

            var activeRooms = allRooms
                .Where(p => p.TrangThai == "hoatDong" && p.ToaNha != null && p.ToaNha.TrangThai == "hoatDong")
                .ToList();

            var roomLookup = allRooms.ToDictionary(r => r.MaPhong, StringComparer.OrdinalIgnoreCase);
            var bedLookup = new Dictionary<string, (Phong Room, Giuong Bed)>(StringComparer.OrdinalIgnoreCase);
            foreach (var room in allRooms)
            {
                foreach (var bed in room.DanhSachGiuong)
                {
                    bedLookup.TryAdd(bed.MaGiuong, (room, bed));
                }
            }

            foreach (var row in usedRange.RowsUsed().Where(r => r.RowNumber() > headerRowNumber))
            {
                int rowNumber = row.RowNumber();
                string mssv = row.Cell(mssvCol).GetString().Trim();
                if (string.IsNullOrWhiteSpace(mssv))
                {
                    continue;
                }

                string appStatusRaw = ExcelImportHelper.ReadCellText(row, cols, "appStatus");
                if (ExcelImportHelper.IsIgnoredApplicationStatus(appStatusRaw))
                {
                    result.Skipped++;
                    continue;
                }

                string hoTen = ExcelImportHelper.ReadCellText(row, cols, "hoTen");
                string cccd = ExcelImportHelper.ReadCellText(row, cols, "cccd");
                string maLop = ExcelImportHelper.ReadCellText(row, cols, "maLop");
                bool hasFullStudentProfile = !string.IsNullOrWhiteSpace(hoTen) &&
                                             !string.IsNullOrWhiteSpace(cccd) &&
                                             !string.IsNullOrWhiteSpace(maLop);

                var student = await _context.SinhViens.FirstOrDefaultAsync(s => s.MaSinhVien == mssv);
                if (student == null && !hasFullStudentProfile)
                {
                    result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, $"Không tìm thấy sinh viên có MSSV {mssv}."));
                    continue;
                }

                if (hasFullStudentProfile)
                {
                    DateTime? fallbackDob = student?.NgaySinh;
                    if (!ExcelImportHelper.TryReadDate(row, cols, "ngaySinh", fallbackDob, out var ngaySinh))
                    {
                        result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, "Ngày sinh không hợp lệ."));
                        continue;
                    }

                    string namNhapHocText = ExcelImportHelper.ReadCellText(row, cols, "namNhapHoc");
                    int namNhapHoc;
                    if (string.IsNullOrWhiteSpace(namNhapHocText))
                    {
                        namNhapHoc = student?.NamNhapHoc ?? namHoc.NgayBatDau.Year;
                    }
                    else if (!int.TryParse(namNhapHocText, out namNhapHoc))
                    {
                        result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, "Năm nhập học không hợp lệ."));
                        continue;
                    }

                    var upsertResult = await StudentExcelHelper.UpsertStudentAsync(
                        _context,
                        _passwordHasher,
                        new StudentExcelRowInput
                        {
                            Mssv = mssv,
                            HoTen = hoTen,
                            NgaySinh = ngaySinh,
                            GioiTinh = ExcelImportHelper.ReadCellText(row, cols, "gioiTinh"),
                            Cccd = cccd,
                            DienThoai = ExcelImportHelper.ReadCellText(row, cols, "dienThoai"),
                            Email = ExcelImportHelper.ReadCellText(row, cols, "email"),
                            DiaChiThuongTru = ExcelImportHelper.ReadCellText(row, cols, "diaChi"),
                            MaLop = maLop,
                            NamNhapHoc = namNhapHoc,
                            DoiTuongUuTien = ExcelImportHelper.ReadCellText(row, cols, "doiTuongUuTien")
                        },
                        minAdmissionYear: 1990,
                        maxAdmissionYear: namHoc.NgayKetThuc.Year + 1);

                    if (!upsertResult.Success || upsertResult.Student == null)
                    {
                        result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, upsertResult.ErrorMessage ?? "Dữ liệu sinh viên không hợp lệ."));
                        continue;
                    }

                    student = upsertResult.Student;
                }

                if (student == null)
                {
                    result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, $"Không tìm thấy sinh viên có MSSV {mssv}."));
                    continue;
                }

                if (!ExcelImportHelper.TryReadDate(row, cols, "startDate", namHoc.NgayBatDau.Date, out var startDate))
                {
                    result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, "Ngày bắt đầu không hợp lệ."));
                    continue;
                }

                if (!ExcelImportHelper.TryReadDate(row, cols, "endDate", namHoc.NgayKetThuc.Date, out var endDate) || endDate <= startDate)
                {
                    result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, "Ngày kết thúc phải sau ngày bắt đầu."));
                    continue;
                }

                if (!ExcelImportHelper.TryReadDecimal(row, cols, "monthlyFee", out var parsedMonthlyFee))
                {
                    result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, "Giá thuê tháng không hợp lệ."));
                    continue;
                }

                if (!ExcelImportHelper.TryReadDecimal(row, cols, "depositAmount", out var parsedDepositAmount))
                {
                    result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, "Tiền cọc không hợp lệ."));
                    continue;
                }

                if (parsedMonthlyFee.HasValue && parsedMonthlyFee.Value <= 0)
                {
                    result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, "Giá thuê tháng phải lớn hơn 0."));
                    continue;
                }

                if (parsedDepositAmount.HasValue && parsedDepositAmount.Value < 0)
                {
                    result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, "Tiền cọc không được âm."));
                    continue;
                }

                string appCode = ExcelImportHelper.ReadCellText(row, cols, "appCode").Replace("#", string.Empty).Trim();
                var donDangKy = await FindMatchingApplicationAsync(student.MaSinhVien, appCode, academicYear);

                var existingContract = await _context.HopDongs
                    .Include(h => h.SinhVien)
                    .Include(h => h.KyHoc)
                    .Include(h => h.Giuong)
                        .ThenInclude(g => g!.Phong)
                            .ThenInclude(p => p!.ToaNha)
                    .FirstOrDefaultAsync(h =>
                        h.MaSinhVien == student.MaSinhVien &&
                        h.TrangThai != "daKetThuc" &&
                        h.TrangThai != "daHuy");

                if (existingContract != null)
                {
                    if (existingContract.TrangThai == "hieuLuc")
                    {
                        if (existingContract.KyHoc == null || existingContract.KyHoc.MaNamHoc == academicYear)
                        {
                            result.Skipped++;
                        }
                        else
                        {
                            result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, "Sinh viên đã có hợp đồng hiệu lực ở năm học khác."));
                        }
                        continue;
                    }

                    if (existingContract.TrangThai == "choThanhToan")
                    {
                        if (existingContract.KyHoc != null && existingContract.KyHoc.MaNamHoc != academicYear)
                        {
                            result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, "Sinh viên đang có hợp đồng giữ chỗ ở năm học khác."));
                            continue;
                        }

                        existingContract.TrangThai = "hieuLuc";
                        existingContract.NgayBatDau = startDate;
                        existingContract.NgayKetThuc = endDate;
                        existingContract.HanGiuCho = null;
                        existingContract.MaNhanVienLap ??= validStaffId;
                        if (parsedMonthlyFee.HasValue && parsedMonthlyFee.Value > 0)
                        {
                            existingContract.GiaThueThang = parsedMonthlyFee.Value;
                        }
                        if (parsedDepositAmount.HasValue && parsedDepositAmount.Value >= 0)
                        {
                            existingContract.TienCoc = parsedDepositAmount.Value;
                        }

                        MarkApplicationApprovedIfPending(donDangKy, existingContract.Giuong?.MaPhong, validStaffId);

                        var unpaidInvoices = await _context.HoaDons
                            .Where(h => h.MaHopDong == existingContract.MaHopDong
                                && h.TrangThai != "daThanhToan"
                                && h.TrangThai != "daHuy")
                            .ToListAsync();
                        foreach (var inv in unpaidInvoices)
                        {
                            inv.TrangThai = "daHuy";
                        }

                        try
                        {
                            await _context.SaveChangesAsync();
                            result.CreatedContracts.Add(existingContract.ToContractListItemDto());
                            result.Imported++;
                        }
                        catch (DbUpdateException)
                        {
                            _context.ChangeTracker.Clear();
                            result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, "Dữ liệu dòng không hợp lệ hoặc vi phạm ràng buộc lưu trữ."));
                        }
                        continue;
                    }
                }

                string bedId = ExcelImportHelper.ReadCellText(row, cols, "bedId");
                string roomCode = ExcelImportHelper.ReadCellText(row, cols, "roomCode");

                var (selectedRoom, selectedBed, bedError) = ResolveBedForImportRow(
                    student.GioiTinh,
                    bedId,
                    roomCode,
                    donDangKy?.MaPhong,
                    donDangKy?.MaLoaiPhong,
                    activeRooms,
                    roomLookup,
                    bedLookup,
                    occupiedBedIds);

                if (selectedRoom == null || selectedBed == null)
                {
                    result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, bedError ?? "Không còn giường trống phù hợp."));
                    continue;
                }

                decimal monthlyFee = parsedMonthlyFee
                    ?? selectedRoom.LoaiPhong?.GiaThueThang
                    ?? donDangKy?.LoaiPhong?.GiaThueThang
                    ?? 500000m;
                if (monthlyFee <= 0) monthlyFee = 500000m;

                decimal depositAmount = parsedDepositAmount ?? 0m;

                var term = kyHocs.FirstOrDefault(k => k.NgayBatDau <= startDate && k.NgayKetThuc >= endDate) ?? defaultTerm;

                var newContract = new HopDong
                {
                    MaHopDong = Shared.Helpers.IdGenerator.Next("HD", DateTime.Today),
                    MaDonDangKy = donDangKy?.MaDonDangKy,
                    MaSinhVien = student.MaSinhVien,
                    MaGiuong = selectedBed.MaGiuong,
                    MaKyHoc = term.MaKyHoc,
                    NgayBatDau = startDate,
                    NgayKetThuc = endDate,
                    NgayNhanPhongThucTe = null,
                    GiaThueThang = monthlyFee,
                    TienCoc = depositAmount,
                    TienHoanCoc = 0,
                    TrangThai = "hieuLuc",
                    MaNhanVienLap = validStaffId
                };

                _context.HopDongs.Add(newContract);
                MarkApplicationApprovedIfPending(donDangKy, selectedRoom.MaPhong, validStaffId);

                try
                {
                    await _context.SaveChangesAsync();
                    occupiedBedIds.Add(selectedBed.MaGiuong);

                    var dtoSource = new HopDong
                    {
                        MaHopDong = newContract.MaHopDong,
                        MaDonDangKy = newContract.MaDonDangKy,
                        MaSinhVien = newContract.MaSinhVien,
                        MaGiuong = newContract.MaGiuong,
                        MaKyHoc = newContract.MaKyHoc,
                        NgayBatDau = newContract.NgayBatDau,
                        NgayKetThuc = newContract.NgayKetThuc,
                        NgayNhanPhongThucTe = newContract.NgayNhanPhongThucTe,
                        GiaThueThang = newContract.GiaThueThang,
                        TienCoc = newContract.TienCoc,
                        TienHoanCoc = newContract.TienHoanCoc,
                        TrangThai = newContract.TrangThai,
                        GhiChu = newContract.GhiChu,
                        HanGiuCho = newContract.HanGiuCho,
                        SinhVien = student,
                        KyHoc = term,
                        Giuong = new Giuong
                        {
                            MaGiuong = selectedBed.MaGiuong,
                            MaPhong = selectedBed.MaPhong,
                            SoThuTu = selectedBed.SoThuTu,
                            LaDangHoat = selectedBed.LaDangHoat,
                            Phong = selectedRoom
                        }
                    };
                    result.CreatedContracts.Add(dtoSource.ToContractListItemDto());
                    result.Imported++;
                }
                catch (DbUpdateException)
                {
                    _context.ChangeTracker.Clear();
                    result.Errors.Add(new ImportContractRowErrorDto(rowNumber, mssv, "Dữ liệu dòng không hợp lệ hoặc vi phạm ràng buộc lưu trữ."));
                }
            }

            result.Failed = result.Errors.Count;
            result.Message = BuildImportSummaryMessage(result);
            return result;
        }

        private async Task<DonDangKy?> FindMatchingApplicationAsync(string mssv, string appCode, string academicYear)
        {
            if (!string.IsNullOrWhiteSpace(appCode))
            {
                var exact = await _context.DonDangKys
                    .Include(d => d.DotDangKy)
                        .ThenInclude(dot => dot!.KyHoc)
                    .Include(d => d.LoaiPhong)
                    .FirstOrDefaultAsync(d =>
                        d.MaDonDangKy == appCode &&
                        d.MaSinhVien == mssv &&
                        d.DotDangKy != null &&
                        d.DotDangKy.KyHoc != null &&
                        d.DotDangKy.KyHoc.MaNamHoc == academicYear);
                if (exact != null)
                {
                    return exact;
                }
            }

            return await _context.DonDangKys
                .Include(d => d.DotDangKy)
                    .ThenInclude(dot => dot!.KyHoc)
                .Include(d => d.LoaiPhong)
                .Where(d =>
                    d.MaSinhVien == mssv &&
                    d.TrangThai != "tuChoi" &&
                    d.TrangThai != "hetHan" &&
                    d.DotDangKy != null &&
                    d.DotDangKy.KyHoc != null &&
                    d.DotDangKy.KyHoc.MaNamHoc == academicYear)
                .OrderByDescending(d => d.NgayDangKy)
                .FirstOrDefaultAsync();
        }

        private static void MarkApplicationApprovedIfPending(DonDangKy? donDangKy, string? roomId, string? staffId)
        {
            if (donDangKy == null || donDangKy.TrangThai != "choDuyet")
            {
                return;
            }

            donDangKy.TrangThai = "daDuyet";
            donDangKy.MaNhanVienDuyet ??= staffId;
            donDangKy.NgayDuyet ??= DateTime.Now;
            if (string.IsNullOrEmpty(donDangKy.MaPhong) && !string.IsNullOrEmpty(roomId))
            {
                donDangKy.MaPhong = roomId;
            }
        }

        private static (Phong? Room, Giuong? Bed, string? ErrorMessage) ResolveBedForImportRow(
            string studentGender,
            string bedId,
            string roomCodeFromExcel,
            string? roomCodeFromApp,
            string? roomTypeFromApp,
            List<Phong> activeRooms,
            Dictionary<string, Phong> roomLookup,
            Dictionary<string, (Phong Room, Giuong Bed)> bedLookup,
            HashSet<string> occupiedBedIds)
        {
            if (!string.IsNullOrWhiteSpace(bedId))
            {
                if (!bedLookup.TryGetValue(bedId, out var bedPair))
                {
                    if (string.IsNullOrWhiteSpace(roomCodeFromExcel))
                    {
                        return (null, null, $"Không tìm thấy giường {bedId}.");
                    }
                }
                else
                {
                    bool roomActive = bedPair.Room.TrangThai == "hoatDong" && bedPair.Room.ToaNha?.TrangThai == "hoatDong";
                    if (roomActive && bedPair.Room.ToaNha != null &&
                        !ContractRules.IsGenderCompatible(studentGender, bedPair.Room.ToaNha.GioiTinhQuyDinh) &&
                        (string.IsNullOrWhiteSpace(roomCodeFromExcel) ||
                         roomCodeFromExcel.Equals(bedPair.Room.MaPhong, StringComparison.OrdinalIgnoreCase)))
                    {
                        return (null, null, $"Sinh viên {studentGender} không phù hợp với tòa nhà {bedPair.Room.MaToaNha} ({bedPair.Room.ToaNha.GioiTinhQuyDinh}).");
                    }

                    if (roomActive && bedPair.Bed.LaDangHoat &&
                        bedPair.Room.ToaNha != null &&
                        ContractRules.IsGenderCompatible(studentGender, bedPair.Room.ToaNha.GioiTinhQuyDinh) &&
                        !occupiedBedIds.Contains(bedPair.Bed.MaGiuong))
                    {
                        return (bedPair.Room, bedPair.Bed, null);
                    }
                }
            }

            string? targetRoomCode = !string.IsNullOrWhiteSpace(roomCodeFromExcel) ? roomCodeFromExcel : roomCodeFromApp;
            if (!string.IsNullOrWhiteSpace(targetRoomCode))
            {
                if (!roomLookup.TryGetValue(targetRoomCode, out var targetRoom))
                {
                    if (!string.IsNullOrWhiteSpace(roomCodeFromExcel))
                    {
                        return (null, null, $"Không tìm thấy phòng {roomCodeFromExcel}.");
                    }
                }
                else if (targetRoom.TrangThai == "hoatDong" && targetRoom.ToaNha?.TrangThai == "hoatDong")
                {
                    if (!ContractRules.IsGenderCompatible(studentGender, targetRoom.ToaNha.GioiTinhQuyDinh))
                    {
                        return (null, null, $"Sinh viên {studentGender} không phù hợp với tòa nhà {targetRoom.MaToaNha} ({targetRoom.ToaNha.GioiTinhQuyDinh}).");
                    }

                    var freeBedInRoom = targetRoom.DanhSachGiuong
                        .Where(b => b.LaDangHoat && !occupiedBedIds.Contains(b.MaGiuong))
                        .OrderBy(b => b.SoThuTu)
                        .FirstOrDefault();

                    if (freeBedInRoom != null)
                    {
                        return (targetRoom, freeBedInRoom, null);
                    }
                }
            }

            var candidateRooms = activeRooms.Where(r =>
                r.ToaNha != null &&
                ContractRules.IsGenderCompatible(studentGender, r.ToaNha.GioiTinhQuyDinh) &&
                (string.IsNullOrWhiteSpace(roomTypeFromApp) ||
                 r.MaLoaiPhong.Equals(roomTypeFromApp, StringComparison.OrdinalIgnoreCase)));

            foreach (var room in candidateRooms)
            {
                var freeBed = room.DanhSachGiuong
                    .Where(b => b.LaDangHoat && !occupiedBedIds.Contains(b.MaGiuong))
                    .OrderBy(b => b.SoThuTu)
                    .FirstOrDefault();

                if (freeBed != null)
                {
                    return (room, freeBed, null);
                }
            }

            return (null, null, "Không còn giường trống phù hợp cho sinh viên.");
        }

        private static string BuildImportSummaryMessage(ImportContractsResultDto result)
        {
            if (result.Imported == 0 && result.Skipped == 0 && result.Failed == 0)
            {
                return "Không có dòng dữ liệu hợp đồng nào được xử lý.";
            }

            var parts = new List<string>
            {
                $"Đã tạo {result.Imported} hợp đồng mới"
            };
            if (result.Skipped > 0)
            {
                parts.Add($"bỏ qua {result.Skipped} dòng (đã có hợp đồng hoặc đơn từ chối/hết hạn)");
            }
            if (result.Failed > 0)
            {
                parts.Add($"{result.Failed} dòng lỗi");
            }
            return string.Join(", ", parts) + ".";
        }
    }
}
