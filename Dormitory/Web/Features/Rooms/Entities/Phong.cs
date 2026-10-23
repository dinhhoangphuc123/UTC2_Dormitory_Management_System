using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Rooms.Entities
{
    [Table("phong")]
    public class Phong
    {
        [Key]
        [MaxLength(20)]
        [Column("maPhong")]
        public string MaPhong { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        [Column("maToaNha")]
        public string MaToaNha { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maLoaiPhong")]
        public string MaLoaiPhong { get; set; } = string.Empty;

        [Column("soTang")]
        public int SoTang { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "hoatDong";

        [ForeignKey(nameof(MaToaNha))]
        public virtual ToaNha? ToaNha { get; set; }

        [ForeignKey(nameof(MaLoaiPhong))]
        public virtual LoaiPhong? LoaiPhong { get; set; }

        public virtual ICollection<Giuong> DanhSachGiuong { get; set; } = new List<Giuong>();
        public virtual ICollection<TaiSanPhong> DanhSachTaiSan { get; set; } = new List<TaiSanPhong>();
        public virtual ICollection<YeuCauSuaChua> DanhSachYeuCauSuaChua { get; set; } = new List<YeuCauSuaChua>();
        public virtual ICollection<ChiSoDienNuoc> DanhSachChiSoDienNuoc { get; set; } = new List<ChiSoDienNuoc>();
        public virtual ICollection<HoaDonPhong> DanhSachHoaDonPhong { get; set; } = new List<HoaDonPhong>();
    }
}

