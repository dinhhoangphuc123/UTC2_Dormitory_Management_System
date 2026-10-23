using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Payments.Entities
{
    [Table("thanhToan")]
    public class ThanhToan
    {
        [Key]
        [MaxLength(20)]
        [Column("maThanhToan")]
        public string MaThanhToan { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maHoaDon")]
        public string MaHoaDon { get; set; } = string.Empty;

        [Column("soTien", TypeName = "decimal(12,2)")]
        public decimal SoTien { get; set; }

        [Column("ngayThanhToan")]
        public DateTime NgayThanhToan { get; set; } = DateTime.Now;

        [Required]
        [MaxLength(20)]
        [Column("phuongThuc")]
        public string PhuongThuc { get; set; } = "tienMat";

        [NotMapped]
        public string? MaGiaoDichNganHang { get; set; }

        [MaxLength(20)]
        [Column("maNhanVienThu")]
        public string? MaNhanVienThu { get; set; }

        [MaxLength(255)]
        [Column("ghiChu")]
        public string? GhiChu { get; set; }

        [ForeignKey(nameof(MaHoaDon))]
        public virtual HoaDon? HoaDon { get; set; }

        [ForeignKey(nameof(MaNhanVienThu))]
        public virtual NhanVien? NhanVienThu { get; set; }
    }
}
