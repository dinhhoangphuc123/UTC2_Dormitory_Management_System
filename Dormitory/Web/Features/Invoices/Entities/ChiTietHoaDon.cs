using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Invoices.Entities
{
    [Table("chiTietHoaDon")]
    public class ChiTietHoaDon
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maChiTiet")]
        public int MaChiTiet { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maHoaDon")]
        public string MaHoaDon { get; set; } = string.Empty;

        [MaxLength(20)]
        [Column("maDichVu")]
        public string? MaDichVu { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("noiDung")]
        public string NoiDung { get; set; } = string.Empty;

        [Column("soLuong")]
        public int SoLuong { get; set; } = 1;

        [Column("donGia", TypeName = "decimal(12,2)")]
        public decimal DonGia { get; set; }

        [Column("thanhTien", TypeName = "decimal(14,2)")]
        public decimal ThanhTien { get; set; }

        [ForeignKey(nameof(MaHoaDon))]
        public virtual HoaDon? HoaDon { get; set; }

        [ForeignKey(nameof(MaDichVu))]
        public virtual DichVu? DichVu { get; set; }
    }
}

