using Dormitory.Web.Data;
using Dormitory.Web.Features.Students.Entities;

namespace Dormitory.IntegrationTests.Support
{
    public static class TestDataBuilder
    {
        public static async Task<SinhVien> CreateTestStudentAsync(ApplicationDbContext context, string mssv = "TEST001")
        {
            var sv = new SinhVien
            {
                MaSinhVien = mssv,
                HoTen = "Sinh Viên Test",
                NgaySinh = new DateTime(2004, 1, 1),
                GioiTinh = "nam",
                Cccd = "079203" + Random.Shared.Next(100000, 999999),
                DienThoai = "0987654321",
                Email = $"{mssv.ToLower()}@sinhvien.utc2.edu.vn",
                MaLop = "CNTT01_K64",
                NamNhapHoc = 2024,
                TrangThai = "dangHoc"
            };

            await context.SinhViens.AddAsync(sv);
            await context.SaveChangesAsync();
            return sv;
        }
    }
}

