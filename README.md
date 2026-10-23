"# UTC2_Dormitory_Management_System" 
UTC2_Dormitory_Management_System/                Thư mục gốc repository
├── .github/
│   ├── workflows/
│   │   └── ci.yml                                 Restore, build, test (kèm SQL Server cho integration test)
│   └── pull_request_template.md                   Mẫu mô tả Pull Request
├── .config/
│   └── dotnet-tools.json                          Ghim dotnet-ef
├── docs/
│   ├── architecture/                              Kiến trúc, quy tắc phân tầng, luồng nghiệp vụ
│   ├── api/                                       Tài liệu API, Postman/Bruno collection
│   ├── database/
│   │   ├── erd/                                   Sơ đồ ERD
│   │   └── QUANLYKTX.sql                          ← Database/QUANLYKTX.sql (chỉ để tham chiếu)
│   ├── design/
│   │   ├── ui-prototype-main/                     ← "Design UI/hệ-thống-quản-lý-ký-túc-xá-utc2"
│   │   └── ui-prototype-screens/                  ← "Design UI/untitled"
│   ├── image/
│   ├── report/                                    Báo cáo đồ án
│   ├── task/                                      Phân công, tiến độ
│   └── tech-stack/
├── scripts/                                       (tạo khi cần)
│   └── db/                                        Script reset/seed DB cho máy dev
├── docker-compose.yml                             SQL Server chạy local cho môi trường dev
├── .editorconfig                                  Quy ước định dạng C#, Razor, JS
├── .gitattributes                                 Chuẩn hóa xuống dòng
├── .gitignore
├── global.json                                    Ghim phiên bản .NET SDK (10.x)
├── README.md                                      Giới thiệu, cách chạy, tài khoản demo, cách chạy test
│
└── Dormitory/
    ├── Dormitory.slnx                             ← Quan_ly_Ky_tuc_xa.slnx
    ├── Directory.Build.props                      Cấu hình chung: net10.0, Nullable, ImplicitUsings
    ├── Directory.Packages.props                   Quản lý phiên bản NuGet tập trung
    │
    ├── Web/                                       Project ASP.NET Core (MVC + REST API)
    │   ├── Web.csproj                             ← Quan_ly_Ky_tuc_xa.csproj (bỏ EF InMemory)
    │   ├── Program.cs                             Rút gọn, gọi AddDormitoryFeatures()
    │   ├── appsettings.json                       Không chứa chuỗi kết nối thật
    │   ├── appsettings.Development.json
    │   ├── Properties/
    │   │   └── launchSettings.json
    │   │
    │   ├── Controllers/                           Chỉ controller trả View
    │   │   ├── HomeController.cs
    │   │   └── AccountController.cs               Trang đăng nhập
    │   │
    │   ├── Views/
    │   │   ├── _ViewImports.cshtml
    │   │   ├── _ViewStart.cshtml
    │   │   ├── Home/                              Index.cshtml, Privacy.cshtml
    │   │   ├── Account/                           Login.cshtml
    │   │   └── Shared/                            _Layout.cshtml, Error.cshtml,
    │   │                                          _ValidationScriptsPartial.cshtml
    │   │
    │   ├── Shared/                                Dùng chung mọi feature
    │   │   ├── Models/                            ApiResponse.cs, PagedResult.cs (mới),
    │   │   │                                      ErrorViewModel.cs
    │   │   ├── Middleware/                        ExceptionHandlingMiddleware.cs (mới, ProblemDetails)
    │   │   ├── Security/                          (mới) Cấu hình JWT/cookie, policy theo vai trò,
    │   │   │                                      CurrentUser.cs (đọc claim: mã NV/SV, vai trò)
    │   │   ├── Extensions/                        ServiceCollectionExtensions.cs (AddDormitoryFeatures),
    │   │   │                                      SwaggerExtensions.cs, DatabaseExtensions.cs
    │   │   ├── Helpers/                           RoomCodeHelper.cs, NameHelper.cs, DateFormats.cs
    │   │   │                                      (thay Helpers/Ultis.cs rỗng)
    │   │   └── Constants/                         Tên vai trò, giá trị mặc định
    │   │
    │   ├── Features/                              Chia theo chức năng nghiệp vụ
    │   │   │   Mỗi feature gồm: Api/, Entities/, DTOs/, Enums/, Services/, Validators/,
    │   │   │   Mappings/ và DependencyInjection.cs (chỉ tạo thư mục con khi có file)
    │   │   │
    │   │   ├── Accounts/                          Tài khoản, vai trò, đăng nhập
    │   │   │   ├── Api/          AuthApiController.cs
    │   │   │   ├── Entities/     TaiKhoan.cs, VaiTro.cs
    │   │   │   ├── DTOs/         LoginRequestDto.cs, UserProfileDto.cs
    │   │   │   ├── Enums/        RoleCodes.cs
    │   │   │   ├── Services/     IAuthService.cs, AuthService.cs, IPasswordHasher.cs,
    │   │   │   │                 PasswordHasher.cs (mới)
    │   │   │   ├── Validators/   LoginRequestValidator.cs
    │   │   │   ├── Mappings/     AccountMappings.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   ├── Staff/                             Nhân viên
    │   │   │   ├── Api/          NhanVienApiController.cs
    │   │   │   ├── Entities/     NhanVien.cs
    │   │   │   ├── DTOs/         StaffItemDto.cs, CreateStaffDto.cs
    │   │   │   ├── Enums/        StaffStatus.cs
    │   │   │   ├── Services/     INhanVienService.cs, NhanVienService.cs
    │   │   │   ├── Validators/   CreateStaffValidator.cs
    │   │   │   ├── Mappings/     StaffMappings.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   ├── Academic/                          Năm học, kỳ học, lớp
    │   │   │   ├── Api/          LopHocApiController.cs
    │   │   │   ├── Entities/     NamHoc.cs, KyHoc.cs, LopHoc.cs
    │   │   │   ├── DTOs/         ClassItemDto.cs, CreateClassDto.cs
    │   │   │   ├── Services/     ILopHocService.cs, LopHocService.cs
    │   │   │   ├── Validators/   CreateClassValidator.cs
    │   │   │   ├── Mappings/     AcademicMappings.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   ├── Students/                          Sinh viên, phụ huynh
    │   │   │   ├── Api/          SinhVienApiController.cs
    │   │   │   ├── Entities/     SinhVien.cs, PhuHuynhLienHe.cs
    │   │   │   ├── DTOs/         SinhVienListItemDto.cs
    │   │   │   ├── Enums/        Gender.cs, StudentStatus.cs
    │   │   │   ├── Services/     ISinhVienService.cs, SinhVienService.cs
    │   │   │   ├── Validators/   TransferRoomValidator.cs
    │   │   │   ├── Mappings/     StudentMappings.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   ├── Buildings/                         Tòa nhà (tạo khi cần API riêng)
    │   │   │   ├── Api/          ToaNhaApiController.cs
    │   │   │   ├── Entities/     ToaNha.cs
    │   │   │   ├── DTOs/         BuildingItemDto.cs
    │   │   │   ├── Enums/        BuildingGender.cs, BuildingStatus.cs
    │   │   │   ├── Services/     IToaNhaService.cs, ToaNhaService.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   ├── Rooms/                             Loại phòng, phòng, giường
    │   │   │   ├── Api/          PhongApiController.cs
    │   │   │   ├── Entities/     LoaiPhong.cs, Phong.cs, Giuong.cs
    │   │   │   ├── DTOs/         RoomListItemDto.cs, BedItemDto.cs
    │   │   │   ├── Enums/        RoomStatus.cs, BedStatus.cs
    │   │   │   ├── Services/     IPhongService.cs, PhongService.cs
    │   │   │   ├── Mappings/     RoomMappings.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   ├── Registrations/                     Đợt đăng ký, đơn đăng ký
    │   │   │   ├── Api/          DonDangKyApiController.cs
    │   │   │   ├── Entities/     DotDangKy.cs, DonDangKy.cs
    │   │   │   ├── DTOs/         ApplicationListItemDto.cs
    │   │   │   ├── Enums/        ApplicationStatus.cs
    │   │   │   ├── Services/     IDonDangKyService.cs, DonDangKyService.cs
    │   │   │   ├── Validators/   RejectApplicationValidator.cs
    │   │   │   ├── Mappings/     RegistrationMappings.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   ├── Contracts/                         Hợp đồng, tiền cọc, gia hạn, thanh lý
    │   │   │   ├── Api/          HopDongApiController.cs
    │   │   │   ├── Entities/     HopDong.cs
    │   │   │   ├── DTOs/         ContractListItemDto.cs, CreateContractRequestDto.cs
    │   │   │   ├── Enums/        ContractStatus.cs
    │   │   │   ├── Services/     IHopDongService.cs, HopDongService.cs,
    │   │   │   │                 ContractRules.cs (mới, logic thuần: giường trống, giới tính tòa,
    │   │   │   │                 chồng lấn thời gian, hoàn cọc)
    │   │   │   ├── Validators/   CreateContractValidator.cs
    │   │   │   ├── Mappings/     ContractMappings.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   ├── Utilities/                         Dịch vụ, điện nước, chốt tiền phòng
    │   │   │   ├── Api/          DienNuocApiController.cs
    │   │   │   ├── Entities/     DichVu.cs, DangKyDichVu.cs, GiaDienNuoc.cs,
    │   │   │   │                 ChiSoDienNuoc.cs, HoaDonPhong.cs
    │   │   │   ├── DTOs/         UtilityItemDto.cs, RecordUtilityDto.cs
    │   │   │   ├── Enums/        UtilityType.cs
    │   │   │   ├── Services/     IDienNuocDichVuService.cs, DienNuocDichVuService.cs,
    │   │   │   │                 UtilityBillCalculator.cs (mới, logic thuần: chia tiền điện nước
    │   │   │   │                 theo đầu người/số ngày ở)
    │   │   │   ├── Validators/   RecordUtilityValidator.cs
    │   │   │   ├── Mappings/     UtilityMappings.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   ├── Invoices/                          Hóa đơn, chi tiết hóa đơn
    │   │   │   ├── Api/          HoaDonApiController.cs
    │   │   │   ├── Entities/     HoaDon.cs, ChiTietHoaDon.cs
    │   │   │   ├── DTOs/         InvoiceItemDto.cs, CreateInvoiceDto.cs
    │   │   │   ├── Enums/        InvoiceStatus.cs, InvoiceLineType.cs
    │   │   │   ├── Services/     IHoaDonService.cs, HoaDonService.cs,
    │   │   │   │                 InvoiceCalculator.cs (mới, logic thuần: tổng tiền, miễn giảm,
    │   │   │   │                 phạt, quá hạn)
    │   │   │   ├── Validators/   CreateInvoiceValidator.cs
    │   │   │   ├── Mappings/     InvoiceMappings.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   ├── Payments/                          Thanh toán, nhắc nợ
    │   │   │   ├── Api/          ThanhToanApiController.cs
    │   │   │   ├── Entities/     ThanhToan.cs
    │   │   │   ├── DTOs/         ConfirmPaymentDto.cs
    │   │   │   ├── Enums/        PaymentMethod.cs
    │   │   │   ├── Services/     IThanhToanService.cs, ThanhToanService.cs
    │   │   │   ├── Validators/   ConfirmPaymentValidator.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   ├── Maintenance/                       Tài sản phòng, yêu cầu sửa chữa
    │   │   │   ├── Api/          SuaChuaApiController.cs
    │   │   │   ├── Entities/     TaiSanPhong.cs, YeuCauSuaChua.cs
    │   │   │   ├── DTOs/         MaintenanceTicketDto.cs, CreateTicketDto.cs,
    │   │   │   │                 AssignTicketDto.cs
    │   │   │   ├── Enums/        TicketStatus.cs, AssetCondition.cs
    │   │   │   ├── Services/     IYeuCauSuaChuaService.cs, YeuCauSuaChuaService.cs
    │   │   │   ├── Validators/   CreateTicketValidator.cs
    │   │   │   ├── Mappings/     MaintenanceMappings.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   ├── Violations/                        Loại vi phạm, biên bản kỷ luật
    │   │   │   ├── Api/          ViPhamApiController.cs
    │   │   │   ├── Entities/     LoaiViPham.cs, ViPham.cs
    │   │   │   ├── DTOs/         ViolationRecordDto.cs, CreateViolationDto.cs
    │   │   │   ├── Enums/        PenaltyType.cs, ViolationSeverity.cs
    │   │   │   ├── Services/     IViPhamService.cs, ViPhamService.cs
    │   │   │   ├── Validators/   CreateViolationValidator.cs
    │   │   │   ├── Mappings/     ViolationMappings.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   ├── Reports/                           Báo cáo, thống kê (chỉ đọc)
    │   │   │   ├── Api/          BaoCaoApiController.cs
    │   │   │   ├── DTOs/         ReportSummaryDto.cs, BuildingOperationDto.cs
    │   │   │   ├── Services/     IBaoCaoService.cs, BaoCaoService.cs
    │   │   │   └── DependencyInjection.cs
    │   │   │
    │   │   └── Dashboard/                         Tổng quan theo vai trò (chỉ đọc)
    │   │       ├── Api/          DashboardApiController.cs
    │   │       ├── DTOs/         DashboardSummaryDto.cs, ZoneOccupancyDto.cs,
    │   │       │                 UrgentTaskDto.cs
    │   │       ├── Services/     IDashboardService.cs, DashboardService.cs
    │   │       └── DependencyInjection.cs
    │   │
    │   ├── Data/
    │   │   ├── ApplicationDbContext.cs            Chỉ khai báo DbSet + ApplyConfigurationsFromAssembly
    │   │   ├── Configurations/                    Fluent API, chia theo feature
    │   │   │   ├── AccountConfiguration.cs            Quan hệ 1-1 TaiKhoan, CHECK (NV hoặc SV)
    │   │   │   ├── AcademicConfiguration.cs           Unique (năm học, tên kỳ), CHECK ngày
    │   │   │   ├── StudentConfiguration.cs            Unique CCCD, CHECK giới tính/trạng thái
    │   │   │   ├── BuildingConfiguration.cs
    │   │   │   ├── RoomConfiguration.cs               Unique (phòng, số thứ tự giường)
    │   │   │   ├── RegistrationConfiguration.cs       Unique (SV, đợt đăng ký)
    │   │   │   ├── ContractConfiguration.cs           Filtered unique index (thêm .IsUnique())
    │   │   │   ├── UtilityConfiguration.cs
    │   │   │   ├── InvoiceConfiguration.cs            Cột thanhTien tính tự động
    │   │   │   ├── PaymentConfiguration.cs
    │   │   │   ├── MaintenanceConfiguration.cs
    │   │   │   ├── ViolationConfiguration.cs
    │   │   │   └── StaffConfiguration.cs
    │   │   ├── Migrations/                        Thay EnsureCreated, dùng MigrateAsync()
    │   │   └── Seeding/
    │   │       ├── DbSeeder.cs                        Điểm vào, gọi các seeder bên dưới
    │   │       ├── RoleSeeder.cs                      Vai trò
    │   │       ├── ReferenceDataSeeder.cs             Năm học, kỳ, tòa, loại phòng, phòng/giường,
    │   │       │                                      giá điện nước, dịch vụ, loại vi phạm
    │   │       └── DemoDataSeeder.cs                  Nhân viên, SV, hợp đồng, hóa đơn mẫu
    │   │                                              (chỉ chạy ở Development, thay các hàm mock)
    │   │
    │   └── wwwroot/
    │       ├── css/
    │       │   ├── app.css                        ← site.css
    │       │   └── ktx-theme.css
    │       ├── js/
    │       │   ├── core/                          Dùng chung toàn app
    │       │   │   ├── main.js                        Khởi tạo
    │       │   │   ├── api.js                         Bọc fetch + xử lý ApiResponse + token
    │       │   │   ├── auth.js                        Đăng nhập, đăng xuất, phiên
    │       │   │   ├── state.js
    │       │   │   ├── router.js                      navigate, renderApp
    │       │   │   └── ui.js                          Toast, modal, dark mode
    │       │   └── features/                      Mỗi màn hình một file
    │       │       ├── accounts.js   dashboard.js   students.js    rooms.js
    │       │       ├── registrations.js   contracts.js   academic.js   utilities.js
    │       │       ├── invoices.js   maintenance.js   violations.js   staff.js
    │       │       └── reports.js
    │       ├── images/                            login-campus.png, utc2-logo.png, ...
    │       ├── lib/                               (xóa nếu không dùng bootstrap)
    │       └── favicon.ico
    │
    ├── Dormitory.UnitTests/                       Chỉ logic thuần, KHÔNG dùng DB
    │   ├── Dormitory.UnitTests.csproj
    │   └── Features/
    │       ├── Accounts/       PasswordHasherTests.cs, LoginRequestValidatorTests.cs
    │       ├── Staff/          CreateStaffValidatorTests.cs, StaffMappingsTests.cs
    │       ├── Academic/       CreateClassValidatorTests.cs
    │       ├── Students/       StudentMappingsTests.cs
    │       ├── Rooms/          RoomMappingsTests.cs
    │       ├── Registrations/  RegistrationMappingsTests.cs
    │       ├── Contracts/      ContractRulesTests.cs, CreateContractValidatorTests.cs
    │       ├── Utilities/      UtilityBillCalculatorTests.cs
    │       ├── Invoices/       InvoiceCalculatorTests.cs
    │       ├── Payments/       ConfirmPaymentValidatorTests.cs
    │       ├── Maintenance/    CreateTicketValidatorTests.cs
    │       └── Violations/     CreateViolationValidatorTests.cs
    │
    ├── Dormitory.IntegrationTests/                SQL Server thật (Testcontainers hoặc LocalDB)
    │   ├── Dormitory.IntegrationTests.csproj
    │   ├── Support/
    │   │   ├── SqlServerFixture.cs                Khởi tạo DB test, chạy Migrations
    │   │   ├── DbResetter.cs                      Dọn dữ liệu giữa các test
    │   │   ├── CustomWebApplicationFactory.cs     WebApplicationFactory<Program>
    │   │   ├── AuthHelper.cs                      Đăng nhập theo vai trò để gọi API
    │   │   └── TestDataBuilder.cs                 Dựng dữ liệu mẫu cho từng test
    │   ├── Data/
    │   │   └── MigrationTests.cs                  Kiểm tra schema, CHECK, unique, filtered index
    │   └── Features/
    │       ├── Accounts/       AuthApiTests.cs
    │       ├── Staff/          NhanVienApiTests.cs
    │       ├── Academic/       LopHocApiTests.cs
    │       ├── Students/       SinhVienApiTests.cs
    │       ├── Rooms/          PhongApiTests.cs
    │       ├── Registrations/  DonDangKyApiTests.cs
    │       ├── Contracts/      HopDongApiTests.cs, HopDongServiceTests.cs
    │       ├── Utilities/      DienNuocApiTests.cs
    │       ├── Invoices/       HoaDonApiTests.cs
    │       ├── Payments/       ThanhToanApiTests.cs
    │       ├── Maintenance/    SuaChuaApiTests.cs
    │       ├── Violations/     ViPhamApiTests.cs
    │       ├── Reports/        BaoCaoApiTests.cs
    │       └── Dashboard/      DashboardApiTests.cs
    │
    └── Dormitory.E2ETests/                        (tạo sau cùng) Playwright, kịch bản giao diện
        ├── Dormitory.E2ETests.csproj
        ├── Support/                               Khởi động server + DB, đăng nhập sẵn
        └── Features/                              Đăng nhập, duyệt đơn, lập hợp đồng, thu tiền...