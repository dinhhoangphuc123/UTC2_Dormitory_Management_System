namespace Dormitory.Web.Features.Utilities.DTOs
{
    public class RecordUtilityDto
    {
        public string RoomId { get; set; } = string.Empty;
        public decimal NewElectric { get; set; }
        public decimal NewWater { get; set; }

        // Tháng/năm cần ghi chỉ số; bỏ trống thì dùng tháng hiện tại.
        public int? Thang { get; set; }
        public int? Nam { get; set; }

        // Checkbox dịch vụ trong form ghi chỉ số; null là không thay đổi đăng ký dịch vụ của phòng.
        public bool? HasInternet { get; set; }
        public bool? HasTrash { get; set; }
    }
}
