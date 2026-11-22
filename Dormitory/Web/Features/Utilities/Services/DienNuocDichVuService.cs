using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Features.Utilities.DTOs;
using Dormitory.Web.Features.Utilities.Entities;
using Dormitory.Web.Features.Utilities.Mappings;
using Dormitory.Web.Shared.Constants;

namespace Dormitory.Web.Features.Utilities.Services
{
    public class DienNuocDichVuService : IDienNuocDichVuService
    {
        private readonly ApplicationDbContext _context;

        public DienNuocDichVuService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<UtilityItemDto>> GetAllUtilitiesAsync(string? building = null, int? floor = null, string? status = null, string? search = null, string? academicYear = null)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null) return new List<UtilityItemDto>();

            var startYear = year.NgayBatDau.Year;
            var startMonth = year.NgayBatDau.Month;
            var endYear = year.NgayKetThuc.Year;
            var endMonth = year.NgayKetThuc.Month;
            var rooms = await _context.Phongs
                .AsNoTracking()
                .Include(p => p.ToaNha)
                .Include(p => p.LoaiPhong)
                .Include(p => p.DanhSachChiSoDienNuoc.Where(c =>
                    (c.Nam > startYear || (c.Nam == startYear && c.Thang >= startMonth)) &&
                    (c.Nam < endYear || (c.Nam == endYear && c.Thang <= endMonth))))
                .Include(p => p.DanhSachHoaDonPhong)
                .OrderBy(p => p.MaToaNha)
                .ThenBy(p => p.MaPhong)
                .AsSplitQuery()
                .ToListAsync();

            var serviceRows = await GetActiveServicesAsync(year);
            var servicesByRoom = serviceRows
                .GroupBy(row => row.RoomId)
                .ToDictionary(group => group.Key, group => group.Select(row => row.Name).Distinct().ToList());
            var serviceCodesByRoom = serviceRows
                .GroupBy(row => row.RoomId)
                .ToDictionary(group => group.Key, group => group.Select(row => row.Code).Distinct().ToList());

            // Kỳ hiển thị luôn là tháng hiện tại: sang tháng mới chỉ số cũ được giữ làm mốc
            // đầu kỳ và nhãn tự quay về "chờ chốt số" mà không cần thao tác gì.
            int periodMonth = DateTime.Today.Month;
            int periodYear = DateTime.Today.Year;
            var lockByRoom = await GetUtilityLockMapAsync(periodMonth, periodYear);

