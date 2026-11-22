using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dormitory.Web.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBedSelectionToDonDangKy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "maGiuong",
                table: "donDangKy",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_donDangKy_maGiuong",
                table: "donDangKy",
                column: "maGiuong");

            migrationBuilder.AddForeignKey(
                name: "FK_donDangKy_giuong_maGiuong",
                table: "donDangKy",
                column: "maGiuong",
                principalTable: "giuong",
                principalColumn: "maGiuong");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_donDangKy_giuong_maGiuong",
                table: "donDangKy");

            migrationBuilder.DropIndex(
                name: "IX_donDangKy_maGiuong",
                table: "donDangKy");

            migrationBuilder.DropColumn(
                name: "maGiuong",
                table: "donDangKy");
        }
    }
}
