using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Accounts.Entities
{
    [Table("vaiTro")]
    public class VaiTro
    {
        [Key]
        [MaxLength(20)]
        [Column("maVaiTro")]
        public string MaVaiTro { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("tenVaiTro")]
        public string TenVaiTro { get; set; } = string.Empty;

        public virtual ICollection<TaiKhoan> DanhSachTaiKhoan { get; set; } = new List<TaiKhoan>();
    }
}

