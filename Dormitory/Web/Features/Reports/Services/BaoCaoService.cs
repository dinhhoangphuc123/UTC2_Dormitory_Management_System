using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Dashboard.DTOs;
using Dormitory.Web.Features.Dashboard.Services;
using Dormitory.Web.Features.Reports.DTOs;

namespace Dormitory.Web.Features.Reports.Services
{
    public class BaoCaoService : IBaoCaoService
    {
        private readonly ApplicationDbContext _context;

        public BaoCaoService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ReportSummaryDto> GetReportSummaryAsync(string? academicYear = null, string? scope = null)
        {
            var yearCode = string.IsNullOrWhiteSpace(academicYear) ? null : academicYear.Trim();
            var year = yearCode == null
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == yearCode);
            if (year == null) return new ReportSummaryDto();

            var buildings = await _context.ToaNhas
                .Include(t => t.DanhSachPhong)
                    .ThenInclude(p => p.DanhSachGiuong)
                        .ThenInclude(g => g.DanhSachHopDong)
                            .ThenInclude(h => h.KyHoc)
                .AsSplitQuery()
                .ToListAsync();

            var invoices = await _context.HoaDons
                .Include(h => h.DanhSachThanhToan)
                .Include(h => h.HopDong)
                    .ThenInclude(hd => hd!.Giuong)
                        .ThenInclude(g => g!.Phong)
                .Include(h => h.HopDong)
                    .ThenInclude(hd => hd!.KyHoc)
                .ToListAsync();
            if (yearCode != null)
            {
                invoices = invoices
                    .Where(invoice => invoice.HopDong?.KyHoc?.MaNamHoc == yearCode)
                    .ToList();
            }
            var revenueByBuilding = invoices
                .Where(h => h.HopDong?.Giuong?.Phong != null)
                .GroupBy(h => h.HopDong!.Giuong!.Phong!.MaToaNha)
                .ToDictionary(
                    group => group.Key,
                    group => group.Sum(h => h.DanhSachThanhToan.Sum(payment => payment.SoTien)));
            var currentAcademicYear = await _context.NamHocs
                .Where(n => n.NgayBatDau <= DateTime.Today && n.NgayKetThuc >= DateTime.Today)
                .OrderByDescending(n => n.NgayBatDau)
                .Select(n => new { n.MaNamHoc, n.NgayBatDau, n.NgayKetThuc })
                .FirstOrDefaultAsync();

            var buildingOps = new List<BuildingOperationDto>();

            int totalRooms = 0;
            int totalBeds = 0;
            int totalOccupied = 0;

            foreach (var b in buildings)
            {
                if (b.TrangThai != "hoatDong") continue;

                var activeRooms = b.DanhSachPhong.Where(p => p.TrangThai == "hoatDong").ToList();
                int rCount = activeRooms.Count;
                int bCount = activeRooms.Sum(p => p.DanhSachGiuong.Count(g => g.LaDangHoat));
                int occCount = activeRooms.Sum(p => p.DanhSachGiuong.Count(g =>
                    g.LaDangHoat &&
                    g.DanhSachHopDong.Any(hd =>
                        hd.TrangThai != "daHuy" && hd.TrangThai != "daKetThuc" &&
                        hd.KyHoc?.MaNamHoc == yearCode &&
                        hd.NgayBatDau <= year.NgayKetThuc && (hd.NgayTraPhongThucTe ?? hd.NgayKetThuc) >= year.NgayBatDau)));

                int vacant = Math.Max(0, bCount - occCount);
                double rate = bCount > 0 ? Math.Round((double)occCount / bCount * 100, 1) : 0;
                decimal revenue = revenueByBuilding.GetValueOrDefault(b.MaToaNha);

                totalRooms += rCount;
                totalBeds += bCount;
                totalOccupied += occCount;

                buildingOps.Add(new BuildingOperationDto
                {
                    Name = $"Tòa {b.MaToaNha} ({b.TenToaNha})",
                    Rooms = rCount,
                    Beds = bCount,
                    Occupied = occCount,
                    Vacant = vacant,
                    Rate = rate,
                    Revenue = $"{revenue:N0} đ",
                    Status = rate >= 95 ? "Gần đầy" : (rate >= 70 ? "Đang hoạt động" : "Còn nhiều chỗ"),
                    StatusColor = rate >= 95 ? "warning" : (rate >= 70 ? "stable" : "info")
                });
            }

            int vacantBeds = Math.Max(0, totalBeds - totalOccupied);
            double totalRate = totalBeds > 0 ? Math.Round((double)totalOccupied / totalBeds * 100, 1) : 0.0;
            decimal totalRevenue = invoices.Sum(invoice => invoice.DanhSachThanhToan.Sum(payment => payment.SoTien));
            var yearLabel = year != null
                ? $"{year.NgayBatDau:yyyy}–{year.NgayKetThuc:yyyy} ({year.MaNamHoc})"
                : yearCode ?? (currentAcademicYear == null
                    ? string.Empty
                    : $"{currentAcademicYear.NgayBatDau:yyyy}–{currentAcademicYear.NgayKetThuc:yyyy} ({currentAcademicYear.MaNamHoc})");

            return new ReportSummaryDto
            {
                AcademicYear = yearLabel,
                TotalRooms = totalRooms,
                TotalBeds = totalBeds,
                OccupiedBeds = totalOccupied,
                VacantBeds = vacantBeds,
                OccupancyRate = totalRate,
                TotalRevenue = totalRevenue,
                BuildingOperations = buildingOps
            };
        }

