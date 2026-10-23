using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Utilities.Entities
{
    [Table("dichVu")]
    public class DichVu
    {
        [Key]
        [MaxLength(20)]
        [Column("maDichVu")]
        public string MaDichVu { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("tenDichVu")]
        public string TenDichVu { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("donViTinh")]
        public string DonViTinh { get; set; } = string.Empty;

        [Column("donGia", TypeName = "decimal(12,2)")]
        public decimal DonGia { get; set; }

        [Column("laDangHoat")]
        public bool LaDangHoat { get; set; } = true;

        public virtual ICollection<DangKyDichVu> DanhSachDangKyDichVu { get; set; } = new List<DangKyDichVu>();
        public virtual ICollection<ChiTietHoaDon> DanhSachChiTietHoaDon { get; set; } = new List<ChiTietHoaDon>();
    }
}

