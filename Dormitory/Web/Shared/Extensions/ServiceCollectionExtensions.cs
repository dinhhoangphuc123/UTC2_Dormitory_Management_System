using Microsoft.Extensions.DependencyInjection;
using Dormitory.Web.Features.Accounts;
using Dormitory.Web.Features.Staff;
using Dormitory.Web.Features.Academic;
using Dormitory.Web.Features.Students;
using Dormitory.Web.Features.Buildings;
using Dormitory.Web.Features.Rooms;
using Dormitory.Web.Features.Registrations;
using Dormitory.Web.Features.Contracts;
using Dormitory.Web.Features.Utilities;
using Dormitory.Web.Features.Invoices;
using Dormitory.Web.Features.Payments;
using Dormitory.Web.Features.Maintenance;
using Dormitory.Web.Features.Violations;
using Dormitory.Web.Features.Reports;
using Dormitory.Web.Features.Dashboard;

namespace Dormitory.Web.Shared.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddDormitoryFeatures(this IServiceCollection services)
        {
            services.AddAccountsServices();
            services.AddStaffServices();
            services.AddAcademicServices();
            services.AddStudentServices();
            services.AddBuildingsServices();
            services.AddRoomsServices();
            services.AddRegistrationsServices();
            services.AddContractsServices();
            services.AddUtilitiesServices();
            services.AddInvoicesServices();
            services.AddPaymentsServices();
            services.AddMaintenanceServices();
            services.AddViolationsServices();
            services.AddReportsServices();
            services.AddDashboardServices();

            return services;
        }
    }
}

