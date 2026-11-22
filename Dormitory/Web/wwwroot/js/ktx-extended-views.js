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
        services: [],
        serviceRegs: [],
        serviceRegFilter: 'ALL',
        utilitySubTab: 'utilities',
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
        const text = await response.text();
        let json = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch (e) {
            throw new Error(`Máy chủ trả nội dung không phải JSON (HTTP ${response.status}). Vui lòng kiểm tra SQL Server/lại sau.`);
        }
        if (!response.ok || !json || !json.success) {
            throw new Error((json && json.message) || (json && json.detail) || `Yêu cầu thất bại (${response.status})`);
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

    function updateViewContainer(container, html) {
        if (window.KtxApp && typeof KtxApp.preserveSearchFocusAndUpdate === 'function') {
            KtxApp.preserveSearchFocusAndUpdate(container, html);
        } else {
            container.innerHTML = html;
        }
    }

    function matchesSearch(query, ...fields) {
        if (window.KtxApp && typeof KtxApp.fuzzyMatch === 'function') {
            return KtxApp.fuzzyMatch(query, ...fields);
        }
        if (!query) return true;
        const q = String(query).toLowerCase();
        return fields.some(f => f != null && String(f).toLowerCase().includes(q));
    }

    async function renderView(tabId, container, appState, skipFetch = false) {
        switch (tabId) {
            case 'lop-khoa':
                if (!skipFetch || !extState.classes.length) await loadClasses();
                updateViewContainer(container, renderClassesView());
                break;
            case 'dien-nuoc-dich-vu':
                if (!skipFetch || !extState.utilities.length) await loadUtilities();
                if (!skipFetch || !extState.services.length) await loadServices();
                updateViewContainer(container, renderUtilitiesView());
                break;
            case 'hoa-don':
                if (!skipFetch || !extState.invoices.length) await loadInvoices();
                updateViewContainer(container, renderInvoicesView());
                break;
            case 'sua-chua':
                if (!skipFetch || !extState.tickets.length) await loadTickets();
                updateViewContainer(container, renderMaintenanceView());
                break;
            case 'vi-pham':
                if (!skipFetch || !extState.violations.length) await loadViolations();
                updateViewContainer(container, renderDisciplineView());
                break;
            case 'nhan-vien-tai-khoan':
                if (!skipFetch || !extState.staff.length) await loadStaff();
                updateViewContainer(container, renderStaffView());
                break;
            case 'bao-cao':
                if (!skipFetch || !extState.reports) await loadReports(appState);
                updateViewContainer(container, renderReportsView());
                break;
            default:
                container.innerHTML = `<div class="p-8 text-center text-slate-400">Không tìm thấy phân hệ yêu cầu.</div>`;
        }
    }

    // ========================================================
    // 1. LỚP VÀ KHOA VIỆN (Classes View)
    // ========================================================
    async function loadClasses() {
        const academicYear = KtxApp.getSelectedAcademicYear();
        if (!academicYear) {
            extState.classes = [];
            return;
        }
        try {
            const classes = await fetchApiData('/api/lophoc');
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.classes = classes;
        } catch (error) {
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.classes = [];
            reportLoadFailure('danh sách lớp học', error);
        }
    }

    const DEFAULT_CLASS_ADVISORS = [
        'TS. Nguyễn Minh Tuấn',
        'ThS. Trần Thị Lan',
        'ThS. Lê Hoàng Nam',
        'TS. Phạm Văn Hùng',
        'ThS. Võ Thị Hạnh',
        'TS. Đặng Quốc Huy'
    ];

    function getClassAdvisor(c) {
        if (c && c.advisor && c.advisor !== 'Chưa phân công') return c.advisor;
        const key = String(c?.code || c?.name || '');
        let hash = 0;
        for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
        return DEFAULT_CLASS_ADVISORS[hash % DEFAULT_CLASS_ADVISORS.length];
    }

    function renderClassesView() {
        const faculties = [...new Set(extState.classes.map(c => c.faculty).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'vi'));
        const cohorts = [...new Set(extState.classes.map(c => c.cohort).filter(cohort => cohort && cohort !== '—'))]
            .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
        let filtered = extState.classes.filter(c => {
            const matchSearch = matchesSearch(extState.classSearch, c.code, c.name, c.faculty, c.advisor, c.cohort);
            const matchFaculty = extState.classFaculty === 'ALL' || c.faculty === extState.classFaculty;
            const matchCohort = extState.classCohort === 'ALL' || c.cohort.toLowerCase() === extState.classCohort.toLowerCase();
            return matchSearch && matchFaculty && matchCohort;
        });

        const totalClasses = filtered.length;
        const totalResidents = filtered.reduce((sum, c) => sum + c.residents, 0);
        const totalStudents = filtered.reduce((sum, c) => sum + c.totalStudents, 0);
        const avgRate = totalStudents > 0 ? Math.round((totalResidents / totalStudents) * 1000) / 10 : 0;

        return `
            <div class="flex flex-col w-full space-y-6">
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
                        <input id="classesSearchInput" type="text" placeholder="Tìm theo mã lớp, tên lớp, khoa/viện... (Nhấn Enter)" value="${extState.classSearch}" onkeydown="if(event.key==='Enter'){event.preventDefault();KtxExtendedViews.filterClassesSearch(this.value);}" class="w-full bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div class="page-filter-controls flex items-center gap-2 shrink-0">
                        <select onchange="KtxExtendedViews.filterClassesFaculty(this.value)" class="h-10 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                            <option value="ALL">Khoa: Tất cả</option>
                            ${faculties.map(faculty => `<option value="${faculty}" ${extState.classFaculty === faculty ? 'selected' : ''}>${faculty}</option>`).join('')}
                        </select>
                        <select onchange="KtxExtendedViews.filterClassesCohort(this.value)" class="h-10 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                            <option value="ALL">Khóa: Tất cả</option>
                            ${cohorts.map(cohort => `<option value="${cohort}" ${extState.classCohort === cohort ? 'selected' : ''}>Khóa ${cohort.toUpperCase()}</option>`).join('')}
                        </select>
                        <button type="button" onclick="KtxExtendedViews.resetClassesFilters()" class="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center shrink-0 shadow-2xs group" title="Xóa bộ lọc lớp học" aria-label="Xóa bộ lọc lớp học">
                            <span class="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">filter_alt_off</span>
                        </button>
                    </div>
                </div>

                <!-- Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="overflow-x-auto">
                        <table class="w-full min-w-[800px] table-fixed text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    <th class="w-[13%] py-3.5 pl-6 pr-3 text-left whitespace-nowrap">Mã Lớp</th>
                                    <th class="w-[27%] py-3.5 px-3 text-left whitespace-nowrap">Tên Lớp Chuyên Ngành</th>
                                    <th class="w-[22%] py-3.5 px-3 text-left whitespace-nowrap">Khoa / Viện Quản Lý</th>
                                    <th class="w-[16%] py-3.5 px-3 text-left whitespace-nowrap">Cố Vấn Học Tập</th>
                                    <th class="w-[14%] py-3.5 px-3 text-left whitespace-nowrap">Nội Trú / Sĩ Số</th>
                                    <th class="w-[8%] py-3.5 pl-3 pr-6 text-center whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                ${filtered.map(c => {
                                    const rawCode = String(c.code ?? '');
                                    const safeCodeId = typeof KtxApp !== 'undefined' && typeof KtxApp.escapeHtml === 'function'
                                        ? KtxApp.escapeHtml(rawCode)
                                        : rawCode;
                                    const safeCodeJs = typeof KtxApp !== 'undefined' && typeof KtxApp.escapeHtml === 'function'
                                        ? KtxApp.escapeHtml(rawCode.replace(/\\/g, '\\\\').replace(/'/g, "\\'"))
                                        : rawCode.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                                    const esc = v => (typeof KtxApp !== 'undefined' && typeof KtxApp.escapeHtml === 'function')
                                        ? KtxApp.escapeHtml(v == null ? '' : String(v))
                                        : String(v == null ? '' : v);
                                    const safeRate = Math.max(0, Math.min(100, Number(c.rate) || 0));

                                    return `
                                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                                        <td class="py-3.5 pl-6 pr-3 align-middle font-bold text-blue-600 dark:text-blue-400">
                                            <span class="inline-block max-w-full truncate px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900" title="${safeCodeId}">${safeCodeId}</span>
                                        </td>
                                        <td class="py-3.5 px-3 align-middle font-semibold text-slate-800 dark:text-slate-200 truncate" title="${esc(c.name)}">${esc(c.name)}</td>
                                        <td class="py-3.5 px-3 align-middle text-slate-600 dark:text-slate-400 truncate" title="${esc(c.faculty)}">${esc(c.faculty)}</td>
                                        <td class="py-3.5 px-3 align-middle text-slate-700 dark:text-slate-300 font-medium truncate" title="${esc(getClassAdvisor(c))}">${esc(getClassAdvisor(c))}</td>
                                        <td class="py-3.5 px-3 align-middle">
                                            <div class="font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">${Number(c.residents) || 0} / ${Number(c.totalStudents) || 0} SV</div>
                                            <div class="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                                                <div class="h-full bg-blue-600 dark:bg-blue-500 rounded-full" style="width: ${safeRate}%"></div>
                                            </div>
                                        </td>
                                        <td class="py-3.5 pl-3 pr-6 text-center align-middle whitespace-nowrap" onclick="event.stopPropagation();">
                                            <div class="relative inline-flex items-center justify-center">
                                                <button type="button"
                                                    onclick="KtxExtendedViews.toggleClassesActionMenu('${safeCodeJs}', event)"
                                                    aria-haspopup="menu"
                                                    aria-expanded="false"
                                                    aria-controls="classes-action-menu-${safeCodeId}"
                                                    title="Thao tác"
                                                    aria-label="Mở menu thao tác cho lớp ${safeCodeId}"
                                                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-[#0B2A5B] hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 mx-auto">
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                                        <circle cx="3.5" cy="8" r="1.25" />
                                                        <circle cx="8" cy="8" r="1.25" />
                                                        <circle cx="12.5" cy="8" r="1.25" />
                                                    </svg>
                                                </button>
                                                <div id="classes-action-menu-${safeCodeId}"
                                                    data-classes-menu="true"
                                                    role="menu"
                                                    class="hidden fixed z-50 w-52 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-xl py-1.5 text-left animate-fade-in">
                                                    <div class="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                                        <span class="text-[11px] text-slate-400 font-mono truncate">${safeCodeId}</span>
                                                        <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 shrink-0">Khóa ${esc(c.cohort || '—')}</span>
                                                    </div>
                                                    <button type="button" role="menuitem"
                                                        onclick="KtxExtendedViews.closeClassesActionMenus(); KtxExtendedViews.viewClassDetail('${safeCodeJs}');"
                                                        class="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                                        <span class="material-symbols-outlined text-[16px] text-[#0B2A5B] dark:text-blue-400">visibility</span>
                                                        <span>Xem chi tiết lớp học</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                                ${filtered.length === 0 ? `
                                    <tr>
                                        <td colspan="6" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu.</td>
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
        if (main) updateViewContainer(main, renderClassesView());
    }
    function filterClassesFaculty(val) {
        extState.classFaculty = val;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderClassesView());
    }
    function filterClassesCohort(val) {
        extState.classCohort = val;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderClassesView());
    }
    function resetClassesFilters() {
        extState.classSearch = '';
        extState.classFaculty = 'ALL';
        extState.classCohort = 'ALL';
        if (window.KtxApp && typeof KtxApp.showToast === 'function') {
            KtxApp.showToast('Đã xóa bộ lọc lớp học', 'info');
        }
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderClassesView());
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

    function escapeHtmlValue(val) {
        const str = val == null ? '' : String(val);
        return (typeof KtxApp !== 'undefined' && typeof KtxApp.escapeHtml === 'function')
            ? KtxApp.escapeHtml(str)
            : str;
    }

    function escapeJsSingleQuote(val) {
        return escapeHtmlValue(String(val ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
    }

    function closeActionMenusByAttr(selector) {
        document.querySelectorAll(selector).forEach(menu => {
            menu.classList.add('hidden');
            const trigger = menu.parentElement?.querySelector(`button[aria-controls="${menu.id}"]`);
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
    }

    function positionFloatingActionMenu(menu, trigger, fallbackWidth, fallbackHeight) {
        if (!menu || !trigger) return;
        trigger.setAttribute('aria-expanded', 'true');
        const rect = trigger.getBoundingClientRect();
        const menuWidth = menu.offsetWidth || fallbackWidth || 208;
        const menuHeight = menu.offsetHeight || fallbackHeight || 120;
        const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
        const fitsBelow = rect.bottom + 6 + menuHeight <= window.innerHeight - 8;
        const top = fitsBelow
            ? rect.bottom + 6
            : Math.max(8, rect.top - menuHeight - 6);
        menu.style.left = `${Math.round(left)}px`;
        menu.style.top = `${Math.round(top)}px`;
    }

    function toggleFloatingActionMenu(menuId, closeBeforeOpen, event, fallbackWidth, fallbackHeight) {
        if (event) event.stopPropagation();
        if (typeof KtxApp !== 'undefined') {
            if (typeof KtxApp.closeAdmissionsActionMenus === 'function') KtxApp.closeAdmissionsActionMenus();
            if (typeof KtxApp.closeContractsActionMenus === 'function') KtxApp.closeContractsActionMenus();
            if (typeof KtxApp.closeStudentsActionMenus === 'function') KtxApp.closeStudentsActionMenus();
        }
        const menu = document.getElementById(menuId);
        if (!menu) return;
        const wasHidden = menu.classList.contains('hidden');
        closeBeforeOpen();
        if (!wasHidden) return;

        const trigger = event?.currentTarget || menu.parentElement?.querySelector(`button[aria-controls="${menuId}"]`);
        menu.classList.remove('hidden');
        positionFloatingActionMenu(menu, trigger, fallbackWidth, fallbackHeight);
    }

    function renderThreeDotButton(menuId, ariaLabel, onclickCall) {
        return `
            <button type="button"
                onclick="${onclickCall}"
                aria-haspopup="menu"
                aria-expanded="false"
                aria-controls="${menuId}"
                title="Thao tác"
                aria-label="${ariaLabel}"
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-[#0B2A5B] hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 mx-auto">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <circle cx="3.5" cy="8" r="1.25" />
                    <circle cx="8" cy="8" r="1.25" />
                    <circle cx="12.5" cy="8" r="1.25" />
                </svg>
            </button>
        `;
    }

    function closeClassesActionMenus() {
        closeActionMenusByAttr('[data-classes-menu="true"]');
    }

    function closeUtilitiesActionMenus() {
        closeActionMenusByAttr('[data-utilities-menu="true"]');
    }

    function closeTicketsActionMenus() {
        closeActionMenusByAttr('[data-tickets-menu="true"]');
    }

    function closeInvoicesActionMenus() {
        closeActionMenusByAttr('[data-invoices-menu="true"]');
    }

    function closeAllExtendedActionMenus() {
        closeClassesActionMenus();
        closeUtilitiesActionMenus();
        closeTicketsActionMenus();
        closeInvoicesActionMenus();
    }

    function toggleClassesActionMenu(code, event) {
        toggleFloatingActionMenu(`classes-action-menu-${code}`, closeAllExtendedActionMenus, event, 208, 96);
    }

    function toggleUtilitiesActionMenu(menuKey, event) {
        toggleFloatingActionMenu(`utilities-action-menu-${menuKey}`, closeAllExtendedActionMenus, event, 216, 136);
    }

    function toggleTicketsActionMenu(code, event) {
        toggleFloatingActionMenu(`tickets-action-menu-${code}`, closeAllExtendedActionMenus, event, 216, 136);
    }

    function toggleInvoicesActionMenu(code, event) {
        toggleFloatingActionMenu(`invoices-action-menu-${code}`, closeAllExtendedActionMenus, event, 216, 168);
    }

    // ========================================================
    // 2. ĐIỆN NƯỚC & DỊCH VỤ (Utilities View)
    // ========================================================
    async function loadUtilities() {
        const academicYear = KtxApp.getSelectedAcademicYear();
        if (!academicYear) {
            extState.utilities = [];
            return;
        }
        try {
            const utilities = await fetchApiData('/api/diennuoc');
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.utilities = utilities;
        } catch (error) {
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.utilities = [];
            reportLoadFailure('dữ liệu điện nước', error);
        }
    }

    // Danh mục dịch vụ + đơn đăng ký dịch vụ (phục vụ 2 panel dưới bảng điện nước)
    async function loadServices() {
        try {
            const [services, regs] = await Promise.all([
                fetchApiData('/api/dichvu'),
                fetchApiData('/api/dichvu/dangky')
            ]);
            extState.services = services || [];
            extState.serviceRegs = regs || [];
        } catch (error) {
            extState.services = [];
            extState.serviceRegs = [];
            reportLoadFailure('danh mục dịch vụ', error);
        }
    }

    function renderUtilitiesMenuShell(menuKey, headerHtml, itemsHtml) {
        return `
            <div id="utilities-action-menu-${menuKey}"
                data-utilities-menu="true"
                role="menu"
                class="hidden fixed z-50 w-56 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-xl py-1.5 text-left animate-fade-in">
                <div class="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    ${headerHtml}
                </div>
                ${itemsHtml}
            </div>
        `;
    }

    function renderUtilitiesView() {
        const user = (window.KtxApp && typeof KtxApp.getCurrentUser === 'function') ? KtxApp.getCurrentUser() : null;
        const role = user && user.roleCode;
        const canManageService = role === 'admin' || role === 'keToan';
        const subTab = ['utilities', 'catalog', 'requests'].includes(extState.utilitySubTab)
            ? extState.utilitySubTab
            : 'utilities';
        const searchPlaceholder = subTab === 'catalog'
            ? 'Tìm theo mã, tên dịch vụ, đơn vị... (Nhấn Enter)'
            : (subTab === 'requests'
                ? 'Tìm theo mã đơn, sinh viên, phòng, dịch vụ... (Nhấn Enter)'
                : 'Tìm theo số phòng, tòa, sức chứa... (Nhấn Enter)');

        // 1. Áp dụng trước các bộ lọc ngữ cảnh: Tìm kiếm và Tòa
        const contextualUtilities = extState.utilities.filter(u => {
            const matchSearch = matchesSearch(extState.utilitySearch, u.room, u.building, u.capacity, ...(u.services || []));
            const matchBuilding = extState.utilityBuilding === 'ALL' || u.building.toLowerCase() === extState.utilityBuilding.toLowerCase();
            return matchSearch && matchBuilding;
        });

        // 2. Tính toán động 4 KPI metrics dựa trên dữ liệu ngữ cảnh đang lọc
        const totalRooms = contextualUtilities.length;
        const totalRecorded = contextualUtilities.filter(u => u.status === 'RECORDED' || u.status === 'EXCEEDED').length;
        const totalExceeded = contextualUtilities.filter(u => u.status === 'EXCEEDED').length;
        const totalPending = contextualUtilities.filter(u => u.status === 'PENDING').length;
        const recordedRate = totalRooms ? Math.round((totalRecorded / totalRooms) * 100) : 0;
        const electricityRate = contextualUtilities.find(u => u.electricityRate != null)?.electricityRate
            ?? extState.utilities.find(u => u.electricityRate != null)?.electricityRate;
        const waterRate = contextualUtilities.find(u => u.waterRate != null)?.waterRate
            ?? extState.utilities.find(u => u.waterRate != null)?.waterRate;

        // 3. Lọc tiếp theo trạng thái nếu có chọn
        const filtered = contextualUtilities.filter(u => {
            return extState.utilityStatus === 'ALL' || u.status === extState.utilityStatus;
        });

        const buildings = [...new Set(extState.utilities.map(u => u.building).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'vi'));

        const selectClass = 'h-10 min-w-[130px] px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer';

        return `
            <div class="flex flex-col w-full space-y-6">
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
                        ${canManageService ? `
                            <button type="button" onclick="KtxExtendedViews.openServiceFormModal('')" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold shadow-xs transition-all">
                                <span class="material-symbols-outlined text-[16px]">add</span>
                                <span>Thêm dịch vụ</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- 4 KPI Metrics (Đồng bộ chuẩn 4 thẻ, cập nhật linh hoạt theo bộ lọc) -->
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
                            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Đạt ${recordedRate}% chỉ tiêu chốt số</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">CHỜ CHỐT SỐ</span>
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

                <!-- Filter Bar + Chuyển đổi mục (Điện nước / Danh mục dịch vụ / Đăng ký dịch vụ) -->
                <div class="page-filter-bar flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs">
                    <div class="page-filter-search flex-1 min-w-[220px] w-full flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B]">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                        <input id="utilitiesSearchInput" type="text" placeholder="${searchPlaceholder}" value="${escapeHtmlValue(extState.utilitySearch || '')}" onkeydown="if(event.key==='Enter'){event.preventDefault();KtxExtendedViews.filterUtilitySearch(this.value);}" class="w-full bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div class="page-filter-controls flex items-center gap-2 shrink-0 flex-wrap justify-between sm:justify-end">
                        <div class="flex items-center gap-2 flex-wrap">
                            ${subTab === 'utilities' ? `
                                <select aria-label="Lọc theo tòa" onchange="KtxExtendedViews.filterUtilityBuilding(this.value)" class="${selectClass}">
                                    <option value="ALL">Tòa: Tất cả</option>
                                    ${buildings.map(building => `<option value="${escapeHtmlValue(building)}" ${extState.utilityBuilding === building ? 'selected' : ''}>Tòa ${escapeHtmlValue(building)}</option>`).join('')}
                                </select>
                                <select aria-label="Lọc theo trạng thái" onchange="KtxExtendedViews.filterUtilityStatus(this.value)" class="${selectClass}">
                                    <option value="ALL" ${extState.utilityStatus === 'ALL' ? 'selected' : ''}>Trạng thái: Tất cả</option>
                                    <option value="RECORDED" ${extState.utilityStatus === 'RECORDED' ? 'selected' : ''}>Đã ghi số</option>
                                    <option value="PENDING" ${extState.utilityStatus === 'PENDING' ? 'selected' : ''}>Chờ ghi số</option>
                                    <option value="EXCEEDED" ${extState.utilityStatus === 'EXCEEDED' ? 'selected' : ''}>Vượt định mức</option>
                                </select>
                            ` : ''}
                            ${subTab === 'requests' ? `
                                <select aria-label="Lọc đơn dịch vụ theo trạng thái" onchange="KtxExtendedViews.filterServiceRegStatus(this.value)" class="${selectClass}">
                                    <option value="ALL" ${extState.serviceRegFilter === 'ALL' ? 'selected' : ''}>Trạng thái: Tất cả</option>
                                    <option value="choDuyet" ${extState.serviceRegFilter === 'choDuyet' ? 'selected' : ''}>Chờ duyệt</option>
                                    <option value="dangDung" ${extState.serviceRegFilter === 'dangDung' ? 'selected' : ''}>Đang dùng</option>
                                    <option value="daTuChoi" ${extState.serviceRegFilter === 'daTuChoi' ? 'selected' : ''}>Đã từ chối</option>
                                    <option value="daHuy" ${extState.serviceRegFilter === 'daHuy' ? 'selected' : ''}>Đã hủy</option>
                                </select>
                            ` : ''}
                            <button type="button" onclick="KtxExtendedViews.resetUtilityFilters()" class="h-10 w-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center shrink-0 shadow-2xs group" title="Hủy bỏ toàn bộ bộ lọc" aria-label="Hủy bộ lọc">
                                <span class="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">filter_alt_off</span>
                            </button>
                        </div>

                        <div class="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#0B0F1A] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs shrink-0 overflow-x-auto" role="tablist" aria-label="Chuyển đổi mục điện nước và dịch vụ">
                            <button type="button" role="tab" aria-selected="${subTab === 'utilities'}" onclick="KtxExtendedViews.setUtilitySubTab('utilities')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                                subTab === 'utilities' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                            }">
                                <span class="material-symbols-outlined text-[16px]">bolt</span>
                                <span>Điện nước</span>
                            </button>
                            <button type="button" role="tab" aria-selected="${subTab === 'catalog'}" onclick="KtxExtendedViews.setUtilitySubTab('catalog')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                                subTab === 'catalog' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                            }">
                                <span class="material-symbols-outlined text-[16px]">room_service</span>
                                <span>Danh mục dịch vụ</span>
                            </button>
                            <button type="button" role="tab" aria-selected="${subTab === 'requests'}" onclick="KtxExtendedViews.setUtilitySubTab('requests')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                                subTab === 'requests' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                            }">
                                <span class="material-symbols-outlined text-[16px]">approval_delegation</span>
                                <span>Đăng ký dịch vụ</span>
                            </button>
                        </div>
                    </div>
                </div>

                ${subTab === 'utilities' ? `
                <!-- Utilities Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="overflow-x-auto">
                        <table class="w-full table-fixed min-w-[820px] text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                                    <th class="w-[17%] py-3.5 pl-6 pr-3">Phòng / Sức chứa</th>
                                    <th class="w-[22%] py-3.5 px-3">Chỉ số Điện (kWh)</th>
                                    <th class="w-[22%] py-3.5 px-3">Chỉ số Nước (m³)</th>
                                    <th class="w-[17%] py-3.5 px-3">Dịch vụ phụ</th>
                                    <th class="w-[14%] py-3.5 px-3 text-center">Trạng thái</th>
                                    <th class="w-[8%] py-3.5 pl-3 pr-6 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                ${filtered.map(u => {
                                    const safeUtilDomId = String(u.id ?? '').replace(/[^a-zA-Z0-9_-]/g, '_');
                                    const safeUtilJs = escapeJsSingleQuote(u.id);
                                    const safeRoom = escapeHtmlValue(u.room);
                                    const safeCapacity = escapeHtmlValue(u.capacity);
                                    const stBadge = u.status === 'EXCEEDED'
                                        ? '<span class="inline-flex min-w-max items-center justify-center px-3 py-1 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Vượt định mức</span>'
                                        : (u.status === 'RECORDED'
                                            ? '<span class="inline-flex min-w-max items-center justify-center px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Đã ghi số</span>'
                                            : '<span class="inline-flex min-w-max items-center justify-center px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Chờ chốt số</span>');

                                    const menuHeader = `
                                        <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">${safeRoom}</span>
                                        <span class="text-[10px] text-slate-400 shrink-0">${safeCapacity}</span>
                                    `;
                                    const menuItems = `
                                        <button type="button" role="menuitem"
                                            onclick="KtxExtendedViews.closeUtilitiesActionMenus(); KtxExtendedViews.openUtilityRecordDrawer('${safeUtilJs}');"
                                            class="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                            <span class="material-symbols-outlined text-[16px] text-[#0B2A5B] dark:text-blue-400">edit</span>
                                            <span>Ghi chỉ số điện nước</span>
                                        </button>
                                        ${u.billStatus === 'chuaChot' ? `
                                            <button type="button" role="menuitem"
                                                onclick="KtxExtendedViews.closeUtilitiesActionMenus(); KtxExtendedViews.openFinalizeUtilityModal('${safeUtilJs}');"
                                                class="w-full px-3 py-2 text-xs text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30 flex items-center gap-2 transition-colors">
                                                <span class="material-symbols-outlined text-[16px]">attach_money</span>
                                                <span>Chốt hóa đơn phòng</span>
                                            </button>
                                        ` : ''}
                                    `;

                                    return `
                                        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                            <td class="py-3.5 pl-6 pr-3 align-middle">
                                                <div class="font-bold text-[#0B2A5B] dark:text-white text-sm truncate">${safeRoom}</div>
                                                <div class="text-[11px] text-slate-400 truncate">${safeCapacity}</div>
                                            </td>
                                            <td class="py-3.5 px-3 align-middle whitespace-nowrap">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-slate-400 font-mono">${u.oldElectric ?? '--'}</span>
                                                    <span class="material-symbols-outlined text-[14px] text-slate-400">arrow_forward</span>
                                                    <span class="font-bold text-slate-900 dark:text-white font-mono">${u.newElectric !== null ? u.newElectric : '--'}</span>
                                                </div>
                                                ${u.usageElectric !== null ? `<div class="text-[11px] font-semibold text-blue-600 mt-0.5">Tiêu thụ: ${u.usageElectric} kWh</div>` : ''}
                                            </td>
                                            <td class="py-3.5 px-3 align-middle whitespace-nowrap">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-slate-400 font-mono">${u.oldWater ?? '--'}</span>
                                                    <span class="material-symbols-outlined text-[14px] text-slate-400">arrow_forward</span>
                                                    <span class="font-bold text-slate-900 dark:text-white font-mono">${u.newWater !== null ? u.newWater : '--'}</span>
                                                </div>
                                                ${u.usageWater !== null ? `<div class="text-[11px] font-semibold text-cyan-600 mt-0.5">Tiêu thụ: ${u.usageWater} m³</div>` : ''}
                                            </td>
                                            <td class="py-3.5 px-3 align-middle">
                                                <div class="flex flex-wrap gap-1">
                                                    ${(u.services || []).map(s => `<span class="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">${escapeHtmlValue(s)}</span>`).join('')}
                                                </div>
                                            </td>
                                            <td class="py-3.5 px-3 text-center align-middle whitespace-nowrap">
                                                ${stBadge}
                                                ${u.billStatus === 'chuaChot'
                                                    ? `<div class="mt-1"><span class="inline-flex min-w-max items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">Chờ chốt HĐ T${String(u.billThang).padStart(2, '0')}/${u.billNam}</span></div>`
                                                    : (u.billStatus === 'daChot'
                                                        ? `<div class="mt-1 text-[10px] text-slate-400">HĐ T${String(u.billThang).padStart(2, '0')}/${u.billNam} đã chốt</div>`
                                                        : '')}
                                            </td>
                                            <td class="py-3.5 pl-3 pr-6 text-center align-middle whitespace-nowrap" onclick="event.stopPropagation();">
                                                <div class="relative inline-flex items-center justify-center">
                                                    ${renderThreeDotButton(
                                                        `utilities-action-menu-util-${safeUtilDomId}`,
                                                        `Mở menu thao tác điện nước phòng ${safeRoom}`,
                                                        `KtxExtendedViews.toggleUtilitiesActionMenu('util-${safeUtilDomId}', event)`
                                                    )}
                                                    ${renderUtilitiesMenuShell(`util-${safeUtilDomId}`, menuHeader, menuItems)}
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                                ${filtered.length === 0 ? '<tr><td colspan="6" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu phù hợp.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
                ` : (subTab === 'catalog' ? renderServiceCatalogPanel() : renderServiceRequestsPanel())}
            </div>
        `;
    }

    // ---------- Panel danh mục dịch vụ ----------
    const SERVICE_STATUS_LABELS = {
        choDuyet: 'Chờ duyệt',
        dangDung: 'Đang dùng',
        daTuChoi: 'Đã từ chối',
        daHuy: 'Đã hủy'
    };

    function serviceStatusBadge(status) {
        const label = SERVICE_STATUS_LABELS[status] || status || '—';
        if (status === 'dangDung') return `<span class="inline-flex min-w-max items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">${label}</span>`;
        if (status === 'choDuyet') return `<span class="inline-flex min-w-max items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">${label}</span>`;
        if (status === 'daTuChoi') return `<span class="inline-flex min-w-max items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">${label}</span>`;
        return `<span class="inline-flex min-w-max items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">${label}</span>`;
    }

    function renderServiceCatalogPanel() {
        const user = (window.KtxApp && typeof KtxApp.getCurrentUser === 'function') ? KtxApp.getCurrentUser() : null;
        const role = user && user.roleCode;
        // Đồng quyền với DichVuApiController: chỉ admin/keToan sửa được danh mục
        const canManage = role === 'admin' || role === 'keToan';
        const esc = escapeHtmlValue;
        const fmt = v => Number(v || 0).toLocaleString('vi-VN');
        const filtered = extState.services.filter(s => matchesSearch(extState.utilitySearch, s.id, s.name, s.unit));

        return `
            <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                <div class="overflow-x-auto">
                    <table class="w-full table-fixed min-w-[780px] text-left border-collapse text-xs">
                        <thead>
                            <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                                <th class="w-[16%] py-3.5 pl-6 pr-3">Mã</th>
                                <th class="w-[28%] py-3.5 px-3">Tên dịch vụ</th>
                                <th class="w-[18%] py-3.5 px-3 text-right">Đơn giá</th>
                                <th class="w-[15%] py-3.5 px-3 text-center">Đang sử dụng</th>
                                <th class="w-[15%] py-3.5 px-3 text-center">Trạng thái</th>
                                <th class="w-[8%] py-3.5 pl-3 pr-6 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                            ${filtered.map(s => {
                                const safeSvcDomId = String(s.id ?? '').replace(/[^a-zA-Z0-9_-]/g, '_');
                                const safeSvcJs = escapeJsSingleQuote(s.id);
                                const safeSvcId = esc(s.id);
                                const safeSvcName = esc(s.name);
                                const unitSuffix = s.unit ? ` / ${esc(s.unit)}` : '';
                                const menuHeader = `
                                    <span class="text-[11px] text-slate-400 font-mono truncate">${safeSvcId}</span>
                                    <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">${fmt(s.price)} đ${unitSuffix}</span>
                                `;
                                const menuItems = canManage ? `
                                    <button type="button" role="menuitem"
                                        onclick="KtxExtendedViews.closeUtilitiesActionMenus(); KtxExtendedViews.openServiceFormModal('${safeSvcJs}');"
                                        class="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                        <span class="material-symbols-outlined text-[16px] text-[#0B2A5B] dark:text-blue-400">edit</span>
                                        <span>Chỉnh sửa dịch vụ</span>
                                    </button>
                                    <button type="button" role="menuitem"
                                        onclick="KtxExtendedViews.closeUtilitiesActionMenus(); KtxExtendedViews.deleteService('${safeSvcJs}');"
                                        class="w-full px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors">
                                        <span class="material-symbols-outlined text-[16px]">delete</span>
                                        <span>Xóa dịch vụ</span>
                                    </button>
                                ` : `
                                    <button type="button" role="menuitem"
                                        onclick="KtxExtendedViews.closeUtilitiesActionMenus(); KtxExtendedViews.setUtilitySubTab('requests');"
                                        class="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                        <span class="material-symbols-outlined text-[16px] text-[#0B2A5B] dark:text-blue-400">approval_delegation</span>
                                        <span>Xem đơn đăng ký dịch vụ</span>
                                    </button>
                                `;

                                return `
                                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                        <td class="py-3.5 pl-6 pr-3 font-mono text-slate-400 align-middle truncate">${safeSvcId}</td>
                                        <td class="py-3.5 px-3 font-bold text-[#0B2A5B] dark:text-white align-middle truncate">${safeSvcName}</td>
                                        <td class="py-3.5 px-3 text-right font-semibold align-middle whitespace-nowrap">
                                            <span>${fmt(s.price)} đ</span>${s.unit ? `<span class="text-[11px] font-normal text-slate-400"> / ${esc(s.unit)}</span>` : ''}
                                        </td>
                                        <td class="py-3.5 px-3 text-center align-middle whitespace-nowrap">${s.activeRegistrations || 0} phòng</td>
                                        <td class="py-3.5 px-3 text-center align-middle whitespace-nowrap">
                                            ${s.isActive
                                                ? '<span class="inline-flex min-w-max items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Hoạt động</span>'
                                                : '<span class="inline-flex min-w-max items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Tạm ngưng</span>'}
                                        </td>
                                        <td class="py-3.5 pl-3 pr-6 text-center align-middle whitespace-nowrap" onclick="event.stopPropagation();">
                                            <div class="relative inline-flex items-center justify-center">
                                                ${renderThreeDotButton(
                                                    `utilities-action-menu-svc-${safeSvcDomId}`,
                                                    `Mở menu thao tác dịch vụ ${safeSvcName}`,
                                                    `KtxExtendedViews.toggleUtilitiesActionMenu('svc-${safeSvcDomId}', event)`
                                                )}
                                                ${renderUtilitiesMenuShell(`svc-${safeSvcDomId}`, menuHeader, menuItems)}
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                            ${filtered.length === 0 ? `<tr><td colspan="6" class="py-10 text-center text-slate-400 text-xs">${extState.services.length === 0 ? 'Chưa có dịch vụ nào trong danh mục.' : 'Không có dịch vụ phù hợp.'}</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderServiceRequestsPanel() {
        const user = (window.KtxApp && typeof KtxApp.getCurrentUser === 'function') ? KtxApp.getCurrentUser() : null;
        const role = user && user.roleCode;
        // Đồng quyền với DichVuApiController: chỉ admin/quanLy duyệt đơn
        const canApprove = role === 'admin' || role === 'quanLy';
        const esc = escapeHtmlValue;
        const fmt = v => Number(v || 0).toLocaleString('vi-VN');
        // API đã trả ngày dạng chuỗi dd/MM/yyyy, hiển thị trực tiếp không parse Date
        const fmtDate = d => d || '—';

        const filtered = extState.serviceRegs.filter(r => {
            const matchStatus = extState.serviceRegFilter === 'ALL' || r.trangThai === extState.serviceRegFilter;
            const matchSearch = matchesSearch(extState.utilitySearch, r.id, r.studentName, r.studentId, r.room, r.serviceName);
            return matchStatus && matchSearch;
        });

        return `
            <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                <div class="overflow-x-auto">
                    <table class="w-full table-fixed min-w-[820px] text-left border-collapse text-xs">
                        <thead>
                            <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                                <th class="w-[10%] py-3.5 pl-6 pr-3">Mã đơn</th>
                                <th class="w-[22%] py-3.5 px-3">Sinh viên</th>
                                <th class="w-[18%] py-3.5 px-3">Phòng</th>
                                <th class="w-[22%] py-3.5 px-3">Dịch vụ</th>
                                <th class="w-[12%] py-3.5 px-3 text-right">Đơn giá</th>
                                <th class="w-[8%] py-3.5 px-3 text-center">SL</th>
                                <th class="w-[8%] py-3.5 pl-3 pr-6 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                            ${filtered.map(r => {
                                const safeRegDomId = String(r.id ?? '').replace(/[^a-zA-Z0-9_-]/g, '_');
                                const safeRoom = esc(r.room || '—');
                                const safeServiceName = esc(r.serviceName);
                                const statusLabel = esc(SERVICE_STATUS_LABELS[r.trangThai] || r.trangThai || '—');
                                const regIdNum = Number(r.id);

                                const menuHeader = `
                                    <span class="text-[11px] text-slate-400 font-mono truncate">#${esc(r.id)}</span>
                                    <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">${statusLabel}</span>
                                `;
                                const menuItems = `
                                    <button type="button" role="menuitem"
                                        onclick="KtxExtendedViews.closeUtilitiesActionMenus(); KtxExtendedViews.viewServiceRegistrationDetail(${regIdNum});"
                                        class="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                        <span class="material-symbols-outlined text-[16px] text-[#0B2A5B] dark:text-blue-400">visibility</span>
                                        <span>Xem chi tiết đăng ký</span>
                                    </button>
                                    ${canApprove && r.trangThai === 'choDuyet' ? `
                                        <button type="button" role="menuitem"
                                            onclick="KtxExtendedViews.closeUtilitiesActionMenus(); KtxExtendedViews.approveServiceRegistration(${regIdNum});"
                                            class="w-full px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2 transition-colors">
                                            <span class="material-symbols-outlined text-[16px]">check</span>
                                            <span>Duyệt đăng ký</span>
                                        </button>
                                        <button type="button" role="menuitem"
                                            onclick="KtxExtendedViews.closeUtilitiesActionMenus(); KtxExtendedViews.openRejectServiceModal(${regIdNum});"
                                            class="w-full px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors">
                                            <span class="material-symbols-outlined text-[16px]">close</span>
                                            <span>Từ chối đăng ký</span>
                                        </button>
                                    ` : ''}
                                `;

                                return `
                                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                        <td class="py-3.5 pl-6 pr-3 font-mono text-slate-400 align-middle whitespace-nowrap">#${esc(r.id)}</td>
                                        <td class="py-3.5 px-3 align-middle">
                                            <div class="font-bold text-[#0B2A5B] dark:text-white truncate">${esc(r.studentName)}</div>
                                            <div class="text-[11px] text-slate-400 truncate">${esc(r.studentId)}</div>
                                        </td>
                                        <td class="py-3.5 px-3 align-middle">
                                            <div class="flex flex-wrap items-center gap-1.5">
                                                <span class="font-semibold text-slate-800 dark:text-slate-100">${safeRoom}</span>
                                                ${serviceStatusBadge(r.trangThai)}
                                            </div>
                                            ${r.trangThai === 'daTuChoi' && r.rejectReason ? `<div class="mt-1 text-[10px] text-rose-500 truncate" title="${esc(r.rejectReason)}">Lý do: ${esc(r.rejectReason)}</div>` : ''}
                                            ${r.trangThai === 'dangDung' && r.ngayDuyet ? `<div class="mt-1 text-[10px] text-slate-400 truncate">Duyệt ${esc(fmtDate(r.ngayDuyet))}${r.staffApprovedBy ? ` · ${esc(r.staffApprovedBy)}` : ''}</div>` : ''}
                                        </td>
                                        <td class="py-3.5 px-3 align-middle">
                                            <div class="font-semibold text-slate-800 dark:text-slate-100 truncate">${safeServiceName}</div>
                                            <div class="text-[11px] text-slate-400 mt-0.5 truncate">Từ ngày: ${esc(fmtDate(r.ngayBatDau))}</div>
                                        </td>
                                        <td class="py-3.5 px-3 text-right font-semibold align-middle whitespace-nowrap">${fmt(r.price)} đ</td>
                                        <td class="py-3.5 px-3 text-center font-semibold align-middle whitespace-nowrap">${r.soLuong || 1}</td>
                                        <td class="py-3.5 pl-3 pr-6 text-center align-middle whitespace-nowrap" onclick="event.stopPropagation();">
                                            <div class="relative inline-flex items-center justify-center">
                                                ${renderThreeDotButton(
                                                    `utilities-action-menu-reg-${safeRegDomId}`,
                                                    `Mở menu thao tác đơn #${esc(r.id)}`,
                                                    `KtxExtendedViews.toggleUtilitiesActionMenu('reg-${safeRegDomId}', event)`
                                                )}
                                                ${renderUtilitiesMenuShell(`reg-${safeRegDomId}`, menuHeader, menuItems)}
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                            ${filtered.length === 0 ? `<tr><td colspan="7" class="py-10 text-center text-slate-400 text-xs">${extState.serviceRegs.length === 0 ? 'Không có đơn đăng ký dịch vụ nào.' : 'Không có đơn đăng ký phù hợp.'}</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function setUtilitySubTab(tab) {
        if (!['utilities', 'catalog', 'requests'].includes(tab) || extState.utilitySubTab === tab) return;
        closeUtilitiesActionMenus();
        extState.utilitySubTab = tab;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderUtilitiesView());
    }

    function filterServiceRegStatus(v) {
        extState.serviceRegFilter = v;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderUtilitiesView());
    }

    function viewServiceRegistrationDetail(id) {
        const reg = extState.serviceRegs.find(r => Number(r.id) === Number(id));
        if (!reg) return;
        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;

        const user = (window.KtxApp && typeof KtxApp.getCurrentUser === 'function') ? KtxApp.getCurrentUser() : null;
        const role = user && user.roleCode;
        const canApprove = role === 'admin' || role === 'quanLy';
        const svc = extState.services.find(s => s.id === reg.serviceId);
        const esc = escapeHtmlValue;
        const fmt = v => Number(v || 0).toLocaleString('vi-VN');
        const qty = Number(reg.soLuong || 1);
        const unitPrice = Number(reg.price || 0);
        const estimatedTotal = unitPrice * qty;
        const regIdNum = Number(reg.id);

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="KtxExtendedViews.closeModal()">
                <div role="dialog" aria-modal="true" aria-labelledby="svcRegDetailTitle" class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">approval_delegation</span>
                            <h3 id="svcRegDetailTitle" class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider truncate">Chi tiết đơn đăng ký dịch vụ #${esc(reg.id)}</h3>
                        </div>
                        <button type="button" onclick="KtxExtendedViews.closeModal()" aria-label="Đóng cửa sổ" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                    <div class="py-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <div class="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-400 shrink-0">Trạng thái:</span>
                            <span>${serviceStatusBadge(reg.trangThai)}</span>
                        </div>
                        <div class="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-400 shrink-0">Dịch vụ:</span>
                            <span class="font-bold text-[#0B2A5B] dark:text-white text-right">${esc(reg.serviceName)}${reg.serviceId ? ` <span class="font-mono font-normal text-slate-400">(${esc(reg.serviceId)})</span>` : ''}</span>
                        </div>
                        <div class="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-400 shrink-0">Đơn giá / Số lượng:</span>
                            <span class="font-semibold text-right">${fmt(unitPrice)} đ${svc?.unit ? ` / ${esc(svc.unit)}` : ''} × ${qty}</span>
                        </div>
                        <div class="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-400 shrink-0">Thành tiền tạm tính:</span>
                            <span class="font-bold text-emerald-600 dark:text-emerald-400 text-right">${fmt(estimatedTotal)} đ</span>
                        </div>
                        <div class="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-400 shrink-0">Sinh viên đăng ký:</span>
                            <span class="font-semibold text-slate-800 dark:text-white text-right">${esc(reg.studentName || '—')} <span class="font-mono text-slate-400">(${esc(reg.studentId || '—')})</span></span>
                        </div>
                        <div class="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-400 shrink-0">Phòng nội trú:</span>
                            <span class="font-semibold text-right">${esc(reg.room || '—')}</span>
                        </div>
                        <div class="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-400 shrink-0">Thời gian áp dụng:</span>
                            <span class="font-semibold text-right">Từ ${esc(reg.ngayBatDau || '—')} — Đến ${esc(reg.ngayKetThuc || 'Theo hợp đồng')}</span>
                        </div>
                        ${reg.ngayDuyet || reg.staffApprovedBy ? `
                            <div class="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                <span class="text-slate-400 shrink-0">Xử lý bởi / Lúc:</span>
                                <span class="font-medium text-right">${esc(reg.staffApprovedBy || 'BQL KTX')}${reg.ngayDuyet ? ` · ${esc(reg.ngayDuyet)}` : ''}</span>
                            </div>
                        ` : ''}
                        ${reg.trangThai === 'daTuChoi' && reg.rejectReason ? `
                            <div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
                                <div class="font-bold text-[11px] uppercase tracking-wider mb-0.5">Lý do từ chối</div>
                                <div>${esc(reg.rejectReason)}</div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-colors">Đóng</button>
                        ${canApprove && reg.trangThai === 'choDuyet' ? `
                            <button type="button" onclick="KtxExtendedViews.closeModal(); KtxExtendedViews.openRejectServiceModal(${regIdNum});" class="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-semibold text-xs transition-colors">Từ chối</button>
                            <button type="button" onclick="KtxExtendedViews.closeModal(); KtxExtendedViews.approveServiceRegistration(${regIdNum});" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors">Duyệt đăng ký</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function openServiceFormModal(serviceId) {
        const item = serviceId ? extState.services.find(s => s.id === serviceId) : null;
        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">${item ? `Cập nhật dịch vụ ${item.id}` : 'Thêm dịch vụ mới'}</h3>
                        <button onclick="KtxExtendedViews.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxExtendedViews.submitServiceForm('${serviceId || ''}');" class="space-y-4 pt-4 text-xs">
                        <div>
                            <label for="svcName" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên dịch vụ</label>
                            <input id="svcName" type="text" required maxlength="100" value="${item ? item.name.replace(/"/g, '&quot;') : ''}" placeholder="Ví dụ: Giặt sấy tự động" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-white focus:outline-none" />
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label for="svcUnit" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Đơn vị tính</label>
                                <select id="svcUnit" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                    <option value="thang" ${!item || item.unit === 'thang' ? 'selected' : ''}>Theo tháng</option>
                                    <option value="lan" ${item && item.unit === 'lan' ? 'selected' : ''}>Theo lần</option>
                                </select>
                            </div>
                            <div>
                                <label for="svcPrice" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Đơn giá (đ)</label>
                                <input id="svcPrice" type="number" required min="0" step="1000" value="${item ? item.price : 0}" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-800 dark:text-white focus:outline-none" />
                            </div>
                        </div>
                        <label class="inline-flex items-center gap-2 cursor-pointer">
                            <input id="svcActive" type="checkbox" class="w-4 h-4 rounded text-blue-600" ${!item || item.isActive ? 'checked' : ''} />
                            <span class="font-semibold text-slate-700 dark:text-slate-300">Đang mở cho đăng ký</span>
                        </label>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">${item ? 'Lưu thay đổi' : 'Thêm dịch vụ'}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitServiceForm(serviceId) {
        const body = {
            name: document.getElementById('svcName').value.trim(),
            unit: document.getElementById('svcUnit').value,
            price: Number(document.getElementById('svcPrice').value),
            isActive: document.getElementById('svcActive').checked
        };
        if (!body.name) { KtxApp.showToast('Tên dịch vụ không được để trống.', 'error'); return; }

        try {
            const res = await fetch(serviceId ? `/api/dichvu/${encodeURIComponent(serviceId)}` : '/api/dichvu', {
                method: serviceId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const json = await res.json();
            if (json.success) {
                KtxApp.showToast(json.message || 'Đã lưu dịch vụ!');
                closeModal();
                await loadServices();
                reRender();
            } else {
                KtxApp.showToast(json.message || 'Không lưu được dịch vụ.', 'error');
            }
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
    }

    async function deleteService(serviceId) {
        const item = extState.services.find(s => s.id === serviceId);
        if (!confirm(`Xóa dịch vụ "${item ? item.name : serviceId}"? Dịch vụ đang có sinh viên sử dụng hoặc đã phát sinh hóa đơn sẽ không xóa được.`)) return;

        try {
            const res = await fetch(`/api/dichvu/${encodeURIComponent(serviceId)}`, { method: 'DELETE' });
            const json = await res.json();
            KtxApp.showToast(json.message || (json.success ? 'Đã xóa dịch vụ.' : 'Không xóa được dịch vụ.'), json.success ? 'success' : 'error');
            if (json.success) {
                await loadServices();
                reRender();
            }
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
    }

    async function approveServiceRegistration(id) {
        try {
            const res = await fetch(`/api/dichvu/dangky/${id}/approve`, { method: 'POST' });
            const json = await res.json();
            KtxApp.showToast(json.message || (json.success ? 'Đã duyệt đơn dịch vụ.' : 'Không duyệt được đơn.'), json.success ? 'success' : 'error');
            if (json.success) {
                await loadServices();
                reRender();
            }
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
    }

    function openRejectServiceModal(id) {
        const reg = extState.serviceRegs.find(r => r.id === id);
        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Từ chối đơn #${id}${reg ? ` · ${reg.serviceName}` : ''}</h3>
                        <button onclick="KtxExtendedViews.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxExtendedViews.submitRejectServiceRegistration(${id});" class="space-y-4 pt-4 text-xs">
                        <div>
                            <label for="rejectReason" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Lý do từ chối (sinh viên sẽ nhận được thông báo này)</label>
                            <textarea id="rejectReason" required rows="3" maxlength="200" placeholder="Ví dụ: Phòng đã đủ nhu cầu sử dụng dịch vụ trong kỳ này." class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-white focus:outline-none"></textarea>
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs">Từ chối đơn</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitRejectServiceRegistration(id) {
        const reason = document.getElementById('rejectReason').value.trim();
        if (!reason) { KtxApp.showToast('Vui lòng nhập lý do từ chối.', 'error'); return; }

        try {
            const res = await fetch(`/api/dichvu/dangky/${id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const json = await res.json();
            KtxApp.showToast(json.message || (json.success ? 'Đã từ chối đơn dịch vụ.' : 'Không từ chối được đơn.'), json.success ? 'success' : 'error');
            if (json.success) {
                closeModal();
                await loadServices();
                reRender();
            }
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
    }
    function filterUtilitySearch(v) {
        extState.utilitySearch = v;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderUtilitiesView());
    }
    function filterUtilityBuilding(v) {
        extState.utilityBuilding = v;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderUtilitiesView());
    }
    function filterUtilityStatus(v) {
        extState.utilityStatus = v;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderUtilitiesView());
    }
    function resetUtilityFilters() {
        extState.utilitySearch = '';
        extState.utilityBuilding = 'ALL';
        extState.utilityStatus = 'ALL';
        extState.serviceRegFilter = 'ALL';
        if (window.KtxApp && typeof KtxApp.showToast === 'function') {
            KtxApp.showToast('Đã hủy toàn bộ bộ lọc', 'info');
        }
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderUtilitiesView());
    }

    function openUtilityRecordDrawer(roomId) {
        const item = extState.utilities.find(u => u.id === roomId);
        if (!item) return;

        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;

        // Khbox dịch vụ tick sẵn theo đăng ký hiện tại của phòng (serviceCodes từ API)
        const codes = item.serviceCodes || [];
        const netChecked = codes.includes('DV_INTERNET') ? 'checked' : '';
        const trashChecked = codes.includes('DV_TRASH') ? 'checked' : '';

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
                                    <input id="serviceNet" type="checkbox" ${netChecked} class="w-4 h-4 rounded text-blue-600" />
                                    <span>Internet Wifi (+50.000 đ)</span>
                                </label>
                                <label class="inline-flex items-center gap-2 cursor-pointer">
                                    <input id="serviceTrash" type="checkbox" ${trashChecked} class="w-4 h-4 rounded text-blue-600" />
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

    function openFinalizeUtilityModal(roomId) {
        const item = extState.utilities.find(u => u.id === roomId);
        if (!item) return;

        const modalContainer = document.getElementById('modalsContainer');
        if (!modalContainer) return;

        const ky = `T${String(item.billThang).padStart(2, '0')}/${item.billNam}`;
        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Chốt hóa đơn điện nước ${ky} · Phòng ${item.room}</h3>
                        <button onclick="KtxExtendedViews.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <div class="space-y-2 pt-4 text-xs text-slate-600 dark:text-slate-300">
                        <div class="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span>Số người chia kỳ này</span><strong>${item.soNguoiChia ?? '—'}</strong>
                        </div>
                        <div class="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span>Tạm tính mỗi người</span><strong class="text-[#0B2A5B] dark:text-white">${item.tienMoiNguoi != null ? Number(item.tienMoiNguoi).toLocaleString('vi-VN') + ' đ' : '—'}</strong>
                        </div>
                        <p class="text-[11px] text-slate-400">Hệ thống tạo một hóa đơn tiền điện + tiền nước riêng cho từng sinh viên có hợp đồng hiệu lực trong phòng (số người được tính lại tại thời điểm chốt), hạn nộp ngày 15 tháng kế tiếp.</p>
                        <label class="flex items-center gap-2 pt-1 cursor-pointer">
                            <input id="finalizeSendNow" type="checkbox" checked class="w-4 h-4 rounded text-blue-600" />
                            <span class="font-semibold text-slate-700 dark:text-slate-300">Gửi hóa đơn &amp; thông báo cho sinh viên ngay khi chốt</span>
                        </label>
                    </div>
                    <div class="flex justify-end gap-2 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                        <button type="button" onclick="KtxExtendedViews.submitFinalizeUtility('${roomId}')" class="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-xs">Chốt hóa đơn</button>
                    </div>
                </div>
            </div>
        `;
    }

    async function submitFinalizeUtility(roomId) {
        const sendNow = document.getElementById('finalizeSendNow')?.checked ?? false;
        try {
            const res = await fetch('/api/diennuoc/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, sendNow })
            });
            const json = await res.json();
            KtxApp.showToast(json.message || (json.success ? 'Đã chốt hóa đơn điện nước!' : 'Không chốt được hóa đơn'), json.success ? 'success' : 'error');
            if (json.success) {
                closeModal();
                await Promise.all([loadUtilities(), loadInvoices()]);
                reRender();
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
        const academicYear = KtxApp.getSelectedAcademicYear();
        if (!academicYear) {
            extState.invoices = [];
            return;
        }
        try {
            const invoices = await fetchApiData('/api/hoadon');
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.invoices = invoices;
        } catch (error) {
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.invoices = [];
            reportLoadFailure('danh sách hóa đơn', error);
        }
    }

    function isInvoiceAwaitingConfirm(inv) {
        if (!inv || inv.status === 'paid' || inv.isDraft) return false;
        if (inv.paymentStatus === 'choXacNhan') return true;
        return Boolean(inv.hasStudentProof && !inv.isProofRejected);
    }

    function getInvoiceStatusBadge(inv) {
        if (!inv) return '';
        if (inv.status === 'draft' || inv.isDraft) {
            return '<span class="inline-flex min-w-max items-center justify-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Nháp</span>';
        }
        if (inv.status === 'paid' || inv.paymentStatus === 'daNhanThanhToan') {
            return '<span class="inline-flex min-w-max items-center justify-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Đã nhận thanh toán</span>';
        }
        if (isInvoiceAwaitingConfirm(inv)) {
            return '<span class="inline-flex min-w-max items-center justify-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">Chờ xác nhận thanh toán</span>';
        }
        if (inv.isProofRejected) {
            return '<span class="inline-flex min-w-max items-center justify-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Đã từ chối minh chứng</span>';
        }
        if (inv.status === 'overdue') {
            return '<span class="inline-flex min-w-max items-center justify-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Quá hạn</span>';
        }
        return '<span class="inline-flex min-w-max items-center justify-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Chưa thanh toán</span>';
    }

    function renderInvoicesView() {
        // Lập/sửa/gửi hóa đơn và đối soát thanh toán dành cho vai trò nghiệp vụ (admin, quản lý, kế toán).
        const user = (window.KtxApp && typeof KtxApp.getCurrentUser === 'function') ? KtxApp.getCurrentUser() : null;
        const role = user && user.roleCode;
        const canManageInvoices = role === 'admin' || role === 'quanLy' || role === 'keToan';
        const canConfirmPayment = role === 'admin' || role === 'quanLy' || role === 'keToan';

        // 1. Áp dụng trước các bộ lọc ngữ cảnh: Tìm kiếm và Khoản thu
        const contextualInvoices = extState.invoices.filter(i => {
            const matchSearch = matchesSearch(extState.invoiceSearch, i.code, i.studentName, i.studentId, i.room, i.building, i.title);
            const matchCat = extState.invoiceCategory === 'all' || i.category === extState.invoiceCategory;
            return matchSearch && matchCat;
        });

        // 2. Tính toán động 4 KPI metrics dựa trên dữ liệu ngữ cảnh đang lọc
        const totalPaid = contextualInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
        const totalPending = contextualInvoices.filter(i => i.status === 'pending').reduce((s, i) => s + (i.amount || 0), 0);
        const totalOverdue = contextualInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.amount || 0), 0);
        const overdueCount = contextualInvoices.filter(i => i.status === 'overdue' || i.isOverdue).length;
        const awaitingConfirmCount = contextualInvoices.filter(isInvoiceAwaitingConfirm).length;
        const totalCount = contextualInvoices.length;
        const paidCount = contextualInvoices.filter(i => i.status === 'paid').length;
        const pendingCount = contextualInvoices.filter(i => i.status === 'pending').length;
        const draftCount = contextualInvoices.filter(i => i.status === 'draft').length;
        const pendingFooter = awaitingConfirmCount > 0
            ? `${awaitingConfirmCount} HĐ chờ xác nhận · ${pendingCount} HĐ chờ thu`
            : `Còn ${pendingCount} hóa đơn chờ thu`;

        // 3. Lọc tiếp theo trạng thái nếu có chọn
        const filtered = contextualInvoices.filter(i => {
            if (extState.invoiceStatus === 'all') return true;
            if (extState.invoiceStatus === 'choXacNhan') return isInvoiceAwaitingConfirm(i);
            if (extState.invoiceStatus === 'pending') return i.status === 'pending' && !isInvoiceAwaitingConfirm(i);
            return i.status === extState.invoiceStatus;
        });

        const selectClass = 'h-10 min-w-[130px] px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer';

        return `
            <div class="flex flex-col w-full space-y-6">
                <!-- Header Title & Action Buttons -->
                <div class="page-title-banner flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Hóa đơn & Thu phí</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Theo dõi khoản thu, tình trạng thanh toán và công nợ nội trú</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2 flex-wrap">
                        <button type="button" onclick="KtxExtendedViews.filterInvoiceStatus('choXacNhan')" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border ${extState.invoiceStatus === 'choXacNhan' ? 'border-emerald-500 bg-emerald-100/90 dark:bg-emerald-950/60 ring-2 ring-emerald-500/20' : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40'} text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition">
                            <span class="material-symbols-outlined text-[16px]">price_check</span>
                            <span>Chờ xác nhận (${awaitingConfirmCount})</span>
                        </button>
                        <button type="button" onclick="KtxExtendedViews.filterInvoiceStatus('overdue')" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border ${extState.invoiceStatus === 'overdue' ? 'border-amber-500 bg-amber-100/90 dark:bg-amber-950/60 ring-2 ring-amber-500/20' : 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40'} text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition">
                            <span class="material-symbols-outlined text-[16px]">notifications_active</span>
                            <span>Xem nợ quá hạn (${overdueCount})</span>
                        </button>
                        ${canManageInvoices ? `
                        <button type="button" onclick="KtxExtendedViews.openCreateInvoiceModal()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold shadow-xs transition">
                            <span class="material-symbols-outlined text-[16px]">add_card</span>
                            <span>Lập Hóa Đơn</span>
                        </button>` : ''}
                    </div>
                </div>

                <!-- 4 KPI Cards (Đồng bộ chuẩn 4 thẻ, cập nhật linh hoạt theo bộ lọc) -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${renderMetricCard({ label: 'Thực thu đã thu', value: totalPaid.toLocaleString('vi-VN'), unit: 'đ', icon: 'payments', tone: 'blue', footer: `Đã thu ${paidCount} hóa đơn` })}
                    ${renderMetricCard({ label: 'Chờ sinh viên nộp', value: totalPending.toLocaleString('vi-VN'), unit: 'đ', icon: 'schedule', tone: 'amber', footer: pendingFooter })}
                    ${renderMetricCard({ label: 'Công nợ quá hạn', value: totalOverdue.toLocaleString('vi-VN'), unit: 'đ', icon: 'account_balance_wallet', tone: 'red', footer: `${overdueCount} hóa đơn quá hạn` })}
                    ${renderMetricCard({ label: 'Tổng số hóa đơn', value: totalCount.toLocaleString('vi-VN'), unit: 'hóa đơn', icon: 'receipt_long', tone: 'slate', footer: draftCount > 0 ? `${draftCount} bản nháp chưa gửi sinh viên` : 'Sinh viên nộp qua QR chuyển khoản' })}
                </div>

                <!-- Filter Bar (Đồng bộ chuẩn: Tìm kiếm trước có icon kính lúp, Dropdown Khoản thu & Trạng thái, Nút Hủy lọc) -->
                <div class="page-filter-bar flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs">
                    <div class="page-filter-search flex-1 flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B]">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                        <input id="invoicesSearchInput" type="text" placeholder="Tìm theo mã HĐ, tên SV, MSSV, phòng... (Nhấn Enter)" value="${extState.invoiceSearch || ''}" onkeydown="if(event.key==='Enter'){event.preventDefault();KtxExtendedViews.filterInvoiceSearch(this.value);}" class="w-full bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div class="page-filter-controls flex items-center gap-2 shrink-0 flex-wrap">
                        <select aria-label="Lọc theo khoản thu" onchange="KtxExtendedViews.filterInvoiceCategory(this.value)" class="${selectClass}">
                            <option value="all">Khoản thu: Tất cả</option>
                            <option value="tonghop" ${extState.invoiceCategory === 'tonghop' ? 'selected' : ''}>Tổng hợp</option>
                            <option value="diennuoc" ${extState.invoiceCategory === 'diennuoc' ? 'selected' : ''}>Điện nước</option>
                            <option value="phong" ${extState.invoiceCategory === 'phong' ? 'selected' : ''}>Tiền phòng</option>
                            <option value="guixe" ${extState.invoiceCategory === 'guixe' ? 'selected' : ''}>Gửi xe</option>
                        </select>
                        <select aria-label="Lọc theo trạng thái" onchange="KtxExtendedViews.filterInvoiceStatus(this.value)" class="${selectClass}">
                            <option value="all" ${extState.invoiceStatus === 'all' ? 'selected' : ''}>Trạng thái: Tất cả</option>
                            <option value="choXacNhan" ${extState.invoiceStatus === 'choXacNhan' ? 'selected' : ''}>Chờ xác nhận thanh toán</option>
                            <option value="paid" ${extState.invoiceStatus === 'paid' ? 'selected' : ''}>Đã nhận thanh toán</option>
                            <option value="pending" ${extState.invoiceStatus === 'pending' ? 'selected' : ''}>Chưa thanh toán</option>
                            <option value="overdue" ${extState.invoiceStatus === 'overdue' ? 'selected' : ''}>Quá hạn</option>
                            <option value="draft" ${extState.invoiceStatus === 'draft' ? 'selected' : ''}>Nháp (chưa gửi)</option>
                        </select>
                        <button type="button" onclick="KtxExtendedViews.resetInvoiceFilters()" class="h-10 w-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center shrink-0 shadow-2xs group" title="Hủy bỏ toàn bộ bộ lọc hóa đơn" aria-label="Hủy bộ lọc hóa đơn">
                            <span class="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">filter_alt_off</span>
                        </button>
                    </div>
                </div>

                <!-- Table (Căn chỉnh khoảng cách vừa vặn, không tràn, Thao tác chuẩn) -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                                    <th class="py-3.5 pl-4 pr-3 whitespace-nowrap">Mã HĐ / Phòng</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Sinh Viên / MSSV</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Nội dung thu</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Số tiền</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Hạn đóng</th>
                                    <th class="py-3.5 pl-3 pr-4 text-center whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                ${filtered.map(inv => {
                                    const safeCode = escapeHtmlValue(inv.code);
                                    const safeJs = escapeJsSingleQuote(inv.code);
                                    const safeMenuId = String(inv.code ?? '').replace(/[^a-zA-Z0-9_-]/g, '_');
                                    const isAwaitingConfirm = isInvoiceAwaitingConfirm(inv);
                                    const stBadge = getInvoiceStatusBadge(inv);

                                    const sentLine = inv.isSent
                                        ? `<span class="text-slate-600 dark:text-slate-300" title="Ngày gửi: ${escapeHtmlValue(inv.dateSent || '')}">${escapeHtmlValue(inv.dateSent || '')}</span>`
                                        : '<span class="text-slate-400">Chưa gửi</span>';
                                    const proofLine = inv.hasStudentProof
                                        ? (inv.isProofRejected
                                            ? `<div class="flex items-center justify-between gap-2"><span class="text-slate-400">Minh chứng</span><span class="text-rose-600 dark:text-rose-400 font-semibold" title="${escapeHtmlValue(inv.proofRejectReason || '')}">Đã từ chối · chờ nộp lại</span></div>`
                                            : (inv.status === 'paid'
                                                ? `<div class="flex items-center justify-between gap-2"><span class="text-slate-400">Minh chứng</span><span class="text-emerald-700 dark:text-emerald-300 font-semibold" title="Sinh viên nộp ${escapeHtmlValue(inv.proofSubmittedAt || '')}">Đã đối soát hợp lệ</span></div>`
                                                : `<div class="flex items-center justify-between gap-2"><span class="text-slate-400">Minh chứng</span><span class="text-sky-700 dark:text-sky-300 font-semibold" title="Sinh viên nộp ${escapeHtmlValue(inv.proofSubmittedAt || '')}">Chờ xác nhận</span></div>`))
                                        : '';

                                    return `
                                        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                            <td class="py-3 pl-4 pr-3 whitespace-nowrap">
                                                <div class="font-bold text-[#0B2A5B] dark:text-blue-400 font-mono">${safeCode}</div>
                                                <div class="text-[11px] text-slate-400">Phòng ${escapeHtmlValue(inv.room)}</div>
                                            </td>
                                            <td class="py-3 px-3 whitespace-nowrap">
                                                <div class="font-semibold text-slate-800 dark:text-slate-200">${escapeHtmlValue(inv.studentName)}</div>
                                                <div class="text-[11px] font-mono text-slate-400">${escapeHtmlValue(inv.studentId)}</div>
                                            </td>
                                            <td class="py-3 px-3 whitespace-nowrap">
                                                <div class="text-slate-700 dark:text-slate-200 font-medium">${escapeHtmlValue(inv.title)}</div>
                                                <div class="mt-1 flex items-center gap-1.5 flex-wrap">
                                                    ${stBadge}
                                                    ${isAwaitingConfirm && inv.proofSubmittedAt ? `<span class="text-[10px] text-slate-400 font-mono">Nộp ${escapeHtmlValue(inv.proofSubmittedAt)}</span>` : ''}
                                                    ${inv.isProofRejected && inv.status !== 'paid' && inv.proofRejectReason ? `<span class="text-[10px] text-rose-500 truncate max-w-[200px]" title="${escapeHtmlValue(inv.proofRejectReason)}">Chờ SV nộp lại</span>` : ''}
                                                </div>
                                            </td>
                                            <td class="py-3 px-3 font-bold text-[#0B2A5B] dark:text-white whitespace-nowrap">${inv.amount.toLocaleString('vi-VN')} đ</td>
                                            <td class="py-3 px-3 whitespace-nowrap">
                                                <div class="text-slate-700 dark:text-slate-300">${escapeHtmlValue(inv.dueDate)}</div>
                                                ${inv.overdueText ? `<div class="text-[10px] font-bold text-rose-600">${escapeHtmlValue(inv.overdueText)}</div>` : ''}
                                            </td>
                                            <td class="py-3 pl-3 pr-4 text-center whitespace-nowrap" onclick="event.stopPropagation(); KtxExtendedViews.closeInvoicesActionMenus();">
                                                <div class="relative inline-flex items-center justify-center">
                                                    ${renderThreeDotButton(
                                                        `invoices-action-menu-${safeMenuId}`,
                                                        `Mở menu thao tác hóa đơn ${safeCode}`,
                                                        `KtxExtendedViews.toggleInvoicesActionMenu('${safeMenuId}', event)`
                                                    )}
                                                    <div id="invoices-action-menu-${safeMenuId}"
                                                        data-invoices-menu="true"
                                                        role="menu"
                                                        class="hidden fixed z-50 w-64 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-xl py-1.5 text-left animate-fade-in">
                                                        <div class="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                                            <span class="text-[11px] text-slate-400 shrink-0">Trạng thái</span>
                                                            ${stBadge}
                                                        </div>
                                                        <div class="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
                                                            <div class="flex items-center justify-between gap-2"><span class="text-slate-400">Gửi sinh viên</span>${sentLine}</div>
                                                            ${proofLine}
                                                        </div>
                                                        ${isAwaitingConfirm && canConfirmPayment ? `
                                                            <button type="button" role="menuitem"
                                                                onclick="KtxExtendedViews.closeInvoicesActionMenus(); KtxExtendedViews.openInvoiceProofReview('${safeJs}');"
                                                                class="w-full px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 flex items-center gap-2 transition-colors text-left">
                                                                <span class="material-symbols-outlined text-[16px]">price_check</span>
                                                                <span>Xác nhận thanh toán</span>
                                                            </button>
                                                        ` : ''}
                                                        <button type="button" role="menuitem"
                                                            onclick="KtxExtendedViews.closeInvoicesActionMenus(); KtxExtendedViews.viewInvoiceDetail('${safeJs}');"
                                                            class="w-full px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors text-left">
                                                            <span class="material-symbols-outlined text-[16px] text-slate-500">visibility</span>
                                                            <span>Xem chi tiết hóa đơn</span>
                                                        </button>
                                                        ${inv.canEdit && canManageInvoices ? `
                                                            <button type="button" role="menuitem"
                                                                onclick="KtxExtendedViews.closeInvoicesActionMenus(); KtxExtendedViews.openEditInvoiceDraftModal('${safeJs}');"
                                                                class="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors text-left">
                                                                <span class="material-symbols-outlined text-[16px] text-[#0B2A5B] dark:text-blue-400">edit_note</span>
                                                                <span>Chỉnh sửa hóa đơn</span>
                                                            </button>
                                                        ` : ''}
                                                        ${inv.isDraft && canManageInvoices ? `
                                                            <button type="button" role="menuitem"
                                                                onclick="KtxExtendedViews.closeInvoicesActionMenus(); KtxExtendedViews.sendInvoice('${safeJs}');"
                                                                class="w-full px-3 py-2 text-xs font-semibold text-[#0B2A5B] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 transition-colors text-left">
                                                                <span class="material-symbols-outlined text-[16px]">send</span>
                                                                <span>Gửi cho sinh viên</span>
                                                            </button>
                                                        ` : ''}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                                ${filtered.length === 0 ? '<tr><td colspan="6" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu phù hợp.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function filterInvoiceSearch(v) {
        extState.invoiceSearch = v;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderInvoicesView());
    }
    function filterInvoiceCategory(v) {
        extState.invoiceCategory = v;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderInvoicesView());
    }
    function filterInvoiceStatus(v) {
        extState.invoiceStatus = v;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderInvoicesView());
    }
    function resetInvoiceFilters() {
        extState.invoiceSearch = '';
        extState.invoiceCategory = 'all';
        extState.invoiceStatus = 'all';
        if (window.KtxApp && typeof KtxApp.showToast === 'function') {
            KtxApp.showToast('Đã hủy toàn bộ bộ lọc hóa đơn', 'info');
        }
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderInvoicesView());
    }

    // Hộp thoại xem chi tiết hóa đơn đồng bộ thiết kế với Đợt & Đơn đăng ký; hiển thị cả minh chứng & nút đối soát khi đang chờ xác nhận.
    function viewInvoiceDetail(code) {
        const inv = extState.invoices.find(i => i.code === code);
        const modalContainer = document.getElementById('modalsContainer');
        if (!inv || !modalContainer) return;

        const user = (window.KtxApp && typeof KtxApp.getCurrentUser === 'function') ? KtxApp.getCurrentUser() : null;
        const role = user && user.roleCode;
        const canManageInvoices = role === 'admin' || role === 'quanLy' || role === 'keToan';
        const canConfirmPayment = role === 'admin' || role === 'quanLy' || role === 'keToan';
        const isAwaitingConfirm = isInvoiceAwaitingConfirm(inv);
        const stBadge = getInvoiceStatusBadge(inv);
        const safeJs = escapeJsSingleQuote(inv.code);
        const initial = String(inv.studentName || 'S').trim().charAt(0).toUpperCase() || 'S';

        const year = (typeof KtxApp !== 'undefined' && KtxApp.getSelectedAcademicYear) ? KtxApp.getSelectedAcademicYear() : '';
        const yearQuery = year ? `&academicYear=${encodeURIComponent(year)}` : '';
        const proofSrc = inv.hasStudentProof ? `/api/hoadon/${encodeURIComponent(inv.code)}/student-proof?v=${Date.now()}${yearQuery}` : '';

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxExtendedViews.closeModal()">
                <div class="w-full max-w-2xl bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] overflow-hidden" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0F1A]">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-12 h-12 rounded-full ring-2 ring-[#0B2A5B]/20 bg-blue-100 text-[#0B2A5B] flex items-center justify-center text-lg font-bold shrink-0">${escapeHtmlValue(initial)}</span>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="text-base font-bold text-slate-900 dark:text-white truncate">${escapeHtmlValue(inv.studentName || 'Hóa đơn thu phí')}</h3>
                                    ${stBadge}
                                </div>
                                <p class="text-xs text-slate-500 font-mono mt-0.5 truncate">${escapeHtmlValue(inv.code)} · MSSV: ${escapeHtmlValue(inv.studentId || '—')}</p>
                            </div>
                        </div>
                        <button type="button" onclick="KtxExtendedViews.closeModal()" aria-label="Đóng chi tiết hóa đơn" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
                        ${inv.isProofRejected && inv.status !== 'paid' ? `
                            <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 space-y-1">
                                <div class="font-bold flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-[16px]">cancel</span>
                                    <span>Minh chứng thanh toán đã bị từ chối${inv.proofRejectedAt ? ` lúc ${escapeHtmlValue(inv.proofRejectedAt)}` : ''}</span>
                                </div>
                                <p class="leading-relaxed">Lý do: ${escapeHtmlValue(inv.proofRejectReason || '—')}. Đang chờ sinh viên nộp lại minh chứng mới.</p>
                            </div>
                        ` : ''}

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-2.5">
                                <h4 class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Thông tin sinh viên</h4>
                                <div class="flex justify-between gap-3"><span class="text-slate-400">Họ và tên:</span><span class="font-semibold text-right">${escapeHtmlValue(inv.studentName || '—')}</span></div>
                                <div class="flex justify-between gap-3"><span class="text-slate-400">MSSV:</span><span class="font-semibold font-mono text-right">${escapeHtmlValue(inv.studentId || '—')}</span></div>
                                <div class="flex justify-between gap-3"><span class="text-slate-400">Phòng:</span><span class="font-semibold text-[#0B2A5B] dark:text-blue-400 text-right">${escapeHtmlValue(inv.room || '—')}</span></div>
                                <div class="flex justify-between gap-3"><span class="text-slate-400">Tòa nhà:</span><span class="font-semibold text-right">${escapeHtmlValue(inv.building || '—')}</span></div>
                            </div>

                            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-2.5">
                                <h4 class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Chi tiết hóa đơn</h4>
                                <div class="flex justify-between gap-3"><span class="text-slate-400">Mã hóa đơn:</span><span class="font-mono font-bold text-slate-900 dark:text-white text-right">${escapeHtmlValue(inv.code)}</span></div>
                                <div class="flex justify-between gap-3"><span class="text-slate-400 shrink-0">Nội dung thu:</span><span class="font-semibold text-right">${escapeHtmlValue(inv.title || '—')}</span></div>
                                <div class="flex justify-between gap-3"><span class="text-slate-400">Số tiền:</span><span class="font-bold text-[#0B2A5B] dark:text-white text-right">${Number(inv.amount || 0).toLocaleString('vi-VN')} đ</span></div>
                                <div class="flex justify-between gap-3"><span class="text-slate-400">Hạn đóng:</span><span class="font-semibold font-mono text-right ${inv.isOverdue ? 'text-rose-600' : ''}">${escapeHtmlValue(inv.dueDate || '—')}${inv.overdueText ? ` (${escapeHtmlValue(inv.overdueText)})` : ''}</span></div>
                                <div class="flex justify-between gap-3"><span class="text-slate-400">Gửi sinh viên:</span><span class="font-semibold font-mono text-right">${inv.isSent ? escapeHtmlValue(inv.dateSent || 'Đã gửi') : 'Chưa gửi'}</span></div>
                                <div class="flex justify-between gap-3"><span class="text-slate-400">Hình thức thu:</span><span class="font-semibold text-right">${escapeHtmlValue(inv.method || 'Chưa có')}</span></div>
                            </div>
                        </div>

                        ${inv.hasStudentProof ? `
                            <div class="space-y-2">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ảnh minh chứng sinh viên nộp</span>
                                    <span class="text-[11px] font-mono text-slate-400">Nộp lúc ${escapeHtmlValue(inv.proofSubmittedAt || '—')}</span>
                                </div>
                                <img src="${proofSrc}" alt="Ảnh minh chứng thanh toán của sinh viên ${escapeHtmlValue(inv.studentName)}" class="w-full max-h-[42vh] object-contain rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800" onerror="this.classList.add('hidden'); this.nextElementSibling?.classList.remove('hidden');" />
                                <div class="hidden py-8 text-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                                    <span class="material-symbols-outlined text-[28px] text-slate-300">broken_image</span>
                                    <p class="text-[11px] text-slate-500">Không hiển thị được ảnh minh chứng (tệp hỏng hoặc không còn tồn tại).</p>
                                    <a href="${proofSrc}" target="_blank" rel="noopener" class="inline-block text-[11px] font-semibold text-[#0B2A5B] dark:text-blue-400 hover:underline">Mở ảnh ở tab mới</a>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <div class="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F1A]">
                        <button type="button" onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50">Đóng</button>
                        ${inv.isDraft && canManageInvoices ? `
                            <button type="button" onclick="KtxExtendedViews.closeModal(); KtxExtendedViews.sendInvoice('${safeJs}');" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-xs transition-colors">Gửi cho sinh viên</button>
                        ` : ''}
                        ${isAwaitingConfirm && canConfirmPayment ? `
                            <button type="button" onclick="KtxExtendedViews.openInvoiceRejectProof('${safeJs}')" class="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 font-semibold text-xs transition-colors">Từ chối minh chứng</button>
                            <button type="button" onclick="KtxExtendedViews.confirmInvoiceProofApprove('${safeJs}')" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors">Đồng ý thanh toán</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // BQL đối soát minh chứng sinh viên nộp: xem ảnh rồi duyệt hoặc từ chối, y như đợt đăng ký.
    function openInvoiceProofReview(code) {
        const inv = extState.invoices.find(i => i.code === code);
        const modalContainer = document.getElementById('modalsContainer');
        if (!inv || !modalContainer) return;

        const year = (typeof KtxApp !== 'undefined' && KtxApp.getSelectedAcademicYear) ? KtxApp.getSelectedAcademicYear() : '';
        const yearQuery = year ? `&academicYear=${encodeURIComponent(year)}` : '';
        const proofSrc = `/api/hoadon/${encodeURIComponent(inv.code)}/student-proof?v=${Date.now()}${yearQuery}`;
        const safeJs = escapeJsSingleQuote(inv.code);
        const isAwaitingConfirm = isInvoiceAwaitingConfirm(inv);

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxExtendedViews.closeModal()">
                <div class="w-full max-w-2xl bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] overflow-hidden" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0F1A]">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-[20px]">receipt_long</span>
                            </span>
                            <div class="min-w-0">
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Đối soát minh chứng thanh toán</h3>
                                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">Hóa đơn ${escapeHtmlValue(inv.code)} · ${escapeHtmlValue(inv.title)}</p>
                            </div>
                        </div>
                        <button type="button" onclick="KtxExtendedViews.closeModal()" aria-label="Đóng hộp thoại đối soát" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
                        <div class="grid grid-cols-2 gap-x-6 gap-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
                            <div class="flex justify-between gap-3"><span class="text-slate-400">Sinh viên:</span><span class="font-semibold text-right">${escapeHtmlValue(inv.studentName)}</span></div>
                            <div class="flex justify-between gap-3"><span class="text-slate-400">MSSV:</span><span class="font-mono font-semibold text-right">${escapeHtmlValue(inv.studentId)}</span></div>
                            <div class="flex justify-between gap-3"><span class="text-slate-400">Phòng:</span><span class="font-semibold text-right">${escapeHtmlValue(inv.room)}</span></div>
                            <div class="flex justify-between gap-3"><span class="text-slate-400">Số tiền:</span><span class="font-semibold text-right text-[#0B2A5B] dark:text-white">${Number(inv.amount || 0).toLocaleString('vi-VN')} đ</span></div>
                            <div class="flex justify-between gap-3 col-span-2"><span class="text-slate-400">Nộp minh chứng lúc:</span><span class="font-semibold font-mono text-right">${escapeHtmlValue(inv.proofSubmittedAt || '—')}</span></div>
                        </div>

                        ${inv.isProofRejected ? `
                            <div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
                                <div class="font-semibold">Minh chứng đã bị từ chối${inv.proofRejectedAt ? ` lúc ${escapeHtmlValue(inv.proofRejectedAt)}` : ''}</div>
                                <p class="mt-1 leading-relaxed">Lý do: ${escapeHtmlValue(inv.proofRejectReason || '—')}. Sinh viên cần nộp lại minh chứng mới.</p>
                            </div>
                        ` : ''}

                        <div>
                            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">Ảnh minh chứng sinh viên nộp</span>
                            <img src="${proofSrc}" alt="Ảnh minh chứng thanh toán của sinh viên ${escapeHtmlValue(inv.studentName)}" class="w-full max-h-[48vh] object-contain rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800" onerror="this.classList.add('hidden'); this.nextElementSibling?.classList.remove('hidden');" />
                            <div class="hidden py-10 text-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                                <span class="material-symbols-outlined text-[28px] text-slate-300">broken_image</span>
                                <p class="text-[11px] text-slate-500">Không hiển thị được ảnh minh chứng (tệp hỏng hoặc không còn tồn tại). Hãy yêu cầu sinh viên nộp lại.</p>
                                <a href="${proofSrc}" target="_blank" rel="noopener" class="inline-block text-[11px] font-semibold text-[#0B2A5B] dark:text-blue-400 hover:underline">Mở ảnh ở tab mới</a>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F1A]">
                        <button type="button" onclick="KtxExtendedViews.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50">Đóng</button>
                        ${isAwaitingConfirm ? `
                            <button type="button" onclick="KtxExtendedViews.openInvoiceRejectProof('${safeJs}')" class="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 font-semibold text-xs transition-colors">Từ chối minh chứng</button>
                            <button type="button" onclick="KtxExtendedViews.confirmInvoiceProofApprove('${safeJs}')" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors">Đồng ý thanh toán</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function confirmInvoiceProofApprove(code) {
        const inv = extState.invoices.find(i => i.code === code);
        const modalContainer = document.getElementById('modalsContainer');
        if (!inv || !modalContainer) return;
        const safeJs = escapeJsSingleQuote(code);

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxExtendedViews.closeModal()">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <span class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <span class="material-symbols-outlined text-[20px]">price_check</span>
                        </span>
                        <div>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Xác nhận đã nhận tiền</h3>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Hóa đơn sẽ chuyển sang trạng thái đã thanh toán ngay sau bước này.</p>
                        </div>
                    </div>
                    <div class="py-4 space-y-2 text-xs">
                        <div class="flex justify-between gap-3"><span class="text-slate-400">Sinh viên:</span><span class="font-semibold text-slate-900 dark:text-white">${escapeHtmlValue(inv.studentName)}</span></div>
                        <div class="flex justify-between gap-3"><span class="text-slate-400">Hóa đơn:</span><span class="font-mono font-semibold">${escapeHtmlValue(inv.code)}</span></div>
                        <div class="flex justify-between gap-3"><span class="text-slate-400">Số tiền ghi nhận:</span><span class="font-bold text-emerald-600 dark:text-emerald-400">${Number(inv.amount || 0).toLocaleString('vi-VN')} đ</span></div>
                    </div>
                    <div class="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onclick="KtxExtendedViews.openInvoiceProofReview('${safeJs}')" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Quay lại</button>
                        <button type="button" onclick="KtxExtendedViews.submitInvoiceProofApprove('${safeJs}', this)" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-60">Xác nhận đã nhận tiền</button>
                    </div>
                </div>
            </div>
        `;
    }

    async function submitInvoiceProofApprove(code, btn) {
        if (btn) { btn.disabled = true; btn.textContent = 'Đang xử lý...'; }
        const fd = new FormData();
        fd.append('invoiceId', code);
        fd.append('paymentMethod', 'Chuyển khoản');

        try {
            const res = await fetch('/api/hoadon/confirm-payment', { method: 'POST', body: fd });
            const json = await res.json();
            if (json.success) {
                closeModal();
                KtxApp.showToast(json.message || 'Đã xác nhận thanh toán hóa đơn.', 'success');
                await loadInvoices();
                reRender();
            } else {
                KtxApp.showToast(json.message || 'Không thể xác nhận thanh toán.', 'error');
                if (btn) { btn.disabled = false; btn.textContent = 'Xác nhận đã nhận tiền'; }
            }
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Xác nhận đã nhận tiền'; }
        }
    }

    function openInvoiceRejectProof(code) {
        const inv = extState.invoices.find(i => i.code === code);
        const modalContainer = document.getElementById('modalsContainer');
        if (!inv || !modalContainer) return;
        const safeJs = escapeJsSingleQuote(code);
        const quickReasons = [
            'Ảnh minh chứng mờ, không đọc được số tiền hoặc nội dung chuyển khoản',
            'Số tiền chuyển khoản không khớp với hóa đơn',
            'Minh chứng không phải giao dịch cho hóa đơn này'
        ];

        modalContainer.innerHTML = `
            <div class="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxExtendedViews.closeModal()">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                                <span class="material-symbols-outlined text-[18px]">block</span>
                            </span>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Từ chối minh chứng</h3>
                        </div>
                        <button type="button" onclick="KtxExtendedViews.closeModal()" aria-label="Đóng hộp thoại" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxExtendedViews.submitInvoiceProofReject('${safeJs}');" class="space-y-4 pt-4 text-xs">
                        <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Từ chối minh chứng của <strong class="text-slate-900 dark:text-white">${escapeHtmlValue(inv.studentName)}</strong>. Lý do sẽ được gửi tới sinh viên để nộp lại minh chứng.
                        </p>
                        <div>
                            <label for="invoiceProofRejectReason" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Lý do từ chối <span class="text-red-500">*</span></label>
                            <textarea id="invoiceProofRejectReason" required rows="3" maxlength="255" placeholder="Nhập lý do cụ thể để sinh viên biết cách khắc phục..." class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"></textarea>
                            <p id="invoiceProofRejectError" class="hidden text-[11px] text-red-600 font-medium mt-1">Vui lòng nhập lý do từ chối trước khi xác nhận.</p>
                        </div>
                        <div class="space-y-1.5">
                            <span class="text-[11px] text-slate-400 block">Gợi ý lý do nhanh:</span>
                            <div class="flex flex-wrap gap-1.5">
                                ${quickReasons.map(r => `
                                    <button type="button" onclick="document.getElementById('invoiceProofRejectReason').value = '${escapeJsSingleQuote(r)}'; document.getElementById('invoiceProofRejectError')?.classList.add('hidden');" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] text-slate-700 dark:text-slate-300 transition-colors text-left">${escapeHtmlValue(r)}</button>
                                `).join('')}
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxExtendedViews.openInvoiceProofReview('${safeJs}')" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Quay lại</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs transition-colors">Xác nhận từ chối</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitInvoiceProofReject(code) {
        const input = document.getElementById('invoiceProofRejectReason');
        const errorEl = document.getElementById('invoiceProofRejectError');
        if (!input) return;

        const reason = input.value.trim();
        if (!reason) {
            errorEl?.classList.remove('hidden');
            input.focus();
            return;
        }
        errorEl?.classList.add('hidden');

        try {
            const res = await fetch(`/api/hoadon/${encodeURIComponent(code)}/reject-payment-proof`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const json = await res.json();
            if (json.success) {
                closeModal();
                KtxApp.showToast(json.message || 'Đã từ chối minh chứng.', 'success');
                await loadInvoices();
                reRender();
            } else {
                KtxApp.showToast(json.message || 'Không thể từ chối minh chứng.', 'error');
            }
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
    }

    async function sendInvoice(code) {
        if (!confirm(`Gửi hóa đơn ${code} cho sinh viên (kèm thông báo trên cổng sinh viên)?`)) return;
        try {
            const res = await fetch('/api/hoadon/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceId: code })
            });
            const json = await res.json();
            KtxApp.showToast(json.message || (json.success ? 'Đã gửi hóa đơn!' : 'Không gửi được hóa đơn'), json.success ? 'success' : 'error');
            if (json.success) {
                await loadInvoices();
                reRender();
            }
        } catch (e) {
            KtxApp.showToast('Lỗi kết nối máy chủ', 'error');
        }
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
                        <div class="text-xs font-mono text-slate-500">Mã phiếu: ${escapeHtml(inv.code)}</div>
                    </div>
                    <div class="py-4 space-y-2 text-xs">
                        <div class="flex justify-between"><span>Sinh viên:</span><strong>${escapeHtml(inv.studentName)}</strong></div>
                        <div class="flex justify-between"><span>MSSV:</span><span class="font-mono">${escapeHtml(inv.studentId)}</span></div>
                        <div class="flex justify-between"><span>Phòng lưu trú:</span><span>${escapeHtml(inv.room)}</span></div>
                        <div class="flex justify-between"><span>Khoản thu:</span><span>${escapeHtml(inv.title)}</span></div>
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
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
            <style>
                * { font-family: 'Roboto', sans-serif !important; }
                body { font-family: 'Roboto', sans-serif; margin: 20mm; color: #111; }
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
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
            <style>
                * { font-family: 'Roboto', sans-serif !important; }
                body { font-family: 'Roboto', sans-serif; margin: 20mm; color: #111; }
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
        const academicYear = KtxApp.getSelectedAcademicYear();
        if (!academicYear) {
            extState.tickets = [];
            return;
        }
        try {
            const tickets = await fetchApiData('/api/suachua');
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.tickets = tickets;
        } catch (error) {
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.tickets = [];
            reportLoadFailure('danh sách yêu cầu sửa chữa', error);
        }
    }

    function renderMaintenanceView() {
        const ticketBuildings = [...new Set(extState.tickets.map(ticket => ticket.building).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'vi'));
        const ticketCategories = [...new Set(extState.tickets.map(ticket => ticket.category).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'vi'));

        // 1. Áp dụng trước các bộ lọc ngữ cảnh: Tìm kiếm, Tòa, Hạng mục, Độ ưu tiên
        const contextualTickets = extState.tickets.filter(t => {
            const matchSearch = matchesSearch(extState.ticketSearch, t.code, t.room, t.building, t.category, t.reporter, t.phone, t.title, t.description, t.technician);
            const matchBld = extState.ticketBuilding === 'ALL' || t.building === extState.ticketBuilding;
            const matchCat = extState.ticketCategory === 'ALL' || t.category === extState.ticketCategory;
            const matchPri = extState.ticketPriority === 'ALL' || t.priority === extState.ticketPriority;
            return matchSearch && matchBld && matchCat && matchPri;
        });

        // 2. Tính toán động 4 KPI metrics và số lượng trên các tab trạng thái dựa trên dữ liệu đang lọc
        const totalCount = contextualTickets.length;
        const pendingCount = contextualTickets.filter(t => t.status === 'PENDING').length;
        const inProgressCount = contextualTickets.filter(t => t.status === 'IN_PROGRESS').length;
        const completedCount = contextualTickets.filter(t => t.status === 'COMPLETED').length;
        const urgentCount = contextualTickets.filter(t => t.priority === 'Khẩn cấp').length;

        // 3. Lọc tiếp theo tab trạng thái nếu có chọn
        const filtered = contextualTickets.filter(t => {
            return extState.ticketTab === 'ALL' || t.status === extState.ticketTab;
        });

        const selectClass = 'h-10 min-w-[130px] px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer';

        return `
            <div class="flex flex-col w-full space-y-6">
                <!-- Header Title & Action -->
                <div class="page-title-banner flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Sửa chữa &amp; Bảo trì Cơ sở vật chất</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tiếp nhận, phân công và theo dõi tiến độ yêu cầu sửa chữa</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5">
                        <button type="button" onclick="KtxExtendedViews.openCreateTicketModal()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold shadow-xs transition">
                            <span class="material-symbols-outlined text-[16px]">add_task</span>
                            <span>Tạo phiếu báo hỏng</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metric Cards (Đồng bộ chuẩn 4 thẻ, cập nhật linh hoạt theo bộ lọc) -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${renderMetricCard({ label: 'Tổng yêu cầu', value: totalCount, unit: 'phiếu', icon: 'assignment', tone: 'blue', footer: `Gồm ${urgentCount} phiếu khẩn cấp` })}
                    ${renderMetricCard({ label: 'Chờ tiếp nhận', value: pendingCount, unit: 'phiếu', icon: 'pending_actions', tone: 'amber', footer: 'Yêu cầu đang chờ duyệt' })}
                    ${renderMetricCard({ label: 'Đang xử lý / sửa', value: inProgressCount, unit: 'phiếu', icon: 'handyman', tone: 'blue', footer: 'Kỹ thuật viên đang xử lý' })}
                    ${renderMetricCard({ label: 'Đã hoàn thành', value: completedCount, unit: 'phiếu', icon: 'task_alt', tone: 'green', footer: 'Đã nghiệm thu & đóng phiếu' })}
                </div>

                <!-- Filter Bar (Đồng bộ: Tìm kiếm kéo giãn, các Dropdown Tòa, Hạng mục, Ưu tiên, Trạng thái & Nút Hủy lọc) -->
                <div class="page-filter-bar flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs">
                    <div class="page-filter-search flex-1 min-w-[220px] w-full flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B]">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                        <input id="ticketsSearchInput" type="text" placeholder="Tìm mã phiếu, phòng, người gửi... (Nhấn Enter)" value="${escapeHtmlValue(extState.ticketSearch || '')}" onkeydown="if(event.key==='Enter'){event.preventDefault();KtxExtendedViews.filterTicketSearch(this.value);}" class="w-full bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div class="page-filter-controls flex items-center gap-2 shrink-0 flex-wrap">
                        <select aria-label="Lọc theo tòa" onchange="KtxExtendedViews.filterTicketBuilding(this.value)" class="${selectClass}">
                            <option value="ALL">Tòa: Tất cả</option>
                            ${ticketBuildings.map(building => `<option value="${escapeHtmlValue(building)}" ${extState.ticketBuilding === building ? 'selected' : ''}>Tòa ${escapeHtmlValue(building)}</option>`).join('')}
                        </select>
                        <select aria-label="Lọc theo hạng mục" onchange="KtxExtendedViews.filterTicketCategory(this.value)" class="${selectClass} max-w-[160px]">
                            <option value="ALL">Hạng mục: Tất cả</option>
                            ${ticketCategories.map(category => `<option value="${escapeHtmlValue(category)}" ${extState.ticketCategory === category ? 'selected' : ''}>${escapeHtmlValue(category)}</option>`).join('')}
                        </select>
                        <select aria-label="Lọc theo độ ưu tiên" onchange="KtxExtendedViews.filterTicketPriority(this.value)" class="${selectClass}">
                            <option value="ALL" ${extState.ticketPriority === 'ALL' ? 'selected' : ''}>Ưu tiên: Tất cả</option>
                            <option value="Khẩn cấp" ${extState.ticketPriority === 'Khẩn cấp' ? 'selected' : ''}>Khẩn cấp</option>
                            <option value="Bình thường" ${extState.ticketPriority === 'Bình thường' ? 'selected' : ''}>Bình thường</option>
                        </select>
                        <select aria-label="Lọc theo trạng thái" onchange="KtxExtendedViews.setTicketTab(this.value)" class="${selectClass}">
                            <option value="ALL" ${extState.ticketTab === 'ALL' ? 'selected' : ''}>Trạng thái: Tất cả</option>
                            <option value="PENDING" ${extState.ticketTab === 'PENDING' ? 'selected' : ''}>Chờ duyệt</option>
                            <option value="IN_PROGRESS" ${extState.ticketTab === 'IN_PROGRESS' ? 'selected' : ''}>Đang sửa</option>
                            <option value="COMPLETED" ${extState.ticketTab === 'COMPLETED' ? 'selected' : ''}>Hoàn tất</option>
                        </select>
                        <button type="button" onclick="KtxExtendedViews.resetTicketFilters()" class="h-10 w-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center shrink-0 shadow-2xs group" title="Hủy bỏ toàn bộ bộ lọc sửa chữa" aria-label="Hủy bộ lọc sửa chữa">
                            <span class="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">filter_alt_off</span>
                        </button>
                    </div>
                </div>

                <!-- Tickets Table (7 cột đối xứng: Ưu tiên gộp vào Nội dung sự cố, Trạng thái gộp vào Kỹ thuật viên, Thao tác 3 chấm) -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="overflow-x-auto">
                        <table class="w-full table-fixed min-w-[840px] text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                                    <th class="w-[12%] py-3.5 pl-6 pr-3">Mã phiếu</th>
                                    <th class="w-[11%] py-3.5 px-3">Phòng & Tòa</th>
                                    <th class="w-[13%] py-3.5 px-3">Hạng mục</th>
                                    <th class="w-[24%] py-3.5 px-3">Nội dung sự cố</th>
                                    <th class="w-[15%] py-3.5 px-3">Người báo</th>
                                    <th class="w-[17%] py-3.5 px-3">Kỹ thuật viên</th>
                                    <th class="w-[8%] py-3.5 pl-3 pr-6 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                ${filtered.length === 0 ? `
                                    <tr><td colspan="7" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu phù hợp.</td></tr>
                                ` : filtered.map(t => {
                                    const safeTicketDomId = String(t.id ?? '').replace(/[^a-zA-Z0-9_-]/g, '_');
                                    const safeTicketJs = escapeJsSingleQuote(t.id);
                                    const safeCode = escapeHtmlValue(t.code);
                                    const safeRoom = escapeHtmlValue(t.room);
                                    const safeCategory = escapeHtmlValue(t.category);
                                    const safeTitle = escapeHtmlValue(t.title);
                                    const safeDesc = escapeHtmlValue(t.description || t.title);
                                    const safeReporter = escapeHtmlValue(t.reporter);
                                    const safePhone = escapeHtmlValue(t.phone);
                                    const safeTechnician = t.technician ? escapeHtmlValue(t.technician) : '';

                                    const priBadge = t.priority === 'Khẩn cấp'
                                        ? '<span class="inline-flex min-w-max items-center justify-center px-2.5 py-0.5 rounded-xl text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Khẩn cấp</span>'
                                        : '<span class="inline-flex min-w-max items-center justify-center px-2.5 py-0.5 rounded-xl text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Bình thường</span>';

                                    const stBadge = t.status === 'COMPLETED'
                                        ? '<span class="inline-flex min-w-max items-center justify-center px-2.5 py-0.5 rounded-xl text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Hoàn tất</span>'
                                        : (t.status === 'IN_PROGRESS'
                                            ? '<span class="inline-flex min-w-max items-center justify-center px-2.5 py-0.5 rounded-xl text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">Đang sửa</span>'
                                            : '<span class="inline-flex min-w-max items-center justify-center px-2.5 py-0.5 rounded-xl text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Chờ duyệt</span>');

                                    return `
                                        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                            <td class="py-3.5 pl-6 pr-3 font-bold text-[#0B2A5B] dark:text-blue-400 font-mono align-middle whitespace-nowrap truncate">${safeCode}</td>
                                            <td class="py-3.5 px-3 align-middle whitespace-nowrap">
                                                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-400">${safeRoom}</span>
                                            </td>
                                            <td class="py-3.5 px-3 align-middle">
                                                <span class="inline-flex max-w-full px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs truncate" title="${safeCategory}">${safeCategory}</span>
                                            </td>
                                            <td class="py-3.5 px-3 align-middle">
                                                <div class="font-semibold text-slate-800 dark:text-slate-200 truncate" title="${safeDesc}">${safeTitle}</div>
                                                <div class="mt-1">${priBadge}</div>
                                            </td>
                                            <td class="py-3.5 px-3 align-middle">
                                                <div class="font-medium text-slate-800 dark:text-slate-200 leading-tight truncate">${safeReporter}</div>
                                                <div class="text-[11px] font-mono text-slate-400 truncate mt-0.5">${safePhone}</div>
                                            </td>
                                            <td class="py-3.5 px-3 text-slate-700 dark:text-slate-300 font-medium align-middle">
                                                <div>
                                                    ${safeTechnician
                                                        ? `<span class="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs max-w-full" title="${safeTechnician}"><span class="material-symbols-outlined text-[15px] shrink-0">engineering</span><span class="truncate">${safeTechnician}</span></span>`
                                                        : '<span class="text-slate-400 italic text-[11px]">Chưa phân công</span>'}
                                                </div>
                                                <div class="mt-1">${stBadge}</div>
                                            </td>
                                            <td class="py-3.5 pl-3 pr-6 text-center align-middle whitespace-nowrap" onclick="event.stopPropagation();">
                                                <div class="relative inline-flex items-center justify-center">
                                                    ${renderThreeDotButton(
                                                        `tickets-action-menu-${safeTicketDomId}`,
                                                        `Mở menu thao tác phiếu ${safeCode}`,
                                                        `KtxExtendedViews.toggleTicketsActionMenu('${safeTicketDomId}', event)`
                                                    )}
                                                    <div id="tickets-action-menu-${safeTicketDomId}"
                                                        data-tickets-menu="true"
                                                        role="menu"
                                                        class="hidden fixed z-50 w-56 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-xl py-1.5 text-left animate-fade-in">
                                                        <div class="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                                            <span class="text-[11px] text-slate-400 font-mono truncate">${safeCode}</span>
                                                            <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">${safeRoom}</span>
                                                        </div>
                                                        <button type="button" role="menuitem"
                                                            onclick="KtxExtendedViews.closeTicketsActionMenus(); KtxExtendedViews.viewTicketDetail('${safeTicketJs}');"
                                                            class="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                                            <span class="material-symbols-outlined text-[16px] text-[#0B2A5B] dark:text-blue-400">visibility</span>
                                                            <span>Xem chi tiết phiếu</span>
                                                        </button>
                                                    </div>
                                                </div>
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

    function setTicketTab(tab) {
        extState.ticketTab = tab;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderMaintenanceView());
    }
    function filterTicketSearch(v) {
        extState.ticketSearch = v;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderMaintenanceView());
    }
    function filterTicketBuilding(v) {
        extState.ticketBuilding = v;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderMaintenanceView());
    }
    function filterTicketCategory(v) {
        extState.ticketCategory = v;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderMaintenanceView());
    }
    function filterTicketPriority(v) {
        extState.ticketPriority = v;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderMaintenanceView());
    }
    function resetTicketFilters() {
        extState.ticketSearch = '';
        extState.ticketTab = 'ALL';
        extState.ticketBuilding = 'ALL';
        extState.ticketCategory = 'ALL';
        extState.ticketPriority = 'ALL';
        if (window.KtxApp && typeof KtxApp.showToast === 'function') {
            KtxApp.showToast('Đã hủy toàn bộ bộ lọc sửa chữa', 'info');
        }
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderMaintenanceView());
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


    // ========================================================
    // 5. VI PHẠM & KỶ LUẬT (Discipline View)
    // ========================================================
    async function loadViolations() {
        const academicYear = KtxApp.getSelectedAcademicYear();
        if (!academicYear) {
            extState.violations = [];
            extState.violationTypes = [];
            return;
        }
        try {
            const violations = await fetchApiData('/api/vipham');
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.violations = violations;
        } catch (error) {
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.violations = [];
            reportLoadFailure('danh sách vi phạm', error);
        }
    }

    function renderDisciplineView() {
        // 1. Áp dụng trước các bộ lọc ngữ cảnh: Tìm kiếm và Hình thức xử lý
        const contextualViolations = extState.violations.filter(v => {
            const matchSearch = matchesSearch(extState.violationSearch, v.code, v.studentId, v.studentName, v.room, v.violation);
            const matchPenalty = extState.violationPenaltyType === 'ALL' || v.penaltyType === extState.violationPenaltyType;
            return matchSearch && matchPenalty;
        });

        // 2. Tính toán động 4 KPI metrics dựa trên dữ liệu đang lọc
        const totalCount = contextualViolations.length;
        const remindCount = contextualViolations.filter(v => v.penaltyType === 'remind').length;
        const warningCount = contextualViolations.filter(v => v.penaltyType === 'warning' || v.penaltyType === 'reprimand').length;
        const expelCount = contextualViolations.filter(v => v.penaltyType === 'expel').length;

        // 3. Lọc tiếp theo trạng thái nếu có
        const filtered = contextualViolations.filter(v => {
            return extState.violationStatus === 'ALL' || v.status === extState.violationStatus;
        });

        const selectClass = 'h-10 min-w-[140px] px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer';

        return `
            <div class="flex flex-col w-full space-y-6">
                <!-- Header Title & Action -->
                <div class="page-title-banner flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Vi Phạm &amp; Kỷ Luật</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quản lý biên bản, hình thức xử lý và tình trạng kỷ luật</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5">
                        <button type="button" onclick="KtxExtendedViews.openCreateViolationModal()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs transition">
                            <span class="material-symbols-outlined text-[16px]">report_problem</span>
                            <span>Lập Biên Bản Vi Phạm</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metrics (Đồng bộ chuẩn 4 thẻ, cập nhật linh hoạt theo bộ lọc) -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${renderMetricCard({ label: 'Tổng biên bản học kỳ', value: totalCount, unit: 'vụ', icon: 'gavel', tone: 'blue', footer: 'Biên bản ghi nhận' })}
                    ${renderMetricCard({ label: 'Nhắc nhở', value: remindCount, unit: 'vụ', icon: 'notifications', tone: 'green', footer: 'Hình thức xử lý nhắc nhở' })}
                    ${renderMetricCard({ label: 'Khiển trách & Cảnh cáo', value: warningCount, unit: 'vụ', icon: 'warning', tone: 'amber', footer: 'Hình thức xử lý cảnh cáo' })}
                    ${renderMetricCard({ label: 'Buộc rời KTX', value: expelCount, unit: 'vụ', icon: 'gavel', tone: 'red', footer: 'Hình thức kỷ luật cao nhất' })}
                </div>

                <!-- Filter Bar (Tìm kiếm trước có icon kính lúp, Dropdown & Nút Hủy lọc) -->
                <div class="page-filter-bar flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs">
                    <div class="page-filter-search flex-1 flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B]">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                        <input id="violationsSearchInput" type="text" placeholder="Tìm mã biên bản, tên SV, MSSV, phòng... (Nhấn Enter)" value="${extState.violationSearch || ''}" onkeydown="if(event.key==='Enter'){event.preventDefault();KtxExtendedViews.filterViolationSearch(this.value);}" class="w-full bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div class="page-filter-controls flex items-center gap-2 shrink-0 flex-wrap">
                        <select aria-label="Lọc theo trạng thái" onchange="KtxExtendedViews.filterViolationStatus(this.value)" class="${selectClass}">
                            <option value="ALL" ${extState.violationStatus === 'ALL' ? 'selected' : ''}>Trạng thái: Tất cả</option>
                            <option value="Đã ghi nhận" ${extState.violationStatus === 'Đã ghi nhận' ? 'selected' : ''}>Đã ghi nhận</option>
                        </select>
                        <select aria-label="Lọc theo hình thức xử lý" onchange="KtxExtendedViews.filterViolationPenaltyType(this.value)" class="${selectClass}">
                            <option value="ALL" ${extState.violationPenaltyType === 'ALL' ? 'selected' : ''}>Hình thức: Tất cả</option>
                            <option value="remind" ${extState.violationPenaltyType === 'remind' ? 'selected' : ''}>Nhắc nhở</option>
                            <option value="reprimand" ${extState.violationPenaltyType === 'reprimand' ? 'selected' : ''}>Khiển trách</option>
                            <option value="warning" ${extState.violationPenaltyType === 'warning' ? 'selected' : ''}>Cảnh cáo</option>
                            <option value="expel" ${extState.violationPenaltyType === 'expel' ? 'selected' : ''}>Buộc rời KTX</option>
                        </select>
                        <button type="button" onclick="KtxExtendedViews.resetViolationFilters()" class="h-10 w-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center shrink-0 shadow-2xs group" title="Hủy bỏ toàn bộ bộ lọc vi phạm" aria-label="Hủy bộ lọc vi phạm">
                            <span class="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">filter_alt_off</span>
                        </button>
                    </div>
                </div>

                <!-- Table (Căn chỉnh khoảng cách vừa vặn, không tràn viền, Thao tác chuẩn) -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                                    <th class="py-3.5 pl-4 pr-3 whitespace-nowrap">Mã biên bản</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Sinh viên / Phòng</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Hành vi vi phạm</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Ngày lập</th>
                                    <th class="py-3.5 px-3 text-center whitespace-nowrap">Hình thức xử lý</th>
                                    <th class="py-3.5 px-3 text-center whitespace-nowrap">Trạng thái</th>
                                    <th class="py-3.5 pl-3 pr-4 text-center whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                ${filtered.map(v => {
                                    const pBadge = v.penaltyType === 'expel'
                                        ? '<span class="inline-flex min-w-max items-center justify-center px-3 py-1 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Buộc rời KTX</span>'
                                        : (v.penaltyType === 'warning'
                                            ? '<span class="inline-flex min-w-max items-center justify-center px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Cảnh cáo</span>'
                                            : (v.penaltyType === 'reprimand'
                                                ? '<span class="inline-flex min-w-max items-center justify-center px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Khiển trách</span>'
                                                : '<span class="inline-flex min-w-max items-center justify-center px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Nhắc nhở</span>'));

                                    return `
                                        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                            <td class="py-3 pl-4 pr-3 font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">${v.code}</td>
                                            <td class="py-3 px-3 whitespace-nowrap">
                                                <div class="font-bold text-slate-800 dark:text-white">${v.studentName}</div>
                                                <div class="text-[11px] text-slate-400">${v.studentId} · ${v.room}</div>
                                            </td>
                                            <td class="py-3 px-3 max-w-[220px]">
                                                <div class="font-medium text-slate-700 dark:text-slate-300 truncate" title="${v.violation}">${v.violation}</div>
                                            </td>
                                            <td class="py-3 px-3 text-slate-500 text-xs whitespace-nowrap">${v.date}</td>
                                            <td class="py-3 px-3 text-center whitespace-nowrap">${pBadge}</td>
                                            <td class="py-3 px-3 text-center whitespace-nowrap">
                                                <span class="inline-flex min-w-max items-center justify-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">${v.status}</span>
                                            </td>
                                            <td class="py-3 pl-3 pr-4 text-center whitespace-nowrap">
                                                <button type="button" onclick="KtxApp.openStudentModal('${v.studentId}')" class="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-[#0B2A5B] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Xem hồ sơ sinh viên">
                                                    <span class="material-symbols-outlined text-[18px]">visibility</span>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                                ${filtered.length === 0 ? '<tr><td colspan="7" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu phù hợp.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function filterViolationSearch(v) {
        extState.violationSearch = v;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderDisciplineView());
    }
    function filterViolationStatus(status) {
        extState.violationStatus = status;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderDisciplineView());
    }
    function filterViolationPenaltyType(penaltyType) {
        extState.violationPenaltyType = penaltyType;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderDisciplineView());
    }
    function resetViolationFilters() {
        extState.violationSearch = '';
        extState.violationStatus = 'ALL';
        extState.violationPenaltyType = 'ALL';
        if (window.KtxApp && typeof KtxApp.showToast === 'function') {
            KtxApp.showToast('Đã hủy toàn bộ bộ lọc vi phạm', 'info');
        }
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderDisciplineView());
    }

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
        const academicYear = KtxApp.getSelectedAcademicYear();
        if (!academicYear) {
            extState.staff = [];
            return;
        }
        try {
            const staff = await fetchApiData('/api/nhanvien');
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.staff = staff;
        } catch (error) {
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.staff = [];
            reportLoadFailure('danh sách nhân viên', error);
        }
    }

    function renderStaffView() {
        // 1. Áp dụng trước các bộ lọc ngữ cảnh: Tìm kiếm và Vai trò
        const contextualStaff = extState.staff.filter(s => {
            const matchSearch = matchesSearch(extState.staffSearch, s.name, s.code, s.email, s.phone, s.position, s.department, s.managedArea, s.role);
            const matchRole = extState.staffRole === 'ALL' || s.role === extState.staffRole;
            return matchSearch && matchRole;
        });

        // 2. Tính toán động 4 KPI metrics dựa trên dữ liệu đang lọc
        const totalCount = contextualStaff.length;
        const activeCount = contextualStaff.filter(s => s.status === 'active').length;
        const lockedCount = contextualStaff.filter(s => s.status === 'locked').length;
        const roleCount = new Set(contextualStaff.map(s => s.role).filter(Boolean)).size;

        // 3. Lọc tiếp theo trạng thái nếu có
        const filtered = contextualStaff.filter(s => {
            return extState.staffStatus === 'ALL' || s.status === extState.staffStatus;
        });

        const selectClass = 'h-10 min-w-[140px] px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer';

        return `
            <div class="flex flex-col w-full space-y-6">
                <!-- Header Title & Action -->
                <div class="page-title-banner flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Nhân Viên &amp; Tài Khoản</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quản lý nhân sự, vai trò và quyền truy cập hệ thống</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5">
                        <button type="button" onclick="KtxExtendedViews.openAddStaffModal()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold shadow-xs transition">
                            <span class="material-symbols-outlined text-[16px]">person_add</span>
                            <span>Thêm Nhân Viên Mới</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metrics (Đồng bộ chuẩn 4 thẻ, cập nhật linh hoạt theo bộ lọc) -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${renderMetricCard({ label: 'Tổng nhân sự KTX', value: totalCount, unit: 'cán bộ', icon: 'groups', tone: 'blue', footer: 'Nhân sự trong danh sách' })}
                    ${renderMetricCard({ label: 'Đang hoạt động', value: activeCount, unit: 'tài khoản', icon: 'verified_user', tone: 'green', footer: 'Tài khoản đang sử dụng' })}
                    ${renderMetricCard({ label: 'Tạm khóa / Đình chỉ', value: lockedCount, unit: 'tài khoản', icon: 'lock', tone: 'red', footer: 'Tài khoản đang bị khóa' })}
                    ${renderMetricCard({
                        label: 'Phân quyền vai trò',
                        value: roleCount,
                        unit: 'vai trò',
                        icon: 'admin_panel_settings',
                        tone: 'amber',
                        footer: [...new Set(contextualStaff.map(staff => staff.role).filter(Boolean))].join(' · ') || 'Chưa có vai trò'
                    })}
                </div>

                <!-- Filter Bar (Tìm kiếm trước có kính lúp, Dropdown & Nút Hủy lọc) -->
                <div class="page-filter-bar flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs">
                    <div class="page-filter-search flex-1 flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B]">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                        <input id="staffSearchInput" type="text" placeholder="Tìm theo tên cán bộ, mã NV, SĐT, email... (Nhấn Enter)" value="${extState.staffSearch || ''}" onkeydown="if(event.key==='Enter'){event.preventDefault();KtxExtendedViews.filterStaffSearch(this.value);}" class="w-full bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div class="page-filter-controls flex items-center gap-2 shrink-0 flex-wrap">
                        <select aria-label="Lọc theo trạng thái" onchange="KtxExtendedViews.filterStaffStatus(this.value)" class="${selectClass}">
                            <option value="ALL" ${extState.staffStatus === 'ALL' ? 'selected' : ''}>Trạng thái: Tất cả</option>
                            <option value="active" ${extState.staffStatus === 'active' ? 'selected' : ''}>Hoạt động</option>
                            <option value="locked" ${extState.staffStatus === 'locked' ? 'selected' : ''}>Đã khóa</option>
                        </select>
                        <select aria-label="Lọc theo vai trò" onchange="KtxExtendedViews.filterStaffRole(this.value)" class="${selectClass}">
                            <option value="ALL" ${extState.staffRole === 'ALL' ? 'selected' : ''}>Vai trò: Tất cả</option>
                            ${[...new Set(extState.staff.map(staff => staff.role).filter(Boolean))].map(role => `<option value="${role}" ${extState.staffRole === role ? 'selected' : ''}>${role}</option>`).join('')}
                        </select>
                        <button type="button" onclick="KtxExtendedViews.resetStaffFilters()" class="h-10 w-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center shrink-0 shadow-2xs group" title="Hủy bỏ toàn bộ bộ lọc nhân viên" aria-label="Hủy bộ lọc nhân viên">
                            <span class="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">filter_alt_off</span>
                        </button>
                    </div>
                </div>

                <!-- Table (Căn chỉnh khoảng cách vừa vặn, không tràn, Thao tác chuẩn) -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                                    <th class="py-3.5 pl-4 pr-3 whitespace-nowrap">Nhân viên / Mã NV</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Chức vụ &amp; Tổ công tác</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Khu vực phụ trách</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Liên hệ (SĐT / Email)</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Vai trò hệ thống</th>
                                    <th class="py-3.5 px-3 text-center whitespace-nowrap">Trạng thái</th>
                                    <th class="py-3.5 pl-3 pr-4 text-center whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                ${filtered.map(s => {
                                    const stBadge = s.status === 'active'
                                        ? '<span class="inline-flex min-w-max items-center justify-center px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Hoạt động</span>'
                                        : (s.status === 'locked'
                                            ? '<span class="inline-flex min-w-max items-center justify-center px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Đã khóa</span>'
                                            : '<span class="inline-flex min-w-max items-center justify-center px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Chưa có TK</span>');

                                    return `
                                        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                            <td class="py-3 pl-4 pr-3 whitespace-nowrap">
                                                <div class="flex items-center gap-2.5">
                                                    <div class="w-8 h-8 rounded-full bg-[#0B2A5B] text-white flex items-center justify-center font-bold text-xs shrink-0">${s.avatarText}</div>
                                                    <div>
                                                        <div class="font-bold text-slate-900 dark:text-white leading-tight">${s.name}</div>
                                                        <div class="text-[11px] font-mono text-slate-400 mt-0.5">${s.code}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="py-3 px-3 whitespace-nowrap">
                                                <div class="font-semibold text-slate-800 dark:text-slate-200">${s.position}</div>
                                                <div class="text-[11px] text-slate-400">${s.department}</div>
                                            </td>
                                            <td class="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">${s.managedArea}</td>
                                            <td class="py-3 px-3 whitespace-nowrap">
                                                <div class="font-mono text-slate-800 dark:text-slate-200">${s.phone}</div>
                                                <div class="text-[11px] text-slate-400">${s.email}</div>
                                            </td>
                                            <td class="py-3 px-3 whitespace-nowrap">
                                                <span class="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-400 border border-blue-200/60">${s.role}</span>
                                            </td>
                                            <td class="py-3 px-3 text-center whitespace-nowrap">${stBadge}</td>
                                            <td class="py-3 pl-3 pr-4 text-center whitespace-nowrap">
                                                <button type="button" onclick="KtxExtendedViews.toggleStaffStatus('${s.id}', this)" class="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                                    s.status === 'active'
                                                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300'
                                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                }">
                                                    ${s.status === 'active' ? 'Khóa TK' : s.status === 'locked' ? 'Mở khóa' : 'Tạo TK'}
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                                ${filtered.length === 0 ? '<tr><td colspan="7" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu phù hợp.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function filterStaffSearch(v) {
        extState.staffSearch = v;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderStaffView());
    }
    function filterStaffStatus(status) {
        extState.staffStatus = status;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderStaffView());
    }
    function filterStaffRole(role) {
        extState.staffRole = role;
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderStaffView());
    }
    function resetStaffFilters() {
        extState.staffSearch = '';
        extState.staffStatus = 'ALL';
        extState.staffRole = 'ALL';
        if (window.KtxApp && typeof KtxApp.showToast === 'function') {
            KtxApp.showToast('Đã hủy toàn bộ bộ lọc nhân viên', 'info');
        }
        const main = document.getElementById('mainContent');
        if (main) updateViewContainer(main, renderStaffView());
    }

    async function toggleStaffStatus(id, button) {
        if (button) {
            button.disabled = true;
            button.textContent = 'Đang cập nhật...';
        }

        try {
            const res = await fetch(`/api/nhanvien/${encodeURIComponent(id)}/toggle-status`, { method: 'POST' });
            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.success) {
                throw new Error(json?.message || 'Không thể cập nhật trạng thái tài khoản.');
            }

            KtxApp.showToast(json.message || 'Đã cập nhật trạng thái tài khoản!', 'success');
            await loadStaff();
            const main = document.getElementById('mainContent');
            if (main) updateViewContainer(main, renderStaffView());
        } catch (error) {
            const message = error instanceof TypeError
                ? 'Không kết nối được máy chủ. Vui lòng kiểm tra API đang chạy.'
                : error.message || 'Không thể cập nhật trạng thái tài khoản.';
            KtxApp.showToast(message, 'error');
            if (button) {
                button.disabled = false;
                button.textContent = extState.staff.find(staff => staff.id === id)?.status === 'active' ? 'Khóa TK' : 'Mở khóa';
            }
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
    async function loadReports(appState) {
        const academicYear = appState?.selectedAcademicYear;
        if (!academicYear) {
            extState.reports = null;
            return;
        }
        try {
            const query = `?academicYear=${encodeURIComponent(academicYear)}`;
            const reports = await fetchApiData(`/api/baocao/summary${query}`);
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.reports = reports;
        } catch (error) {
            if (KtxApp.getSelectedAcademicYear() === academicYear) extState.reports = null;
            reportLoadFailure('báo cáo thống kê', error);
        }
    }

    function renderReportsView() {
        const r = extState.reports || {
            academicYear: '—',
            totalRooms: 0,
            totalBeds: 0,
            occupiedBeds: 0,
            vacantBeds: 0,
            occupancyRate: 0,
            totalRevenue: 0,
            buildingOperations: []
        };

        const operations = r.buildingOperations || [];

        return `
            <div class="flex flex-col w-full space-y-6">
                <!-- Header Title & Action -->
                <div class="page-title-banner flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Báo Cáo &amp; Thống Kê</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tổng hợp số liệu lưu trú, công suất phòng và doanh thu KTX</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5">
                        <button type="button" onclick="KtxExtendedViews.exportReportsCsv()" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121826] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-all">
                            <span class="material-symbols-outlined text-[16px]">table_view</span>
                            <span>Xuất Excel CSV</span>
                        </button>
                        <button type="button" onclick="KtxExtendedViews.printReportsPdf()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold shadow-xs transition">
                            <span class="material-symbols-outlined text-[16px]">print</span>
                            <span>In Báo Cáo PDF</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metric Cards -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${renderMetricCard({ label: 'Tổng chỗ ở quy hoạch', value: r.totalBeds.toLocaleString('vi-VN'), unit: 'giường', icon: 'bed', tone: 'blue', footer: `${r.totalRooms} phòng lưu trú` })}
                    ${renderMetricCard({ label: 'Sinh viên đang ở', value: r.occupiedBeds.toLocaleString('vi-VN'), unit: 'SV', icon: 'groups', tone: 'blue', footer: `Còn trống ${r.vacantBeds} chỗ` })}
                    ${renderMetricCard({ label: 'Tỷ lệ lấp đầy bình quân', value: r.occupancyRate, unit: '%', icon: 'analytics', tone: 'green', footer: 'Mục tiêu: trên 90%' })}
                    ${renderMetricCard({ label: 'Doanh thu dự kiến kỳ', value: r.totalRevenue.toLocaleString('vi-VN'), unit: 'đ', icon: 'payments', tone: 'slate', footer: 'Tiền phòng + Tiện ích' })}
                </div>

                <!-- Building Operations Matrix Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B] overflow-hidden shadow-2xs">
                    <div class="p-4 border-b border-slate-200/80 dark:border-[#232B3B] flex items-center justify-between">
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Ma trận Vận hành &amp; Công suất từng Tòa Nhà KTX UTC2</h3>
                        <span class="text-xs font-mono font-semibold text-[#0B2A5B] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg">${r.academicYear}</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                                    <th class="py-3.5 pl-4 pr-3 whitespace-nowrap">Tòa nhà</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Tổng phòng</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Tổng giường</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Đang ở</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Còn trống</th>
                                    <th class="py-3.5 px-3 text-center whitespace-nowrap">Tỷ lệ lấp đầy</th>
                                    <th class="py-3.5 px-3 whitespace-nowrap">Doanh thu kỳ</th>
                                    <th class="py-3.5 pl-3 pr-4 text-center whitespace-nowrap">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                ${operations.map(b => `
                                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                        <td class="py-3 pl-4 pr-3 font-bold text-[#0B2A5B] dark:text-white whitespace-nowrap">${b.name}</td>
                                        <td class="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">${b.rooms} phòng</td>
                                        <td class="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">${b.beds} chỗ</td>
                                        <td class="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">${b.occupied}</td>
                                        <td class="py-3 px-3 font-semibold text-slate-500 whitespace-nowrap">${b.vacant}</td>
                                        <td class="py-3 px-3 text-center whitespace-nowrap">
                                            <span class="inline-flex min-w-max items-center justify-center px-3 py-1 rounded-xl text-xs font-semibold ${
                                                (b.rate >= 90) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                                (b.rate >= 50) ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' :
                                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                            }">${b.rate}%</span>
                                        </td>
                                        <td class="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">${b.revenue}</td>
                                        <td class="py-3 pl-3 pr-4 text-center whitespace-nowrap">
                                            <span class="inline-flex min-w-max items-center justify-center px-3 py-1 rounded-xl text-xs font-semibold ${
                                                b.statusColor === 'warning'
                                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            }">${b.status}</span>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${operations.length === 0 ? '<tr><td colspan="8" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu báo cáo.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function printReportsPdf() {
        const r = extState.reports || {};
        const buildings = Array.isArray(r.buildingOperations) ? r.buildingOperations : [];
        const year = (window.KtxApp && typeof KtxApp.getSelectedAcademicYear === 'function')
            ? (KtxApp.getSelectedAcademicYear() || 'Hiện tại')
            : 'Hiện tại';
        const now = new Date();
        const dateStr = `Ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')} năm ${now.getFullYear()}`;
        const esc = escapeHtmlValue;

        const rowsHtml = buildings.map((b, idx) => `
            <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td><strong>${esc(b.name || '')}</strong></td>
                <td style="text-align:center;">${Number(b.rooms || 0)}</td>
                <td style="text-align:center;">${Number(b.beds || 0)}</td>
                <td style="text-align:center;">${Number(b.occupied || 0)}</td>
                <td style="text-align:center;">${Number(b.vacant || 0)}</td>
                <td style="text-align:center;">${esc(b.rate ?? 0)}%</td>
                <td style="text-align:right;">${esc(b.revenue || '0 đ')}</td>
            </tr>
        `).join('');

        const html = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8" />
    <title>Báo cáo thống kê KTX UTC2 - ${esc(year)}</title>
    <style>
        @page { size: A4; margin: 16mm 14mm; }
        body { font-family: "Times New Roman", Times, serif; color: #111827; font-size: 13px; line-height: 1.45; margin: 0; }
        .header-grid { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
        .org { text-align: center; width: 48%; }
        .org-title { font-weight: bold; font-size: 12px; text-transform: uppercase; }
        .org-sub { font-weight: bold; font-size: 12px; margin-top: 2px; }
        .motto { text-align: center; width: 48%; }
        .motto-top { font-weight: bold; font-size: 12px; text-transform: uppercase; }
        .motto-sub { font-weight: bold; font-size: 12px; text-decoration: underline; margin-top: 2px; }
        h1 { text-align: center; font-size: 17px; text-transform: uppercase; margin: 16px 0 4px; }
        .subtitle { text-align: center; font-style: italic; font-size: 13px; margin-bottom: 16px; }
        h2 { font-size: 14px; text-transform: uppercase; margin: 14px 0 8px; }
        .summary-grid { display: table; width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .summary-row { display: table-row; }
        .summary-cell { display: table-cell; width: 25%; border: 1px solid #334155; padding: 8px 10px; }
        .summary-label { font-size: 11px; color: #475569; text-transform: uppercase; }
        .summary-val { font-size: 15px; font-weight: bold; margin-top: 3px; }
        table.data { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12.5px; }
        table.data th, table.data td { border: 1px solid #334155; padding: 6px 8px; }
        table.data th { background: #f1f5f9; font-weight: bold; text-align: center; }
        .signatures { display: flex; justify-content: space-between; margin-top: 28px; text-align: center; }
        .sig-box { width: 42%; }
        .sig-title { font-weight: bold; text-transform: uppercase; font-size: 12.5px; }
        .sig-note { font-style: italic; font-size: 11.5px; margin-top: 2px; }
        .sig-space { height: 64px; }
    </style>
</head>
<body>
    <div class="header-grid">
        <div class="org">
            <div class="org-title">TRƯỜNG ĐH GIAO THÔNG VẬN TẢI PHÂN HIỆU TP.HCM</div>
            <div class="org-sub">BAN QUẢN LÝ KÝ TÚC XÁ</div>
        </div>
        <div class="motto">
            <div class="motto-top">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div class="motto-sub">Độc lập - Tự do - Hạnh phúc</div>
        </div>
    </div>

    <h1>Báo cáo thống kê vận hành &amp; doanh thu ký túc xá</h1>
    <div class="subtitle">Năm học: ${esc(year)} &nbsp;·&nbsp; ${dateStr}</div>

    <h2>I. Tổng hợp chỉ số vận hành</h2>
    <div class="summary-grid">
        <div class="summary-row">
            <div class="summary-cell">
                <div class="summary-label">Tổng chỗ ở quy hoạch</div>
                <div class="summary-val">${Number(r.totalBeds || 0).toLocaleString('vi-VN')} giường (${Number(r.totalRooms || 0)} phòng)</div>
            </div>
            <div class="summary-cell">
                <div class="summary-label">Sinh viên đang ở</div>
                <div class="summary-val">${Number(r.occupiedBeds || 0).toLocaleString('vi-VN')} SV</div>
            </div>
            <div class="summary-cell">
                <div class="summary-label">Tỷ lệ lấp đầy</div>
                <div class="summary-val">${esc(r.occupancyRate ?? 0)}% (Còn ${Number(r.vacantBeds || 0)} chỗ)</div>
            </div>
            <div class="summary-cell">
                <div class="summary-label">Doanh thu dự kiến kỳ</div>
                <div class="summary-val">${Number(r.totalRevenue || 0).toLocaleString('vi-VN')} đ</div>
            </div>
        </div>
    </div>

    <h2>II. Ma trận vận hành &amp; công suất theo tòa nhà</h2>
    <table class="data">
        <thead>
            <tr>
                <th style="width:36px;">STT</th>
                <th>Tòa nhà</th>
                <th>Số phòng</th>
                <th>Tổng giường</th>
                <th>Đang ở</th>
                <th>Còn trống</th>
                <th>Lấp đầy</th>
                <th>Doanh thu kỳ</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="text-align:center;">Không có dữ liệu tòa nhà</td></tr>'}
        </tbody>
    </table>

    <div class="signatures">
        <div class="sig-box">
            <div class="sig-title">Người lập biểu</div>
            <div class="sig-note">(Ký và ghi rõ họ tên)</div>
            <div class="sig-space"></div>
        </div>
        <div class="sig-box">
            <div class="sig-note">${dateStr}</div>
            <div class="sig-title">Trưởng Ban Quản lý KTX</div>
            <div class="sig-note">(Ký, đóng dấu)</div>
            <div class="sig-space"></div>
        </div>
    </div>
</body>
</html>`;

        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) {
            if (window.KtxApp && typeof KtxApp.showToast === 'function') {
                KtxApp.showToast('Trình duyệt đang chặn cửa sổ bật lên (pop-up). Vui lòng cho phép để in báo cáo A4.', 'error');
            }
            return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 250);
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
    function reRender(skipFetch = true) {
        const content = document.getElementById('mainContent');
        if (!content) return;
        renderView(KtxApp.getCurrentTab ? KtxApp.getCurrentTab() : 'lop-khoa', content, KtxApp.getState ? KtxApp.getState() : null, skipFetch);
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

    document.addEventListener('click', (e) => {
        if (!e.target?.closest?.('[data-classes-menu="true"]')) {
            closeClassesActionMenus();
        }
        if (!e.target?.closest?.('[data-utilities-menu="true"]')) {
            closeUtilitiesActionMenus();
        }
        if (!e.target?.closest?.('[data-tickets-menu="true"]')) {
            closeTicketsActionMenus();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllExtendedActionMenus();
        }
    });
    window.addEventListener('scroll', closeAllExtendedActionMenus, true);
    window.addEventListener('resize', closeAllExtendedActionMenus);

    return {
        hasView,
        renderView,
        // Class methods
        filterClassesSearch,
        filterClassesFaculty,
        filterClassesCohort,
        resetClassesFilters,
        exportClassesCsv,
        openAddClassModal,
        submitAddClass,
        viewClassDetail,
        toggleClassesActionMenu,
        closeClassesActionMenus,
        // Utility methods
        setUtilitySubTab,
        toggleUtilitiesActionMenu,
        closeUtilitiesActionMenus,
        filterUtilitySearch,
        filterUtilityBuilding,
        filterUtilityStatus,
        resetUtilityFilters,
        openUtilityRecordDrawer,
        submitRecordUtility,
        openFinalizeUtilityModal,
        submitFinalizeUtility,
        exportUtilitiesCsv,
        // Service catalog & approval workflow methods
        loadServices,
        filterServiceRegStatus,
        viewServiceRegistrationDetail,
        openServiceFormModal,
        submitServiceForm,
        deleteService,
        approveServiceRegistration,
        openRejectServiceModal,
        submitRejectServiceRegistration,
        // Invoice methods
        toggleInvoicesActionMenu,
        closeInvoicesActionMenus,
        filterInvoiceSearch,
        filterInvoiceCategory,
        filterInvoiceStatus,
        resetInvoiceFilters,
        sendInvoice,
        viewInvoiceDetail,
        openInvoiceProofReview,
        confirmInvoiceProofApprove,
        submitInvoiceProofApprove,
        openInvoiceRejectProof,
        submitInvoiceProofReject,
        printInvoice,
        printInvoiceWindow,
        printInvoiceDirect,
        openCreateInvoiceModal,
        submitCreateInvoice,
        // Ticket methods
        toggleTicketsActionMenu,
        closeTicketsActionMenus,
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
        // Violation methods
        filterViolationSearch,
        filterViolationStatus,
        filterViolationPenaltyType,
        resetViolationFilters,
        openCreateViolationModal,
        submitCreateViolation,
        // Staff methods
        filterStaffSearch,
        filterStaffStatus,
        filterStaffRole,
        resetStaffFilters,
        toggleStaffStatus,
        openAddStaffModal,
        submitAddStaff,
        // Report methods
        exportReportsCsv,
        printReportsPdf,
        closeModal,
        // Shared component
        renderMetricCard
    };
})();
