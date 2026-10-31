using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Buildings.Entities;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.Students.Entities;

namespace Dormitory.Web.Features.StudentPortal.Services
{
    public static class StudentPortalRules
    {
        // 7 Dashboard registration states
        public const string StateChuaDangKy = "chuaDangKy";
        public const string StateChoDuyet = "choDuyet";
        public const string StateChoThanhToan = "choThanhToan";
        public const string StateHetHan = "hetHan";
        public const string StateBiTuChoi = "biTuChoi";
        public const string StateDaThanhToanChoNhanPhong = "daThanhToanChoNhanPhong";
        public const string StateDangO = "dangO";

        public static string ResolveDashboardRegistrationState(
            string? latestDonStatus,
            string? latestHopDongStatus,
            DateTime? hanGiuCho,
            DateTime? ngayNhanPhongThucTe,
            DateTime now)
        {
            if (latestHopDongStatus == "hieuLuc")
            {
                return ngayNhanPhongThucTe.HasValue ? StateDangO : StateDaThanhToanChoNhanPhong;
            }

            if (latestHopDongStatus == "choThanhToan")
            {
                if (hanGiuCho.HasValue && hanGiuCho.Value < now)
                {
                    return StateHetHan;
                }
                return StateChoThanhToan;
            }

            if (latestDonStatus == "choDuyet")
            {
                return StateChoDuyet;
            }

            if (latestDonStatus == "tuChoi")
            {
                return StateBiTuChoi;
            }

            if (latestDonStatus == "hetHan" || latestHopDongStatus == "daHuy")
            {
                return StateHetHan;
            }

            return StateChuaDangKy;
        }

        public static (bool Eligible, List<string> Reasons) CheckRoundEligibility(
            SinhVien student,
            DotDangKy round,
            bool hasActiveContract,
            bool hasApplicationInRound,
            bool hasGenderBuilding,
            DateTime now)
        {
            var reasons = new List<string>();

            if (student.TrangThai != "dangHoc")
            {
                reasons.Add("Tài khoản sinh viên không trong trạng thái đang học.");
            }

            if (hasActiveContract)
            {
                reasons.Add("Bạn hiện đang có hợp đồng nội trú hoặc hồ sơ đang giữ chỗ phòng.");
            }

            if (hasApplicationInRound)
            {
                reasons.Add("Bạn đã gửi đơn đăng ký trong đợt này.");
            }

            if (round.NgayMo.Date > now.Date)
            {
                reasons.Add($"Đợt đăng ký chưa mở (dự kiến mở ngày {round.NgayMo:dd/MM/yyyy}).");
            }
            else if (round.NgayDong.Date < now.Date)
            {
                reasons.Add($"Đợt đăng ký đã kết thúc vào ngày {round.NgayDong:dd/MM/yyyy}.");
            }

            if (!hasGenderBuilding)
            {
                reasons.Add("Hiện không có tòa nhà nào phù hợp với giới tính của bạn mở đăng ký.");
            }

            return (reasons.Count == 0, reasons);
        }

        public static (bool Selectable, string? UnselectableReason) CheckRoomSelectability(
            Phong room,
            int availableBedsCount,
            string studentGender)
        {
            var building = room.ToaNha;
            if (building != null && building.GioiTinhQuyDinh != "honHop" && 
                !string.Equals(building.GioiTinhQuyDinh, studentGender, StringComparison.OrdinalIgnoreCase))
            {
                return (false, "saiGioiTinh");
            }

            if (room.TrangThai == "baoTri" || (building != null && building.TrangThai == "baoTri"))
            {
                return (false, "baoTri");
            }

            if (room.TrangThai == "ngung" || (building != null && building.TrangThai == "ngung"))
            {
                return (false, "ngung");
            }

            if (availableBedsCount <= 0)
            {
                return (false, "hetGiuong");
            }

            return (true, null);
        }
    }
}
