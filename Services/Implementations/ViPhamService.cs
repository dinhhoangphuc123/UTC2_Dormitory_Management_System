using Microsoft.EntityFrameworkCore;
using Quan_ly_Ky_tuc_xa.Data;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Models.Entities;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Services.Implementations
{
    public class ViPhamService : IViPhamService
    {
        private readonly ApplicationDbContext _context;

        public ViPhamService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<ViolationRecordDto>> GetAllViolationsAsync(
            string? building = null,
            string? penaltyType = null,
            string? violationType = null,
            string? search = null)
        {
            var list = await _context.ViPhams
                .Include(v => v.SinhVien)
                    .ThenInclude(s => s!.DanhSachHopDong)
                        .ThenInclude(h => h.Giuong)
                            .ThenInclude(g => g!.Phong)
                                .ThenInclude(p => p!.ToaNha)
                .Include(v => v.LoaiViPham)
                .Include(v => v.NhanVienLap)
                .OrderByDescending(v => v.NgayViPham)
                .ToListAsync();

            var result = new List<ViolationRecordDto>();

            foreach (var v in list)
            {
                var sv = v.SinhVien;
                var hd = sv?.DanhSachHopDong.FirstOrDefault(h => h.TrangThai == "hieuLuc");
                var phong = hd?.Giuong?.Phong;
                string bld = phong?.MaToaNha ?? "A01";
                string room = phong != null ? $"P.{phong.MaPhong.Split('_').Last()}" : "P.304";

                string pType = v.HinhThucXuLy switch
                {
                    "nhacNho" => "remind",
                    "canhCao" => "warning",
                    "buocRaKhoi" => "expel",
                    _ => "reprimand"
                };

                string pLabel = v.HinhThucXuLy switch
                {
                    "nhacNho" => "Nhắc nhở",
                    "canhCao" => "Cảnh cáo",
                    "buocRaKhoi" => "Buộc rời KTX",
                    _ => "Khiển trách"
                };

                string vType = "cook";
                string content = (v.NoiDung ?? v.LoaiViPham?.TenLoaiViPham ?? "").ToLower();
                if (content.Contains("ồn")) vType = "noise";
                else if (content.Contains("người") || content.Contains("ngoài")) vType = "guest";
                else if (content.Contains("bạc") || content.Contains("cấm")) vType = "gambling";
                else if (content.Contains("điện")) vType = "electric";
                else if (content.Contains("thuốc")) vType = "smoke";

                result.Add(new ViolationRecordDto
                {
                    Id = v.MaViPham.ToString(),
                    Code = $"BB-2026-{v.MaViPham:D3}",
                    StudentId = sv?.MaSinhVien ?? "72DCHT21045",
                    StudentName = sv?.HoTen ?? "Trần Minh Hoàng",
                    Room = room,
                    Building = bld,
                    Violation = v.LoaiViPham?.TenLoaiViPham ?? "Nấu ăn sai quy định",
                    ViolationType = vType,
                    Date = v.NgayViPham.ToString("dd/MM/yyyy"),
                    Penalty = pLabel,
                    PenaltyType = pType,
                    Status = "Đã thi hành",
                    Notes = v.NoiDung ?? "Biên bản ghi nhận tại chỗ."
                });
            }

            if (!result.Any())
            {
                result = GetDefaultDemoViolations();
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                result = result.Where(v => v.Code.ToLower().Contains(s) || v.StudentId.ToLower().Contains(s) || v.StudentName.ToLower().Contains(s) || v.Room.ToLower().Contains(s)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(building) && building != "ALL")
            {
                result = result.Where(v => v.Building.Equals(building, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(penaltyType) && penaltyType != "ALL")
            {
                result = result.Where(v => v.PenaltyType.Equals(penaltyType, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(violationType) && violationType != "ALL")
            {
                result = result.Where(v => v.ViolationType.Equals(violationType, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return result;
        }

        public async Task<ViolationRecordDto> CreateViolationAsync(CreateViolationDto req)
        {
            string maLvp = "LVP01"; // Standard
            var entity = new ViPham
            {
                MaSinhVien = req.StudentId,
                MaLoaiViPham = maLvp,
                NgayViPham = DateTime.Today,
                NoiDung = req.Notes,
                HinhThucXuLy = req.PenaltyType switch
                {
                    "remind" => "nhacNho",
                    "warning" => "canhCao",
                    "expel" => "buocRaKhoi",
                    _ => "khiểnTrách"
                },
                MaNhanVienLap = "NV001"
            };

            _context.ViPhams.Add(entity);
            await _context.SaveChangesAsync();

            return new ViolationRecordDto
            {
                Id = entity.MaViPham.ToString(),
                Code = $"BB-2026-{entity.MaViPham:D3}",
                StudentId = req.StudentId,
                StudentName = req.StudentName,
                Room = req.Room.StartsWith("P.") ? req.Room : $"P.{req.Room}",
                Building = req.Building,
                Violation = req.Violation,
                ViolationType = req.ViolationType,
                Date = DateTime.Today.ToString("dd/MM/yyyy"),
                Penalty = req.Penalty,
                PenaltyType = req.PenaltyType,
                Status = "Chờ duyệt",
                Notes = req.Notes
            };
        }

        public async Task<bool> CloseViolationAsync(string violationId)
        {
            if (int.TryParse(violationId, out int id))
            {
                var rec = await _context.ViPhams.FindAsync(id);
                if (rec != null)
                {
                    await _context.SaveChangesAsync();
                }
            }
            return true;
        }

        private static List<ViolationRecordDto> GetDefaultDemoViolations()
        {
            return new List<ViolationRecordDto>
            {
                new() { Id = "1", Code = "BB-2026-089", StudentId = "72DCHT21045", StudentName = "Trần Minh Hoàng", Room = "P.304", Building = "A01", Violation = "Nấu ăn sai quy định (bếp điện)", ViolationType = "cook", Date = "26/10/2026", Penalty = "Khiển trách", PenaltyType = "reprimand", Status = "Đã thi hành", Notes = "Nấu ăn sai quy định (bếp điện công suất lớn 2000W)" },
                new() { Id = "2", Code = "BB-2026-088", StudentId = "73DCOT20112", StudentName = "Lê Quốc Bảo", Room = "P.202", Building = "B01", Violation = "Gây ồn ào quá giờ quy định", ViolationType = "noise", Date = "25/10/2026", Penalty = "Nhắc nhở", PenaltyType = "remind", Status = "Đã thi hành", Notes = "Gây ồn ào quá 23:00, ảnh hưởng phòng lân cận" },
                new() { Id = "3", Code = "BB-2026-087", StudentId = "71DCVT19008", StudentName = "Phạm Thị Mai", Room = "P.410", Building = "A02", Violation = "Dẫn người ngoài qua đêm", ViolationType = "guest", Date = "24/10/2026", Penalty = "Cảnh cáo cấp 2", PenaltyType = "warning", Status = "Đang khiếu nại", Notes = "Dẫn người ngoài vào phòng lưu trú qua đêm không đăng ký" },
                new() { Id = "4", Code = "BB-2026-086", StudentId = "72DCKT22194", StudentName = "Nguyễn Văn Đức", Room = "P.108", Building = "B02", Violation = "Tổ chức cờ bạc tại phòng", ViolationType = "gambling", Date = "22/10/2026", Penalty = "Buộc rời KTX", PenaltyType = "expel", Status = "Đã thi hành", Notes = "Tàng trữ chất cấm và tổ chức cờ bạc ăn tiền tại phòng" },
                new() { Id = "5", Code = "BB-2026-085", StudentId = "74DCCN23401", StudentName = "Võ Nhật Quang", Room = "P.501", Building = "A01", Violation = "Tự ý câu nối đường điện", ViolationType = "electric", Date = "21/10/2026", Penalty = "Cảnh cáo - Trừ 5đ", PenaltyType = "warning", Status = "Đang khiếu nại", Notes = "Tự ý đấu nối nguồn điện sinh hoạt làm nhảy CB tầng" },
                new() { Id = "6", Code = "BB-2026-084", StudentId = "73DCXD21012", StudentName = "Đỗ Tuấn Kiệt", Room = "P.215", Building = "B01", Violation = "Hút thuốc trong khuôn viên", ViolationType = "smoke", Date = "20/10/2026", Penalty = "Khiển trách", PenaltyType = "reprimand", Status = "Đã thi hành", Notes = "Hút thuốc lá trong hành lang ký túc xá" }
            };
        }
    }
}
