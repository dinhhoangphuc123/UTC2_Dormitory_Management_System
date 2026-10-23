using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Utilities.Entities
{
    [Table("giaDienNuoc")]
    public class GiaDienNuoc
    {
        [Key]
        [MaxLength(20)]
        [Column("maGia")]
        public string MaGia { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        [Column("loai")]
        public string Loai { get; set; } = "dien";

        [Column("gia", TypeName = "decimal(10,2)")]
        public decimal Gia { get; set; }

        [Required]
        [Column("ngayApDung", TypeName = "date")]
        public DateTime NgayApDung { get; set; }

        [Column("ngayHetHieuLuc", TypeName = "date")]
        public DateTime? NgayHetHieuLuc { get; set; }

        public virtual ICollection<ChiSoDienNuoc> DanhSachChiSo { get; set; } = new List<ChiSoDienNuoc>();
    }
}

