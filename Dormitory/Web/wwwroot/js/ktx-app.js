/**
 * KTX UTC2 - Application Frontend Controller
 * Connects directly to C# .NET Core Web APIs
 */

const KtxApp = (function () {
    // Automatically include the selected year on every business API request.
    // Authentication and the year selector's own API stay unscoped.
    const nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
        const requestUrl = input instanceof Request ? input.url : input;
        if (typeof requestUrl !== 'string') return nativeFetch(input, init);

        const url = new URL(requestUrl, window.location.origin);
        if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
            return nativeFetch(input, init);
        }

        const path = url.pathname.toLowerCase();
        if (path === '/api/namhoc' || path.startsWith('/api/auth/')) {
            return nativeFetch(input, init);
        }

        const academicYear = localStorage.getItem('ktx_user_selected_academic_year');
        if (academicYear && !url.searchParams.has('academicYear')) {
            url.searchParams.set('academicYear', academicYear);
        }
        return input instanceof Request
            ? nativeFetch(new Request(url.toString(), input), init)
            : nativeFetch(url.toString(), init);
    };

    // State
    const state = {
        currentUser: null,
        currentTab: 'dashboard',
        authMode: 'login',
        resetUsername: null,
        resetCode: null,
        darkMode: false,
        selectedAcademicYear: localStorage.getItem('ktx_user_selected_academic_year') || '',
        academicYears: [],
        isMobileMenuOpen: false,
        isSearchOpen: false,
        toasts: [],
        
        // Data caches
        dashboardSummary: null,
        students: [],
        contracts: [],
        contractBuildings: [],
        contractBuildingsLoaded: false,
        applications: [],
        rooms: [],

        // Active filters
        admissionsTab: 'pending',
        admissionsPriority: '',
        admissionsSearch: '',

        contractsTab: 'valid',
        contractsBuilding: 'all',
        contractsSearch: '',

        studentsCohort: '',
        studentsMajor: '',
        studentsStatus: 'all',
        studentsSearch: '',

        roomsViewMode: 'roster',
        roomsBuilding: 'all',
        roomsFloor: 'all',
        roomsRoomNumber: 'all',
        roomsSearch: '',

        // Active modals data
        selectedStudent: null,
        selectedContract: null,
        selectedApplication: null,
        selectedRoom: null
    };

    let otpResendTimer = null;
    let otpResendSeconds = 54;
    let isResendingOtp = false;
    let activeViewRenderId = 0;

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]);
    }

    // Helper: Currency format
    function formatVND(amount, compact = false) {
        if (!amount && amount !== 0) return '0 đ';
        if (compact) {
            if (amount >= 1000000000) {
                return (amount / 1000000000).toFixed(2).replace('.', ',') + ' Tỷ đ';
            }
            if (amount >= 1000000) {
                return (amount / 1000000).toFixed(0) + ' Tr đ';
            }
        }
        return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
    }

    function getUserInitial(name) {
        return String(name || '?').trim().charAt(0).toLocaleUpperCase('vi-VN');
    }

    // Toast Notifications
    function showToast(message, type = 'info') {
        const id = Date.now();
        const toast = { id, message, type };
        state.toasts.push(toast);
        renderToasts();
        setTimeout(() => {
            state.toasts = state.toasts.filter(t => t.id !== id);
            renderToasts();
        }, 3000);
    }

    function renderToasts() {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        container.innerHTML = state.toasts.map(t => `
            <div class="px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 pointer-events-auto transition-all animate-bounce-in ${
                t.type === 'success' ? 'bg-emerald-600 text-white' :
                t.type === 'error' ? 'bg-red-600 text-white' :
                'bg-[#0B2A5B] text-white'
            }">
                <span class="material-symbols-outlined text-[18px]">
                    ${t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
                </span>
                <span>${t.message}</span>
            </div>
        `).join('');
    }

    // Dark Mode Toggle
    function toggleDarkMode() {
        state.darkMode = !state.darkMode;
        if (state.darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('utc2_dorm_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('utc2_dorm_theme', 'light');
        }
        renderTopNav();
        renderSidebar();
    }

    function initTheme() {
        const saved = localStorage.getItem('utc2_dorm_theme');
        state.darkMode = saved === 'dark';
        if (state.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    // User Authentication
    async function initUser() {
        const saved = localStorage.getItem('utc2_current_user');
        if (saved) {
            try {
                state.currentUser = JSON.parse(saved);
                if (state.currentUser?.isDevelopmentGuest) {
                    state.currentUser = null;
                    localStorage.removeItem('utc2_current_user');
                }
            } catch (e) {
                state.currentUser = null;
                localStorage.removeItem('utc2_current_user');
            }
        } else {
            state.currentUser = null;
        }
    }

    async function login(username, password) {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const json = await res.json();
            if (json.success && json.data) {
                state.currentUser = json.data;
                localStorage.setItem('utc2_current_user', JSON.stringify(json.data));
                showToast('Đăng nhập thành công! Đang chuyển hướng...', 'success');
                setTimeout(() => {
                    if (window.location.pathname.toLowerCase().includes('/account/login')) {
                        window.location.href = '/';
                    } else {
                        navigate('dashboard');
                    }
                }, 300);
                return true;
            } else {
                showToast(json.message || 'Tên đăng nhập hoặc mật khẩu không chính xác', 'error');
                return false;
            }
        } catch (e) {
            console.error('Login error:', e);
            showToast('Lỗi kết nối máy chủ SQL Server', 'error');
            return false;
        }
    }

    function logout() {
        state.currentUser = null;
        localStorage.removeItem('utc2_current_user');
        showToast('Đã đăng xuất khỏi hệ thống', 'info');
        if (!window.location.pathname.toLowerCase().includes('/account/login')) {
            window.location.href = '/Account/Login';
        } else {
            renderApp();
        }
    }

    // Navigation
    function navigate(tab) {
        state.currentTab = tab;
        state.isMobileMenuOpen = false;
        renderApp(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function fetchApiData(url) {
        const response = await fetch(url);
        const json = await response.json();
        if (!response.ok || !json.success) {
            throw new Error(json.message || `Yêu cầu thất bại (${response.status})`);
        }
        return json.data;
    }

    function reportLoadFailure(message, error) {
        console.error(message, error);
        showToast(`${message}: ${error.message || 'lỗi không xác định'}`, 'error');
    }

    // Data Loaders from C# API
    async function loadDashboard() {
        const academicYear = state.selectedAcademicYear;
        if (!academicYear) {
            state.dashboardSummary = null;
            return;
        }
        try {
            const query = `?academicYear=${encodeURIComponent(academicYear)}`;
            const summary = await fetchApiData(`/api/dashboard/summary${query}`);
            if (state.selectedAcademicYear === academicYear) state.dashboardSummary = summary;
        } catch (e) {
            if (state.selectedAcademicYear === academicYear) {
                state.dashboardSummary = null;
                reportLoadFailure('Không tải được tổng quan', e);
            }
        }
    }

    async function loadStudents() {
        const academicYear = state.selectedAcademicYear;
        if (!academicYear) {
            state.students = [];
            return;
        }
        try {
            const students = await fetchApiData('/api/sinhvien');
            if (state.selectedAcademicYear === academicYear) state.students = students;
        } catch (e) {
            if (state.selectedAcademicYear === academicYear) {
                state.students = [];
                reportLoadFailure('Không tải được danh sách sinh viên', e);
            }
        }
    }

    async function loadContracts() {
        const academicYear = state.selectedAcademicYear;
        if (!academicYear) {
            state.contracts = [];
            return;
        }
        try {
            const query = new URLSearchParams();
            query.set('academicYear', academicYear);
            const contracts = await fetchApiData(`/api/hopdong?${query.toString()}`);
            if (state.selectedAcademicYear === academicYear) state.contracts = contracts;
        } catch (e) {
            if (state.selectedAcademicYear === academicYear) state.contracts = [];
        }
    }

    async function loadContractBuildings() {
        const academicYear = state.selectedAcademicYear;
        if (!academicYear) {
            state.contractBuildings = [];
            state.contractBuildingsLoaded = false;
            return;
        }
        if (state.contractBuildingsLoaded) return;
        try {
            const buildings = await fetchApiData('/api/toanha');
            if (state.selectedAcademicYear === academicYear) {
                state.contractBuildings = buildings;
                state.contractBuildingsLoaded = true;
            }
        } catch (error) {
            if (state.selectedAcademicYear === academicYear) {
                state.contractBuildings = [];
                state.contractBuildingsLoaded = true;
                reportLoadFailure('danh sách tòa nhà', error);
            }
        }
    }

    async function loadApplications() {
        const academicYear = state.selectedAcademicYear;
        if (!academicYear) {
            state.applications = [];
            return;
        }
        try {
            const applications = await fetchApiData('/api/dondangky');
            if (state.selectedAcademicYear === academicYear) state.applications = applications;
        } catch (e) {
            if (state.selectedAcademicYear === academicYear) {
                state.applications = [];
                reportLoadFailure('Không tải được danh sách đơn đăng ký', e);
            }
        }
    }

    async function loadRooms() {
        const academicYear = state.selectedAcademicYear;
        if (!academicYear) {
            state.rooms = [];
            return;
        }
        try {
            const rooms = await fetchApiData('/api/phong');
            if (state.selectedAcademicYear === academicYear) state.rooms = rooms;
        } catch (e) {
            if (state.selectedAcademicYear === academicYear) {
                state.rooms = [];
                reportLoadFailure('Không tải được sơ đồ phòng', e);
            }
        }
    }

    // View Renderers
    function renderApp(showPageLoader = false) {
        const root = document.getElementById('appRoot');
        if (!root) return;

        if (!state.currentUser) {
            root.innerHTML = renderLoginView();
            initLoginHandlers();
            return;
        }

        root.innerHTML = `
            <div class="min-h-screen bg-[#F4F5F7] dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] transition-colors duration-200">
                <!-- Sidebar -->
                <div id="sidebarContainer"></div>

                <!-- Main Layout -->
                <div class="lg:pl-64 flex flex-col min-h-screen">
                    <!-- TopNav -->
                    <div id="topNavContainer"></div>

                    <!-- Dynamic Main Content -->
                    <main id="mainContent" class="flex-1 pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
                        <div class="flex items-center justify-center p-12 text-slate-400">
                            <span class="inline-block w-6 h-6 border-2 border-[#0B2A5B] border-t-transparent rounded-full animate-spin"></span>
                        </div>
                    </main>
                </div>

                <!-- Global Modals Container -->
                <div id="modalsContainer"></div>

                <!-- Command Palette -->
                <div id="commandPaletteContainer"></div>

                <!-- Toast Container -->
                <div id="toastContainer" class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"></div>
            </div>
        `;

        renderSidebar();
        renderTopNav();
        renderActiveView(showPageLoader);
        renderToasts();
    }

    function renderSidebar() {
        const container = document.getElementById('sidebarContainer');
        if (!container || !state.currentUser) return;

        const navGroups = [
            {
                title: 'TỔNG QUAN',
                items: [{ id: 'dashboard', label: 'Dashboard', icon: 'grid_view' }]
            },
            {
                title: 'ĐĂNG KÝ & NỘI TRÚ',
                items: [
                    { id: 'don-dang-ky', label: 'Đợt & Đơn đăng ký', icon: 'how_to_reg' },
                    { id: 'hop-dong', label: 'Quản lý Hợp đồng', icon: 'edit_document' }
                ]
            },
            {
                title: 'SINH VIÊN',
                items: [
                    { id: 'sinh-vien', label: 'Hồ sơ Sinh viên', icon: 'badge' },
                    { id: 'lop-khoa', label: 'Lớp & Khoa viện', icon: 'school' }
                ]
            },
            {
                title: 'CƠ SỞ VẬT CHẤT',
                items: [
                    { id: 'phong-va-giuong', label: 'Sơ đồ Phòng & Giường', icon: 'domain' }
                ]
            },
            {
                title: 'TÀI CHÍNH & VẬN HÀNH',
                items: [
                    { id: 'dien-nuoc-dich-vu', label: 'Điện nước & Dịch vụ', icon: 'water_drop' },
                    { id: 'hoa-don', label: 'Hóa đơn & Thu phí', icon: 'receipt_long' },
                    { id: 'sua-chua', label: 'Yêu cầu sửa chữa', icon: 'build' },
                    { id: 'vi-pham', label: 'Vi phạm & Kỷ luật', icon: 'gavel' }
                ]
            },
            {
                title: 'HỆ THỐNG',
                items: [
                    { id: 'nhan-vien-tai-khoan', label: 'Nhân viên & Tài khoản', icon: 'manage_accounts' },
                    { id: 'bao-cao', label: 'Báo cáo thống kê', icon: 'bar_chart' }
                ]
            }
        ];

        container.innerHTML = `
            ${state.isMobileMenuOpen ? `
                <div class="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity" onclick="KtxApp.toggleMobileMenu()"></div>
            ` : ''}

            <aside class="fixed left-0 top-0 bottom-0 w-64 bg-[#081B33] border-r border-[#152a4a] z-50 flex flex-col justify-between overflow-hidden transition-transform duration-300 lg:translate-x-0 ${
                state.isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }">
                <div class="flex flex-col h-full bg-[#0a1628]">
                    <!-- Header Logo -->
                    <div class="h-16 px-4 flex items-center justify-between border-b border-white/5 shrink-0">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-8 h-8 flex items-center justify-center shrink-0">
                                <img src="/images/utc2-logo.png" alt="Logo Trường Đại học Giao thông Vận tải" class="w-full h-full object-contain" />
                            </div>
                            <div class="flex flex-col min-w-0">
                                <span class="font-bold text-sm text-white tracking-wide truncate leading-tight">KTX UTC2</span>
                                <span class="text-[10px] text-slate-400 font-semibold tracking-wider uppercase truncate mt-0.5">PHÂN HIỆU TP.HCM</span>
                            </div>
                        </div>
                        <button onclick="KtxApp.toggleMobileMenu()" class="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <!-- Navigation Items -->
                    <div class="flex-1 overflow-y-auto px-3 py-3 space-y-4">
                        ${navGroups.map(group => `
                            <div class="space-y-1">
                                <div class="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    ${group.title}
                                </div>
                                ${group.items.map(item => {
                                    const isActive = state.currentTab === item.id;
                                    return `
                                        <button type="button" onclick="KtxApp.navigate('${item.id}')" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                                            isActive
                                                ? 'bg-[#0e3b78] text-white shadow-sm font-semibold'
                                                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white font-medium'
                                        }">
                                            <span class="material-symbols-outlined text-[19px] ${isActive ? 'text-white' : 'text-slate-400'}">${item.icon}</span>
                                            <span class="text-[13px] truncate">${item.label}</span>
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                        `).join('')}
                    </div>

                    <!-- Bottom User Profile Card -->
                    <div class="p-3 bg-[#0a1628] shrink-0 border-t border-white/5">
                        <div class="flex items-center justify-between p-2 rounded-xl bg-[#0f213b] border border-white/5">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <span class="w-8 h-8 rounded-full shrink-0 ring-1 ring-blue-400/40 bg-blue-900 text-white flex items-center justify-center text-xs font-bold" aria-label="${state.currentUser.name}">${getUserInitial(state.currentUser.name)}</span>
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-white truncate">${state.currentUser.name}</div>
                                    <div class="text-[10px] text-blue-300 truncate">${state.currentUser.role}</div>
                                </div>
                            </div>
                            <button onclick="KtxApp.logout()" class="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors" title="Đăng xuất">
                                <span class="material-symbols-outlined text-[18px]">logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        `;
    }

    function renderTopNav() {
        const container = document.getElementById('topNavContainer');
        if (!container || !state.currentUser) return;

        container.innerHTML = `
            <header class="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/90 dark:bg-[#121826]/90 backdrop-blur-xl border-b border-[#E4E7EC] dark:border-[#232B3B] z-40 flex items-center gap-3 px-4 lg:px-8 shadow-xs transition-colors">
                <!-- Left: Mobile hamburger & Search bar -->
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <button type="button" onclick="KtxApp.toggleMobileMenu()" class="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span class="material-symbols-outlined text-[22px]">menu</span>
                    </button>

                    <!-- Global Search Bar -->
                    <div onclick="KtxApp.openSearch()" class="flex items-center gap-2.5 flex-1 min-w-0 h-10 px-3.5 rounded-xl bg-slate-100/80 dark:bg-[#0B0F1A] border border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 cursor-pointer hover:border-[#0B2A5B] dark:hover:border-blue-500/50 transition-all shadow-2xs group">
                        <span class="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-[#0B2A5B] dark:group-hover:text-blue-400 transition-colors">search</span>
                        <span class="text-[13px] text-slate-400 dark:text-slate-400 truncate flex-1 select-none">Tìm kiếm (phòng, SV, hợp đồng...)</span>
                    </div>
                </div>

                <!-- Right: Academic year, Dark mode, Notifications, Profile -->
                <div class="flex items-center gap-2 sm:gap-3 ml-3 shrink-0">
                    <!-- Academic Year Selector -->
                    <div class="relative hidden md:flex items-center gap-2 shrink-0">
                        <select id="academicYearSelect" onchange="KtxApp.changeAcademicYear(this.value)" class="h-10 px-3 rounded-xl bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-700 dark:text-slate-200 text-xs font-semibold max-w-[220px]">
                            <option value="">Chọn năm học</option>
                        </select>
                        <button type="button" onclick="KtxApp.toggleAcademicYearMenu()" class="h-10 px-3 rounded-xl bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-700 dark:text-slate-200 text-xs font-semibold">Quản lý năm học</button>
                    </div>

                    <!-- Dark Mode Button -->
                    <button type="button" onclick="KtxApp.toggleDarkMode()" class="w-10 h-10 rounded-xl bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center shadow-2xs" title="Đổi chế độ sáng/tối">
                        <span class="material-symbols-outlined text-[19px]">${state.darkMode ? 'light_mode' : 'dark_mode'}</span>
                    </button>

                    <!-- Notifications Dropdown -->
                    <div class="relative">
                        <button type="button" onclick="KtxApp.toggleNotifications()" class="relative w-10 h-10 rounded-xl bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center shadow-2xs" title="Thông báo hệ thống">
                            <span class="material-symbols-outlined text-[20px]">notifications</span>
                            <span id="notifBadge" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        </button>
                        <div id="notificationDropdown" class="hidden absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-2xl p-3 z-50 animate-fade-in">
                            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                <span class="text-xs font-bold text-slate-800 dark:text-white">Thông báo</span>
                                <button onclick="KtxApp.closeNotifications()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[16px]">close</span></button>
                            </div>
                            <div id="notificationList" class="max-h-72 overflow-y-auto py-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                                <div class="text-center text-slate-400 py-4">Đang tải...</div>
                            </div>
                        </div>
                    </div>

                    <!-- Profile Dropdown & Switcher -->
                    <div class="relative pl-1">
                        <button type="button" onclick="KtxApp.toggleProfileMenu()" class="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <span class="w-8 h-8 rounded-full ring-1 ring-slate-200 dark:ring-slate-700 bg-blue-100 dark:bg-blue-900 text-[#0B2A5B] dark:text-white flex items-center justify-center text-xs font-bold" aria-label="${state.currentUser.name}">${getUserInitial(state.currentUser.name)}</span>
                            <div class="hidden sm:flex flex-col text-left">
                                <span class="text-xs font-bold text-slate-900 dark:text-white leading-tight max-w-[140px] truncate">${state.currentUser.name}</span>
                                <span class="text-[10px] text-slate-400">${state.currentUser.role}</span>
                            </div>
                            <span class="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
                        </button>

                        <div id="profileDropdown" class="hidden absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-2xl p-2 z-50 animate-fade-in">
                            <div class="border-t border-slate-100 dark:border-slate-800 pt-1">
                                <button onclick="KtxApp.logout()" class="w-full text-left px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[16px]">logout</span>
                                    <span>Đăng xuất</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        `;

        renderAcademicYearOptions();
    }

    function renderAcademicYearOptions() {
        const select = document.getElementById('academicYearSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Chọn năm học</option>' + state.academicYears.map(year => {
            const code = getAcademicYearCode(year);
            const label = `${getAcademicYearLabel(year)} (${code})`;
            return `<option value="${escapeHtml(code)}">${escapeHtml(label)}</option>`;
        }).join('');
        select.value = state.selectedAcademicYear;
    }

    // Login View (Exact 2-column split layout from demo)
    function renderLoginView() {
        return `
            <div class="min-h-screen flex flex-col lg:flex-row bg-[#F4F5F7] dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] transition-colors duration-200">
                <!-- CỘT TRÁI (55%): Hình ảnh KTX, Gradient thương hiệu -->
                <div class="relative lg:w-[55%] min-h-[420px] lg:min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden bg-[#081F45]" style="background-color:#081F45">
                    <img src="/images/login-campus.png" alt="" aria-hidden="true" class="absolute inset-0 z-0 w-full h-full object-cover object-center opacity-45" />
                    <div class="absolute inset-0 z-[1] bg-[#081F45]/45"></div>

                    <!-- Header Bên Trái: Logo UTC2 -->
                    <div class="relative z-10 flex items-center justify-between">
                        <div class="flex items-center space-x-3.5 min-w-0">
                            <div class="w-12 h-12 shrink-0 flex items-center justify-center">
                                <img src="/images/utc2-logo.png" alt="Logo Trường Đại học Giao thông Vận tải" class="w-full h-full object-contain rounded-full" />
                            </div>
                            <div class="whitespace-nowrap">
                                <h1 class="text-xl font-bold text-white flex items-center gap-2 mb-0.5">
                                    <span>KTX UTC2</span>
                                    <span class="text-[11px] font-semibold uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded-full border border-white/20">Portal</span>
                                </h1>
                                <p class="text-xs text-blue-200/80 font-medium">Ký túc xá · Phân hiệu TP.HCM</p>
                            </div>
                        </div>

                        <button type="button" onclick="KtxApp.toggleDarkMode()" class="relative z-10 w-9 h-9 rounded-lg bg-white/10 border border-white/15 text-white hover:bg-white/20 transition flex items-center justify-center">
                            <span class="material-symbols-outlined text-[18px]">${state.darkMode ? 'light_mode' : 'dark_mode'}</span>
                        </button>
                    </div>

                    <!-- Tiêu đề lớn & Giá trị cốt lõi -->
                    <div class="relative z-10 my-auto py-12 max-w-xl">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-blue-200 font-medium mb-6">
                            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Cổng thông tin Ký túc xá trực tuyến</span>
                        </div>
                        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                            <span class="block pb-1.5">Hệ thống Quản lý</span>
                            <span class="block">Ký túc xá</span>
                        </h2>
                        <p class="text-base sm:text-lg text-blue-200/90 font-medium tracking-wide max-w-lg">
                            Phân hiệu Trường Đại học Giao thông Vận tải tại TP. Hồ Chí Minh
                        </p>
                    </div>

                </div>

                <!-- CỘT PHẢI (45%): Form Đăng nhập -->
                <div class="lg:w-[45%] flex flex-col justify-center px-6 sm:px-12 xl:px-16 py-12 ${state.authMode === 'otp' ? 'bg-[#FCFDFE]' : 'bg-white dark:bg-[#121826]'} transition-colors duration-200">
                    <div class="w-full max-w-md mx-auto">
                        ${state.authMode === 'reset' ? `
                        <div class="mb-8">
                            <h2 class="text-2xl sm:text-3xl font-bold text-[#0B0F1A] dark:text-white">Đặt lại mật khẩu</h2>
                            <p class="mt-2 text-sm text-[#667085] dark:text-slate-400">Mã xác nhận đã được kiểm tra. Hãy nhập mật khẩu mới của bạn.</p>
                        </div>
                        <form id="resetForm" class="space-y-5" onsubmit="event.preventDefault(); KtxApp.submitResetForm();">
                            <div>
                                <label class="block text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-300 mb-1.5">Mật khẩu mới</label>
                                <div class="relative">
                                    <input type="password" id="resetPassword" required autocomplete="new-password" class="w-full pl-4 pr-11 py-2.5 text-sm bg-white dark:bg-[#0B0F1A] border border-[#E4E7EC] dark:border-[#232B3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2A5B] text-[#0B0F1A] dark:text-[#E8EAF0]" />
                                    <button type="button" onclick="KtxApp.togglePasswordVisibility('resetPassword', this)" aria-label="Hiện mật khẩu" aria-pressed="false" class="absolute inset-y-0 right-0 flex items-center px-3 text-[#98A2B3] hover:text-[#0B2A5B] dark:hover:text-blue-300 transition">
                                        <span class="material-symbols-outlined text-[19px]">visibility</span>
                                    </button>
                                </div>
                            </div>
                            <button type="submit" class="w-full py-3 px-4 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-sm shadow-sm transition">Đổi mật khẩu</button>
                            <div class="mt-4 text-center text-xs text-[#667085] dark:text-slate-400">
                                <button type="button" onclick="KtxApp.setAuthMode('login'); KtxApp.renderApp();" class="font-semibold text-[#0B2A5B] dark:text-[#4C7DD9] hover:underline">Quay lại đăng nhập</button>
                            </div>
                        </form>
                        ` : state.authMode === 'otp' ? `
                        <div class="w-full max-w-md mx-auto text-[#0B0F1A]">
                            <button type="button" onclick="KtxApp.setAuthMode('forgot')" class="inline-flex items-center gap-1.5 mb-7 text-sm font-medium text-[#526783] hover:text-[#0B2A5B] transition">
                                <span class="material-symbols-outlined text-[18px]">arrow_back</span>
                                <span>Quay lại</span>
                            </button>
                            <div class="mb-7">
                                <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B0F1A]">Nhập mã OTP</h2>
                                <p class="mt-2 text-sm leading-6 text-[#667085]">Mã xác nhận 6 số gửi đến: <span class="font-semibold text-[#0B2A5B]">${escapeHtml(state.resetUsername)}</span></p>
                            </div>
                            <form id="verifyForm" class="space-y-6" onsubmit="event.preventDefault(); KtxApp.submitVerifyForm();">
                                <div>
                                    <label class="block text-xs font-semibold uppercase tracking-[0.12em] text-[#526783] mb-2.5">Mã xác thực</label>
                                    <div class="flex items-center justify-between gap-2" onpaste="KtxApp.handleOtpPaste(event)">
                                        ${Array.from({ length: 6 }, (_, index) => `
                                            <input type="text" inputmode="numeric" maxlength="${index === 0 ? 6 : 1}" pattern="${index === 0 ? '[0-9]{1,6}' : '[0-9]'}" required ${index === 0 ? 'autocomplete="one-time-code"' : 'autocomplete="off"'} aria-label="Chữ số ${index + 1} của mã OTP" data-otp-digit="${index}" oninput="KtxApp.handleOtpInput(${index}, this)" onkeydown="KtxApp.handleOtpKeydown(${index}, event)" placeholder="•" class="flex-1 min-w-0 h-14 rounded-xl border border-[#E3E9F1] bg-white text-center text-lg font-semibold text-[#0B0F1A] placeholder:text-[#CBD5E1] focus:border-[#0B2A5B] focus:outline-none focus:ring-1 focus:ring-[#0B2A5B] transition" />
                                        `).join('')}
                                    </div>
                                </div>
                                <div class="flex items-center justify-between -mt-1 text-xs">
                                    <span class="text-[#718096]">Chưa nhận được mã?</span>
                                    <button id="otpResendButton" type="button" onclick="KtxApp.submitResendCode()" disabled class="font-semibold text-[#0B2A5B] disabled:cursor-not-allowed disabled:opacity-50">
                                        <span id="otpResendLabel">Gửi lại mã</span> <span id="otpCountdown" class="font-normal text-[#94A3B8]">(54s)</span>
                                    </button>
                                </div>
                                <button type="submit" class="w-full h-12 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-sm shadow-[0_2px_5px_rgba(11,42,91,0.24)] transition inline-flex items-center justify-center gap-2">
                                    <span>Xác nhận OTP</span>
                                    <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </button>
                            </form>
                            <div class="mt-7 border-t border-[#EDF0F4] pt-4 flex justify-center" aria-hidden="true">
                                <span class="w-1 h-1 rounded-full bg-[#D9E0E8]"></span>
                            </div>
                        </div>
                        ` : state.authMode === 'forgot' ? `
                        <div class="mb-8">
                            <h2 class="text-2xl sm:text-3xl font-bold text-[#0B0F1A] dark:text-white">Quên mật khẩu</h2>
                        </div>
                        <form id="forgotForm" class="space-y-5" onsubmit="event.preventDefault(); KtxApp.submitForgotForm();">
                            <div>
                                <label class="block text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-300 mb-1.5">Tên đăng nhập / Email</label>
                                <input type="text" id="forgotUsername" value="${escapeHtml(state.resetUsername)}" required autocomplete="username" class="w-full px-4 py-2.5 text-sm bg-white dark:bg-[#0B0F1A] border border-[#E4E7EC] dark:border-[#232B3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2A5B] text-[#0B0F1A] dark:text-[#E8EAF0]" />
                            </div>
                            <button type="submit" class="w-full py-3 px-4 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-sm shadow-sm transition">Gửi mã xác nhận</button>
                            <div class="mt-4 text-center text-xs text-[#667085] dark:text-slate-400">
                                <button type="button" onclick="KtxApp.setAuthMode('login'); KtxApp.renderApp();" class="font-semibold text-[#0B2A5B] dark:text-[#4C7DD9] hover:underline">Quay lại đăng nhập</button>
                            </div>
                        </form>
                        ` : `
                        <div class="mb-8">
                            <h2 class="text-2xl sm:text-3xl font-bold text-[#0B0F1A] dark:text-white">Đăng nhập</h2>
                        </div>

                        <form id="loginForm" class="space-y-5">
                            <div>
                                <label class="block text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-300 mb-1.5">Tên đăng nhập / Mã số</label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
                                        <span class="material-symbols-outlined text-[18px]">person</span>
                                    </div>
                                    <input type="text" id="loginUsername" required autocomplete="username" placeholder="Nhập tài khoản hoặc mã số" class="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-[#0B0F1A] border border-[#E4E7EC] dark:border-[#232B3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2A5B] text-[#0B0F1A] dark:text-[#E8EAF0]" />
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-300 mb-1.5">Mật khẩu</label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
                                        <span class="material-symbols-outlined text-[18px]">key</span>
                                    </div>
                                    <input type="password" id="loginPassword" required autocomplete="current-password" placeholder="Nhập mật khẩu" class="w-full pl-10 pr-11 py-2.5 text-sm bg-white dark:bg-[#0B0F1A] border border-[#E4E7EC] dark:border-[#232B3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2A5B] text-[#0B0F1A] dark:text-[#E8EAF0]" />
                                    <button type="button" onclick="KtxApp.togglePasswordVisibility('loginPassword', this)" aria-label="Hiện mật khẩu" aria-pressed="false" class="absolute inset-y-0 right-0 flex items-center px-3 text-[#98A2B3] hover:text-[#0B2A5B] dark:hover:text-blue-300 transition">
                                        <span class="material-symbols-outlined text-[19px]">visibility</span>
                                    </button>
                                </div>
                            </div>

                            <div class="flex items-center justify-between pt-1">
                                <label class="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" checked class="w-4 h-4 rounded border-[#E4E7EC] text-[#0B2A5B] focus:ring-[#0B2A5B]" />
                                    <span class="text-xs text-[#667085] dark:text-slate-400 font-medium">Ghi nhớ đăng nhập</span>
                                </label>
                                <button type="button" onclick="KtxApp.setAuthMode('forgot'); KtxApp.renderApp();" class="text-xs font-semibold text-[#0B2A5B] dark:text-[#4C7DD9] hover:underline">Quên mật khẩu?</button>
                            </div>

                            <button type="submit" id="loginSubmitBtn" class="w-full py-3 px-4 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] active:scale-[0.99] text-white font-semibold text-sm shadow-sm transition flex items-center justify-center gap-2" style="background-color:#0B2A5B">
                                <span>Đăng nhập</span>
                                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                        </form>

                    </div>
                </div>
                        `}
                    </div>
                </div>

                <!-- Registration Guide Modal -->
                <div id="registrationModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B]">
                        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">school</span>
                                <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Hướng dẫn Đăng ký nội trú KTX UTC2</h3>
                            </div>
                            <button onclick="KtxApp.closeRegistrationModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <span class="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <div class="py-4 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            <p>Sinh viên chính quy có nguyện vọng lưu trú tại Ký túc xá UTC2 Phân hiệu TP.HCM thực hiện đăng ký theo hướng dẫn của Ban Quản lý:</p>
                            <ul class="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-200">
                                <li><strong>Hồ sơ ưu tiên:</strong> Bản scan Giấy chứng nhận hộ nghèo, con thương binh hoặc học sinh vùng sâu (KV1).</li>
                                <li><strong>Điểm xét tuyển:</strong> Điểm thi tuyển sinh hoặc điểm rèn luyện & GPA gần nhất.</li>
                                <li><strong>Thời gian xử lý:</strong> Ban Quản lý duyệt và phản hồi trong vòng 24 - 48 giờ.</li>
                            </ul>
                        </div>
                        <div class="flex justify-end pt-2">
                            <button type="button" onclick="KtxApp.closeRegistrationModal()" class="px-4 py-2 rounded-xl bg-[#0B2A5B] text-white font-semibold text-xs hover:bg-[#143F8C] transition-colors">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="modalsContainer"></div>
            <div id="toastContainer" class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"></div>
        `;
    }

    function initLoginHandlers() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        form.onsubmit = async (event) => {
            event.preventDefault();
            await handleLoginForm();
        };
    }

    let isLoggingIn = false;

    async function handleLoginForm() {
        if (isLoggingIn) return false;

        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';

        if (!username || !password) {
            showToast('Vui lòng nhập đầy đủ tài khoản và mật khẩu', 'error');
            return false;
        }

        isLoggingIn = true;
        const btn = document.getElementById('loginSubmitBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span><span>Đang xác thực...</span>';
        }

        try {
            const ok = await login(username, password);
            return ok;
        } finally {
            isLoggingIn = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>Đăng nhập</span><span class="material-symbols-outlined text-[18px]">arrow_forward</span>';
            }
        }
    }

    // Active View Router
    function renderPageLoading() {
        return `
            <div class="min-h-[60vh] flex flex-col items-center justify-center text-center" role="status" aria-live="polite">
                <div class="relative flex h-14 w-14 items-center justify-center">
                    <span class="absolute inset-0 rounded-full border-[3px] border-[#DCE5F0] border-t-[#0B2A5B] animate-spin"></span>
                    <span class="material-symbols-outlined text-[22px] text-[#0B2A5B]">apartment</span>
                </div>
                <h2 class="mt-5 text-base font-semibold text-slate-800 dark:text-white">Đang tải trang...</h2>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Vui lòng chờ trong giây lát</p>
                <div class="mt-5 h-1 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div class="page-loading-sweep h-full w-1/2 rounded-full bg-[#0B2A5B]"></div>
                </div>
            </div>
        `;
    }

    async function renderActiveView(showPageLoader = false) {
        const content = document.getElementById('mainContent');
        if (!content) return;
        const renderId = ++activeViewRenderId;
        const tab = state.currentTab;
        const startedAt = performance.now();
        if (showPageLoader) content.innerHTML = renderPageLoading();

        let viewHtml = '';

        if (tab === 'dashboard') {
            await loadDashboard();
            viewHtml = renderDashboardView();
        } else if (tab === 'don-dang-ky') {
            await loadApplications();
            viewHtml = renderAdmissionsView();
        } else if (tab === 'hop-dong') {
            await Promise.all([loadContracts(), loadContractBuildings()]);
            viewHtml = renderContractsView();
        } else if (tab === 'sinh-vien') {
            await loadStudents();
            viewHtml = renderStudentsView();
        } else if (tab === 'phong-va-giuong') {
            await loadRooms();
            viewHtml = renderRoomsView();
        } else if (window.KtxExtendedViews && window.KtxExtendedViews.hasView(tab)) {
            const viewContainer = document.createElement('div');
            await window.KtxExtendedViews.renderView(tab, viewContainer, state);
            viewHtml = viewContainer.innerHTML;
        } else {
            // Secondary fallback tabs
            viewHtml = `
                <div class="bg-white dark:bg-[#121826] rounded-2xl p-8 shadow-xs border border-slate-200 dark:border-[#232B3B] text-center space-y-4">
                    <div class="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-[#0B2A5B] dark:text-blue-400 mx-auto flex items-center justify-center">
                        <span class="material-symbols-outlined text-[32px]">dataset</span>
                    </div>
                    <h2 class="text-xl font-bold text-slate-900 dark:text-white capitalize">${tab.replace(/-/g, ' ')}</h2>
                    <p class="text-xs text-slate-500 max-w-md mx-auto">
                        Mô-đun đang đồng bộ dữ liệu thời gian thực từ cơ sở dữ liệu SQL Server DO_AN_QUAN_LY_KTX. Bạn có thể sử dụng các phân hệ chính: <strong>Hồ sơ sinh viên</strong>, <strong>Quản lý hợp đồng</strong>, <strong>Đợt & đơn đăng ký</strong>, và <strong>Sơ đồ buồng phòng</strong>.
                    </p>
                    <div class="pt-2">
                        <button type="button" onclick="KtxApp.navigate('dashboard')" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all">
                            Quay lại Dashboard Tổng quan
                        </button>
                    </div>
                </div>
            `;
        }

        if (showPageLoader) {
            const remainingLoadTime = 550 - (performance.now() - startedAt);
            if (remainingLoadTime > 0) {
                await new Promise(resolve => setTimeout(resolve, remainingLoadTime));
            }
        }

        if (renderId !== activeViewRenderId || tab !== state.currentTab) return;
        content.innerHTML = showPageLoader ? `<div class="page-content-enter">${viewHtml}</div>` : viewHtml;
    }

    // 1. Dashboard View Renderer
    function renderDashboardView() {
        const d = state.dashboardSummary || {
            totalStudents: 0,
            totalCapacity: 0,
            occupancyPercent: 0,
            totalFeeRevenue: 0,
            debtAmount: 0,
            collectedPercent: 0,
            pendingApplicationsCount: 0,
            repairRequestsCount: 0,
            zoneOccupancies: [],
            urgentTasks: []
        };

        const zoneOccupancies = d.zoneOccupancies || [];
        const urgentTasks = d.urgentTasks || [];
        const activeTaskCount = urgentTasks.filter(t => !t.completed).length;

        return `
            <div class="flex flex-col w-full space-y-6">
                <!-- 1. Hero Welcome Banner -->
                <section class="page-title-banner relative overflow-hidden">
                    <div class="dashboard-title-content relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-white font-headline">Tổng quan KTX</h1>
                            <p class="text-blue-200/80 text-xs">Hệ thống quản lý thời gian thực Ký túc xá Phân hiệu UTC2 TP.HCM</p>
                        </div>
                        <div class="page-title-actions flex items-center gap-2.5 shrink-0 flex-wrap">
                            <button type="button" onclick="KtxApp.openNewContractModal()" class="h-10 px-4 rounded-xl bg-white text-[#0b2a5b] font-semibold text-xs hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[18px]">post_add</span>
                                <span>Lập hợp đồng mới</span>
                            </button>
                            <button type="button" onclick="KtxApp.exportReport()" class="h-10 px-4 rounded-xl bg-white text-[#0b2a5b] font-semibold text-xs hover:bg-blue-50 transition-colors flex items-center gap-1.5 border border-white">
                                <span class="material-symbols-outlined text-[18px]">ios_share</span>
                                <span>Báo cáo nhanh</span>
                            </button>
                        </div>
                    </div>
                </section>

                <!-- 2. Hàng 4 Chỉ số KPI Cốt Lõi -->
                <section class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- KPI 1 -->
                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">SINH VIÊN NỘI TRÚ</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#0b2a5b] dark:text-blue-400">
                                <span class="material-symbols-outlined text-[18px]">badge</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${new Intl.NumberFormat('vi-VN').format(d.totalStudents)} <span class="text-sm font-normal text-slate-500">sinh viên</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-[#375ba9] dark:text-blue-400 font-semibold">${new Intl.NumberFormat('vi-VN').format(d.totalCapacity)} giường · ${d.occupancyPercent}%</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <!-- KPI 2 -->
                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">THU PHÍ THÁNG</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#375ba9] dark:text-blue-400">
                                <span class="material-symbols-outlined text-[18px]">payments</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-[#0b2a5b] dark:text-blue-300 tracking-tight">
                                ${formatVND(d.totalFeeRevenue, true)}
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <div class="flex min-w-0 items-center gap-2">
                                <span class="text-[#375ba9] dark:text-blue-400 font-semibold">Đã thu ${d.collectedPercent}%</span>
                                <span class="text-red-600 dark:text-red-400 font-semibold">Nợ ${formatVND(d.debtAmount, true)}</span>
                            </div>
                            <span class="material-symbols-outlined shrink-0 text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <!-- KPI 3 -->
                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">ĐƠN CHỜ DUYỆT</span>
                            <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <span class="material-symbols-outlined text-[18px]">how_to_reg</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${d.pendingApplicationsCount} <span class="text-sm font-normal text-slate-500">hồ sơ</span>
                            </div>
                        </div>
                        <div class="text-xs text-[#375ba9] dark:text-blue-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 font-semibold">
                            <span>Ưu tiên xét duyệt</span>
                            <span class="material-symbols-outlined shrink-0 text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <!-- KPI 4 -->
                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">YÊU CẦU SỬA CHỮA</span>
                            <div class="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
                                <span class="material-symbols-outlined text-[18px]">build</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-red-600 dark:text-red-400 tracking-tight">
                                ${d.repairRequestsCount} <span class="text-sm font-normal text-slate-500">yêu cầu</span>
                            </div>
                        </div>
                        <div class="text-xs text-red-600 dark:text-red-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 font-semibold">
                            <span>Điều phối kỹ thuật</span>
                            <span class="material-symbols-outlined shrink-0 text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>
                </section>

                <!-- 3. Khối Công suất & Tác vụ khẩn -->
                <section class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <!-- Left: Công suất & Tài chính (7 cols) -->
                    <div class="lg:col-span-7 space-y-6">
                        <!-- Card Công suất lấp đầy -->
                        <div class="bg-white dark:bg-[#121826] p-6 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[#375ba9] dark:text-blue-400 text-[20px]">analytics</span>
                                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Công suất lấp đầy phân khu</h2>
                                </div>
                                <span class="text-xs text-[#0B2A5B] dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200/40">Tổng: ${d.occupancyPercent}%</span>
                            </div>

                            <div class="space-y-4 pt-1">
                                ${zoneOccupancies.length === 0 ? `
                                    <div class="min-h-[112px] flex items-center justify-center text-xs text-slate-400">Không có dữ liệu.</div>
                                ` : zoneOccupancies.map(z => `
                                    <div class="space-y-1.5">
                                        <div class="flex items-center justify-between text-xs">
                                            <span class="font-semibold text-slate-800 dark:text-slate-200">${z.zoneName}</span>
                                            <span class="font-bold text-[#0B2A5B] dark:text-blue-400">${z.percent}% <span class="font-normal text-slate-400 text-[11px]">(${z.occupied}/${z.total})</span></span>
                                        </div>
                                        <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                            <div class="bg-[#0B2A5B] dark:bg-blue-500 h-full rounded-full transition-all duration-500" style="width: ${z.percent}%"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Card Thu phí -->
                        <div class="bg-white dark:bg-[#121826] p-6 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[#375ba9] dark:text-blue-400 text-[20px]">account_balance_wallet</span>
                                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Tiến độ thu tài chính & Dịch vụ</h2>
                                </div>
                                <span class="text-xs text-[#375ba9] dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md">Tỷ lệ thu ${d.collectedPercent}%</span>
                            </div>
                            <div class="grid grid-cols-3 gap-3 text-center">
                                <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-100 dark:border-[#232B3B]">
                                    <span class="text-[11px] text-slate-500 block uppercase tracking-wider font-semibold">Kế hoạch</span>
                                    <span class="text-xl font-bold text-slate-900 dark:text-white mt-1 block">${formatVND(d.totalFeeRevenue + d.debtAmount, true)}</span>
                                </div>
                                <div class="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                                    <span class="text-[11px] text-[#0B2A5B] dark:text-blue-400 block uppercase tracking-wider font-semibold">Đã thu</span>
                                    <span class="text-xl font-bold text-[#0B2A5B] dark:text-blue-300 mt-1 block">${formatVND(d.totalFeeRevenue, true)}</span>
                                </div>
                                <div class="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40">
                                    <span class="text-[11px] text-red-600 block uppercase tracking-wider font-semibold">Còn nợ</span>
                                    <span class="text-xl font-bold text-red-600 mt-1 block">${formatVND(d.debtAmount, true)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Cần xử lý ngay (5 cols) -->
                    <div class="lg:col-span-5 bg-white dark:bg-[#121826] p-6 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
                        <div class="space-y-3">
                            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div class="flex items-center gap-2">
                                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Cần xử lý ngay</h2>
                                    <span class="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-300 flex items-center justify-center text-xs font-bold">${activeTaskCount}</span>
                                </div>
                                <button type="button" onclick="KtxApp.navigate('don-dang-ky')" class="text-xs text-[#375ba9] dark:text-blue-400 font-semibold hover:underline flex items-center gap-1">
                                    Xem tất cả <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                                </button>
                            </div>

                            <div class="divide-y divide-slate-100 dark:divide-slate-800/80 pt-1">
                                ${urgentTasks.length === 0 ? `
                                    <div class="min-h-[112px] flex items-center justify-center text-xs text-slate-400">Không có dữ liệu.</div>
                                ` : urgentTasks.map(task => `
                                    <div class="py-3 flex items-center justify-between gap-3 transition-opacity ${task.completed ? 'opacity-40 line-through' : ''}">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                task.tagType === 'error' ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400' :
                                                task.tagType === 'warning' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' :
                                                'bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-400'
                                            }">
                                                <span class="material-symbols-outlined text-[19px]">${task.icon}</span>
                                            </div>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-2 flex-wrap">
                                                    <span class="text-xs font-bold text-slate-900 dark:text-white truncate">${task.title}</span>
                                                    <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                        task.tagType === 'error' ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300' :
                                                        task.tagType === 'warning' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' :
                                                        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                    }">${task.tag}</span>
                                                </div>
                                                <span class="text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">${task.subtitle}</span>
                                            </div>
                                        </div>

                                        <button type="button" ${task.completed ? 'disabled' : ''} onclick="KtxApp.actionTask('${task.id}', '${task.type}')" class="h-9 w-[92px] shrink-0 inline-flex items-center justify-center rounded-lg text-xs font-semibold text-center transition-colors ${
                                            task.tagType === 'error' ? 'bg-red-600 text-white hover:bg-red-700' :
                                            task.tagType === 'warning' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' :
                                            'bg-[#0B2A5B] text-white hover:bg-[#143F8C]'
                                        } disabled:opacity-50">
                                            ${task.completed ? 'Đã xong' : task.actionText}
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }

    // 2. Admissions View Renderer (Đợt & Đơn đăng ký)
    function renderAdmissionsView() {
        const apps = state.applications || [];
        const approvedCount = apps.filter(a => a.status === 'Đã duyệt').length;
        const pendingCount = apps.filter(a => a.status === 'Chờ duyệt').length;
        const rejectedCount = apps.filter(a => a.status === 'Bị từ chối').length;
        let filtered = apps;

        if (state.admissionsTab !== 'all') {
            if (state.admissionsTab === 'pending') filtered = filtered.filter(a => a.status === 'Chờ duyệt');
            else if (state.admissionsTab === 'approved') filtered = filtered.filter(a => a.status === 'Đã duyệt');
            else if (state.admissionsTab === 'rejected') filtered = filtered.filter(a => a.status === 'Bị từ chối');
        }

        if (state.admissionsPriority) {
            filtered = filtered.filter(a => a.priorityCategory.toLowerCase().includes(state.admissionsPriority.toLowerCase()));
        }

        if (state.admissionsSearch.trim()) {
            const query = state.admissionsSearch.trim().toLowerCase();
            filtered = filtered.filter(a =>
                [a.applicationCode, a.studentName, a.mssv, a.major, a.priorityCategory, a.roomPreference]
                    .some(value => String(value || '').toLowerCase().includes(query))
            );
        }

        return `
            <div class="flex flex-col w-full space-y-6">
                <!-- Header -->
                <div class="page-title-banner flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Đợt & Đơn đăng ký</h1>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Xét duyệt các hồ sơ đăng ký lưu trú trong database</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button type="button" onclick="KtxApp.exportReport('Danh sách đơn đăng ký lưu trú')" class="h-10 px-4 rounded-xl bg-white dark:bg-[#1E293B] hover:bg-slate-50 text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-2xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[18px] text-slate-500">file_download</span>
                            <span>Xuất danh sách</span>
                        </button>
                        <button type="button" onclick="KtxApp.openCreateRoundModal()" class="h-10 px-4 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[18px]">add</span>
                            <span>Tạo đợt mới</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metrics (Image 1 Standard Design) -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">TỔNG HỒ SƠ ĐĂNG KÝ</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#0b2a5b] dark:text-blue-400">
                                <span class="material-symbols-outlined text-[18px]">assignment</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${apps.length} <span class="text-sm font-normal text-slate-500">hồ sơ</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-[#375ba9] dark:text-blue-400 font-semibold">Tổng hồ sơ đăng ký trong cơ sở dữ liệu</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">HỒ SƠ ĐÃ DUYỆT</span>
                            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <span class="material-symbols-outlined text-[18px]">how_to_reg</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${approvedCount} <span class="text-sm font-normal text-slate-500">hồ sơ</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Đã được xét duyệt</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">CHỜ XÉT DUYỆT</span>
                            <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <span class="material-symbols-outlined text-[18px]">pending_actions</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-[#0b2a5b] dark:text-blue-300 tracking-tight">
                                ${pendingCount} <span class="text-sm font-normal text-slate-500">đơn chờ</span>
                            </div>
                        </div>
                        <div class="text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 font-semibold">
                            <span>Hồ sơ đang chờ xử lý</span>
                            <span class="material-symbols-outlined shrink-0 text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">TỪ CHỐI / HỦY</span>
                            <div class="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                                <span class="material-symbols-outlined text-[18px]">cancel</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${rejectedCount} <span class="text-sm font-normal text-slate-500">hồ sơ</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-slate-600 dark:text-slate-400 font-semibold">Hồ sơ bị từ chối</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>
                </div>

                <!-- Tabs & Filter Bar -->
                <div class="page-filter-bar flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
                    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                        <button type="button" onclick="KtxApp.setAdmissionsTab('pending')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                            state.admissionsTab === 'pending' ? 'bg-[#0B2A5B] text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }">
                            <span>Chờ duyệt</span>
                            <span class="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">${pendingCount}</span>
                        </button>
                        <button type="button" onclick="KtxApp.setAdmissionsTab('approved')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                            state.admissionsTab === 'approved' ? 'bg-[#0B2A5B] text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }">
                            <span>Đã duyệt</span>
                            <span class="text-[11px] text-slate-400">${approvedCount}</span>
                        </button>
                        <button type="button" onclick="KtxApp.setAdmissionsTab('rejected')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                            state.admissionsTab === 'rejected' ? 'bg-[#0B2A5B] text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }">
                            <span>Bị từ chối</span>
                            <span class="text-[11px] text-slate-400">${rejectedCount}</span>
                        </button>
                        <button type="button" onclick="KtxApp.setAdmissionsTab('all')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                            state.admissionsTab === 'all' ? 'bg-[#0B2A5B] text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }">Tất cả (${apps.length})</button>
                    </div>

                    <div class="page-filter-search flex-1 flex items-center gap-2 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B]">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                        <input type="text" value="${state.admissionsSearch}" oninput="KtxApp.setAdmissionsSearch(this.value)" placeholder="Tìm mã đơn, tên sinh viên, MSSV..." class="min-w-0 flex-1 bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                    </div>

                    <div class="flex items-center gap-2 flex-wrap shrink-0">
                        <select onchange="KtxApp.setAdmissionsPriority(this.value)" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                            <option value="">Diện: Tất cả</option>
                            <option value="chính sách">Chính sách</option>
                            <option value="hộ nghèo">Hộ nghèo</option>
                            <option value="vùng sâu">Vùng sâu</option>
                            <option value="điểm">Điểm cao (>27đ)</option>
                        </select>
                    </div>
                </div>

                <!-- Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                                    <th class="py-3.5 px-4">Mã đơn</th>
                                    <th class="py-3.5 px-4">Sinh viên</th>
                                    <th class="py-3.5 px-4">Diện ưu tiên</th>
                                    <th class="py-3.5 px-4">Nguyện vọng</th>
                                    <th class="py-3.5 px-4 text-center">Điểm ĐX</th>
                                    <th class="py-3.5 px-4">Nộp lúc</th>
                                    <th class="py-3.5 px-4 text-right">Duyệt 1-chạm</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                ${filtered.map(app => `
                                    <tr onclick="KtxApp.inspectCandidate('${app.id}')" class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group">
                                        <td class="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">${app.applicationCode}</td>
                                        <td class="py-3.5 px-4">
                                            <div class="flex items-center gap-3 min-w-[200px]">
                                                <span class="w-8 h-8 rounded-full shrink-0 ring-1 ring-slate-200 bg-blue-100 text-[#0B2A5B] flex items-center justify-center text-xs font-bold">${getUserInitial(app.studentName)}</span>
                                                <div class="flex flex-col min-w-0">
                                                    <span class="font-semibold text-slate-900 dark:text-white group-hover:text-[#0B2A5B] dark:group-hover:text-blue-400 transition-colors truncate">${app.studentName}</span>
                                                    <span class="text-[11px] text-slate-400 font-mono">${app.mssv} • ${app.major}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="py-3.5 px-4">
                                            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-300">${app.priorityCategory}</span>
                                        </td>
                                        <td class="py-3.5 px-4">
                                            <div class="flex items-center gap-1.5 font-medium">
                                                <span class="material-symbols-outlined text-[16px] text-[#375ba9]">apartment</span>
                                                <span>${app.roomPreference}</span>
                                            </div>
                                        </td>
                                        <td class="py-3.5 px-4 text-center font-bold text-base text-[#0B2A5B] dark:text-blue-400 font-headline">${app.scoreDX ?? '—'}</td>
                                        <td class="py-3.5 px-4 text-slate-500 text-[11px]">${app.submittedAt}</td>
                                        <td class="py-3.5 px-4 text-right" onclick="event.stopPropagation()">
                                            ${app.status === 'Chờ duyệt' ? `
                                                <div class="flex items-center justify-end gap-1.5">
                                                    <button type="button" onclick="KtxApp.approveApp('${app.id}', '${app.studentName}')" class="h-8 px-3 rounded-lg bg-[#0B2A5B] text-white hover:bg-[#143F8C] text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs">
                                                        <span class="material-symbols-outlined text-[16px]">check</span>
                                                        <span>Duyệt</span>
                                                    </button>
                                                    <button type="button" onclick="KtxApp.rejectApp('${app.id}', '${app.studentName}')" class="h-8 w-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center">
                                                        <span class="material-symbols-outlined text-[16px]">close</span>
                                                    </button>
                                                </div>
                                            ` : `
                                                <span class="px-2.5 py-1 rounded-lg text-[11px] font-semibold ${app.status === 'Đã duyệt' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">${app.status}</span>
                                            `}
                                        </td>
                                    </tr>
                                `).join('')}
                                ${filtered.length === 0 ? '<tr><td colspan="7" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // 3. Contracts View Renderer (Quản lý hợp đồng)
    function renderContractsView() {
        const contracts = state.contracts || [];
        const validCount = contracts.filter(c => c.status === 'Hiệu lực').length;
        const expiringCount = contracts.filter(c => c.status === 'Sắp hết hạn').length;
        const endedCount = contracts.filter(c => c.status === 'Đã thanh lý').length;
        let filtered = contracts;

        if (state.contractsTab === 'valid') filtered = filtered.filter(c => c.status === 'Hiệu lực');
        else if (state.contractsTab === 'expiring') filtered = filtered.filter(c => c.status === 'Sắp hết hạn');
        else if (state.contractsTab === 'ended') filtered = filtered.filter(c => c.status === 'Đã thanh lý');

        if (state.contractsBuilding !== 'all') {
            filtered = filtered.filter(c => c.buildingId === state.contractsBuilding);
        }

        if (state.contractsSearch) {
            const q = state.contractsSearch.toLowerCase();
            filtered = filtered.filter(c => c.contractNumber.toLowerCase().includes(q) || c.studentName.toLowerCase().includes(q) || c.mssv.includes(q));
        }

        return `
            <div class="flex flex-col w-full space-y-6">
                <!-- Header -->
                <div class="page-title-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Quản lý Hợp đồng</h1>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Theo dõi thời hạn lưu trú, tiền cọc bảo lãnh và gia hạn tự động</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button type="button" onclick="KtxApp.setContractsTab('expiring')" class="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-2xs border border-slate-200 dark:border-slate-700">
                            <span class="material-symbols-outlined text-[18px] text-[#375ba9] dark:text-blue-400">update</span>
                            <span>Xem sắp hết hạn (${expiringCount})</span>
                        </button>
                        <button type="button" onclick="KtxApp.openNewContractModal()" class="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs transition-all shadow-sm">
                            <span class="material-symbols-outlined text-[18px]">add_circle</span>
                            <span>Lập hợp đồng mới</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metrics (Image 1 Standard Design) -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">HỢP ĐỒNG ĐANG HIỆU LỰC</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#0b2a5b] dark:text-blue-400">
                                <span class="material-symbols-outlined text-[18px]">verified_user</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${validCount.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">hợp đồng</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-[#375ba9] dark:text-blue-400 font-semibold">Đang hiệu lực</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">SẮP HẾT HẠN (≤ 15 NGÀY)</span>
                            <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <span class="material-symbols-outlined text-[18px]">warning</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                                ${expiringCount.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">hợp đồng</span>
                            </div>
                        </div>
                        <div class="text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 font-semibold">
                            <span>Ưu tiên gia hạn ngay</span>
                            <span class="material-symbols-outlined shrink-0 text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">ĐÃ THANH LÝ TRẢ PHÒNG</span>
                            <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                                <span class="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${endedCount.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">hợp đồng</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-slate-600 dark:text-slate-400 font-semibold">Đã thanh lý hợp đồng</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">TỔNG TIỀN CỌC GIỮ</span>
                            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <span class="material-symbols-outlined text-[18px]">savings</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-[#0b2a5b] dark:text-emerald-400 tracking-tight">
                                1,62 <span class="text-sm font-normal text-slate-500">tỷ đồng</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Tài khoản bảo đảm VietinBank</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>
                </div>

                <!-- Filters Strip -->
                <div class="page-filter-bar bg-white dark:bg-[#121826] rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                            <button type="button" onclick="KtxApp.setContractsTab('valid')" class="px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 ${
                                state.contractsTab === 'valid' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                            }">
                                <span>Đang hiệu lực</span>
                                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">${validCount}</span>
                            </button>
                            <button type="button" onclick="KtxApp.setContractsTab('expiring')" class="px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 ${
                                state.contractsTab === 'expiring' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                            }">
                                <span>Sắp hết hạn</span>
                                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">${expiringCount}</span>
                            </button>
                            <button type="button" onclick="KtxApp.setContractsTab('ended')" class="px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 ${
                                state.contractsTab === 'ended' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                            }">
                                <span>Đã thanh lý</span>
                                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">${endedCount}</span>
                            </button>
                            <button type="button" onclick="KtxApp.setContractsTab('all')" class="px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                                state.contractsTab === 'all' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                            }">Tất cả</button>
                        </div>

                        <div class="flex items-center gap-2.5 flex-1 min-w-0">
                            <input type="text" oninput="KtxApp.setContractsSearch(this.value)" placeholder="Số HĐ hoặc tên/MSSV..." class="flex-1 min-w-0 h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs text-slate-800 dark:text-white focus:outline-none" />
                            <select onchange="KtxApp.setContractsBuilding(this.value)" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                <option value="all">Tất cả Tòa</option>
                                ${(state.contractBuildings || []).map(building => {
                                    const buildingId = building.id ?? building.code ?? building.maToaNha ?? building.MaToaNha;
                                    const buildingName = building.name ?? building.tenToaNha ?? building.TenToaNha ?? buildingId;
                                    if (!buildingId) return '';
                                    return `<option value="${escapeHtml(buildingId)}" ${state.contractsBuilding === buildingId ? 'selected' : ''}>${escapeHtml(buildingName)}</option>`;
                                }).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                                    <th class="py-3.5 px-4">Số HĐ</th>
                                    <th class="py-3.5 px-4">Sinh viên</th>
                                    <th class="py-3.5 px-4">Phòng / Giường</th>
                                    <th class="py-3.5 px-4">Thời hạn</th>
                                    <th class="py-3.5 px-4 text-right">Tiền phòng/tháng</th>
                                    <th class="py-3.5 px-4 text-right">Tiền cọc</th>
                                    <th class="py-3.5 px-4 text-center">Trạng thái</th>
                                    <th class="py-3.5 px-4 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                ${filtered.map(c => `
                                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${c.status === 'Sắp hết hạn' ? 'bg-amber-50/30' : ''}">
                                        <td class="py-3.5 px-4 font-mono font-semibold text-[#0B2A5B] dark:text-blue-400">${c.contractNumber}</td>
                                        <td class="py-3.5 px-4">
                                            <div class="flex items-center gap-2.5">
                                                <div class="w-8 h-8 rounded-full bg-blue-100 text-[#0B2A5B] flex items-center justify-center text-xs font-bold shrink-0">${c.avatarInitials}</div>
                                                <div class="flex flex-col min-w-0">
                                                    <span class="font-semibold text-slate-900 dark:text-white truncate">${c.studentName}</span>
                                                    <span class="text-[11px] text-slate-400 font-mono">MSSV: ${c.mssv}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="py-3.5 px-4">
                                            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium">
                                                <span class="material-symbols-outlined text-[16px] text-[#375ba9]">meeting_room</span>
                                                <span class="font-bold text-[#0B2A5B] dark:text-white">${c.roomNumber}</span>
                                                <span class="text-slate-400">·</span>
                                                <span>${c.bedNumber}</span>
                                            </div>
                                        </td>
                                        <td class="py-3.5 px-4">
                                            <div class="flex flex-col">
                                                <span class="font-medium text-slate-800 dark:text-slate-200">${c.startDate} → ${c.endDate}</span>
                                                <span class="text-[11px] ${c.remainingDays <= 15 && c.remainingDays > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}">
                                                    ${c.remainingDays > 0 ? `Còn ${c.remainingDays} ngày` : 'Đã tất toán'}
                                                </span>
                                            </div>
                                        </td>
                                        <td class="py-3.5 px-4 text-right font-mono font-semibold">${formatVND(c.monthlyFee)}</td>
                                        <td class="py-3.5 px-4 text-right font-mono font-semibold">
                                            <div>${formatVND(c.depositAmount)}</div>
                                            <span class="text-[10px] font-bold uppercase text-blue-600">${c.depositStatus}</span>
                                        </td>
                                        <td class="py-3.5 px-4 text-center whitespace-nowrap">
                                            <span class="inline-flex min-w-max items-center justify-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                c.status === 'Hiệu lực' ? 'bg-emerald-50 text-emerald-700' :
                                                c.status === 'Sắp hết hạn' ? 'bg-amber-50 text-amber-700' :
                                                'bg-slate-100 text-slate-600'
                                            }">${c.status}</span>
                                        </td>
                                        <td class="py-3.5 px-4 text-center">
                                            <div class="flex items-center justify-center gap-1">
                                                <button type="button" onclick="KtxApp.openPrintModal('${c.contractNumber}')" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold" title="In hợp đồng">In HĐ</button>
                                                ${c.status !== 'Đã thanh lý' ? `
                                                    <button type="button" onclick="KtxApp.renewContract('${c.contractNumber}')" class="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0B2A5B] hover:bg-[#0B2A5B] hover:text-white text-xs font-semibold transition-all">Gia hạn</button>
                                                    <button type="button" onclick="KtxApp.liquidateContract('${c.contractNumber}')" class="px-2.5 py-1 rounded-lg hover:bg-red-50 text-red-600 text-xs font-medium">Thanh lý</button>
                                                ` : ''}
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${filtered.length === 0 ? '<tr><td colspan="8" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // 4. Students View Renderer (Hồ sơ Sinh viên)
    function renderStudentsView() {
        const students = state.students || [];
        const cohorts = [...new Set(students.map(student => student.cohort).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'vi'));
        const majors = [...new Set(students.map(student => student.major).filter(major => major && major !== '—'))]
            .sort((a, b) => a.localeCompare(b, 'vi'));
        const residents = students.filter(s => s.residenceStatus === 'Đang ở');
        const maleResidents = residents.filter(s => s.gender === 'Nam').length;
        const femaleResidents = residents.filter(s => s.gender === 'Nữ').length;
        const nonResidentStudents = students.filter(s => s.residenceStatus !== 'Đang ở').length;
        let filtered = students;

        if (state.studentsCohort) {
            filtered = filtered.filter(s => s.cohort.toLowerCase().includes(state.studentsCohort.toLowerCase()));
        }
        if (state.studentsMajor) {
            filtered = filtered.filter(s => s.major.toLowerCase().includes(state.studentsMajor.toLowerCase()));
        }
        if (state.studentsSearch) {
            const q = state.studentsSearch.toLowerCase();
            filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.mssv.includes(q) || s.cccd.includes(q) || s.roomNumber.toLowerCase().includes(q));
        }

        return `
            <div class="flex flex-col w-full space-y-6">
                <!-- Header -->
                <div class="page-title-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Hồ sơ Sinh viên</h1>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quản lý thông tin, tình trạng nội trú và hồ sơ sinh viên</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button type="button" onclick="KtxApp.importStudentsExcel()" class="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-white dark:bg-[#1E293B] hover:bg-slate-50 text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-2xs border border-slate-200 dark:border-slate-700">
                            <span class="material-symbols-outlined text-[18px] text-slate-500">upload_file</span>
                            <span>Nhập Excel</span>
                        </button>
                        <button type="button" onclick="KtxApp.openCreateStudentModal()" class="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs transition-all shadow-sm">
                            <span class="material-symbols-outlined text-[18px]">person_add</span>
                            <span>Tiếp nhận SV mới</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metrics (Image 1 Standard Design) -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">TỔNG SINH VIÊN NỘI TRÚ</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#0b2a5b] dark:text-blue-400">
                                <span class="material-symbols-outlined text-[18px]">groups</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${residents.length.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">sinh viên</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-[#375ba9] dark:text-blue-400 font-semibold">Đang ở theo hợp đồng hiện có</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">NAM SINH (KHU A)</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#375ba9] dark:text-blue-400">
                                <span class="material-symbols-outlined text-[18px]">male</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${maleResidents.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">sinh viên</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-[#375ba9] dark:text-blue-400 font-semibold">Nam sinh đang ở</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">NỮ SINH (KHU B)</span>
                            <div class="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center text-pink-600 dark:text-pink-400">
                                <span class="material-symbols-outlined text-[18px]">female</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${femaleResidents.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">sinh viên</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-pink-600 dark:text-pink-400 font-semibold">Nữ sinh đang ở</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">CHƯA NỘI TRÚ</span>
                            <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <span class="material-symbols-outlined text-[18px]">event_busy</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                                ${nonResidentStudents.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">sinh viên</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-amber-600 dark:text-amber-400 font-semibold">Chưa có hợp đồng lưu trú hiệu lực</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>
                </div>

                <!-- Filters Strip -->
                <div class="page-filter-bar p-4 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
                    <input type="text" oninput="KtxApp.setStudentsSearch(this.value)" placeholder="Tìm tên, MSSV, CCCD, số phòng..." class="w-full xl:flex-1 min-w-0 h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs text-slate-800 dark:text-white focus:outline-none" />
                    
                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                        <select onchange="KtxApp.setStudentsCohort(this.value)" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                            <option value="">Tất cả Khóa</option>
                            ${cohorts.map(cohort => `<option value="${cohort}" ${state.studentsCohort === cohort ? 'selected' : ''}>Khóa ${cohort}</option>`).join('')}
                        </select>
                        <select onchange="KtxApp.setStudentsMajor(this.value)" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                            <option value="">Tất cả Khoa viện</option>
                            ${majors.map(major => `<option value="${major}" ${state.studentsMajor === major ? 'selected' : ''}>${major}</option>`).join('')}
                        </select>
                        <button type="button" onclick="KtxApp.resetStudentsFilters()" class="p-2.5 rounded-xl border border-slate-200 dark:border-[#232B3B] bg-slate-50 dark:bg-[#0B0F1A] text-slate-500 hover:text-slate-900 transition-colors" title="Đặt lại bộ lọc">
                            <span class="material-symbols-outlined text-[18px]">filter_alt_off</span>
                        </button>
                    </div>
                </div>

                <!-- Table -->
                <div class="rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                                    <th class="py-3.5 px-4">MSSV</th>
                                    <th class="py-3.5 px-4">Họ và tên</th>
                                    <th class="py-3.5 px-4">Khoa / Lớp</th>
                                    <th class="py-3.5 px-4">Phòng & Giường</th>
                                    <th class="py-3.5 px-4">Điện thoại</th>
                                    <th class="py-3.5 px-4">Quê quán</th>
                                    <th class="py-3.5 px-4">Thanh toán</th>
                                    <th class="py-3.5 px-4">Trạng thái</th>
                                    <th class="py-3.5 px-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                ${filtered.map(s => `
                                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                        <td class="py-3.5 px-4 font-mono font-semibold text-[#0B2A5B] dark:text-blue-400">${s.mssv}</td>
                                        <td class="py-3.5 px-4">
                                            <div class="flex items-center gap-2.5">
                                                <span class="w-8 h-8 rounded-full shrink-0 ring-1 ring-slate-200 bg-blue-100 text-[#0B2A5B] flex items-center justify-center text-xs font-bold">${getUserInitial(s.name)}</span>
                                                <div class="flex flex-col min-w-0">
                                                    <span class="font-semibold text-slate-900 dark:text-white truncate">${s.name}</span>
                                                    <span class="text-[11px] text-slate-400">${s.className}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="py-3.5 px-4">${s.major}</td>
                                        <td class="py-3.5 px-4">
                                            <span class="font-bold text-[#0B2A5B] dark:text-white">${s.roomNumber}</span> - <span>${s.bedNumber}</span>
                                        </td>
                                        <td class="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">${s.phone}</td>
                                        <td class="py-3.5 px-4">${s.hometown}</td>
                                        <td class="py-3.5 px-4">
                                            <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.paymentStatus === 'Đủ' ? 'bg-emerald-50 text-emerald-700' : s.paymentStatus === 'Nợ' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}">${s.paymentStatus === 'Đủ' ? 'Đã đóng' : s.paymentStatus === 'Nợ' ? 'Nợ phí' : s.paymentStatus}</span>
                                        </td>
                                        <td class="py-3.5 px-4">
                                            <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.residenceStatus === 'Đang ở' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}">${s.residenceStatus}</span>
                                        </td>
                                        <td class="py-3.5 px-4 text-right">
                                            <div class="inline-flex items-center gap-1">
                                                <button type="button" onclick="KtxApp.openStudentModal('${s.mssv}')" class="p-1 rounded-lg text-slate-400 hover:text-[#0B2A5B]" title="Xem hồ sơ">
                                                    <span class="material-symbols-outlined text-[18px]">visibility</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${filtered.length === 0 ? '<tr><td colspan="9" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // 5. Rooms View Renderer (Sơ đồ Phòng & Giường - Roster vs Grid view)
    function renderRoomsView() {
        const rooms = state.rooms || [];
        const beds = rooms.flatMap(room => room.beds || []);
        const occupiedBeds = beds.filter(bed => bed.status === 'Đang ở').length;
        const vacantBeds = beds.filter(bed => bed.status === 'Giường trống').length;
        const maintenanceBeds = beds.filter(bed => bed.status === 'Bảo trì').length;
        const occupancyRate = beds.length ? Math.round(occupiedBeds / beds.length * 100) : 0;
        const isGrid = state.roomsViewMode === 'grid';
        const buildings = [...new Set(rooms.map(room => room.buildingId).filter(Boolean))].sort();
        const filteredByBuilding = state.roomsBuilding === 'all'
            ? rooms
            : rooms.filter(room => room.buildingId === state.roomsBuilding);
        const floors = [...new Set(filteredByBuilding.map(room => String(room.floor)).filter(Boolean))]
            .sort((a, b) => Number(a) - Number(b));
        const filteredByFloor = state.roomsFloor === 'all'
            ? filteredByBuilding
            : filteredByBuilding.filter(room => String(room.floor) === state.roomsFloor);
        const roomNumbers = [...new Set(filteredByFloor.map(room => room.roomNumber).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
        const filteredRooms = state.roomsRoomNumber === 'all'
            ? filteredByFloor
            : filteredByFloor.filter(room => room.roomNumber === state.roomsRoomNumber);
        const selectClass = 'h-10 min-w-[140px] px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer';

        return `
            <div class="flex flex-col w-full space-y-5">
                <!-- Header -->
                <div class="page-title-banner flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Sơ đồ Phòng & Giường</h1>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Theo dõi phòng, giường trống và tình trạng bố trí sinh viên</p>
                    </div>
                    <div class="page-title-actions flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button type="button" onclick="KtxApp.exportReport('Sơ đồ phòng KTX')" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition-all text-xs font-semibold border border-slate-200 dark:border-slate-700">
                            <span class="material-symbols-outlined text-[18px] text-[#375ba9] dark:text-blue-400">table_view</span>
                            <span>Xuất file Excel</span>
                        </button>
                        <button type="button" onclick="KtxApp.openCreateRoomModal()" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white shadow-sm transition-all text-xs font-semibold">
                            <span class="material-symbols-outlined text-[16px]">add</span>
                            <span>Thêm phòng mới</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metrics (Image 1 Standard Design) -->
                <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">TỔNG PHÒNG LƯU TRÚ</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#0b2a5b] dark:text-blue-400">
                                <span class="material-symbols-outlined text-[18px]">meeting_room</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${rooms.length.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">phòng</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-[#375ba9] dark:text-blue-400 font-semibold">${buildings.length} tòa nhà</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">TỔNG CHỖ Ở (GIƯỜNG)</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#375ba9] dark:text-blue-400">
                                <span class="material-symbols-outlined text-[18px]">bed</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${beds.length.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">giường</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-[#375ba9] dark:text-blue-400 font-semibold">Tỷ lệ lấp đầy ${occupancyRate}%</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">SINH VIÊN ĐANG Ở</span>
                            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <span class="material-symbols-outlined text-[18px]">groups</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                                ${occupiedBeds.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">sinh viên</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Còn trống ${vacantBeds.toLocaleString('vi-VN')} giường</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">GIƯỜNG CẦN BẢO TRÌ</span>
                            <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <span class="material-symbols-outlined text-[18px]">build</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                                ${maintenanceBeds.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">giường</span>
                            </div>
                        </div>
                        <div class="text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 font-semibold">
                            <span>Đang khắc phục sự cố</span>
                            <span class="material-symbols-outlined shrink-0 text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>
                </div>

                <!-- Toggle Roster vs Grid View -->
                <div class="relative z-20 flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs overflow-visible">
                    <div class="flex items-center p-1 rounded-xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs shrink-0">
                        <button type="button" onclick="KtxApp.setRoomsViewMode('roster')" class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            !isGrid ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }">
                            <span class="material-symbols-outlined text-[17px]">badge</span>
                            <span>Danh sách theo phòng</span>
                        </button>
                        <button type="button" onclick="KtxApp.setRoomsViewMode('grid')" class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isGrid ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }">
                            <span class="material-symbols-outlined text-[17px]">grid_view</span>
                            <span>Sơ đồ buồng phòng</span>
                        </button>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                        <select aria-label="Lọc theo tòa" onchange="KtxApp.setRoomsBuilding(this.value)" class="${selectClass}">
                            <option value="all">Tòa: Tất cả</option>
                            ${buildings.map(building => `<option value="${building}" ${state.roomsBuilding === building ? 'selected' : ''}>Tòa ${building}</option>`).join('')}
                        </select>
                        <select aria-label="Lọc theo tầng" onchange="KtxApp.setRoomsFloor(this.value)" class="${selectClass}">
                            <option value="all">Tầng: Tất cả</option>
                            ${floors.map(floor => `<option value="${floor}" ${state.roomsFloor === floor ? 'selected' : ''}>Tầng ${floor}</option>`).join('')}
                        </select>
                        <select aria-label="Lọc theo phòng" onchange="KtxApp.setRoomsRoomNumber(this.value)" class="${selectClass}">
                            <option value="all" ${state.roomsRoomNumber === 'all' ? 'selected' : ''}>Phòng: Tất cả</option>
                            ${roomNumbers.map(roomNumber => `<option value="${roomNumber}" ${state.roomsRoomNumber === roomNumber ? 'selected' : ''}>Phòng ${roomNumber}</option>`).join('')}
                        </select>
                    </div>

                    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400 shrink-0">
                        <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#375ba9]"></span> Đang ở (342)</span>
                        <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Giường trống (38)</span>
                        <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Bảo trì (4)</span>
                    </div>
                </div>

                <!-- View Contents -->
                ${isGrid ? renderRoomsGridView(filteredRooms) : renderRoomsRosterView()}
            </div>
        `;
    }

    function renderRoomsGridView(rooms) {
        const buildings = [...new Set(rooms.map(room => room.buildingId).filter(Boolean))].sort();
        return `
            <div class="space-y-6">
                ${rooms.length === 0 ? '<div class="rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] p-10 text-center text-xs text-slate-400 shadow-xs">Không có dữ liệu.</div>' : ''}
                ${buildings.map(bId => {
                    const bRooms = rooms.filter(r => r.buildingId === bId);
                    if (bRooms.length === 0) return '';
                    return `
                        <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[#0B2A5B] dark:text-blue-400 text-[20px]">apartment</span>
                                    <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">${bRooms[0].buildingName}</h3>
                                </div>
                                <span class="text-xs text-slate-500">${bRooms.length} phòng · 8 giường/phòng</span>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                                ${bRooms.map(r => {
                                    const isFull = r.occupied >= r.capacity;
                                    const hasMaint = r.beds && r.beds.some(b => b.status === 'Bảo trì');
                                    return `
                                        <div onclick="KtxApp.inspectRoom('${r.id}')" class="p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                                            hasMaint ? 'bg-amber-50/40 border-amber-200' :
                                            isFull ? 'bg-slate-50/80 dark:bg-[#0B0F1A] border-slate-200 dark:border-[#232B3B]' :
                                            'bg-emerald-50/30 border-emerald-200/60'
                                        }">
                                            <div class="flex items-center justify-between mb-2">
                                                <span class="text-sm font-bold text-slate-900 dark:text-white">P.${r.roomNumber}</span>
                                                <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                    hasMaint ? 'bg-amber-100 text-amber-800' :
                                                    isFull ? 'bg-blue-100 text-[#0B2A5B]' : 'bg-emerald-100 text-emerald-800'
                                                }">${hasMaint ? 'Bảo trì' : `${r.occupied}/${r.capacity} chỗ`}</span>
                                            </div>

                                            <div class="grid grid-cols-4 gap-1.5 my-2">
                                                ${(r.beds || []).map(b => `
                                                    <div class="h-5 rounded flex items-center justify-center text-[10px] font-bold font-mono ${
                                                        b.status === 'Đang ở' ? 'bg-[#0B2A5B] text-white' :
                                                        b.status === 'Bảo trì' ? 'bg-amber-400 text-amber-950' :
                                                        'bg-emerald-200 text-emerald-800 border border-emerald-300'
                                                    }">${b.bedNumber}</div>
                                                `).join('')}
                                            </div>

                                            <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/40">
                                                <span>Tầng ${r.floor}</span>
                                                <span class="font-semibold text-slate-700 dark:text-slate-300">${formatVND(r.pricePerMonth)}</span>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderRoomsRosterView() {
        const students = (state.students || []).filter(student =>
            (state.roomsBuilding === 'all' || student.buildingId === state.roomsBuilding) &&
            (state.roomsFloor === 'all' || String(student.floor) === state.roomsFloor) &&
            (state.roomsRoomNumber === 'all' || student.roomNumber === state.roomsRoomNumber)
        );
        return `
            <div class="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                                <th class="py-3.5 px-4">MSSV</th>
                                <th class="py-3.5 px-4">Họ và tên sinh viên</th>
                                <th class="py-3.5 px-3">Giới tính / Khóa</th>
                                <th class="py-3.5 px-3">Tòa / Tầng</th>
                                <th class="py-3.5 px-3">Phòng</th>
                                <th class="py-3.5 px-3">Vị trí giường</th>
                                <th class="py-3.5 px-3">Ngày vào</th>
                                <th class="py-3.5 px-3">Học phí / KTX</th>
                                <th class="py-3.5 px-3">Tình trạng</th>
                                <th class="py-3.5 px-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                            ${students.map(s => `
                                <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                    <td class="py-3.5 px-4 font-mono font-semibold text-[#0B2A5B] dark:text-blue-400">${s.mssv}</td>
                                    <td class="py-3.5 px-4">
                                        <div class="flex items-center gap-2.5 min-w-[190px]">
                                            <span class="w-7 h-7 rounded-full shrink-0 ring-1 ring-slate-200 bg-blue-100 text-[#0B2A5B] flex items-center justify-center text-[10px] font-bold">${getUserInitial(s.name)}</span>
                                            <div class="min-w-0">
                                                <div class="font-semibold text-slate-900 dark:text-white leading-tight truncate">${s.name}</div>
                                                <div class="text-[11px] text-slate-400 truncate">${s.className}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="py-3.5 px-3">
                                        <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold ${s.gender === 'Nam' ? 'bg-blue-100 text-[#0B2A5B]' : 'bg-pink-100 text-pink-700'}">${s.gender}</span>
                                        <span class="text-[11px] text-slate-500 font-medium ml-1">${s.cohort}</span>
                                    </td>
                                    <td class="py-3.5 px-3 font-medium">Tòa ${s.buildingId} · Tầng ${s.floor}</td>
                                    <td class="py-3.5 px-3 font-bold text-[#0B2A5B] dark:text-white">${s.roomNumber}</td>
                                    <td class="py-3.5 px-3">
                                        <span class="px-2 py-0.5 rounded-md bg-blue-50 text-[#375ba9] font-mono font-bold text-xs">${s.bedNumber}</span>
                                    </td>
                                    <td class="py-3.5 px-3 text-slate-500 text-[11px]">${s.admissionDate}</td>
                                    <td class="py-3.5 px-3">
                                        <span class="px-2 py-0.5 rounded-full text-[11px] font-medium ${s.paymentStatus === 'Đủ' ? 'bg-emerald-50 text-emerald-700' : s.paymentStatus === 'Nợ' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}">${s.paymentStatus === 'Đủ' ? 'Đã đóng' : s.paymentStatus === 'Nợ' ? 'Nợ phí' : s.paymentStatus}</span>
                                    </td>
                                    <td class="py-3.5 px-3">
                                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s.residenceStatus === 'Đang ở' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}">${s.residenceStatus}</span>
                                    </td>
                                    <td class="py-3.5 px-4 text-right">
                                        <div class="inline-flex items-center gap-1">
                                            <button type="button" onclick="KtxApp.openStudentModal('${s.mssv}')" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#0B2A5B]">
                                                <span class="material-symbols-outlined text-[17px]">visibility</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                            ${students.length === 0 ? '<tr><td colspan="10" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Modal Actions
    function openNewContractModal() {
        if (!state.selectedAcademicYear) {
            showToast('Vui lòng chọn năm học trước khi lập hợp đồng.', 'error');
            return;
        }
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        const students = (state.students || []).filter(student => student.mssv);
        const availableBeds = (state.rooms || []).flatMap(room =>
            (room.beds || [])
                .filter(bed => bed.status === 'Giường trống')
                .map(bed => ({ ...bed, room })));
        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] animate-fade-in">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">post_add</span>
                            <h3 class="text-base font-bold text-slate-900 dark:text-white">Lập hợp đồng nội trú mới</h3>
                        </div>
                        <button onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <form onsubmit="event.preventDefault(); KtxApp.submitNewContract();" class="py-4 space-y-4 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sinh viên</label>
                            <select id="ncMssv" required class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                <option value="">Chọn sinh viên</option>
                                ${students.map(student => `<option value="${student.mssv}">${student.name} · ${student.mssv}</option>`).join('')}
                            </select>
                        </div>

                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Giường còn trống</label>
                            <select id="ncBedId" required class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                <option value="">Chọn giường</option>
                                ${availableBeds.map(bed => `<option value="${bed.id}">${bed.room.buildingId}-${bed.room.roomNumber} · ${bed.bedNumber}</option>`).join('')}
                            </select>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tiền phòng / tháng (VND)</label>
                                <input type="number" id="ncMonthlyFee" required min="0.01" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tiền cọc giữ chỗ (VND)</label>
                                <input type="number" id="ncDepositAmount" required min="0" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none" />
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày bắt đầu</label>
                                <input type="date" id="ncStartDate" required class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày kết thúc</label>
                                <input type="date" id="ncEndDate" required class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none" />
                            </div>
                        </div>

                        <div class="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-slate-600 dark:text-slate-300 text-[11px]">
                            Hợp đồng có hiệu lực pháp lý theo Quy chế Ký túc xá Phân hiệu UTC2. Sinh viên tuân thủ nội quy an ninh trật tự.
                        </div>

                        <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100">Hủy</button>
                            <button type="submit" class="px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">Ký & Ban hành hợp đồng</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitNewContract() {
        const mssv = document.getElementById('ncMssv').value;
        const bedId = document.getElementById('ncBedId').value;
        const monthlyFee = Number(document.getElementById('ncMonthlyFee').value);
        const depositAmount = Number(document.getElementById('ncDepositAmount').value);
        const startDate = document.getElementById('ncStartDate').value;
        const endDate = document.getElementById('ncEndDate').value;

        try {
            const res = await fetch('/api/hopdong', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mssv,
                    bedId,
                    monthlyFee,
                    depositAmount,
                    startDate,
                    endDate
                })
            });
            const json = await res.json();
            if (json.success) {
                showToast('Đã ban hành hợp đồng nội trú mới thành công!', 'success');
                closeModal();
                await loadContracts();
                if (state.currentTab === 'hop-dong') renderActiveView();
            } else {
                showToast(json.message || 'Lỗi tạo hợp đồng', 'error');
            }
        } catch (e) {
            showToast('Lỗi gửi yêu cầu', 'error');
        }
    }

    async function openStudentModal(mssv) {
        try {
            const res = await fetch(`/api/sinhvien/${mssv}`);
            const json = await res.json();
            if (!json.success || !json.data) return;
            const s = json.data;

            const container = document.getElementById('modalsContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div class="w-full max-w-xl bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] animate-fade-in">
                        <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                            <div class="flex items-center gap-3">
                                <span class="w-14 h-14 rounded-full ring-2 ring-[#0B2A5B]/30 bg-blue-100 text-[#0B2A5B] flex items-center justify-center text-xl font-bold">${getUserInitial(s.name)}</span>
                                <div>
                                    <h3 class="text-lg font-bold text-slate-900 dark:text-white">${s.name}</h3>
                                    <p class="text-xs text-slate-500 font-mono">MSSV: ${s.mssv} • ${s.className}</p>
                                </div>
                            </div>
                            <button onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600">
                                <span class="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div class="py-4 space-y-4 text-xs text-slate-700 dark:text-slate-300">
                            <div class="grid grid-cols-2 gap-3">
                                <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                                    <span class="text-slate-400 font-semibold text-[10px] uppercase">Chỗ ở hiện tại</span>
                                    <p class="font-bold text-sm text-[#0B2A5B] dark:text-blue-400">Phòng ${s.roomNumber} · Giường ${s.bedNumber}</p>
                                    <p class="text-slate-500">Tòa ${s.buildingId} - Tầng ${s.floor}</p>
                                </div>
                                <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                                    <span class="text-slate-400 font-semibold text-[10px] uppercase">Tình trạng lưu trú</span>
                                    <p class="font-bold text-sm text-emerald-600">${s.residenceStatus}</p>
                                    <p class="text-slate-500">Nhập KTX từ: ${s.admissionDate}</p>
                                </div>
                            </div>

                            <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-slate-400">Số CCCD / Định danh:</span>
                                    <span class="font-mono font-semibold">${s.cccd}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-400">Số điện thoại liên lạc:</span>
                                    <span class="font-mono font-semibold">${s.phone}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-400">Quê quán thường trú:</span>
                                    <span class="font-semibold">${s.hometown}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-400">Tình trạng nộp phí:</span>
                                    <span class="font-semibold ${s.paymentStatus === 'Đủ' ? 'text-emerald-600' : s.paymentStatus === 'Nợ' ? 'text-red-600' : 'text-slate-500'}">
                                        ${s.paymentStatus === 'Đủ' ? 'Đã hoàn tất phí KTX' : s.paymentStatus === 'Nợ' ? 'Còn nợ phí' : s.paymentStatus}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-end items-center pt-3 border-t border-slate-200 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl bg-[#0B2A5B] text-white font-semibold text-xs hover:bg-[#143F8C]">Đóng</button>
                        </div>
                    </div>
                </div>
            `;
        } catch (e) {
            console.error(e);
        }
    }

    async function openPrintModal(contractNumber) {
        try {
            const res = await fetch(`/api/hopdong/${contractNumber}`);
            const json = await res.json();
            if (!json.success || !json.data) return;
            const c = json.data;

            const container = document.getElementById('modalsContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div class="w-full max-w-2xl bg-white text-slate-900 rounded-2xl p-7 shadow-2xl border border-slate-300 max-h-[90vh] overflow-y-auto animate-fade-in">
                        <div class="flex justify-between items-start pb-4 border-b border-slate-200">
                            <div class="text-center w-full">
                                <h4 class="text-xs uppercase font-bold tracking-wider text-slate-600">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
                                <p class="text-[11px] font-semibold text-slate-600">Độc lập - Tự do - Hạnh phúc</p>
                                <div class="w-24 h-0.5 bg-slate-300 mx-auto my-1.5"></div>
                                <h2 class="text-base font-bold text-[#0B2A5B] mt-2 uppercase">HỢP ĐỒNG THUÊ CHỖ Ở NỘI TRÚ KÝ TÚC XÁ</h2>
                                <p class="text-xs text-slate-500 font-mono mt-0.5">Số: ${c.contractNumber}/HĐ-KTX</p>
                            </div>
                            <button onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-700">
                                <span class="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div class="py-4 space-y-3.5 text-xs text-slate-700 leading-relaxed">
                            <p>Hôm nay, ngày ký hợp đồng tại Văn phòng Ban Quản lý KTX Phân hiệu Trường Đại học Giao thông Vận tải tại TP. Hồ Chí Minh, chúng tôi gồm có:</p>
                            
                            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                <p><strong>BÊN CHO THUÊ (BÊN A):</strong> BAN QUẢN LÝ KÝ TÚC XÁ UTC2</p>
                                <p>Đại diện: Ông Nguyễn Văn An - Chức vụ: Trưởng Ban Quản lý KTX</p>
                                <p>Địa chỉ: Số 450-451 Lê Văn Việt, Phường Tăng Nhơn Phú A, TP. Thủ Đức, TP.HCM</p>
                            </div>

                            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                <p><strong>BÊN THUÊ (BÊN B):</strong> ${c.studentName}</p>
                                <p>Mã số sinh viên: ${c.mssv}</p>
                                <p>Vị trí bố trí: <strong>Phòng ${c.roomNumber} - Giường ${c.bedNumber}</strong> (Tòa ${c.buildingId})</p>
                                <p>Thời hạn thuê: Từ ngày <strong>${c.startDate}</strong> đến hết ngày <strong>${c.endDate}</strong></p>
                                <p>Đơn giá tiền phòng: <strong>${formatVND(c.monthlyFee)}/tháng</strong></p>
                                <p>Tiền cọc thế chân: <strong>${formatVND(c.depositAmount)}</strong> (Tình trạng: ${c.depositStatus})</p>
                            </div>

                            <p class="italic text-slate-600 text-[11px]">Hai bên cam kết thực hiện đúng nội quy nội trú của nhà trường. Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau.</p>

                            <div class="grid grid-cols-2 pt-6 text-center">
                                <div>
                                    <p class="font-bold text-xs uppercase">ĐẠI DIỆN BÊN B</p>
                                    <p class="text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                                    <div class="h-16 flex items-end justify-center font-semibold text-slate-800">${c.studentName}</div>
                                </div>
                                <div>
                                    <p class="font-bold text-xs uppercase">ĐẠI DIỆN BÊN A</p>
                                    <p class="text-[11px] text-slate-500">(Ký tên và đóng dấu)</p>
                                    <div class="h-16 flex items-end justify-center font-semibold text-[#0B2A5B]">Nguyễn Văn An</div>
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                            <button onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold hover:bg-slate-100">Đóng</button>
                            <button onclick="window.print()" class="px-4 py-2 rounded-xl bg-[#0B2A5B] text-white text-xs font-semibold flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[16px]">print</span>
                                <span>In văn bản hợp đồng</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } catch (e) {
            console.error(e);
        }
    }

    async function inspectRoom(roomId) {
        const room = (state.rooms || []).find(r => r.id === roomId);
        if (!room) return;

        const container = document.getElementById('modalsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div class="w-full max-w-2xl bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] animate-fade-in">
                    <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-blue-50 text-[#0B2A5B] flex items-center justify-center font-bold">${room.roomNumber}</div>
                            <div>
                                <h3 class="text-base font-bold text-slate-900 dark:text-white">Chi tiết buồng phòng: ${room.roomNumber} (${room.buildingName})</h3>
                                <p class="text-xs text-slate-500">Tầng ${room.floor} · ${room.roomType} · Dành cho ${room.gender}</p>
                            </div>
                        </div>
                        <button onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <div class="py-4 space-y-4">
                        <div class="flex items-center justify-between text-xs text-slate-600 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                            <span>Đang ở: <strong>${room.occupied}</strong> / ${room.capacity} giường</span>
                            <span>Giá: <strong class="text-[#0B2A5B]">${formatVND(room.pricePerMonth)}/tháng</strong></span>
                            <span class="text-emerald-600 font-semibold">Trang bị: 2 Quạt trần, 1 Máy lạnh, 8 Bàn học</span>
                        </div>

                        <!-- 8 Bed Cards -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                            ${(room.beds || []).map(b => `
                                <div class="p-3 rounded-xl border flex items-center justify-between text-xs ${
                                    b.status === 'Đang ở' ? 'border-blue-200 bg-blue-50/40' :
                                    b.status === 'Bảo trì' ? 'border-amber-200 bg-amber-50/40' : 'border-emerald-200 bg-emerald-50/40'
                                }">
                                    <div class="flex items-center gap-2.5">
                                        <span class="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center font-mono font-bold text-[#0B2A5B]">${b.bedNumber}</span>
                                        <div>
                                            <div class="font-semibold text-slate-900">${b.studentName || b.status}</div>
                                            ${b.mssv ? `<div class="text-[10px] text-slate-400 font-mono">MSSV: ${b.mssv}</div>` : ''}
                                        </div>
                                    </div>

                                    <div>
                                        <button type="button" onclick="KtxApp.toggleBedMaintenance('${b.id}')" class="px-2 py-1 rounded-md text-[11px] font-semibold ${
                                            b.status === 'Bảo trì' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:text-amber-600'
                                        }">
                                            ${b.status === 'Bảo trì' ? 'Mở lại' : 'Bảo trì'}
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700">Đóng</button>
                    </div>
                </div>
            </div>
        `;
    }

    async function toggleBedMaintenance(bedId) {
        try {
            const res = await fetch(`/api/phong/beds/${bedId}/toggle-maintenance`, { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                showToast(json.message, 'success');
                await loadRooms();
                closeModal();
                if (state.currentTab === 'phong-va-giuong') renderActiveView();
            }
        } catch (e) {
            console.error(e);
        }
    }

    function inspectCandidate(appId) {
        const app = (state.applications || []).find(a => a.id === appId);
        if (!app) return;
        showToast(`Hồ sơ ứng viên: ${app.studentName} (${app.priorityCategory})`, 'info');
    }

    async function approveApp(appId, studentName) {
        try {
            const res = await fetch(`/api/dondangky/${appId}/approve`, { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                showToast(`Đã duyệt 1-chạm: ${studentName}! Đã tự động tạo hồ sơ cư xá.`, 'success');
                await loadApplications();
                if (state.currentTab === 'don-dang-ky') renderActiveView();
            }
        } catch (e) {
            showToast('Lỗi duyệt hồ sơ', 'error');
        }
    }

    async function rejectApp(appId, studentName) {
        try {
            const res = await fetch(`/api/dondangky/${appId}/reject`, { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                showToast(`Đã từ chối đơn đăng ký của ${studentName}`, 'error');
                await loadApplications();
                if (state.currentTab === 'don-dang-ky') renderActiveView();
            }
        } catch (e) {
            showToast('Lỗi từ chối hồ sơ', 'error');
        }
    }

    async function renewContract(contractNumber) {
        try {
            const res = await fetch(`/api/hopdong/${contractNumber}/renew?months=5`, { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                showToast(`Gia hạn hợp đồng ${contractNumber} thêm 5 tháng thành công!`, 'success');
                await loadContracts();
                if (state.currentTab === 'hop-dong') renderActiveView();
            }
        } catch (e) {
            showToast('Lỗi gia hạn', 'error');
        }
    }

    async function liquidateContract(contractNumber) {
        if (!confirm(`Bạn có chắc chắn muốn thanh lý và hoàn cọc cho hợp đồng ${contractNumber}?`)) return;
        try {
            const res = await fetch(`/api/hopdong/${contractNumber}/liquidate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Tất toán học kỳ và xuất túc xá' })
            });
            const json = await res.json();
            if (json.success) {
                showToast(json.message, 'success');
                await loadContracts();
                if (state.currentTab === 'hop-dong') renderActiveView();
            }
        } catch (e) {
            showToast('Lỗi thanh lý', 'error');
        }
    }

    async function actionTask(taskId, taskType) {
        if (taskType === 'application') {
            state.admissionsTab = 'pending';
            navigate('don-dang-ky');
        } else if (taskType === 'repair') {
            navigate('sua-chua');
        } else {
            showToast('Không hỗ trợ thao tác cho đầu việc này', 'error');
        }
    }

    function closeModal() {
        const container = document.getElementById('modalsContainer');
        if (container) container.innerHTML = '';
    }

    function openRegistrationModal() {
        const modal = document.getElementById('registrationModal');
        if (modal) modal.classList.remove('hidden');
    }

    function closeRegistrationModal() {
        const modal = document.getElementById('registrationModal');
        if (modal) modal.classList.add('hidden');
    }

    function toggleMobileMenu() {
        state.isMobileMenuOpen = !state.isMobileMenuOpen;
        renderSidebar();
    }

    function toggleProfileMenu() {
        const d = document.getElementById('profileDropdown');
        if (d) d.classList.toggle('hidden');
    }

    async function openCreateRoundModal() {
        if (!state.selectedAcademicYear) {
            showToast('Vui lòng chọn năm học trước khi tạo đợt đăng ký.', 'error');
            return;
        }
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        let sems = [];
        try {
            const res = await fetch('/api/namhoc');
            const years = await res.json();
            (years || []).filter(y => (y.maNamHoc || y.MaNamHoc) === state.selectedAcademicYear).forEach(y => {
                (y.kyHocs || y.KyHocs || []).forEach(k => {
                    sems.push({ code: k.maKyHoc || k.MaKyHoc, name: k.tenKyHoc || k.TenKyHoc });
                });
            });
        } catch (e) {
            sems = [];
        }
        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Tạo Đợt Đăng Ký Mới</h3>
                        <button onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxApp.submitCreateRound();" class="space-y-3.5 pt-4 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mã Đợt *</label>
                            <input id="roundCode" required type="text" placeholder="VD: DOT_K66_2027" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs focus:outline-none" />
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên Đợt *</label>
                            <input id="roundName" required type="text" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Kỳ Học *</label>
                            <select id="roundSemester" required class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none">
                                <option value="">Chọn kỳ học</option>
                                ${sems.map(s => `<option value="${s.code}">${s.name} (${s.code})</option>`).join('')}
                            </select>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày Mở</label>
                                <input id="roundOpen" required type="date" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày Đóng</label>
                                <input id="roundClose" required type="date" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">Tạo Đợt</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitCreateRound() {
        const body = {
            maDotDangKy: document.getElementById('roundCode').value.trim(),
            tenDot: document.getElementById('roundName').value.trim(),
            maKyHoc: document.getElementById('roundSemester').value,
            ngayMo: document.getElementById('roundOpen').value,
            ngayDong: document.getElementById('roundClose').value
        };
        const res = await fetch('/api/dotdangky-rounds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json().catch(() => ({}));
        KtxApp.showToast(res.ok ? 'Đã tạo đợt đăng ký.' : (json?.message || json?.title || 'Tạo đợt thất bại.'), res.ok ? 'success' : 'error');
        if (res.ok) {
            KtxApp.closeModal();
            await loadApplications();
            if (state.currentTab === 'don-dang-ky') renderActiveView();
        }
    }

    async function openCreateStudentModal() {
        if (!state.selectedAcademicYear) {
            showToast('Vui lòng chọn năm học trước khi tiếp nhận sinh viên.', 'error');
            return;
        }
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        let classes = [];
        try {
            const res = await fetch('/api/lophoc');
            const json = await res.json();
            classes = json?.data || json || [];
        } catch (e) {
            classes = [];
        }
        const academicYear = state.academicYears.find(year => getAcademicYearCode(year) === state.selectedAcademicYear);
        const intakeYear = String(academicYear?.ngayBatDau || academicYear?.NgayBatDau || '').slice(0, 4) || String(new Date().getFullYear());
        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-2xl bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Tiếp Nhận Sinh Viên Mới</h3>
                        <button onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxApp.submitCreateStudent();" class="space-y-3.5 pt-4 text-xs">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">MSSV *</label>
                                <input id="stuId" required type="text" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs focus:outline-none" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Họ Tên *</label>
                                <input id="stuName" required type="text" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày Sinh *</label>
                                <input id="stuBirth" required type="date" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Giới Tính</label>
                                <select id="stuGender" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none">
                                    <option value="nam">Nam</option>
                                    <option value="nu">Nữ</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">CCCD *</label>
                            <input id="stuCccd" required type="text" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs focus:outline-none" />
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Điện Thoại</label>
                                <input id="stuPhone" type="text" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                <input id="stuEmail" type="email" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Địa Chỉ Thường Trú</label>
                            <input id="stuAddress" type="text" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Lớp *</label>
                                <select id="stuClass" required class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none">
                                    <option value="">Chọn lớp</option>
                                    ${classes.map(c => `<option value="${c.code || c.Code}">${c.name || c.Name} (${c.code || c.Code})</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Năm Nhập Học *</label>
                                <input id="stuYear" required type="number" value="${escapeHtml(intakeYear)}" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Đối Tượng Ưu Tiên</label>
                            <input id="stuPriority" type="text" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">Tiếp Nhận</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitCreateStudent() {
        const body = {
            maSinhVien: document.getElementById('stuId').value.trim(),
            hoTen: document.getElementById('stuName').value.trim(),
            ngaySinh: document.getElementById('stuBirth').value,
            gioiTinh: document.getElementById('stuGender').value,
            cccd: document.getElementById('stuCccd').value.trim(),
            dienThoai: document.getElementById('stuPhone').value.trim(),
            email: document.getElementById('stuEmail').value.trim(),
            diaChiThuongTru: document.getElementById('stuAddress').value.trim(),
            maLop: document.getElementById('stuClass').value,
            namNhapHoc: parseInt(document.getElementById('stuYear').value, 10),
            doiTuongUuTien: document.getElementById('stuPriority').value.trim()
        };
        const res = await fetch('/api/sinhvien', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json().catch(() => ({}));
        KtxApp.showToast(res.ok ? 'Đã tiếp nhận sinh viên.' : (json?.message || json?.title || 'Tiếp nhận thất bại.'), res.ok ? 'success' : 'error');
        if (res.ok) {
            KtxApp.closeModal();
            await loadStudents();
            if (state.currentTab === 'sinh-vien') renderActiveView();
        }
    }

    function importStudentsExcel() {
        if (!state.selectedAcademicYear) {
            showToast('Vui lòng chọn năm học trước khi nhập danh sách sinh viên.', 'error');
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const fd = new FormData();
            fd.append('file', file);
            try {
                const res = await fetch('/api/sinhvien/import', { method: 'POST', body: fd });
                const json = await res.json().catch(() => ({}));
                KtxApp.showToast(json.message || (res.ok ? 'Import thành công.' : 'Import thất bại.'), res.ok ? 'success' : 'error');
                if (res.ok) {
                    await loadStudents();
                    if (state.currentTab === 'sinh-vien') renderActiveView();
                }
            } catch (err) {
                KtxApp.showToast('Import thất bại.', 'error');
            }
        };
        input.click();
    }

    async function openCreateRoomModal() {
        if (!state.selectedAcademicYear) {
            showToast('Vui lòng chọn năm học trước khi thêm phòng.', 'error');
            return;
        }
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        let buildings = [];
        let roomTypes = [];
        try {
            const bRes = await fetch('/api/toanha');
            const bJson = await bRes.json();
            buildings = bJson?.data || bJson || [];
        } catch (e) { buildings = []; }
        try {
            const rRes = await fetch('/api/loaiphong');
            roomTypes = await rRes.json();
        } catch (e) { roomTypes = []; }

        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Thêm Phòng Mới</h3>
                        <button onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxApp.submitCreateRoom();" class="space-y-3.5 pt-4 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mã Phòng *</label>
                            <input id="roomCode" required type="text" placeholder="VD: A01_A105" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs focus:outline-none" />
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tòa Nhà *</label>
                                <select id="roomBuilding" required class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none">
                                    <option value="">Chọn tòa</option>
                                    ${buildings.map(b => `<option value="${b.id || b.Id || b.code || b.MaToaNha}">${b.name || b.Name || b.id || b.MaToaNha}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Loại Phòng *</label>
                                <select id="roomType" required class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none">
                                    <option value="">Chọn loại</option>
                                    ${roomTypes.map(t => `<option value="${t.maLoaiPhong || t.MaLoaiPhong}">${t.tenLoaiPhong || t.TenLoaiPhong}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tầng</label>
                                <input id="roomFloor" type="number" value="1" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Số Giường</label>
                                <input id="roomBeds" type="number" value="8" min="1" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">Thêm Phòng</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitCreateRoom() {
        const body = {
            maPhong: document.getElementById('roomCode').value.trim(),
            maToaNha: document.getElementById('roomBuilding').value,
            maLoaiPhong: document.getElementById('roomType').value,
            soTang: parseInt(document.getElementById('roomFloor').value, 10) || 1,
            soGiuong: parseInt(document.getElementById('roomBeds').value, 10) || 8,
            trangThai: 'hoatDong'
        };
        const res = await fetch('/api/phong', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json().catch(() => ({}));
        KtxApp.showToast(res.ok ? 'Đã thêm phòng.' : (json?.message || json?.title || 'Thêm phòng thất bại.'), res.ok ? 'success' : 'error');
        if (res.ok) {
            KtxApp.closeModal();
            await loadRooms();
            if (state.currentTab === 'phong') renderActiveView();
        }
    }
    function openForgotModal() {
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Quên Mật Khẩu</h3>
                        <button onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxApp.submitForgot();" class="space-y-3.5 pt-4 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên đăng nhập hoặc email *</label>
                            <input id="forgotUsername" required type="text" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">Gửi mã</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitForgot() {
        const username = document.getElementById('forgotUsername').value.trim();
        try {
            const res = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                KtxApp.showToast(json.message || 'Gửi mã thất bại.', 'error');
                return;
            }

            state.resetUsername = username;
            state.resetCode = null;
            KtxApp.showToast(json.message || 'Đã gửi mã xác nhận về email.', 'success');
            KtxApp.openVerifyModal(username);
        } catch (error) {
            console.error('Password reset email request failed:', error);
            KtxApp.showToast('Không kết nối được máy chủ để gửi mã xác nhận.', 'error');
        }
    }

    function openVerifyModal(username) {
        state.resetUsername = username || state.resetUsername;
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Xác Nhận Mã</h3>
                        <button onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxApp.submitVerify();" class="space-y-3.5 pt-4 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mã xác nhận *</label>
                            <input id="verifyCode" required type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">Xác nhận mã</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitVerify(username) {
        const identifier = username || state.resetUsername;
        const codeInput = document.getElementById('verifyCode');
        if (!identifier || !codeInput) return;

        const code = codeInput.value.trim();
        try {
            const res = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: identifier, code })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                KtxApp.showToast(json.message || 'Mã xác nhận không đúng.', 'error');
                return;
            }

            state.resetUsername = identifier;
            state.resetCode = code;
            KtxApp.showToast(json.message || 'Mã xác nhận đúng.', 'success');
            KtxApp.openResetPasswordModal();
        } catch (error) {
            console.error('Password reset code verification failed:', error);
            KtxApp.showToast('Không kết nối được máy chủ để xác minh mã.', 'error');
        }
    }

    function openResetPasswordModal() {
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Đặt lại mật khẩu</h3>
                        <button onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxApp.submitModalReset();" class="space-y-3.5 pt-4 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mật khẩu mới *</label>
                            <div class="relative">
                                <input id="modalResetPassword" required type="password" autocomplete="new-password" class="w-full px-3 pr-10 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                                <button type="button" onclick="KtxApp.togglePasswordVisibility('modalResetPassword', this)" aria-label="Hiện mật khẩu" aria-pressed="false" class="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-[#0B2A5B] transition">
                                    <span class="material-symbols-outlined text-[18px]">visibility</span>
                                </button>
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">Đổi mật khẩu</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitModalReset() {
        const passwordInput = document.getElementById('modalResetPassword');
        if (!state.resetUsername || !state.resetCode || !passwordInput) return;

        try {
            const res = await fetch('/api/auth/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: state.resetUsername, code: state.resetCode, newPassword: passwordInput.value })
            });
            const json = await res.json().catch(() => ({}));
            KtxApp.showToast(res.ok ? (json.message || 'Đặt lại mật khẩu thành công.') : (json.message || 'Đặt lại mật khẩu thất bại.'), res.ok ? 'success' : 'error');
            if (res.ok) {
                state.resetUsername = null;
                state.resetCode = null;
                KtxApp.closeModal();
            }
        } catch (error) {
            console.error('Password reset failed:', error);
            KtxApp.showToast('Không kết nối được máy chủ để đổi mật khẩu.', 'error');
        }
    }

    function setAuthMode(mode) {
        state.authMode = ['forgot', 'otp', 'reset'].includes(mode) ? mode : 'login';
        if (state.authMode === 'login') {
            state.resetUsername = null;
            state.resetCode = null;
        } else if (state.authMode === 'forgot') {
            state.resetCode = null;
        }
        if (state.authMode !== 'otp') {
            stopOtpResendCountdown();
        }
        renderApp();
        if (state.authMode === 'otp') {
            startOtpResendCountdown();
        }
    }

    function updateOtpResendButton() {
        const button = document.getElementById('otpResendButton');
        const label = document.getElementById('otpResendLabel');
        const countdown = document.getElementById('otpCountdown');
        if (!button || !label || !countdown) return;

        const isWaiting = otpResendSeconds > 0;
        button.disabled = isWaiting || isResendingOtp;
        label.textContent = isResendingOtp ? 'Đang gửi...' : 'Gửi lại mã';
        countdown.textContent = isWaiting ? `(${otpResendSeconds}s)` : '';
    }

    function stopOtpResendCountdown() {
        if (otpResendTimer) {
            clearInterval(otpResendTimer);
            otpResendTimer = null;
        }
    }

    function startOtpResendCountdown() {
        updateOtpResendButton();
        if (otpResendTimer || otpResendSeconds <= 0) return;

        otpResendTimer = setInterval(() => {
            otpResendSeconds = Math.max(0, otpResendSeconds - 1);
            updateOtpResendButton();
            if (otpResendSeconds === 0) {
                stopOtpResendCountdown();
            }
        }, 1000);
    }

    async function submitForgotForm() {
        const username = document.getElementById('forgotUsername').value.trim();
        try {
            const res = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast(json.message || 'Gửi mã thất bại.', 'error');
                return;
            }

            state.resetUsername = username;
            state.resetCode = null;
            otpResendSeconds = 54;
            showToast(json.message || 'Đã gửi mã xác nhận về email.', 'success');
            setAuthMode('otp');
        } catch (error) {
            console.error('Password reset email request failed:', error);
            showToast('Không kết nối được máy chủ để gửi mã xác nhận.', 'error');
        }
    }

    async function submitVerifyForm() {
        const code = Array.from(document.querySelectorAll('#verifyForm [data-otp-digit]'))
            .map(input => input.value.trim())
            .join('');
        if (!state.resetUsername || !code) {
            showToast('Vui lòng nhập mã xác nhận.', 'error');
            return;
        }
        if (code.length !== 6) {
            showToast('Vui lòng nhập đủ 6 chữ số của mã OTP.', 'error');
            return;
        }

        try {
            const res = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: state.resetUsername, code })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast(json.message || 'Mã xác nhận không đúng.', 'error');
                return;
            }

            state.resetCode = code;
            showToast(json.message || 'Mã xác nhận đúng.', 'success');
            setAuthMode('reset');
        } catch (error) {
            console.error('Password reset code verification failed:', error);
            showToast('Không kết nối được máy chủ để xác minh mã.', 'error');
        }
    }

    function handleOtpInput(index, input) {
        const digits = input.value.replace(/\D/g, '').slice(0, 6);
        if (index === 0 && digits.length > 1) {
            const inputs = document.querySelectorAll('#verifyForm [data-otp-digit]');
            digits.split('').forEach((digit, digitIndex) => {
                if (inputs[digitIndex]) inputs[digitIndex].value = digit;
            });
            inputs[Math.min(digits.length, 5)]?.focus();
            return;
        }

        input.value = digits.slice(-1);
        if (input.value) {
            document.querySelector(`[data-otp-digit="${Math.min(index + 1, 5)}"]`)?.focus();
        }
    }

    function handleOtpPaste(event) {
        const digits = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!digits) return;

        event.preventDefault();
        const inputs = document.querySelectorAll('#verifyForm [data-otp-digit]');
        digits.split('').forEach((digit, index) => {
            if (inputs[index]) inputs[index].value = digit;
        });
        inputs[Math.min(digits.length, 5)]?.focus();
    }

    function handleOtpKeydown(index, event) {
        if (event.key === 'Backspace' && !event.currentTarget.value && index > 0) {
            document.querySelector(`[data-otp-digit="${index - 1}"]`)?.focus();
        } else if (event.key === 'ArrowLeft' && index > 0) {
            document.querySelector(`[data-otp-digit="${index - 1}"]`)?.focus();
        } else if (event.key === 'ArrowRight' && index < 5) {
            document.querySelector(`[data-otp-digit="${index + 1}"]`)?.focus();
        }
    }

    function togglePasswordVisibility(inputId, button) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const shouldShowPassword = input.type === 'password';
        input.type = shouldShowPassword ? 'text' : 'password';
        button.querySelector('.material-symbols-outlined').textContent = shouldShowPassword ? 'visibility_off' : 'visibility';
        button.setAttribute('aria-label', shouldShowPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
        button.setAttribute('aria-pressed', String(shouldShowPassword));
    }

    async function submitResendCode() {
        if (otpResendSeconds > 0 || isResendingOtp) return;
        if (!state.resetUsername) {
            showToast('Vui lòng nhập lại email để nhận mã xác nhận.', 'error');
            setAuthMode('forgot');
            return;
        }

        isResendingOtp = true;
        updateOtpResendButton();
        try {
            const res = await fetch('/api/auth/forgot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: state.resetUsername })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast(json.message || 'Gửi lại mã thất bại.', 'error');
                return;
            }

            state.resetCode = null;
            otpResendSeconds = 54;
            document.querySelectorAll('#verifyForm [data-otp-digit]').forEach(input => { input.value = ''; });
            document.querySelector('#verifyForm [data-otp-digit="0"]')?.focus();
            showToast(json.message || 'Đã gửi lại mã xác nhận.', 'success');
            startOtpResendCountdown();
        } catch (error) {
            console.error('Password reset code resend failed:', error);
            showToast('Không kết nối được máy chủ để gửi lại mã.', 'error');
        } finally {
            isResendingOtp = false;
            updateOtpResendButton();
        }
    }

    async function submitResetForm() {
        if (!state.resetUsername || !state.resetCode) {
            showToast('Vui lòng xác minh mã OTP trước khi đổi mật khẩu.', 'error');
            setAuthMode('otp');
            return;
        }

        const body = {
            username: state.resetUsername,
            code: state.resetCode,
            newPassword: document.getElementById('resetPassword').value
        };
        try {
            const res = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const json = await res.json().catch(() => ({}));
            showToast(res.ok ? (json.message || 'Đặt lại mật khẩu thành công.') : (json.message || 'Đặt lại thất bại.'), res.ok ? 'success' : 'error');
            if (res.ok) setAuthMode('login');
        } catch (error) {
            console.error('Password reset failed:', error);
            showToast('Không kết nối được máy chủ để đổi mật khẩu.', 'error');
        }
    }

    async function toggleNotifications() {
        const dropdown = document.getElementById('notificationDropdown');
        if (!dropdown) return;
        const isHidden = dropdown.classList.contains('hidden');
        if (isHidden) {
            dropdown.classList.remove('hidden');
            await loadNotifications();
        } else {
            dropdown.classList.add('hidden');
        }
    }

    function closeNotifications() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) dropdown.classList.add('hidden');
    }

    async function loadNotifications() {
        const list = document.getElementById('notificationList');
        if (!list) return;
        list.innerHTML = '<div class="text-center text-slate-400 py-4">Đang tải...</div>';
        const items = [];
        try {
            const apps = await fetchApiData('/api/dondangky?status=pending');
            (apps || []).slice(0, 5).forEach(a => items.push({ text: `Đơn đăng ký chờ duyệt: ${a.studentName || a.mssv || a.applicationCode}`, tab: 'don-dang-ky' }));
        } catch (e) {}
        try {
            const tickets = await fetchApiData('/api/suachua?status=choXuLy');
            (tickets?.data || tickets || []).slice(0, 5).forEach(t => items.push({ text: `Phiếu sửa chữa chờ xử lý: ${t.code || t.id}`, tab: 'suachua' }));
        } catch (e) {}
        try {
            const invs = await fetchApiData('/api/hoadon?status=chuaThu');
            (invs?.data || invs || []).slice(0, 5).forEach(i => items.push({ text: `Hóa đơn chưa thu: ${i.code || i.id}`, tab: 'hoadon' }));
        } catch (e) {}

        if (items.length === 0) {
            list.innerHTML = '<div class="text-center text-slate-400 py-4">Không có thông báo mới.</div>';
            const badge = document.getElementById('notifBadge');
            if (badge) badge.classList.add('hidden');
        } else {
            list.innerHTML = items.map(i => `<button type="button" onclick="KtxApp.closeNotifications(); KtxApp.navigate('${i.tab}');" class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">${i.text}</button>`).join('');
        }
    }

    function getAcademicYearCode(year) {
        return year?.maNamHoc || year?.MaNamHoc || '';
    }

    function getAcademicYearLabel(year) {
        const code = getAcademicYearCode(year);
        const startDate = String(year?.ngayBatDau || year?.NgayBatDau || '');
        const endDate = String(year?.ngayKetThuc || year?.NgayKetThuc || '');
        const startYear = startDate.slice(0, 4);
        const endYear = endDate.slice(0, 4);
        return startYear && endYear ? `${startYear}–${endYear}` : code;
    }

    function formatAcademicYearDate(value) {
        const date = String(value || '').slice(0, 10);
        const parts = date.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '—';
    }

    async function fetchAcademicYears() {
        const response = await fetch('/api/namhoc');
        if (!response.ok) throw new Error('Không tải được danh sách năm học.');
        const years = await response.json();
        state.academicYears = Array.isArray(years) ? years : [];
        return state.academicYears;
    }

    async function toggleAcademicYearMenu() {
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        let years = [];
        try {
            years = await fetchAcademicYears();
        } catch (error) {
            showToast(error.message || 'Không tải được danh sách năm học.', 'error');
        }

        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onclick="KtxApp.closeModal()">
                <div class="w-full max-w-4xl bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] overflow-hidden animate-fade-in" onclick="event.stopPropagation()">
                    <div class="px-5 py-4 border-b border-slate-200 dark:border-[#232B3B] flex items-center justify-between">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-white">Quản lý năm học</h3>
                        <button type="button" onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600" aria-label="Đóng">✕</button>
                    </div>
                    <div class="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                        <form onsubmit="KtxApp.createAcademicYear(event)" class="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <input name="maNamHoc" maxlength="20" placeholder="Mã năm học (NH2027-2028)" aria-label="Mã năm học" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-[#232B3B] bg-slate-50 dark:bg-[#0B0F1A] text-xs" required />
                            <input name="ngayBatDau" type="date" aria-label="Ngày bắt đầu năm học" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-[#232B3B] bg-slate-50 dark:bg-[#0B0F1A] text-xs" required />
                            <input name="ngayKetThuc" type="date" aria-label="Ngày kết thúc năm học" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-[#232B3B] bg-slate-50 dark:bg-[#0B0F1A] text-xs" required />
                            <button type="submit" class="h-10 px-3 rounded-lg bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold">Thêm năm học</button>
                        </form>

                        <section class="rounded-xl border border-slate-200 dark:border-[#232B3B] overflow-hidden">
                            <div class="px-4 py-3 bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200 dark:border-[#232B3B]">
                                <h4 class="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Danh sách năm học</h4>
                            </div>
                            ${years.length ? years.map(year => {
                                const code = getAcademicYearCode(year);
                                const codeAttr = escapeHtml(code);
                                const selected = code === state.selectedAcademicYear;
                                const isActive = year.laDangHoat ?? year.LaDangHoat;
                                return `
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                                        <div class="min-w-0">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <span class="font-semibold text-sm text-slate-800 dark:text-white">Năm học ${escapeHtml(getAcademicYearLabel(year))}</span>
                                                ${isActive ? '<span class="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">Đang hoạt động</span>' : ''}
                                            </div>
                                            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">${codeAttr} · ${formatAcademicYearDate(year.ngayBatDau || year.NgayBatDau)} – ${formatAcademicYearDate(year.ngayKetThuc || year.NgayKetThuc)}</p>
                                        </div>
                                        <button type="button" data-academic-year="${codeAttr}" onclick="KtxApp.changeAcademicYear(this.dataset.academicYear); KtxApp.closeModal()" class="shrink-0 px-3 py-2 rounded-lg border ${selected ? 'border-[#0B2A5B] bg-blue-50 dark:bg-blue-900/30 text-[#0B2A5B] dark:text-blue-200' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'} text-xs font-semibold">${selected ? 'Đang chọn' : 'Chọn năm học'}</button>
                                    </div>
                                `;
                            }).join('') : '<div class="px-4 py-8 text-center text-xs text-slate-400">Chưa có năm học. Hãy tạo năm học đầu tiên.</div>'}
                        </section>
                    </div>
                </div>
            </div>
        `;
    }

    async function loadAcademicYearOptions(preferredCode = null) {
        const previousSelection = state.selectedAcademicYear;
        try {
            const years = await fetchAcademicYears();
            const codes = years.map(getAcademicYearCode);
            let selectedCode = preferredCode || state.selectedAcademicYear;
            if (!codes.includes(selectedCode)) selectedCode = '';

            state.selectedAcademicYear = selectedCode;
            if (selectedCode) localStorage.setItem('ktx_user_selected_academic_year', selectedCode);
            else localStorage.removeItem('ktx_user_selected_academic_year');
            localStorage.removeItem('ktx_selected_semester');
            renderAcademicYearOptions();
        } catch (error) {
            reportLoadFailure('Không tải được danh sách năm học', error);
        }
        return previousSelection !== state.selectedAcademicYear;
    }

    async function changeAcademicYear(code) {
        state.selectedAcademicYear = code || '';
        if (state.selectedAcademicYear) localStorage.setItem('ktx_user_selected_academic_year', state.selectedAcademicYear);
        else localStorage.removeItem('ktx_user_selected_academic_year');
        state.dashboardSummary = null;
        state.students = [];
        state.contracts = [];
        state.contractBuildings = [];
        state.contractBuildingsLoaded = false;
        state.applications = [];
        state.rooms = [];
        const yearSelect = document.getElementById('academicYearSelect');
        if (yearSelect) yearSelect.value = state.selectedAcademicYear;
        await renderActiveView();
    }

    async function createAcademicYear(e) {
        e.preventDefault();
        const form = e.target;
        const fd = new FormData(form);
        const body = {
            maNamHoc: String(fd.get('maNamHoc') || '').trim(),
            ngayBatDau: fd.get('ngayBatDau'),
            ngayKetThuc: fd.get('ngayKetThuc'),
            laDangHoat: true
        };

        if (body.ngayKetThuc <= body.ngayBatDau) {
            showToast('Ngày kết thúc phải sau ngày bắt đầu.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/namhoc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const result = await response.json().catch(() => null);
            if (!response.ok) {
                const message = typeof result === 'string' ? result : result?.message;
                showToast(message || 'Thêm năm học thất bại.', 'error');
                return;
            }

            state.selectedAcademicYear = body.maNamHoc;
            localStorage.setItem('ktx_user_selected_academic_year', body.maNamHoc);
            await loadAcademicYearOptions(body.maNamHoc);
            await toggleAcademicYearMenu();
            await renderActiveView();
            showToast('Đã thêm năm học và cập nhật vào bộ chọn.', 'success');
        } catch (error) {
            showToast(error.message || 'Thêm năm học thất bại.', 'error');
        }
    }


    function showNotificationToast() {
        const taskCount = state.dashboardSummary?.urgentTasks?.filter(task => !task.completed).length || 0;
        showToast(taskCount ? `Có ${taskCount} đầu việc cần xử lý` : 'Hiện không có đầu việc cần xử lý', 'info');
    }

    function openSearch() {
        const palette = document.getElementById('commandPaletteContainer');
        if (!palette) return;

        palette.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs" onclick="KtxApp.closeSearch()">
                <div class="w-full max-w-2xl bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] overflow-hidden animate-fade-in" onclick="event.stopPropagation()">
                    <div class="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-[#232B3B]">
                        <span class="material-symbols-outlined text-[20px] text-slate-400">search</span>
                        <input id="paletteInput" autoFocus type="text" placeholder="Tìm sinh viên, hợp đồng, phòng ốc hoặc gõ lệnh..." class="w-full bg-transparent text-sm text-slate-800 dark:text-white focus:outline-none" oninput="KtxApp.handlePaletteInput(this.value)" />
                        <kbd onclick="KtxApp.closeSearch()" class="cursor-pointer text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">ESC</kbd>
                    </div>
                    <div id="paletteResults" class="max-h-96 overflow-y-auto p-2 space-y-3">
                        <div class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lối tắt thao tác nhanh</div>
                        <div class="grid grid-cols-2 gap-1.5">
                            <button onclick="KtxApp.navigate('dashboard'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">dashboard</span>
                                <span>Về Dashboard Tổng quan</span>
                            </button>
                            <button onclick="KtxApp.navigate('don-dang-ky'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">how_to_reg</span>
                                <span>Xét duyệt đơn đăng ký</span>
                            </button>
                            <button onclick="KtxApp.navigate('hop-dong'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">edit_document</span>
                                <span>Quản lý Hợp đồng cư xá</span>
                            </button>
                            <button onclick="KtxApp.navigate('sinh-vien'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">badge</span>
                                <span>Hồ sơ Sinh viên</span>
                            </button>
                            <button onclick="KtxApp.navigate('lop-khoa'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">school</span>
                                <span>Lớp & Khoa viện</span>
                            </button>
                            <button onclick="KtxApp.navigate('phong-va-giuong'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">domain</span>
                                <span>Sơ đồ buồng phòng</span>
                            </button>
                            <button onclick="KtxApp.navigate('dien-nuoc-dich-vu'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">bolt</span>
                                <span>Điện nước & Dịch vụ</span>
                            </button>
                            <button onclick="KtxApp.navigate('hoa-don'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">receipt_long</span>
                                <span>Hóa đơn & Thu phí</span>
                            </button>
                            <button onclick="KtxApp.navigate('sua-chua'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">build</span>
                                <span>Yêu cầu sửa chữa</span>
                            </button>
                            <button onclick="KtxApp.navigate('vi-pham'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">gavel</span>
                                <span>Vi phạm & Kỷ luật</span>
                            </button>
                            <button onclick="KtxApp.navigate('nhan-vien-tai-khoan'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">manage_accounts</span>
                                <span>Nhân viên & Tài khoản</span>
                            </button>
                            <button onclick="KtxApp.navigate('bao-cao'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">bar_chart</span>
                                <span>Báo cáo thống kê</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function closeSearch() {
        const palette = document.getElementById('commandPaletteContainer');
        if (palette) palette.innerHTML = '';
    }

    function handlePaletteInput(query) {
        const results = document.getElementById('paletteResults');
        if (!results) return;
        if (!query.trim()) {
            results.innerHTML = `
                <div class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lối tắt thao tác nhanh</div>
                <div class="grid grid-cols-2 gap-1.5">
                    <button onclick="KtxApp.navigate('dashboard'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100">
                        <span class="material-symbols-outlined text-[18px] text-[#0B2A5B]">dashboard</span>
                        <span>Về Dashboard Tổng quan</span>
                    </button>
                    <button onclick="KtxApp.navigate('sinh-vien'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100">
                        <span class="material-symbols-outlined text-[18px] text-[#0B2A5B]">badge</span>
                        <span>Tra cứu hồ sơ sinh viên</span>
                    </button>
                </div>
            `;
            return;
        }

        const q = query.trim().toLowerCase();
        const matchStudents = (state.students || []).filter(s => s.name.toLowerCase().includes(q) || s.mssv.includes(q)).slice(0, 3);
        const matchContracts = (state.contracts || []).filter(c => c.contractNumber.toLowerCase().includes(q) || c.studentName.toLowerCase().includes(q)).slice(0, 3);

        results.innerHTML = `
            ${matchStudents.length > 0 ? `
                <div class="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sinh viên</div>
                <div class="space-y-1">
                    ${matchStudents.map(s => `
                        <div onclick="KtxApp.openStudentModal('${s.mssv}'); KtxApp.closeSearch();" class="p-2 rounded-xl hover:bg-slate-100 flex items-center justify-between cursor-pointer">
                            <span class="font-semibold text-xs">${s.name} (${s.mssv})</span>
                            <span class="text-xs text-slate-400">Phòng ${s.roomNumber}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${matchContracts.length > 0 ? `
                <div class="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-2">Hợp đồng</div>
                <div class="space-y-1">
                    ${matchContracts.map(c => `
                        <div onclick="KtxApp.openPrintModal('${c.contractNumber}'); KtxApp.closeSearch();" class="p-2 rounded-xl hover:bg-slate-100 flex items-center justify-between cursor-pointer">
                            <span class="font-semibold text-xs">${c.contractNumber} - ${c.studentName}</span>
                            <span class="text-xs text-blue-600 font-mono">${c.status}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${matchStudents.length === 0 && matchContracts.length === 0 ? `
                <div class="p-6 text-center text-xs text-slate-400">Không tìm thấy kết quả phù hợp với "${query}"</div>
            ` : ''}
        `;
    }

    // Filter updates
    function setAdmissionsTab(t) { state.admissionsTab = t; renderActiveView(); }
    function setAdmissionsPriority(p) { state.admissionsPriority = p; renderActiveView(); }
    function setAdmissionsSearch(s) { state.admissionsSearch = s; renderActiveView(); }

    function setContractsTab(t) { state.contractsTab = t; renderActiveView(); }
    function setContractsBuilding(b) { state.contractsBuilding = b; renderActiveView(); }
    function setContractsSearch(s) { state.contractsSearch = s; renderActiveView(); }

    function setStudentsCohort(c) { state.studentsCohort = c; renderActiveView(); }
    function setStudentsMajor(m) { state.studentsMajor = m; renderActiveView(); }
    function setStudentsSearch(s) { state.studentsSearch = s; renderActiveView(); }
    function resetStudentsFilters() {
        state.studentsCohort = '';
        state.studentsMajor = '';
        state.studentsSearch = '';
        showToast('Đã đặt lại bộ lọc sinh viên', 'info');
        renderActiveView();
    }

    function setRoomsViewMode(mode) { state.roomsViewMode = mode; renderActiveView(); }
    function setRoomsBuilding(building) {
        state.roomsBuilding = building;
        state.roomsFloor = 'all';
        state.roomsRoomNumber = 'all';
        renderActiveView();
    }
    function setRoomsFloor(floor) {
        state.roomsFloor = floor;
        state.roomsRoomNumber = 'all';
        renderActiveView();
    }
    function setRoomsRoomNumber(roomNumber) {
        state.roomsRoomNumber = roomNumber;
        renderActiveView();
    }

    async function exportReport(title = 'Báo cáo') {
        if (!state.selectedAcademicYear) {
            showToast('Vui lòng chọn năm học trước khi xuất báo cáo.', 'error');
            return;
        }
        const tab = state.currentTab;
        let rows = null;
        let headers = null;
        if (tab === 'sinh-vien' && Array.isArray(state.students) && state.students.length) {
            headers = ['MSSV', 'Họ tên', 'Giới tính', 'Lớp', 'Trạng thái', 'Điện thoại'];
            rows = state.students.map(s => [s.mssv || s.id, s.name, s.gender, s.className || s.major, s.residenceStatus, s.phone]);
        } else if (tab === 'hop-dong' && Array.isArray(state.contracts) && state.contracts.length) {
            headers = ['Mã HĐ', 'Sinh viên', 'MSSV', 'Phòng', 'Trạng thái'];
            rows = state.contracts.map(c => [c.contractNumber || c.id, c.studentName, c.studentId, c.room, c.status]);
        } else if (tab === 'don-dang-ky' && Array.isArray(state.applications) && state.applications.length) {
            headers = ['Mã đơn', 'Sinh viên', 'MSSV', 'Trạng thái', 'Ưu tiên'];
            rows = state.applications.map(a => [a.applicationCode, a.studentName, a.mssv, a.status, a.priorityCategory]);
        } else {
            try {
                const academicYear = state.selectedAcademicYear
                    ? `?academicYear=${encodeURIComponent(state.selectedAcademicYear)}`
                    : '';
                const res = await fetch(`/api/baocao/export${academicYear}`);
                if (!res.ok) throw new Error('fail');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'BaoCaoKTX.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                showToast(`Đã xuất ${title} ra file Excel.`, 'success');
                return;
            } catch (e) {
                showToast('Xuất báo cáo thất bại.', 'error');
                return;
            }
        }

        try {
            const csv = [headers.join(','), ...rows.map(r => r.map(v => `\"${String(v ?? '').replace(/\"/g, '\"\"')}\"`).join(','))].join('\\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title || 'DanhSach'}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showToast(`Đã xuất ${title} ra file CSV.`, 'success');
        } catch (e) {
            showToast('Xuất danh sách thất bại.', 'error');
        }
    }

    // Keyboard Shortcuts (Cmd+K)
    window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            openSearch();
        } else if (e.key === 'Escape') {
            closeSearch();
            closeModal();
        }
    });

    // Public API
    return {
        init: async function () {
            initTheme();
            await initUser();
            await loadAcademicYearOptions();
            renderApp(Boolean(state.currentUser));
            await loadAcademicYearOptions();
        },
        navigate,
        toggleDarkMode,
        toggleMobileMenu,
        toggleProfileMenu,
        toggleAcademicYearMenu,
        toggleNotifications,
        closeNotifications,
        openForgotModal,
        submitForgot,
        openVerifyModal,
        submitVerify,
        openResetPasswordModal,
        submitModalReset,
        openCreateRoomModal,
        submitCreateRoom,
        importStudentsExcel,
        openCreateStudentModal,
        submitCreateStudent,
        openCreateRoundModal,
        submitCreateRound,
        changeAcademicYear,
        createAcademicYear,
        showNotificationToast,
        openSearch,
        closeSearch,
        handlePaletteInput,
        showToast,
        handleLoginForm,
        setAuthMode,
        submitForgotForm,
        submitVerifyForm,
        submitResendCode,
        handleOtpInput,
        handleOtpPaste,
        handleOtpKeydown,
        togglePasswordVisibility,
        submitResetForm,
        logout,
        openRegistrationModal,
        closeRegistrationModal,
        actionTask,
        setAdmissionsTab,
        setAdmissionsPriority,
        setAdmissionsSearch,
        inspectCandidate,
        approveApp,
        rejectApp,
        setContractsTab,
        setContractsBuilding,
        setContractsSearch,
        openNewContractModal,
        submitNewContract,
        openPrintModal,
        renewContract,
        liquidateContract,
        setStudentsCohort,
        setStudentsMajor,
        setStudentsSearch,
        resetStudentsFilters,
        openStudentModal,
        setRoomsViewMode,
        setRoomsBuilding,
        setRoomsFloor,
        setRoomsRoomNumber,
        inspectRoom,
        toggleBedMaintenance,
        closeModal,
        getCurrentTab: () => state.currentTab,
        getSelectedAcademicYear: () => state.selectedAcademicYear,
        exportReport
    };
})();

// Auto boot on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    KtxApp.init();
});
