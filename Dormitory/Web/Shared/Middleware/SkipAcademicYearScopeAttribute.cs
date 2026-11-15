namespace Dormitory.Web.Shared.Middleware;

/// <summary>
/// Đánh dấu controller/action không cần tham số academicYear
/// (ví dụ: đăng nhập, danh sách năm học, thông báo cá nhân).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class SkipAcademicYearScopeAttribute : Attribute
{
}
