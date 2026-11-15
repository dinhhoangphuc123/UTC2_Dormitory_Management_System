using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dormitory.Web.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTienHoanCoc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "tienHoanCoc",
                table: "hopDong",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "tienHoanCoc",
                table: "hopDong");
        }
    }
}
