using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Rooms.Entities
{
    [Table("loaiPhong")]
    public class LoaiPhong
    {
        [Key]
        [MaxLength(20)]
        [Column("maLoaiPhong")]
        public string MaLoaiPhong { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("tenLoaiPhong")]
        public string TenLoaiPhong { get; set; } = string.Empty;

        [Column("soNguoiToiDa")]
        public int SoNguoiToiDa { get; set; } = 8;

        [Column("giaThueThang", TypeName = "decimal(12,2)")]
        public decimal GiaThueThang { get; set; }

        [Column("coDieuHoa")]
        public bool CoDieuHoa { get; set; } = false;

        [Column("coNhaVeSinhRieng")]
        public bool CoNhaVeSinhRieng { get; set; } = true;

        public virtual ICollection<Phong> DanhSachPhong { get; set; } = new List<Phong>();
        public virtual ICollection<DonDangKy> DanhSachDonDangKy { get; set; } = new List<DonDangKy>();
    }
}

