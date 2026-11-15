using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dormitory.Web.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueIndexesP2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_nhanVien_email",
                table: "nhanVien");

            migrationBuilder.CreateIndex(
                name: "IX_taiKhoan_tenDangNhap",
                table: "taiKhoan",
                column: "tenDangNhap",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_nhanVien_email",
                table: "nhanVien",
                column: "email",
                unique: true,
                filter: "[email] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_taiKhoan_tenDangNhap",
                table: "taiKhoan");

            migrationBuilder.DropIndex(
                name: "IX_nhanVien_email",
                table: "nhanVien");

            migrationBuilder.CreateIndex(
                name: "IX_nhanVien_email",
                table: "nhanVien",
                column: "email");
        }
    }
}
