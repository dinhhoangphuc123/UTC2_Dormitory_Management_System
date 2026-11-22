using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Accounts.Entities;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Helpers;

namespace Dormitory.Web.Features.Students.Services;

public sealed class StudentExcelRowInput
{
    public string Mssv { get; init; } = string.Empty;
    public string HoTen { get; init; } = string.Empty;
    public DateTime NgaySinh { get; init; }
    public string GioiTinh { get; init; } = string.Empty;
    public string Cccd { get; init; } = string.Empty;
    public string DienThoai { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string DiaChiThuongTru { get; init; } = string.Empty;
    public string MaLop { get; init; } = string.Empty;
    public int NamNhapHoc { get; init; }
    public string DoiTuongUuTien { get; init; } = string.Empty;
}

public sealed class StudentUpsertResult
{
    public bool Success { get; init; }
    public bool IsCreated { get; init; }
    public string? ErrorMessage { get; init; }
    public string? TemporaryPassword { get; init; }
    public SinhVien? Student { get; init; }

    public static StudentUpsertResult Fail(string message) => new() { Success = false, ErrorMessage = message };
}

public static class StudentExcelHelper
{
    private static readonly Regex EmailRegex = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);
    private static readonly Regex PhoneRegex = new(@"^0\d{9,10}$", RegexOptions.Compiled);

    public static string? NormalizeGender(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "nam";
        string norm = ExcelImportHelper.NormalizeHeaderKey(raw);
        return norm switch
        {
            "nam" => "nam",
            "nu" => "nu",
            "khac" => "khac",
            _ => null
        };
    }

    public static string? NormalizePhone(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return Regex.Replace(raw.Trim(), @"[\s\-]+", string.Empty);
    }

