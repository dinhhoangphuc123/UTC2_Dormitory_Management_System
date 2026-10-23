using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Utilities.Entities
{
    [Table("chiSoDienNuoc")]
    public class ChiSoDienNuoc
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maChiSo")]
        public int MaChiSo { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maPhong")]
        public string MaPhong { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        [Column("loai")]
        public string Loai { get; set; } = "dien";

        [Column("thang")]
        public int Thang { get; set; }

        [Column("nam")]
        public int Nam { get; set; }

        [Column("chiSoCu", TypeName = "decimal(10,2)")]
        public decimal ChiSoCu { get; set; }

        [Column("chiSoMoi", TypeName = "decimal(10,2)")]
        public decimal ChiSoMoi { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maGia")]
        public string MaGia { get; set; } = string.Empty;

        [Column("ngayGhi")]
        public DateTime NgayGhi { get; set; } = DateTime.Now;

        [MaxLength(20)]
        [Column("maNhanVienGhi")]
        public string? MaNhanVienGhi { get; set; }

        [ForeignKey(nameof(MaPhong))]
        public virtual Phong? Phong { get; set; }

        [ForeignKey(nameof(MaGia))]
        public virtual GiaDienNuoc? GiaDienNuoc { get; set; }

        [ForeignKey(nameof(MaNhanVienGhi))]
        public virtual NhanVien? NhanVienGhi { get; set; }
    }
}

