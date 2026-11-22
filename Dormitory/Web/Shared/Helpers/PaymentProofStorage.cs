using Microsoft.AspNetCore.Http;

namespace Dormitory.Web.Shared.Helpers;

/// <summary>
/// Lưu và đọc tệp minh chứng thanh toán (ảnh biên lai, ảnh chuyển khoản)
/// trong App_Data/payment-proof, theo cùng cơ chế với ảnh sửa chữa.
/// </summary>
public static class PaymentProofStorage
{
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
    private const long MaxSizeBytes = 5 * 1024 * 1024;

    /// <returns>Tên tệp đã lưu, hoặc null kèm thông báo lỗi.</returns>
    public static async Task<(string? FileName, string? Error)> SaveAsync(IFormFile? file, string appDataPath)
    {
        if (file == null || file.Length == 0)
            return (null, "Vui lòng chọn tệp minh chứng.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return (null, "Chỉ chấp nhận ảnh minh chứng định dạng JPG, PNG hoặc WebP.");
        if (file.Length > MaxSizeBytes)
            return (null, "Tệp ảnh minh chứng phải nhỏ hơn 5 MB.");

        if (!await HasValidImageSignatureAsync(file))
            return (null, "Nội dung tệp không phải ảnh JPG, PNG hoặc WebP hợp lệ.");

        string dir = Path.GetFullPath(Path.Combine(appDataPath, "payment-proof"));
        Directory.CreateDirectory(dir);

        string fileName = $"{Guid.NewGuid():N}{ext}";
        string fullPath = Path.GetFullPath(Path.Combine(dir, fileName));
        if (!fullPath.StartsWith(dir + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            return (null, "Đường dẫn tệp không hợp lệ.");

        using var stream = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(stream);
        return (fileName, null);
    }

    private static async Task<bool> HasValidImageSignatureAsync(IFormFile file)
    {
        var header = new byte[12];
        using var s = file.OpenReadStream();
        int read = await s.ReadAsync(header.AsMemory(0, header.Length));
        if (read < 4) return false;

        // JPEG: FF D8 FF
        if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF) return true;
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (read >= 8 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47) return true;
        // WebP: RIFF....WEBP
        if (read >= 12 && header[0] == (byte)'R' && header[1] == (byte)'I' && header[2] == (byte)'F' && header[3] == (byte)'F'
            && header[8] == (byte)'W' && header[9] == (byte)'E' && header[10] == (byte)'B' && header[11] == (byte)'P') return true;

        return false;
    }

    public static async Task<(byte[]? FileBytes, string? ContentType)> ReadAsync(string? fileName, string appDataPath)
    {
        if (string.IsNullOrEmpty(fileName))
            return (null, null);

        string dir = Path.GetFullPath(Path.Combine(appDataPath, "payment-proof"));
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

    /// <summary>Xóa tệp minh chứng cũ khi sinh viên nộp lại tệp mới.</summary>
    public static void Delete(string? fileName, string appDataPath)
    {
        if (string.IsNullOrEmpty(fileName)) return;
        string dir = Path.GetFullPath(Path.Combine(appDataPath, "payment-proof"));
        string filePath = Path.GetFullPath(Path.Combine(dir, Path.GetFileName(fileName)));
        if (filePath.StartsWith(dir + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) &&
            File.Exists(filePath))
        {
            File.Delete(filePath);
        }
    }
}