    public static async Task<StudentUpsertResult> UpsertStudentAsync(
        ApplicationDbContext context,
        IPasswordHasher passwordHasher,
        StudentExcelRowInput input,
        int minAdmissionYear,
        int maxAdmissionYear)
    {
        string mssv = input.Mssv.Trim();
        if (string.IsNullOrWhiteSpace(mssv))
            return StudentUpsertResult.Fail("MSSV không được để trống.");
        if (mssv.Length > 20)
            return StudentUpsertResult.Fail("MSSV không được vượt quá 20 ký tự.");

        string hoTen = input.HoTen.Trim();
        if (string.IsNullOrWhiteSpace(hoTen))
            return StudentUpsertResult.Fail("Họ tên không được để trống.");
        if (hoTen.Length > 100)
            return StudentUpsertResult.Fail("Họ tên không được vượt quá 100 ký tự.");

        if (input.NgaySinh == default || input.NgaySinh.Date > DateTime.Today)
            return StudentUpsertResult.Fail("Ngày sinh không hợp lệ.");

        string? normalizedGender = NormalizeGender(input.GioiTinh);
        if (normalizedGender == null)
            return StudentUpsertResult.Fail("Giới tính chỉ nhận Nam, Nữ hoặc Khác.");

        string maLop = input.MaLop.Trim();
        if (string.IsNullOrWhiteSpace(maLop))
            return StudentUpsertResult.Fail("Vui lòng chọn lớp.");
        if (!await context.LopHocs.AnyAsync(l => l.MaLop == maLop))
            return StudentUpsertResult.Fail($"Lớp {maLop} không tồn tại.");

        if (input.NamNhapHoc < minAdmissionYear || input.NamNhapHoc > maxAdmissionYear)
            return StudentUpsertResult.Fail("Năm nhập học không hợp lệ.");

        string normalizedCccd = input.Cccd.Trim();
        if (normalizedCccd.Length is not (9 or 12) || !normalizedCccd.All(char.IsDigit))
            return StudentUpsertResult.Fail("CCCD/CMND phải gồm 9 hoặc 12 chữ số.");
        if (await context.SinhViens.AnyAsync(s => s.Cccd == normalizedCccd && s.MaSinhVien != mssv))
            return StudentUpsertResult.Fail($"CCCD {normalizedCccd} đã được dùng cho sinh viên khác.");

        string? normalizedPhone = NormalizePhone(input.DienThoai);
        if (!string.IsNullOrWhiteSpace(normalizedPhone) && !PhoneRegex.IsMatch(normalizedPhone))
            return StudentUpsertResult.Fail("Số điện thoại không đúng định dạng Việt Nam.");

        string? normalizedEmail = string.IsNullOrWhiteSpace(input.Email)
            ? null
            : input.Email.Trim().ToLowerInvariant();
        if (normalizedEmail != null)
        {
            if (!EmailRegex.IsMatch(normalizedEmail))
                return StudentUpsertResult.Fail("Email không đúng định dạng.");
            if (await context.SinhViens.AnyAsync(s =>
                s.Email != null && s.Email.ToLower() == normalizedEmail && s.MaSinhVien != mssv))
                return StudentUpsertResult.Fail($"Email {normalizedEmail} đã được dùng cho sinh viên khác.");
        }

        string? diaChi = string.IsNullOrWhiteSpace(input.DiaChiThuongTru) ? null : input.DiaChiThuongTru.Trim();
        string? uuTien = string.IsNullOrWhiteSpace(input.DoiTuongUuTien) ? null : input.DoiTuongUuTien.Trim();
        if (uuTien is { Length: > 50 })
        {
            uuTien = uuTien[..50];
        }

        var existing = await context.SinhViens.FirstOrDefaultAsync(s => s.MaSinhVien == mssv);
        bool isCreated = existing == null;
        string? initialPassword = null;

        if (existing == null)
        {
            initialPassword = PasswordPolicy.GenerateTemporaryPassword();
            existing = new SinhVien
            {
                MaSinhVien = mssv,
                HoTen = hoTen,
                NgaySinh = input.NgaySinh.Date,
                GioiTinh = normalizedGender,
                Cccd = normalizedCccd,
                DienThoai = normalizedPhone,
                Email = normalizedEmail,
                DiaChiThuongTru = diaChi,
                MaLop = maLop,
                NamNhapHoc = input.NamNhapHoc,
                DoiTuongUuTien = uuTien,
                TrangThai = "dangHoc"
            };
            context.SinhViens.Add(existing);
        }
        else
        {
            existing.HoTen = hoTen;
            existing.NgaySinh = input.NgaySinh.Date;
            existing.GioiTinh = normalizedGender;
            existing.Cccd = normalizedCccd;
            existing.DienThoai = normalizedPhone;
            existing.Email = normalizedEmail;
            existing.DiaChiThuongTru = diaChi;
            existing.MaLop = maLop;
            existing.NamNhapHoc = input.NamNhapHoc;
            existing.DoiTuongUuTien = uuTien;
            existing.TrangThai = "dangHoc";
        }

        if (!await context.TaiKhoans.AnyAsync(t => t.MaSinhVien == mssv || t.TenDangNhap == mssv))
        {
            initialPassword ??= PasswordPolicy.GenerateTemporaryPassword();
            context.TaiKhoans.Add(new TaiKhoan
            {
                TenDangNhap = mssv,
                MatKhauHash = passwordHasher.HashPassword(initialPassword),
                MaVaiTro = RoleNames.SinhVien,
                MaSinhVien = mssv,
                LaDangHoat = true
            });
        }

        try
        {
            await context.SaveChangesAsync();
            return new StudentUpsertResult
            {
                Success = true,
                IsCreated = isCreated,
                TemporaryPassword = initialPassword,
                Student = existing
            };
        }
        catch (DbUpdateException ex)
        {
            context.ChangeTracker.Clear();
            return StudentUpsertResult.Fail("Không thể lưu dòng này: " + (ex.InnerException?.Message ?? ex.Message));
        }
    }
}
