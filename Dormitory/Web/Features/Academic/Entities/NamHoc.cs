using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Academic.Entities
{
    [Table("namHoc")]
    public class NamHoc
    {
        [Key]
        [MaxLength(20)]
        [Column("maNamHoc")]
        public string MaNamHoc { get; set; } = string.Empty;

        [Required]
        [Column("ngayBatDau", TypeName = "date")]
        public DateTime NgayBatDau { get; set; }

        [Required]
        [Column("ngayKetThuc", TypeName = "date")]
        public DateTime NgayKetThuc { get; set; }

        [Column("laDangHoat")]
        public bool LaDangHoat { get; set; } = true;

        public virtual ICollection<KyHoc> DanhSachKyHoc { get; set; } = new List<KyHoc>();
    }
}