            var result = rooms.Select(r => r.ToUtilityItemDto(
                periodMonth,
                periodYear,
                !lockByRoom.ContainsKey(r.MaPhong),
                lockByRoom.GetValueOrDefault(r.MaPhong),
                servicesByRoom.GetValueOrDefault(r.MaPhong),
                serviceCodesByRoom.GetValueOrDefault(r.MaPhong))).ToList();
            if (result.Count > 0)
            {
                var electricityRate = await GetCurrentRateAsync("dien", year.NgayKetThuc.Date);
                var waterRate = await GetCurrentRateAsync("nuoc", year.NgayKetThuc.Date);
                foreach (var item in result)
                {
                    item.ElectricityRate = electricityRate?.Gia;
                    item.WaterRate = waterRate?.Gia;
                }
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                result = result.Where(u => u.Room.ToLower().Contains(s) || u.Building.ToLower().Contains(s)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(building) && building != "ALL")
            {
                result = result.Where(u => u.Building.Equals(building, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (floor.HasValue && floor.Value > 0)
            {
                result = result.Where(u => u.Floor == floor.Value).ToList();
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                result = result.Where(u => u.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return result;
        }

        public async Task<string?> GetUtilityEditLockReasonAsync(string roomId, int month, int year)
        {
            if (string.IsNullOrWhiteSpace(roomId) || month < 1 || month > 12) return null;
            var lockByRoom = await GetUtilityLockMapAsync(month, year);
            return lockByRoom.GetValueOrDefault(roomId);
        }

        // Khóa chỉnh sửa khi hóa đơn điện nước của kỳ đã gửi cho sinh viên và sinh viên
        // đã thanh toán hoặc đã nộp minh chứng đang chờ BQL xác nhận.
        // Minh chứng bị từ chối thì mở khóa để BQL sửa lại số liệu.
        private async Task<Dictionary<string, string>> GetUtilityLockMapAsync(int month, int year)
        {
            var rows = await _context.HoaDons
                .Where(h => h.Thang == month && h.Nam == year
                    && h.TrangThai != "daHuy"
                    && h.HopDong != null && h.HopDong.Giuong != null
                    && h.DanhSachChiTietHoaDon.Any(d => d.LoaiKhoan == "dien" || d.LoaiKhoan == "nuoc"))
                .Select(h => new
                {
                    RoomId = h.HopDong!.Giuong!.MaPhong,
                    h.TrangThai,
                    h.NgayGui,
                    h.AnhMinhChung,
                    h.LyDoTuChoiMinhChung
                })
                .ToListAsync();

            var map = new Dictionary<string, string>();
            foreach (var group in rows.GroupBy(row => row.RoomId))
            {
                if (group.Any(row => row.TrangThai == "daThanhToan"))
                {
                    map[group.Key] = "Hóa đơn kỳ này đã được sinh viên thanh toán nên không thể chỉnh sửa số điện nước.";
                }
                else if (group.Any(row => row.NgayGui != null &&
                    !string.IsNullOrEmpty(row.AnhMinhChung) &&
                    string.IsNullOrEmpty(row.LyDoTuChoiMinhChung)))
                {
                    map[group.Key] = "Sinh viên đã gửi minh chứng thanh toán chờ xác nhận nên không thể chỉnh sửa số điện nước.";
                }
            }

            return map;
        }

        public async Task<UtilityItemDto?> RecordUtilityAsync(RecordUtilityDto req, string? academicYear = null, string? staffId = null)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null) return null;

            // Cho phép ghi bù tháng trước, nhưng không được ghi tháng tương lai
            // và phải nằm trong năm học đang chọn.
            int month = req.Thang ?? DateTime.Today.Month;
            int yearNumber = req.Nam ?? DateTime.Today.Year;
            var period = new DateTime(yearNumber, month, 1);
            var yearStart = new DateTime(year.NgayBatDau.Year, year.NgayBatDau.Month, 1);
            var yearEnd = new DateTime(year.NgayKetThuc.Year, year.NgayKetThuc.Month, 1);
            var currentPeriod = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
            if (period < yearStart || period > yearEnd || period > currentPeriod)
                return null;

            // Sinh viên đã trả tiền hoặc đang chờ xác nhận minh chứng thì khóa số liệu kỳ đó.
            if (await GetUtilityEditLockReasonAsync(req.RoomId, month, yearNumber) != null)
                return null;

            var room = await _context.Phongs
                .Include(p => p.ToaNha)
                .Include(p => p.LoaiPhong)
                .Include(p => p.DanhSachChiSoDienNuoc)
                .FirstOrDefaultAsync(p => p.MaPhong == req.RoomId);

            if (room == null) return null;

            var now = DateTime.Now;

            var elecIndex = room.DanhSachChiSoDienNuoc
                .FirstOrDefault(c => c.Loai == "dien" && c.Thang == month && c.Nam == yearNumber);
            var waterIndex = room.DanhSachChiSoDienNuoc
                .FirstOrDefault(c => c.Loai == "nuoc" && c.Thang == month && c.Nam == yearNumber);

            // Chỉ số đầu kỳ là chỉ số cuối của lần ghi gần nhất trước kỳ đang ghi.
            // Nếu chưa từng ghi lần nào thì mặc định 0 để vẫn ghi được chỉ số đầu tiên.
            var previousElec = room.DanhSachChiSoDienNuoc
                .Where(c => c.Loai == "dien" &&
                    (c.Nam < yearNumber || (c.Nam == yearNumber && c.Thang < month)))
                .OrderByDescending(c => c.Nam).ThenByDescending(c => c.Thang)
                .FirstOrDefault();
            var previousWater = room.DanhSachChiSoDienNuoc
                .Where(c => c.Loai == "nuoc" &&
                    (c.Nam < yearNumber || (c.Nam == yearNumber && c.Thang < month)))
                .OrderByDescending(c => c.Nam).ThenByDescending(c => c.Thang)
                .FirstOrDefault();

            decimal oldElec = elecIndex?.ChiSoCu ?? previousElec?.ChiSoMoi ?? 0m;
            decimal oldWater = waterIndex?.ChiSoCu ?? previousWater?.ChiSoMoi ?? 0m;

            // Chỉ số mới không được nhỏ hơn chỉ số cũ đã ghi.
            if (req.NewElectric < oldElec || req.NewWater < oldWater)
                return null;

            // Giới hạn theo kiểu decimal(10,2) của DB để tránh overflow 500.
            if (req.NewElectric > 99999999.99m || req.NewWater > 99999999.99m ||
                req.NewElectric < 0 || req.NewWater < 0)
                return null;

            var elecRate = elecIndex != null
                ? await _context.GiaDienNuocs.FirstOrDefaultAsync(g => g.MaGia == elecIndex.MaGia)
                : null;
            elecRate ??= await GetCurrentRateAsync("dien", period);
            var waterRate = waterIndex != null
                ? await _context.GiaDienNuocs.FirstOrDefaultAsync(g => g.MaGia == waterIndex.MaGia)
                : null;
            waterRate ??= await GetCurrentRateAsync("nuoc", period);

            if (elecRate == null || waterRate == null)
                return null;

            if (elecIndex == null)
            {
                elecIndex = new ChiSoDienNuoc
                {
                    MaPhong = room.MaPhong,
                    Loai = "dien",
                    Thang = month,
                    Nam = yearNumber,
                    ChiSoCu = oldElec,
                    ChiSoMoi = req.NewElectric,
                    MaGia = elecRate.MaGia,
                    NgayGhi = now,
                    MaNhanVienGhi = staffId
                };
                _context.ChiSoDienNuocs.Add(elecIndex);
            }
            else
            {
                elecIndex.ChiSoMoi = req.NewElectric;
                elecIndex.NgayGhi = now;
                elecIndex.MaGia = elecRate.MaGia;
                if (!string.IsNullOrWhiteSpace(staffId)) elecIndex.MaNhanVienGhi = staffId;
            }

            if (waterIndex == null)
            {
                waterIndex = new ChiSoDienNuoc
                {
                    MaPhong = room.MaPhong,
                    Loai = "nuoc",
                    Thang = month,
                    Nam = yearNumber,
                    ChiSoCu = oldWater,
                    ChiSoMoi = req.NewWater,
                    MaGia = waterRate.MaGia,
                    NgayGhi = now,
                    MaNhanVienGhi = staffId
                };
                _context.ChiSoDienNuocs.Add(waterIndex);
            }
            else
            {
                waterIndex.ChiSoMoi = req.NewWater;
                waterIndex.NgayGhi = now;
                waterIndex.MaGia = waterRate.MaGia;
                if (!string.IsNullOrWhiteSpace(staffId)) waterIndex.MaNhanVienGhi = staffId;
            }

            decimal usageElec = req.NewElectric - oldElec;
            decimal usageWat = req.NewWater - oldWater;

            // Tính tiền điện nước bằng công thức dùng chung, rồi chia đều theo số người ở thực tế.
            decimal tienDien = UtilityBillCalculator.CalculateElectricityCost(usageElec, elecRate.Gia);
            decimal tienNuoc = UtilityBillCalculator.CalculateWaterCost(usageWat, waterRate.Gia);
            decimal tongTien = tienDien + tienNuoc;

            var monthEnd = period.AddMonths(1).AddDays(-1);
            var residentContracts = await _context.HopDongs
                .Where(h => h.Giuong != null && h.Giuong.MaPhong == room.MaPhong &&
                    h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy" &&
                    h.NgayBatDau <= monthEnd && h.NgayKetThuc >= period &&
                    (academicYear == null || (h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear)))
                .ToListAsync();
            int soNguoiChia = residentContracts.Count > 0 ? residentContracts.Count : 1;

            var roomBill = await _context.HoaDonPhongs
                .FirstOrDefaultAsync(b => b.MaPhong == room.MaPhong && b.Thang == month && b.Nam == yearNumber);
            if (roomBill == null)
            {
                roomBill = new HoaDonPhong
                {
                    MaPhong = room.MaPhong,
                    Thang = month,
                    Nam = yearNumber,
                    NgayTao = now,
                    TrangThai = "chuaChot"
                };
                _context.HoaDonPhongs.Add(roomBill);
            }

            roomBill.TienDien = tienDien;
            roomBill.TienNuoc = tienNuoc;
            roomBill.TongTien = tongTien;
            roomBill.SoNguoiChia = soNguoiChia;
            roomBill.TienMoiNguoi = UtilityBillCalculator.SplitCostPerPerson(tongTien, soNguoiChia);

            // Hóa đơn đã lập nhưng chưa bị khóa (chưa thanh toán, chưa nộp minh chứng)
            // thì cập nhật lại số tiền điện/nước trên hóa đơn đã gửi cho từng sinh viên.
            if (roomBill.TrangThai == "daChot")
            {
                await SyncFinalizedInvoiceUtilitiesAsync(room, month, yearNumber, tienDien, tienNuoc, soNguoiChia);
            }

            // Checkbox dịch vụ trong form ghi chỉ số phải tác động thật vào DangKyDichVu.
            await SyncRoomServicesAsync(residentContracts, period, monthEnd, req.HasInternet, req.HasTrash, staffId, now);

            await _context.SaveChangesAsync();

            bool isOver = usageElec > AppDefaults.ElectricUsageWarningKwh || usageWat > AppDefaults.WaterUsageWarningM3;
            string roomNum = room.MaPhong.Split('_').Last();

            return new UtilityItemDto
            {
                Id = room.MaPhong,
                Room = $"{room.MaToaNha}-{roomNum}",
                Building = room.MaToaNha,
                Floor = room.SoTang,
                Capacity = $"Tầng {room.SoTang} · {room.LoaiPhong?.SoNguoiToiDa ?? 0} Chỗ",
                OldElectric = oldElec,
                NewElectric = req.NewElectric,
                UsageElectric = usageElec,
                OldWater = oldWater,
                NewWater = req.NewWater,
                UsageWater = usageWat,
                ElectricityRate = elecRate.Gia,
                WaterRate = waterRate.Gia,
                Services = await GetServicesForRoomAsync(room.MaPhong, year),
                ServiceCodes = await GetServiceCodesForRoomAsync(room.MaPhong, year),
                Status = isOver ? "EXCEEDED" : "RECORDED",
                UpdatedAt = now.ToString("dd/MM/yyyy HH:mm")
            };
        }

        // Đã chốt hóa đơn nhưng còn được sửa: cập nhật số tiền điện/nước trên hóa đơn
        // chưa thanh toán để sinh viên thấy đúng số liệu mới.
        private async Task SyncFinalizedInvoiceUtilitiesAsync(
            Dormitory.Web.Features.Rooms.Entities.Phong room, int month, int yearNumber,
            decimal tienDien, decimal tienNuoc, int soNguoiChia)
        {
            decimal perElec = UtilityBillCalculator.SplitCostPerPerson(tienDien, soNguoiChia);
            decimal perWat = UtilityBillCalculator.SplitCostPerPerson(tienNuoc, soNguoiChia);
            string ky = $"T{month:D2}/{yearNumber}";

            var invoices = await _context.HoaDons
                .Include(h => h.DanhSachChiTietHoaDon)
                .Where(h => h.Thang == month && h.Nam == yearNumber
                    && (h.TrangThai == "chuaThanhToan" || h.TrangThai == "nhap")
                    && h.HopDong != null && h.HopDong.Giuong != null && h.HopDong.Giuong.MaPhong == room.MaPhong)
                .ToListAsync();

            foreach (var invoice in invoices)
            {
                foreach (var line in invoice.DanhSachChiTietHoaDon)
                {
                    if (line.LoaiKhoan == "dien")
                    {
                        line.NoiDung = $"Tiền điện {ky} (chia {soNguoiChia} người)";
                        line.SoLuong = 1;
                        line.DonGia = perElec;
                        line.ThanhTien = perElec;
                    }
                    else if (line.LoaiKhoan == "nuoc")
                    {
                        line.NoiDung = $"Tiền nước {ky} (chia {soNguoiChia} người)";
                        line.SoLuong = 1;
                        line.DonGia = perWat;
                        line.ThanhTien = perWat;
                    }
                }
            }
        }

        // Bật checkbox dịch vụ thì ghi đăng ký "dangDung" cho mọi hợp đồng còn ở trong phòng
        // (BQL tự duyệt vì chính BQL tích xác nhận); tắt checkbox thì dừng đăng ký trước kỳ ghi số.
        private async Task SyncRoomServicesAsync(List<Dormitory.Web.Features.Contracts.Entities.HopDong> contracts,
            DateTime period, DateTime monthEnd, bool? hasInternet, bool? hasTrash, string? staffId, DateTime now)
        {
            if (contracts.Count == 0) return;

            var flags = new (string ServiceCode, bool? Want)[]
            {
                (Shared.Constants.ServiceCodes.Internet, hasInternet),
                (Shared.Constants.ServiceCodes.Trash, hasTrash)
            };
            var contractIds = contracts.Select(c => c.MaHopDong).ToList();

            foreach (var (code, want) in flags)
            {
                if (want == null) continue;

                bool serviceExists = await _context.DichVus.AnyAsync(d => d.MaDichVu == code && d.LaDangHoat);
                if (!serviceExists) continue;

                var registrations = await _context.DangKyDichVus
                    .Where(r => contractIds.Contains(r.MaHopDong) && r.MaDichVu == code)
                    .ToListAsync();

                foreach (var contract in contracts)
                {
                    var current = registrations.FirstOrDefault(r => r.MaHopDong == contract.MaHopDong &&
                        (r.TrangThai == AppDefaults.ServiceActive || r.TrangThai == AppDefaults.ServicePending) &&
                        r.NgayBatDau <= monthEnd && (r.NgayKetThuc == null || r.NgayKetThuc >= period));

                    if (want == true)
                    {
                        if (current == null)
                        {
                            _context.DangKyDichVus.Add(new DangKyDichVu
                            {
                                MaHopDong = contract.MaHopDong,
                                MaDichVu = code,
                                SoLuong = 1,
                                NgayBatDau = period,
                                TrangThai = AppDefaults.ServiceActive,
                                MaNhanVienDuyet = staffId,
                                NgayDuyet = now
                            });
                        }
                    }
                    else if (current != null)
                    {
                        current.TrangThai = AppDefaults.ServiceCancelled;
                        current.NgayKetThuc = period.AddDays(-1);
                    }
                }
            }
        }

        public async Task<(bool Success, string? ErrorMessage, FinalizeUtilityResultDto? Data)> FinalizeUtilityBillsAsync(
            FinalizeUtilityDto req, string? academicYear = null, string? staffId = null)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null)
                return (false, "Vui lòng chọn một năm học hợp lệ trước khi chốt hóa đơn.", null);

            if (string.IsNullOrWhiteSpace(req.RoomId))
                return (false, "Mã phòng không được để trống.", null);

            // Chốt hóa đơn phòng có kỳ ghi chỉ số mới nhất còn "chuaChot",
            // hoặc đúng kỳ được chỉ định khi BQL chốt bù hóa đơn tồn.
            var billQuery = _context.HoaDonPhongs
                .Include(b => b.Phong)
                .Where(b => b.MaPhong == req.RoomId && b.TrangThai == "chuaChot");
            if (req.Thang.HasValue && req.Nam.HasValue)
            {
                billQuery = billQuery.Where(b => b.Thang == req.Thang.Value && b.Nam == req.Nam.Value);
            }

            var roomBill = await billQuery
                .OrderByDescending(b => b.Nam).ThenByDescending(b => b.Thang)
                .FirstOrDefaultAsync();
            if (roomBill == null)
                return (false, "Phòng này không có hóa đơn điện nước chờ chốt.", null);

            // Đã gửi hóa đơn và sinh viên đã trả tiền/nộp minh chứng chờ xác nhận thì không chốt lại.
            var lockReason = await GetUtilityEditLockReasonAsync(req.RoomId, roomBill.Thang, roomBill.Nam);
            if (lockReason != null)
                return (false, lockReason, null);

            var period = new DateTime(roomBill.Nam, roomBill.Thang, 1);
            var monthEnd = period.AddMonths(1).AddDays(-1);

            // Đúng danh sách người ở dùng để chia tiền khi ghi chỉ số:
            // hợp đồng phủ qua kỳ hóa đơn và chưa kết thúc/hủy.
            var residentContracts = await _context.HopDongs
                .Where(h => h.Giuong != null && h.Giuong.MaPhong == roomBill.MaPhong &&
                    h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy" &&
                    h.NgayBatDau <= monthEnd && h.NgayKetThuc >= period &&
                    h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear)
                .ToListAsync();
            if (residentContracts.Count == 0)
                return (false, "Phòng không có sinh viên ở trong kỳ này nên chưa chốt được. Hãy kiểm tra lại hợp đồng.", null);

            // Chống tạo trùng: bỏ qua hợp đồng đã có hóa đơn tiền điện cho cùng kỳ.
            // Lọc navigation trực tiếp trong query vì projections không tự nạp danh sách con.
            var contractIds = residentContracts.Select(c => c.MaHopDong).ToList();
            var alreadyBilled = await _context.HoaDons
                .Where(h => contractIds.Contains(h.MaHopDong) && h.Thang == roomBill.Thang && h.Nam == roomBill.Nam
                    && h.TrangThai != "daHuy"
                    && h.DanhSachChiTietHoaDon.Any(d => d.LoaiKhoan == "dien" || d.LoaiKhoan == "nuoc"))
                .Select(h => h.MaHopDong)
                .ToHashSetAsync();

            int soNguoiChia = residentContracts.Count;
            decimal tienDienMoiNguoi = UtilityBillCalculator.SplitCostPerPerson(roomBill.TienDien, soNguoiChia);
            decimal tienNuocMoiNguoi = UtilityBillCalculator.SplitCostPerPerson(roomBill.TienNuoc, soNguoiChia);

            // Đăng ký dịch vụ đã duyệt và trùng kỳ hóa đơn, tính theo hợp đồng
            // để chốt luôn phí dịch vụ vào hóa đơn từng sinh viên.
            var serviceRegs = await _context.DangKyDichVus
                .Include(r => r.DichVu)
                .Where(r => contractIds.Contains(r.MaHopDong) &&
                    r.TrangThai == AppDefaults.ServiceActive &&
                    r.NgayBatDau <= monthEnd &&
                    (r.NgayKetThuc == null || r.NgayKetThuc >= period))
                .ToListAsync();
            var serviceLinesByContract = serviceRegs
                .GroupBy(r => r.MaHopDong)
                .ToDictionary(g => g.Key, g => g.Select(r => (
                    r.DichVu?.TenDichVu ?? r.MaDichVu,
                    SoLuong: r.SoLuong,
                    DonGia: r.DichVu?.DonGia ?? 0)).ToList());

            roomBill.SoNguoiChia = soNguoiChia;
            roomBill.TienMoiNguoi = tienDienMoiNguoi + tienNuocMoiNguoi;
            roomBill.TrangThai = "daChot";

            // Hạn nộp mặc định là ngày 15 của tháng kế tiếp sau kỳ hóa đơn.
            var dueDate = period.AddMonths(1).AddDays(14);
            string kyLabel = $"T{roomBill.Thang:D2}/{roomBill.Nam}";

            int created = 0;
            decimal tienDichVuTotal = 0;
            foreach (var contract in residentContracts)
            {
                if (alreadyBilled.Contains(contract.MaHopDong)) continue;
                var hasServices = serviceLinesByContract.TryGetValue(contract.MaHopDong, out var sl) && sl.Count > 0;
                if (tienDienMoiNguoi + tienNuocMoiNguoi <= 0 && !hasServices) continue;

                var invoice = new HoaDon
                {
                    MaHoaDon = Shared.Helpers.IdGenerator.Next("HD", period),
                    MaHopDong = contract.MaHopDong,
                    Thang = roomBill.Thang,
                    Nam = roomBill.Nam,
                    HanThanhToan = dueDate,
                    // BQL bỏ chọn "Gửi ngay" thì hóa đơn nằm ở dạng nháp để còn rà lại.
                    TrangThai = req.SendNow ? "chuaThanhToan" : "nhap",
                    NgayLap = DateTime.Now
                };
                invoice.DanhSachChiTietHoaDon.Add(new ChiTietHoaDon
                {
                    LoaiKhoan = "dien",
                    NoiDung = $"Tiền điện {kyLabel} (chia {soNguoiChia} người)",
                    SoLuong = 1,
                    DonGia = tienDienMoiNguoi,
                    ThanhTien = tienDienMoiNguoi
                });
                invoice.DanhSachChiTietHoaDon.Add(new ChiTietHoaDon
                {
                    LoaiKhoan = "nuoc",
                    NoiDung = $"Tiền nước {kyLabel} (chia {soNguoiChia} người)",
                    SoLuong = 1,
                    DonGia = tienNuocMoiNguoi,
                    ThanhTien = tienNuocMoiNguoi
                });

                decimal tienDichVu = 0;
                if (serviceLinesByContract.TryGetValue(contract.MaHopDong, out var serviceLines))
                {
                    foreach (var (tenDichVu, soLuongDv, donGiaDv) in serviceLines)
                    {
                        var thanhTienDv = soLuongDv * donGiaDv;
                        tienDichVu += thanhTienDv;
                        invoice.DanhSachChiTietHoaDon.Add(new ChiTietHoaDon
                        {
                            LoaiKhoan = "dichVu",
                            NoiDung = $"{tenDichVu} {kyLabel}",
                            SoLuong = soLuongDv,
                            DonGia = donGiaDv,
                            ThanhTien = thanhTienDv
                        });
                    }
                }

                if (req.SendNow)
                {
                    invoice.NgayGui = DateTime.Now;
                    _context.ThongBaos.Add(new ThongBao
                    {
                        MaSinhVien = contract.MaSinhVien,
                        TieuDe = $"Hóa đơn điện nước {kyLabel} đã được phát hành",
                        NoiDung = $"Ký túc xá đã chốt hóa đơn điện nước {kyLabel} cho phòng của bạn " +
                                  $"(điện {tienDienMoiNguoi:n0} đ + nước {tienNuocMoiNguoi:n0} đ/người" +
                                  (tienDichVu > 0 ? $", phí dịch vụ {tienDichVu:n0} đ" : "") +
                                  $", hạn nộp {dueDate:dd/MM/yyyy}).",
                        Loai = "hoaDon",
                        LienKet = "/student/invoice",
                        DaDoc = false,
                        NgayTao = DateTime.Now
                    });
                }

                _context.HoaDons.Add(invoice);
                tienDichVuTotal += tienDichVu;
                created++;
            }

            await _context.SaveChangesAsync();

            var room = roomBill.Phong;
            string roomLabel = room != null ? $"{room.MaToaNha}-{room.MaPhong.Split('_').Last()}" : roomBill.MaPhong;
            return (true, null, new FinalizeUtilityResultDto
            {
                Room = roomLabel,
                Thang = roomBill.Thang,
                Nam = roomBill.Nam,
                SoNguoiChia = soNguoiChia,
                TienDienMoiNguoi = tienDienMoiNguoi,
                TienNuocMoiNguoi = tienNuocMoiNguoi,
                TienDichVu = tienDichVuTotal,
                InvoicesCreated = created,
                InvoicesSkipped = alreadyBilled.Count
            });
        }

        private Task<GiaDienNuoc?> GetCurrentRateAsync(string type, DateTime date) =>
            _context.GiaDienNuocs
                .Where(rate => rate.Loai == type &&
                    rate.NgayApDung <= date &&
                    (rate.NgayHetHieuLuc == null || rate.NgayHetHieuLuc >= date))
                .OrderByDescending(rate => rate.NgayApDung)
                .FirstOrDefaultAsync();

        private async Task<List<(string RoomId, string Name, string Code)>> GetActiveServicesAsync(NamHoc year)
        {
            return await _context.DangKyDichVus
                .Where(registration =>
                    // Chỉ dịch vụ đã được BQL duyệt mới tính là đang dùng.
                    registration.TrangThai == AppDefaults.ServiceActive &&
                    registration.HopDong != null &&
                    registration.HopDong.KyHoc != null && registration.HopDong.KyHoc.MaNamHoc == year.MaNamHoc &&
                    registration.HopDong.NgayBatDau <= year.NgayKetThuc &&
                    registration.HopDong.NgayKetThuc >= year.NgayBatDau &&
                    registration.NgayBatDau <= year.NgayKetThuc &&
                    (registration.NgayKetThuc == null || registration.NgayKetThuc >= year.NgayBatDau))
                .Select(registration => new ValueTuple<string, string, string>(
                    registration.HopDong!.Giuong!.MaPhong,
                    registration.DichVu!.TenDichVu,
                    registration.MaDichVu))
                .ToListAsync();
        }

        private async Task<List<string>> GetServicesForRoomAsync(string roomId, NamHoc year) =>
            (await GetActiveServicesAsync(year))
                .Where(service => service.RoomId == roomId)
                .Select(service => service.Name)
                .Distinct()
                .ToList();

        private async Task<List<string>> GetServiceCodesForRoomAsync(string roomId, NamHoc year) =>
            (await GetActiveServicesAsync(year))
                .Where(service => service.RoomId == roomId)
                .Select(service => service.Code)
                .Distinct()
                .ToList();
    }
}