        public async Task<byte[]> ExportDashboardAndReportExcelAsync(string? academicYear = null, string? scope = null)
        {
            var report = await GetReportSummaryAsync(academicYear, scope);
            var dashboard = await new DashboardService(_context).GetDashboardSummaryAsync(academicYear);

            string yearLabel = !string.IsNullOrWhiteSpace(report.AcademicYear)
                ? report.AcademicYear
                : (!string.IsNullOrWhiteSpace(academicYear) ? academicYear.Trim() : "Chưa chọn năm học");

            using var workbook = new XLWorkbook();
            workbook.Style.Font.FontName = "Calibri";
            workbook.Style.Font.FontSize = 11;

            BuildOverviewSheet(workbook, report, dashboard, yearLabel);
            BuildBuildingAndRoomSheet(workbook, report, dashboard, yearLabel);
            BuildCohortSheet(workbook, dashboard, yearLabel);
            BuildRevenueAndCashFlowSheet(workbook, dashboard, yearLabel);

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        private static void BuildOverviewSheet(
            XLWorkbook workbook,
            ReportSummaryDto report,
            DashboardSummaryDto dashboard,
            string yearLabel)
        {
            var ws = workbook.Worksheets.Add("Tổng quan Dashboard");
            const int totalCols = 9;

            int row = AddReportBanner(
                ws,
                "BÁO CÁO TỔNG QUAN KÝ TÚC XÁ PHÂN HIỆU UTC2",
                $"Năm học: {yearLabel}   |   Ngày xuất: {DateTime.Now:dd/MM/yyyy HH:mm}   |   Đơn vị tiền tệ: VNĐ",
                totalCols);

            row++;

            // Phần I: Chỉ số tổng quan hệ thống (KPIs)
            row = AddSectionTitle(ws, row, "PHẦN I. CHỈ SỐ TỔNG QUAN HỆ THỐNG (KPIs)", totalCols);
            ws.Cell(row, 1).Value = "STT";
            ws.Range(row, 2, row, 4).Merge().Value = "Chỉ tiêu theo dõi";
            ws.Range(row, 5, row, 6).Merge().Value = "Giá trị";
            ws.Range(row, 7, row, 9).Merge().Value = "Chi tiết & Ghi chú";
            StyleHeaderRow(ws, row, totalCols);
            row++;

            var kpis = new (string Label, object Value, string? NumberFormat, string Note)[]
            {
                ("Sinh viên đang nội trú", dashboard.TotalStudents, "#,##0", "Sinh viên có hợp đồng lưu trú trong năm học"),
                ("Tổng sức chứa (giường hoạt động)", dashboard.TotalCapacity, "#,##0", $"Tỷ lệ lấp đầy giường: {dashboard.OccupancyPercent:0.0}%"),
                ("Giường đang sử dụng / Còn trống", $"{report.OccupiedBeds:N0} / {report.VacantBeds:N0}", null, $"Tổng cộng {report.TotalBeds:N0} giường (tỷ lệ lấp đầy {report.OccupancyRate:0.0}%)"),
                ("Tổng số phòng đang hoạt động", dashboard.TotalRooms, "#,##0", $"Phòng đã thuê: {dashboard.OccupiedRooms:N0} · Phòng còn trống: {Math.Max(0, dashboard.TotalRooms - dashboard.OccupiedRooms):N0}"),
                ("Tỷ lệ phòng đã thuê", dashboard.RoomOccupancyPercent / 100.0, "0.0%", "Tính trên phòng có ít nhất 1 hợp đồng lưu trú"),
                ("Tổng doanh thu đã thu", dashboard.TotalFeeRevenue, "#,##0", $"Tỷ lệ thu đạt {dashboard.CollectedPercent}% · Tăng trưởng cùng kỳ: {dashboard.RevenueGrowthPercent:+0.0;-0.0;0.0}%"),
                ("Công nợ chưa thu", dashboard.DebtAmount, "#,##0", "Tổng tiền trên hóa đơn phát hành trừ đi số đã thu"),
                ("Hồ sơ đăng ký nội trú", dashboard.TotalApplicationsCount, "#,##0", $"Đã duyệt: {dashboard.ApprovedApplicationsCount:N0} ({dashboard.ApplicationsApprovalRate:0.0}%) · Chờ duyệt: {dashboard.PendingApplicationsCount:N0}"),
                ("Yêu cầu sửa chữa cần xử lý", dashboard.RepairRequestsCount, "#,##0", "Trạng thái Mới gửi hoặc Đang xử lý")
            };

            for (int i = 0; i < kpis.Length; i++)
            {
                var item = kpis[i];
                ws.Cell(row, 1).Value = i + 1;
                ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                var labelRange = ws.Range(row, 2, row, 4).Merge();
                labelRange.Value = item.Label;
                ws.Cell(row, 2).Style.Font.Bold = true;

                var valRange = ws.Range(row, 5, row, 6).Merge();
                SetCellObjectValue(ws.Cell(row, 5), item.Value);
                ws.Cell(row, 5).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                ws.Cell(row, 5).Style.Font.Bold = true;
                ws.Cell(row, 5).Style.Font.FontColor = XLColor.FromHtml("#0B2A5B");
                if (!string.IsNullOrEmpty(item.NumberFormat))
                {
                    ws.Cell(row, 5).Style.NumberFormat.Format = item.NumberFormat;
                }

                var noteRange = ws.Range(row, 7, row, 9).Merge();
                noteRange.Value = item.Note;

                StyleDataRow(ws, row, totalCols, i % 2 == 1);
                row++;
            }

            row++;

            // Phần II: Vận hành & công suất theo từng tòa nhà
            row = AddSectionTitle(ws, row, "PHẦN II. VẬN HÀNH & CÔNG SUẤT THEO TỪNG TÒA NHÀ", totalCols);
            row = WriteBuildingOperationsTable(ws, row, report.BuildingOperations, report.OccupancyRate, includeAutoFilter: false);

            row++;

            // Phần III: Thống kê phòng theo loại dịch vụ
            row = AddSectionTitle(ws, row, "PHẦN III. THỐNG KÊ PHÒNG THEO LOẠI DỊCH VỤ", totalCols);
            ws.Cell(row, 1).Value = "STT";
            ws.Range(row, 2, row, 3).Merge().Value = "Loại phòng dịch vụ";
            ws.Cell(row, 4).Value = "Tổng số phòng";
            ws.Cell(row, 5).Value = "Phòng đã thuê";
            ws.Cell(row, 6).Value = "Phòng còn trống";
            ws.Cell(row, 7).Value = "Tỷ lệ thuê";
            ws.Range(row, 8, row, 9).Merge().Value = "Tỷ trọng cơ cấu";
            StyleHeaderRow(ws, row, totalCols);
            row++;

            if (dashboard.RoomTypeStats.Count == 0)
            {
                row = AddEmptyDataRow(ws, row, totalCols, "Chưa có dữ liệu loại phòng.");
            }
            else
            {
                int totalTypeRooms = dashboard.RoomTypeStats.Sum(r => r.RoomCount);
                int totalTypeOccupied = dashboard.RoomTypeStats.Sum(r => r.OccupiedCount);
                for (int i = 0; i < dashboard.RoomTypeStats.Count; i++)
                {
                    var rt = dashboard.RoomTypeStats[i];
                    int vacant = Math.Max(0, rt.RoomCount - rt.OccupiedCount);
                    double occRate = rt.RoomCount > 0 ? (double)rt.OccupiedCount / rt.RoomCount : 0;
                    double shareRate = totalTypeRooms > 0 ? (double)rt.RoomCount / totalTypeRooms : 0;

                    ws.Cell(row, 1).Value = i + 1;
                    ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Range(row, 2, row, 3).Merge().Value = rt.Name;
                    ws.Cell(row, 4).Value = rt.RoomCount;
                    ws.Cell(row, 5).Value = rt.OccupiedCount;
                    ws.Cell(row, 6).Value = vacant;
                    ws.Cell(row, 7).Value = occRate;
                    ws.Range(row, 8, row, 9).Merge().Value = shareRate;

                    ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 6).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 7).Style.NumberFormat.Format = "0.0%";
                    ws.Cell(row, 8).Style.NumberFormat.Format = "0.0%";
                    ws.Cell(row, 8).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                    StyleDataRow(ws, row, totalCols, i % 2 == 1);
                    row++;
                }

                ws.Range(row, 1, row, 3).Merge().Value = "TỔNG CỘNG";
                ws.Cell(row, 4).Value = totalTypeRooms;
                ws.Cell(row, 5).Value = totalTypeOccupied;
                ws.Cell(row, 6).Value = Math.Max(0, totalTypeRooms - totalTypeOccupied);
                ws.Cell(row, 7).Value = totalTypeRooms > 0 ? (double)totalTypeOccupied / totalTypeRooms : 0;
                ws.Range(row, 8, row, 9).Merge().Value = totalTypeRooms > 0 ? 1.0 : 0.0;
                ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 6).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 7).Style.NumberFormat.Format = "0.0%";
                ws.Cell(row, 8).Style.NumberFormat.Format = "0.0%";
                ws.Cell(row, 8).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                StyleTotalRow(ws, row, totalCols);
                row++;
            }

            row++;

            // Phần IV: Thống kê sinh viên nội trú theo Khóa & Giới tính
            row = AddSectionTitle(ws, row, "PHẦN IV. SINH VIÊN NỘI TRÚ THEO KHÓA & GIỚI TÍNH", totalCols);
            ws.Cell(row, 1).Value = "STT";
            ws.Cell(row, 2).Value = "Khóa";
            ws.Cell(row, 3).Value = "Năm nhập học";
            ws.Cell(row, 4).Value = "Nam (SV)";
            ws.Cell(row, 5).Value = "Nữ (SV)";
            ws.Cell(row, 6).Value = "Tổng SV";
            ws.Cell(row, 7).Value = "Tỷ lệ Nam";
            ws.Range(row, 8, row, 9).Merge().Value = "Tỷ lệ Nữ";
            StyleHeaderRow(ws, row, totalCols);
            row++;

            if (dashboard.CohortGenderStats.Count == 0)
            {
                row = AddEmptyDataRow(ws, row, totalCols, "Chưa có dữ liệu sinh viên theo khóa.");
            }
            else
            {
                int sumMale = dashboard.CohortGenderStats.Sum(c => c.MaleCount);
                int sumFemale = dashboard.CohortGenderStats.Sum(c => c.FemaleCount);
                int sumAll = sumMale + sumFemale;

                for (int i = 0; i < dashboard.CohortGenderStats.Count; i++)
                {
                    var c = dashboard.CohortGenderStats[i];
                    ws.Cell(row, 1).Value = i + 1;
                    ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Cell(row, 2).Value = c.CohortName;
                    ws.Cell(row, 3).Value = c.Year;
                    ws.Cell(row, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Cell(row, 4).Value = c.MaleCount;
                    ws.Cell(row, 5).Value = c.FemaleCount;
                    ws.Cell(row, 6).Value = c.TotalCount;
                    ws.Cell(row, 7).Value = c.MalePercent / 100.0;
                    ws.Range(row, 8, row, 9).Merge().Value = c.FemalePercent / 100.0;

                    ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 6).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 7).Style.NumberFormat.Format = "0.0%";
                    ws.Cell(row, 8).Style.NumberFormat.Format = "0.0%";
                    ws.Cell(row, 8).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                    StyleDataRow(ws, row, totalCols, i % 2 == 1);
                    row++;
                }

                ws.Range(row, 1, row, 3).Merge().Value = "TỔNG CỘNG";
                ws.Cell(row, 4).Value = sumMale;
                ws.Cell(row, 5).Value = sumFemale;
                ws.Cell(row, 6).Value = sumAll;
                ws.Cell(row, 7).Value = sumAll > 0 ? (double)sumMale / sumAll : 0;
                ws.Range(row, 8, row, 9).Merge().Value = sumAll > 0 ? (double)sumFemale / sumAll : 0;
                ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 6).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 7).Style.NumberFormat.Format = "0.0%";
                ws.Cell(row, 8).Style.NumberFormat.Format = "0.0%";
                ws.Cell(row, 8).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                StyleTotalRow(ws, row, totalCols);
                row++;
            }

            row++;

            // Phần V: Doanh thu lũy kế theo tháng (Năm nay vs Cùng kỳ năm trước)
            row = AddSectionTitle(ws, row, "PHẦN V. DOANH THU LŨY KẾ THEO THÁNG (SO SÁNH CÙNG KỲ)", totalCols);
            ws.Cell(row, 1).Value = "STT";
            ws.Cell(row, 2).Value = "Tháng";
            ws.Cell(row, 3).Value = "Năm";
            ws.Range(row, 4, row, 5).Merge().Value = "Doanh thu lũy kế năm nay (VNĐ)";
            ws.Range(row, 6, row, 7).Merge().Value = "Cùng kỳ năm trước (VNĐ)";
            ws.Cell(row, 8).Value = "Chênh lệch (VNĐ)";
            ws.Cell(row, 9).Value = "Xu hướng";
            StyleHeaderRow(ws, row, totalCols);
            row++;

            if (dashboard.MonthlyRevenueStats.Count == 0)
            {
                row = AddEmptyDataRow(ws, row, totalCols, "Chưa có dữ liệu doanh thu theo tháng.");
            }
            else
            {
                for (int i = 0; i < dashboard.MonthlyRevenueStats.Count; i++)
                {
                    var m = dashboard.MonthlyRevenueStats[i];
                    decimal diff = m.Revenue - m.PreviousYearRevenue;
                    string trend = diff > 0 ? "Tăng" : (diff < 0 ? "Giảm" : "Ổn định");

                    ws.Cell(row, 1).Value = i + 1;
                    ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Cell(row, 2).Value = m.MonthLabel;
                    ws.Cell(row, 3).Value = m.Year;
                    ws.Cell(row, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Range(row, 4, row, 5).Merge().Value = m.Revenue;
                    ws.Range(row, 6, row, 7).Merge().Value = m.PreviousYearRevenue;
                    ws.Cell(row, 8).Value = diff;
                    ws.Cell(row, 9).Value = trend;

                    ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 4).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                    ws.Cell(row, 6).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 6).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                    ws.Cell(row, 8).Style.NumberFormat.Format = "+#,##0;-#,##0;0";
                    ws.Cell(row, 9).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                    StyleDataRow(ws, row, totalCols, i % 2 == 1);
                    if (diff > 0)
                    {
                        ws.Cell(row, 8).Style.Font.FontColor = XLColor.FromHtml("#059669");
                        ws.Cell(row, 9).Style.Font.FontColor = XLColor.FromHtml("#059669");
                    }
                    else if (diff < 0)
                    {
                        ws.Cell(row, 8).Style.Font.FontColor = XLColor.FromHtml("#DC2626");
                        ws.Cell(row, 9).Style.Font.FontColor = XLColor.FromHtml("#DC2626");
                    }
                    row++;
                }
            }

            row++;

            // Phần VI: Phân loại sự cố & Công việc cần xử lý ngay
            row = AddSectionTitle(ws, row, "PHẦN VI. PHÂN LOẠI SỰ CỐ SỬA CHỮA & CÔNG VIỆC CẦN XỬ LÝ", totalCols);

            ws.Cell(row, 1).Value = "STT";
            ws.Range(row, 2, row, 4).Merge().Value = "Nhóm sự cố sửa chữa";
            ws.Range(row, 5, row, 6).Merge().Value = "Số lượng yêu cầu";
            ws.Range(row, 7, row, 9).Merge().Value = "Tỷ trọng (%)";
            StyleHeaderRow(ws, row, totalCols);
            row++;

            if (dashboard.RepairCategoryStats.Count == 0)
            {
                row = AddEmptyDataRow(ws, row, totalCols, "Không có yêu cầu sửa chữa phát sinh trong năm học.");
            }
            else
            {
                for (int i = 0; i < dashboard.RepairCategoryStats.Count; i++)
                {
                    var rc = dashboard.RepairCategoryStats[i];
                    ws.Cell(row, 1).Value = i + 1;
                    ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Range(row, 2, row, 4).Merge().Value = rc.CategoryName;
                    ws.Range(row, 5, row, 6).Merge().Value = rc.Count;
                    ws.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 5).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                    ws.Range(row, 7, row, 9).Merge().Value = rc.Percent / 100.0;
                    ws.Cell(row, 7).Style.NumberFormat.Format = "0.0%";
                    ws.Cell(row, 7).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                    StyleDataRow(ws, row, totalCols, i % 2 == 1);
                    row++;
                }
            }

            row++;

            ws.Cell(row, 1).Value = "STT";
            ws.Range(row, 2, row, 4).Merge().Value = "Công việc / Hồ sơ cần xử lý";
            ws.Range(row, 5, row, 7).Merge().Value = "Thông tin chi tiết";
            ws.Range(row, 8, row, 9).Merge().Value = "Trạng thái";
            StyleHeaderRow(ws, row, totalCols);
            row++;

            if (dashboard.UrgentTasks.Count == 0)
            {
                row = AddEmptyDataRow(ws, row, totalCols, "Không có công việc tồn đọng cần xử lý ngay.");
            }
            else
            {
                for (int i = 0; i < dashboard.UrgentTasks.Count; i++)
                {
                    var task = dashboard.UrgentTasks[i];
                    ws.Cell(row, 1).Value = i + 1;
                    ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Range(row, 2, row, 4).Merge().Value = task.Title;
                    ws.Range(row, 5, row, 7).Merge().Value = task.Subtitle;
                    ws.Range(row, 8, row, 9).Merge().Value = task.Tag;
                    ws.Cell(row, 8).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    StyleDataRow(ws, row, totalCols, i % 2 == 1);
                    row++;
                }
            }

            ApplyColumnWidths(ws, [7, 28, 15, 15, 16, 16, 16, 20, 18]);
            ws.SheetView.FreezeRows(2);
        }

        private static void BuildBuildingAndRoomSheet(
            XLWorkbook workbook,
            ReportSummaryDto report,
            DashboardSummaryDto dashboard,
            string yearLabel)
        {
            var ws = workbook.Worksheets.Add("Vận hành Tòa nhà & Phòng");
            const int totalCols = 9;

            int row = AddReportBanner(
                ws,
                "CHI TIẾT VẬN HÀNH TÒA NHÀ & LOẠI PHÒNG DỊCH VỤ",
                $"Năm học: {yearLabel}   |   Tổng phòng: {report.TotalRooms:N0}   |   Tổng giường: {report.TotalBeds:N0}",
                totalCols);

            row++;
            row = AddSectionTitle(ws, row, "1. BẢNG VẬN HÀNH & CÔNG SUẤT TỪNG TÒA NHÀ", totalCols);
            row = WriteBuildingOperationsTable(ws, row, report.BuildingOperations, report.OccupancyRate, includeAutoFilter: true);

            row += 2;
            row = AddSectionTitle(ws, row, "2. THỐNG KÊ PHÒNG THEO LOẠI DỊCH VỤ", 6);
            ws.Cell(row, 1).Value = "STT";
            ws.Cell(row, 2).Value = "Loại phòng dịch vụ";
            ws.Cell(row, 3).Value = "Tổng số phòng";
            ws.Cell(row, 4).Value = "Phòng đã thuê";
            ws.Cell(row, 5).Value = "Phòng còn trống";
            ws.Cell(row, 6).Value = "Tỷ lệ thuê";
            StyleHeaderRow(ws, row, 6);
            row++;

            if (dashboard.RoomTypeStats.Count == 0)
            {
                AddEmptyDataRow(ws, row, 6, "Chưa có dữ liệu loại phòng.");
            }
            else
            {
                for (int i = 0; i < dashboard.RoomTypeStats.Count; i++)
                {
                    var rt = dashboard.RoomTypeStats[i];
                    int vacant = Math.Max(0, rt.RoomCount - rt.OccupiedCount);
                    double rate = rt.RoomCount > 0 ? (double)rt.OccupiedCount / rt.RoomCount : 0;

                    ws.Cell(row, 1).Value = i + 1;
                    ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Cell(row, 2).Value = rt.Name;
                    ws.Cell(row, 3).Value = rt.RoomCount;
                    ws.Cell(row, 4).Value = rt.OccupiedCount;
                    ws.Cell(row, 5).Value = vacant;
                    ws.Cell(row, 6).Value = rate;

                    ws.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 6).Style.NumberFormat.Format = "0.0%";
                    StyleDataRow(ws, row, 6, i % 2 == 1);
                    row++;
                }
            }

            ApplyColumnWidths(ws, [7, 30, 15, 15, 15, 15, 16, 20, 18]);
            ws.SheetView.FreezeRows(2);
        }

        private static void BuildCohortSheet(
            XLWorkbook workbook,
            DashboardSummaryDto dashboard,
            string yearLabel)
        {
            var ws = workbook.Worksheets.Add("Sinh viên theo Khóa");
            const int totalCols = 8;

            int row = AddReportBanner(
                ws,
                "THỐNG KÊ SINH VIÊN NỘI TRÚ THEO KHÓA & GIỚI TÍNH",
                $"Năm học: {yearLabel}   |   Tổng sinh viên đang nội trú: {dashboard.TotalStudents:N0} SV",
                totalCols);

            row++;
            int headerRow = row;
            ws.Cell(row, 1).Value = "STT";
            ws.Cell(row, 2).Value = "Khóa";
            ws.Cell(row, 3).Value = "Năm nhập học";
            ws.Cell(row, 4).Value = "Nam (SV)";
            ws.Cell(row, 5).Value = "Nữ (SV)";
            ws.Cell(row, 6).Value = "Tổng sinh viên";
            ws.Cell(row, 7).Value = "Tỷ lệ Nam";
            ws.Cell(row, 8).Value = "Tỷ lệ Nữ";
            StyleHeaderRow(ws, row, totalCols);
            row++;

            if (dashboard.CohortGenderStats.Count == 0)
            {
                AddEmptyDataRow(ws, row, totalCols, "Chưa có dữ liệu sinh viên theo khóa.");
            }
            else
            {
                int sumMale = dashboard.CohortGenderStats.Sum(c => c.MaleCount);
                int sumFemale = dashboard.CohortGenderStats.Sum(c => c.FemaleCount);
                int sumAll = sumMale + sumFemale;
                int lastDataRow = headerRow;

                for (int i = 0; i < dashboard.CohortGenderStats.Count; i++)
                {
                    var c = dashboard.CohortGenderStats[i];
                    ws.Cell(row, 1).Value = i + 1;
                    ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Cell(row, 2).Value = c.CohortName;
                    ws.Cell(row, 3).Value = c.Year;
                    ws.Cell(row, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Cell(row, 4).Value = c.MaleCount;
                    ws.Cell(row, 5).Value = c.FemaleCount;
                    ws.Cell(row, 6).Value = c.TotalCount;
                    ws.Cell(row, 7).Value = c.MalePercent / 100.0;
                    ws.Cell(row, 8).Value = c.FemalePercent / 100.0;

                    ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 6).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 7).Style.NumberFormat.Format = "0.0%";
                    ws.Cell(row, 8).Style.NumberFormat.Format = "0.0%";

                    StyleDataRow(ws, row, totalCols, i % 2 == 1);
                    lastDataRow = row;
                    row++;
                }

                ws.Range(headerRow, 1, lastDataRow, totalCols).SetAutoFilter();

                ws.Range(row, 1, row, 3).Merge().Value = "TỔNG CỘNG";
                ws.Cell(row, 4).Value = sumMale;
                ws.Cell(row, 5).Value = sumFemale;
                ws.Cell(row, 6).Value = sumAll;
                ws.Cell(row, 7).Value = sumAll > 0 ? (double)sumMale / sumAll : 0;
                ws.Cell(row, 8).Value = sumAll > 0 ? (double)sumFemale / sumAll : 0;
                ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 6).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 7).Style.NumberFormat.Format = "0.0%";
                ws.Cell(row, 8).Style.NumberFormat.Format = "0.0%";
                StyleTotalRow(ws, row, totalCols);
            }

            ApplyColumnWidths(ws, [7, 16, 16, 14, 14, 18, 15, 15]);
            ws.SheetView.FreezeRows(headerRow);
        }

        private static void BuildRevenueAndCashFlowSheet(
            XLWorkbook workbook,
            DashboardSummaryDto dashboard,
            string yearLabel)
        {
            var ws = workbook.Worksheets.Add("Doanh thu & Dòng tiền");
            const int totalCols = 7;

            int row = AddReportBanner(
                ws,
                "BÁO CÁO DOANH THU LŨY KẾ & CHI TIẾT DÒNG TIỀN",
                $"Năm học: {yearLabel}   |   Tổng đã thu: {dashboard.TotalFeeRevenue:N0} đ   |   Công nợ: {dashboard.DebtAmount:N0} đ",
                totalCols);

            row++;
            row = AddSectionTitle(ws, row, "1. DOANH THU LŨY KẾ THEO THÁNG (SO SÁNH CÙNG KỲ NĂM TRƯỚC)", totalCols);
            int headerRow = row;
            ws.Cell(row, 1).Value = "STT";
            ws.Cell(row, 2).Value = "Tháng";
            ws.Cell(row, 3).Value = "Năm";
            ws.Cell(row, 4).Value = "Doanh thu năm nay (VNĐ)";
            ws.Cell(row, 5).Value = "Cùng kỳ năm trước (VNĐ)";
            ws.Cell(row, 6).Value = "Chênh lệch (VNĐ)";
            ws.Cell(row, 7).Value = "Xu hướng";
            StyleHeaderRow(ws, row, totalCols);
            row++;

            if (dashboard.MonthlyRevenueStats.Count == 0)
            {
                row = AddEmptyDataRow(ws, row, totalCols, "Chưa có dữ liệu doanh thu lũy kế.");
            }
            else
            {
                int lastDataRow = headerRow;
                for (int i = 0; i < dashboard.MonthlyRevenueStats.Count; i++)
                {
                    var m = dashboard.MonthlyRevenueStats[i];
                    decimal diff = m.Revenue - m.PreviousYearRevenue;
                    ws.Cell(row, 1).Value = i + 1;
                    ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Cell(row, 2).Value = m.MonthLabel;
                    ws.Cell(row, 3).Value = m.Year;
                    ws.Cell(row, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Cell(row, 4).Value = m.Revenue;
                    ws.Cell(row, 5).Value = m.PreviousYearRevenue;
                    ws.Cell(row, 6).Value = diff;
                    ws.Cell(row, 7).Value = diff > 0 ? "Tăng" : (diff < 0 ? "Giảm" : "Ổn định");

                    ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 6).Style.NumberFormat.Format = "+#,##0;-#,##0;0";
                    ws.Cell(row, 7).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    StyleDataRow(ws, row, totalCols, i % 2 == 1);
                    lastDataRow = row;
                    row++;
                }
                ws.Range(headerRow, 1, lastDataRow, totalCols).SetAutoFilter();
            }

            row += 2;
            row = AddSectionTitle(ws, row, "2. CHI TIẾT DÒNG TIỀN THU THEO NGÀY", 4);
            ws.Cell(row, 1).Value = "STT";
            ws.Cell(row, 2).Value = "Ngày giao dịch";
            ws.Range(row, 3, row, 4).Merge().Value = "Số tiền thu trong ngày (VNĐ)";
            StyleHeaderRow(ws, row, 4);
            row++;

            if (dashboard.CashFlowData.Count == 0)
            {
                AddEmptyDataRow(ws, row, 4, "Chưa có đủ dữ liệu dòng tiền chi tiết theo ngày (cần tối thiểu 5 bản ghi thanh toán).");
            }
            else
            {
                decimal sumCash = 0;
                for (int i = 0; i < dashboard.CashFlowData.Count; i++)
                {
                    var cf = dashboard.CashFlowData[i];
                    sumCash += cf.Value;
                    ws.Cell(row, 1).Value = i + 1;
                    ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Cell(row, 2).Value = cf.Date;
                    ws.Cell(row, 2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    ws.Range(row, 3, row, 4).Merge().Value = cf.Value;
                    ws.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
                    ws.Cell(row, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                    StyleDataRow(ws, row, 4, i % 2 == 1);
                    row++;
                }

                ws.Range(row, 1, row, 2).Merge().Value = "TỔNG CỘNG";
                ws.Range(row, 3, row, 4).Merge().Value = sumCash;
                ws.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                StyleTotalRow(ws, row, 4);
            }

            ApplyColumnWidths(ws, [7, 18, 12, 26, 26, 22, 16]);
            ws.SheetView.FreezeRows(2);
        }

        private static int WriteBuildingOperationsTable(
            IXLWorksheet ws,
            int row,
            List<BuildingOperationDto> operations,
            double overallRate,
            bool includeAutoFilter)
        {
            const int totalCols = 9;
            int headerRow = row;
            ws.Cell(row, 1).Value = "STT";
            ws.Cell(row, 2).Value = "Tòa nhà";
            ws.Cell(row, 3).Value = "Tổng phòng";
            ws.Cell(row, 4).Value = "Tổng giường";
            ws.Cell(row, 5).Value = "Đang ở";
            ws.Cell(row, 6).Value = "Còn trống";
            ws.Cell(row, 7).Value = "Tỷ lệ lấp đầy";
            ws.Cell(row, 8).Value = "Doanh thu (VNĐ)";
            ws.Cell(row, 9).Value = "Trạng thái";
            StyleHeaderRow(ws, row, totalCols);
            row++;

            if (operations.Count == 0)
            {
                return AddEmptyDataRow(ws, row, totalCols, "Chưa có dữ liệu vận hành tòa nhà.");
            }

            int sumRooms = 0;
            int sumBeds = 0;
            int sumOccupied = 0;
            int sumVacant = 0;
            decimal sumRevenue = 0m;
            int lastDataRow = headerRow;

            for (int i = 0; i < operations.Count; i++)
            {
                var b = operations[i];
                decimal rev = ParseCurrencyAmount(b.Revenue);
                sumRooms += b.Rooms;
                sumBeds += b.Beds;
                sumOccupied += b.Occupied;
                sumVacant += b.Vacant;
                sumRevenue += rev;

                ws.Cell(row, 1).Value = i + 1;
                ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                ws.Cell(row, 2).Value = b.Name;
                ws.Cell(row, 3).Value = b.Rooms;
                ws.Cell(row, 4).Value = b.Beds;
                ws.Cell(row, 5).Value = b.Occupied;
                ws.Cell(row, 6).Value = b.Vacant;
                ws.Cell(row, 7).Value = b.Rate / 100.0;
                ws.Cell(row, 8).Value = rev;
                ws.Cell(row, 9).Value = b.Status;

                ws.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 6).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 7).Style.NumberFormat.Format = "0.0%";
                ws.Cell(row, 8).Style.NumberFormat.Format = "#,##0";
                ws.Cell(row, 9).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                StyleDataRow(ws, row, totalCols, i % 2 == 1);
                if (b.StatusColor == "warning")
                {
                    ws.Cell(row, 9).Style.Font.FontColor = XLColor.FromHtml("#D97706");
                    ws.Cell(row, 9).Style.Font.Bold = true;
                }

                lastDataRow = row;
                row++;
            }

            if (includeAutoFilter)
            {
                ws.Range(headerRow, 1, lastDataRow, totalCols).SetAutoFilter();
            }

            ws.Range(row, 1, row, 2).Merge().Value = "TỔNG CỘNG";
            ws.Cell(row, 3).Value = sumRooms;
            ws.Cell(row, 4).Value = sumBeds;
            ws.Cell(row, 5).Value = sumOccupied;
            ws.Cell(row, 6).Value = sumVacant;
            ws.Cell(row, 7).Value = overallRate / 100.0;
            ws.Cell(row, 8).Value = sumRevenue;
            ws.Cell(row, 9).Value = "Tổng hợp";

            ws.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
            ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0";
            ws.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
            ws.Cell(row, 6).Style.NumberFormat.Format = "#,##0";
            ws.Cell(row, 7).Style.NumberFormat.Format = "0.0%";
            ws.Cell(row, 8).Style.NumberFormat.Format = "#,##0";
            ws.Cell(row, 9).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            StyleTotalRow(ws, row, totalCols);
            return row + 1;
        }

        private static int AddReportBanner(IXLWorksheet ws, string title, string subtitle, int totalCols)
        {
            var titleRange = ws.Range(1, 1, 1, totalCols).Merge();
            titleRange.Value = title;
            titleRange.Style.Font.Bold = true;
            titleRange.Style.Font.FontSize = 14;
            titleRange.Style.Font.FontColor = XLColor.White;
            titleRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#0B2A5B");
            titleRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            titleRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Row(1).Height = 32;

            var subRange = ws.Range(2, 1, 2, totalCols).Merge();
            subRange.Value = subtitle;
            subRange.Style.Font.Italic = true;
            subRange.Style.Font.FontSize = 10;
            subRange.Style.Font.FontColor = XLColor.FromHtml("#1E3A8A");
            subRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#EFF6FF");
            subRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            subRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            subRange.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
            subRange.Style.Border.BottomBorderColor = XLColor.FromHtml("#BFDBFE");
            ws.Row(2).Height = 22;

            return 3;
        }

        private static int AddSectionTitle(IXLWorksheet ws, int row, string title, int totalCols)
        {
            var range = ws.Range(row, 1, row, totalCols).Merge();
            range.Value = title;
            range.Style.Font.Bold = true;
            range.Style.Font.FontSize = 11;
            range.Style.Font.FontColor = XLColor.White;
            range.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A8A");
            range.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
            range.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Row(row).Height = 24;
            return row + 1;
        }

        private static void StyleHeaderRow(IXLWorksheet ws, int row, int totalCols)
        {
            var range = ws.Range(row, 1, row, totalCols);
            range.Style.Font.Bold = true;
            range.Style.Font.FontColor = XLColor.White;
            range.Style.Fill.BackgroundColor = XLColor.FromHtml("#0B2A5B");
            range.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            range.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            range.Style.Alignment.WrapText = true;
            range.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            range.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
            range.Style.Border.OutsideBorderColor = XLColor.FromHtml("#0B2A5B");
            range.Style.Border.InsideBorderColor = XLColor.FromHtml("#1E40AF");
            ws.Row(row).Height = 26;
        }

        private static void StyleDataRow(IXLWorksheet ws, int row, int totalCols, bool alternate)
        {
            var range = ws.Range(row, 1, row, totalCols);
            range.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            range.Style.Alignment.WrapText = true;
            if (alternate)
            {
                range.Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
            }
            range.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            range.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
            range.Style.Border.OutsideBorderColor = XLColor.FromHtml("#CBD5E1");
            range.Style.Border.InsideBorderColor = XLColor.FromHtml("#E2E8F0");
            ws.Row(row).Height = 22;
        }

        private static void StyleTotalRow(IXLWorksheet ws, int row, int totalCols)
        {
            var range = ws.Range(row, 1, row, totalCols);
            range.Style.Font.Bold = true;
            range.Style.Font.FontColor = XLColor.FromHtml("#0F172A");
            range.Style.Fill.BackgroundColor = XLColor.FromHtml("#F1F5F9");
            range.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            range.Style.Border.TopBorder = XLBorderStyleValues.Medium;
            range.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
            range.Style.Border.LeftBorder = XLBorderStyleValues.Thin;
            range.Style.Border.RightBorder = XLBorderStyleValues.Thin;
            range.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
            range.Style.Border.TopBorderColor = XLColor.FromHtml("#0B2A5B");
            range.Style.Border.BottomBorderColor = XLColor.FromHtml("#94A3B8");
            range.Style.Border.InsideBorderColor = XLColor.FromHtml("#CBD5E1");
            ws.Row(row).Height = 24;
        }

        private static int AddEmptyDataRow(IXLWorksheet ws, int row, int totalCols, string message)
        {
            var range = ws.Range(row, 1, row, totalCols).Merge();
            range.Value = message;
            range.Style.Font.Italic = true;
            range.Style.Font.FontColor = XLColor.FromHtml("#64748B");
            range.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            range.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            range.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            range.Style.Border.OutsideBorderColor = XLColor.FromHtml("#CBD5E1");
            ws.Row(row).Height = 24;
            return row + 1;
        }

        private static void SetCellObjectValue(IXLCell cell, object value)
        {
            switch (value)
            {
                case int i:
                    cell.Value = i;
                    break;
                case decimal d:
                    cell.Value = d;
                    break;
                case double dbl:
                    cell.Value = dbl;
                    break;
                default:
                    cell.Value = value?.ToString() ?? string.Empty;
                    break;
            }
        }

        private static decimal ParseCurrencyAmount(string formatted)
        {
            if (string.IsNullOrWhiteSpace(formatted)) return 0m;
            bool isNegative = formatted.TrimStart().StartsWith('-');
            var digits = new string(formatted.Where(char.IsDigit).ToArray());
            if (!decimal.TryParse(digits, out var amount)) return 0m;
            return isNegative ? -amount : amount;
        }

        private static void ApplyColumnWidths(IXLWorksheet ws, double[] minWidths)
        {
            ws.Columns(1, minWidths.Length).AdjustToContents();
            for (int i = 0; i < minWidths.Length; i++)
            {
                var col = ws.Column(i + 1);
                col.Width = Math.Max(col.Width + 2.5, minWidths[i]);
            }
        }
    }
}
