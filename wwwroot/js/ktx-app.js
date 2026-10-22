/**
 * KTX UTC2 - Application Frontend Controller
 * Connects directly to C# .NET Core Web APIs
 */

const KtxApp = (function () {
    // State
    const state = {
        currentUser: null,
        currentTab: 'dashboard',
        darkMode: false,
        selectedSemester: 'Năm học 2026-2027 · HK1',
        isMobileMenuOpen: false,
        isSearchOpen: false,
        toasts: [],
        
        // Data caches
        dashboardSummary: null,
        students: [],
        contracts: [],
        applications: [],
        rooms: [],

        // Active filters
        admissionsTab: 'pending',
        admissionsPriority: '',
        admissionsCohort: 'k65',
        admissionsGender: 'all',

        contractsTab: 'valid',
        contractsBuilding: 'all',
        contractsSearch: '',

        studentsCohort: 'k64',
        studentsMajor: 'cntt',
        studentsStatus: 'o',
        studentsSearch: '',

        roomsViewMode: 'roster',
        roomsBuilding: 'Tòa A01',
        roomsFloor: 'Tầng 1',
        roomsCohort: 'Khóa K64',
        roomsMajor: 'CNTT',
        roomsStatus: 'Đang ở',
        roomsSearch: '',

        // Active modals data
        selectedStudent: null,
        selectedContract: null,
        selectedApplication: null,
        selectedRoom: null
    };

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
            } catch (e) {
                state.currentUser = null;
            }
        } else {
            // Default to Quản lý KTX as demo mockup
            try {
                const res = await fetch('/api/auth/profile/ql_an');
                const json = await res.json();
                if (json.success && json.data) {
                    state.currentUser = json.data;
                    localStorage.setItem('utc2_current_user', JSON.stringify(json.data));
                }
            } catch (e) {
                console.error(e);
            }
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
                    navigate('dashboard');
                }, 400);
                return true;
            } else {
                showToast(json.message || 'Đăng nhập thất bại', 'error');
                return false;
            }
        } catch (e) {
            showToast('Lỗi kết nối máy chủ', 'error');
            return false;
        }
    }

    function logout() {
        state.currentUser = null;
        localStorage.removeItem('utc2_current_user');
        showToast('Đã đăng xuất khỏi phiên làm việc', 'info');
        renderApp();
    }

    async function switchUser(username) {
        try {
            const res = await fetch(`/api/auth/profile/${username}`);
            const json = await res.json();
            if (json.success && json.data) {
                state.currentUser = json.data;
                localStorage.setItem('utc2_current_user', JSON.stringify(json.data));
                showToast(`Đã chuyển sang tài khoản: ${json.data.name} (${json.data.role})`, 'success');
                renderApp();
            }
        } catch (e) {
            showToast('Không thể chuyển tài khoản', 'error');
        }
    }

    // Navigation
    function navigate(tab) {
        state.currentTab = tab;
        state.isMobileMenuOpen = false;
        renderApp();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Data Loaders from C# API
    async function loadDashboard() {
        try {
            const res = await fetch('/api/dashboard/summary');
            const json = await res.json();
            if (json.success) {
                state.dashboardSummary = json.data;
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function loadStudents() {
        try {
            const res = await fetch('/api/sinhvien');
            const json = await res.json();
            if (json.success) {
                state.students = json.data;
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function loadContracts() {
        try {
            const res = await fetch('/api/hopdong');
            const json = await res.json();
            if (json.success) {
                state.contracts = json.data;
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function loadApplications() {
        try {
            const res = await fetch('/api/dondangky');
            const json = await res.json();
            if (json.success) {
                state.applications = json.data;
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function loadRooms() {
        try {
            const res = await fetch('/api/phong');
            const json = await res.json();
            if (json.success) {
                state.rooms = json.data;
            }
        } catch (e) {
            console.error(e);
        }
    }

    // View Renderers
    function renderApp() {
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
        renderActiveView();
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
                            <div class="w-8 h-8 rounded bg-[#13325c] flex items-center justify-center shrink-0 border border-blue-400/20 shadow-xs">
                                <span class="material-symbols-outlined text-blue-400 text-[18px]">apartment</span>
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
                                <img src="${state.currentUser.avatar}" alt="${state.currentUser.name}" class="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-blue-400/40" />
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
            <header class="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/90 dark:bg-[#121826]/90 backdrop-blur-xl border-b border-[#E4E7EC] dark:border-[#232B3B] z-40 flex items-center justify-between px-4 lg:px-8 shadow-xs transition-colors">
                <!-- Left: Mobile hamburger & Search bar -->
                <div class="flex items-center gap-3 flex-1 max-w-xl">
                    <button type="button" onclick="KtxApp.toggleMobileMenu()" class="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span class="material-symbols-outlined text-[22px]">menu</span>
                    </button>

                    <!-- Global Search Bar -->
                    <div onclick="KtxApp.openSearch()" class="flex items-center gap-2.5 w-full max-w-md h-10 px-3.5 rounded-xl bg-slate-100/80 dark:bg-[#0B0F1A] border border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 cursor-pointer hover:border-[#0B2A5B] dark:hover:border-blue-500/50 transition-all shadow-2xs group">
                        <span class="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-[#0B2A5B] dark:group-hover:text-blue-400 transition-colors">search</span>
                        <span class="text-[13px] text-slate-400 dark:text-slate-400 truncate flex-1 select-none">Tìm kiếm (phòng, SV, hợp đồng...)</span>
                        <kbd class="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">⌘K</kbd>
                    </div>
                </div>

                <!-- Right: Semester, Dark mode, Notifications, Profile -->
                <div class="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
                    <!-- Semester Selector -->
                    <div class="relative">
                        <button type="button" onclick="KtxApp.toggleSemesterMenu()" class="hidden md:flex items-center gap-1.5 h-10 px-3 rounded-xl bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs">
                            <span class="material-symbols-outlined text-[17px] text-[#0B2A5B] dark:text-blue-400">calendar_today</span>
                            <span class="truncate max-w-[160px]">${state.selectedSemester}</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
                        </button>
                    </div>

                    <!-- Dark Mode Button -->
                    <button type="button" onclick="KtxApp.toggleDarkMode()" class="w-10 h-10 rounded-xl bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center shadow-2xs" title="Đổi chế độ sáng/tối">
                        <span class="material-symbols-outlined text-[19px]">${state.darkMode ? 'light_mode' : 'dark_mode'}</span>
                    </button>

                    <!-- Notifications Dropdown -->
                    <div class="relative">
                        <button type="button" onclick="KtxApp.showNotificationToast()" class="relative w-10 h-10 rounded-xl bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center shadow-2xs" title="Thông báo hệ thống">
                            <span class="material-symbols-outlined text-[20px]">notifications</span>
                            <span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        </button>
                    </div>

                    <!-- Profile Dropdown & Switcher -->
                    <div class="relative pl-1">
                        <button type="button" onclick="KtxApp.toggleProfileMenu()" class="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <img src="${state.currentUser.avatar}" alt="${state.currentUser.name}" class="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
                            <div class="hidden sm:flex flex-col text-left">
                                <span class="text-xs font-bold text-slate-900 dark:text-white leading-tight">${state.currentUser.name}</span>
                                <span class="text-[10px] text-slate-400">${state.currentUser.role}</span>
                            </div>
                            <span class="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
                        </button>

                        <div id="profileDropdown" class="hidden absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-2xl p-2 z-50 animate-fade-in">
                            <div class="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                                <div class="text-xs font-bold text-slate-900 dark:text-white">${state.currentUser.name}</div>
                                <div class="text-[11px] text-slate-400">${state.currentUser.email}</div>
                                <div class="mt-1 text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">${state.currentUser.department}</div>
                            </div>
                            
                            <div class="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Chuyển vai trò Demo</div>
                            <div class="space-y-0.5">
                                <button onclick="KtxApp.switchUser('ql_an')" class="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between">
                                    <span>Nguyễn Văn An (Quản lý)</span>
                                    ${state.currentUser.username === 'ql_an' ? '<span class="material-symbols-outlined text-[16px] text-blue-600">check</span>' : ''}
                                </button>
                                <button onclick="KtxApp.switchUser('kt_binh')" class="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between">
                                    <span>Lê Thị Bình (Kế toán)</span>
                                    ${state.currentUser.username === 'kt_binh' ? '<span class="material-symbols-outlined text-[16px] text-blue-600">check</span>' : ''}
                                </button>
                                <button onclick="KtxApp.switchUser('sv_minh')" class="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between">
                                    <span>Trần Nhật Minh (Sinh viên)</span>
                                    ${state.currentUser.username === 'sv_minh' ? '<span class="material-symbols-outlined text-[16px] text-blue-600">check</span>' : ''}
                                </button>
                                <button onclick="KtxApp.switchUser('admin')" class="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between">
                                    <span>Nguyễn Hoàng (Admin)</span>
                                    ${state.currentUser.username === 'admin' ? '<span class="material-symbols-outlined text-[16px] text-blue-600">check</span>' : ''}
                                </button>
                            </div>

                            <div class="border-t border-slate-100 dark:border-slate-800 mt-2 pt-1">
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
    }

    // Login View (Exact 2-column split layout from demo)
    function renderLoginView() {
        return `
            <div class="min-h-screen flex flex-col lg:flex-row bg-[#F4F5F7] dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] transition-colors duration-200">
                <!-- CỘT TRÁI (55%): Hình ảnh KTX, Gradient thương hiệu -->
                <div class="relative lg:w-[55%] min-h-[420px] lg:min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden bg-[#071A38]">
                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3dvVjk-VBybNNm2JxsMrQaZ6Xla-sc1rVEyAFG2H0jv9xDxwSH34iwwPfDDS5Jt2EcCbrNtjgifb_LUustJ5LLX-wWRxs5bE0pnmTNgzO6h2K7DI50Bd-B6AvG-rKGcoepNHgfiDO_KueLGSz5lU3Y3z9RCSJ4ehNXg7H2IRFbKzQfHe05BeiyY93w2dUCTFP3PpgR201q3ZUKv89imHbo0QV9GTn6hj2O_WjM7JszDgBpr67wdIlpA" alt="Campus KTX UTC2" class="absolute inset-0 w-full h-full object-cover object-center scale-105" />
                    <div class="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] via-[#0B2A5B]/85 to-[#071A38]/90 backdrop-blur-[2px]"></div>
                    <div class="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10"></div>

                    <!-- Header Bên Trái: Logo UTC2 -->
                    <div class="relative z-10 flex items-center justify-between">
                        <div class="flex items-center space-x-3.5 min-w-0">
                            <div class="w-12 h-12 shrink-0 rounded-full bg-white p-0.5 shadow-lg flex items-center justify-center overflow-hidden border border-white/40">
                                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGYdvcqp3rSyDsU3ZgkBsQXIR7k3bUm9ejInncJAQuJ5gd2szuChbhMQ8fpFYG-oGVlt4qrvEcRF-RIau-_yaHGxDM6i6_INXHLsIyhPpgKVvhTNH4SjGGjPeIe3ZiKRHgw-gDN84jhw0TVx8xGLpikBNfkw9R369xGJVkTBoeHrhqvmnwsKqyf9cPl3WTH1AimnMi2n_ipdXle85Quk5jLo-pekss71Hv9Am80tdBvoQv7FOOvx9QwPMpyqeVw8TUTLI" alt="Logo UTC2" class="w-full h-full object-contain rounded-full" />
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

                    <!-- Footer Bên Trái -->
                    <div class="relative z-10 flex flex-wrap items-center justify-between gap-4 text-xs text-blue-200/60 pt-6 border-t border-white/10">
                        <div class="text-blue-200/70">© Phân hiệu Trường Đại học Giao thông Vận tải tại TP. Hồ Chí Minh</div>
                        <div class="text-blue-200/50 text-[11px]">Hệ thống Quản lý Ký túc xá v2.4 (ASP.NET Core C#)</div>
                    </div>
                </div>

                <!-- CỘT PHẢI (45%): Form Đăng nhập & Nút Demo -->
                <div class="lg:w-[45%] flex flex-col justify-center px-6 sm:px-12 xl:px-16 py-12 bg-white dark:bg-[#121826] transition-colors duration-200">
                    <div class="w-full max-w-md mx-auto">
                        <div class="mb-8">
                            <h2 class="text-2xl sm:text-3xl font-bold text-[#0B0F1A] dark:text-white">Đăng nhập</h2>
                        </div>

                        <form id="loginForm" class="space-y-5" onsubmit="event.preventDefault(); KtxApp.handleLoginForm();">
                            <div>
                                <label class="block text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-300 mb-1.5">Tên đăng nhập / Mã số</label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
                                        <span class="material-symbols-outlined text-[18px]">person</span>
                                    </div>
                                    <input type="text" id="loginUsername" required value="ql_an" placeholder="Nhập mã nhân viên hoặc MSSV (vd: ql_an)" class="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-[#0B0F1A] border border-[#E4E7EC] dark:border-[#232B3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2A5B] text-[#0B0F1A] dark:text-[#E8EAF0]" />
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-300 mb-1.5">Mật khẩu</label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
                                        <span class="material-symbols-outlined text-[18px]">key</span>
                                    </div>
                                    <input type="password" id="loginPassword" required value="quanly123" placeholder="••••••••" class="w-full pl-10 pr-11 py-2.5 text-sm bg-white dark:bg-[#0B0F1A] border border-[#E4E7EC] dark:border-[#232B3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2A5B] text-[#0B0F1A] dark:text-[#E8EAF0]" />
                                </div>
                            </div>

                            <div class="flex items-center justify-between pt-1">
                                <label class="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" checked class="w-4 h-4 rounded border-[#E4E7EC] text-[#0B2A5B] focus:ring-[#0B2A5B]" />
                                    <span class="text-xs text-[#667085] dark:text-slate-400 font-medium">Ghi nhớ đăng nhập</span>
                                </label>
                                <button type="button" onclick="alert('Vui lòng liên hệ Văn phòng Quản lý KTX UTC2 (Phòng 102 - Tòa A) hoặc hotline 028.3896.6780 để cấp lại mật khẩu.')" class="text-xs font-semibold text-[#0B2A5B] dark:text-[#4C7DD9] hover:underline">Quên mật khẩu?</button>
                            </div>

                            <button type="submit" id="loginSubmitBtn" class="w-full py-3 px-4 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] active:scale-[0.99] text-white font-semibold text-sm shadow-sm transition flex items-center justify-center gap-2">
                                <span>Đăng nhập</span>
                                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                        </form>

                        <!-- Phân cách Tài khoản Demo -->
                        <div class="relative my-8">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-[#E4E7EC] dark:border-[#232B3B]"></div>
                            </div>
                            <div class="relative flex justify-center text-xs uppercase">
                                <span class="bg-white dark:bg-[#121826] px-3 text-[#98A2B3] font-semibold tracking-wider">Tài khoản demo nhanh</span>
                            </div>
                        </div>

                        <!-- 4 Nút Demo Vai Trò -->
                        <div class="flex flex-wrap items-center justify-center gap-2">
                            <button type="button" onclick="KtxApp.fillDemo('ql_an', 'quanly123', 'Quản lý KTX')" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E4E7EC] dark:border-[#232B3B] bg-white dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] hover:border-[#0B2A5B] transition shadow-xs">Quản lý KTX</button>
                            <button type="button" onclick="KtxApp.fillDemo('kt_binh', 'ketoan123', 'Kế toán')" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E4E7EC] dark:border-[#232B3B] bg-white dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] hover:border-[#0B2A5B] transition shadow-xs">Kế toán</button>
                            <button type="button" onclick="KtxApp.fillDemo('sv_minh', 'sinhvien123', 'Sinh viên')" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E4E7EC] dark:border-[#232B3B] bg-white dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] hover:border-[#0B2A5B] transition shadow-xs">Sinh viên</button>
                            <button type="button" onclick="KtxApp.fillDemo('admin', 'admin123', 'Admin')" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E4E7EC] dark:border-[#232B3B] bg-white dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] hover:border-[#0B2A5B] transition shadow-xs">Admin</button>
                        </div>

                        <div class="mt-8 text-center">
                            <p class="text-xs text-[#667085] dark:text-slate-400">
                                Chưa có tài khoản?
                                <button type="button" onclick="KtxApp.openRegistrationModal()" class="font-semibold text-[#0B2A5B] dark:text-[#4C7DD9] hover:underline">Đăng ký nội trú</button>
                            </p>
                        </div>
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
                            <p>Sinh viên chính quy Khóa mới (K65) và các khóa K62, K63, K64 có nguyện vọng lưu trú tại Ký túc xá UTC2 Phân hiệu TP.HCM nộp hồ sơ trực tuyến:</p>
                            <ul class="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-200">
                                <li><strong>Hồ sơ ưu tiên:</strong> Bản scan Giấy chứng nhận hộ nghèo, con thương binh hoặc học sinh vùng sâu (KV1).</li>
                                <li><strong>Điểm xét tuyển:</strong> Điểm thi tuyển sinh hoặc điểm rèn luyện & GPA gần nhất.</li>
                                <li><strong>Thời gian xử lý:</strong> Ban Quản lý duyệt và phản hồi trong vòng 24 - 48 giờ.</li>
                            </ul>
                            <div class="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 text-[#0B2A5B] dark:text-blue-300">
                                Đang có đợt xét tuyển K65 với <strong>86 hồ sơ chờ duyệt</strong>. Bạn có thể đăng nhập bằng tài khoản <strong>Quản lý KTX</strong> để xem xét duyệt.
                            </div>
                        </div>
                        <div class="flex justify-end pt-2">
                            <button type="button" onclick="KtxApp.closeRegistrationModal(); KtxApp.fillDemo('ql_an', 'quanly123', 'Quản lý KTX')" class="px-4 py-2 rounded-xl bg-[#0B2A5B] text-white font-semibold text-xs hover:bg-[#143F8C] transition-colors">
                                Trải nghiệm với tài khoản Quản lý
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function fillDemo(username, password, roleName) {
        const u = document.getElementById('loginUsername');
        const p = document.getElementById('loginPassword');
        if (u) u.value = username;
        if (p) p.value = password;
        showToast(`Đã điền tài khoản: ${roleName}`, 'info');
    }

    async function handleLoginForm() {
        const u = document.getElementById('loginUsername').value;
        const p = document.getElementById('loginPassword').value;
        const btn = document.getElementById('loginSubmitBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span><span>Đang xác thực...</span>`;
        }
        await login(u, p);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>Đăng nhập</span><span class="material-symbols-outlined text-[18px]">arrow_forward</span>`;
        }
    }

    // Active View Router
    async function renderActiveView() {
        const content = document.getElementById('mainContent');
        if (!content) return;

        if (state.currentTab === 'dashboard') {
            await loadDashboard();
            content.innerHTML = renderDashboardView();
        } else if (state.currentTab === 'don-dang-ky') {
            await loadApplications();
            content.innerHTML = renderAdmissionsView();
        } else if (state.currentTab === 'hop-dong') {
            await loadContracts();
            content.innerHTML = renderContractsView();
        } else if (state.currentTab === 'sinh-vien') {
            await loadStudents();
            content.innerHTML = renderStudentsView();
        } else if (state.currentTab === 'phong-va-giuong') {
            await loadRooms();
            content.innerHTML = renderRoomsView();
        } else {
            // Secondary fallback tabs
            content.innerHTML = `
                <div class="bg-white dark:bg-[#121826] rounded-2xl p-8 shadow-xs border border-slate-200 dark:border-[#232B3B] text-center space-y-4">
                    <div class="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-[#0B2A5B] dark:text-blue-400 mx-auto flex items-center justify-center">
                        <span class="material-symbols-outlined text-[32px]">dataset</span>
                    </div>
                    <h2 class="text-xl font-bold text-slate-900 dark:text-white capitalize">${state.currentTab.replace(/-/g, ' ')}</h2>
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
    }

    // 1. Dashboard View Renderer
    function renderDashboardView() {
        const d = state.dashboardSummary || {
            totalStudents: 3420,
            totalCapacity: 3800,
            occupancyPercent: 90.0,
            totalFeeRevenue: 1280000000,
            debtAmount: 210000000,
            collectedPercent: 86,
            pendingApplicationsCount: 48,
            repairRequestsCount: 12,
            zoneOccupancies: [],
            urgentTasks: []
        };

        const activeTaskCount = (d.urgentTasks || []).filter(t => !t.completed).length;

        return `
            <div class="flex flex-col w-full space-y-6">
                <!-- 1. Hero Welcome Banner -->
                <section class="bg-[#0b2a5b] dark:bg-[#071A38] text-white rounded-2xl p-6 lg:p-7 shadow-sm relative overflow-hidden">
                    <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="space-y-1">
                            <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-white font-headline">Tổng quan KTX</h1>
                            <p class="text-blue-200/80 text-xs">Hệ thống quản lý thời gian thực Ký túc xá Phân hiệu UTC2 TP.HCM (C# .NET Core + SQL Server)</p>
                        </div>
                        <div class="flex items-center gap-2.5 shrink-0 flex-wrap">
                            <button type="button" onclick="KtxApp.openNewContractModal()" class="h-10 px-4 rounded-xl bg-white text-[#0b2a5b] font-semibold text-xs hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[18px]">post_add</span>
                                <span>Lập hợp đồng mới</span>
                            </button>
                            <button type="button" onclick="KtxApp.exportReport()" class="h-10 px-4 rounded-xl bg-[#00163a] text-white font-semibold text-xs hover:bg-white/10 transition-colors flex items-center gap-1.5 border border-white/20">
                                <span class="material-symbols-outlined text-[18px]">ios_share</span>
                                <span>Báo cáo nhanh</span>
                            </button>
                        </div>
                    </div>
                </section>

                <!-- 2. Hàng 4 Chỉ số KPI Cốt Lõi -->
                <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- KPI 1 -->
                    <div onclick="KtxApp.navigate('sinh-vien')" class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
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
                    <div onclick="KtxApp.navigate('hoa-don')" class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
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
                            <span class="text-[#375ba9] dark:text-blue-400 font-semibold">Đã thu ${d.collectedPercent}%</span>
                            <span class="text-red-600 dark:text-red-400 font-semibold">Nợ ${formatVND(d.debtAmount, true)}</span>
                        </div>
                    </div>

                    <!-- KPI 3 -->
                    <div onclick="KtxApp.navigate('don-dang-ky')" class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
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
                        <div class="text-xs text-[#375ba9] dark:text-blue-400 flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800/80 font-semibold">
                            <span>Ưu tiên xét duyệt →</span>
                        </div>
                    </div>

                    <!-- KPI 4 -->
                    <div onclick="KtxApp.showToast('Mở trung tâm điều phối kỹ thuật & bảo trì sự cố', 'info')" class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
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
                        <div class="text-xs text-red-600 dark:text-red-400 flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800/80 font-semibold">
                            <span>Điều phối kỹ thuật →</span>
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
                                ${(d.zoneOccupancies || []).map(z => `
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
                                    <span class="text-xl font-bold text-slate-900 dark:text-white mt-1 block">1,49 Tỷ</span>
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
                                ${(d.urgentTasks || []).map(task => `
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

                                        <button type="button" ${task.completed ? 'disabled' : ''} onclick="KtxApp.actionTask('${task.id}', '${task.type}')" class="h-7 px-3 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
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
        let filtered = apps;

        if (state.admissionsTab !== 'all') {
            if (state.admissionsTab === 'pending') filtered = filtered.filter(a => a.status === 'Chờ duyệt');
            else if (state.admissionsTab === 'approved') filtered = filtered.filter(a => a.status === 'Đã duyệt');
            else if (state.admissionsTab === 'rejected') filtered = filtered.filter(a => a.status === 'Bị từ chối');
        }

        if (state.admissionsPriority) {
            filtered = filtered.filter(a => a.priorityCategory.toLowerCase().includes(state.admissionsPriority.toLowerCase()));
        }

        return `
            <div class="flex flex-col w-full space-y-6">
                <!-- Header -->
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Đợt & Đơn đăng ký</h1>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Xét duyệt hồ sơ nhập túc xá tân sinh viên K65 và sinh viên tái đăng ký nội trú</p>
                    </div>
                    <div class="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button type="button" onclick="KtxApp.exportReport('Đơn tuyển sinh K65')" class="h-10 px-4 rounded-xl bg-white dark:bg-[#1E293B] hover:bg-slate-50 text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-2xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[18px] text-slate-500">file_download</span>
                            <span>Xuất danh sách</span>
                        </button>
                        <button type="button" onclick="KtxApp.showToast('Mở form tạo đợt đăng ký mới cho học kỳ tiếp theo', 'info')" class="h-10 px-4 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[18px]">add</span>
                            <span>Tạo đợt mới</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metrics -->
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div class="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Tổng hồ sơ</span>
                        <div class="my-2 flex items-baseline gap-2">
                            <span class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">420</span>
                            <span class="text-xs text-slate-500">chỉ tiêu 450</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div class="bg-[#0B2A5B] dark:bg-blue-500 h-full rounded-full" style="width: 93.3%"></div>
                        </div>
                        <div class="flex justify-between items-center mt-1.5 text-slate-500 text-[11px]">
                            <span>Tiến độ lấp đầy</span>
                            <span class="font-semibold text-[#0B2A5B] dark:text-blue-400">93.3%</span>
                        </div>
                    </div>

                    <div class="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Đã duyệt</span>
                        <div class="my-2 flex items-baseline gap-2">
                            <span class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">312</span>
                            <span class="text-xs text-emerald-600 font-semibold">74.3%</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div class="bg-emerald-600 h-full rounded-full" style="width: 74%"></div>
                        </div>
                        <div class="flex justify-between items-center mt-1.5 text-slate-500 text-[11px]">
                            <span>Xác nhận đóng phí</span>
                            <span class="font-semibold text-emerald-600">289/312 SV</span>
                        </div>
                    </div>

                    <div class="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Chờ xét duyệt</span>
                        <div class="my-2 flex items-baseline gap-2">
                            <span class="text-3xl font-bold text-[#0B2A5B] dark:text-blue-400 tracking-tight">86</span>
                            <span class="text-xs text-blue-600/80">đơn tồn đọng</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div class="bg-[#0B2A5B] dark:bg-blue-400 h-full rounded-full" style="width: 20%"></div>
                        </div>
                        <div class="flex justify-between items-center mt-1.5 text-slate-500 text-[11px]">
                            <span>Thời gian xử lý TB</span>
                            <span class="font-bold text-[#0B2A5B] dark:text-blue-400">&lt; 2.5 giờ</span>
                        </div>
                    </div>

                    <div class="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Từ chối / Hủy</span>
                        <div class="my-2 flex items-baseline gap-2">
                            <span class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">22</span>
                            <span class="text-xs text-slate-500">5.2%</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div class="bg-slate-400 h-full rounded-full" style="width: 5%"></div>
                        </div>
                        <div class="flex justify-between items-center mt-1.5 text-slate-500 text-[11px]">
                            <span>Phúc khảo</span>
                            <span class="font-semibold text-slate-700 dark:text-slate-300">3 đơn</span>
                        </div>
                    </div>
                </div>

                <!-- Tabs & Filter Bar -->
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
                    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                        <button type="button" onclick="KtxApp.setAdmissionsTab('pending')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                            state.admissionsTab === 'pending' ? 'bg-[#0B2A5B] text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }">
                            <span>Chờ duyệt</span>
                            <span class="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">86</span>
                        </button>
                        <button type="button" onclick="KtxApp.setAdmissionsTab('approved')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                            state.admissionsTab === 'approved' ? 'bg-[#0B2A5B] text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }">
                            <span>Đã duyệt</span>
                            <span class="text-[11px] text-slate-400">312</span>
                        </button>
                        <button type="button" onclick="KtxApp.setAdmissionsTab('rejected')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                            state.admissionsTab === 'rejected' ? 'bg-[#0B2A5B] text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }">
                            <span>Bị từ chối</span>
                            <span class="text-[11px] text-slate-400">22</span>
                        </button>
                        <button type="button" onclick="KtxApp.setAdmissionsTab('all')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                            state.admissionsTab === 'all' ? 'bg-[#0B2A5B] text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }">Tất cả (420)</button>
                    </div>

                    <div class="flex items-center gap-2 flex-wrap">
                        <select onchange="KtxApp.setAdmissionsPriority(this.value)" class="h-9 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
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
                                                <img src="${app.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuApy05bQf0n4X_3prqg9yRnz1Up26ewX2j1XKbV6Xt4a-hJZehP0j72pEsQwNuUzh_nPoWXQGNOgFkC2Me0lALOeEj0dQADljvkwQMdtiZQzuASphPArI_NMYnujwIu8_vxfXfLlucOEC-ZSM50VINW56baL0PSL5VAHyQNPkgrhhNC18YFXZgdM9I51O-AR2Xn0aYBoy4fwCLeh5tLezRdOv5KlpxttMInEo_NnrWTT7t_2jRPIDcxwQ'}" alt="${app.studentName}" class="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200" />
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
                                        <td class="py-3.5 px-4 text-center font-bold text-base text-[#0B2A5B] dark:text-blue-400 font-headline">${app.scoreDX}</td>
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
        let filtered = contracts;

        if (state.contractsTab === 'valid') filtered = filtered.filter(c => c.status === 'Hiệu lực');
        else if (state.contractsTab === 'expiring') filtered = filtered.filter(c => c.status === 'Sắp hết hạn');
        else if (state.contractsTab === 'ended') filtered = filtered.filter(c => c.status === 'Đã thanh lý');

        if (state.contractsBuilding !== 'all') {
            filtered = filtered.filter(c => c.buildingId.includes(state.contractsBuilding) || c.roomNumber.startsWith(state.contractsBuilding));
        }

        if (state.contractsSearch) {
            const q = state.contractsSearch.toLowerCase();
            filtered = filtered.filter(c => c.contractNumber.toLowerCase().includes(q) || c.studentName.toLowerCase().includes(q) || c.mssv.includes(q));
        }

        return `
            <div class="flex flex-col w-full space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Quản lý Hợp đồng</h1>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Theo dõi thời hạn lưu trú, tiền cọc bảo lãnh và gia hạn tự động</p>
                    </div>
                    <div class="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button type="button" onclick="KtxApp.showToast('Đang quét và gửi thông báo gia hạn hàng loạt cho 45 hợp đồng sắp hết hạn!', 'info')" class="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-2xs border border-slate-200 dark:border-slate-700">
                            <span class="material-symbols-outlined text-[18px] text-[#375ba9] dark:text-blue-400">update</span>
                            <span>Gia hạn hàng loạt</span>
                        </button>
                        <button type="button" onclick="KtxApp.openNewContractModal()" class="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs transition-all shadow-sm">
                            <span class="material-symbols-outlined text-[18px]">add_circle</span>
                            <span>Lập hợp đồng mới</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metrics -->
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">ĐANG HIỆU LỰC</span>
                            <span class="material-symbols-outlined text-blue-500 text-[20px]">verified_user</span>
                        </div>
                        <div class="mt-2 flex items-baseline gap-2">
                            <span class="text-3xl font-bold text-[#0B2A5B] dark:text-blue-400 tracking-tight">3.240</span>
                            <span class="text-xs text-slate-500">hồ sơ</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div class="bg-[#375ba9] dark:bg-blue-500 h-full rounded-full" style="width: 94%"></div>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">SẮP HẾT HẠN (≤ 15 NGÀY)</span>
                            <span class="material-symbols-outlined text-amber-500 text-[20px]">warning</span>
                        </div>
                        <div class="mt-2 flex items-baseline gap-2">
                            <span class="text-3xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">45</span>
                            <span class="text-xs text-amber-600/80">hợp đồng</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div class="bg-amber-500 h-full rounded-full" style="width: 28%"></div>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">ĐÃ THANH LÝ</span>
                            <span class="material-symbols-outlined text-slate-400 text-[20px]">assignment_turned_in</span>
                        </div>
                        <div class="mt-2 flex items-baseline gap-2">
                            <span class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">180</span>
                            <span class="text-xs text-slate-500">kỳ này</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div class="bg-slate-400 h-full rounded-full" style="width: 100%"></div>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">TỔNG TIỀN CỌC GIỮ</span>
                            <span class="material-symbols-outlined text-emerald-500 text-[20px]">savings</span>
                        </div>
                        <div class="mt-2 flex items-baseline gap-1">
                            <span class="text-2xl font-bold text-[#0B2A5B] dark:text-blue-300 tracking-tight">1.620.000.000</span>
                            <span class="text-xs font-semibold text-[#0B2A5B]">đ</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div class="bg-emerald-500 h-full rounded-full" style="width: 88%"></div>
                        </div>
                    </div>
                </div>

                <!-- Filters Strip -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                            <button type="button" onclick="KtxApp.setContractsTab('valid')" class="px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 ${
                                state.contractsTab === 'valid' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                            }">
                                <span>Đang hiệu lực</span>
                                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">3.240</span>
                            </button>
                            <button type="button" onclick="KtxApp.setContractsTab('expiring')" class="px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 ${
                                state.contractsTab === 'expiring' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                            }">
                                <span>Sắp hết hạn</span>
                                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">45</span>
                            </button>
                            <button type="button" onclick="KtxApp.setContractsTab('ended')" class="px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 ${
                                state.contractsTab === 'ended' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                            }">
                                <span>Đã thanh lý</span>
                                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">180</span>
                            </button>
                            <button type="button" onclick="KtxApp.setContractsTab('all')" class="px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                                state.contractsTab === 'all' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                            }">Tất cả</button>
                        </div>

                        <div class="flex items-center gap-2.5 flex-wrap">
                            <input type="text" oninput="KtxApp.setContractsSearch(this.value)" placeholder="Số HĐ hoặc tên/MSSV..." class="w-full sm:w-64 h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs text-slate-800 dark:text-white focus:outline-none" />
                            <select onchange="KtxApp.setContractsBuilding(this.value)" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                <option value="all">Tất cả Tòa</option>
                                <option value="A">Khu Tòa A</option>
                                <option value="B">Khu Tòa B</option>
                                <option value="C">Khu Tòa C</option>
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
                                        <td class="py-3.5 px-4 text-center">
                                            <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${
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
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                            <span>Quản lý Nội trú</span>
                            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
                            <span class="text-[#0B2A5B] dark:text-blue-400 font-semibold">Hồ sơ Sinh viên</span>
                        </div>
                        <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-headline">Hồ sơ Sinh viên</h1>
                    </div>
                    <div class="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button type="button" onclick="KtxApp.exportReport('Danh sách Sinh viên')" class="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-white dark:bg-[#1E293B] hover:bg-slate-50 text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-2xs border border-slate-200 dark:border-slate-700">
                            <span class="material-symbols-outlined text-[18px] text-slate-500">upload_file</span>
                            <span>Nhập Excel</span>
                        </button>
                        <button type="button" onclick="KtxApp.showToast('Mở biểu mẫu tiếp nhận sinh viên mới vào KTX', 'info')" class="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs transition-all shadow-sm">
                            <span class="material-symbols-outlined text-[18px]">person_add</span>
                            <span>Tiếp nhận SV mới</span>
                        </button>
                    </div>
                </div>

                <!-- 4 KPI Metrics -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Tổng sinh viên nội trú</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0B2A5B]">
                                <span class="material-symbols-outlined text-[20px]">groups</span>
                            </div>
                        </div>
                        <div class="mt-3">
                            <div class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">3.420</div>
                            <div class="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                                <span>Đạt 97.4% công suất giường</span>
                            </div>
                        </div>
                    </div>

                    <div class="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Nam sinh (Khu A)</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#375ba9]">
                                <span class="material-symbols-outlined text-[20px]">male</span>
                            </div>
                        </div>
                        <div class="mt-3">
                            <div class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">1.950</div>
                            <div class="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                <span class="w-2 h-2 rounded-full bg-[#375ba9]"></span>
                                <span>57% tổng nội trú · Tòa A1, A2, A3</span>
                            </div>
                        </div>
                    </div>

                    <div class="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Nữ sinh (Khu B)</span>
                            <div class="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
                                <span class="material-symbols-outlined text-[20px]">female</span>
                            </div>
                        </div>
                        <div class="mt-3">
                            <div class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">1.470</div>
                            <div class="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                <span class="w-2 h-2 rounded-full bg-pink-500"></span>
                                <span>43% tổng nội trú · Tòa B1, B2</span>
                            </div>
                        </div>
                    </div>

                    <div class="p-5 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Tạm vắng / Nghỉ phép</span>
                            <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                                <span class="material-symbols-outlined text-[20px]">event_busy</span>
                            </div>
                        </div>
                        <div class="mt-3">
                            <div class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">18</div>
                            <div class="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                                <span>0.5% · Cập nhật 15 phút trước</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Filters Strip -->
                <div class="p-4 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
                    <input type="text" oninput="KtxApp.setStudentsSearch(this.value)" placeholder="Tìm tên, MSSV, CCCD, số phòng..." class="w-full xl:w-80 h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs text-slate-800 dark:text-white focus:outline-none" />
                    
                    <div class="flex flex-wrap items-center gap-2">
                        <select onchange="KtxApp.setStudentsCohort(this.value)" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                            <option value="">Tất cả Khóa</option>
                            <option value="k62">Khóa K62</option>
                            <option value="k63">Khóa K63</option>
                            <option value="k64" selected>Khóa K64</option>
                            <option value="k65">Khóa K65</option>
                        </select>
                        <select onchange="KtxApp.setStudentsMajor(this.value)" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                            <option value="">Tất cả Khoa viện</option>
                            <option value="cntt" selected>CNTT</option>
                            <option value="cơ khí">Cơ khí</option>
                            <option value="kinh tế">Kinh tế vận tải</option>
                            <option value="công trình">Công trình</option>
                            <option value="logistics">Logistics</option>
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
                                                <img src="${s.avatarUrl}" alt="${s.name}" class="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200" />
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
                                            <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.paymentStatus === 'Đủ' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">${s.paymentStatus === 'Đủ' ? 'Đã đóng' : 'Nợ phí'}</span>
                                        </td>
                                        <td class="py-3.5 px-4">
                                            <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.residenceStatus === 'Đang ở' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}">${s.residenceStatus}</span>
                                        </td>
                                        <td class="py-3.5 px-4 text-right">
                                            <div class="inline-flex items-center gap-1">
                                                <button type="button" onclick="KtxApp.openStudentModal('${s.mssv}')" class="p-1 rounded-lg text-slate-400 hover:text-[#0B2A5B]" title="Xem hồ sơ">
                                                    <span class="material-symbols-outlined text-[18px]">visibility</span>
                                                </button>
                                                <button type="button" onclick="KtxApp.openTransferModal('${s.mssv}')" class="p-1 rounded-lg text-slate-400 hover:text-[#0B2A5B]" title="Đổi phòng">
                                                    <span class="material-symbols-outlined text-[18px]">swap_horiz</span>
                                                </button>
                                            </div>
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

    // 5. Rooms View Renderer (Sơ đồ Phòng & Giường - Roster vs Grid view)
    function renderRoomsView() {
        const rooms = state.rooms || [];
        const isGrid = state.roomsViewMode === 'grid';

        return `
            <div class="flex flex-col w-full space-y-5">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-[#0B2A5B] dark:bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
                            <span class="material-symbols-outlined text-[22px]">domain</span>
                        </div>
                        <div>
                            <h1 class="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-headline">Sơ đồ Phòng & Giường</h1>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Phân hiệu TP.HCM · Quản lý buồng phòng & hồ sơ cư xá</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button type="button" onclick="KtxApp.exportReport('Sơ đồ phòng KTX')" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition-all text-xs font-semibold border border-slate-200 dark:border-slate-700">
                            <span class="material-symbols-outlined text-[18px] text-[#375ba9] dark:text-blue-400">table_view</span>
                            <span>Xuất file Excel</span>
                        </button>
                        <button type="button" onclick="KtxApp.showToast('Mở cửa sổ cấu hình thêm phòng buồng mới', 'info')" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white shadow-sm transition-all text-xs font-semibold">
                            <span class="material-symbols-outlined text-[18px]">add</span>
                            <span>Thêm phòng mới</span>
                        </button>
                    </div>
                </div>

                <!-- 5 Metrics Cards -->
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3 rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
                    <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-100 dark:border-[#232B3B]">
                        <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0B2A5B] shrink-0">
                            <span class="material-symbols-outlined text-[20px]">meeting_room</span>
                        </div>
                        <div>
                            <div class="text-xl font-bold text-[#0B2A5B] dark:text-white leading-none">48</div>
                            <div class="text-[11px] text-slate-500 font-medium mt-1 truncate">Tổng phòng</div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-100 dark:border-[#232B3B]">
                        <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0B2A5B] shrink-0">
                            <span class="material-symbols-outlined text-[20px]">bed</span>
                        </div>
                        <div>
                            <div class="text-xl font-bold text-[#0B2A5B] dark:text-white leading-none">384</div>
                            <div class="text-[11px] text-slate-500 font-medium mt-1 truncate">Tổng giường</div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100">
                        <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#375ba9] shrink-0">
                            <span class="material-symbols-outlined text-[20px]">groups</span>
                        </div>
                        <div>
                            <div class="flex items-baseline gap-1">
                                <span class="text-xl font-bold text-[#375ba9] leading-none">342</span>
                                <span class="text-[11px] font-bold text-blue-600">89%</span>
                            </div>
                            <div class="text-[11px] text-slate-500 font-medium mt-1 truncate">Đang ở</div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100">
                        <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                            <span class="material-symbols-outlined text-[20px]">airline_seat_individual_suite</span>
                        </div>
                        <div>
                            <div class="text-xl font-bold text-emerald-600 leading-none">38</div>
                            <div class="text-[11px] text-slate-500 font-medium mt-1 truncate">Còn trống</div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 col-span-2 sm:col-span-1">
                        <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                            <span class="material-symbols-outlined text-[20px]">build</span>
                        </div>
                        <div>
                            <div class="text-xl font-bold text-amber-600 leading-none">4</div>
                            <div class="text-[11px] text-slate-500 font-medium mt-1 truncate">Bảo trì</div>
                        </div>
                    </div>
                </div>

                <!-- Toggle Roster vs Grid View -->
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                    <div class="flex items-center p-1 rounded-xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs">
                        <button type="button" onclick="KtxApp.setRoomsViewMode('roster')" class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            !isGrid ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }">
                            <span class="material-symbols-outlined text-[17px]">badge</span>
                            <span>Danh sách sinh viên theo phòng</span>
                        </button>
                        <button type="button" onclick="KtxApp.setRoomsViewMode('grid')" class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isGrid ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }">
                            <span class="material-symbols-outlined text-[17px]">grid_view</span>
                            <span>Sơ đồ buồng phòng (Grid)</span>
                        </button>
                    </div>

                    <div class="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                        <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#375ba9]"></span> Đang ở (342)</span>
                        <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Giường trống (38)</span>
                        <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Bảo trì (4)</span>
                    </div>
                </div>

                <!-- View Contents -->
                ${isGrid ? renderRoomsGridView(rooms) : renderRoomsRosterView()}
            </div>
        `;
    }

    function renderRoomsGridView(rooms) {
        const buildings = ['A01', 'A02', 'B01', 'B02', 'C01'];
        return `
            <div class="space-y-6">
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
        const students = state.students || [];
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
                                            <img src="${s.avatarUrl}" alt="${s.name}" class="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200" />
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
                                        <span class="px-2 py-0.5 rounded-full text-[11px] font-medium ${s.paymentStatus === 'Đủ' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">${s.paymentStatus === 'Đủ' ? 'Đã đóng' : 'Nợ phí'}</span>
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
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Modal Actions
    function openNewContractModal() {
        const container = document.getElementById('modalsContainer');
        if (!container) return;
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
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Họ và tên sinh viên</label>
                                <input type="text" id="ncStudentName" required value="Trần Văn Bình" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B2A5B]" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">MSSV</label>
                                <input type="text" id="ncMssv" required value="2451080099" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B2A5B]" />
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phòng</label>
                                <select id="ncRoomNumber" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                    <option value="A101">A101 (Tòa A)</option>
                                    <option value="A102" selected>A102 (Tòa A)</option>
                                    <option value="A205">A205 (Tòa A)</option>
                                    <option value="B208">B208 (Tòa B)</option>
                                    <option value="C102">C102 (Tòa C)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Vị trí giường</label>
                                <select id="ncBedNumber" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                    <option value="G01">G01 (Tầng dưới)</option>
                                    <option value="G02">G02 (Tầng trên)</option>
                                    <option value="G03">G03 (Tầng dưới)</option>
                                    <option value="G04">G04 (Tầng trên)</option>
                                    <option value="G05" selected>G05 (Tầng dưới)</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tiền phòng / tháng (VND)</label>
                                <input type="number" id="ncMonthlyFee" value="500000" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tiền cọc giữ chỗ (VND)</label>
                                <input type="number" id="ncDepositAmount" value="500000" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none" />
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
        const studentName = document.getElementById('ncStudentName').value;
        const mssv = document.getElementById('ncMssv').value;
        const roomNumber = document.getElementById('ncRoomNumber').value;
        const bedNumber = document.getElementById('ncBedNumber').value;
        const monthlyFee = parseFloat(document.getElementById('ncMonthlyFee').value) || 500000;
        const depositAmount = parseFloat(document.getElementById('ncDepositAmount').value) || 500000;

        try {
            const res = await fetch('/api/hopdong', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName,
                    mssv,
                    roomNumber,
                    bedNumber,
                    monthlyFee,
                    depositAmount,
                    startDate: '01/10/2026',
                    endDate: '30/06/2027'
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
                                <img src="${s.avatarUrl}" alt="${s.name}" class="w-14 h-14 rounded-full object-cover ring-2 ring-[#0B2A5B]/30" />
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
                                    <span class="font-semibold ${s.paymentStatus === 'Đủ' ? 'text-emerald-600' : 'text-red-600'}">
                                        ${s.paymentStatus === 'Đủ' ? 'Đã hoàn tất phí KTX' : 'Còn nợ phí'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal(); KtxApp.openTransferModal('${s.mssv}')" class="px-3.5 py-2 rounded-xl bg-blue-50 text-[#0B2A5B] font-semibold text-xs hover:bg-blue-100 flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[16px]">swap_horiz</span>
                                <span>Điều chuyển buồng phòng</span>
                            </button>
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
                        <button type="button" onclick="KtxApp.showToast('Đã trích xuất sơ đồ buồng phòng ra file PDF', 'success'); KtxApp.closeModal();" class="px-4 py-2 rounded-xl bg-[#0B2A5B] text-white text-xs font-semibold flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[16px]">print</span>
                            <span>In sơ đồ phòng</span>
                        </button>
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

    function openTransferModal(studentId) {
        showToast(`Mở giao diện điều chuyển buồng phòng cho sinh viên ${studentId}`, 'info');
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
        try {
            await fetch(`/api/dashboard/tasks/${taskId}/resolve`, { method: 'POST' });
            if (taskType === 'application') {
                showToast('Đã duyệt đơn đăng ký khẩn! Đang tạo hồ sơ nội trú.', 'success');
            } else if (taskType === 'repair') {
                showToast('Đã điều phối đội ngũ thợ điện nước khắc phục sự cố!', 'info');
            } else if (taskType === 'debt') {
                showToast('Đã gửi thông báo nhắc nợ tự động đến ban cán sự phòng!', 'info');
            } else if (taskType === 'checkout') {
                navigate('phong-va-giuong');
                showToast('Chuyển đến sơ đồ buồng phòng kiểm tra thủ tục trả phòng!', 'info');
                return;
            } else {
                showToast('Đã ghi nhận xử lý biên bản vi phạm kỷ luật KTX!', 'success');
            }
            await loadDashboard();
            if (state.currentTab === 'dashboard') renderActiveView();
        } catch (e) {
            console.error(e);
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

    function toggleSemesterMenu() {
        showToast(`Học kỳ hiện tại: ${state.selectedSemester}`, 'info');
    }

    function showNotificationToast() {
        showToast('Có 86 hồ sơ K65 đang chờ duyệt và 1 yêu cầu sửa vòi nước khẩn cấp tại phòng A302', 'info');
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
                            <button onclick="KtxApp.navigate('dashboard'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B]">dashboard</span>
                                <span>Về Dashboard Tổng quan</span>
                            </button>
                            <button onclick="KtxApp.navigate('don-dang-ky'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B]">how_to_reg</span>
                                <span>Xét duyệt đơn K65</span>
                            </button>
                            <button onclick="KtxApp.navigate('hop-dong'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B]">edit_document</span>
                                <span>Quản lý Hợp đồng cư xá</span>
                            </button>
                            <button onclick="KtxApp.navigate('phong-va-giuong'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B]">domain</span>
                                <span>Xem sơ đồ buồng phòng</span>
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

    function exportReport(title = 'Báo cáo') {
        showToast(`Đã trích xuất ${title} KTX ra file Excel (.xlsx) thành công!`, 'success');
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
            renderApp();
        },
        navigate,
        toggleDarkMode,
        toggleMobileMenu,
        toggleProfileMenu,
        toggleSemesterMenu,
        showNotificationToast,
        openSearch,
        closeSearch,
        handlePaletteInput,
        showToast,
        fillDemo,
        handleLoginForm,
        switchUser,
        logout,
        openRegistrationModal,
        closeRegistrationModal,
        actionTask,
        setAdmissionsTab,
        setAdmissionsPriority,
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
        openTransferModal,
        setRoomsViewMode,
        inspectRoom,
        toggleBedMaintenance,
        closeModal,
        exportReport
    };
})();

// Auto boot on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    KtxApp.init();
});

