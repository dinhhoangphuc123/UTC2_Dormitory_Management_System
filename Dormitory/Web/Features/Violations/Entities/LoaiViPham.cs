using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Violations.Entities
{
    [Table("loaiViPham")]
    public class LoaiViPham
    {
        [Key]
        [MaxLength(20)]
        [Column("maLoaiViPham")]
        public string MaLoaiViPham { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("tenLoaiViPham")]
        public string TenLoaiViPham { get; set; } = string.Empty;

        [Column("diemTru")]
        public int DiemTru { get; set; } = 0;

        [Column("mucPhatTien", TypeName = "decimal(12,2)")]
        public decimal MucPhatTien { get; set; } = 0;

        public virtual ICollection<ViPham> DanhSachViPham { get; set; } = new List<ViPham>();
    }
}

