# Quản lý Ký túc xá UTC2

## Chạy ứng dụng

```bash
dotnet run --project Dormitory/Web/Web.csproj
```

Cấu hình kết nối SQL Server trong `appsettings.json` (mục `ConnectionStrings:DefaultConnection`).
Ứng dụng tự áp migration và seed dữ liệu demo ở môi trường Development/Testing.

## API

- Swagger chỉ bật ở Development: `/swagger` (xem `Dormitory/Web/Shared/Extensions/SwaggerExtensions.cs`).
- Quá trình đăng nhập API bị giới hạn 10 lần / 5 phút / IP (xem `LoginRateLimitMiddleware`).
- Các endpoint nghiệp vụ yêu cầu tham số `academicYear`; controller không cần năm học được
  đánh dấu `[SkipAcademicYearScope]`.

## Kiểm thử

```bash
dotnet test Dormitory/Dormitory.UnitTests/Dormitory.UnitTests.csproj
dotnet test Dormitory/Dormitory.IntegrationTests/Dormitory.IntegrationTests.csproj
dotnet test Dormitory/Dormitory.E2ETests/Dormitory.E2ETests.csproj
```

E2E dùng Playwright, chỉ chạy khi đặt `E2E_BASE_URL`. CI (`.github/workflows/ci.yml`)
chạy đủ unit + integration + E2E và cài sẵn Chromium.

## Quy ước đổi mã nghiệp vụ

Dùng `Dormitory/Web/Shared/Helpers/IdGenerator.cs` thay vì cắt `Guid` 8 ký tự.
