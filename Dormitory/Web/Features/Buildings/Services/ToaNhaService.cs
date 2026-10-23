using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Buildings.DTOs;

namespace Dormitory.Web.Features.Buildings.Services
{
    public class ToaNhaService : IToaNhaService
    {
        private readonly ApplicationDbContext _context;

        public ToaNhaService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<BuildingItemDto>> GetAllBuildingsAsync()
        {
            var buildings = await _context.ToaNhas
                .Include(b => b.DanhSachPhong)
                    .ThenInclude(p => p.DanhSachGiuong)
                .AsSplitQuery()
                .ToListAsync();

            return buildings.Select(b => new BuildingItemDto
            {
                Id = b.MaToaNha,
                Code = b.MaToaNha,
                Name = b.TenToaNha,
                Floors = b.SoTang,
                GenderAllowed = b.GioiTinhQuyDinh,
                Status = b.TrangThai,
                TotalRooms = b.DanhSachPhong.Count,
                TotalBeds = b.DanhSachPhong.Sum(p => p.DanhSachGiuong.Count)
            }).ToList();
        }

        public async Task<BuildingItemDto?> GetBuildingByIdAsync(string id)
        {
            var b = await _context.ToaNhas
                .Include(b => b.DanhSachPhong)
                    .ThenInclude(p => p.DanhSachGiuong)
                .AsSplitQuery()
                .FirstOrDefaultAsync(b => b.MaToaNha == id);

            if (b == null) return null;

            return new BuildingItemDto
            {
                Id = b.MaToaNha,
                Code = b.MaToaNha,
                Name = b.TenToaNha,
                Floors = b.SoTang,
                GenderAllowed = b.GioiTinhQuyDinh,
                Status = b.TrangThai,
                TotalRooms = b.DanhSachPhong.Count,
                TotalBeds = b.DanhSachPhong.Sum(p => p.DanhSachGiuong.Count)
            };
        }
    }
}
