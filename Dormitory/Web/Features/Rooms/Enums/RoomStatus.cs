namespace Dormitory.Web.Features.Rooms.Enums
{
    public static class RoomStatus
    {
        public const string ConCho = "Còn chỗ";
        public const string DayPhong = "Đầy phòng";
        public const string DangBaoTri = "Đang bảo trì";
        public const string NgungHoatDong = "Ngừng hoạt động";

        public static string FromDbValue(string dbValue, int occupied, int capacity) => dbValue switch
        {
            "hoatDong" when occupied >= capacity => DayPhong,
            "hoatDong" => ConCho,
            "baoTri" => DangBaoTri,
            _ => NgungHoatDong
        };
    }
}
