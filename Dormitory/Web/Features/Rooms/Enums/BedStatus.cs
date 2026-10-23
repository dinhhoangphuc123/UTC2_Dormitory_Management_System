namespace Dormitory.Web.Features.Rooms.Enums
{
    public static class BedStatus
    {
        public const string GiuongTrong = "Giường trống";
        public const string DangSuDung = "Đang sử dụng";
        public const string BaoTri = "Bảo trì";

        public static string FromDbValues(bool laDangHoat, bool hasActiveContract)
        {
            if (!laDangHoat) return BaoTri;
            return hasActiveContract ? DangSuDung : GiuongTrong;
        }
    }
}
