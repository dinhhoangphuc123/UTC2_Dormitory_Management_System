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

        [Column("mucDo")]
        public string? MucDo { get; set; }

        [Column("tienPhat", TypeName = "decimal(12,2)")]
        public decimal? TienPhat { get; set; }

        [NotMapped]
        public int DiemTru { get; set; } = 0;

        [NotMapped]
        public decimal MucPhatTien
        {
            get => TienPhat ?? 0;
            set => TienPhat = value;
        }

        public virtual ICollection<ViPham> DanhSachViPham { get; set; } = new List<ViPham>();
    }
}

