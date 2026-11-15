using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Accounts.Entities
{
    /// <summary>
    /// Mã OTP đặt lại mật khẩu được lưu trong CSDL (không lưu in-memory)
    /// để không mất khi khởi động lại và dùng được khi chạy nhiều instance.
    /// </summary>
    [Table("maDatLaiMatKhau")]
    public class MaDatLaiMatKhau
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maDatLai")]
        public int MaDatLai { get; set; }

        [Required]
        [MaxLength(150)]
        [Column("dinhDanh")]
        public string DinhDanh { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("maHash")]
        public string MaHash { get; set; } = string.Empty;

        [Column("hetHan")]
        public DateTime HetHan { get; set; }

        [Column("soLanSai")]
        public int SoLanSai { get; set; }

        [Column("daXacMinh")]
        public bool DaXacMinh { get; set; }

        [Column("ngayTao")]
        public DateTime NgayTao { get; set; } = DateTime.UtcNow;
    }
}
