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

        [ForeignKey(nameof(MaHopDong))]
        public virtual HopDong? HopDong { get; set; }

        public virtual ICollection<ChiTietHoaDon> DanhSachChiTietHoaDon { get; set; } = new List<ChiTietHoaDon>();
        public virtual ICollection<ThanhToan> DanhSachThanhToan { get; set; } = new List<ThanhToan>();
    }
}
