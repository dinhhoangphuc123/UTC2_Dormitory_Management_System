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

        [Column("tienPhong", TypeName = "decimal(12,2)")]
        public decimal TienPhong { get; set; }

        [Column("tienDienNuoc", TypeName = "decimal(12,2)")]
        public decimal TienDienNuoc { get; set; }

        [Column("tienDichVuKhac", TypeName = "decimal(12,2)")]
        public decimal TienDichVuKhac { get; set; }

        [Column("tienMienGiam", TypeName = "decimal(12,2)")]
        public decimal TienMienGiam { get; set; }

        [Column("tienPhat", TypeName = "decimal(12,2)")]
        public decimal TienPhat { get; set; }

        [Column("tongTien", TypeName = "decimal(12,2)")]
        public decimal TongTien { get; set; }

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

