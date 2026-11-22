using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dormitory.Web.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUniquePendingBedIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_donDangKy_maGiuong",
                table: "donDangKy");

            migrationBuilder.CreateIndex(
                name: "IX_donDangKy_maGiuong",
                table: "donDangKy",
                column: "maGiuong",
                unique: true,
                filter: "[maGiuong] IS NOT NULL AND [trangThai] = 'choDuyet'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_donDangKy_maGiuong",
                table: "donDangKy");

            migrationBuilder.CreateIndex(
                name: "IX_donDangKy_maGiuong",
                table: "donDangKy",
                column: "maGiuong");
        }
    }
}
