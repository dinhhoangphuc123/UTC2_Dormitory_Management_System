using Microsoft.AspNetCore.Http;

namespace Dormitory.Web.Shared.Helpers;

/// <summary>
/// Lưu và đọc ảnh minh họa sự cố của phiếu sửa chữa trong App_Data/maintenance.
/// </summary>
public static class MaintenanceImageStorage
{
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
    private const long MaxSizeBytes = 5 * 1024 * 1024;

    public static async Task<(string? FileName, string? Error)> SaveAsync(IFormFile? file, string appDataPath)
    {
        if (file == null || file.Length == 0)
            return (null, "Vui lòng chọn ảnh minh họa sự cố.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return (null, "Chỉ chấp nhận ảnh minh họa định dạng JPG, PNG hoặc WebP.");
        if (file.Length > MaxSizeBytes)
            return (null, "Ảnh minh họa phải nhỏ hơn 5 MB.");

        string dir = Path.GetFullPath(Path.Combine(appDataPath, "maintenance"));
        Directory.CreateDirectory(dir);

        string fileName = $"{Guid.NewGuid():N}{ext}";
        string fullPath = Path.GetFullPath(Path.Combine(dir, fileName));
        if (!fullPath.StartsWith(dir + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            return (null, "Đường dẫn tệp không hợp lệ.");

        using var stream = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(stream);
        return (fileName, null);
    }

    public static async Task<(byte[]? FileBytes, string? ContentType)> ReadAsync(string? fileName, string appDataPath)
    {
        if (string.IsNullOrEmpty(fileName))
            return (null, null);

        string dir = Path.GetFullPath(Path.Combine(appDataPath, "maintenance"));
        string filePath = Path.GetFullPath(Path.Combine(dir, Path.GetFileName(fileName)));
        if (!filePath.StartsWith(dir + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) ||
            !File.Exists(filePath))
            return (null, null);

        byte[] bytes = await File.ReadAllBytesAsync(filePath);
        string ext = Path.GetExtension(fileName).ToLowerInvariant();
        string contentType = ext switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };
        return (bytes, contentType);
    }

    public static void Delete(string? fileName, string appDataPath)
    {
        if (string.IsNullOrEmpty(fileName)) return;
        string dir = Path.GetFullPath(Path.Combine(appDataPath, "maintenance"));
        string filePath = Path.GetFullPath(Path.Combine(dir, Path.GetFileName(fileName)));
        if (filePath.StartsWith(dir + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) &&
            File.Exists(filePath))
        {
            File.Delete(filePath);
        }
    }
}
