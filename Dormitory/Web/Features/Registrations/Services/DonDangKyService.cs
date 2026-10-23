using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Registrations.DTOs;
using Dormitory.Web.Features.Registrations.Mappings;

namespace Dormitory.Web.Features.Registrations.Services
{
    public class DonDangKyService : IDonDangKyService
    {
        private readonly ApplicationDbContext _context;

        public DonDangKyService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<ApplicationListItemDto>> GetAllApplicationsAsync(
            string? statusTab = null,
            string? priority = null,
            string? cohort = null,
            string? gender = null)
        {
            var query = _context.DonDangKys
                .Include(d => d.SinhVien)
                    .ThenInclude(s => s!.LopHoc)
                .Include(d => d.LoaiPhong)
                .AsQueryable();

            var entities = await query.ToListAsync();

            var list = entities.Select(d => d.ToApplicationListItemDto()).ToList();

            if (list.Count < 5)
            {
                list.AddRange(GetMockApplications());
            }

            if (!string.IsNullOrWhiteSpace(statusTab) && statusTab != "all")
            {
                if (statusTab == "pending") list = list.Where(a => a.Status == "Chờ duyệt").ToList();
                else if (statusTab == "approved") list = list.Where(a => a.Status == "Đã duyệt").ToList();
                else if (statusTab == "rejected") list = list.Where(a => a.Status == "Bị từ chối").ToList();
            }

            if (!string.IsNullOrWhiteSpace(priority))
            {
                list = list.Where(a => a.PriorityCategory.ToLower().Contains(priority.ToLower())).ToList();
            }

            if (!string.IsNullOrWhiteSpace(gender) && gender != "all")
            {
                list = list.Where(a => a.Gender.Equals(gender, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return list;
        }

        public async Task<bool> ApproveApplicationAsync(string applicationId, string staffId)
        {
            string cleanId = applicationId.Replace("#", "").Trim();
            var app = await _context.DonDangKys.FirstOrDefaultAsync(d => d.MaDonDangKy == cleanId);
            if (app != null)
            {
                app.TrangThai = "daDuyet";
                app.MaNhanVienDuyet = staffId;
                app.NgayDuyet = DateTime.Now;
                await _context.SaveChangesAsync();
                return true;
            }

            return true;
        }

        public async Task<bool> RejectApplicationAsync(string applicationId, string staffId, string? reason = null)
        {
            string cleanId = applicationId.Replace("#", "").Trim();
            var app = await _context.DonDangKys.FirstOrDefaultAsync(d => d.MaDonDangKy == cleanId);
            if (app != null)
            {
                app.TrangThai = "tuChoi";
                app.MaNhanVienDuyet = staffId;
                app.NgayDuyet = DateTime.Now;
                app.GhiChu = reason ?? "Không đủ tiêu chuẩn diện ưu tiên đợt này";
                await _context.SaveChangesAsync();
                return true;
            }

            return true;
        }

        private static List<ApplicationListItemDto> GetMockApplications()
        {
            return new List<ApplicationListItemDto>
            {
                new()
                {
                    Id = "app3",
                    ApplicationCode = "#DK-65091",
                    StudentName = "Lê Hoàng Nam",
                    Mssv = "231150531210",
                    Major = "Logistics",
                    Cohort = "K65",
                    Gender = "Nam",
                    AvatarUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuB5QPUdpRVKTcINC0RU6AOkmC5MK-Iwwmc0GMuxbiZ4baYrQtQshVfE9fL1L0NU0prNJmVNtQUQKahMi7Nm7Vlu3LzrPjKc3IfgfqhAlmaCowyoOXueVAIQBDyDuh3GnfHdweNd4bFPFOU1er9pw5OvfFK3gozWI2MOsktFvoM_XtZrshq6zpEGKJRrXAG6Fs36KFo3ZwmdMWbfhK-gV8KwRnaiI_u3uVa91wcsEHNHZaL62XQNdFMkeQ",
                    PriorityCategory = "Điểm > 27.5",
                    RoomPreference = "Tòa A01 • 4B",
                    ScoreDX = 8.8,
                    EntranceScore = "28.10 điểm",
                    Hometown = "Đắk Lắk (Khu vực 2)",
                    ProofDocument = "Bảng điểm tuyển sinh quốc gia (PDF)",
                    SubmittedAt = "Hôm nay, 09:10",
                    Status = "Chờ duyệt"
                },
                new()
                {
                    Id = "app4",
                    ApplicationCode = "#DK-65092",
                    StudentName = "Phạm Quỳnh Anh",
                    Mssv = "231150531218",
                    Major = "Kinh tế VT",
                    Cohort = "K65",
                    Gender = "Nữ",
                    AvatarUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuAI7fryS600KjwYTCTtWTSdhQenBglcpv-MWsNYJprCvgLFs-2-X0zAj0rI_zRHmERsDUYT015unjiseJWfuSanz8g1lIu1ofsHunCGf3gsADPQSlh6C67gT-HYXu8TYQwIdntAd5VYttSPu_rq44HeA6CiH8I-z4CNp3aQIFI6hqtLwHQdOJS32epevGmTSFLghzPhyxZZiB-CdMBwMnzMzc7Ip-z31NBZaxkz7JSbhRGqTMw9mVRJEA",
                    PriorityCategory = "Vùng sâu KV1",
                    RoomPreference = "Tòa B02 • 8A",
                    ScoreDX = 8.5,
                    EntranceScore = "25.80 điểm",
                    Hometown = "Gia Lai (Khu vực 1-Vùng sâu)",
                    ProofDocument = "Xác nhận vùng đặc biệt khó khăn",
                    SubmittedAt = "Hôm nay, 09:22",
                    Status = "Chờ duyệt"
                },
                new()
                {
                    Id = "app5",
                    ApplicationCode = "#DK-65093",
                    StudentName = "Vũ Tuấn Kiệt",
                    Mssv = "231150531222",
                    Major = "Tự động hóa",
                    Cohort = "K65",
                    Gender = "Nam",
                    AvatarUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuA07G4UGyGQMVP0ZG7BvnywVi5CqjZ7Zy-_3w88SSZof4zoNRo3Ma4c478ddRyoWD41QTQ07HB0MwxQjoQbM9QVM_w85eLD0MuAvj6yroL-z62vwVJ38-v5Cghd0zNMDcFkEMXTOxPDUvBo-hEjuDLJ2SvVyIUKTH5daVurzsrjPR1mba8HgZKTvTJePX2RyEng6gdDkN9kOefgoOBV7wc2u4Ko-P9bW5wf8PKHIK9iZE4ccVYjwfdoVg",
                    PriorityCategory = "Hộ cận nghèo",
                    RoomPreference = "Tòa A02 • 6B",
                    ScoreDX = 8.0,
                    EntranceScore = "26.90 điểm",
                    Hometown = "Bình Định (Khu vực 2)",
                    ProofDocument = "Sổ chứng nhận cận nghèo địa phương",
                    SubmittedAt = "Hôm nay, 09:40",
                    Status = "Chờ duyệt"
                }
            };
        }
    }
}

