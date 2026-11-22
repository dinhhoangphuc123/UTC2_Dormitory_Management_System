namespace Dormitory.Web.Features.Utilities.DTOs
{
    public class FinalizeUtilityDto
    {
        public string RoomId { get; set; } = string.Empty;

        // Gửi hóa đơn + thông báo cho sinh viên ngay khi chốt; false thì để BQL bấm Gửi sau.
        public bool SendNow { get; set; } = false;

        // Kỳ cần chốt; bỏ trống thì chốt hóa đơn chờ chốt mới nhất của phòng.
        public int? Thang { get; set; }
        public int? Nam { get; set; }
    }
}
