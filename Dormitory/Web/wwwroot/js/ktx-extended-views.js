/**
 * KTX UTC2 - Extended Views Module
 * Implements 7 specialized business views matching Design UI:
 * 1. Lớp và khoa viện (lop-khoa)
 * 2. Điện nước và dịch vụ (dien-nuoc-dich-vu)
 * 3. Hóa đơn và thu phí (hoa-don)
 * 4. Yêu cầu sửa chữa (sua-chua)
 * 5. Vi phạm và kỷ luật (vi-pham)
 * 6. Nhân viên và tài khoản (nhan-vien-tai-khoan)
 * 7. Báo cáo thống kê (bao-cao)
 */

window.KtxExtendedViews = (function () {
    // Internal stores
    const extState = {
        classes: [],
        utilities: [],
        invoices: [],
        tickets: [],
        violations: [],
        violationTypes: [],
        staff: [],
        reports: null,
        // Active filters
        classSearch: '',
        classFaculty: 'ALL',
        classCohort: 'ALL',
        utilitySearch: '',
        utilityBuilding: 'ALL',
        utilityFloor: 0,
        utilityStatus: 'ALL',
        invoiceSearch: '',
        invoiceBuilding: 'all',
        invoiceCategory: 'all',
        invoiceStatus: 'all',
        ticketSearch: '',
        ticketTab: 'ALL',
        ticketBuilding: 'ALL',
        ticketCategory: 'ALL',
        ticketPriority: 'ALL',
        violationSearch: '',
        violationStatus: 'ALL',
        violationPenaltyType: 'ALL',
        violationBuilding: 'ALL',
        violationPenalty: 'ALL',
        violationType: 'ALL',
        staffSearch: '',
        staffDept: 'ALL',
        staffRole: 'ALL',
        staffStatus: 'ALL',
        reportSemester: '',
        reportScope: 'ALL'
    };

    function renderMetricCard({ label, value, unit, icon, tone = 'blue', footer, footerRight = '' }) {
        const tones = {
            blue: {
                iconBg: 'bg-blue-50 dark:bg-blue-950/40',
                iconText: 'text-[#0b2a5b] dark:text-blue-400',
                valueText: 'text-[#0b2a5b] dark:text-blue-300',
                footerText: 'text-[#375ba9] dark:text-blue-400'
            },
            amber: {
                iconBg: 'bg-amber-50 dark:bg-amber-950/40',
                iconText: 'text-amber-600 dark:text-amber-400',
                valueText: 'text-amber-600 dark:text-amber-400',
                footerText: 'text-amber-700 dark:text-amber-400'
            },
            red: {
                iconBg: 'bg-red-50 dark:bg-red-950/40',
                iconText: 'text-red-600 dark:text-red-400',
                valueText: 'text-red-600 dark:text-red-400',
                footerText: 'text-red-600 dark:text-red-400'
            },
            green: {
                iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
                iconText: 'text-emerald-600 dark:text-emerald-400',
                valueText: 'text-emerald-600 dark:text-emerald-400',
                footerText: 'text-emerald-700 dark:text-emerald-400'
            },
            slate: {
                iconBg: 'bg-slate-100 dark:bg-slate-800',
                iconText: 'text-slate-600 dark:text-slate-300',
                valueText: 'text-slate-900 dark:text-white',
                footerText: 'text-slate-600 dark:text-slate-300'
            }
        };
        const colors = tones[tone] || tones.blue;
        return `
            <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                <div class="flex items-center justify-between">
                    <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">${label}</span>
                    <span class="w-8 h-8 rounded-lg ${colors.iconBg} ${colors.iconText} flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[18px]">${icon}</span>
                    </span>
                </div>
                <div class="my-3 flex items-baseline gap-2 min-w-0">
                    <span class="text-3xl lg:text-4xl font-bold ${colors.valueText} tracking-tight leading-tight break-words">${value}</span>
                    ${unit ? `<span class="text-sm font-normal text-slate-500 dark:text-slate-400">${unit}</span>` : ''}
                </div>
                <div class="text-xs flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div class="flex min-w-0 items-center gap-2">
                        <span class="${colors.footerText} font-semibold">${footer}</span>
                        ${footerRight ? `<span class="text-red-600 dark:text-red-400 font-semibold">${footerRight}</span>` : ''}
                    </div>
                    <span class="material-symbols-outlined shrink-0 text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
            </div>
        `;
    }

    async function fetchApiData(url) {
        const response = await fetch(url);
        const json = await response.json();
        if (!response.ok || !json.success) {
            throw new Error(json.message || `Yêu cầu thất bại (${response.status})`);
        }
        return json.data;
    }

    function reportLoadFailure(label, error) {
        console.error(`Không tải được ${label}:`, error);
        KtxApp.showToast(`Không tải được ${label}: ${error.message || 'lỗi không xác định'}`, 'error');
    }

    function hasView(tabId) {
        return [
            'lop-khoa',
            'dien-nuoc-dich-vu',
            'hoa-don',
            'sua-chua',
            'vi-pham',
            'nhan-vien-tai-khoan',
            'bao-cao'
        ].includes(tabId);
    }

    async function renderView(tabId, container, appState) {
        switch (tabId) {
            case 'lop-khoa':
                await loadClasses();
                container.innerHTML = renderClassesView();
                break;
            case 'dien-nuoc-dich-vu':
                await loadUtilities();
                container.innerHTML = renderUtilitiesView();
                break;
            case 'hoa-don':
                await loadInvoices();
                container.innerHTML = renderInvoicesView();
                break;
            case 'sua-chua':
                await loadTickets();
                container.innerHTML = renderMaintenanceView();
                break;
            case 'vi-pham':
                await loadViolations();
                container.innerHTML = renderDisciplineView();
                break;
            case 'nhan-vien-tai-khoan':
                await loadStaff();
                container.innerHTML = renderStaffView();
                break;
            case 'bao-cao':
                await loadReports();
                container.innerHTML = renderReportsView();
                break;
            default:
                container.innerHTML = `<div class="p-8 text-center text-slate-400">Không tìm thấy phân hệ yêu cầu.</div>`;
        }
    }

    // ========================================================
    // 1. LỚP VÀ KHOA VIỆN (Classes View)
    // ========================================================
    async function loadClasses() {
        try {
            extState.classes = await fetchApiData('/api/lophoc');
        } catch (error) {
            extState.classes = [];
            reportLoadFailure('danh sách lớp học', error);
        }
    }

    function renderClassesView() {
        const faculties = [...new Set(extState.classes.map(c => c.faculty).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'vi'));
        const cohorts = [...new Set(extState.classes.map(c => c.cohort).filter(cohort => cohort && cohort !== '—'))]
            .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
        let filtered = extState.classes.filter(c => {
            const matchSearch = !extState.classSearch ||
                c.code.toLowerCase().includes(extState.classSearch.toLowerCase()) ||
                c.name.toLowerCase().includes(extState.classSearch.toLowerCase()) ||
                c.advisor.toLowerCase().includes(extState.classSearch.toLowerCase());
            const matchFaculty = extState.classFaculty === 'ALL' || c.faculty === extState.classFaculty;
            const matchCohort = extState.classCohort === 'ALL' || c.cohort.toLowerCase() === extState.classCohort.toLowerCase();
            return matchSearch && matchFaculty && matchCohort;
        });

        const totalClasses = extState.classes.length;
        const totalResidents = extState.classes.reduce((sum, c) => sum + c.residents, 0);
        const totalStudents = extState.classes.reduce((sum, c) => sum + c.totalStudents, 0);
        const avgRate = totalStudents > 0 ? Math.round((totalResidents / totalStudents) * 1000) / 10 : 0;

        return `
            <div class="flex flex-col w-full space-y-6 animate-fade-in">
                <!-- Header Title & Quick Action -->
                <div class="page-title-banner flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Lớp & Khoa Viện</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quản lý lớp học, khoa viện và thông tin sinh viên nội trú</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5">
                        <button type="button" onclick="KtxExtendedViews.exportClassesCsv()" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121826] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-all">
                            <span class="material-symbols-outlined text-[16px]">download</span>
                            <span>Xuất CSV</span>
                        </button>
                        <button type="button" onclick="KtxExtendedViews.openAddClassModal()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold shadow-xs transition-all">
                            <span class="material-symbols-outlined text-[16px]">add</span>
                            <span>Thêm Lớp Mới</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metrics (Image 1 Standard Design) -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">TỔNG SỐ LỚP HỌC</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#0b2a5b] dark:text-blue-400">
                                <span class="material-symbols-outlined text-[18px]">class</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${totalClasses} <span class="text-sm font-normal text-slate-500">lớp</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-[#375ba9] dark:text-blue-400 font-semibold">${faculties.length} khoa/viện theo dữ liệu</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">SINH VIÊN NỘI TRÚ</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#375ba9] dark:text-blue-400">
                                <span class="material-symbols-outlined text-[18px]">groups</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-[#0b2a5b] dark:text-blue-400 tracking-tight">
                                ${totalResidents.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">sinh viên</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-[#375ba9] dark:text-blue-400 font-semibold">Theo hợp đồng còn hiệu lực</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">TỔNG SĨ SỐ LỚP</span>
                            <div class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                <span class="material-symbols-outlined text-[18px]">school</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${totalStudents.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">sinh viên</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-purple-600 dark:text-purple-400 font-semibold">Theo danh sách sinh viên đã lưu</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">TỶ LỆ NỘI TRÚ TB</span>
                            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <span class="material-symbols-outlined text-[18px]">pie_chart</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                                ${avgRate}% <span class="text-sm font-normal text-slate-500">tổng SV</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Tính từ số liệu hiện có</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>
                </div>

                <!-- Filter Bar -->
                <div class="page-filter-bar flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs">
                    <div class="page-filter-search flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                        <input type="text" placeholder="Tìm theo mã lớp, tên lớp, khoa/viện..." value="${extState.classSearch}" oninput="KtxExtendedViews.filterClassesSearch(this.value)" class="w-full bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div class="page-filter-controls flex items-center gap-2">
                        <select onchange="KtxExtendedViews.filterClassesFaculty(this.value)" class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none">
                            <option value="ALL">Khoa: Tất cả</option>
                            ${faculties.map(faculty => `<option value="${faculty}" ${extState.classFaculty === faculty ? 'selected' : ''}>${faculty}</option>`).join('')}
                        </select>
                        <select onchange="KtxExtendedViews.filterClassesCohort(this.value)" class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none">
                            <option value="ALL">Khóa: Tất cả</option>
                            ${cohorts.map(cohort => `<option value="${cohort}" ${extState.classCohort === cohort ? 'selected' : ''}>Khóa ${cohort.toUpperCase()}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <!-- Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th class="py-3 px-4">Mã Lớp</th>
                                    <th class="py-3 px-4">Tên Lớp Chuyên Ngành</th>
                                    <th class="py-3 px-4">Khoa / Viện Quản Lý</th>
                                    <th class="py-3 px-4">Cố Vấn Học Tập</th>
                                    <th class="py-3 px-4">Nội Trú / Sĩ Số</th>
                                    <th class="py-3 px-4">Tỷ Lệ</th>
                                    <th class="py-3 px-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                ${filtered.map(c => `
                                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                                        <td class="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">
                                            <span class="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">${c.code}</span>
                                        </td>
                                        <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">${c.name}</td>
                                        <td class="py-3 px-4 text-slate-600 dark:text-slate-400">${c.faculty}</td>
                                        <td class="py-3 px-4 text-slate-600 dark:text-slate-400">${c.advisor}</td>
                                        <td class="py-3 px-4">
                                            <div class="font-medium text-slate-800 dark:text-slate-200">${c.residents} / ${c.totalStudents} SV</div>
                                            <div class="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                                                <div class="h-full bg-blue-600 dark:bg-blue-500 rounded-full" style="width: ${c.rate}%"></div>
                                            </div>
                                        </td>
                                        <td class="py-3 px-4">
                                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${c.rate >= 60 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}">${c.rate}%</span>
                                        </td>
                                        <td class="py-3 px-4 text-right space-x-1">
                                            <button onclick="KtxExtendedViews.viewClassDetail('${c.code}')" class="p-1 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition" title="Xem chi tiết">
                                                <span class="material-symbols-outlined text-[18px]">visibility</span>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${filtered.length === 0 ? `
                                    <tr>
                                        <td colspan="7" class="py-8 text-center text-slate-400">Không tìm thấy lớp nào phù hợp bộ lọc.</td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function filterClassesSearch(val) {
        extState.classSearch = val;
        const main = document.getElementById('mainContent');
        if (main) main.innerHTML = renderClassesView();
    }
    function filterClassesFaculty(val) {
        extState.classFaculty = val;
        const main = document.getElementById('mainContent');
        if (main) main.innerHTML = renderClassesView();
    }
    function filterClassesCohort(val) {
        extState.classCohort = val;
        const main = document.getElementById('mainContent');
        if (main) main.innerHTML = renderClassesView();
    }

    function exportClassesCsv() {
        const rows = [['Mã Lớp', 'Tên Lớp', 'Khoa Viện', 'Cố Vấn', 'Nội Trú', 'Sĩ Số', 'Tỷ Lệ']];
        extState.classes.forEach(c => rows.push([c.code, c.name, c.faculty, c.advisor, c.residents, c.totalStudents, c.rate + '%']));
        downloadCsv('danh_sach_lop_KTX_UTC2.csv', rows);
        KtxApp.showToast('Đã xuất danh sách lớp ra file CSV thành công!');
    }

    function openAddClassModal() {
        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-blue-600">domain_add</span>
                            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Thêm Lớp Chuyên Ngành Mới</h3>
                        </div>
                        <button onclick="KtxExtendedViews.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxExtendedViews.submitAddClass();" class="space-y-3.5 pt-4 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mã Lớp *</label>
                            <input id="newClassCode" required type="text" placeholder="VD: CNTT-K65A" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 uppercase font-mono text-xs focus:outline-none" />
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên Lớp *</label>
                            <input id="newClassName" required type="text" placeholder="VD: Công nghệ thông tin 01 K65" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Khoa / Viện</label>
                                <input id="newClassFaculty" required type="text" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Khóa</label>
                                <input id="newClassCohort" required type="text" pattern="[kK][0-9]+" placeholder="VD: k65" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">Lưu lớp mới</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitAddClass() {
        const code = document.getElementById('newClassCode').value;
        const name = document.getElementById('newClassName').value;
        const faculty = document.getElementById('newClassFaculty').value;
        const cohort = document.getElementById('newClassCohort').value;

        try {
            const res = await fetch('/api/lophoc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, name, faculty, cohort })
            });
            const json = await res.json();
            if (json.success) {
                KtxApp.showToast(json.message || 'Đã thêm lớp mới thành công!');
                closeModal();
                await loadClasses();
                const main = document.getElementById('mainContent');
                if (main) main.innerHTML = renderClassesView();
            } else {
                KtxApp.showToast(json.message || 'Lỗi thêm lớp', 'error');
            }
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
    }

    function viewClassDetail(code) {
        const item = extState.classes.find(c => c.code === code);
        if (!item) return;
        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="KtxExtendedViews.closeModal()">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Hồ sơ Lớp ${item.code}</h3>
                        <button onclick="KtxExtendedViews.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <div class="py-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><span class="text-slate-400">Tên chuyên ngành:</span><span class="font-bold text-slate-800 dark:text-white">${item.name}</span></div>
                        <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><span class="text-slate-400">Khoa / Viện:</span><span class="font-semibold">${item.faculty}</span></div>
                        <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><span class="text-slate-400">Cố vấn học tập:</span><span class="font-semibold text-blue-600 dark:text-blue-400">${item.advisor}</span></div>
                        <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><span class="text-slate-400">Sĩ số sinh viên:</span><span class="font-bold">${item.totalStudents} SV</span></div>
                        <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><span class="text-slate-400">Sinh viên ở KTX:</span><span class="font-bold text-emerald-600">${item.residents} SV (${item.rate}%)</span></div>
                    </div>
                    <div class="flex justify-end pt-2">
                        <button onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl bg-[#0B2A5B] text-white font-semibold text-xs">Đóng</button>
                    </div>
                </div>
            </div>
        `;
    }

    // ========================================================
    // 2. ĐIỆN NƯỚC & DỊCH VỤ (Utilities View)
    // ========================================================
    async function loadUtilities() {
        try {
            extState.utilities = await fetchApiData('/api/diennuoc');
        } catch (error) {
            extState.utilities = [];
            reportLoadFailure('dữ liệu điện nước', error);
        }
    }

    function renderUtilitiesView() {
        let filtered = extState.utilities.filter(u => {
            const matchSearch = !extState.utilitySearch || u.room.toLowerCase().includes(extState.utilitySearch.toLowerCase());
            const matchBuilding = extState.utilityBuilding === 'ALL' || u.building.toLowerCase() === extState.utilityBuilding.toLowerCase();
            const matchFloor = extState.utilityFloor === 0 || u.floor === extState.utilityFloor;
            const matchStatus = extState.utilityStatus === 'ALL' || u.status === extState.utilityStatus;
            return matchSearch && matchBuilding && matchFloor && matchStatus;
        });

        const totalRooms = extState.utilities.length;
        const totalRecorded = extState.utilities.filter(u => u.status === 'RECORDED' || u.status === 'EXCEEDED').length;
        const totalExceeded = extState.utilities.filter(u => u.status === 'EXCEEDED').length;
        const totalPending = extState.utilities.filter(u => u.status === 'PENDING').length;
        const electricityRate = extState.utilities.find(u => u.electricityRate != null)?.electricityRate;
        const waterRate = extState.utilities.find(u => u.waterRate != null)?.waterRate;
        const buildings = [...new Set(extState.utilities.map(u => u.building).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'vi'));

        return `
            <div class="flex flex-col w-full space-y-6 animate-fade-in">
                <!-- Header Title & Actions -->
                <div class="page-title-banner flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Điện nước & Dịch vụ</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Theo dõi chỉ số điện nước và các dịch vụ trong khu nội trú</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5">
                        <button type="button" onclick="KtxExtendedViews.exportUtilitiesCsv()" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121826] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-all">
                            <span class="material-symbols-outlined text-[16px]">download</span>
                            <span>Xuất Báo Cáo</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metrics (Image 1 Standard Design) -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">ĐÃ CHỐT CHỈ SỐ</span>
                            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <span class="material-symbols-outlined text-[18px]">check_circle</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                                ${totalRecorded} <span class="text-sm font-normal text-slate-500">/ ${totalRooms} phòng</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Đạt ${Math.round((totalRecorded / (totalRooms || 1)) * 100)}% chỉ tiêu chốt số</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">CHƯA GHI SỐ</span>
                            <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <span class="material-symbols-outlined text-[18px]">pending_actions</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                                ${totalPending} <span class="text-sm font-normal text-slate-500">phòng</span>
                            </div>
                        </div>
                        <div class="text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 font-semibold">
                            <span>Tiến độ ghi số trong database</span>
                            <span class="material-symbols-outlined shrink-0 text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">VƯỢT ĐỊNH MỨC</span>
                            <div class="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                                <span class="material-symbols-outlined text-[18px]">warning</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
                                ${totalExceeded} <span class="text-sm font-normal text-slate-500">phòng</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-rose-600 dark:text-rose-400 font-semibold">&gt; 250 kWh/tháng · Kiểm tra thiết bị</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">ĐƠN GIÁ ĐIỆN & NƯỚC</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#0b2a5b] dark:text-blue-400">
                                <span class="material-symbols-outlined text-[18px]">payments</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-[#0b2a5b] dark:text-blue-300 tracking-tight">
                                ${electricityRate == null ? 'Chưa cấu hình' : electricityRate.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">${electricityRate == null ? '' : 'đ/kWh'}</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-[#375ba9] dark:text-blue-400 font-semibold">Nước ${waterRate == null ? 'chưa cấu hình' : `${waterRate.toLocaleString('vi-VN')} đ/m³`} · Giá từ database</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>
                </div>

                <!-- Filters -->
                <div class="page-filter-bar flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs">
                    <div class="page-filter-search flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                        <input type="text" placeholder="Tìm kiếm theo số phòng (VD: A01-201)..." value="${extState.utilitySearch}" oninput="KtxExtendedViews.filterUtilitySearch(this.value)" class="w-full bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div class="page-filter-controls flex items-center gap-2">
                        <select onchange="KtxExtendedViews.filterUtilityBuilding(this.value)" class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none">
                            <option value="ALL">Tòa: Tất cả</option>
                            ${buildings.map(building => `<option value="${building}" ${extState.utilityBuilding === building ? 'selected' : ''}>Tòa ${building}</option>`).join('')}
                        </select>
                        <select onchange="KtxExtendedViews.filterUtilityStatus(this.value)" class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none">
                            <option value="ALL">Trạng thái: Tất cả</option>
                            <option value="RECORDED" ${extState.utilityStatus === 'RECORDED' ? 'selected' : ''}>Đã ghi số</option>
                            <option value="PENDING" ${extState.utilityStatus === 'PENDING' ? 'selected' : ''}>Chờ ghi số</option>
                            <option value="EXCEEDED" ${extState.utilityStatus === 'EXCEEDED' ? 'selected' : ''}>Vượt định mức</option>
                        </select>
                    </div>
                </div>

                <!-- Utilities Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th class="py-3 px-4">Phòng / Sức chứa</th>
                                    <th class="py-3 px-4">Chỉ số Điện (kWh)</th>
                                    <th class="py-3 px-4">Chỉ số Nước (m³)</th>
                                    <th class="py-3 px-4">Dịch vụ phụ</th>
                                    <th class="py-3 px-4">Trạng thái</th>
                                    <th class="py-3 px-4 text-right">Ghi nhận</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                ${filtered.map(u => {
                                    const stBadge = u.status === 'EXCEEDED'
                                        ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200">VƯỢT ĐỊNH MỨC</span>'
                                        : (u.status === 'RECORDED'
                                            ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200">ĐÃ GHI SỐ</span>'
                                            : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200">CHỜ CHỐT SỐ</span>');

                                    return `
                                        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                                            <td class="py-3 px-4">
                                                <div class="font-bold text-slate-900 dark:text-white text-sm">${u.room}</div>
                                                <div class="text-[11px] text-slate-400">${u.capacity}</div>
                                            </td>
                                            <td class="py-3 px-4">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-slate-400 font-mono">${u.oldElectric ?? '--'}</span>
                                                    <span class="material-symbols-outlined text-[14px] text-slate-400">arrow_forward</span>
                                                    <span class="font-bold text-slate-900 dark:text-white font-mono">${u.newElectric !== null ? u.newElectric : '--'}</span>
                                                </div>
                                                ${u.usageElectric !== null ? `<div class="text-[11px] font-semibold text-blue-600 mt-0.5">Tiêu thụ: ${u.usageElectric} kWh</div>` : ''}
                                            </td>
                                            <td class="py-3 px-4">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-slate-400 font-mono">${u.oldWater ?? '--'}</span>
                                                    <span class="material-symbols-outlined text-[14px] text-slate-400">arrow_forward</span>
                                                    <span class="font-bold text-slate-900 dark:text-white font-mono">${u.newWater !== null ? u.newWater : '--'}</span>
                                                </div>
                                                ${u.usageWater !== null ? `<div class="text-[11px] font-semibold text-cyan-600 mt-0.5">Tiêu thụ: ${u.usageWater} m³</div>` : ''}
                                            </td>
                                            <td class="py-3 px-4">
                                                <div class="flex gap-1">
                                                    ${u.services.map(s => `<span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">${s}</span>`).join('')}
                                                </div>
                                            </td>
                                            <td class="py-3 px-4">${stBadge}</td>
                                            <td class="py-3 px-4 text-right">
                                                <button onclick="KtxExtendedViews.openUtilityRecordDrawer('${u.id}')" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-2xs transition">
                                                    <span class="material-symbols-outlined text-[15px]">edit</span>
                                                    <span>Ghi số</span>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function filterUtilitySearch(v) { extState.utilitySearch = v; reRender(); }
    function filterUtilityBuilding(v) { extState.utilityBuilding = v; reRender(); }
    function filterUtilityStatus(v) { extState.utilityStatus = v; reRender(); }

    function openUtilityRecordDrawer(roomId) {
        const item = extState.utilities.find(u => u.id === roomId);
        if (!item) return;

        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-amber-500">bolt</span>
                            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Chốt số Điện Nước: Phòng ${item.room}</h3>
                        </div>
                        <button onclick="KtxExtendedViews.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxExtendedViews.submitRecordUtility('${item.id}');" class="space-y-4 pt-4 text-xs">
                        <!-- Điện -->
                        <div class="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-bold text-amber-900 dark:text-amber-300">Chỉ số Công tơ Điện</span>
                                <span class="text-[11px] text-slate-500">Số cũ: <strong>${item.oldElectric}</strong> kWh</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <input id="recordNewElec" type="number" required min="${item.oldElectric}" value="${item.newElectric || item.oldElectric + 120}" class="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-800 dark:text-white focus:outline-none" />
                                <span class="text-slate-400 font-semibold">kWh</span>
                            </div>
                        </div>

                        <!-- Nước -->
                        <div class="p-3 bg-cyan-50/60 dark:bg-cyan-950/20 rounded-xl border border-cyan-200/60 dark:border-cyan-900/40">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-bold text-cyan-900 dark:text-cyan-300">Chỉ số Đồng hồ Nước</span>
                                <span class="text-[11px] text-slate-500">Số cũ: <strong>${item.oldWater}</strong> m³</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <input id="recordNewWater" type="number" required min="${item.oldWater}" value="${item.newWater || item.oldWater + 12}" class="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-800 dark:text-white focus:outline-none" />
                                <span class="text-slate-400 font-semibold">m³</span>
                            </div>
                        </div>

                        <!-- Dịch vụ cộng thêm -->
                        <div>
                            <span class="block font-semibold text-slate-700 dark:text-slate-300 mb-2">Dịch vụ sử dụng trong tháng:</span>
                            <div class="flex items-center gap-4">
                                <label class="inline-flex items-center gap-2 cursor-pointer">
                                    <input id="serviceNet" type="checkbox" checked class="w-4 h-4 rounded text-blue-600" />
                                    <span>Internet Wifi (+50.000 đ)</span>
                                </label>
                                <label class="inline-flex items-center gap-2 cursor-pointer">
                                    <input id="serviceTrash" type="checkbox" checked class="w-4 h-4 rounded text-blue-600" />
                                    <span>Vệ sinh & Rác (+30.000 đ)</span>
                                </label>
                            </div>
                        </div>

                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">Lưu chỉ số</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitRecordUtility(roomId) {
        const newElec = Number(document.getElementById('recordNewElec').value);
        const newWater = Number(document.getElementById('recordNewWater').value);
        const hasNet = document.getElementById('serviceNet').checked;
        const hasTrash = document.getElementById('serviceTrash').checked;

        try {
            const res = await fetch('/api/diennuoc/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, newElectric: newElec, newWater, hasInternet: hasNet, hasTrash })
            });
            const json = await res.json();
            if (json.success) {
                KtxApp.showToast(json.message || 'Đã ghi nhận chỉ số thành công!');
                closeModal();
                await loadUtilities();
                reRender();
            } else {
                KtxApp.showToast(json.message || 'Lỗi ghi số', 'error');
            }
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
    }

    function exportUtilitiesCsv() {
        const rows = [['Phòng', 'Tòa', 'Tầng', 'Điện Cũ', 'Điện Mới', 'Tiêu Thụ kWh', 'Nước Cũ', 'Nước Mới', 'Tiêu Thụ m3', 'Trạng Thái']];
        extState.utilities.forEach(u => rows.push([u.room, u.building, u.floor, u.oldElectric, u.newElectric || '', u.usageElectric || '', u.oldWater, u.newWater || '', u.usageWater || '', u.status]));
        downloadCsv('bao_cao_dien_nuoc_KTX_UTC2.csv', rows);
        KtxApp.showToast('Đã xuất báo cáo điện nước thành công!');
    }

    // ========================================================
    // 3. HÓA ĐƠN & THU PHÍ (Invoices View)
    // ========================================================
    async function loadInvoices() {
        try {
            extState.invoices = await fetchApiData('/api/hoadon');
        } catch (error) {
            extState.invoices = [];
            reportLoadFailure('danh sách hóa đơn', error);
        }
    }

    function renderInvoicesView() {
        let filtered = extState.invoices.filter(i => {
            const matchSearch = !extState.invoiceSearch ||
                i.code.toLowerCase().includes(extState.invoiceSearch.toLowerCase()) ||
                i.studentName.toLowerCase().includes(extState.invoiceSearch.toLowerCase()) ||
                i.studentId.toLowerCase().includes(extState.invoiceSearch.toLowerCase()) ||
                i.room.toLowerCase().includes(extState.invoiceSearch.toLowerCase());
            const matchBuilding = extState.invoiceBuilding === 'all' || i.building.toLowerCase() === extState.invoiceBuilding.toLowerCase();
            const matchCat = extState.invoiceCategory === 'all' || i.category === extState.invoiceCategory;
            const matchStatus = extState.invoiceStatus === 'all' || i.status === extState.invoiceStatus;
            return matchSearch && matchBuilding && matchCat && matchStatus;
        });

        const totalPaid = extState.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
        const totalPending = extState.invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
        const totalOverdue = extState.invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
        const overdueCount = extState.invoices.filter(i => i.status === 'overdue' || i.isOverdue).length;

        return `
            <div class="flex flex-col w-full space-y-6 animate-fade-in">
                <!-- Header Title & Action Buttons -->
                <div class="page-title-banner flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Hóa đơn & Thu phí</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Theo dõi khoản thu, tình trạng thanh toán và công nợ nội trú</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2">
                        <button type="button" onclick="KtxExtendedViews.filterInvoiceStatus('overdue')" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition">
                            <span class="material-symbols-outlined text-[16px]">notifications_active</span>
                            <span>Xem nợ quá hạn (${overdueCount})</span>
                        </button>
                        <button type="button" onclick="KtxExtendedViews.openCreateInvoiceModal()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold shadow-xs transition">
                            <span class="material-symbols-outlined text-[16px]">add_card</span>
                            <span>Lập Hóa Đơn</span>
                        </button>
                    </div>
                </div>

                <!-- KPI Cards -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${renderMetricCard({ label: 'Thực thu đã thu', value: totalPaid.toLocaleString('vi-VN'), unit: 'đ', icon: 'payments', tone: 'blue', footer: 'Tổng tiền đã thu' })}
                    ${renderMetricCard({ label: 'Chờ sinh viên nộp', value: totalPending.toLocaleString('vi-VN'), unit: 'đ', icon: 'schedule', tone: 'amber', footer: 'Đang chờ thanh toán' })}
                    ${renderMetricCard({ label: 'Công nợ quá hạn', value: totalOverdue.toLocaleString('vi-VN'), unit: 'đ', icon: 'account_balance_wallet', tone: 'red', footer: `${overdueCount} hóa đơn quá hạn` })}
                    ${renderMetricCard({ label: 'Cổng tích hợp', value: '03', unit: 'cổng', icon: 'credit_card', tone: 'slate', footer: 'VNPAY QR · VietinBank · Tiền mặt' })}
                </div>

                <!-- Filter Bar -->
                <div class="page-filter-bar flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs">
                    <div class="page-filter-search flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                        <input type="text" placeholder="Tìm kiếm theo mã HĐ, tên SV, MSSV, phòng..." value="${extState.invoiceSearch}" oninput="KtxExtendedViews.filterInvoiceSearch(this.value)" class="w-full bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div class="page-filter-controls flex items-center gap-2">
                        <select onchange="KtxExtendedViews.filterInvoiceCategory(this.value)" class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none">
                            <option value="all">Khoản thu: Tất cả</option>
                            <option value="tonghop" ${extState.invoiceCategory === 'tonghop' ? 'selected' : ''}>Tổng hợp</option>
                            <option value="diennuoc" ${extState.invoiceCategory === 'diennuoc' ? 'selected' : ''}>Điện nước</option>
                            <option value="phong" ${extState.invoiceCategory === 'phong' ? 'selected' : ''}>Tiền phòng</option>
                            <option value="guixe" ${extState.invoiceCategory === 'guixe' ? 'selected' : ''}>Gửi xe</option>
                        </select>
                        <select onchange="KtxExtendedViews.filterInvoiceStatus(this.value)" class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none">
                            <option value="all">Trạng thái: Tất cả</option>
                            <option value="paid" ${extState.invoiceStatus === 'paid' ? 'selected' : ''}>Đã nộp</option>
                            <option value="pending" ${extState.invoiceStatus === 'pending' ? 'selected' : ''}>Chờ nộp</option>
                            <option value="overdue" ${extState.invoiceStatus === 'overdue' ? 'selected' : ''}>Quá hạn</option>
                        </select>
                    </div>
                </div>

                <!-- Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th class="py-3 px-4">Mã Hóa Đơn / Phòng</th>
                                    <th class="py-3 px-4">Sinh Viên / MSSV</th>
                                    <th class="py-3 px-4">Nội Dung Thu</th>
                                    <th class="py-3 px-4">Số Tiền</th>
                                    <th class="py-3 px-4">Hạn Đóng</th>
                                    <th class="py-3 px-4">Trạng Thái</th>
                                    <th class="py-3 px-4 text-right">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                ${filtered.map(inv => {
                                    const stBadge = inv.status === 'paid'
                                        ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200">ĐÃ NỘP</span>'
                                        : (inv.status === 'overdue'
                                            ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200">QUÁ HẠN</span>'
                                            : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200">CHỜ NỘP</span>');

                                    return `
                                        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                                            <td class="py-3 px-4">
                                                <div class="font-bold text-blue-600 dark:text-blue-400 font-mono">${inv.code}</div>
                                                <div class="text-[11px] text-slate-400">Phòng ${inv.room}</div>
                                            </td>
                                            <td class="py-3 px-4">
                                                <div class="font-semibold text-slate-800 dark:text-slate-200">${inv.studentName}</div>
                                                <div class="text-[11px] font-mono text-slate-400">${inv.studentId}</div>
                                            </td>
                                            <td class="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">${inv.title}</td>
                                            <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">${inv.amount.toLocaleString('vi-VN')} đ</td>
                                            <td class="py-3 px-4">
                                                <div class="text-slate-700 dark:text-slate-300">${inv.dueDate}</div>
                                                ${inv.overdueText ? `<div class="text-[10px] font-bold text-rose-600">${inv.overdueText}</div>` : ''}
                                            </td>
                                            <td class="py-3 px-4">${stBadge}</td>
                                            <td class="py-3 px-4 text-right space-x-1">
                                                ${inv.status !== 'paid' ? `
                                                    <button onclick="KtxExtendedViews.confirmPaymentPrompt('${inv.code}', ${inv.amount})" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition">
                                                        Thu tiền
                                                    </button>
                                                ` : ''}
                                                <button onclick="KtxExtendedViews.printInvoiceDirect('${inv.code}')" class="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white" title="In phiếu">
                                                    <span class="material-symbols-outlined text-[17px]">print</span>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function filterInvoiceSearch(v) { extState.invoiceSearch = v; reRender(); }
    function filterInvoiceCategory(v) { extState.invoiceCategory = v; reRender(); }
    function filterInvoiceStatus(v) { extState.invoiceStatus = v; reRender(); }

    function confirmPaymentPrompt(code, amount) {
        if (!confirm(`Xác nhận đã thu số tiền ${amount.toLocaleString('vi-VN')} đ cho hóa đơn ${code}?`)) return;

        fetch('/api/hoadon/confirm-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId: code, paymentMethod: 'Tiền mặt (BQL)' })
        }).then(r => r.json()).then(res => {
            KtxApp.showToast(res.message || 'Đã ghi nhận thanh toán thành công!');
            loadInvoices().then(() => reRender());
        }).catch(() => KtxApp.showToast('Lỗi kết nối máy chủ', 'error'));
    }

    function printInvoice(code) {
        const inv = extState.invoices.find(i => i.code === code);
        if (!inv) return;
        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="KtxExtendedViews.closeModal()">
                <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800" onclick="event.stopPropagation()">
                    <div class="text-center pb-4 border-b border-slate-200">
                        <div class="text-xs font-bold uppercase text-slate-500">TRƯỜNG ĐH GIAO THÔNG VẬN TẢI - PHÂN HIỆU TP.HCM</div>
                        <div class="text-sm font-bold text-[#0B2A5B] mt-0.5">BAN QUẢN LÝ KÝ TÚC XÁ</div>
                        <h3 class="text-base font-extrabold uppercase mt-3">BIÊN LAI THU PHÍ NỘI TRÚ</h3>
                        <div class="text-xs font-mono text-slate-500">Mã phiếu: ${inv.code}</div>
                    </div>
                    <div class="py-4 space-y-2 text-xs">
                        <div class="flex justify-between"><span>Sinh viên:</span><strong>${inv.studentName}</strong></div>
                        <div class="flex justify-between"><span>MSSV:</span><span class="font-mono">${inv.studentId}</span></div>
                        <div class="flex justify-between"><span>Phòng lưu trú:</span><span>${inv.room}</span></div>
                        <div class="flex justify-between"><span>Khoản thu:</span><span>${inv.title}</span></div>
                        <div class="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-[#0B2A5B]">
                            <span>Tổng tiền:</span>
                            <span>${inv.amount.toLocaleString('vi-VN')} đ</span>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
                        <button onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold">Đóng</button>
                        <button onclick="KtxExtendedViews.printInvoiceDirect('${code}')" class="px-4 py-2 rounded-xl bg-[#0B2A5B] text-white text-xs font-semibold">In biên lai</button>
                    </div>
                </div>
            </div>
        `;
    }

    function printInvoiceWindow(code) {
        const inv = extState.invoices.find(i => i.code === code);
        if (!inv) return;
        const w = window.open('', '_blank', 'width=800,height=900');
        if (!w) return;
        w.document.write(`
            <html><head><title>Biên lai ${inv.code}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20mm; color: #111; }
                .title { text-align: center; font-weight: bold; font-size: 14px; }
                .sub { text-align: center; font-size: 11px; color: #555; }
                .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; }
                .total { font-weight: bold; font-size: 14px; color: #0B2A5B; border-top: 1px solid #ccc; padding-top: 6px; margin-top: 8px; }
                @page { size: A4; margin: 15mm; }
            </style></head><body>
            <div class="title">TRƯỜNG ĐH GIAO THÔNG VẬN TẢI - PHÂN HIỆU TP.HCM</div>
            <div class="sub">BAN QUẢN LÝ KÝ TÚC XÁ</div>
            <h3 style="text-align:center;text-transform:uppercase;margin:12px 0 4px;">Biên lai thu phí nội trú</h3>
            <div class="sub">Mã phiếu: ${inv.code}</div>
            <div style="margin-top:12px;">
                <div class="row"><span>Sinh viên:</span><strong>${inv.studentName}</strong></div>
                <div class="row"><span>MSSV:</span><span>${inv.studentId}</span></div>
                <div class="row"><span>Phòng lưu trú:</span><span>${inv.room}</span></div>
                <div class="row"><span>Khoản thu:</span><span>${inv.title}</span></div>
                <div class="row total"><span>Tổng tiền:</span><span>${inv.amount.toLocaleString('vi-VN')} đ</span></div>
            </div>
            <script>window.onload = function(){ window.print(); };</script>
            </body></html>
        `);
        w.document.close();
    }

    function printInvoiceDirect(code) {
        const inv = extState.invoices.find(i => i.code === code);
        if (!inv) return;
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <html><head><title>Biên lai ${inv.code}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20mm; color: #111; }
                .title { text-align: center; font-weight: bold; font-size: 14px; }
                .sub { text-align: center; font-size: 11px; color: #555; }
                .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; }
                .total { font-weight: bold; font-size: 14px; color: #0B2A5B; border-top: 1px solid #ccc; padding-top: 6px; margin-top: 8px; }
                @page { size: A4; margin: 15mm; }
            </style></head><body>
            <div class="title">TRƯỜNG ĐH GIAO THÔNG VẬN TẢI - PHÂN HIỆU TP.HCM</div>
            <div class="sub">BAN QUẢN LÝ KÝ TÚC XÁ</div>
            <h3 style="text-align:center;text-transform:uppercase;margin:12px 0 4px;">Biên lai thu phí nội trú</h3>
            <div class="sub">Mã phiếu: ${inv.code}</div>
            <div style="margin-top:12px;">
                <div class="row"><span>Sinh viên:</span><strong>${inv.studentName}</strong></div>
                <div class="row"><span>MSSV:</span><span>${inv.studentId}</span></div>
                <div class="row"><span>Phòng lưu trú:</span><span>${inv.room}</span></div>
                <div class="row"><span>Khoản thu:</span><span>${inv.title}</span></div>
                <div class="row total"><span>Tổng tiền:</span><span>${inv.amount.toLocaleString('vi-VN')} đ</span></div>
            </div>
            </body></html>
        `);
        doc.close();
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }

    function openCreateInvoiceModal() {
        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Lập Hóa Đơn Thu Phí Mới</h3>
                        <button onclick="KtxExtendedViews.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxExtendedViews.submitCreateInvoice();" class="space-y-3.5 pt-4 text-xs">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mã Tòa *</label>
                                <input id="invBld" required type="text" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs focus:outline-none" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Số Phòng *</label>
                                <input id="invRoom" required type="text" placeholder="VD: 304" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs focus:outline-none" />
                            </div>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">MSSV</label>
                            <input id="invStudentId" required type="text" placeholder="Mã sinh viên trong dữ liệu" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs focus:outline-none" />
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nội Dung Thu Phí</label>
                            <input id="invTitle" required type="text" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Số Tiền (VNĐ)</label>
                                <input id="invAmount" required type="number" min="0.01" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Hạn Nộp</label>
                                <input id="invDueDate" required type="date" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">Tạo Hóa Đơn</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitCreateInvoice() {
        const bld = document.getElementById('invBld').value;
        const room = document.getElementById('invRoom').value;
        const sId = document.getElementById('invStudentId').value;
        const title = document.getElementById('invTitle').value;
        const amount = Number(document.getElementById('invAmount').value);
        const due = document.getElementById('invDueDate').value;

        try {
            const res = await fetch('/api/hoadon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ building: bld, room: `${bld}-${room}`, studentId: sId, title, amount, dueDate: due, category: 'tonghop' })
            });
            const json = await res.json();
            if (json.success) {
                KtxApp.showToast(json.message || 'Đã tạo hóa đơn thành công!');
                closeModal();
                await loadInvoices();
                reRender();
            } else {
                KtxApp.showToast(json.message || 'Lỗi', 'error');
            }
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
    }

    // ========================================================
    // 4. YÊU CẦU SỬA CHỮA (Maintenance View)
    // ========================================================
    async function loadTickets() {
        try {
            extState.tickets = await fetchApiData('/api/suachua');
        } catch (error) {
            extState.tickets = [];
            reportLoadFailure('danh sách yêu cầu sửa chữa', error);
        }
    }

    function renderMaintenanceView() {
        const ticketBuildings = [...new Set(extState.tickets.map(ticket => ticket.building).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'vi'));
        const ticketCategories = [...new Set(extState.tickets.map(ticket => ticket.category).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'vi'));
        let filtered = extState.tickets.filter(t => {
            const matchSearch = !extState.ticketSearch ||
                t.code.toLowerCase().includes(extState.ticketSearch.toLowerCase()) ||
                t.room.toLowerCase().includes(extState.ticketSearch.toLowerCase()) ||
                t.reporter.toLowerCase().includes(extState.ticketSearch.toLowerCase()) ||
                t.title.toLowerCase().includes(extState.ticketSearch.toLowerCase());
            const matchTab = extState.ticketTab === 'ALL' || t.status === extState.ticketTab;
            const matchBld = extState.ticketBuilding === 'ALL' || t.building === extState.ticketBuilding;
            const matchCat = extState.ticketCategory === 'ALL' || t.category === extState.ticketCategory;
            const matchPri = extState.ticketPriority === 'ALL' || t.priority === extState.ticketPriority;
            return matchSearch && matchTab && matchBld && matchCat && matchPri;
        });

        const totalCount   = extState.tickets.length;
        const pendingCount    = extState.tickets.filter(t => t.status === 'PENDING').length;
        const inProgressCount = extState.tickets.filter(t => t.status === 'IN_PROGRESS').length;
        const completedCount  = extState.tickets.filter(t => t.status === 'COMPLETED').length;
        const urgentCount     = extState.tickets.filter(t => t.priority === 'Khẩn cấp' && t.status !== 'COMPLETED').length;

        return `
            <div class="flex flex-col w-full space-y-6 animate-fade-in">
                <!-- Header Title & Action -->
                <div class="page-title-banner flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Sửa chữa &amp; Bảo trì Cơ sở vật chất</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tiếp nhận, phân công và theo dõi tiến độ yêu cầu sửa chữa</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5">
                        <button type="button" onclick="KtxExtendedViews.openAssignTicketModalFromList()" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121826] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-all">
                            <span class="material-symbols-outlined text-[16px]">person_add</span>
                            <span>Phân công kỹ thuật</span>
                        </button>
                        <button type="button" onclick="KtxExtendedViews.openCreateTicketModal()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold shadow-xs transition">
                            <span class="material-symbols-outlined text-[16px]">add_task</span>
                            <span>Tạo phiếu báo hỏng</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metric Cards -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${renderMetricCard({ label: 'Tổng yêu cầu', value: totalCount, unit: 'phiếu', icon: 'assignment', tone: 'blue', footer: 'Tất cả yêu cầu sửa chữa' })}
                    ${renderMetricCard({ label: 'Chờ tiếp nhận', value: pendingCount, unit: 'phiếu', icon: 'pending_actions', tone: 'amber', footer: 'Xem yêu cầu chờ xử lý' })}
                    ${renderMetricCard({ label: 'Đang xử lý / sửa', value: inProgressCount, unit: 'phiếu', icon: 'handyman', tone: 'blue', footer: 'Xem yêu cầu đang sửa' })}
                    ${renderMetricCard({ label: 'Đã hoàn thành', value: completedCount, unit: 'phiếu', icon: 'task_alt', tone: 'green', footer: 'Xem yêu cầu đã hoàn tất' })}
                </div>

                <!-- Filter & Search Strip -->
                <div class="flex flex-nowrap items-center gap-2 p-3 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs overflow-x-auto">
                        <div class="flex-1 min-w-[200px] flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                            <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                            <input type="text" placeholder="Mã phiếu, số phòng, người gửi..." value="${extState.ticketSearch}" oninput="KtxExtendedViews.filterTicketSearch(this.value)" class="w-full bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                        </div>
                            <select onchange="KtxExtendedViews.filterTicketBuilding(this.value)" class="h-10 w-36 shrink-0 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none">
                                <option value="ALL">Tất cả Tòa</option>
                                ${ticketBuildings.map(building => `<option value="${building}" ${extState.ticketBuilding === building ? 'selected' : ''}>Tòa ${building}</option>`).join('')}
                            </select>
                            <select onchange="KtxExtendedViews.filterTicketCategory(this.value)" class="h-10 w-52 shrink-0 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none">
                                <option value="ALL">Tất cả Hạng mục</option>
                                ${ticketCategories.map(category => `<option value="${category}" ${extState.ticketCategory === category ? 'selected' : ''}>${category}</option>`).join('')}
                            </select>
                            <select onchange="KtxExtendedViews.filterTicketPriority(this.value)" class="h-10 w-36 shrink-0 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none">
                                <option value="ALL">Độ ưu tiên</option>
                                <option value="Khẩn cấp"   ${extState.ticketPriority === 'Khẩn cấp'   ? 'selected' : ''}>Khẩn cấp</option>
                                <option value="Bình thường" ${extState.ticketPriority === 'Bình thường' ? 'selected' : ''}>Bình thường</option>
                            </select>
                            <button onclick="KtxExtendedViews.resetTicketFilters()" class="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-500 transition" title="Xóa bộ lọc">
                                <span class="material-symbols-outlined text-[18px]">filter_alt_off</span>
                            </button>

                    <div class="flex items-center gap-1.5 text-xs font-semibold shrink-0">
                        <button onclick="KtxExtendedViews.setTicketTab('ALL')" class="px-3 py-2 rounded-xl shrink-0 transition-colors ${extState.ticketTab === 'ALL' ? 'bg-[#0B2A5B] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}">
                            Tất cả (${totalCount})
                        </button>
                        <button onclick="KtxExtendedViews.setTicketTab('PENDING')" class="px-3 py-2 rounded-xl shrink-0 transition-colors ${extState.ticketTab === 'PENDING' ? 'bg-[#0B2A5B] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}">
                            Chờ duyệt (${pendingCount})
                        </button>
                        <button onclick="KtxExtendedViews.setTicketTab('IN_PROGRESS')" class="px-3 py-2 rounded-xl shrink-0 transition-colors ${extState.ticketTab === 'IN_PROGRESS' ? 'bg-[#0B2A5B] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}">
                            Đang sửa (${inProgressCount})
                        </button>
                        <button onclick="KtxExtendedViews.setTicketTab('COMPLETED')" class="px-3 py-2 rounded-xl shrink-0 transition-colors ${extState.ticketTab === 'COMPLETED' ? 'bg-[#0B2A5B] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}">
                            Hoàn tất (${completedCount})
                        </button>
                    </div>
                </div>

                <!-- Tickets Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th class="py-3 px-4">Mã Phiếu</th>
                                    <th class="py-3 px-4">Phòng & Tòa</th>
                                    <th class="py-3 px-4">Hạng Mục</th>
                                    <th class="py-3 px-4">Nội Dung Sự Cố</th>
                                    <th class="py-3 px-4">Người Báo & SĐT</th>
                                    <th class="py-3 px-4">Kỹ Thuật Viên</th>
                                    <th class="py-3 px-4">Ưu Tiên</th>
                                    <th class="py-3 px-4">Trạng Thái</th>
                                    <th class="py-3 px-4 text-right">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                ${filtered.length === 0 ? `
                                    <tr><td colspan="9" class="py-10 text-center text-slate-400 text-xs">Không có phiếu nào phù hợp bộ lọc.</td></tr>
                                ` : filtered.map(t => {
                                    const priBadge = t.priority === 'Khẩn cấp'
                                        ? '<span class="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>Khẩn cấp</span>'
                                        : '<span class="inline-flex items-center text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Bình thường</span>';

                                    const stBadge = t.status === 'COMPLETED'
                                        ? '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>Hoàn tất</span>'
                                        : (t.status === 'IN_PROGRESS'
                                            ? '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>Đang sửa</span>'
                                            : '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Chờ duyệt</span>');

                                    return `
                                        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                                            <td class="py-3 px-4 font-bold text-blue-600 dark:text-blue-400 font-mono">${t.code}</td>
                                            <td class="py-3 px-4">
                                                <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/60">${t.room}</span>
                                            </td>
                                            <td class="py-3 px-4">
                                                <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">${t.category}</span>
                                            </td>
                                            <td class="py-3 px-4 max-w-[220px]">
                                                <div class="font-semibold text-slate-800 dark:text-slate-200 truncate" title="${t.description || t.title}">${t.title}</div>
                                            </td>
                                            <td class="py-3 px-4">
                                                <div class="font-medium text-slate-800 dark:text-slate-200">${t.reporter}</div>
                                                <div class="text-[11px] font-mono text-slate-400">${t.phone}</div>
                                            </td>
                                            <td class="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                                                ${t.technician
                                                    ? `<span class="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400"><span class="material-symbols-outlined text-[15px]">engineering</span>${t.technician}</span>`
                                                    : '<span class="text-slate-400 italic text-[11px]">Chưa phân công</span>'}
                                            </td>
                                            <td class="py-3 px-4">${priBadge}</td>
                                            <td class="py-3 px-4">${stBadge}</td>
                                            <td class="py-3 px-4 text-right">
                                                <div class="inline-flex items-center gap-1">
                                                    ${t.status === 'PENDING' ? `
                                                        <button onclick="KtxExtendedViews.openAssignTicketModal('${t.id}')" class="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600" title="Phân công ngay">
                                                            <span class="material-symbols-outlined text-[18px]">person_add</span>
                                                        </button>
                                                    ` : ''}
                                                    ${t.status === 'IN_PROGRESS' ? `
                                                        <button onclick="KtxExtendedViews.completeTicket('${t.id}')" class="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600" title="Nghiệm thu & Đóng phiếu">
                                                            <span class="material-symbols-outlined text-[18px]">check_circle</span>
                                                        </button>
                                                    ` : ''}
                                                    <button onclick="KtxExtendedViews.viewTicketDetail('${t.id}')" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400" title="Xem chi tiết">
                                                        <span class="material-symbols-outlined text-[18px]">visibility</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    <!-- Table Footer -->
                    <div class="px-4 py-3 bg-slate-50/40 dark:bg-slate-900/40 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Hiển thị <strong class="text-slate-800 dark:text-slate-200">${filtered.length}</strong> / ${totalCount} phiếu</span>
                        ${urgentCount > 0 ? `<span class="text-rose-600 font-semibold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>${urgentCount} phiếu khẩn cấp cần xử lý ngay</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function setTicketTab(tab) { extState.ticketTab = tab; reRender(); }
    function filterTicketSearch(v) { extState.ticketSearch = v; reRender(); }
    function filterTicketBuilding(v) { extState.ticketBuilding = v; reRender(); }
    function filterTicketCategory(v) { extState.ticketCategory = v; reRender(); }
    function filterTicketPriority(v) { extState.ticketPriority = v; reRender(); }
    function resetTicketFilters() {
        extState.ticketSearch = '';
        extState.ticketTab = 'ALL';
        extState.ticketBuilding = 'ALL';
        extState.ticketCategory = 'ALL';
        extState.ticketPriority = 'ALL';
        reRender();
    }

    function viewTicketDetail(id) {
        const t = extState.tickets.find(x => x.id === id);
        if (!t) return;
        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;
        const stColor = t.status === 'COMPLETED' ? 'emerald' : t.status === 'IN_PROGRESS' ? 'blue' : 'amber';
        const stLabel = t.status === 'COMPLETED' ? 'Hoàn tất' : t.status === 'IN_PROGRESS' ? 'Đang sửa' : 'Chờ duyệt';
        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="KtxExtendedViews.closeModal()">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-blue-600">build_circle</span>
                            <h3 class="text-sm font-bold text-slate-800 dark:text-white">Chi Tiết Phiếu ${t.code}</h3>
                        </div>
                        <button onclick="KtxExtendedViews.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <div class="py-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><span class="text-slate-400">Phòng:</span><span class="font-bold text-blue-600">${t.room}</span></div>
                        <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><span class="text-slate-400">Hạng mục:</span><span class="font-semibold">${t.category}</span></div>
                        <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><span class="text-slate-400">Ưu tiên:</span><span class="font-semibold ${t.priority === 'Khẩn cấp' ? 'text-rose-600' : ''}">${t.priority}</span></div>
                        <div class="py-1 border-b border-slate-100 dark:border-slate-800"><span class="text-slate-400 block mb-1">Mô tả sự cố:</span><span class="font-semibold">${t.description || t.title}</span></div>
                        <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><span class="text-slate-400">Người báo:</span><span class="font-semibold">${t.reporter} — ${t.phone}</span></div>
                        <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><span class="text-slate-400">Kỹ thuật viên:</span><span class="font-semibold text-blue-600">${t.technician || 'Chưa phân công'}</span></div>
                        <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><span class="text-slate-400">Ngày tạo:</span><span class="font-semibold">${t.createdAt}</span></div>
                        <div class="flex justify-between py-1"><span class="text-slate-400">Trạng thái:</span><span class="px-2 py-0.5 rounded-full font-bold bg-${stColor}-50 text-${stColor}-700 border border-${stColor}-200">${stLabel}</span></div>
                    </div>
                    <div class="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl bg-[#0B2A5B] text-white font-semibold text-xs">Đóng</button>
                    </div>
                </div>
            </div>
        `;
    }

    function openAssignTicketModalFromList() {
        // Assign to first pending ticket if any
        const pending = extState.tickets.find(t => t.status === 'PENDING');
        if (pending) openAssignTicketModal(pending.id);
        else KtxApp.showToast('Không có phiếu nào đang chờ phân công.', 'info');
    }

    function openCreateTicketModal() {
        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-blue-600">construction</span>
                            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Tạo Phiếu Báo Hỏng Thiết Bị</h3>
                        </div>
                        <button onclick="KtxExtendedViews.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxExtendedViews.submitCreateTicket();" class="space-y-3.5 pt-4 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">MSSV người báo hỏng *</label>
                            <input id="tkStudentId" required type="text" placeholder="Mã sinh viên có hợp đồng đang hiệu lực" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs focus:outline-none" />
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mô Tả Chi Tiết Sự Cố *</label>
                            <textarea id="tkDesc" required rows="3" placeholder="Mô tả hiện tượng hỏng hóc..." class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none"></textarea>
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">Gửi Phiếu Báo</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitCreateTicket() {
        const studentId = document.getElementById('tkStudentId').value;
        const desc = document.getElementById('tkDesc').value;

        try {
            const res = await fetch('/api/suachua', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, description: desc })
            });
            const json = await res.json();
            if (json.success) {
                KtxApp.showToast(json.message || 'Đã tạo phiếu sửa chữa thành công!');
                closeModal();
                await loadTickets();
                reRender();
            } else {
                KtxApp.showToast(json.message || 'Lỗi', 'error');
            }
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
    }

    async function openAssignTicketModal(id) {
        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;
        await loadStaff();
        const technicians = extState.staff.filter(member => member.status === 'active');

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="KtxExtendedViews.closeModal()">
                <div class="w-full max-w-sm bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3">Điều Phối Kỹ Thuật Viên</h3>
                    <div class="space-y-3 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Chọn kỹ thuật viên:</label>
                            <select id="assignTech" required class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none">
                                <option value="">Chọn nhân viên</option>
                                ${technicians.map(member => `<option value="${member.id}">${member.name} · ${member.position}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 pt-4">
                        <button onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-semibold text-xs">Hủy</button>
                        <button onclick="KtxExtendedViews.confirmAssignTicket('${id}')" class="px-4 py-2 rounded-xl bg-[#0B2A5B] text-white font-semibold text-xs">Xác nhận giao việc</button>
                    </div>
                </div>
            </div>
        `;
    }

    async function confirmAssignTicket(id) {
        const tech = document.getElementById('assignTech').value;
        try {
            const res = await fetch('/api/suachua/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: id, technician: tech })
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || 'Không thể điều phối phiếu.');
            KtxApp.showToast(json.message || 'Đã điều phối thành công!');
            closeModal();
            await loadTickets();
            reRender();
        } catch (e) {
            KtxApp.showToast(e.message || 'Lỗi kết nối máy chủ', 'error');
        }
    }

    async function completeTicket(id) {
        try {
            const res = await fetch(`/api/suachua/${id}/complete`, { method: 'POST' });
            const json = await res.json();
            KtxApp.showToast(json.message || 'Đã hoàn tất nghiệm thu sửa chữa!');
            await loadTickets();
            reRender();
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
    }

    // ========================================================
    // 5. VI PHẠM & KỶ LUẬT (Discipline View)
    // ========================================================
    async function loadViolations() {
        try {
            extState.violations = await fetchApiData('/api/vipham');
        } catch (error) {
            extState.violations = [];
            reportLoadFailure('danh sách vi phạm', error);
        }
    }

    function renderDisciplineView() {
        let filtered = extState.violations.filter(v => {
            const matchSearch = !extState.violationSearch ||
                v.code.toLowerCase().includes(extState.violationSearch.toLowerCase()) ||
                v.studentId.toLowerCase().includes(extState.violationSearch.toLowerCase()) ||
                v.studentName.toLowerCase().includes(extState.violationSearch.toLowerCase()) ||
                v.room.toLowerCase().includes(extState.violationSearch.toLowerCase());
            const matchStatus = extState.violationStatus === 'ALL' || v.status === extState.violationStatus;
            const matchPenalty = extState.violationPenaltyType === 'ALL' || v.penaltyType === extState.violationPenaltyType;
            return matchSearch && matchStatus && matchPenalty;
        });

        return `
            <div class="flex flex-col w-full space-y-6 animate-fade-in">
                <!-- Header Title & Action -->
                <div class="page-title-banner flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Vi Phạm & Kỷ Luật</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quản lý biên bản, hình thức xử lý và tình trạng kỷ luật</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5">
                        <button type="button" onclick="KtxExtendedViews.openCreateViolationModal()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs transition">
                            <span class="material-symbols-outlined text-[16px]">report_problem</span>
                            <span>Lập Biên Bản Vi Phạm</span>
                        </button>
                    </div>
                </div>

                <!-- KPI Strip -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${renderMetricCard({ label: 'Tổng biên bản học kỳ', value: extState.violations.length, unit: 'vụ', icon: 'gavel', tone: 'blue', footer: 'Biên bản đã ghi nhận' })}
                    ${renderMetricCard({ label: 'Nhắc nhở', value: extState.violations.filter(v => v.penaltyType === 'remind').length, unit: 'vụ', icon: 'notifications', tone: 'green', footer: 'Hình thức xử lý ghi nhận' })}
                    ${renderMetricCard({ label: 'Cảnh cáo', value: extState.violations.filter(v => v.penaltyType === 'warning').length, unit: 'vụ', icon: 'warning', tone: 'amber', footer: 'Hình thức xử lý ghi nhận' })}
                    ${renderMetricCard({ label: 'Buộc rời KTX', value: extState.violations.filter(v => v.penaltyType === 'expel').length, unit: 'vụ', icon: 'gavel', tone: 'red', footer: 'Hình thức xử lý ghi nhận' })}
                </div>

                <!-- Filter Bar -->
                <div class="page-filter-bar flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs">
                    <div class="page-filter-search flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                        <input type="text" placeholder="Tìm theo mã biên bản, sinh viên, MSSV hoặc phòng..." value="${extState.violationSearch}" oninput="KtxExtendedViews.filterViolationSearch(this.value)" class="w-full bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <select aria-label="Lọc theo trạng thái" onchange="KtxExtendedViews.filterViolationStatus(this.value)" class="h-10 w-56 shrink-0 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none">
                        <option value="ALL" ${extState.violationStatus === 'ALL' ? 'selected' : ''}>Trạng thái: Tất cả</option>
                        <option value="Đã ghi nhận" ${extState.violationStatus === 'Đã ghi nhận' ? 'selected' : ''}>Đã ghi nhận</option>
                    </select>
                    <select aria-label="Lọc theo hình thức xử lý" onchange="KtxExtendedViews.filterViolationPenaltyType(this.value)" class="h-10 w-56 shrink-0 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none">
                        <option value="ALL" ${extState.violationPenaltyType === 'ALL' ? 'selected' : ''}>Hình thức xử lý: Tất cả</option>
                        <option value="remind" ${extState.violationPenaltyType === 'remind' ? 'selected' : ''}>Nhắc nhở</option>
                        <option value="reprimand" ${extState.violationPenaltyType === 'reprimand' ? 'selected' : ''}>Khiển trách</option>
                        <option value="warning" ${extState.violationPenaltyType === 'warning' ? 'selected' : ''}>Cảnh cáo</option>
                        <option value="expel" ${extState.violationPenaltyType === 'expel' ? 'selected' : ''}>Buộc rời KTX</option>
                    </select>
                </div>

                <!-- Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th class="py-3 px-4">Mã Biên Bản</th>
                                    <th class="py-3 px-4">Sinh Viên / Phòng</th>
                                    <th class="py-3 px-4">Hành Vi Vi Phạm</th>
                                    <th class="py-3 px-4">Ngày Lập</th>
                                    <th class="py-3 px-4">Hình Thức Xử Lý</th>
                                    <th class="py-3 px-4">Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                ${filtered.map(v => {
                                    const pBadge = v.penaltyType === 'expel'
                                        ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">BUỘC RỜI KTX</span>'
                                        : (v.penaltyType === 'warning'
                                            ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">CẢNH CÁO</span>'
                                            : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">KHIỂN TRÁCH</span>');

                                    return `
                                        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                                            <td class="py-3 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">${v.code}</td>
                                            <td class="py-3 px-4">
                                                <div class="font-bold text-slate-800 dark:text-white">${v.studentName}</div>
                                                <div class="text-[11px] text-slate-400">${v.studentId} · ${v.room}</div>
                                            </td>
                                            <td class="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">${v.violation}</td>
                                            <td class="py-3 px-4 text-slate-500">${v.date}</td>
                                            <td class="py-3 px-4">${pBadge}</td>
                                            <td class="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">${v.status}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function filterViolationSearch(v) { extState.violationSearch = v; reRender(); }
    function filterViolationStatus(status) { extState.violationStatus = status; reRender(); }
    function filterViolationPenaltyType(penaltyType) { extState.violationPenaltyType = penaltyType; reRender(); }

    async function openCreateViolationModal() {
        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;
        try {
            extState.violationTypes = await fetchApiData('/api/vipham/types');
        } catch (error) {
            extState.violationTypes = [];
            reportLoadFailure('danh sách loại vi phạm', error);
        }

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-rose-600">gavel</span>
                            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Lập Biên Bản Vi Phạm Kỷ Luật</h3>
                        </div>
                        <button onclick="KtxExtendedViews.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxExtendedViews.submitCreateViolation();" class="space-y-3.5 pt-4 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">MSSV vi phạm *</label>
                            <input id="vpStudentId" required type="text" placeholder="Mã sinh viên trong dữ liệu" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs focus:outline-none" />
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Loại vi phạm *</label>
                            <select id="vpViolationTypeId" required ${extState.violationTypes.length ? '' : 'disabled'} class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none">
                                <option value="">Chọn loại vi phạm</option>
                                ${extState.violationTypes.map(type => `<option value="${type.id}">${type.name}</option>`).join('')}
                            </select>
                            ${extState.violationTypes.length ? '' : '<p class="mt-1 text-rose-600">Không có loại vi phạm khả dụng.</p>'}
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Hình Thức Xử Lý Đề Xuất</label>
                            <select id="vpPenalty" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none">
                                <option value="reprimand">Khiển trách</option>
                                <option value="remind">Nhắc nhở</option>
                                <option value="warning">Cảnh cáo</option>
                                <option value="expel">Buộc rời KTX</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ghi Chú Biên Bản</label>
                            <textarea id="vpNotes" rows="2" placeholder="Ghi nhận tang vật, lời khai sinh viên..." class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none"></textarea>
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold shadow-xs">Lập Biên Bản</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitCreateViolation() {
        const sId = document.getElementById('vpStudentId').value;
        const violationTypeId = document.getElementById('vpViolationTypeId').value;
        const penaltyType = document.getElementById('vpPenalty').value;
        const notes = document.getElementById('vpNotes').value;

        try {
            const res = await fetch('/api/vipham', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId: sId, violationTypeId, penaltyType, notes })
            });
            const json = await res.json();
            if (json.success) {
                KtxApp.showToast(json.message || 'Đã lập biên bản thành công!');
                closeModal();
                await loadViolations();
                reRender();
            } else {
                KtxApp.showToast(json.message || 'Lỗi', 'error');
            }
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
    }

    // ========================================================
    // 6. NHÂN VIÊN & TÀI KHOẢN (Staff View)
    // ========================================================
    async function loadStaff() {
        try {
            extState.staff = await fetchApiData('/api/nhanvien');
        } catch (error) {
            extState.staff = [];
            reportLoadFailure('danh sách nhân viên', error);
        }
    }

    function renderStaffView() {
        let filtered = extState.staff.filter(s => {
            const matchSearch = !extState.staffSearch ||
                s.name.toLowerCase().includes(extState.staffSearch.toLowerCase()) ||
                s.code.toLowerCase().includes(extState.staffSearch.toLowerCase()) ||
                s.email.toLowerCase().includes(extState.staffSearch.toLowerCase()) ||
                s.phone.includes(extState.staffSearch);
            const matchStatus = extState.staffStatus === 'ALL' || s.status === extState.staffStatus;
            const matchRole = extState.staffRole === 'ALL' || s.role === extState.staffRole;
            return matchSearch && matchStatus && matchRole;
        });

        return `
            <div class="flex flex-col w-full space-y-6 animate-fade-in">
                <!-- Header Title & Action -->
                <div class="page-title-banner flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Nhân Viên & Tài Khoản</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quản lý nhân sự, vai trò và quyền truy cập hệ thống</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5">
                        <button type="button" onclick="KtxExtendedViews.openAddStaffModal()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold shadow-xs transition">
                            <span class="material-symbols-outlined text-[16px]">person_add</span>
                            <span>Thêm Nhân Viên Mới</span>
                        </button>
                    </div>
                </div>

                <!-- KPI Strip -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${renderMetricCard({ label: 'Tổng nhân sự KTX', value: extState.staff.length, unit: 'cán bộ', icon: 'groups', tone: 'blue', footer: 'Nhân sự trong hệ thống' })}
                    ${renderMetricCard({ label: 'Đang hoạt động', value: extState.staff.filter(s => s.status === 'active').length, unit: 'tài khoản', icon: 'verified_user', tone: 'green', footer: 'Tài khoản đang sử dụng' })}
                    ${renderMetricCard({ label: 'Tạm khóa / Đình chỉ', value: extState.staff.filter(s => s.status === 'locked').length, unit: 'tài khoản', icon: 'lock', tone: 'red', footer: 'Tài khoản đang bị khóa' })}
                    ${renderMetricCard({
                        label: 'Phân quyền vai trò',
                        value: new Set(extState.staff.map(staff => staff.role).filter(Boolean)).size,
                        unit: 'vai trò',
                        icon: 'admin_panel_settings',
                        tone: 'amber',
                        footer: [...new Set(extState.staff.map(staff => staff.role).filter(Boolean))].join(' · ') || 'Chưa có dữ liệu vai trò'
                    })}
                </div>

                <!-- Filter Bar -->
                <div class="page-filter-bar flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs">
                    <div class="page-filter-search flex-1 min-w-0 max-w-3xl flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                        <input type="text" placeholder="Tìm theo tên cán bộ, mã nhân viên, SĐT hoặc email..." value="${extState.staffSearch}" oninput="KtxExtendedViews.filterStaffSearch(this.value)" class="w-full bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <select aria-label="Lọc theo trạng thái" onchange="KtxExtendedViews.filterStaffStatus(this.value)" class="h-10 w-48 shrink-0 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none">
                        <option value="ALL" ${extState.staffStatus === 'ALL' ? 'selected' : ''}>Trạng thái: Tất cả</option>
                        <option value="active" ${extState.staffStatus === 'active' ? 'selected' : ''}>Hoạt động</option>
                        <option value="locked" ${extState.staffStatus === 'locked' ? 'selected' : ''}>Đã khóa</option>
                    </select>
                    <select aria-label="Lọc theo vai trò" onchange="KtxExtendedViews.filterStaffRole(this.value)" class="h-10 w-48 shrink-0 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none">
                        <option value="ALL" ${extState.staffRole === 'ALL' ? 'selected' : ''}>Vai trò: Tất cả</option>
                        ${[...new Set(extState.staff.map(staff => staff.role).filter(Boolean))].map(role => `<option value="${role}" ${extState.staffRole === role ? 'selected' : ''}>${role}</option>`).join('')}
                    </select>
                </div>

                <!-- Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th class="py-3 px-4">Nhân Viên / Mã NV</th>
                                    <th class="py-3 px-4">Chức Vụ & Tổ Công Tác</th>
                                    <th class="py-3 px-4">Khu Vực Phụ Trách</th>
                                    <th class="py-3 px-4">Liên Hệ (SĐT / Email)</th>
                                    <th class="py-3 px-4">Vai Trò Hệ Thống</th>
                                    <th class="py-3 px-4">Trạng Thái</th>
                                    <th class="py-3 px-4 text-right">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                ${filtered.map(s => {
                                    const stBadge = s.status === 'active'
                                        ? '<span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>Hoạt động</span>'
                                        : '<span class="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">Đã khóa</span>';

                                    return `
                                        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                                            <td class="py-3 px-4">
                                                <div class="flex items-center gap-2.5">
                                                    <div class="w-8 h-8 rounded-full bg-[#0B2A5B] text-white flex items-center justify-center font-bold text-xs shrink-0">${s.avatarText}</div>
                                                    <div>
                                                        <div class="font-bold text-slate-900 dark:text-white">${s.name}</div>
                                                        <div class="text-[11px] font-mono text-slate-400">${s.code}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="py-3 px-4">
                                                <div class="font-semibold text-slate-800 dark:text-slate-200">${s.position}</div>
                                                <div class="text-[11px] text-slate-400">${s.department}</div>
                                            </td>
                                            <td class="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">${s.managedArea}</td>
                                            <td class="py-3 px-4">
                                                <div class="font-mono text-slate-800 dark:text-slate-200">${s.phone}</div>
                                                <div class="text-[11px] text-slate-400">${s.email}</div>
                                            </td>
                                            <td class="py-3 px-4">
                                                <span class="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-semibold text-[11px]">${s.role}</span>
                                            </td>
                                            <td class="py-3 px-4">${stBadge}</td>
                                            <td class="py-3 px-4 text-right">
                                                <button onclick="KtxExtendedViews.toggleStaffStatus('${s.id}')" class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px] hover:bg-slate-100 transition">
                                                    ${s.status === 'active' ? 'Khóa' : 'Mở khóa'}
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function filterStaffSearch(v) { extState.staffSearch = v; reRender(); }
    function filterStaffStatus(status) { extState.staffStatus = status; reRender(); }
    function filterStaffRole(role) { extState.staffRole = role; reRender(); }

    async function toggleStaffStatus(id) {
        try {
            const res = await fetch(`/api/nhanvien/${id}/toggle-status`, { method: 'POST' });
            const json = await res.json();
            KtxApp.showToast(json.message || 'Đã cập nhật trạng thái nhân viên!');
            await loadStaff();
            reRender();
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
    }

    function openAddStaffModal() {
        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-blue-600">person_add</span>
                            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Thêm Cán Bộ Nhân Viên Mới</h3>
                        </div>
                        <button onclick="KtxExtendedViews.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxExtendedViews.submitAddStaff();" class="space-y-3.5 pt-4 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Họ Và Tên *</label>
                            <input id="stName" required type="text" placeholder="VD: Nguyễn Văn A" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Chức Danh</label>
                                <input id="stPos" required type="text" placeholder="VD: Giám thị viên" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Số Điện Thoại</label>
                                <input id="stPhone" required type="text" placeholder="090..." class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Công Vụ</label>
                                <input id="stEmail" required type="email" placeholder="ten.nv@utc2.edu.vn" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Vai Trò Hệ Thống</label>
                            <select id="stRole" required class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none">
                                <option value="quanLy">Quản lý KTX</option>
                                <option value="keToan">Kế toán</option>
                                <option value="admin">Quản trị viên</option>
                            </select>
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">Lưu Nhân Viên</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitAddStaff() {
        const name = document.getElementById('stName').value;
        const pos = document.getElementById('stPos').value;
        const phone = document.getElementById('stPhone').value;
        const email = document.getElementById('stEmail').value;
        const role = document.getElementById('stRole').value;

        try {
            const res = await fetch('/api/nhanvien', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, position: pos, phone, email, role })
            });
            const json = await res.json();
            if (json.success) {
                KtxApp.showToast(json.message || 'Đã thêm nhân viên thành công!');
                closeModal();
                await loadStaff();
                reRender();
            } else {
                KtxApp.showToast(json.message || 'Lỗi', 'error');
            }
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
    }

    // ========================================================
    // 7. BÁO CÁO THỐNG KÊ (Reports View)
    // ========================================================
    async function loadReports() {
        try {
            extState.reports = await fetchApiData('/api/baocao/summary');
        } catch (error) {
            extState.reports = null;
            reportLoadFailure('báo cáo thống kê', error);
        }
    }

    function renderReportsView() {
        const r = extState.reports || {
            semester: '—',
            totalRooms: 0,
            totalBeds: 0,
            occupiedBeds: 0,
            vacantBeds: 0,
            occupancyRate: 0,
            totalRevenue: 0,
            buildingOperations: []
        };

        return `
            <div class="flex flex-col w-full space-y-6 animate-fade-in">
                <!-- Header Title & Action -->
                <div class="page-title-banner flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Báo Cáo Thống Kê</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tổng hợp số liệu lưu trú, công suất phòng và doanh thu</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5">
                        <button type="button" onclick="KtxExtendedViews.exportReportsCsv()" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121826] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-all">
                            <span class="material-symbols-outlined text-[16px]">table_view</span>
                            <span>Xuất Excel CSV</span>
                        </button>
                        <button type="button" onclick="window.print()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold shadow-xs transition">
                            <span class="material-symbols-outlined text-[16px]">print</span>
                            <span>In Báo Cáo PDF</span>
                        </button>
                    </div>
                </div>

                <!-- KPI Metric Cards -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${renderMetricCard({ label: 'Tổng chỗ ở quy hoạch', value: r.totalBeds.toLocaleString('vi-VN'), unit: 'giường', icon: 'bed', tone: 'blue', footer: `${r.totalRooms} phòng lưu trú` })}
                    ${renderMetricCard({ label: 'Sinh viên đang ở', value: r.occupiedBeds.toLocaleString('vi-VN'), unit: 'SV', icon: 'groups', tone: 'blue', footer: `Còn trống: ${r.vacantBeds} chỗ` })}
                    ${renderMetricCard({ label: 'Tỷ lệ lấp đầy bình quân', value: r.occupancyRate, unit: '%', icon: 'analytics', tone: 'green', footer: 'Mục tiêu: trên 90%' })}
                    ${renderMetricCard({ label: 'Doanh thu dự kiến kỳ', value: r.totalRevenue.toLocaleString('vi-VN'), unit: 'đ', icon: 'payments', tone: 'slate', footer: 'Tiền phòng + Tiện ích' })}
                </div>

                <!-- Building Operations Matrix Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Ma trận Vận hành & Công suất từng Tòa Nhà KTX UTC2</h3>
                        <span class="text-xs text-slate-400">${r.semester}</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th class="py-3 px-4">Tòa Nhà</th>
                                    <th class="py-3 px-4">Tổng Phòng</th>
                                    <th class="py-3 px-4">Tổng Giường</th>
                                    <th class="py-3 px-4">Đang Ở</th>
                                    <th class="py-3 px-4">Còn Trống</th>
                                    <th class="py-3 px-4">Tỷ Lệ Lấp Đầy</th>
                                    <th class="py-3 px-4">Doanh Thu Kỳ</th>
                                    <th class="py-3 px-4">Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                ${(r.buildingOperations || []).map(b => `
                                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                                        <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">${b.name}</td>
                                        <td class="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">${b.rooms} phòng</td>
                                        <td class="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">${b.beds} chỗ</td>
                                        <td class="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">${b.occupied}</td>
                                        <td class="py-3 px-4 font-semibold text-slate-500">${b.vacant}</td>
                                        <td class="py-3 px-4">
                                            <div class="flex items-center gap-2">
                                                <div class="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div class="h-full bg-emerald-500 rounded-full" style="width: ${b.rate}%"></div>
                                                </div>
                                                <span class="font-bold text-slate-800 dark:text-white text-[11px]">${b.rate}%</span>
                                            </div>
                                        </td>
                                        <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">${b.revenue}</td>
                                        <td class="py-3 px-4">
                                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${b.statusColor === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">${b.status}</span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function exportReportsCsv() {
        const r = extState.reports;
        if (!r) return;
        const rows = [['Tòa Nhà', 'Tổng Phòng', 'Tổng Giường', 'Đang Ở', 'Còn Trống', 'Tỷ Lệ', 'Doanh Thu', 'Trạng Thái']];
        (r.buildingOperations || []).forEach(b => rows.push([b.name, b.rooms, b.beds, b.occupied, b.vacant, b.rate + '%', b.revenue, b.status]));
        downloadCsv('bao_cao_tong_ket_KTX_UTC2.csv', rows);
        KtxApp.showToast('Đã xuất báo cáo thống kê ra Excel CSV!');
    }

    // Helper functions
    function reRender() {
        const content = document.getElementById('mainContent');
        if (!content) return;
        renderView(KtxApp.getCurrentTab ? KtxApp.getCurrentTab() : 'lop-khoa', content);
    }

    function closeModal() {
        const modalContainer = document.getElementById('modalsContainer');
        if (modalContainer) modalContainer.innerHTML = '';
    }

    function downloadCsv(filename, rows) {
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return {
        hasView,
        renderView,
        // Class methods
        filterClassesSearch,
        filterClassesFaculty,
        filterClassesCohort,
        exportClassesCsv,
        openAddClassModal,
        submitAddClass,
        viewClassDetail,
        // Utility methods
        filterUtilitySearch,
        filterUtilityBuilding,
        filterUtilityStatus,
        openUtilityRecordDrawer,
        submitRecordUtility,
        exportUtilitiesCsv,
        // Invoice methods
        filterInvoiceSearch,
        filterInvoiceCategory,
        filterInvoiceStatus,
        confirmPaymentPrompt,
        printInvoice,
        printInvoiceWindow,
        printInvoiceDirect,
        openCreateInvoiceModal,
        submitCreateInvoice,
        // Ticket methods
        setTicketTab,
        filterTicketSearch,
        filterTicketBuilding,
        filterTicketCategory,
        filterTicketPriority,
        resetTicketFilters,
        viewTicketDetail,
        openAssignTicketModalFromList,
        openCreateTicketModal,
        submitCreateTicket,
        openAssignTicketModal,
        confirmAssignTicket,
        completeTicket,
        // Violation methods
        filterViolationSearch,
        filterViolationStatus,
        filterViolationPenaltyType,
        openCreateViolationModal,
        submitCreateViolation,
        // Staff methods
        filterStaffSearch,
        filterStaffStatus,
        filterStaffRole,
        toggleStaffStatus,
        openAddStaffModal,
        submitAddStaff,
        // Report methods
        exportReportsCsv,
        closeModal
    };
})();
