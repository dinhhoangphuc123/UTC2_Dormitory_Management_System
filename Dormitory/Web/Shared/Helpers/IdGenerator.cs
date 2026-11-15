using System.Security.Cryptography;

namespace Dormitory.Web.Shared.Helpers;

/// <summary>
/// Sinh mã nghiệp vụ khó trùng thay vì Guid rút gọn 8 ký tự (P2).
/// </summary>
public static class IdGenerator
{
    public static string Next(string prefix)
    {
        var random = Convert.ToHexString(RandomNumberGenerator.GetBytes(5)).ToLowerInvariant();
        return $"{prefix}-{random}";
    }

    public static string Next(string prefix, DateTime date)
    {
        var random = Convert.ToHexString(RandomNumberGenerator.GetBytes(4)).ToLowerInvariant();
        return $"{prefix}-{date:yyMMdd}-{random}";
    }
}
