namespace Dormitory.Web.Shared.Constants
{
    public static class RoleNames
    {
        public const string Admin = "admin";
        public const string QuanLy = "quanLy";
        public const string KeToan = "keToan";
        public const string SinhVien = "sinhVien";

        public const string AdminOrManagerPolicy = "AdminOrManager";
        public const string StaffOnlyPolicy = "StaffOnly";
    }

    public static class AppDefaults
    {
        public const string DefaultAcademicYear = "NH2026-2027";
        public const string DefaultSemester = "HK1_2026_2027";
        public const decimal ElectricityUnitPrice = 2800m;
        public const decimal WaterUnitPrice = 14500m;
    }
}

