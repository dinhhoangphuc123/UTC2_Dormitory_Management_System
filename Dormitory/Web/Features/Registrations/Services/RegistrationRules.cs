namespace Dormitory.Web.Features.Registrations.Services
{
    public static class RegistrationRules
    {
        public const string StepChoDuyet = "choDuyet";
        public const string StepDaDuyetChoThanhToan = "daDuyetChoThanhToan";
        public const string StepDaThanhToanChuaNhanPhong = "daThanhToanChuaNhanPhong";
        public const string StepHoanTat = "hoanTat";
        public const string StepTuChoi = "tuChoi";
        public const string StepHetHan = "hetHan";

        public static DateTime CalculateHoldExpiration(DateTime approvedAt, int holdHours)
        {
            if (holdHours <= 0) holdHours = 24;
            return approvedAt.AddHours(holdHours);
        }

        public static decimal CalculateInitialInvoiceAmount(decimal monthlyRent, int months, decimal depositAmount)
        {
            if (months <= 0) months = 1;
            if (monthlyRent < 0) monthlyRent = 0;
            if (depositAmount < 0) depositAmount = 0;

            return (monthlyRent * months) + depositAmount;
        }

        public static bool IsReservationExpired(DateTime? hanGiuCho, DateTime now)
        {
            return hanGiuCho.HasValue && hanGiuCho.Value < now;
        }

        public static bool IsWarningDue(DateTime? hanGiuCho, DateTime now, int warningHoursBefore = 3)
        {
            if (!hanGiuCho.HasValue) return false;
            var remaining = hanGiuCho.Value - now;
            return remaining.TotalSeconds > 0 && remaining.TotalHours <= warningHoursBefore;
        }

        public static string ResolveRegistrationStep(
            string donDangKyTrangThai,
            string? hopDongTrangThai,
            DateTime? hanGiuCho,
            DateTime? ngayNhanPhongThucTe,
            DateTime now)
        {
            if (donDangKyTrangThai == "tuChoi")
            {
                return StepTuChoi;
            }

            if (donDangKyTrangThai == "hetHan" || hopDongTrangThai == "daHuy")
            {
                return StepHetHan;
            }

            if (hopDongTrangThai == "choThanhToan" && IsReservationExpired(hanGiuCho, now))
            {
                return StepHetHan;
            }

            if (donDangKyTrangThai == "choDuyet")
            {
                return StepChoDuyet;
            }

            if (donDangKyTrangThai == "daDuyet" && hopDongTrangThai == "choThanhToan")
            {
                return StepDaDuyetChoThanhToan;
            }

            if (hopDongTrangThai == "hieuLuc")
            {
                if (ngayNhanPhongThucTe.HasValue)
                {
                    return StepHoanTat;
                }
                return StepDaThanhToanChuaNhanPhong;
            }

            return donDangKyTrangThai;
        }
    }
}
