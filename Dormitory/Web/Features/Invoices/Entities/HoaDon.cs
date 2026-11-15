using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Invoices.Entities
{
    [Table("hoaDon")]
    public class HoaDon
    {
        [Key]
        [MaxLength(20)]
        [Column("maHoaDon")]
        public string MaHoaDon { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maHopDong")]
        public string MaHopDong { get; set; } = string.Empty;

        [Column("thang")]
        public int Thang { get; set; }

        [Column("nam")]
        public int Nam { get; set; }

        [Required]
        [Column("hanThanhToan", TypeName = "date")]
        public DateTime HanThanhToan { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "chuaThanhToan";

        [Column("ngayLap")]
        public DateTime NgayLap { get; set; } = DateTime.Now;

        // Ngày BQL gửi hóa đơn cho sinh viên; null là chưa gửi.
        [Column("ngayGui", TypeName = "datetime")]
        public DateTime? NgayGui { get; set; }

        // Tên tệp minh chứng thanh toán do sinh viên nộp (lưu trong App_Data/payment-proof).
        [MaxLength(255)]
        [Column("anhMinhChung")]
        public string? AnhMinhChung { get; set; }

        [Column("ngayNopMinhChung", TypeName = "datetime")]
        public DateTime? NgayNopMinhChung { get; set; }

        [ForeignKey(nameof(MaHopDong))]
        public virtual HopDong? HopDong { get; set; }

        public virtual ICollection<ChiTietHoaDon> DanhSachChiTietHoaDon { get; set; } = new List<ChiTietHoaDon>();
        public virtual ICollection<ThanhToan> DanhSachThanhToan { get; set; } = new List<ThanhToan>();
    }
}
