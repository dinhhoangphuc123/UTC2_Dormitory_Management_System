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
        let fetchPromise;
        if (path === '/api/namhoc' || path.startsWith('/api/auth/')) {
            fetchPromise = nativeFetch(input, init);
        } else {
            const academicYear = localStorage.getItem('ktx_user_selected_academic_year');
            if (academicYear && !url.searchParams.has('academicYear') && !path.startsWith('/api/me')) {
                url.searchParams.set('academicYear', academicYear);
            }
            fetchPromise = input instanceof Request
                ? nativeFetch(new Request(url.toString(), input), init)
                : nativeFetch(url.toString(), init);
        }

        return fetchPromise.then(res => {
            if (res.status === 401 && !path.startsWith('/api/auth/login')) {
                if (state.currentUser) {
                    logout();
                }
            }
            return res;
        });
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
        admissionsTab: 'all',
        admissionsPriority: '',
        admissionsPaymentFilter: '',
        admissionsRoomType: '',
        admissionsSearch: '',

        contractsTab: 'all',
        contractsBuilding: 'all',
        contractsRoom: 'all',
        contractsSearch: '',

        studentsCohort: '',
        studentsMajor: '',
        studentsSearch: '',

        roomsViewMode: 'roster',
        roomsBuilding: 'all',
        roomsGender: 'all',
        roomsRoomNumber: 'all',
        roomsRoomDropdownOpen: false,
        roomsBedStatus: 'all',
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
    let studentUnreadTimer = null;

    function updateStudentBadge() {
        if (!state.currentUser || state.currentUser.roleCode !== 'sinhVien') return;
        nativeFetch('/api/me/notifications/unread-count')
            .then(r => r.json())
            .then(res => {
                const badge = document.getElementById('notifBadge');
                if (badge) {
                    const count = res?.data?.count || 0;
                    if (count > 0) {
                        badge.classList.remove('hidden');
                        badge.textContent = count > 99 ? '99+' : String(count);
                        badge.className = 'absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-red-500 text-[10px] font-bold text-white leading-tight min-w-[16px] text-center shadow-xs';
                    } else {
                        badge.classList.add('hidden');
                    }
                }
            })
            .catch(() => {});
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]);
    }

    function formatShortVND(amount) {
        if (!amount || amount <= 0) return '0đ';
        if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + 'B';
        if (amount >= 1000000) return (amount / 1000000).toFixed(0) + 'tr';
        if (amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
        return amount + 'đ';
    }

    function getUserInitial(name) {
        return String(name || '?').trim().charAt(0).toLocaleUpperCase('vi-VN');
    }

    // =========================================================================
    // FUZZY SEARCH ENGINE (Tìm kiếm gần giống, không dấu, chấp nhận gõ sai)
    // =========================================================================
    function normalizeVietnamese(str) {
        return String(str ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase()
            .trim();
    }

    function compactAlphanumeric(str) {
        return normalizeVietnamese(str).replace(/[^a-z0-9]/g, '');
    }

    function levenshteinDistance(a, b, maxDist = 2) {
        if (a === b) return 0;
        const la = a.length;
        const lb = b.length;
        if (Math.abs(la - lb) > maxDist) return maxDist + 1;
        if (la === 0) return lb;
        if (lb === 0) return la;

        let prev = new Array(lb + 1);
        let curr = new Array(lb + 1);
        for (let j = 0; j <= lb; j++) prev[j] = j;

        for (let i = 1; i <= la; i++) {
            curr[0] = i;
            let minInRow = curr[0];
            const ca = a.charCodeAt(i - 1);
            for (let j = 1; j <= lb; j++) {
                const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
                let val = Math.min(
                    prev[j] + 1,
                    curr[j - 1] + 1,
                    prev[j - 1] + cost
                );
                if (i > 1 && j > 1 && ca === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
                    val = Math.min(val, val - cost + (prev[j - 2] || 0));
                }
                curr[j] = val;
                if (val < minInRow) minInRow = val;
            }
            if (minInRow > maxDist) return maxDist + 1;
            const tmp = prev;
            prev = curr;
            curr = tmp;
        }
        return prev[lb];
    }

    function isSubsequence(sub, str) {
        if (!sub || sub.length < 3 || sub.length > str.length) return false;
        let i = 0;
        for (let j = 0; j < str.length && i < sub.length; j++) {
            if (sub.charCodeAt(i) === str.charCodeAt(j)) i++;
        }
        return i === sub.length;
    }

    function fuzzyMatch(query, ...fields) {
        const qRaw = String(query ?? '').trim();
        if (!qRaw) return true;

        const qNorm = normalizeVietnamese(qRaw);
        const qCompact = compactAlphanumeric(qRaw);
        if (!qNorm) return true;

        const validFields = fields.filter(f => f !== null && f !== undefined && String(f).trim() !== '');
        if (validFields.length === 0) return false;

        const combinedNorm = validFields.map(f => normalizeVietnamese(f)).join(' ');
        const combinedCompact = validFields.map(f => compactAlphanumeric(f)).join(' ');

        // 1. Khớp chính xác chuỗi con không dấu hoặc chuỗi mã gộp (bỏ dấu gạch ngang, khoảng trắng)
        if (combinedNorm.includes(qNorm)) return true;
        if (qCompact.length >= 2 && combinedCompact.includes(qCompact)) return true;

        // 2. Tách từng từ trong câu truy vấn để so khớp linh hoạt (cho phép đảo thứ tự từ & gõ sai chính tả)
        const qTokens = qNorm.split(/\s+/).filter(Boolean);
        const targetWords = combinedNorm.split(/[\s,.;:/\\|()[\]{}_\-+#]+/).filter(Boolean);
        const targetCompacts = combinedCompact.split(/\s+/).filter(Boolean);

        return qTokens.every(token => {
            if (combinedNorm.includes(token)) return true;
            const tokenCompact = token.replace(/[^a-z0-9]/g, '');
            if (tokenCompact && combinedCompact.includes(tokenCompact)) return true;

            // Cho phép sai số ký tự tùy theo độ dài từ (tìm kiếm gần giống)
            const allowedDist = token.length >= 6 ? 2 : (token.length >= 3 ? 1 : 0);
            if (allowedDist > 0) {
                for (const word of targetWords) {
                    if (levenshteinDistance(token, word, allowedDist) <= allowedDist) {
                        return true;
                    }
                    // Khớp tiền tố gần giống (ví dụ gõ "nguye" hoặc "nguen" cho "nguyen")
                    if (word.length > token.length && token.length >= 3) {
                        const prefix = word.slice(0, token.length);
                        if (levenshteinDistance(token, prefix, 1) <= 1) return true;
                    }
                    // Khớp chuỗi con bị thiếu 1 ký tự (ví dụ "nguen" trong "nguyen")
                    if (token.length >= 4 && Math.abs(word.length - token.length) <= 2 && isSubsequence(token, word)) {
                        return true;
                    }
                }
                if (tokenCompact.length >= 4) {
                    for (const comp of targetCompacts) {
                        if (isSubsequence(tokenCompact, comp)) return true;
                    }
                }
            }
            return false;
        });
    }

    function stampRawHtml(rootEl, depth = 0) {
        if (!rootEl || !rootEl.children || depth > 3) return;
        Array.from(rootEl.children).forEach(child => {
            child.__ktxRawHtml = child.outerHTML;
            stampRawHtml(child, depth + 1);
        });
    }

    function patchViewSections(oldRoot, newRoot, depth = 0) {
        if (oldRoot.className !== newRoot.className) {
            oldRoot.className = newRoot.className;
        }

        const oldChildren = Array.from(oldRoot.children);
        const newChildren = Array.from(newRoot.children);

        if (oldChildren.length !== newChildren.length || oldChildren.length === 0) {
            oldRoot.innerHTML = newRoot.innerHTML;
            stampRawHtml(oldRoot, depth);
            return;
        }

        for (let i = 0; i < newChildren.length; i++) {
            const oldChild = oldChildren[i];
            const newChild = newChildren[i];
            const newRaw = newChild.outerHTML;

            // Giữ nguyên 100% nếu khối này không thay đổi (Banner, KPI, Filter bar, Card...)
            if ((oldChild.__ktxRawHtml && oldChild.__ktxRawHtml === newRaw) || oldChild.outerHTML === newRaw) {
                continue;
            }

            // Nếu người dùng đang gõ trong ô input/textarea thuộc khối này thì giữ nguyên focus
            const activeEl = document.activeElement;
            if (activeEl && oldChild.contains(activeEl) && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                oldChild.__ktxRawHtml = newRaw;
                continue;
            }

            // Nếu khối chứa cùng cấu trúc con và không chứa <select> đã được custom-wrap thì đệ quy để chỉ thay đúng phần tử con thay đổi
            if (
                depth < 3 &&
                oldChild.tagName === newChild.tagName &&
                oldChild.className === newChild.className &&
                oldChild.children.length > 0 &&
                oldChild.children.length === newChild.children.length &&
                !oldChild.querySelector('[data-ktx-select-wrapper]')
            ) {
                oldChild.__ktxRawHtml = newRaw;
                patchViewSections(oldChild, newChild, depth + 1);
                continue;
            }

            const cloned = newChild.cloneNode(true);
            cloned.__ktxRawHtml = newRaw;
            stampRawHtml(cloned, depth + 1);
            oldRoot.replaceChild(cloned, oldChild);
        }
    }

    function preserveSearchFocusAndUpdate(container, newHtml) {
        if (!container) return;
        const activeEl = document.activeElement;
        const isSearchInput = activeEl && container.contains(activeEl) && activeEl.tagName === 'INPUT' && activeEl.type === 'text';
        const inputId = isSearchInput ? activeEl.id : null;
        const inputPlaceholder = isSearchInput ? activeEl.getAttribute('placeholder') : null;
        const currentVal = isSearchInput ? activeEl.value : null;
        let selStart = null;
        let selEnd = null;
        if (isSearchInput) {
            try {
                selStart = activeEl.selectionStart;
                selEnd = activeEl.selectionEnd;
            } catch (_) {}
        }

        const cleanedHtml = String(newHtml || '').replace(/\bpage-content-enter\b/g, '');
        const temp = document.createElement('div');
        temp.innerHTML = cleanedHtml;

        if (
            container.children.length === 1 &&
            temp.children.length === 1 &&
            container.firstElementChild.tagName === temp.firstElementChild.tagName
        ) {
            patchViewSections(container.firstElementChild, temp.firstElementChild);
        } else {
            container.innerHTML = cleanedHtml;
            if (container.firstElementChild) {
                stampRawHtml(container.firstElementChild);
            }
        }

        if (isSearchInput) {
            let nextInput = inputId ? document.getElementById(inputId) : null;
            if (!nextInput && inputPlaceholder) {
                nextInput = Array.from(container.querySelectorAll('input[type="text"]')).find(
                    el => el.getAttribute('placeholder') === inputPlaceholder
                );
            }
            if (nextInput) {
                if (currentVal !== null && nextInput.value !== currentVal) {
                    nextInput.value = currentVal;
                }
                nextInput.focus({ preventScroll: true });
                try {
                    const pos = selEnd !== null ? selEnd : nextInput.value.length;
                    nextInput.setSelectionRange(selStart !== null ? selStart : pos, pos);
                } catch (_) {}
            }
        }
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
                <span>${escapeHtml(t.message)}</span>
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
        document.documentElement.style.colorScheme = state.darkMode ? 'dark' : 'light'; localStorage.setItem('ktx_dark_mode', state.darkMode ? 'true' : 'false'); document.querySelectorAll('[data-ktx-theme-toggle]').forEach(btn => { const label = state.darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'; btn.setAttribute('title', label); btn.setAttribute('aria-label', label); btn.setAttribute('aria-pressed', state.darkMode ? 'true' : 'false'); btn.innerHTML = `<span class="material-symbols-outlined text-[19px]">${state.darkMode ? 'light_mode' : 'dark_mode'}</span>`; });
        renderSidebar();
    }

    function initTheme() {
        const saved = localStorage.getItem('utc2_dorm_theme');
        if (saved === null && localStorage.getItem('ktx_dark_mode') === null) {
            state.darkMode = Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        } else {
            state.darkMode = saved === 'dark' || localStorage.getItem('ktx_dark_mode') === 'true';
        }
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

        try {
            const res = await nativeFetch('/api/auth/me');
            if (res.status === 401) {
                state.currentUser = null;
                localStorage.removeItem('utc2_current_user');
                return;
            }
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    state.currentUser = json.data;
                    localStorage.setItem('utc2_current_user', JSON.stringify(json.data));
                }
            }
        } catch (e) {
            console.warn('Cannot verify session with server:', e);
        }

        if (state.currentUser && state.currentUser.roleCode === 'sinhVien') {
            if (!state.currentTab || !state.currentTab.startsWith('sv-') || state.currentTab === 'dashboard') {
                state.currentTab = 'sv-tong-quan';
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
                if (state.currentUser.roleCode !== 'sinhVien') {
                    await loadAcademicYearOptions();
                }
                showToast('Đăng nhập thành công! Đang chuyển hướng...', 'success');
                setTimeout(() => {
                    if (window.location.pathname.toLowerCase().includes('/account/login')) {
                        window.location.href = '/';
                    } else {
                        if (state.currentUser && state.currentUser.roleCode === 'sinhVien') {
                            navigate('sv-tong-quan');
                        } else {
                            navigate('dashboard');
                        }
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

    async function logout() {
        if (studentUnreadTimer) {
            clearInterval(studentUnreadTimer);
            studentUnreadTimer = null;
        }
        try {
            await nativeFetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error('Logout error:', e);
        }
        state.currentUser = null;
        state.students = [];
        state.contracts = [];
        state.applications = [];
        state.rooms = [];
        state.dashboardSummary = null;
        state.selectedAcademicYear = '';
        localStorage.removeItem('utc2_current_user');
        localStorage.removeItem('ktx_user_selected_academic_year');
        Object.keys(localStorage).forEach((k) => {
            if (k.startsWith('ktx_')) localStorage.removeItem(k);
        });
        showToast('Đã đăng xuất khỏi hệ thống', 'info');
        if (!window.location.pathname.toLowerCase().includes('/account/login')) {
            window.location.href = '/Account/Login';
        } else {
            renderApp(false);
        }
    }

    // Navigation (Chỉ cập nhật vùng nội dung chính & trạng thái active trên sidebar, không tải lại toàn trang)
    function navigate(tab) {
        const prevTab = state.currentTab;
        state.currentTab = tab;
        state.isMobileMenuOpen = false;
        if (document.getElementById('mainContent') && document.getElementById('sidebarContainer')) {
            renderSidebar();
            renderActiveView(false, prevTab === tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            renderApp(false);
        }
    }

    async function fetchApiData(url) {
        const response = await fetch(url);
        const text = await response.text();

        let json = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch (parseError) {
            // Server trả HTML/text thay vì JSON (thường là trang lỗi dev hoặc bị chuyển hướng đăng nhập).
            // Báo rõ cho người dùng thay vì lỗi khó hiểu của JSON.parse.
            if (response.status === 401) {
                logout();
                throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            }
            throw new Error(`Máy chủ trả nội dung không phải JSON (HTTP ${response.status}). Vui lòng kiểm tra SQL Server/lại sau.`);
        }

        if (!json || !response.ok || !json.success) {
            if (response.status === 401) {
                logout();
            }
            throw new Error((json && json.message) || (json && json.detail) || `Yêu cầu thất bại (${response.status})`);
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
            const students = await fetchApiData(`/api/sinhvien?academicYear=${encodeURIComponent(academicYear)}&pageSize=500`);
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
            const query = `?academicYear=${encodeURIComponent(academicYear)}`;
            const applications = await fetchApiData(`/api/dondangky${query}`);
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
            const rooms = await fetchApiData(`/api/phong?academicYear=${encodeURIComponent(academicYear)}`);
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

        const existingMain = document.getElementById('mainContent');
        const existingSidebar = document.getElementById('sidebarContainer');
        const existingTopNav = document.getElementById('topNavContainer');

        if (!existingMain || !existingSidebar || !existingTopNav) {
            root.innerHTML = `
                <div class="min-h-screen bg-[#F4F5F7] dark:bg-[#0B0F1A] text-[#0B0F1A] dark:text-[#E8EAF0] transition-colors duration-200">
                    <!-- Sidebar -->
                    <div id="sidebarContainer"></div>

                    <!-- Main Layout -->
                    <div class="lg:pl-64 flex flex-col min-h-screen">
                        <!-- TopNav -->
                        <div id="topNavContainer"></div>

                        <!-- Dynamic Main Content -->
                        <main id="mainContent" class="flex-1 pt-20 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
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
            renderTopNav();
        }

        renderSidebar();
        renderActiveView(false);
        renderToasts();
    }

    // Quyền hiển thị menu theo vai trò. Máy chủ vẫn kiểm tra quyền ở từng API,
    // đây chỉ là lớp bảo vệ giao diện để người dùng không thấy mục mình không dùng được.
    const MENU_ROLES = {
        'dashboard': ['admin', 'quanLy', 'keToan'],
        'don-dang-ky': ['quanLy'],
        'hop-dong': ['quanLy'],
        'sinh-vien': ['quanLy'],
        'lop-khoa': ['admin', 'quanLy'],
        'phong-va-giuong': ['admin', 'quanLy'],
        'dien-nuoc-dich-vu': ['quanLy', 'keToan'],
        'hoa-don': ['quanLy', 'keToan'],
        'sua-chua': ['quanLy'],
        'vi-pham': ['quanLy'],
        'nhan-vien-tai-khoan': ['admin'],
        'bao-cao': ['admin', 'quanLy', 'keToan']
    };

    function canAccessMenu(tab) {
        if (!tab) return false;
        const role = state.currentUser && state.currentUser.roleCode;
        if (tab.startsWith('sv-')) return role === 'sinhVien';
        const allowed = MENU_ROLES[tab];
        return Array.isArray(allowed) && allowed.includes(role);
    }

    function renderSidebar() {
        const container = document.getElementById('sidebarContainer');
        if (!container || !state.currentUser) return;

        const isStudent = state.currentUser.roleCode === 'sinhVien';
        const navGroups = (isStudent ? [
            {
                title: 'TỔNG QUAN',
                items: [{ id: 'sv-tong-quan', label: 'Tổng quan', icon: 'grid_view' }]
            },
            {
                title: 'ĐĂNG KÝ NỘI TRÚ',
                items: [
                    { id: 'sv-dot-dang-ky', label: 'Đợt đăng ký', icon: 'event_available' },
                    { id: 'sv-don-cua-toi', label: 'Đơn của tôi', icon: 'assignment' },
                    { id: 'sv-thanh-toan', label: 'Thanh toán đăng ký', icon: 'qr_code_2' }
                ]
            },
            {
                title: 'CHỖ Ở CỦA TÔI',
                items: [
                    { id: 'sv-hop-dong', label: 'Hợp đồng & chỗ ở', icon: 'home' },
                    { id: 'sv-hoa-don', label: 'Hóa đơn & thanh toán', icon: 'receipt_long' },
                    { id: 'sv-sua-chua', label: 'Yêu cầu sửa chữa', icon: 'build' },
                    { id: 'sv-vi-pham', label: 'Vi phạm & kỷ luật', icon: 'gavel' }
                ]
            },
            {
                title: 'TÀI KHOẢN & HỖ TRỢ',
                items: [
                    { id: 'sv-ho-so', label: 'Hồ sơ của tôi', icon: 'badge' },
                    { id: 'sv-thong-bao', label: 'Thông báo', icon: 'notifications' },
                    { id: 'sv-ho-tro', label: 'Nội quy & hỗ trợ', icon: 'support_agent' }
                ]
            }
        ] : [
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
        ])
            .map(group => ({ ...group, items: group.items.filter(item => canAccessMenu(item.id)) }))
            .filter(group => group.items.length > 0);

        const prevScrollEl = container.querySelector('.overflow-y-auto');
        const prevScrollTop = prevScrollEl ? prevScrollEl.scrollTop : 0;
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
                            <div class="flex items-center min-w-0">
                                <span class="font-bold text-[19px] text-white tracking-tight truncate leading-none">Quản lý ký túc xá</span>
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
                                <div class="px-2.5 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
                                            <span class="material-symbols-outlined text-[20px] ${isActive ? 'text-white' : 'text-slate-400'}">${item.icon}</span>
                                            <span class="text-sm truncate">${item.label}</span>
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </aside>
        `;
        const nextScrollEl = container.querySelector('.overflow-y-auto');
        if (nextScrollEl && prevScrollTop > 0) nextScrollEl.scrollTop = prevScrollTop;
    }

    function renderTopNav() {
        const container = document.getElementById('topNavContainer');
        if (!container || !state.currentUser) return;

        const isStudent = state.currentUser.roleCode === 'sinhVien';

        container.innerHTML = `
            <header class="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/90 dark:bg-[#121826]/90 backdrop-blur-xl border-b border-[#E4E7EC] dark:border-[#232B3B] z-40 flex items-center gap-3 px-4 lg:px-8 shadow-xs transition-colors">
                <!-- Left: Mobile hamburger & Search bar -->
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <button type="button" aria-label="Mở menu điều hướng" onclick="KtxApp.toggleMobileMenu()" class="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span class="material-symbols-outlined text-[22px]">menu</span>
                    </button>

                    <!-- Global Search Bar -->
                    <div role="button" tabindex="0" aria-label="Tìm kiếm nhanh" onclick="KtxApp.openSearch()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();KtxApp.openSearch();}" class="flex items-center gap-2.5 flex-1 min-w-0 h-10 px-3.5 rounded-xl bg-slate-100/80 dark:bg-[#0B0F1A] border border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 cursor-pointer hover:border-[#0B2A5B] dark:hover:border-blue-500/50 transition-all shadow-2xs group">
                        <span class="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-[#0B2A5B] dark:group-hover:text-blue-400 transition-colors">search</span>
                        <span class="text-sm text-slate-400 dark:text-slate-400 truncate flex-1 select-none">${isStudent ? 'Tìm kiếm nhanh (hóa đơn, hợp đồng, đợt đăng ký, thông báo...)' : 'Tìm kiếm (phòng, SV, hợp đồng...)'}</span>
                    </div>
                </div>

                <!-- Right: Academic year, Dark mode, Notifications, Profile -->
                <div class="flex items-center gap-2 sm:gap-3 ml-3 shrink-0">
                    ${!isStudent ? `
                        <!-- Academic Year Selector -->
                        <div class="relative hidden md:flex items-center gap-2 shrink-0">
                            <select id="academicYearSelect" onchange="KtxApp.changeAcademicYear(this.value)" class="h-10 px-3 rounded-xl bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-700 dark:text-slate-200 text-sm font-semibold max-w-[220px]">
                                <option value="">Chọn năm học</option>
                            </select>
                            ${state.currentUser.roleCode === 'admin' ? `<button type="button" onclick="KtxApp.toggleAcademicYearMenu()" class="h-10 px-3 rounded-xl bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-700 dark:text-slate-200 text-sm font-semibold">Quản lý năm học</button>` : ''}
                        </div>
                    ` : ''}

                    <!-- Dark Mode Button -->
                    <button type="button" data-ktx-theme-toggle="true" aria-pressed="${state.darkMode ? 'true' : 'false'}" aria-label="${state.darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}" onclick="KtxApp.toggleDarkMode()" class="w-10 h-10 rounded-xl bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-600 dark:text-amber-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center shadow-2xs" title="${state.darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}">
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

        if (!isStudent && state.academicYears.length === 0) {
            loadAcademicYearOptions();
        }

        if (isStudent) {
            updateStudentBadge();
            if (!studentUnreadTimer) {
                studentUnreadTimer = setInterval(updateStudentBadge, 60000);
            }
        }
    }

    function renderAcademicYearOptions() {
        const select = document.getElementById('academicYearSelect');
        if (!select) return;

        const hasSelected = state.academicYears.some(year => getAcademicYearCode(year) === state.selectedAcademicYear);
        const currentValue = hasSelected ? state.selectedAcademicYear : '';

        select.innerHTML = '<option value="">Chọn năm học</option>' + state.academicYears.map(year => {
            const code = getAcademicYearCode(year);
            const label = `${getAcademicYearLabel(year)} (${code})`;
            const selectedAttr = code === currentValue ? ' selected' : '';
            return `<option value="${escapeHtml(code)}"${selectedAttr}>${escapeHtml(label)}</option>`;
        }).join('');
        select.value = currentValue;
    }

    // Login View (Exact 2-column split layout from demo)
    const DEV_QUICK_ACCOUNTS = [
        { group: 'Quản trị viên', name: 'Nguyễn Hoàng Admin', username: 'admin', pass: 'admin123' },
        { group: 'Quản lý KTX', name: 'Nguyễn Văn An', username: 'ql_an', pass: 'quanly123' },
        { group: 'Kế toán', name: 'Lê Thị Bình', username: 'kt_binh', pass: 'ketoan123' },
        { group: 'Sinh viên', name: 'Trần Minh Hoàng (Đang ở · HĐ chờ xác nhận MC)', username: 'sv_minh', pass: 'sinhvien123' },
        { group: 'Sinh viên', name: 'Lê Quốc Bảo (Đang ở · HĐ quá hạn & Vi phạm)', username: 'sv_bao', pass: 'sinhvien123' },
        { group: 'Sinh viên', name: 'Nguyễn Thị Mai (Đang ở · HĐ chưa nộp)', username: 'sv_mai', pass: 'sinhvien123' },
        { group: 'Sinh viên', name: 'Phạm Gia Huy (Đã duyệt · Chờ nộp giữ chỗ 24h)', username: 'sv_huy', pass: 'sinhvien123' },
        { group: 'Sinh viên', name: 'Võ Ngọc Hân (Giữ chỗ · Đã nộp MC chờ duyệt)', username: 'sv_han', pass: 'sinhvien123' },
        { group: 'Sinh viên', name: 'Đặng Tuấn Kiệt (Giữ chỗ · Bị từ chối MC)', username: 'sv_kiet', pass: 'sinhvien123' },
        { group: 'Sinh viên', name: 'Huỳnh Thảo Vy (Đơn chờ BQL duyệt)', username: 'sv_vy', pass: 'sinhvien123' },
        { group: 'Sinh viên', name: 'Bùi Anh Dũng (Đơn chờ BQL duyệt)', username: 'sv_dung', pass: 'sinhvien123' },
        { group: 'Sinh viên', name: 'Trương Mỹ Linh (Đơn bị từ chối)', username: 'sv_linh', pass: 'sinhvien123' },
        { group: 'Sinh viên', name: 'Ngô Quang Vinh (Chưa đăng ký · Test đăng ký mới)', username: 'sv_vinh', pass: 'sinhvien123' }
    ];

    function isDevHost() {
        const h = window.location.hostname;
        return h === 'localhost' || h === '127.0.0.1';
    }

    function renderDevQuickLoginItems(filterText = '') {
        const q = String(filterText || '').trim().toLowerCase();
        const filtered = DEV_QUICK_ACCOUNTS.filter(a =>
            !q || a.name.toLowerCase().includes(q) || a.username.toLowerCase().includes(q) || a.group.toLowerCase().includes(q)
        );
        if (!filtered.length) {
            return '<div class="py-6 text-center text-xs text-slate-400">Không tìm thấy tài khoản phù hợp.</div>';
        }
        const groups = [];
        filtered.forEach(a => {
            let g = groups.find(x => x.title === a.group);
            if (!g) { g = { title: a.group, items: [] }; groups.push(g); }
            g.items.push(a);
        });
        return groups.map(g => `
            <div class="py-1.5">
                <div class="px-3 py-1 flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    <span>${escapeHtml(g.title)}</span>
                    <span class="text-slate-400 font-semibold">${g.items.length}</span>
                </div>
                ${g.items.map(a => `
                    <button type="button"
                        onclick="KtxApp.quickDevLogin('${escapeHtml(a.username)}', '${escapeHtml(a.pass)}')"
                        class="w-full px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 flex items-center justify-between gap-2 text-left transition-colors">
                        <span class="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">${escapeHtml(a.name)}</span>
                        <span class="text-[11px] font-mono text-slate-400 shrink-0">${escapeHtml(a.username)}</span>
                    </button>
                `).join('')}
            </div>
        `).join('');
    }

    function filterDevQuickLogin(val) {
        const list = document.getElementById('devQuickLoginList');
        if (list) list.innerHTML = renderDevQuickLoginItems(val);
    }

    async function quickDevLogin(username, password) {
        if (isLoggingIn) return;
        isLoggingIn = true;
        try {
            await login(username, password);
        } finally {
            isLoggingIn = false;
        }
    }

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

                        <button type="button" data-ktx-theme-toggle="true" aria-pressed="${state.darkMode ? 'true' : 'false'}" aria-label="${state.darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}" title="${state.darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}" onclick="KtxApp.toggleDarkMode()" class="relative z-10 w-10 h-10 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/20 transition flex items-center justify-center">
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
                <div class="lg:w-[45%] flex flex-col justify-center px-6 sm:px-12 xl:px-16 py-12 bg-white dark:bg-[#121826] transition-colors duration-200">
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
                        <div class="w-full max-w-md mx-auto text-[#0B0F1A] dark:text-[#E8EAF0]">
                            <button type="button" onclick="KtxApp.setAuthMode('forgot')" class="inline-flex items-center gap-1.5 mb-7 text-sm font-medium text-[#526783] hover:text-[#0B2A5B] transition">
                                <span class="material-symbols-outlined text-[18px]">arrow_back</span>
                                <span>Quay lại</span>
                            </button>
                            <div class="mb-7">
                                <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B0F1A] dark:text-white">Nhập mã OTP</h2>
                                <p class="mt-2 text-sm leading-6 text-[#667085]">Mã xác nhận 6 số gửi đến: <span class="font-semibold text-[#0B2A5B]">${escapeHtml(state.resetUsername)}</span></p>
                            </div>
                            <form id="verifyForm" class="space-y-6" onsubmit="event.preventDefault(); KtxApp.submitVerifyForm();">
                                <div>
                                    <label class="block text-xs font-semibold uppercase tracking-[0.12em] text-[#526783] mb-2.5">Mã xác thực</label>
                                    <div class="flex items-center justify-between gap-2" onpaste="KtxApp.handleOtpPaste(event)">
                                        ${Array.from({ length: 6 }, (_, index) => `
                                            <input type="text" inputmode="numeric" maxlength="${index === 0 ? 6 : 1}" pattern="${index === 0 ? '[0-9]{1,6}' : '[0-9]'}" required ${index === 0 ? 'autocomplete="one-time-code"' : 'autocomplete="off"'} aria-label="Chữ số ${index + 1} của mã OTP" data-otp-digit="${index}" oninput="KtxApp.handleOtpInput(${index}, this)" onkeydown="KtxApp.handleOtpKeydown(${index}, event)" placeholder="•" class="flex-1 min-w-0 h-14 rounded-xl border border-[#E3E9F1] dark:border-[#232B3B] bg-white dark:bg-[#0B0F1A] text-center text-lg font-semibold text-[#0B0F1A] dark:text-white placeholder:text-[#CBD5E1] dark:placeholder:text-slate-600 focus:border-[#0B2A5B] dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-[#0B2A5B] transition" />
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
                        ${isDevHost() ? `
                        <aside aria-label="Đăng nhập nhanh để test" class="mt-6 w-full bg-white dark:bg-[#121826] rounded-2xl border border-slate-200 dark:border-[#232B3B] shadow-xs overflow-hidden">
                            <div class="p-4 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
                                <div class="flex items-center gap-2">
                                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">DEV</span>
                                    <h3 class="text-xs font-bold text-slate-900 dark:text-white">Đăng nhập nhanh để test</h3>
                                </div>
                                <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                    Chỉ hiện ở máy dev. Bấm vào một tài khoản để vào thẳng vai trò tương ứng.
                                </p>
                                <input type="text" placeholder="Tìm theo tên hoặc tài khoản" oninput="KtxApp.filterDevQuickLogin(this.value)" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B2A5B]/30" />
                            </div>
                            <div id="devQuickLoginList" class="max-h-56 overflow-y-auto px-1.5 py-1 divide-y divide-slate-100 dark:divide-slate-800/80">
                                ${renderDevQuickLoginItems('')}
                            </div>
                        </aside>
                        ` : ''}

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

    async function renderActiveView(showPageLoader = false, skipFetch = false) {
        const content = document.getElementById('mainContent');
        if (!content) return;
        const renderId = ++activeViewRenderId;
        const tab = state.currentTab;

        const isStudent = state.currentUser?.roleCode === 'sinhVien';

        // Role-based UX Routing Guard
        if (isStudent) {
            if (!tab || !tab.startsWith('sv-')) {
                state.currentTab = 'sv-tong-quan';
                renderSidebar();
                return renderActiveView(showPageLoader, skipFetch);
            }
        } else {
            const defaultTab = canAccessMenu('dashboard') ? 'dashboard' : 'nhan-vien-tai-khoan';
            if (!canAccessMenu(defaultTab)) {
                content.innerHTML = '<div class="p-6 text-center text-slate-600">Bạn không có quyền truy cập chức năng nào. Vui lòng liên hệ quản trị viên.</div>';
                return;
            }
            if (!tab || tab.startsWith('sv-') || !canAccessMenu(tab)) {
                state.currentTab = defaultTab;
                renderSidebar();
                return renderActiveView(showPageLoader, skipFetch);
            }
        }

        const startedAt = performance.now();
        if (showPageLoader) content.innerHTML = renderPageLoading();

        let viewHtml = '';

        if (tab.startsWith('sv-')) {
            let retries = 0;
            while ((!window.KtxStudentViews || !window.KtxStudentViews.hasView(tab)) && retries < 20) {
                await new Promise(res => setTimeout(res, 50));
                retries++;
            }
            if (window.KtxStudentViews && window.KtxStudentViews.hasView(tab)) {
                try {
                    await window.KtxStudentViews.renderView(tab, content, state);
                } catch (svErr) {
                    console.error('KtxStudentViews.renderView error for tab ' + tab + ':', svErr);
                    content.innerHTML = `
                        <div class="bg-white dark:bg-[#121826] rounded-2xl p-8 shadow-xs border border-red-200 dark:border-red-900/50 text-center space-y-4">
                            <div class="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
                                <span class="material-symbols-outlined text-[30px]">error</span>
                            </div>
                            <h3 class="text-base font-bold text-slate-900 dark:text-white">Lỗi hiển thị trang sinh viên</h3>
                            <p class="text-xs text-red-600 dark:text-red-400 max-w-md mx-auto">${escapeHtml(svErr.message || 'Không thể tải giao diện')}</p>
                            <div class="pt-2">
                                <button type="button" onclick="KtxApp.navigate('${escapeHtml(tab)}')" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all">
                                    Thử lại
                                </button>
                            </div>
                        </div>
                    `;
                }
                return;
            } else {
                console.warn('KtxStudentViews not ready or missing view for tab:', tab);
                content.innerHTML = `
                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-8 shadow-xs border border-amber-200 dark:border-amber-900/50 text-center space-y-4">
                        <div class="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                            <span class="material-symbols-outlined text-[30px]">pending</span>
                        </div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white">Đang khởi tạo giao diện sinh viên</h3>
                        <p class="text-xs text-slate-500 max-w-md mx-auto">Vui lòng bấm tải lại hoặc chọn lại mục từ thanh điều hướng bên trái.</p>
                        <div class="pt-2">
                            <button type="button" onclick="window.location.reload()" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all">
                                Tải lại trang (F5)
                            </button>
                        </div>
                    </div>
                `;
                return;
            }
        } else if (tab === 'dashboard') {
            if (!skipFetch || !state.dashboardSummary) await loadDashboard();
            viewHtml = renderDashboardView();
        } else if (tab === 'don-dang-ky') {
            if (!skipFetch || !state.applications || !state.applications.length) await loadApplications();
            viewHtml = renderAdmissionsView();
        } else if (tab === 'hop-dong') {
            if (!skipFetch || !state.contracts || !state.contracts.length) {
                await Promise.all([loadContracts(), loadContractBuildings()]);
            }
            viewHtml = renderContractsView();
        } else if (tab === 'sinh-vien') {
            if (!skipFetch || !state.students || !state.students.length) await loadStudents();
            if (!state.rooms || !state.rooms.length) await loadRooms();
            viewHtml = renderStudentsView();
        } else if (tab === 'phong-va-giuong') {
            if (!skipFetch || !state.rooms || !state.rooms.length) {
                await Promise.all([loadRooms(), loadStudents()]);
            }
            viewHtml = renderRoomsView();
        } else if (window.KtxExtendedViews && window.KtxExtendedViews.hasView(tab)) {
            const viewContainer = document.createElement('div');
            await window.KtxExtendedViews.renderView(tab, viewContainer, state, skipFetch);
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

        if (renderId !== activeViewRenderId || tab !== state.currentTab) return;
        const isSameTab = content.dataset.renderedTab === tab && content.children.length > 0;
        content.dataset.renderedTab = tab;

        if (!isSameTab) {
            content.innerHTML = viewHtml;
            const enteredView = content.firstElementChild;
            if (enteredView) {
                stampRawHtml(enteredView);
                enteredView.classList.add('page-content-enter');
                enteredView.addEventListener('animationend', () => {
                    enteredView.classList.remove('page-content-enter');
                }, { once: true });
            }
        } else {
            preserveSearchFocusAndUpdate(content, viewHtml);
        }
        if (tab === 'dashboard' && !skipFetch) {
            initDashboardEntranceAnimations();
        }
    }

    // =========================================================================
    // MEBIUS DESIGN: CASH FLOW AREA CHART MATH & DATA ENGINE (FIGMA 1473:76243)
    // =========================================================================
    const CF_PLOT_WIDTH = 594;
    const CF_PLOT_HEIGHT = 150;
    const CF_INSET = 12;
    const CF_GRID_COLUMNS = 12;
    const CF_TICK_TOP = 6;
    const CF_TICK_BOTTOM = 140;
    const CF_AREA_OFFSET = 1;
    const CF_FADE_END = 132;
    const CF_CAP = 5;
    const CF_CAP_HALF = 5 / Math.sqrt(3);
    const CF_MARKER = 12;
    const CF_TIP_GAP = 12;
    const CF_TIP_ROW = 18;

    const rawCashFlowValues = [
        18319.33, 17076.42, 16400.51, 17263.28, 18056.65, 16440.02, 15763.04, 15810.02, 17893.28, 17232.32, 16922.66, 14827.65, 13619.98, 17120.2,
        17792.91, 16298, 17373.27, 16456.03, 15979.8, 15508.9, 15654.12, 17925.31, 17138.35, 17403.16, 17501.4, 17058.27, 18139.94, 17764.08,
        17521.69, 17766.21, 17221.64, 17424.52, 17712.82, 17682.93, 17010.22, 17807.86, 16905.57, 17366.86, 17096.71, 17957.35, 18233.9, 16625.81,
        16778.51, 16689.88, 17435.2, 16884.22, 17297.45, 16503.02, 16592.71, 15779.06, 15953.1, 15788.67, 17483.25, 17595.37, 16121.82, 17216.3,
        15611.41, 16957.9, 17335.89, 16844.71, 16815.88, 16604.46, 15559.09, 13237.72, 13784.42, 17531.3, 15785.46, 17071.08, 16290.53, 17151.17,
        16599.12, 15408.53, 15041.21, 15071.11, 15118.09, 15798.28, 14647.2, 16192.29, 14865.03, 15911.46, 16606.59, 13441.66, 12472.11, 12184.87,
        13091.43, 14008.66, 15136.25, 14078.07, 14375.98, 13978.76, 14728.35, 14185.91, 15807.89, 16182.68, 14438.98
    ];

    const rawCompareValues = [
        22402.08, 21138.08, 20705.93, 21428.45, 22919.63, 23319.33, 22427.7, 20459.96, 18186.47, 18808.22, 17050.58, 15217.78, 18379.49, 21322.55,
        20494.12, 19520.5, 19722.06, 20104.67, 19141.3, 16850.73, 16989.09, 17347.79, 15600.4, 18458.06, 19699.85, 19055.9, 16435.66, 17139.4,
        18157.43, 19488.05, 20077.34, 18136.94, 20555.61, 20350.64, 18756.98, 19315.53, 19337.73, 18613.5, 20149.08, 19744.26, 17756.03, 16674.8,
        18054.95, 19324.07, 16738, 15655.06, 15730.22, 19062.73, 18005.41, 17510.06, 14158.76, 12226.89, 17826.06, 18902.17, 16510.82, 18230.88,
        16763.62, 16001.8, 15248.53, 15480.83, 19113.97, 17855.1, 18278.71, 18435.85, 17726.99, 19457.3, 18856.05, 18468.31
    ];

    function generateEvenlyDatedPoints(startDateStr, endDateStr, values) {
        const from = Date.parse(`${startDateStr}T00:00:00Z`);
        const to = Date.parse(`${endDateStr}T00:00:00Z`);
        const totalMs = to - from;
        const n = values.length;
        return values.map((val, i) => {
            const time = from + Math.round((i * totalMs) / Math.max(1, n - 1));
            const d = new Date(time);
            return {
                date: d.toISOString().slice(0, 10),
                value: val
            };
        });
    }

    const defaultCashFlowData = generateEvenlyDatedPoints("2025-01-01", "2025-08-01", rawCashFlowValues);
    let cashFlowChartState = null;

    const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

    function formatVND(value) {
        return `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(value) || 0))} đ`;
    }

    function formatCompactVND(value) {
        const v = Number(value) || 0;
        if (v >= 1000000000) return `${(v / 1000000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
        if (v >= 1000000) return `${Math.round(v / 1000000).toLocaleString('vi-VN')} tr`;
        return new Intl.NumberFormat('vi-VN').format(Math.round(v));
    }

    // Chọn mốc trục tung đẹp (1, 2, 5 × 10^n) để biểu đồ luôn vừa dữ liệu thật.
    function buildRevenueTicks(maxValue) {
        if (!(maxValue > 0)) return [0, 1000000, 2000000, 3000000, 4000000];
        const rough = maxValue / 4;
        const power = Math.pow(10, Math.floor(Math.log10(rough)));
        const normalized = rough / power;
        const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
        const step = nice * power;
        return [0, step, step * 2, step * 3, step * 4];
    }

    function buildCountTicks(maxValue) {
        if (!(maxValue > 0)) return [0, 1, 2, 3, 4];
        const step = Math.max(1, Math.ceil(maxValue / 4));
        return [0, step, step * 2, step * 3, step * 4];
    }

    function layoutCashFlowChart(data, compare, ticks, width) {
        const values = data.map(p => p.value);
        const lo = ticks[0];
        const hi = ticks[ticks.length - 1];
        const y = (val) => (hi > lo ? CF_TICK_BOTTOM - ((val - lo) / (hi - lo)) * (CF_TICK_BOTTOM - CF_TICK_TOP) : (CF_TICK_TOP + CF_TICK_BOTTOM) / 2);
        const spread = (count) => (i) => (count > 1 ? CF_INSET + (i * (width - 2 * CF_INSET)) / (count - 1) : width / 2);
        const at = spread(values.length);
        const atCompare = spread(compare.length);

        return {
            ticks,
            step: values.length > 1 ? (width - 2 * CF_INSET) / (values.length - 1) : width,
            current: values.map((val, i) => ({ x: at(i), y: y(val), date: data[i].date, value: val })),
            previous: compare.map((val, i) => ({ x: atCompare(i), y: y(val), value: val })),
            grid: Array.from({ length: CF_GRID_COLUMNS + 1 }, (_, i) => CF_INSET + (i * (width - 2 * CF_INSET)) / CF_GRID_COLUMNS + 0.5),
            isHovering: false
        };
    }

    function valueAtPolyline(points, targetX) {
        if (!points || !points.length) return 0;
        if (targetX <= points[0].x) return points[0].y;
        if (targetX >= points[points.length - 1].x) return points[points.length - 1].y;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            if (targetX >= p0.x && targetX <= p1.x) {
                const ratio = (targetX - p0.x) / (p1.x - p0.x);
                return p0.y + ratio * (p1.y - p0.y);
            }
        }
        return points[0].y;
    }

    function buildPolylinePath(points) {
        if (!points || !points.length) return '';
        return points.map((p, i) => (i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)).join(' ');
    }

    function buildAreaPolylinePath(points, height) {
        if (!points || !points.length) return '';
        const line = buildPolylinePath(points);
        return `${line} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;
    }

    // Interactive Scrubber Handler
    function onCashFlowPointerMove(e) {
        if (!cashFlowChartState) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = e.clientX;
        const relativeX = ((clientX - rect.left) / rect.width) * CF_PLOT_WIDTH;
        const n = cashFlowChartState.current.length;
        const idx = Math.min(n - 1, Math.max(0, Math.round((relativeX - CF_INSET) / cashFlowChartState.step)));
        cashFlowChartState.isHovering = true;
        updateCashFlowActivePoint(idx);
    }

    function onCashFlowPointerLeave() {
        if (!cashFlowChartState) return;
        cashFlowChartState.isHovering = false;
        updateCashFlowActivePoint(Math.max(0, cashFlowChartState.current.length - 1));
    }

    function updateCashFlowActivePoint(idx) {
        if (!cashFlowChartState) return;
        const s = cashFlowChartState;
        const pt = s.current[idx];
        if (!pt) return;
        s.activeIndex = idx;

        const cursorX = pt.x;
        const currentY = pt.y;
        const compareY = valueAtPolyline(s.previous, cursorX);

        // Tọa độ con trỏ line và polygon caps
        const cursorEl = document.getElementById('cf-cursor-group');
        if (cursorEl) {
            cursorEl.innerHTML = `
                <line x1="${cursorX}" x2="${cursorX}" y1="${CF_CAP - 0.5}" y2="${CF_PLOT_HEIGHT - CF_CAP + 0.5}" stroke="#0562ef" stroke-dasharray="4 4" stroke-width="1" />
                <polygon points="${cursorX - CF_CAP_HALF},0 ${cursorX + CF_CAP_HALF},0 ${cursorX + 0.5},${CF_CAP} ${cursorX - 0.5},${CF_CAP}" fill="#0562ef" />
                <polygon points="${cursorX - CF_CAP_HALF},${CF_PLOT_HEIGHT} ${cursorX + CF_CAP_HALF},${CF_PLOT_HEIGHT} ${cursorX + 0.5},${CF_PLOT_HEIGHT - CF_CAP} ${cursorX - 0.5},${CF_PLOT_HEIGHT - CF_CAP}" fill="#0562ef" />
            `;
        }

        const xPct = (cursorX / CF_PLOT_WIDTH) * 100;

        // Marker 1 (current) & Marker 2 (compare)
        const markerCurrent = document.getElementById('cf-marker-current');
        if (markerCurrent) {
            markerCurrent.style.left = `calc(${xPct}% - ${CF_MARKER / 2}px)`;
            markerCurrent.style.top = `${currentY - CF_MARKER / 2}px`;
        }
        const markerCompare = document.getElementById('cf-marker-compare');
        if (markerCompare) {
            markerCompare.style.left = `calc(${xPct}% - ${CF_MARKER / 2}px)`;
            markerCompare.style.top = `${compareY - CF_MARKER / 2}px`;
        }

        // Tooltip placement & text
        const tipEl = document.getElementById('cf-tooltip');
        if (tipEl) {
            const container = document.getElementById('cf-plot-container');
            const plotW = container ? container.clientWidth : CF_PLOT_WIDTH;
            const actualCursorX = (cursorX / CF_PLOT_WIDTH) * plotW;
            const tipWidth = 158;
            const flipped = actualCursorX + CF_TIP_GAP + tipWidth > plotW;
            const tipAnchor = flipped ? actualCursorX - CF_TIP_GAP : actualCursorX + CF_TIP_GAP;
            const highest = Math.min(currentY, compareY);
            const tipTop = Math.round(Math.min(Math.max(highest - CF_TIP_ROW, 0), CF_PLOT_HEIGHT - 60));

            const comparePoint = s.previous[idx];
            const compareVal = comparePoint ? comparePoint.value : valueAtPolyline(s.previous, cursorX);
            const diff = pt.value - compareVal;
            const isDown = diff < 0;

            const dateObj = new Date(pt.date);
            const formattedDate = `Tháng ${dateObj.getUTCMonth() + 1}`;

            const arrowCircleSvg = isDown
                ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true"><circle cx="8" cy="8" r="6.75"/><polyline points="5.5 8 8 10.5 10.5 8"/><line x1="8" y1="5.5" x2="8" y2="10.5"/></svg>`
                : `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true"><circle cx="8" cy="8" r="6.75"/><polyline points="5.5 8 8 5.5 10.5 8"/><line x1="8" y1="10.5" x2="8" y2="5.5"/></svg>`;

            tipEl.style.left = `${tipAnchor}px`;
            tipEl.style.top = `${tipTop}px`;
            tipEl.style.transform = flipped ? 'translateX(-100%)' : 'none';
            tipEl.style.opacity = s.isHovering ? '1' : '0';

            tipEl.innerHTML = `
                <div class="flex items-center gap-1.5">
                    <span class="h-4 w-1 bg-[#0562ef] rounded-xs shrink-0"></span>
                    <span class="text-[12px] font-bold text-slate-900 dark:text-white font-sans tabular-nums">${formatVND(pt.value)}</span>
                    <span class="text-[10px] text-slate-400">${formattedDate}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="h-4 w-1 bg-slate-300 dark:bg-slate-600 rounded-xs shrink-0"></span>
                    <span class="text-[11px] font-medium text-slate-700 dark:text-slate-300 font-sans tabular-nums">${formatVND(compareVal)}</span>
                    <span class="text-[10px] text-slate-400">Cùng kỳ năm trước</span>
                </div>
                <div class="w-full border-t border-slate-100 dark:border-slate-800 border-dashed my-0.5"></div>
                <div class="flex items-center gap-1 ${isDown ? 'text-red-500' : 'text-emerald-500'}">
                    ${arrowCircleSvg}
                    <span class="text-[11px] font-bold font-sans tabular-nums">${isDown ? '-' : '+'}${formatVND(Math.abs(diff))}</span>
                </div>
            `;
        }

        // Active Label trên trục X (Percentage responsive theo plot container)
        const activeLabelEl = document.getElementById('cf-active-label');
        if (activeLabelEl) {
            activeLabelEl.style.left = `${xPct}%`;
            const d = new Date(pt.date);
            activeLabelEl.innerHTML = `<span class="text-[11px] font-bold text-[#0562ef] block -translate-x-1/2 whitespace-nowrap">${MONTH_LABELS[d.getUTCMonth()]}</span>`;
        }

        // Highlight tick trên trục Y
        const ticks = s.ticks;
        let closestTick = ticks[0];
        let minDist = Math.abs(ticks[0] - pt.value);
        ticks.forEach(tick => {
            const dist = Math.abs(tick - pt.value);
            if (dist < minDist) {
                minDist = dist;
                closestTick = tick;
            }
        });

        document.querySelectorAll('[data-slot="cash-flow-tick"]').forEach(el => {
            const tickVal = Number(el.getAttribute('data-tick'));
            if (tickVal === closestTick) {
                el.className = 'text-[11px] font-bold text-[#0562ef] dark:text-[#3179ff] font-sans transition-colors duration-200';
            } else {
                el.className = 'text-[11px] font-medium text-slate-400 font-sans transition-colors duration-200';
            }
        });
    }

    // ========================================================
    // REVENUE BY PRODUCT LINE (Chuẩn 100% Mã Nguồn Mebius React)
    // ========================================================
    let studentChartState = null;

    function layoutStudentChart(data, series, hidden, ticks, width) {
        const n = data.length;
        const k = Math.max(1, series.length);
        const INSET_LEFT = 43;
        const INSET_RIGHT = 46;
        const GROUP_GAP = 24;
        const BAR_GAP = 10;
        const BAR_WIDTH = 48;
        const SPAN = 142;
        const BASE = 149;

        const room = Math.max(0, width - INSET_LEFT - INSET_RIGHT);
        const fit = ((n ? room / n : room) - GROUP_GAP * (n > 1 ? (n - 1) / n : 0) - (k - 1) * BAR_GAP) / k;
        const barWidth = Math.max(4, Math.min(BAR_WIDTH, fit));
        const groupWidth = k * barWidth + (k - 1) * BAR_GAP;
        const first = INSET_LEFT + groupWidth / 2;
        const last = width - INSET_RIGHT - groupWidth / 2;
        const centres = data.map((_, i) => (n > 1 ? first + (i * (last - first)) / (n - 1) : (first + last) / 2));
        const lo = ticks[0] !== undefined ? ticks[0] : 0;
        const hi = ticks[ticks.length - 1] !== undefined ? ticks[ticks.length - 1] : 50;
        const shown = series.filter(s => !hidden.includes(s.id));

        const groups = data.map((line, i) => {
            const shownWidth = shown.length * barWidth + Math.max(0, shown.length - 1) * BAR_GAP;
            const bars = series.map((s, j) => {
                const off = hidden.includes(s.id);
                const slot = off ? j : shown.indexOf(s);
                const x = off 
                    ? centres[i] - groupWidth / 2 + slot * (barWidth + BAR_GAP) 
                    : centres[i] - shownWidth / 2 + slot * (barWidth + BAR_GAP);
                const value = line.values[s.id] ?? 0;
                const height = off || hi <= lo ? 0 : Math.max(0, Math.round(((Math.min(Math.max(value, lo), hi) - lo) / (hi - lo)) * SPAN));
                return { id: s.id, x, value, height, off };
            });
            const top = BASE - Math.max(0, ...bars.filter(bar => !bar.off).map(bar => bar.height));
            const visible = bars.filter(bar => !bar.off);
            const left = visible.length ? Math.min(...visible.map(bar => bar.x)) : centres[i];
            const right = visible.length ? Math.max(...visible.map(bar => bar.x + barWidth)) : centres[i];
            return { centre: centres[i], top, left, right, bars, label: line.label, values: line.values };
        });

        const dividers = centres.slice(1).map((c, i) => Math.round((centres[i] + c) / 2));
        const columns = centres.map((c, i) => {
            const from = i > 0 ? (centres[i - 1] + c) / 2 : 0;
            const to = i < n - 1 ? (c + centres[i + 1]) / 2 : width;
            return { left: from, width: to - from };
        });

        return { barWidth, groupWidth, groups, dividers, columns, width };
    }

    function applyStudentChartLayout(width) {
        if (!studentChartState || !width || width <= 0) return;
        const s = studentChartState;
        s.width = width;
        const layout = layoutStudentChart(s.data, s.series, s.hiddenSeries, s.ticks, width);
        s.groups = layout.groups;
        s.columns = layout.columns;
        s.dividers = layout.dividers;
        s.barWidth = layout.barWidth;

        // 1. Update SVG horizontal lines (x2) and vertical dividers
        const svgLines = document.querySelectorAll('[data-slot="student-grid-line"]');
        svgLines.forEach(l => l.setAttribute('x2', width));
        const dividers = document.querySelectorAll('[data-slot="student-divider"]');
        layout.dividers.forEach((divX, i) => {
            if (dividers[i]) {
                dividers[i].setAttribute('x1', divX + 0.5);
                dividers[i].setAttribute('x2', divX + 0.5);
            }
        });

        // 2. Update Bars positioning and width
        layout.groups.forEach((g, i) => {
            g.bars.forEach(bar => {
                const colEl = document.querySelector(`[data-slot="revenue-by-product-line-chart-column"][data-group-idx="${i}"][data-series-id="${bar.id}"]`);
                if (colEl) {
                    colEl.style.left = `${bar.x}px`;
                    colEl.style.width = `${layout.barWidth}px`;
                }
            });
        });

        // 3. Update Bottom Axis Labels positioning (100% centered under bars)
        layout.groups.forEach((g, i) => {
            const lblWrapper = document.querySelector(`[data-slot="revenue-by-product-line-chart-axis-label"][data-index="${i}"]`);
            if (lblWrapper) {
                lblWrapper.style.left = `${g.centre}px`;
            }
        });

        // 4. Update Interactive overlay buttons
        layout.columns.forEach((col, i) => {
            const btn = document.querySelector(`[data-slot="revenue-by-product-line-chart-line"][data-index="${i}"]`);
            if (btn) {
                btn.style.left = `${col.left}px`;
                btn.style.width = `${col.width}px`;
                const ring = btn.querySelector('span[aria-hidden="true"]');
                if (ring) {
                    ring.style.left = `${layout.groups[i].left - col.left - 6}px`;
                    ring.style.width = `${layout.groups[i].right - layout.groups[i].left + 12}px`;
                }
            }
        });

        // 5. Update Tooltip position
        const activeIdx = s.selectedIndex !== null ? s.selectedIndex : 0;
        updateStudentActiveGroup(activeIdx);
    }

    function onStudentGroupHover(idx) {
        if (!studentChartState) return;
        studentChartState.isHovering = true;
        updateStudentActiveGroup(idx);
    }

    function onStudentGroupLeave() {
        if (!studentChartState) return;
        const defaultIdx = studentChartState.selectedIndex !== null ? studentChartState.selectedIndex : 0;
        studentChartState.isHovering = false;
        updateStudentActiveGroup(defaultIdx);
    }

    function onStudentGroupClick(idx) {
        if (!studentChartState) return;
        studentChartState.selectedIndex = (studentChartState.selectedIndex === idx) ? null : idx;
        updateStudentActiveGroup(studentChartState.selectedIndex !== null ? studentChartState.selectedIndex : 0);
    }

    function toggleStudentSeries(seriesId) {
        if (!studentChartState) return;
        const s = studentChartState;
        const pos = s.hiddenSeries.indexOf(seriesId);
        if (pos > -1) {
            s.hiddenSeries.splice(pos, 1);
        } else {
            s.hiddenSeries.push(seriesId);
        }

        const isOff = s.hiddenSeries.includes(seriesId);
        const btn = document.querySelector(`[data-slot="revenue-legend-${seriesId}"]`);
        if (btn) {
            btn.setAttribute('aria-pressed', isOff ? 'false' : 'true');
            const dotWrapper = btn.querySelector('[data-slot="legend-dot-wrapper"]');
            if (dotWrapper) dotWrapper.style.opacity = isOff ? '0.4' : '1';
        }

        applyStudentChartLayout(s.width);
    }

    function updateStudentActiveGroup(idx) {
        if (!studentChartState) return;
        const s = studentChartState;
        const group = s.groups[idx];
        if (!group) return;

        // 1. Dim other columns
        document.querySelectorAll('[data-slot="revenue-by-product-line-chart-column"]').forEach(col => {
            const gIdx = Number(col.getAttribute('data-group-idx'));
            const sId = col.getAttribute('data-series-id');
            const isHidden = s.hiddenSeries.includes(sId);
            if (isHidden) {
                col.style.opacity = '0';
            } else if (gIdx === idx) {
                col.style.opacity = '1';
            } else {
                col.style.opacity = '0.4';
            }
        });

        // 2. Highlight axis label
        s.groups.forEach((g, i) => {
            const lbl = document.getElementById(`student-axis-label-${i}`);
            if (lbl) {
                if (i === idx) {
                    lbl.className = 'text-[12px] font-bold text-slate-900 dark:text-white block -translate-x-1/2 whitespace-nowrap transition-colors duration-200';
                } else {
                    lbl.className = 'text-[12px] font-medium text-slate-400 block -translate-x-1/2 whitespace-nowrap transition-colors duration-200';
                }
            }
        });

        // 3. Position & update Tooltip
        const tipEl = document.getElementById('student-tooltip');
        if (tipEl) {
            const tipWidth = 168;
            const tipHeight = 92;
            const flipped = Math.round(group.right + 8) + tipWidth > s.width;
            const tipLeft = flipped ? Math.max(0, Math.round(group.left - 8 - tipWidth)) : Math.round(group.right + 8);
            const tipTop = Math.round(Math.min(Math.max(group.top + 6, 0), Math.max(0, s.height - tipHeight)));

            tipEl.style.left = `${tipLeft}px`;
            tipEl.style.top = `${tipTop}px`;
            tipEl.style.opacity = s.isHovering ? '1' : '0';

            const maleVal = Number(group.values.male) || 0;
            const femaleVal = Number(group.values.female) || 0;
            const totalVal = maleVal + femaleVal;
            const femaleShare = totalVal > 0 ? Math.round((femaleVal / totalVal) * 100) : 0;

            const showInd = !s.hiddenSeries.includes('male');
            const showTop = !s.hiddenSeries.includes('female');

            let rowsHtml = '';
            if (showInd) {
                rowsHtml += `
                    <div class="flex items-center gap-1.5">
                        <span class="h-4 w-1 rounded-xs bg-[#0562ef] shrink-0"></span>
                        <span class="text-[12px] font-bold text-slate-900 dark:text-white font-sans tabular-nums">${maleVal} sinh viên</span>
                        <span class="text-[10px] text-slate-400">Nam</span>
                    </div>
                `;
            }
            if (showTop) {
                rowsHtml += `
                    <div class="flex items-center gap-1.5">
                        <span class="h-4 w-1 rounded-xs bg-[#93c5fd] shrink-0"></span>
                        <span class="text-[11px] font-medium text-slate-700 dark:text-slate-300 font-sans tabular-nums">${femaleVal} sinh viên</span>
                        <span class="text-[10px] text-slate-400">Nữ</span>
                    </div>
                `;
            }

            let changeHtml = '';
            if (showInd || showTop) {
                changeHtml = `
                    <div class="w-full border-t border-slate-100 dark:border-slate-800 border-dashed my-0.5"></div>
                    <div class="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <span class="text-[11px] font-semibold font-sans">Tổng: ${totalVal} sinh viên · Nữ ${femaleShare}%</span>
                    </div>
                `;
            }

            tipEl.innerHTML = `
                <span class="text-[12px] font-bold text-slate-900 dark:text-white">${group.label}</span>
                ${rowsHtml}
                ${changeHtml}
            `;
        }
    }

    // =========================================================================
    // REVENUE OVERVIEW GAUGE (Chuẩn 100% Mã Nguồn Mebius React - Figma 1473:80634)
    // =========================================================================
    const GAUGE_WIDTH = 720;
    const GAUGE_HEIGHT = 362;
    const CX = 360;
    const CY = 360;
    const RING_OUTER = 360;
    const RING_INNER = 356.4;
    const BAND_OUTER = 340;
    const BAND_INNER = 231.2;
    const CORNER = 8;
    const LINE_CY = 361;
    const LINE_OUTER = 296;
    const LINE_INNER = 284.16;
    const LINE_RADIUS = (LINE_OUTER + LINE_INNER) / 2;
    const LINE_START = 180.131;
    const DOT = 10;
    const DOT_RING = 2;
    const END_DOT = 12;
    const END_RING = 4;
    const FILL_PAST = 4.5195;
    const ARC_PAST = 3.4795;
    const ARC_SPAN = 93.2246;
    const LINE_PAST = 1.6274;
    const FIGMA_TODAY = 284.5628;

    const roundG = (n) => Math.round(n * 1000) / 1000;
    const radG = (deg) => (deg * Math.PI) / 180;
    const clampG = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
    const atG = (cx, cy, r, deg) => `${roundG(cx + r * Math.cos(radG(deg)))} ${roundG(cy + r * Math.sin(radG(deg)))}`;
    const angleOf = (share) => 180 + 180 * clampG(share, 0, 1);

    function segmentPath(cx, cy, inner, outer, from, to, corner = 0) {
        if (!(to - from > 0.001)) return "";
        const fit = Math.min(corner, (outer - inner) / 2 - 0.01, radG(to - from) * inner * 0.45);
        const c = Math.max(0, fit);
        const large = (span) => (span > 180 ? 1 : 0);
        if (c < 0.01) {
            return `M ${atG(cx, cy, outer, from)} A ${outer} ${outer} 0 ${large(to - from)} 1 ${atG(cx, cy, outer, to)} L ${atG(cx, cy, inner, to)} A ${inner} ${inner} 0 ${large(to - from)} 0 ${atG(cx, cy, inner, from)} Z`;
        }
        const dOut = (Math.asin(c / (outer - c)) * 180) / Math.PI;
        const dIn = (Math.asin(c / (inner + c)) * 180) / Math.PI;
        const edgeOut = Math.sqrt((outer - c) ** 2 - c * c);
        const edgeIn = Math.sqrt((inner + c) ** 2 - c * c);
        return [
            `M ${atG(cx, cy, edgeIn, from)}`,
            `L ${atG(cx, cy, edgeOut, from)}`,
            `A ${c} ${c} 0 0 1 ${atG(cx, cy, outer, from + dOut)}`,
            `A ${outer} ${outer} 0 ${large(to - from - 2 * dOut)} 1 ${atG(cx, cy, outer, to - dOut)}`,
            `A ${c} ${c} 0 0 1 ${atG(cx, cy, edgeOut, to)}`,
            `L ${atG(cx, cy, edgeIn, to)}`,
            `A ${c} ${c} 0 0 1 ${atG(cx, cy, inner, to - dIn)}`,
            `A ${inner} ${inner} 0 ${large(to - from - 2 * dIn)} 0 ${atG(cx, cy, inner, from + dIn)}`,
            `A ${c} ${c} 0 0 1 ${atG(cx, cy, edgeIn, from)}`,
            "Z"
        ].join(" ");
    }

    function linePath(to) {
        if (!(to - LINE_START > 0.001)) return "";
        const cap = (LINE_OUTER - LINE_INNER) / 2;
        const end = Math.max(LINE_START, to - ((cap / LINE_RADIUS) * 180) / Math.PI);
        const large = end - LINE_START > 180 ? 1 : 0;
        return `M ${atG(CX, LINE_CY, LINE_OUTER, LINE_START)} A ${LINE_OUTER} ${LINE_OUTER} 0 ${large} 1 ${atG(CX, LINE_CY, LINE_OUTER, end)} A ${cap} ${cap} 0 0 1 ${atG(CX, LINE_CY, LINE_INNER, end)} A ${LINE_INNER} ${LINE_INNER} 0 ${large} 0 ${atG(CX, LINE_CY, LINE_INNER, LINE_START)} Z`;
    }

    function lineFade(to) {
        const sx = CX + LINE_RADIUS * Math.cos(radG(LINE_START));
        const sy = LINE_CY + LINE_RADIUS * Math.sin(radG(LINE_START));
        const end = (deg) => [CX + LINE_RADIUS * Math.cos(radG(deg)) - sx, LINE_CY + LINE_RADIUS * Math.sin(radG(deg)) - sy];
        const [fx, fy] = end(FIGMA_TODAY + LINE_PAST);
        const [nx, ny] = end(to);
        const scale = Math.hypot(nx, ny) / (Math.hypot(fx, fy) || 1);
        const turn = ((Math.atan2(ny, nx) - Math.atan2(fy, fx)) * 180) / Math.PI;
        return `translate(${roundG(sx)} ${roundG(sy)}) rotate(${roundG(turn)}) scale(${roundG(scale)}) translate(${roundG(-sx)} ${roundG(-sy)})`;
    }

    function marksAt(today, sweep = 1) {
        const along = (deg) => 180 + (Math.min(deg, 360) - 180) * sweep;
        return { fill: along(today + FILL_PAST), arc: along(today + ARC_PAST), line: along(today + LINE_PAST) };
    }

    const sampleRevenueOverviewData = [
        { date: "2026-10-01", value: 52.86 },
        { date: "2026-10-02", value: 127.05 },
        { date: "2026-10-08", value: 532.22 },
        { date: "2026-10-10", value: 610.76 },
        { date: "2026-10-13", value: 685.21 },
        { date: "2026-10-15", value: 757.96 },
        { date: "2026-10-17", value: 874.92 }
    ];
    const SAMPLE_TARGET = 1506;
    const SAMPLE_PREVIOUS = 807.57;

    let revenueOverviewChartState = null;

    function onRevenueOverviewPointerMove(event) {
        if (!revenueOverviewChartState) return;
        const target = event.currentTarget;
        const box = target.getBoundingClientRect();
        const x = ((event.clientX - box.left) / box.width) * GAUGE_WIDTH;
        const y = ((event.clientY - box.top) / box.height) * GAUGE_HEIGHT;
        let deg = (Math.atan2(y - LINE_CY, x - CX) * 180) / Math.PI;
        if (deg < 0) deg += 360;
        if (deg < 180) deg = deg < 90 ? 360 : 180;

        let best = 0;
        const angles = revenueOverviewChartState.angles;
        for (let i = 1; i < angles.length; i++) {
            if (Math.abs(angles[i] - deg) < Math.abs(angles[best] - deg)) best = i;
        }
        setRevenueOverviewActive(best);
    }

    function onRevenueOverviewPointerLeave() {
        if (!revenueOverviewChartState) return;
        setRevenueOverviewActive(null);
    }

    function setRevenueOverviewActive(idx) {
        if (!revenueOverviewChartState) return;
        const s = revenueOverviewChartState;
        const tipEl = document.getElementById('ro-tooltip');
        const tipValEl = document.getElementById('ro-tip-val');
        const tipDateEl = document.getElementById('ro-tip-date');
        const n = s.data.length;
        const activeIdx = idx !== null ? idx : n - 1;
        const pt = s.data[activeIdx];
        const angle = s.angles[activeIdx];

        const pctX = ((CX + LINE_RADIUS * Math.cos(radG(angle))) / GAUGE_WIDTH) * 100;
        const pctY = ((LINE_CY + LINE_RADIUS * Math.sin(radG(angle))) / GAUGE_HEIGHT) * 100;

        if (tipEl) {
            tipEl.style.left = `${pctX.toFixed(2)}%`;
            tipEl.style.top = `${pctY.toFixed(2)}%`;
            tipEl.style.transform = 'translate(-50%, -100%) translateY(-10px)';
        }
        if (tipValEl && pt) {
            tipValEl.textContent = '$' + pt.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (tipDateEl && pt) {
            const d = new Date(pt.date);
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            tipDateEl.textContent = `${dayNames[d.getUTCDay()]}, ${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}`;
        }

        document.querySelectorAll('[data-slot="revenue-overview-chart-dot"]').forEach((dot, i) => {
            if (i === activeIdx) {
                dot.style.transform = 'scale(1.3)';
                dot.style.transition = 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)';
            } else {
                dot.style.transform = 'scale(1)';
                dot.style.transition = 'transform 300ms ease-out';
            }
        });
    }

    // =========================================================================
    // MEBIUS DESIGN: EXPENSES CHART MATH & ENGINE (FIGMA 1473:82110)
    // =========================================================================
    const EXP_SIZE = 320;
    const EXP_CENTER = EXP_SIZE / 2; // 160
    const EXP_OUTER = 160;
    const EXP_INNER = 108.8; // 68% of the radius
    const EXP_CORNER = 8;
    const EXP_GAP = 0.9; // degrees
    const EXP_SPREAD = 2;
    const EXP_TICK_INNER = 116.005;
    const EXP_TICK_OUTER = 153;
    const EXP_TICK_SPAN = 1.8;
    const EXP_TICK_STEP = 3;
    const EXP_OUTLINE_BEFORE = 7.62;
    const EXP_OUTLINE_AFTER = 4.75;
    const EXP_GLOW_INNER = 120.61;
    const EXP_GLOW_OUTER = 147;
    const EXP_GLOW_SHARE = 0.9;
    const EXP_GLOW_CORNER = 7.35;
    const EXP_POP = 4;
    const EXP_HOVER_IN = EXP_INNER - 10;
    const EXP_HOVER_OUT = EXP_OUTER + 10;
    const EXP_FRAME = "M -60 -60 H 380 V 380 H -60 Z ";
    const EXP_REST = "\u0000rest";

    const expColors = {
        orange: {
            fill: "#fb923c",
            rim: "#f97316",
            glow: "#ea580c",
            dot: "#fb923c",
            dotRing: "#f97316",
            ringClass: "focus-visible:ring-amber-500/40"
        },
        green: {
            fill: "#4ade80",
            rim: "#22c55e",
            glow: "#16a34a",
            dot: "#4ade80",
            dotRing: "#22c55e",
            ringClass: "focus-visible:ring-green-500/40"
        },
        yellow: {
            fill: "#facc15",
            rim: "#eab308",
            dot: "#facc15",
            dotRing: "#eab308",
            ringClass: "focus-visible:ring-amber-500/40"
        },
        blue: {
            fill: "#60a5fa",
            rim: "#3b82f6",
            glow: "#2563eb",
            dot: "#60a5fa",
            dotRing: "#3b82f6",
            ringClass: "focus-visible:ring-blue-500/40"
        },
        purple: {
            fill: "#c084fc",
            rim: "#a855f7",
            glow: "#9333ea",
            dot: "#c084fc",
            dotRing: "#a855f7",
            ringClass: "focus-visible:ring-blue-500/40"
        }
    };

    // Danh mục và số liệu được nạp từ API dashboard (loại phòng thật trong CSDL).
    let expensesCategories = [];
    let expensesPeriods = [];

    let expensesChartState = {
        period: "all",
        pinned: null,
        preview: null,
        donut: null
    };

    function formatRoomCount(val) {
        return `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(val) || 0))} phòng`;
    }

    const polarExp = (r, a) => [EXP_CENTER + r * Math.sin(a), EXP_CENTER - r * Math.cos(a)];

    function arcPathExp(r, a0, a1) {
        if (!(a1 > a0)) return "";
        if (a1 - a0 >= 360) {
            const [x, y] = polarExp(r, 0);
            const [bx, by] = polarExp(r, Math.PI);
            return `M ${roundG(x)} ${roundG(y)} A ${r} ${r} 0 1 1 ${roundG(bx)} ${roundG(by)} A ${r} ${r} 0 1 1 ${roundG(x)} ${roundG(y)}`;
        }
        const [x0, y0] = polarExp(r, radG(a0));
        const [x1, y1] = polarExp(r, radG(a1));
        return `M ${roundG(x0)} ${roundG(y0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${roundG(x1)} ${roundG(y1)}`;
    }

    function wedgePathExp(a0, a1) {
        const r = EXP_OUTER + 40;
        if (!(a1 > a0)) return "";
        if (a1 - a0 >= 360) return `${arcPathExp(r, 0, 360)} Z`;
        return `M ${EXP_CENTER} ${EXP_CENTER} L ${arcPathExp(r, a0, a1).slice(2)} Z`;
    }

    function sectorPath(r0, r1, a0, a1, opts = {}) {
        const center = opts.center || EXP_CENTER;
        const corner = opts.corner || 0;
        const deg0 = (a0 * 180 / Math.PI) - 90;
        const deg1 = (a1 * 180 / Math.PI) - 90;
        return segmentPath(center, center, r0, r1, deg0, deg1, corner);
    }

    function layoutDonutExp(values, budget) {
        const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
        const full = budget !== undefined && budget > total ? budget : total;
        let at = 0;
        const arcs = values.map(value => {
            const span = full > 0 ? (Math.max(0, value) / full) * 360 : 0;
            const arc = { a0: at, a1: Math.max(at, at + span - EXP_GAP) };
            at += span;
            return arc;
        });
        const rest = full > total ? (arcs.length ? arcs[arcs.length - 1].a1 : 0) : 360;
        return { arcs, rest, total, full };
    }

    function segmentShapesExp(arc) {
        const { a0, a1 } = arc;
        if (!(a1 - a0 > 0.01)) return { rim: "", fill: "", light: "", glow: "" };
        const shrink = (EXP_OUTER - EXP_SPREAD) / EXP_OUTER;
        const mid = (a0 + a1) / 2;
        const half = ((a1 - a0) * EXP_GLOW_SHARE) / 2;
        return {
            rim: sectorPath((EXP_INNER * (EXP_OUTER + 1)) / EXP_OUTER, EXP_OUTER + 1, radG(a0), radG(a1), { center: EXP_CENTER, corner: (EXP_CORNER * (EXP_OUTER + 1)) / EXP_OUTER }),
            fill: sectorPath(EXP_INNER, EXP_OUTER, radG(a0), radG(a1), { center: EXP_CENTER, corner: EXP_CORNER }),
            light: EXP_FRAME + sectorPath(EXP_INNER * shrink, EXP_OUTER * shrink, radG(a0), radG(a1), { center: EXP_CENTER, corner: EXP_CORNER * shrink }),
            glow: sectorPath(EXP_GLOW_INNER, EXP_GLOW_OUTER, radG(mid - half), radG(mid + half), { center: EXP_CENTER, corner: EXP_GLOW_CORNER })
        };
    }

    function restShapesExp(rest) {
        return {
            bars: rest < 360 ? wedgePathExp(Math.max(0, rest - EXP_TICK_SPAN), 360) : "",
            outerLine: rest < 360 ? arcPathExp(EXP_OUTER - 0.5, rest - EXP_OUTLINE_BEFORE, 360 + EXP_OUTLINE_AFTER) : "",
            innerLine: rest < 360 ? arcPathExp(EXP_INNER + 0.5, rest - EXP_OUTLINE_BEFORE, 360 + EXP_OUTLINE_AFTER) : ""
        };
    }

    const EXP_TICKS = Array.from({ length: 360 / EXP_TICK_STEP }, (_, k) => {
        const end = 360 - k * EXP_TICK_STEP;
        return {
            end,
            d: sectorPath(EXP_TICK_INNER, EXP_TICK_OUTER, radG(end - EXP_TICK_SPAN), radG(end), { center: EXP_CENTER, corner: 0 })
        };
    });

    function drawExpensesDonut(root, donut) {
        if (!root) return;
        root.querySelectorAll('[data-arc]').forEach(group => {
            const arc = donut.arcs[Number(group.dataset.arc)];
            const shapes = arc ? segmentShapesExp(arc) : segmentShapesExp({ a0: 0, a1: 0 });
            group.querySelectorAll('[data-shape]').forEach(node => {
                const shape = node.getAttribute('data-shape');
                if (shapes[shape] !== undefined) node.setAttribute('d', shapes[shape]);
            });
        });
        const rest = restShapesExp(donut.rest);
        root.querySelectorAll('[data-rest]').forEach(node => {
            const restAttr = node.getAttribute('data-rest');
            if (rest[restAttr] !== undefined) node.setAttribute('d', rest[restAttr]);
        });
    }

    function lerpExpensesDonut(from, to, t) {
        return {
            arcs: to.arcs.map((arc, i) => {
                const start = from.arcs[i] || { a0: arc.a0, a1: arc.a0 };
                return {
                    a0: start.a0 + (arc.a0 - start.a0) * t,
                    a1: start.a1 + (arc.a1 - start.a1) * t
                };
            }),
            rest: from.rest + (to.rest - from.rest) * t
        };
    }

    function sweptExpensesDonut(donut, sweep) {
        return {
            arcs: donut.arcs.map(({ a0, a1 }) => ({
                a0,
                a1: Math.max(a0, Math.min(a1, sweep))
            })),
            rest: donut.rest
        };
    }

    function pointAtExpenses(event) {
        const target = event.currentTarget;
        if (!target) return null;
        const box = target.getBoundingClientRect();
        const scale = EXP_SIZE / (box.width || EXP_SIZE);
        const x = (event.clientX - box.left) * scale - EXP_CENTER;
        const y = (event.clientY - box.top) * scale - EXP_CENTER;
        const r = Math.hypot(x, y);
        if (r < EXP_HOVER_IN || r > EXP_HOVER_OUT) return null;
        const angle = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
        const period = expensesPeriods.find(p => p.value === expensesChartState.period) || expensesPeriods[0];
        const full = period.budget && period.budget > expensesChartState.donut.total ? period.budget : expensesChartState.donut.total;
        let at = 0;
        for (let i = 0; i < expensesCategories.length; i++) {
            const val = period.values[expensesCategories[i].id] || 0;
            const span = full > 0 ? (val / full) * 360 : 0;
            if (span > 0 && angle >= at && angle < at + span) {
                return expensesCategories[i].id;
            }
            at += span;
        }
        const remaining = full > expensesChartState.donut.total ? full - expensesChartState.donut.total : 0;
        return remaining > 0 ? EXP_REST : null;
    }

    function updateExpensesVisualState(prevIndex) {
        const ring = document.getElementById('expenses-ring-svg');
        const centerBox = document.getElementById('expenses-center-box');
        const centerLabel = document.getElementById('expenses-center-label');
        const centerVal = document.getElementById('expenses-center-val');
        const centerNote = document.getElementById('expenses-center-note');
        if (!ring || !expensesChartState.donut) return;

        const period = expensesPeriods.find(p => p.value === expensesChartState.period) || expensesPeriods[0];
        const donut = expensesChartState.donut;
        const { total, full } = donut;
        const remaining = full > total ? full - total : 0;

        const shownKey = expensesChartState.preview ?? expensesChartState.pinned;
        const shownIndex = expensesCategories.findIndex(c => c.id === shownKey);
        const shownRest = shownKey === EXP_REST && remaining > 0;
        const shownCat = shownIndex >= 0 ? expensesCategories[shownIndex] : null;
        const catVal = shownCat ? (period.values[shownCat.id] || 0) : 0;

        expensesCategories.forEach((cat, idx) => {
            const isDimmed = shownKey !== null && shownKey !== cat.id;
            const row = document.getElementById(`exp-row-${cat.id}`);
            if (row) {
                row.style.opacity = isDimmed ? '0.45' : '1';
                row.style.borderColor = (expensesChartState.pinned === cat.id) ? '#f97316' : '';
                if (expensesChartState.pinned === cat.id) {
                    row.classList.add('bg-white', 'dark:bg-slate-700/80', 'shadow-xs');
                } else {
                    row.classList.remove('bg-white', 'dark:bg-slate-700/80', 'shadow-xs');
                }
            }

            const arcEls = ring.querySelectorAll(`[data-pop="${idx}"]`);
            arcEls.forEach(el => {
                el.style.opacity = isDimmed ? '0.35' : '1';
            });
        });

        const restGroup = document.getElementById('exp-rest-group');
        if (restGroup) {
            restGroup.style.opacity = (shownKey !== null && !shownRest) ? '0.4' : '1';
        }

        if (prevIndex !== undefined && prevIndex !== shownIndex && prevIndex >= 0) {
            const prevEls = ring.querySelectorAll(`[data-pop="${prevIndex}"]`);
            prevEls.forEach(el => {
                el.style.transform = 'translate(0px, 0px)';
                el.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out';
            });
        }

        if (shownIndex >= 0) {
            const arc = donut.arcs[shownIndex];
            if (arc) {
                const mid = radG((arc.a0 + arc.a1) / 2);
                const px = roundG(EXP_POP * Math.sin(mid));
                const py = roundG(-EXP_POP * Math.cos(mid));
                const curEls = ring.querySelectorAll(`[data-pop="${shownIndex}"]`);
                curEls.forEach(el => {
                    el.style.transform = `translate(${px}px, ${py}px)`;
                    el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease-out';
                });
            }
        }

        if (centerBox && centerLabel && centerVal && centerNote) {
            if (shownCat) {
                centerBox.style.opacity = '1';
                centerBox.style.transform = 'scale(1)';
                centerBox.style.transition = 'opacity 0.35s ease-out, transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                centerLabel.textContent = shownCat.label;
                centerVal.textContent = formatRoomCount(catVal);
                const pct = total > 0 ? ((catVal / total) * 100).toFixed(1) : '0';
                centerNote.textContent = `${pct}% của ${formatRoomCount(total)}`;
            } else if (shownRest) {
                centerBox.style.opacity = '1';
                centerBox.style.transform = 'scale(1)';
                centerBox.style.transition = 'opacity 0.35s ease-out, transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                centerLabel.textContent = 'Còn lại';
                centerVal.textContent = formatRoomCount(remaining);
                centerNote.textContent = `trên ${formatRoomCount(full)}`;
            } else {
                centerBox.style.opacity = '0';
                centerBox.style.transform = 'scale(0.92)';
                centerBox.style.transition = 'opacity 0.25s ease-out, transform 0.25s ease-out';
            }
        }
    }

    function onExpensesRowHover(catId, isEnter) {
        const prevKey = expensesChartState.preview ?? expensesChartState.pinned;
        const prevIndex = expensesCategories.findIndex(c => c.id === prevKey);
        expensesChartState.preview = isEnter ? catId : null;
        updateExpensesVisualState(prevIndex);
    }

    function onExpensesRowClick(catId) {
        const prevKey = expensesChartState.preview ?? expensesChartState.pinned;
        const prevIndex = expensesCategories.findIndex(c => c.id === prevKey);
        expensesChartState.pinned = expensesChartState.pinned === catId ? null : catId;
        updateExpensesVisualState(prevIndex);
    }

    function onExpensesRingPointerMove(event) {
        const targetId = pointAtExpenses(event);
        const prevKey = expensesChartState.preview ?? expensesChartState.pinned;
        const prevIndex = expensesCategories.findIndex(c => c.id === prevKey);
        if (expensesChartState.preview !== targetId) {
            expensesChartState.preview = targetId;
            updateExpensesVisualState(prevIndex);
        }
    }

    function onExpensesRingPointerLeave() {
        const prevKey = expensesChartState.preview ?? expensesChartState.pinned;
        const prevIndex = expensesCategories.findIndex(c => c.id === prevKey);
        expensesChartState.preview = null;
        updateExpensesVisualState(prevIndex);
    }

    function onExpensesRingClick(event) {
        const targetId = pointAtExpenses(event);
        if (targetId && targetId !== EXP_REST) {
            onExpensesRowClick(targetId);
        }
    }

    function countUpNumber(el, start, end, duration, formatFn, delay = 0) {
        if (!el) return;
        const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (isReduced) {
            el.textContent = formatFn(end);
            return;
        }
        setTimeout(() => {
            const startT = performance.now();
            function step(now) {
                const p = Math.min(1, (now - startT) / duration);
                const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
                el.textContent = formatFn(start + (end - start) * ease);
                if (p < 1) requestAnimationFrame(step);
                else el.textContent = formatFn(end);
            }
            requestAnimationFrame(step);
        }, delay);
    }

    function setExpensesPeriod(newPeriod) {
        if (expensesChartState.period === newPeriod) return;
        const fromDonut = expensesChartState.donut;
        expensesChartState.period = newPeriod;
        expensesChartState.preview = null;
        expensesChartState.pinned = null;

        const period = expensesPeriods.find(p => p.value === newPeriod) || expensesPeriods[0];
        const toDonut = layoutDonutExp(expensesCategories.map(c => period.values[c.id] || 0), period.budget);
        expensesChartState.donut = toDonut;

        document.querySelectorAll('[data-slot="exp-period-btn"]').forEach(btn => {
            const val = btn.getAttribute('data-period');
            if (val === newPeriod) {
                btn.className = "px-3 py-1 text-xs font-semibold rounded-full bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs transition-all";
            } else {
                btn.className = "px-3 py-1 text-xs font-medium rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all";
            }
        });

        const ringSvg = document.getElementById('expenses-ring-svg');
        if (ringSvg && fromDonut) {
            const startT = performance.now();
            const duration = 800;
            function morphStep(now) {
                const p = Math.min(1, (now - startT) / duration);
                const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
                const cur = lerpExpensesDonut(fromDonut, toDonut, ease);
                drawExpensesDonut(ringSvg, cur);
                if (p < 1) requestAnimationFrame(morphStep);
                else drawExpensesDonut(ringSvg, toDonut);
            }
            requestAnimationFrame(morphStep);
        }

        const totalEl = document.getElementById('expenses-total-val');
        if (totalEl) {
            const prevTotal = fromDonut ? fromDonut.total : 0;
            countUpNumber(totalEl, prevTotal, toDonut.total, 800, (v) => formatRoomCount(v));
        }

        const badgeText = document.getElementById('expenses-change-val');
        const changeLbl = document.getElementById('expenses-change-label');
        const previous = period.previous;
        const change = previous !== undefined && previous > 0 ? ((toDonut.total - previous) / previous) * 100 : 0;
        if (badgeText) {
            countUpNumber(badgeText, 0, Math.abs(change), 800, (v) => (change >= 0 ? '+' : '-') + v.toFixed(2) + '%');
        }
        if (changeLbl) changeLbl.textContent = period.changeLabel || '';

        expensesCategories.forEach(c => {
            const valEl = document.getElementById(`exp-val-${c.id}`);
            if (valEl) {
                const oldVal = parseFloat(valEl.getAttribute('data-val')) || 0;
                const newVal = period.values[c.id] || 0;
                valEl.setAttribute('data-val', newVal);
                countUpNumber(valEl, oldVal, newVal, 800, (v) => formatRoomCount(v));
            }
        });

        updateExpensesVisualState();
    }

    function renderSegmentSvg(c, i, color, arc) {
        const shapes = segmentShapesExp(arc);
        const col = expColors[color] || expColors.orange;
        return `
            <g data-pop="${i}" class="transition-opacity duration-200">
                <g data-arc="${i}">
                    <path data-shape="rim" d="${shapes.rim}" fill="${col.rim}" />
                    <path data-shape="fill" d="${shapes.fill}" fill="${col.fill}" />
                    <g clip-path="url(#exp-segment-${i})">
                        <path data-shape="light" d="${shapes.light}" fill-rule="evenodd" fill="#ffffff" fill-opacity="0.32" filter="url(#exp-light)" />
                    </g>
                </g>
            </g>
        `;
    }

    // =========================================================================
    // ENTRANCE ANIMATIONS CHOREOGRAPHY (Ported 100% from Mebius Design Anime.js)
    // =========================================================================
    function initDashboardEntranceAnimations() {
        const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function countUp(el, start, end, duration, formatFn, delay = 0) {
            if (!el) return;
            if (isReduced) {
                el.textContent = formatFn(end);
                return;
            }
            setTimeout(() => {
                const startT = performance.now();
                function step(now) {
                    const p = Math.min(1, (now - startT) / duration);
                    const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
                    el.textContent = formatFn(start + (end - start) * ease);
                    if (p < 1) requestAnimationFrame(step);
                    else el.textContent = formatFn(end);
                }
                requestAnimationFrame(step);
            }, delay);
        }

        // 1. CARD 1: Doanh thu lũy kế
        // Đặt lại tooltip/điểm đang chọn theo bề rộng thực của khung vẽ để không tràn ra ngoài card.
        if (cashFlowChartState && cashFlowChartState.current.length) {
            updateCashFlowActivePoint(Math.max(0, cashFlowChartState.current.length - 1));
        }

        // Khung vẽ co giãn theo layout (sidebar, breakpoint) nên căn lại tooltip khi kích thước đổi.
        const cfPlotEl = document.getElementById('cf-plot-container');
        if (cfPlotEl) {
            if (window._cfPlotObserver) window._cfPlotObserver.disconnect();
            window._cfPlotObserver = new ResizeObserver(() => {
                if (!cashFlowChartState || !cashFlowChartState.current.length) return;
                const idx = Number.isInteger(cashFlowChartState.activeIndex)
                    ? cashFlowChartState.activeIndex
                    : cashFlowChartState.current.length - 1;
                updateCashFlowActivePoint(idx);
            });
            window._cfPlotObserver.observe(cfPlotEl);
        }

        const cfTotal = document.getElementById('cf-kpi-total');
        if (cfTotal) {
            const target = parseFloat(cfTotal.getAttribute('data-target')) || 0;
            countUp(cfTotal, 0, target, 1200, (v) => formatVND(v), 100);
        }

        const cfChange = document.getElementById('cf-kpi-change');
        if (cfChange) {
            const target = parseFloat(cfChange.getAttribute('data-target')) || 0;
            countUp(cfChange, 0, target, 1200, (v) => formatVND(v), 100);
        }

        // 2. CARD 2: Revenue By Product Line Entrance (Anime.js Timeline)
        const studentPlotEl = document.getElementById('student-plot-container');
        if (studentPlotEl) {
            if (window._studentPlotObserver) {
                window._studentPlotObserver.disconnect();
            }
            window._studentPlotObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const w = Math.round(entry.contentRect.width);
                    if (w > 0 && (!studentChartState || Math.abs(studentChartState.width - w) > 1)) {
                        applyStudentChartLayout(w);
                    }
                }
            });
            window._studentPlotObserver.observe(studentPlotEl);

            if (studentPlotEl.clientWidth > 0) {
                applyStudentChartLayout(studentPlotEl.clientWidth);
            }
        }

        // Legend dots pop
        document.querySelectorAll('[data-slot="legend-dot-wrapper"]').forEach((dot, idx) => {
            if (isReduced) return;
            dot.style.transform = 'scale(0.4)';
            dot.style.opacity = '0';
            dot.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease-out';
            setTimeout(() => {
                dot.style.transform = 'scale(1)';
                dot.style.opacity = '1';
            }, idx * 90);
        });

        // Grid lines draw in from left
        document.querySelectorAll('[data-slot="student-grid-line"]').forEach((line, idx) => {
            if (isReduced) return;
            const w = parseFloat(line.getAttribute('x2')) || 560;
            line.style.strokeDasharray = `${w}`;
            line.style.strokeDashoffset = `${w}`;
            line.style.transition = `stroke-dashoffset 900ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${100 + (5 - idx) * 45}ms`;
            setTimeout(() => {
                line.style.strokeDashoffset = '0';
            }, 50);
        });

        // Dividers grow up
        document.querySelectorAll('[data-slot="student-divider"]').forEach((div, idx) => {
            if (isReduced) return;
            const h = (studentChartState && studentChartState.height) ? studentChartState.height : 160;
            div.style.strokeDasharray = `${h}`;
            div.style.strokeDashoffset = `${h}`;
            div.style.transition = `stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1) ${100 + idx * 80}ms`;
            setTimeout(() => {
                div.style.strokeDashoffset = '0';
            }, 50);
        });

        // Y-axis ticks slide in
        document.querySelectorAll('[data-slot="student-tick"]').forEach((tick, idx) => {
            if (isReduced) return;
            tick.style.opacity = '0';
            tick.style.transform = 'translateX(-4px)';
            tick.style.transition = `opacity 600ms ease-out ${200 + idx * 45}ms, transform 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${200 + idx * 45}ms`;
            setTimeout(() => {
                tick.style.opacity = '1';
                tick.style.transform = 'translateX(0)';
            }, 50);
        });

        // Axis labels slide up
        document.querySelectorAll('[data-slot="revenue-by-product-line-chart-axis-label"] > span').forEach((lbl, idx) => {
            if (isReduced) return;
            lbl.style.opacity = '0';
            lbl.style.transform = 'translateY(4px)';
            lbl.style.transition = `opacity 600ms ease-out ${300 + idx * 90}ms, transform 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${300 + idx * 90}ms`;
            setTimeout(() => {
                lbl.style.opacity = '1';
                lbl.style.transform = 'translateY(0)';
            }, 50);
        });

        // Bars growth + numbers count up (Staggered by line & bar position)
        const BARS_AT = 250;
        const LINE_STAGGER = 90;
        const BAR_STAGGER = 60;
        const GROW = 1100;

        document.querySelectorAll('[data-slot="revenue-by-product-line-chart-bar"]').forEach(bar => {
            const line = Number(bar.getAttribute('data-line')) || 0;
            const pos = Number(bar.getAttribute('data-position')) || 0;
            const targetH = parseFloat(bar.getAttribute('data-target-height')) || 0;
            const at = BARS_AT + line * LINE_STAGGER + pos * BAR_STAGGER;

            const valEl = bar.parentElement ? bar.parentElement.querySelector('[data-slot="revenue-by-product-line-chart-value"]') : null;
            const targetVal = valEl ? (parseFloat(valEl.getAttribute('data-target')) || 0) : 0;

            if (isReduced) {
                bar.style.height = `${targetH}px`;
                if (valEl) {
                    valEl.style.opacity = '1';
                    valEl.textContent = `${Math.round(targetVal)}`;
                }
                return;
            }

            bar.style.height = '0px';
            setTimeout(() => {
                bar.style.transition = `height ${GROW}ms cubic-bezier(0.16, 1, 0.3, 1)`;
                bar.style.height = `${targetH}px`;
            }, at);

            if (valEl) {
                valEl.style.opacity = '0';
                valEl.textContent = '0';
                setTimeout(() => {
                    valEl.style.transition = 'opacity 400ms ease-out';
                    valEl.style.opacity = '1';
                }, at);
                countUp(valEl, 0, targetVal, GROW, (v) => `${Math.round(v)}`, at);
            }
        });

        // Footer note icon pop
        const noteIcon = document.querySelector('[data-slot="revenue-by-product-line-chart-note-icon"]');
        if (noteIcon && !isReduced) {
            noteIcon.style.opacity = '0';
            noteIcon.style.transform = 'scale(0.6)';
            noteIcon.style.transition = 'opacity 700ms ease-out 500ms, transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 500ms';
            setTimeout(() => {
                noteIcon.style.opacity = '1';
                noteIcon.style.transform = 'scale(1)';
            }, 50);
        }

        // Footer figure (44%) count up
        const figEl = document.getElementById('student-insight-figure');
        if (figEl) {
            const target = parseFloat(figEl.getAttribute('data-target')) || 44;
            countUp(figEl, 0, target, 1400, (v) => `${Math.round(v)}%`, 600);
        }

        // 3. CARD 3: Revenue Overview Gauge (Sweep Animation + Synchronized Dot Pops + Halo Loop)
        const roBand = document.getElementById('ro-band-path');
        const roLine = document.getElementById('ro-line-path');
        const roArcPaths = document.querySelectorAll('[data-slot="revenue-overview-chart-arc"]');
        const roBandFade = document.getElementById('ro-band-fade');
        const roArcFade = document.getElementById('ro-arc-fade');
        const roLineFade = document.getElementById('ro-line-fade');
        const roValueEl = document.getElementById('mebius-gauge-value');

        function drawRoMarks(m) {
            if (roBand) roBand.setAttribute("d", segmentPath(CX, CY, BAND_INNER, BAND_OUTER, 180, m.fill, CORNER));
            const arc = segmentPath(CX, CY, RING_INNER, RING_OUTER, Math.max(180, m.arc - ARC_SPAN), m.arc);
            roArcPaths.forEach(p => p.setAttribute("d", arc));
            if (roLine) roLine.setAttribute("d", linePath(m.line));
            if (roBandFade) roBandFade.setAttribute("gradientTransform", `rotate(${roundG(m.fill - FIGMA_TODAY - FILL_PAST)} ${CX} ${CY})`);
            if (roArcFade) roArcFade.setAttribute("gradientTransform", `rotate(${roundG(m.arc - FIGMA_TODAY - ARC_PAST)} ${CX} ${CY})`);
            if (roLineFade) roLineFade.setAttribute("gradientTransform", lineFade(m.line));
        }

        function placeRoPoints(pointAngles, lineEnd) {
            document.querySelectorAll('[data-slot="revenue-overview-chart-point"]').forEach((el, i) => {
                const deg = pointAngles[i];
                if (deg === undefined) return;
                el.setAttribute("transform", `translate(${atG(CX, LINE_CY, LINE_RADIUS, deg)})`);
                el.setAttribute("visibility", deg <= lineEnd + 0.01 || i === pointAngles.length - 1 ? "visible" : "hidden");
            });
        }

        function startRoTodayPulse() {
            const halo = document.getElementById('ro-today-halo');
            if (!halo) return;
            const startT = performance.now();
            function loop(now) {
                const elapsed = (now - startT) % 3200;
                if (elapsed <= 1800) {
                    const p = elapsed / 1800;
                    const ease = 1 - (1 - p) * (1 - p);
                    halo.style.transform = `scale(${roundG(1 + 0.9 * ease)})`;
                    halo.style.opacity = `${roundG(0.35 * (1 - ease))}`;
                } else {
                    halo.style.opacity = '0';
                }
                requestAnimationFrame(loop);
            }
            requestAnimationFrame(loop);
        }

        if (revenueOverviewChartState) {
            const { todayAngle, targetVal, angles } = revenueOverviewChartState;

            if (isReduced) {
                const finalM = marksAt(todayAngle, 1);
                drawRoMarks(finalM);
                placeRoPoints(angles, finalM.line);
                if (roValueEl) roValueEl.textContent = '$' + targetVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                drawRoMarks(marksAt(todayAngle, 0));
                placeRoPoints(angles, 180);

                // Track fade in 700ms
                document.querySelectorAll('[data-slot="revenue-overview-chart-track"]').forEach(t => {
                    t.style.opacity = '0';
                    t.style.transition = 'opacity 700ms ease-out';
                    setTimeout(() => { t.style.opacity = '1'; }, 50);
                });

                // Pill pop at 100ms
                const pill = document.querySelector('[data-slot="revenue-overview-chart-pill"]');
                if (pill) {
                    pill.style.opacity = '0';
                    pill.style.transform = 'scale(0.8)';
                    pill.style.transition = 'opacity 600ms ease-out, transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)';
                    setTimeout(() => { pill.style.opacity = '1'; pill.style.transform = 'scale(1)'; }, 100);
                }

                // SWEEP 1500ms at SWEEP_AT = 200ms
                const SWEEP = 1500;
                const SWEEP_AT = 200;
                const easeCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

                const dots = document.querySelectorAll('[data-slot="revenue-overview-chart-dot"]');
                dots.forEach(d => {
                    d.style.transform = 'scale(0)';
                    d.style.opacity = '0';
                });

                const lineEnd = todayAngle + LINE_PAST;
                dots.forEach((dot, i) => {
                    const last = i === dots.length - 1;
                    const goal = ((angles[i] ?? 180) - 180) / Math.max(0.001, lineEnd - 180);
                    let lo = 0, hi = 1;
                    for (let k = 0; k < 20; k++) {
                        const mid = (lo + hi) / 2;
                        if (easeCubic(mid) < goal) lo = mid;
                        else hi = mid;
                    }
                    const when = SWEEP_AT + (last ? SWEEP - 150 : hi * SWEEP);
                    setTimeout(() => {
                        dot.style.transition = `transform ${last ? 700 : 500}ms ${last ? 'cubic-bezier(0.34, 1.8, 0.64, 1)' : 'cubic-bezier(0.34, 1.56, 0.64, 1)'}, opacity 400ms ease-out`;
                        dot.style.transform = 'scale(1)';
                        dot.style.opacity = '1';
                    }, when);
                });

                setTimeout(() => {
                    const sweepStart = performance.now();
                    function sweepFrame(now) {
                        const p = Math.min(1, (now - sweepStart) / SWEEP);
                        const eased = easeCubic(p);
                        const m = marksAt(todayAngle, eased);
                        drawRoMarks(m);
                        placeRoPoints(angles, m.line);
                        if (roValueEl) {
                            const cur = targetVal * eased;
                            roValueEl.textContent = '$' + cur.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                        if (p < 1) {
                            requestAnimationFrame(sweepFrame);
                        } else {
                            const finalM = marksAt(todayAngle, 1);
                            drawRoMarks(finalM);
                            placeRoPoints(angles, finalM.line);
                            if (roValueEl) roValueEl.textContent = '$' + targetVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            startRoTodayPulse();
                        }
                    }
                    requestAnimationFrame(sweepFrame);
                }, SWEEP_AT);

                // Change slide up at SWEEP_AT + SWEEP - 500 = 1200ms
                const changeEl = document.querySelector('[data-slot="revenue-overview-chart-change"]');
                if (changeEl) {
                    changeEl.style.opacity = '0';
                    changeEl.style.transform = 'translateY(4px)';
                    changeEl.style.transition = 'opacity 600ms ease-out, transform 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    setTimeout(() => { changeEl.style.opacity = '1'; changeEl.style.transform = 'translateY(0)'; }, 1200);
                }

                // Insight footer slide up at SWEEP_AT + SWEEP - 350 = 1350ms
                const insightBox = document.querySelector('[data-slot="revenue-overview-chart-insight"]');
                if (insightBox) {
                    insightBox.style.opacity = '0';
                    insightBox.style.transform = 'translateY(10px)';
                    insightBox.style.transition = 'opacity 700ms ease-out, transform 700ms cubic-bezier(0.16, 1, 0.3, 1)';
                    setTimeout(() => { insightBox.style.opacity = '1'; insightBox.style.transform = 'translateY(0)'; }, 1350);
                }

                // Insight icon rotate at SWEEP_AT + SWEEP - 200 = 1500ms
                const insightIcon = document.querySelector('[data-slot="revenue-overview-chart-insight-icon"]');
                if (insightIcon) {
                    insightIcon.style.transform = 'scale(0) rotate(-90deg)';
                    insightIcon.style.transition = 'transform 800ms cubic-bezier(0.34, 1.8, 0.64, 1)';
                    setTimeout(() => { insightIcon.style.transform = 'scale(1) rotate(0deg)'; }, 1500);
                }
            }
        }

        // 3b. CARD 3: Quét biểu đồ nửa hình tròn theo tỷ lệ phòng đã thuê
        const roomBand = document.getElementById('room-occupancy-band');
        const roomArc = document.getElementById('room-occupancy-arc');
        const roomPercentEl = document.getElementById('room-occupancy-percent');
        if (roomBand && roomArc) {
            const percent = Number(roomPercentEl?.getAttribute('data-target')) || 0;
            const targetAngle = 180 + 180 * Math.min(1, Math.max(0, percent / 100));
            const drawRoomGauge = (angle) => {
                roomBand.setAttribute('d', segmentPath(CX, CY, BAND_INNER, BAND_OUTER, 180, angle, CORNER));
                roomArc.setAttribute('d', segmentPath(CX, CY, RING_INNER, RING_OUTER, 180, angle));
            };

            if (isReduced) {
                drawRoomGauge(targetAngle);
            } else {
                drawRoomGauge(180);
                const startT = performance.now();
                const duration = 1200;
                function roomStep(now) {
                    const p = Math.min(1, (now - startT) / duration);
                    const ease = 1 - Math.pow(1 - p, 3);
                    drawRoomGauge(180 + (targetAngle - 180) * ease);
                    if (p < 1) requestAnimationFrame(roomStep);
                    else drawRoomGauge(targetAngle);
                }
                requestAnimationFrame(roomStep);
            }

            const percentText = roomPercentEl?.querySelector('span');
            if (percentText) countUp(percentText, 0, percent, 1200, (v) => `${v.toFixed(1)}%`, 120);
        }

        // 4. CARD 4: Expenses Chart Entrance (Anime.js Timeline 100% Mebius)
        const expTotalEl = document.getElementById('expenses-total-val');
        if (expTotalEl && expensesChartState.donut) {
            countUp(expTotalEl, 0, expensesChartState.donut.total, 1400, (v) => formatRoomCount(v), 100);
        }

        const expBadge = document.getElementById('expenses-change-badge');
        if (expBadge) {
            if (isReduced) {
                expBadge.style.opacity = '1';
                expBadge.style.transform = 'scale(1)';
            } else {
                expBadge.style.opacity = '0';
                expBadge.style.transform = 'scale(0.6)';
                expBadge.style.transition = 'opacity 600ms ease-out, transform 600ms cubic-bezier(0.34, 2, 0.64, 1)';
                setTimeout(() => {
                    expBadge.style.opacity = '1';
                    expBadge.style.transform = 'scale(1)';
                }, 500);
            }
        }

        const expChangeLbl = document.getElementById('expenses-change-label');
        if (expChangeLbl) {
            if (isReduced) {
                expChangeLbl.style.opacity = '1';
                expChangeLbl.style.transform = 'translateX(0)';
            } else {
                expChangeLbl.style.opacity = '0';
                expChangeLbl.style.transform = 'translateX(-4px)';
                expChangeLbl.style.transition = 'opacity 500ms ease-out, transform 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                setTimeout(() => {
                    expChangeLbl.style.opacity = '1';
                    expChangeLbl.style.transform = 'translateX(0)';
                }, 600);
            }
        }

        document.querySelectorAll('[data-slot="expenses-chart-category"]').forEach((row, idx) => {
            if (isReduced) {
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            } else {
                row.style.opacity = '0';
                row.style.transform = 'translateY(10px)';
                row.style.transition = `opacity 800ms ease-out ${350 + idx * 90}ms, transform 800ms cubic-bezier(0.16, 1, 0.3, 1) ${350 + idx * 90}ms`;
                setTimeout(() => {
                    row.style.opacity = '1';
                    row.style.transform = 'translateY(0)';
                }, 50);
            }
        });

        const expRingSvg = document.getElementById('expenses-ring-svg');
        if (expRingSvg && expensesChartState.donut) {
            const finalDonut = expensesChartState.donut;
            if (isReduced) {
                drawExpensesDonut(expRingSvg, finalDonut);
            } else {
                drawExpensesDonut(expRingSvg, sweptExpensesDonut(finalDonut, 0));

                // Core glows fade in staggered
                document.querySelectorAll('[data-slot="expenses-chart-core"]').forEach((glow, idx) => {
                    glow.style.opacity = '0';
                    glow.style.transition = `opacity 700ms ease-out ${250 + 1300 * 0.45 + idx * 140}ms`;
                    setTimeout(() => { glow.style.opacity = '1'; }, 50);
                });

                // Hatch bars fade in staggered clockwise
                const rest = finalDonut.rest;
                const span = Math.max(1, 360 - rest);
                document.querySelectorAll('[data-slot="expenses-chart-bar"]').forEach(bar => {
                    const end = parseFloat(bar.getAttribute('data-end')) || 0;
                    const delay = (Math.max(0, end - rest) / span) * 600;
                    bar.style.opacity = '0';
                    bar.style.transition = `opacity 350ms ease-out ${250 + 1300 * 0.55 + delay}ms`;
                    setTimeout(() => { bar.style.opacity = '1'; }, 50);
                });

                // Outline lines fade in
                document.querySelectorAll('[data-slot="expenses-chart-outline"]').forEach(line => {
                    line.style.opacity = '0';
                    line.style.transition = `opacity 600ms ease-out ${250 + 1300 * 0.5}ms`;
                    setTimeout(() => { line.style.opacity = '1'; }, 50);
                });

                // Sweep animation: SWEEP_AT = 250ms, duration = 1300ms (inOutCubic)
                setTimeout(() => {
                    const startT = performance.now();
                    const duration = 1300;
                    function sweepStep(now) {
                        const p = Math.min(1, (now - startT) / duration);
                        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
                        drawExpensesDonut(expRingSvg, sweptExpensesDonut(finalDonut, ease * 360));
                        if (p < 1) requestAnimationFrame(sweepStep);
                        else drawExpensesDonut(expRingSvg, finalDonut);
                    }
                    requestAnimationFrame(sweepStep);
                }, 250);
            }
        }
    }

    // 1. Dashboard View Renderer (Mebius Design System - Pixel Perfect)
    function renderDashboardView() {
        const d = state.dashboardSummary || {
            totalStudents: 0,
            totalCapacity: 0,
            occupancyPercent: 0,
            totalFeeRevenue: 0,
            debtAmount: 0,
            collectedPercent: 0,
            pendingApplicationsCount: 0,
            totalApplicationsCount: 0,
            approvedApplicationsCount: 0,
            applicationsApprovalRate: 0,
            repairRequestsCount: 0,
            revenueGrowthPercent: 0,
            zoneOccupancies: [],
            urgentTasks: [],
            cohortGenderStats: [],
            monthlyRevenueStats: [],
            repairCategoryStats: [],
            cashFlowData: [],
            cashFlowCompare: [],
            cashFlowTicks: []
        };

        // ========================================================
        // 1. BIỂU ĐỒ MIỀN: DOANH THU LŨY KẾ NĂM NAY / CÙNG KỲ NĂM TRƯỚC
        // ========================================================
        const revenueByMonth = Array.isArray(d.monthlyRevenueStats) ? d.monthlyRevenueStats : [];
        const cashFlowData = revenueByMonth.map(item => ({
            date: `${item.year}-${String(item.month).padStart(2, '0')}-01`,
            value: Number(item.revenue) || 0
        }));
        const cashFlowCompare = revenueByMonth.map(item => Number(item.previousYearRevenue) || 0);
        const currentYearRevenue = cashFlowData.length ? cashFlowData[cashFlowData.length - 1].value : 0;
        const previousYearRevenue = cashFlowCompare.length ? cashFlowCompare[cashFlowCompare.length - 1] : 0;
        const revenueDiff = currentYearRevenue - previousYearRevenue;
        const cashFlowTicks = buildRevenueTicks(Math.max(currentYearRevenue, previousYearRevenue));

        const chartLayout = layoutCashFlowChart(cashFlowData, cashFlowCompare, cashFlowTicks, CF_PLOT_WIDTH);
        cashFlowChartState = chartLayout;

        const currentPath = buildPolylinePath(chartLayout.current);
        const previousPath = buildPolylinePath(chartLayout.previous);
        const areaFillPath = buildAreaPolylinePath(chartLayout.current, CF_PLOT_HEIGHT);

        const defaultActiveIdx = Math.max(0, chartLayout.current.length - 1);
        const activePoint = chartLayout.current[defaultActiveIdx] || { x: CF_PLOT_WIDTH / 2, y: CF_PLOT_HEIGHT - 1, value: 0, date: '' };
        const defaultComparePoint = chartLayout.previous[defaultActiveIdx];
        const defaultCompareY = defaultComparePoint ? defaultComparePoint.y : valueAtPolyline(chartLayout.previous, activePoint.x);
        const defaultCompareValue = defaultComparePoint ? defaultComparePoint.value : 0;
        const monthLabelOf = (iso) => {
            const dt = new Date(`${iso}T00:00:00Z`);
            return MONTH_LABELS[dt.getUTCMonth()] || '';
        };
        const activeMonthLabel = activePoint.date ? monthLabelOf(activePoint.date) : '';
        const firstMonthLabel = cashFlowData.length ? monthLabelOf(cashFlowData[0].date) : '';
        const lastMonthLabel = cashFlowData.length ? monthLabelOf(cashFlowData[cashFlowData.length - 1].date) : '';

        // ========================================================
        // 2. BIỂU ĐỒ CỘT: SỐ SINH VIÊN THEO KHÓA VÀ GIỚI TÍNH
        // ========================================================
        const existingStudentPlot = document.getElementById('student-plot-container');
        const studentWidth = (existingStudentPlot && existingStudentPlot.clientWidth > 0) ? existingStudentPlot.clientWidth : 560;
        const studentPlotHeight = 150;

        const cohortStats = Array.isArray(d.cohortGenderStats) ? d.cohortGenderStats : [];
        const studentGroups = cohortStats.map(item => ({
            label: item.cohortName || (item.year ? `Khóa ${item.year}` : 'Khóa'),
            values: {
                male: Number(item.maleCount) || 0,
                female: Number(item.femaleCount) || 0
            }
        }));

        const maxStudentCount = studentGroups.reduce((max, group) => Math.max(max, group.values.male, group.values.female), 0);
        const studentTicks = buildCountTicks(maxStudentCount);
        const studentBase = studentPlotHeight - 1; // 149
        const studentSpan = 142;
        const studentLo = studentTicks[0];
        const studentHi = studentTicks[studentTicks.length - 1];
        const studentLevel = (val) => studentHi > studentLo
            ? studentBase - Math.round(((Math.min(Math.max(val, studentLo), studentHi) - studentLo) / (studentHi - studentLo)) * studentSpan)
            : studentBase;

        const studentSeries = [
            { id: "male", label: "Nam" },
            { id: "female", label: "Nữ" }
        ];

        const studentLayout = layoutStudentChart(studentGroups, studentSeries, [], studentTicks, studentWidth);

        studentChartState = {
            width: studentLayout.width,
            height: studentPlotHeight,
            data: studentGroups,
            series: studentSeries,
            ticks: studentTicks,
            groups: studentLayout.groups,
            columns: studentLayout.columns,
            dividers: studentLayout.dividers,
            barWidth: studentLayout.barWidth,
            hiddenSeries: [],
            selectedIndex: studentGroups.length ? 0 : null,
            isHovering: false
        };

        const defaultActiveGroup = studentLayout.groups[0] || {
            label: '',
            values: { male: 0, female: 0 },
            left: 0,
            right: 0,
            top: studentPlotHeight
        };
        const studentTipLeft = Math.round(defaultActiveGroup.right + 8);
        const studentTipTop = Math.round(defaultActiveGroup.top + 6);

        const studentGroupBarsHtml = studentLayout.groups.map((g, i) => {
            return g.bars.map((bar, j) => {
                const isSolid = bar.id === 'male';
                const toneFill = isSolid
                    ? 'from-[#60a5fa] via-[#0562ef] to-[#0047cc]'
                    : 'from-[#e0edff] via-[#bfdbfe] to-[#93c5fd]';
                const toneShadow = isSolid
                    ? 'shadow-[0_6.171px_11.1px_-3.085px_rgba(38,45,58,0.2),0_0_0_1px_#0562ef]'
                    : 'shadow-[0_6.171px_11.1px_-3.085px_rgba(38,45,58,0.1),0_0_0_1px_#bfdbfe]';
                const toneValue = isSolid
                    ? 'font-bold text-[#0562ef] dark:text-[#3179ff]'
                    : 'font-semibold text-[#60a5fa]';
                const animDelayClass = `mebius-bar-delay-${i * 2 + j}`;

                return `
                    <div
                        data-slot="revenue-by-product-line-chart-column"
                        data-group-idx="${i}"
                        data-series-id="${bar.id}"
                        class="absolute bottom-px flex flex-col items-center transition-opacity duration-300 pointer-events-none"
                        style="left: ${bar.x}px; width: ${studentLayout.barWidth}px; gap: 4px;"
                    >
                        <span
                            data-slot="revenue-by-product-line-chart-value"
                            data-target="${bar.value}"
                            class="${toneValue} whitespace-nowrap text-[11px] font-sans font-medium transition-opacity duration-300"
                        >
                            ${Math.round(bar.value)}
                        </span>
                        <span
                            data-slot="revenue-by-product-line-chart-bar"
                            data-line="${i}"
                            data-position="${j}"
                            data-target-height="${bar.height}"
                            class="relative w-full shrink-0 rounded-t-xl rounded-b-[2px] bg-gradient-to-b ${toneFill} ${toneShadow} transition-all duration-300"
                            style="height: ${bar.height}px;"
                        >
                            <span class="absolute inset-0 rounded-[inherit] pointer-events-none shadow-[inset_0_0_24px_rgba(255,255,255,0.45)]"></span>
                            <span class="absolute inset-0 rounded-[inherit] pointer-events-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] [mask-image:linear-gradient(to_bottom,#000,transparent)]"></span>
                        </span>
                    </div>
                `;
            }).join('');
        }).join('');

        const studentColumnsOverlayHtml = studentLayout.columns.map((col, i) => `
            <button
                type="button"
                data-slot="revenue-by-product-line-chart-line"
                data-index="${i}"
                aria-label="${studentLayout.groups[i].label}"
                onpointerenter="KtxApp.onStudentGroupHover(${i})"
                onpointermove="KtxApp.onStudentGroupHover(${i})"
                onclick="KtxApp.onStudentGroupClick(${i})"
                class="group/line absolute inset-y-0 cursor-pointer outline-none"
                style="left: ${col.left}px; width: ${col.width}px;"
            >
                <span
                    aria-hidden="true"
                    class="pointer-events-none absolute rounded-2xl opacity-0 ring-2 ring-blue-500/40 transition-opacity duration-150 group-focus-visible/line:opacity-100"
                    style="left: ${studentLayout.groups[i].left - col.left - 6}px; width: ${studentLayout.groups[i].right - studentLayout.groups[i].left + 12}px; top: ${Math.max(0, studentLayout.groups[i].top - 24)}px; bottom: 0px;"
                ></span>
            </button>
        `).join('');

        // ========================================================
        // 3. BIỂU ĐỒ NỬA HÌNH TRÒN: TỶ LỆ PHÒNG ĐÃ ĐƯỢC THUÊ
        // ========================================================
        const occupiedRooms = Number(d.occupiedRooms) || 0;
        const totalRooms = Number(d.totalRooms) || 0;
        const roomOccupancyPercent = Number(d.roomOccupancyPercent) || 0;
        const roomAngle = 180 + 180 * Math.min(1, Math.max(0, roomOccupancyPercent / 100));
        const roomOccupancyPath = segmentPath(CX, CY, BAND_INNER, BAND_OUTER, 180, roomAngle, CORNER);
        const roomOccupancyArcPath = segmentPath(CX, CY, RING_INNER, RING_OUTER, 180, roomAngle);
        // Không dùng dữ liệu mẫu của biểu đồ doanh thu cũ.
        revenueOverviewChartState = null;

        // ========================================================
        // 4. BIỂU ĐỒ VÒNG: SỐ PHÒNG THEO LOẠI DỊCH VỤ
        // ========================================================
        const roomTypeStats = Array.isArray(d.roomTypeStats) ? d.roomTypeStats : [];
        const roomTypeTotal = roomTypeStats.reduce((sum, item) => sum + (Number(item.roomCount) || 0), 0);
        const roomTypeColors = ['blue', 'green', 'yellow', 'orange', 'purple'];
        expensesCategories = roomTypeStats.map((item, index) => ({
            id: `room-type-${index}`,
            label: item.name || 'Chưa phân loại',
            color: roomTypeColors[index % roomTypeColors.length],
            occupiedCount: Number(item.occupiedCount) || 0
        }));
        expensesPeriods = [{
            value: 'all',
            label: 'Tất cả',
            values: expensesCategories.reduce((acc, cat, index) => {
                acc[cat.id] = Number(roomTypeStats[index].roomCount) || 0;
                return acc;
            }, {}),
            budget: roomTypeTotal,
            previous: 0,
            changeLabel: ''
        }];
        expensesChartState = { period: 'all', pinned: null, preview: null, donut: null };

        const initialExpPeriod = expensesPeriods[0];
        const initialDonut = layoutDonutExp(
            expensesCategories.map(c => initialExpPeriod.values[c.id] || 0),
            initialExpPeriod.budget
        );
        expensesChartState.donut = initialDonut;

        const initialRestShape = restShapesExp(initialDonut.rest);
        const expOrder = expensesCategories.map((c, i) => ({ c, i, color: c.color || 'orange' }));
        const coredCats = expOrder.filter(o => expColors[o.color] && expColors[o.color].glow);
        const flatCats = expOrder.filter(o => !expColors[o.color] || !expColors[o.color].glow);


        return `
            <div class="flex flex-col w-full space-y-4">
                <!-- 1. Hero Welcome Banner (Giữ nguyên y chang bản gốc của người dùng) -->
                <section class="page-title-banner relative overflow-hidden" aria-label="Tổng quan hệ thống ký túc xá">
                    <div class="dashboard-title-content relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-white font-headline">Tổng quan KTX</h1>
                            <p class="text-blue-100 text-sm mt-0.5">Hệ thống quản lý thời gian thực Ký túc xá Phân hiệu UTC2 TP.HCM</p>
                        </div>
                        <div class="page-title-actions flex items-center gap-2.5 shrink-0 flex-wrap">
                            ${canAccessMenu('hop-dong') ? `
                            <button type="button" onclick="KtxApp.openNewContractModal()" class="h-10 px-4 rounded-xl bg-white text-[#0b2a5b] font-semibold text-sm hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300">
                                <span class="material-symbols-outlined text-[20px] text-[#0b2a5b]">post_add</span>
                                <span>Lập hợp đồng mới</span>
                            </button>` : ''}
                            <button type="button" onclick="KtxApp.exportReport()" class="h-10 px-4 rounded-xl bg-white text-[#0b2a5b] font-semibold text-sm hover:bg-blue-50 transition-colors flex items-center gap-1.5 border border-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                                <span class="material-symbols-outlined text-[20px] text-[#0b2a5b]">ios_share</span>
                                <span>Báo cáo nhanh</span>
                            </button>
                        </div>
                    </div>
                </section>

                <!-- 2. Hệ thống Lưới 4 Khối Biểu đồ Mebius Design -->
                <section class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch" aria-label="Trung tâm dữ liệu và phân tích ký túc xá">
                    
                    <!-- ===================================================== -->
                    <!-- CARD 1: CASH FLOW (Chuẩn 100% Mã Nguồn React Mebius)  -->
                    <!-- ===================================================== -->
                    <article class="mebius-card p-4 sm:p-5 flex flex-col justify-between relative group/card">
                        <!-- Header -->
                        <div class="flex items-center justify-between gap-3 mb-1.5">
                            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                                <div class="flex items-center gap-1.5">
                                    <span class="flex shrink-0 text-[#0562ef] dark:text-[#3179ff]">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="7" y1="17" x2="17" y2="7"></line>
                                            <polyline points="7 7 17 7 17 17"></polyline>
                                        </svg>
                                    </span>
                                    <h2 class="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">Doanh thu lũy kế</h2>
                                </div>
                                <p class="text-[11px] text-slate-400 dark:text-slate-400 truncate">Tổng tiền thu được năm nay so với cùng kỳ năm trước</p>
                            </div>
                            ${canAccessMenu('hoa-don') ? `<button type="button" onclick="KtxApp.navigate('hoa-don')" class="size-7 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0" title="Tùy chọn">` : `<button type="button" onclick="KtxApp.navigate('bao-cao')" class="size-7 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0" title="Tùy chọn">`}
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                    <circle cx="3.5" cy="8" r="1.2" />
                                    <circle cx="8" cy="8" r="1.2" />
                                    <circle cx="12.5" cy="8" r="1.2" />
                                </svg>
                            </button>
                        </div>

                        <!-- 2 Cột KPI có vạch ngăn dọc (Chuẩn 100% React Mebius) -->
                        <div class="flex items-center gap-3 py-1 border-b border-slate-100 dark:border-slate-800/80 mb-1.5">
                            <div class="flex min-w-0 flex-1 flex-col items-center gap-0.5">
                                <p class="text-[11px] font-normal text-slate-400 dark:text-slate-400">Năm nay (${(String(state.selectedAcademicYear || "").match(/\d{4}/)?.[0]) || new Date().getFullYear()})</p>
                                <p id="cf-kpi-total" data-target="${currentYearRevenue}" class="text-[20px] sm:text-[22px] font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap tabular-nums">
                                    ${formatVND(currentYearRevenue)}
                                </p>
                            </div>
                            <span aria-hidden="true" class="h-[34px] w-px shrink-0 bg-slate-200 dark:bg-slate-700"></span>
                            <div class="flex min-w-0 flex-1 flex-col items-center gap-0.5">
                                <p class="text-[11px] font-normal text-slate-400 dark:text-slate-400">Cùng kỳ năm trước (${(Number(String(state.selectedAcademicYear || "").match(/\d{4}/)?.[0]) || new Date().getFullYear()) - 1})</p>
                                <p id="cf-kpi-change" data-target="${previousYearRevenue}" class="text-[20px] sm:text-[22px] font-bold text-slate-700 dark:text-slate-200 tracking-tight whitespace-nowrap tabular-nums">
                                    ${formatVND(previousYearRevenue)}
                                </p>
                            </div>
                        </div>

                        <!-- Khu vực Vẽ Biểu Đồ & Trục Tọa Độ -->
                        <div class="flex flex-col gap-1">
                            <div class="flex items-start gap-2.5">
                                <!-- Plot Area + X-Axis Container -->
                                <div class="flex-1 min-w-0 flex flex-col">
                                    <div id="cf-plot-container" class="relative min-w-0 w-full select-none" style="height: 150px;">
                                        <!-- Trục hoành đáy 1px -->
                                        <span class="absolute inset-x-0 bottom-0 h-px bg-slate-100 dark:bg-slate-800 pointer-events-none"></span>

                                        <!-- SVG Lưới & Đường Path -->
                                        <svg viewBox="0 0 ${CF_PLOT_WIDTH} ${CF_PLOT_HEIGHT}" class="pointer-events-none absolute inset-0 size-full overflow-visible" role="img" aria-label="Biểu đồ doanh thu lũy kế theo tháng">
                                            <defs>
                                                <linearGradient id="cfMebiusFillGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stop-color="#0562ef" stop-opacity="0.24" />
                                                    <stop offset="100%" stop-color="#0562ef" stop-opacity="0" />
                                                </linearGradient>
                                            </defs>

                                            <!-- 13 Đường Kẻ Dọc Nét Đứt 4/4 (Grid Lines) -->
                                            ${chartLayout.grid.map(gx => `
                                                <line x1="${gx.toFixed(1)}" x2="${gx.toFixed(1)}" y1="0" y2="${CF_PLOT_HEIGHT}" stroke="currentColor" class="text-slate-100 dark:text-slate-800" stroke-dasharray="4 4" stroke-width="1" />
                                            `).join('')}

                                            <!-- Đường Previous (Last month - Grey 1.4px) -->
                                            <path d="${previousPath}" fill="none" stroke="#cbd5e1" class="dark:stroke-slate-600" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />

                                            <!-- Dải Area Fill Gradient Xanh mờ dần -->
                                            <path d="${areaFillPath}" fill="url(#cfMebiusFillGrad)" class="chart-fade-anim" />

                                            <!-- Đường Current (Blue 1.5px) -->
                                            <path d="${currentPath}" fill="none" stroke="#0562ef" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="chart-line-anim" />

                                            <!-- Con trỏ Cursor Nét Đứt kèm 2 Chóp Tam Giác Đều 5px (Figma Caps) -->
                                            <g id="cf-cursor-group" class="pointer-events-none">
                                                <line x1="${activePoint.x.toFixed(1)}" x2="${activePoint.x.toFixed(1)}" y1="${CF_CAP - 0.5}" y2="${CF_PLOT_HEIGHT - CF_CAP + 0.5}" stroke="#0562ef" stroke-dasharray="4 4" stroke-width="1" />
                                                <polygon points="${(activePoint.x - CF_CAP_HALF).toFixed(1)},0 ${(activePoint.x + CF_CAP_HALF).toFixed(1)},0 ${(activePoint.x + 0.5).toFixed(1)},${CF_CAP} ${(activePoint.x - 0.5).toFixed(1)},${CF_CAP}" fill="#0562ef" />
                                                <polygon points="${(activePoint.x - CF_CAP_HALF).toFixed(1)},${CF_PLOT_HEIGHT} ${(activePoint.x + CF_CAP_HALF).toFixed(1)},${CF_PLOT_HEIGHT} ${(activePoint.x + 0.5).toFixed(1)},${CF_PLOT_HEIGHT - CF_CAP} ${(activePoint.x - 0.5).toFixed(1)},${CF_PLOT_HEIGHT - CF_CAP}" fill="#0562ef" />
                                            </g>
                                        </svg>

                                        ${cashFlowData.length === 0 ? `
                                            <div class="absolute inset-0 flex items-center justify-center text-[12px] text-slate-400">
                                                Chưa có dữ liệu doanh thu
                                            </div>
                                        ` : ''}

                                        <!-- Marker 1 (Current Blue Marker 12px viền Conic-gradient) -->
                                        <div id="cf-marker-current" class="pointer-events-none absolute transition-transform duration-75" style="left: calc(${(activePoint.x / CF_PLOT_WIDTH * 100).toFixed(2)}% - ${CF_MARKER / 2}px); top: ${(activePoint.y - CF_MARKER / 2).toFixed(1)}px; width: ${CF_MARKER}px; height: ${CF_MARKER}px;">
                                            <div class="flex size-full rounded-full p-0.5 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.12)] mebius-marker-ring">
                                                <div class="size-full rounded-full bg-[#0562ef]"></div>
                                            </div>
                                        </div>

                                        <!-- Marker 2 (Compare Grey Marker 12px) -->
                                        <div id="cf-marker-compare" class="pointer-events-none absolute transition-transform duration-75" style="left: calc(${(activePoint.x / CF_PLOT_WIDTH * 100).toFixed(2)}% - ${CF_MARKER / 2}px); top: ${(defaultCompareY - CF_MARKER / 2).toFixed(1)}px; width: ${CF_MARKER}px; height: ${CF_MARKER}px;">
                                            <div class="flex size-full rounded-full p-0.5 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.12)] mebius-marker-ring">
                                                <div class="size-full rounded-full bg-[#cbd5e1] dark:bg-slate-500"></div>
                                            </div>
                                        </div>

                                        <!-- Tương tác chuột Scrubber bao phủ toàn bộ đồ thị -->
                                        <div
                                            id="cf-scrubber"
                                            role="slider"
                                            tabindex="0"
                                            aria-label="Chọn tháng để xem doanh thu"
                                            onpointermove="KtxApp.onCashFlowPointerMove(event)"
                                            onpointerleave="KtxApp.onCashFlowPointerLeave()"
                                            class="absolute inset-0 cursor-pointer touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 z-20"
                                        ></div>

                                        <!-- TOOLTIP NỔI CHUẨN 100% SOURCE CODE MEBIUS -->
                                        <div
                                            id="cf-tooltip"
                                            class="pointer-events-none absolute flex flex-col items-start gap-1.5 overflow-hidden rounded-xl bg-white dark:bg-[#111827] px-3.5 py-2 whitespace-nowrap shadow-[0_12px_32px_-4px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.06)] z-30 transition-all duration-100"
                                            style="top: 54px; left: ${(activePoint.x + CF_TIP_GAP).toFixed(1)}px; opacity: 0;"
                                        >
                                            <div class="flex items-center gap-1.5">
                                                <span class="h-4 w-1 bg-[#0562ef] rounded-xs shrink-0"></span>
                                                <span class="text-[12px] font-bold text-slate-900 dark:text-white tabular-nums font-sans">${formatVND(activePoint.value)}</span>
                                                <span class="text-[10px] text-slate-400 font-sans">${activeMonthLabel ? `Tháng ${activePoint.date ? Number(activePoint.date.slice(5, 7)) : ''}` : ''}</span>
                                            </div>
                                            <div class="flex items-center gap-1.5">
                                                <span class="h-4 w-1 bg-slate-300 dark:bg-slate-600 rounded-xs shrink-0"></span>
                                                <span class="text-[11px] font-medium text-slate-600 dark:text-slate-300 tabular-nums font-sans">${formatVND(defaultCompareValue)}</span>
                                                <span class="text-[10px] text-slate-400 font-sans">Cùng kỳ năm trước</span>
                                            </div>
                                            <div class="w-full border-t border-slate-100 dark:border-slate-800 border-dashed my-0.5"></div>
                                            <div class="flex items-center gap-1 ${activePoint.value >= defaultCompareValue ? 'text-emerald-500' : 'text-red-500'}">
                                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true">
                                                    <circle cx="8" cy="8" r="6.75" />
                                                    <line x1="5.5" y1="8" x2="10.5" y2="8" />
                                                </svg>
                                                <span class="text-[11px] font-bold font-sans tabular-nums">${activePoint.value >= defaultCompareValue ? '+' : '-'}${formatVND(Math.abs(activePoint.value - defaultCompareValue))}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- TRỤC X BÊN DƯỚI: Nằm gọn gàng 100% trong khung Plot, tuyệt đối không tràn -->
                                    <div aria-hidden="true" class="relative h-4 select-none w-full mt-2">
                                        ${cashFlowData.length > 1 ? `<span class="absolute top-0 text-[11px] font-medium text-slate-400" style="left: ${(CF_INSET / CF_PLOT_WIDTH * 100).toFixed(2)}%; transform: translateX(-50%);">${firstMonthLabel}</span>` : ''}
                                        <span id="cf-active-label" class="absolute top-0" style="left: ${(activePoint.x / CF_PLOT_WIDTH * 100).toFixed(2)}%;">
                                            <span class="text-[11px] font-bold text-[#0562ef] dark:text-[#3179ff] block -translate-x-1/2 whitespace-nowrap">${activeMonthLabel}</span>
                                        </span>
                                        ${cashFlowData.length > 1 ? `<span class="absolute top-0 text-[11px] font-medium text-slate-400" style="left: ${((CF_PLOT_WIDTH - CF_INSET) / CF_PLOT_WIDTH * 100).toFixed(2)}%; transform: translateX(-50%);">${lastMonthLabel}</span>` : ''}
                                    </div>
                                </div>

                                <!-- CỘT TRỤC Y BÊN PHẢI (34px wide, spread top to bottom) -->
                                <div aria-hidden="true" class="flex min-w-[44px] shrink-0 flex-col justify-between self-stretch pb-6 text-right" style="height: ${CF_PLOT_HEIGHT}px;">
                                    ${[...cashFlowTicks].reverse().map(tick => {
                                        const isHighlight = tick === cashFlowTicks[cashFlowTicks.length - 1];
                                        return `
                                            <span data-slot="cash-flow-tick" data-tick="${tick}" class="text-[11px] font-${isHighlight ? 'bold text-[#0562ef] dark:text-[#3179ff]' : 'medium text-slate-400'} font-sans transition-colors duration-200">
                                                ${formatCompactVND(tick)}
                                            </span>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                    </article>


                    <!-- ======================================================================= -->
                    <!-- CARD 2: REVENUE BY PRODUCT LINE (Chuẩn 100% Mã Nguồn Mebius React)       -->
                    <!-- ======================================================================= -->
                    <article class="mebius-card flex flex-col justify-between relative group/card overflow-hidden">
                        <!-- Header with compact padding -->
                        <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 px-4 py-2.5">
                            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                                <h2 class="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight -my-0.5 truncate py-0.5 leading-tight font-sans">Sinh viên theo khóa</h2>
                                <p class="text-[11px] font-medium text-slate-400 dark:text-slate-400 -my-0.5 truncate py-0.5 font-sans">Số lượng nam và nữ của từng khóa đang lưu trú</p>
                            </div>
                        </div>

                        <!-- Sub-header: Số lượng sinh viên & Interactive Legend items -->
                        <div class="flex items-start gap-4 px-4 py-2">
                            <p class="text-[11px] font-normal min-w-0 flex-1 text-slate-600 dark:text-slate-300 font-sans">Số lượng sinh viên</p>
                            <div class="flex shrink-0 items-center gap-3">
                                <button type="button" data-slot="revenue-legend-male" aria-pressed="true" onclick="KtxApp.toggleStudentSeries('male')" class="cursor-pointer rounded-md outline-none transition-opacity duration-200">
                                    <span data-slot="legend-dot-wrapper" class="flex items-center gap-1.5 transition-opacity duration-200">
                                        <span class="size-2.5 rounded-full bg-[#0562ef] ring-2 ring-[#0562ef]/30 shrink-0"></span>
                                        <span class="text-[11px] font-medium whitespace-nowrap text-slate-500 dark:text-slate-400 font-sans">Nam</span>
                                    </span>
                                </button>
                                <button type="button" data-slot="revenue-legend-female" aria-pressed="true" onclick="KtxApp.toggleStudentSeries('female')" class="cursor-pointer rounded-md outline-none transition-opacity duration-200">
                                    <span data-slot="legend-dot-wrapper" class="flex items-center gap-1.5 transition-opacity duration-200">
                                        <span class="size-2.5 rounded-full bg-[#93c5fd] ring-2 ring-[#93c5fd]/30 shrink-0"></span>
                                        <span class="text-[11px] font-medium whitespace-nowrap text-slate-500 dark:text-slate-400 font-sans">Nữ</span>
                                    </span>
                                </button>
                            </div>
                        </div>

                        <!-- Main Plot Area -->
                        <div class="flex flex-col gap-3 px-4 pb-3 pt-0">
                            <div class="flex items-start gap-3">
                                <!-- Trục tung: số sinh viên, mốc tự tính theo dữ liệu thật -->
                                <div aria-hidden="true" class="flex min-w-[28px] shrink-0 flex-col justify-between text-left" style="height: ${studentPlotHeight}px;">
                                    ${[...studentTicks].reverse().map(tick => `
                                        <span class="text-[11px] font-normal text-slate-400 font-sans whitespace-nowrap">${tick}</span>
                                    `).join('')}
                                </div>

                                <!-- Plot Container (Relative, Height 260px) -->
                                <div class="flex min-w-0 flex-1 flex-col gap-4">
                                    <div id="student-plot-container" class="relative select-none" style="height: ${studentPlotHeight}px;" onpointerleave="KtxApp.onStudentGroupLeave()">
                                        <!-- SVG Lưới Ngang & Vạch Ngăn Dọc -->
                                        <svg class="pointer-events-none absolute inset-0 size-full overflow-visible" role="img" aria-label="Lưới biểu đồ cột đôi">
                                            ${studentTicks.map(tick => {
                                                const y = studentLevel(tick);
                                                const isBase = tick === 0;
                                                return `
                                                    <line data-slot="student-grid-line" x1="0" x2="${studentLayout.width}" y1="${y + 0.5}" y2="${y + 0.5}" stroke="currentColor" class="${isBase ? 'text-slate-200 dark:text-slate-700' : 'text-slate-100 dark:text-slate-800'}" ${isBase ? '' : 'stroke-dasharray="5 5"'} stroke-width="1" />
                                                `;
                                            }).join('')}
                                            <!-- 1px Vertical Axis line & dividers between product lines -->
                                            <line x1="0.5" x2="0.5" y1="0" y2="${studentPlotHeight}" stroke="currentColor" class="text-slate-200 dark:text-slate-700" stroke-width="1" />
                                            ${studentLayout.dividers.map(x => `
                                                <line data-slot="student-divider" x1="${x + 0.5}" x2="${x + 0.5}" y1="0" y2="${studentPlotHeight}" stroke="currentColor" class="text-slate-100 dark:text-slate-800" stroke-dasharray="5 5" stroke-width="1" />
                                            `).join('')}
                                        </svg>

                                        <!-- HTML Columns with Glassy Gloss Bars & Value Labels -->
                                        <div aria-hidden="true" class="pointer-events-none absolute inset-0">
                                            ${studentGroupBarsHtml}
                                        </div>

                                        <!-- Interactive Click / Hover Touch Areas -->
                                        <div role="group" aria-label="Biểu đồ sinh viên theo khóa" class="absolute inset-0 z-10">
                                            ${studentColumnsOverlayHtml}
                                        </div>

                                        <!-- FLOATING TOOLTIP (Chuẩn 100% Mebius React Source Code) -->
                                        <div
                                            id="student-tooltip"
                                            class="pointer-events-none absolute z-20 flex flex-col items-start gap-1.5 overflow-hidden rounded-xl bg-white dark:bg-[#171d2b] px-3 py-2 whitespace-nowrap shadow-[0_0_0_1px_#ececec,0_2px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200"
                                            style="left: ${studentTipLeft}px; top: ${studentTipTop}px; opacity: 0;"
                                        >
                                            <span class="text-[12px] font-bold text-slate-900 dark:text-white">${defaultActiveGroup.label}</span>
                                            <div class="flex items-center gap-1.5">
                                                <span class="h-4 w-1 rounded-xs bg-[#0562ef] shrink-0"></span>
                                                <span class="text-[12px] font-bold text-slate-900 dark:text-white font-sans tabular-nums">${defaultActiveGroup.values.male} sinh viên</span>
                                                <span class="text-[10px] text-slate-400">Nam</span>
                                            </div>
                                            <div class="flex items-center gap-1.5">
                                                <span class="h-4 w-1 rounded-xs bg-[#93c5fd] shrink-0"></span>
                                                <span class="text-[11px] font-medium text-slate-700 dark:text-slate-300 font-sans tabular-nums">${defaultActiveGroup.values.female} sinh viên</span>
                                                <span class="text-[10px] text-slate-400">Nữ</span>
                                            </div>
                                            <div class="w-full border-t border-slate-100 dark:border-slate-800 border-dashed my-0.5"></div>
                                            <div class="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                                <span class="text-[11px] font-semibold font-sans">Tổng: ${defaultActiveGroup.values.male + defaultActiveGroup.values.female} sinh viên</span>
                                            </div>
                                        </div>

                                        ${studentGroups.length === 0 ? `
                                            <div class="absolute inset-0 z-30 flex items-center justify-center rounded-lg bg-white/70 dark:bg-slate-900/50 text-[12px] text-slate-400">
                                                Chưa có dữ liệu sinh viên theo khóa
                                            </div>
                                        ` : ''}
                                    </div>

                                    <!-- Bottom Axis Labels: Centered under each group -->
                                    <div aria-hidden="true" class="relative h-4 select-none">
                                        ${studentLayout.groups.map((g, i) => `
                                            <span data-slot="revenue-by-product-line-chart-axis-label" data-index="${i}" class="absolute top-0" style="left: ${g.centre}px;">
                                                <span id="student-axis-label-${i}" class="text-[12px] block -translate-x-1/2 whitespace-nowrap transition-colors duration-200 ${i === 0 ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-400'}">
                                                    ${g.label}
                                                </span>
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>


                    <!-- ===================================================== -->
                    <!-- CARD 3: TỶ LỆ PHÒNG ĐÃ THUÊ (Biểu đồ nửa hình tròn) -->
                    <!-- ===================================================== -->
                    <article class="mebius-card p-4 sm:p-5 flex flex-col justify-between relative group/card">
                        <!-- Header -->
                        <div class="flex items-center justify-between gap-3 mb-1.5">
                            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                                <h2 class="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight font-sans">Tỷ lệ phòng đã thuê</h2>
                                <p class="text-[11px] text-slate-400 dark:text-slate-400 font-sans truncate">Phòng có hợp đồng lưu trú trên tổng số phòng đang hoạt động</p>
                            </div>
                            ${canAccessMenu('phong-va-giuong') ? `<button type="button" onclick="KtxApp.navigate('phong-va-giuong')" class="size-7 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0" title="Xem sơ đồ phòng">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                    <circle cx="3.5" cy="8" r="1.2" />
                                    <circle cx="8" cy="8" r="1.2" />
                                    <circle cx="12.5" cy="8" r="1.2" />
                                </svg>
                            </button>` : ''}
                        </div>

                        <!-- Gauge Box 720x362 scaled to card width -->
                        <div id="room-occupancy-gauge-container" class="relative my-1 select-none max-w-[340px] sm:max-w-[355px] mx-auto w-full" style="aspect-ratio: 720 / 362;">
                            <svg aria-hidden="true" viewBox="0 0 720 362" class="pointer-events-none absolute inset-0 size-full overflow-visible">
                                <defs>
                                    <linearGradient id="ro-band-fade" gradientUnits="userSpaceOnUse" x1="73.9067" y1="360" x2="449.907" y2="96">
                                        <stop offset="0" stop-color="#93c5fd" />
                                        <stop offset="0.228391" stop-color="#60a5fa" />
                                        <stop offset="1" stop-color="#0562ef" />
                                    </linearGradient>
                                    <linearGradient id="ro-arc-fade" gradientUnits="userSpaceOnUse" x1="20.0283" y1="243.5" x2="360.028" y2="0">
                                        <stop offset="0" stop-color="#eff6ff" stop-opacity="0" />
                                        <stop offset="0.358169" stop-color="#bfdbfe" />
                                        <stop offset="1" stop-color="#0562ef" />
                                    </linearGradient>
                                </defs>

                                <!-- Đường nền màu xám -->
                                <g class="text-slate-100 dark:text-slate-800" fill="currentColor">
                                    <path d="${segmentPath(CX, CY, RING_INNER, RING_OUTER, 180, 360)}" />
                                    <path d="${segmentPath(CX, CY, BAND_INNER, BAND_OUTER, 180, 360, CORNER)}" />
                                </g>

                                <!-- Viền mảnh và dải màu theo tỷ lệ phòng đã thuê -->
                                <path id="room-occupancy-arc" d="${roomOccupancyArcPath}" fill="url(#ro-arc-fade)" />
                                <path id="room-occupancy-band" d="${roomOccupancyPath}" fill="url(#ro-band-fade)" />
                            </svg>

                            <!-- Số liệu trung tâm -->
                            <div class="pointer-events-none absolute inset-x-0 bottom-1 sm:bottom-2 flex flex-col items-center">
                                <span class="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-[#0562ef] dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800/40 shadow-xs">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
                                        <path d="M3 21V8l9-5 9 5v13" />
                                        <path d="M9 21v-6h6v6" />
                                    </svg>
                                    <span class="text-[11px] font-semibold whitespace-nowrap font-sans">Phòng đã thuê</span>
                                </span>
                                <p id="room-occupancy-value" data-occupied="${occupiedRooms}" data-total="${totalRooms}" class="text-2xl sm:text-[26px] font-extrabold mt-1 whitespace-nowrap text-slate-900 dark:text-white font-sans tabular-nums tracking-tight">
                                    ${occupiedRooms}/${totalRooms} phòng
                                </p>
                                <p id="room-occupancy-percent" data-target="${roomOccupancyPercent}" class="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-sans">
                                    <span class="font-semibold text-[#0562ef] dark:text-blue-400">${roomOccupancyPercent}%</span>
                                    <span>công suất sử dụng</span>
                                </p>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <div class="flex flex-col items-center">
                                <span class="text-[11px] text-slate-400 font-sans">Tổng số phòng</span>
                                <span class="text-sm font-bold text-slate-900 dark:text-white tabular-nums">${totalRooms}</span>
                            </div>
                            <div class="flex flex-col items-center">
                                <span class="text-[11px] text-slate-400 font-sans">Phòng còn trống</span>
                                <span class="text-sm font-bold text-slate-900 dark:text-white tabular-nums">${Math.max(0, totalRooms - occupiedRooms)}</span>
                            </div>
                        </div>
                    </article>

                    <!-- ===================================================== -->
                    <!-- CARD 4: EXPENSES CHART (Chuẩn 100% Figma & React Mebius) -->
                    <!-- ===================================================== -->
                    <article class="mebius-card p-4 sm:p-5 flex flex-col justify-between relative group/card overflow-hidden">
                        <!-- Top Row: Title & More Button -->
                        <div class="flex items-center justify-between gap-3 mb-1.5">
                            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                                <h2 class="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">Phòng theo loại dịch vụ</h2>
                                <p class="text-[11px] text-slate-400 dark:text-slate-400 font-sans truncate">Số lượng phòng của từng loại đang hoạt động</p>
                            </div>
                            ${canAccessMenu('phong-va-giuong') ? `<button type="button" onclick="KtxApp.navigate('phong-va-giuong')" class="size-7 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" title="Xem sơ đồ phòng">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                    <circle cx="3.5" cy="8" r="1.2" />
                                    <circle cx="8" cy="8" r="1.2" />
                                    <circle cx="12.5" cy="8" r="1.2" />
                                </svg>
                            </button>` : ''}
                        </div>

                        <!-- KPI Row: Tổng số phòng theo loại -->
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div class="flex flex-col items-start">
                                <span id="expenses-total-val" class="text-xl sm:text-[22px] font-bold text-slate-900 dark:text-white tracking-tight tabular-nums leading-tight">${roomTypeTotal} phòng</span>
                            </div>
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#0562ef] dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                                ${roomTypeStats.length} loại phòng
                            </span>
                        </div>

                        <!-- Main Grid: 2 Columns (Categories List on Left, SVG Ring on Right) -->
                        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <!-- Left: Interactive Category Rows -->
                            <div class="md:col-span-7 flex flex-col gap-2 min-w-0">
                                ${expensesCategories.length === 0 ? `
                                    <div class="flex items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-3 py-6 text-center text-[12px] text-slate-400">
                                        Chưa có dữ liệu loại phòng
                                    </div>
                                ` : ''}
                                ${expensesCategories.map((c) => {
                                    const col = expColors[c.color || 'orange'];
                                    const val = initialExpPeriod.values[c.id] || 0;
                                    return `
                                        <button
                                            type="button"
                                            id="exp-row-${c.id}"
                                            data-slot="expenses-chart-category"
                                            onclick="KtxApp.onExpensesRowClick('${c.id}')"
                                            onpointerenter="KtxApp.onExpensesRowHover('${c.id}', true)"
                                            onpointerleave="KtxApp.onExpensesRowHover('${c.id}', false)"
                                            class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/40 px-2.5 py-2 text-left outline-none transition-[background-color,box-shadow,opacity,border-color] duration-200 hover:bg-white dark:hover:bg-slate-800 focus-visible:ring-2 select-none"
                                        >
                                            <span class="flex min-w-0 items-center gap-2">
                                                <span class="relative size-2.5 shrink-0 rounded-full" style="background-color: ${col.fill}; box-shadow: 0 4px 8px -2px rgba(38,45,58,0.2), 0 0 0 0.7px ${col.dotRing};"></span>
                                                <span class="text-[11px] font-medium leading-snug text-slate-700 dark:text-slate-200 whitespace-normal">${c.label}</span>
                                            </span>
                                            <span id="exp-val-${c.id}" data-val="${val}" class="text-[12px] font-semibold text-slate-900 dark:text-white font-sans tabular-nums whitespace-nowrap">
                                                ${formatRoomCount(val)}
                                            </span>
                                        </button>
                                    `;
                                }).join('')}
                            </div>

                            <!-- Right: SVG Scaled Ring + Center Display -->
                            <div class="md:col-span-5 flex items-center justify-center relative min-w-0">
                                <div
                                    id="exp-ring-container"
                                    class="relative w-[155px] h-[155px] sm:w-[170px] sm:h-[170px] shrink-0 touch-pan-y select-none max-w-full"
                                    onpointermove="KtxApp.onExpensesRingPointerMove(event)"
                                    onpointerleave="KtxApp.onExpensesRingPointerLeave()"
                                    onclick="KtxApp.onExpensesRingClick(event)"
                                >
                                    <svg id="expenses-ring-svg" viewBox="0 0 ${EXP_SIZE} ${EXP_SIZE}" class="pointer-events-none absolute inset-0 size-full overflow-visible">
                                        <defs>
                                            <filter id="exp-light" filterUnits="userSpaceOnUse" x="-60" y="-60" width="440" height="440" color-interpolation-filters="sRGB">
                                                <feGaussianBlur stdDeviation="2.7" />
                                            </filter>
                                            <filter id="exp-core" filterUnits="userSpaceOnUse" x="-60" y="-60" width="440" height="440" color-interpolation-filters="sRGB">
                                                <feGaussianBlur stdDeviation="10.8" />
                                            </filter>
                                            <clipPath id="exp-rest-clip">
                                                <path data-rest="bars" d="${initialRestShape.bars}" />
                                            </clipPath>
                                            ${expensesCategories.map((c, i) => `
                                                <clipPath id="exp-segment-${i}">
                                                    <path data-shape="fill" d="${segmentShapesExp(initialDonut.arcs[i]).fill}" />
                                                </clipPath>
                                            `).join('')}
                                        </defs>

                                        <!-- Rest / Hatched bars section -->
                                        <g id="exp-rest-group" class="transition-opacity duration-200">
                                            <g clip-path="url(#exp-rest-clip)" fill="#ffedd5" class="dark:fill-amber-950/40">
                                                ${EXP_TICKS.map(t => `<path data-slot="expenses-chart-bar" data-end="${t.end}" d="${t.d}" />`).join('')}
                                            </g>
                                            <path data-slot="expenses-chart-outline" data-rest="outerLine" d="${initialRestShape.outerLine}" fill="none" stroke="#fdba74" class="dark:stroke-amber-500/40" />
                                            <path data-slot="expenses-chart-outline" data-rest="innerLine" d="${initialRestShape.innerLine}" fill="none" stroke="#fdba74" class="dark:stroke-amber-500/40" />
                                        </g>

                                        <!-- Cored Segments Base: Rim, Fill, Inner Light -->
                                        ${coredCats.map(({ c, i, color }) => renderSegmentSvg(c, i, color, initialDonut.arcs[i])).join('')}

                                        <!-- Cores: Blurred overlays (mix-blend-mode: darken) -->
                                        ${coredCats.map(({ c, i, color }) => `
                                            <g data-pop="${i}" class="transition-opacity duration-200">
                                                <g data-arc="${i}" data-slot="expenses-chart-core" style="mix-blend-mode: darken;">
                                                    <path data-shape="glow" d="${segmentShapesExp(initialDonut.arcs[i]).glow}" fill="${expColors[color].glow}" filter="url(#exp-core)" />
                                                </g>
                                            </g>
                                        `).join('')}

                                        <!-- Flat Segments (Asset / Yellow, etc.) -->
                                        ${flatCats.map(({ c, i, color }) => renderSegmentSvg(c, i, color, initialDonut.arcs[i])).join('')}
                                    </svg>

                                    <!-- Center Information Box (Pops up on hover / pinned) -->
                                    <div
                                        id="expenses-center-box"
                                        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 opacity-0 scale-90 transition-all duration-300"
                                    >
                                        <span id="expenses-center-label" class="text-[10px] font-medium text-slate-400 dark:text-slate-400 truncate"></span>
                                        <span id="expenses-center-val" class="text-[17px] sm:text-[19px] font-bold text-slate-900 dark:text-white font-sans tracking-tight tabular-nums"></span>
                                        <span id="expenses-center-note" class="text-[10px] text-slate-400 dark:text-slate-400 font-normal">—</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>

                </section>
            </div>
        `;
    }

    // 2. Admissions View Renderer (Đợt & Đơn đăng ký)
    function renderAdmissionsView() {
        const apps = state.applications || [];

        // 1. Áp dụng trước các bộ lọc tìm kiếm, diện ưu tiên và chất lượng phòng
        let contextualApps = apps;

        if (state.admissionsSearch && state.admissionsSearch.trim()) {
            contextualApps = contextualApps.filter(a =>
                fuzzyMatch(
                    state.admissionsSearch,
                    a.applicationCode,
                    a.studentName,
                    a.mssv,
                    a.major,
                    a.priorityCategory,
                    a.roomPreference,
                    a.status
                )
            );
        }

        if (state.admissionsPriority === 'stayed') {
            contextualApps = contextualApps.filter(a => a.hasStayedBefore === true);
        } else if (state.admissionsPriority === 'new') {
            contextualApps = contextualApps.filter(a => a.hasStayedBefore !== true);
        } else if (state.admissionsPriority) {
            contextualApps = contextualApps.filter(a =>
                (a.priorityCategory || '').toLowerCase().includes(state.admissionsPriority.toLowerCase())
            );
        }

        if (state.admissionsRoomType) {
            const rt = state.admissionsRoomType.toLowerCase();
            contextualApps = contextualApps.filter(a => {
                const pref = String(a.roomPreference || '').toLowerCase();
                const gender = String(a.gender || '').toLowerCase();
                const isClc = pref.includes('chất lượng cao') || pref.includes('clc');
                const isTieuChuan = pref.includes('tiêu chuẩn') || pref.includes('thường');
                const isNam = pref.includes('nam') || gender === 'nam';
                const isNu = pref.includes('nữ') || pref.includes('nu') || gender === 'nữ' || gender === 'nu';
                if (rt === 'clc' || rt === 'cao') {
                    return isClc;
                }
                if (rt === 'clc_nam') {
                    return isClc && !pref.includes('nữ') && isNam;
                }
                if (rt === 'clc_nu') {
                    return isClc && !pref.includes('nam') && isNu;
                }
                if (rt === 'nam') {
                    return !isClc && (pref.includes('nam') || (isTieuChuan && gender === 'nam'));
                }
                if (rt === 'nu') {
                    return !isClc && (pref.includes('nữ') || pref.includes('nu') || (isTieuChuan && (gender === 'nữ' || gender === 'nu')));
                }
                return pref.includes(rt);
            });
        }

        if (state.admissionsPaymentFilter) {
            contextualApps = contextualApps.filter(a =>
                (a.paymentStatus || 'chuaThanhToan') === state.admissionsPaymentFilter
            );
        }

        // 2. Tính số lượng các tab trạng thái dựa trên danh sách đã lọc theo tiêu chí tìm kiếm/diện/chất lượng
        const pendingCount = contextualApps.filter(a => a.status === 'Chờ duyệt').length;
        const approvedCount = contextualApps.filter(a => a.status === 'Đã duyệt').length;
        const rejectedCount = contextualApps.filter(a => a.status === 'Bị từ chối').length;
        const totalCount = contextualApps.length;

        // 3. Sau đó mới lọc theo tab trạng thái đang chọn để hiển thị trên bảng
        let filtered = contextualApps;
        if (state.admissionsTab !== 'all') {
            if (state.admissionsTab === 'pending') filtered = filtered.filter(a => a.status === 'Chờ duyệt');
            else if (state.admissionsTab === 'approved') filtered = filtered.filter(a => a.status === 'Đã duyệt');
            else if (state.admissionsTab === 'rejected') filtered = filtered.filter(a => a.status === 'Bị từ chối');
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
                        <button type="button" onclick="KtxApp.openManageRoundsModal()" class="h-10 px-4 rounded-xl bg-white dark:bg-[#1E293B] hover:bg-slate-50 text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-2xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">event_available</span>
                            <span>Quản lý đợt đăng ký</span>
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
                                ${totalCount} <span class="text-sm font-normal text-slate-500">hồ sơ</span>
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
                            <div class="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
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

                <!-- Search & Filter Bar -->
                <div class="page-filter-bar flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
                    <!-- 1. Tìm kiếm (kéo giãn hết khoảng trống còn lại) -->
                    <div class="page-filter-search flex-1 min-w-[240px] w-full flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B]">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                        <input id="admissionsSearchInput" type="text" value="${escapeHtml(state.admissionsSearch || '')}" onkeydown="if(event.key==='Enter'){event.preventDefault();KtxApp.setAdmissionsSearch(this.value);}" placeholder="Tìm mã đơn, tên sinh viên, MSSV... (Nhấn Enter)" class="min-w-0 flex-1 bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                    </div>

                    <!-- 2. Bộ lọc Trạng thái, Diện ưu tiên & Chất lượng phòng -->
                    <div class="flex items-center gap-2 shrink-0 flex-wrap page-filter-controls">
                        <!-- Bộ lọc Trạng thái -->
                        <select onchange="KtxApp.setAdmissionsTab(this.value)" aria-label="Lọc theo trạng thái đơn" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                            <option value="all" ${state.admissionsTab === 'all' ? 'selected' : ''}>Trạng thái: Tất cả</option>
                            <option value="pending" ${state.admissionsTab === 'pending' ? 'selected' : ''}>Chờ duyệt</option>
                            <option value="approved" ${state.admissionsTab === 'approved' ? 'selected' : ''}>Đã duyệt</option>
                            <option value="rejected" ${state.admissionsTab === 'rejected' ? 'selected' : ''}>Bị từ chối</option>
                        </select>

                        <!-- Bộ lọc Diện ưu tiên -->
                        <select onchange="KtxApp.setAdmissionsPriority(this.value)" aria-label="Lọc theo diện ưu tiên" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                            <option value="">Diện: Tất cả</option>
                            <option value="chính sách" ${state.admissionsPriority === 'chính sách' ? 'selected' : ''}>Chính sách</option>
                            <option value="hộ nghèo" ${state.admissionsPriority === 'hộ nghèo' ? 'selected' : ''}>Hộ nghèo</option>
                            <option value="vùng sâu" ${state.admissionsPriority === 'vùng sâu' ? 'selected' : ''}>Vùng sâu</option>
                            <option value="điểm" ${state.admissionsPriority === 'điểm' ? 'selected' : ''}>Điểm cao (>27đ)</option>
                            <option value="stayed" ${state.admissionsPriority === 'stayed' ? 'selected' : ''}>Đã từng ở KTX</option>
                            <option value="new" ${state.admissionsPriority === 'new' ? 'selected' : ''}>Chưa từng ở KTX</option>
                        </select>

                        <!-- Bộ lọc Chất lượng phòng -->
                        <select onchange="KtxApp.setAdmissionsRoomType(this.value)" aria-label="Lọc theo chất lượng phòng" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                            <option value="">Chất lượng: Tất cả</option>
                            <option value="clc_nam" ${state.admissionsRoomType === 'clc_nam' ? 'selected' : ''}>Chất lượng cao Nam</option>
                            <option value="clc_nu" ${state.admissionsRoomType === 'clc_nu' ? 'selected' : ''}>Chất lượng cao Nữ</option>
                            <option value="nam" ${state.admissionsRoomType === 'nam' ? 'selected' : ''}>Tiêu chuẩn Nam</option>
                            <option value="nu" ${state.admissionsRoomType === 'nu' ? 'selected' : ''}>Tiêu chuẩn Nữ</option>
                        </select>

                        <!-- Bộ lọc trạng thái thu phí -->
                        <select onchange="KtxApp.setAdmissionsPaymentFilter(this.value)" aria-label="Lọc theo trạng thái thu phí" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                            <option value="">Thu phí: Tất cả</option>
                            <option value="daNhanThanhToan" ${state.admissionsPaymentFilter === 'daNhanThanhToan' ? 'selected' : ''}>Đã nhận thanh toán</option>
                            <option value="choXacNhan" ${state.admissionsPaymentFilter === 'choXacNhan' ? 'selected' : ''}>Chờ xác nhận thanh toán</option>
                            <option value="chuaThanhToan" ${state.admissionsPaymentFilter === 'chuaThanhToan' ? 'selected' : ''}>Chưa thanh toán</option>
                        </select>

                        <!-- Nút Hủy bộ lọc -->
                        <button type="button" onclick="KtxApp.resetAdmissionsFilters()" class="h-10 w-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center shrink-0 shadow-2xs group" title="Hủy bỏ toàn bộ bộ lọc" aria-label="Hủy bộ lọc">
                            <span class="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">filter_alt_off</span>
                        </button>
                    </div>
                </div>

                <!-- Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full min-w-[780px] text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                                    <th class="w-[14%] py-3.5 pl-6 pr-3 whitespace-nowrap">Mã đơn</th>
                                    <th class="w-[28%] py-3.5 px-4 whitespace-nowrap">Sinh viên</th>
                                    <th class="w-[16%] py-3.5 px-4 text-left whitespace-nowrap">Diện ưu tiên</th>
                                    <th class="w-[28%] py-3.5 px-4 whitespace-nowrap">Nguyện vọng phòng</th>
                                    <th class="w-[14%] py-3.5 pl-3 pr-6 text-center whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                ${filtered.map(app => {
                                    const safeAppId = escapeHtml(String(app.id ?? ''));
                                    const safeStudentName = escapeHtml(String(app.studentName || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
                                    const hasPriority = app.priorityCategory && app.priorityCategory !== '—' && app.priorityCategory !== '-' && app.priorityCategory !== 'Không';
                                    const isPending = app.status === 'Chờ duyệt';
                                    const statusBadgeClass = app.status === 'Đã duyệt'
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                        : (isPending
                                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                            : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300');
                                    return `
                                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                                        <td class="py-3.5 pl-6 pr-3 align-middle font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">${escapeHtml(app.applicationCode)}</td>
                                        <td class="py-3.5 px-4 align-middle">
                                            <div class="flex items-center gap-3 min-w-[200px]">
                                                <span class="w-8 h-8 rounded-full shrink-0 ring-1 ring-slate-200 bg-blue-100 text-[#0B2A5B] flex items-center justify-center text-xs font-bold">${getUserInitial(app.studentName)}</span>
                                                <div class="flex flex-col min-w-0">
                                                    <span class="font-semibold text-slate-900 dark:text-white group-hover:text-[#0B2A5B] dark:group-hover:text-blue-400 transition-colors truncate">${escapeHtml(app.studentName)}</span>
                                                    <span class="text-[11px] text-slate-400 font-mono truncate">${escapeHtml(app.mssv)} • ${escapeHtml(app.major)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="py-3.5 px-4 text-left align-middle whitespace-nowrap">
                                            ${hasPriority ? `
                                                <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50/90 dark:bg-blue-950/40 text-[#1d4ed8] dark:text-blue-300 border border-[#bfdbfe] dark:border-blue-900/60 shadow-2xs whitespace-nowrap">${escapeHtml(app.priorityCategory)}</span>
                                            ` : `
                                                <span class="inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 font-mono">—</span>
                                            `}
                                        </td>
                                        <td class="py-3.5 px-4 align-middle">
                                            <div class="flex flex-col gap-0.5 min-w-[180px]">
                                                <div class="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
                                                    <span class="material-symbols-outlined text-[16px] text-[#375ba9] shrink-0">apartment</span>
                                                    <span>${escapeHtml(app.roomPreference)}</span>
                                                </div>
                                                <span class="pl-[22px] text-[11px] text-slate-400 whitespace-nowrap">${escapeHtml(app.submittedAt || '—')}</span>
                                            </div>
                                        </td>
                                        <td class="py-3.5 pl-3 pr-6 text-center align-middle whitespace-nowrap" onclick="event.stopPropagation(); KtxApp.closeAdmissionsActionMenus();">
                                            <div class="relative inline-flex items-center justify-center">
                                                <button type="button"
                                                    onclick="KtxApp.toggleAdmissionsActionMenu('${safeAppId}', event)"
                                                    aria-haspopup="menu"
                                                    aria-expanded="false"
                                                    aria-controls="admissions-action-menu-${safeAppId}"
                                                    title="Thao tác"
                                                    aria-label="Mở menu thao tác cho đơn ${escapeHtml(app.applicationCode)}"
                                                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-[#0B2A5B] hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 mx-auto">
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                                        <circle cx="3.5" cy="8" r="1.25" />
                                                        <circle cx="8" cy="8" r="1.25" />
                                                        <circle cx="12.5" cy="8" r="1.25" />
                                                    </svg>
                                                </button>
                                                <div id="admissions-action-menu-${safeAppId}"
                                                    data-admissions-menu="true"
                                                    role="menu"
                                                    class="hidden fixed z-50 w-56 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-xl py-1.5 text-left animate-fade-in">
                                                    ${!isPending ? `
                                                        <div class="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                                            <span class="text-[11px] text-slate-400">Trạng thái</span>
                                                            <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold ${statusBadgeClass}">${escapeHtml(app.status)}</span>
                                                        </div>
                                                    ` : ''}
                                                    ${app.paymentStatus === 'choXacNhan' && app.invoiceId ? `
                                                        <button type="button" role="menuitem"
                                                            onclick="KtxApp.closeAdmissionsActionMenus(); KtxApp.openPaymentProofReview('${safeAppId}');"
                                                            class="w-full px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 flex items-center gap-2 transition-colors text-left">
                                                            <span class="material-symbols-outlined text-[16px]">price_check</span>
                                                            <span>Xác nhận thanh toán</span>
                                                        </button>
                                                    ` : ''}
                                                    <button type="button" role="menuitem"
                                                        onclick="KtxApp.closeAdmissionsActionMenus(); KtxApp.inspectCandidate('${safeAppId}');"
                                                        class="w-full px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors text-left">
                                                        <span class="material-symbols-outlined text-[16px] text-slate-500">visibility</span>
                                                        <span>Xem chi tiết hồ sơ</span>
                                                    </button>
                                                    ${isPending ? `
                                                        <button type="button" role="menuitem"
                                                            onclick="KtxApp.closeAdmissionsActionMenus(); KtxApp.confirmApproveApp('${safeAppId}', '${safeStudentName}');"
                                                            class="w-full px-3 py-2 text-xs font-semibold text-[#0B2A5B] dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 flex items-center gap-2 transition-colors text-left">
                                                            <span class="material-symbols-outlined text-[16px]">check</span>
                                                            <span>Duyệt hồ sơ</span>
                                                        </button>
                                                        <button type="button" role="menuitem"
                                                            onclick="KtxApp.closeAdmissionsActionMenus(); KtxApp.rejectApp('${safeAppId}', '${safeStudentName}');"
                                                            class="w-full px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors text-left">
                                                            <span class="material-symbols-outlined text-[16px]">close</span>
                                                            <span>Từ chối đơn</span>
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                                }).join('')}
                                ${filtered.length === 0 ? '<tr><td colspan="5" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu.</td></tr>' : ''}
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
        const availableRooms = Array.from(new Set(
            contracts
                .filter(c => state.contractsBuilding === 'all' || c.buildingId === state.contractsBuilding)
                .map(c => c.roomNumber)
                .filter(Boolean)
        )).sort();

        // 1. Áp dụng trước các bộ lọc theo ngữ cảnh: Tòa, Phòng, Tìm kiếm
        let contextualContracts = contracts;

        if (state.contractsBuilding !== 'all') {
            contextualContracts = contextualContracts.filter(c => c.buildingId === state.contractsBuilding);
        }

        if (state.contractsRoom && state.contractsRoom !== 'all') {
            contextualContracts = contextualContracts.filter(c => (c.roomNumber || '') === state.contractsRoom);
        }

        if (state.contractsSearch && state.contractsSearch.trim()) {
            contextualContracts = contextualContracts.filter(c =>
                fuzzyMatch(
                    state.contractsSearch,
                    c.contractNumber,
                    c.studentName,
                    c.mssv,
                    c.roomNumber,
                    c.buildingId,
                    c.bedNumber,
                    c.status
                )
            );
        }

        // 2. Tính số lượng các tab trạng thái và KPI dựa trên tập hợp đồng đã áp dụng bộ lọc
        const validCount = contextualContracts.filter(c => c.status === 'Hiệu lực').length;
        const expiringCount = contextualContracts.filter(c => c.status === 'Sắp hết hạn').length;
        const endedCount = contextualContracts.filter(c => c.status === 'Đã thanh lý').length;
        const totalFilteredCount = contextualContracts.length;

        // Tính tổng tiền cọc của tập hợp đồng đang lọc (nếu cọc là số thì cộng dồn, format VND)
        const totalFilteredDeposit = contextualContracts.reduce((sum, c) => sum + (Number(c.depositAmount) || 0), 0);
        const formattedDeposit = totalFilteredDeposit > 0 ? formatVND(totalFilteredDeposit) : '0 đ';

        // 3. Sau đó mới lọc theo trạng thái đang chọn để hiển thị bảng
        let filtered = contextualContracts;
        if (state.contractsTab === 'valid' || state.contractsTab === 'active') filtered = filtered.filter(c => c.status === 'Hiệu lực');
        else if (state.contractsTab === 'expiring') filtered = filtered.filter(c => c.status === 'Sắp hết hạn');
        else if (state.contractsTab === 'ended' || state.contractsTab === 'liquidated') filtered = filtered.filter(c => c.status === 'Đã thanh lý');

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
                        <button type="button" onclick="KtxApp.importContractsExcel()" class="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-white dark:bg-[#1E293B] hover:bg-slate-50 text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-2xs border border-slate-200 dark:border-slate-700">
                            <span class="material-symbols-outlined text-[18px] text-slate-500">upload_file</span>
                            <span>Tạo HĐ nhanh (Excel)</span>
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
                                ${formattedDeposit}
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Tài khoản bảo đảm VietinBank</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>
                </div>

                <!-- Filters Strip -->
                <div class="page-filter-bar bg-white dark:bg-[#121826] rounded-2xl p-3 shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <!-- 1. Thanh tìm kiếm (kéo giãn hết khoảng trống còn lại) -->
                        <div class="page-filter-search flex-1 min-w-[240px] w-full flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B]">
                            <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                            <input id="contractsSearchInput" type="text" value="${escapeHtml(state.contractsSearch || '')}" onkeydown="if(event.key==='Enter'){event.preventDefault();KtxApp.setContractsSearch(this.value);}" placeholder="Số HĐ hoặc tên/MSSV... (Nhấn Enter)" class="min-w-0 flex-1 bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                        </div>

                        <!-- 2. Bộ lọc Trạng thái, Tòa & Phòng -->
                        <div class="flex items-center gap-2 shrink-0 flex-wrap page-filter-controls">
                            <select onchange="KtxApp.setContractsTab(this.value)" aria-label="Lọc theo trạng thái hợp đồng" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                <option value="all" ${state.contractsTab === 'all' ? 'selected' : ''}>Trạng thái: Tất cả</option>
                                <option value="active" ${state.contractsTab === 'active' || state.contractsTab === 'valid' ? 'selected' : ''}>Đang hiệu lực</option>
                                <option value="expiring" ${state.contractsTab === 'expiring' ? 'selected' : ''}>Sắp hết hạn</option>
                                <option value="liquidated" ${state.contractsTab === 'liquidated' || state.contractsTab === 'ended' ? 'selected' : ''}>Đã thanh lý</option>
                            </select>

                            <!-- Bộ lọc Tòa -->
                            <select onchange="KtxApp.setContractsBuilding(this.value)" aria-label="Lọc theo tòa nhà" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                <option value="all">Tất cả Tòa</option>
                                ${(state.contractBuildings || []).map(building => {
                                    const buildingId = building.id ?? building.code ?? building.maToaNha ?? building.MaToaNha;
                                    const buildingName = building.name ?? building.tenToaNha ?? building.TenToaNha ?? buildingId;
                                    if (!buildingId) return '';
                                    return `<option value="${escapeHtml(buildingId)}" ${state.contractsBuilding === buildingId ? 'selected' : ''}>${escapeHtml(buildingName)}</option>`;
                                }).join('')}
                            </select>

                            <!-- Bộ lọc Phòng -->
                            <select onchange="KtxApp.setContractsRoom(this.value)" aria-label="Lọc theo phòng" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                <option value="all">Tất cả Phòng</option>
                                ${availableRooms.map(r => `<option value="${escapeHtml(r)}" ${state.contractsRoom === r ? 'selected' : ''}>Phòng ${escapeHtml(r)}</option>`).join('')}
                            </select>

                            <!-- Nút Hủy bộ lọc Hợp đồng -->
                            <button type="button" onclick="KtxApp.resetContractsFilters()" class="h-10 w-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center shrink-0 shadow-2xs group" title="Hủy bỏ toàn bộ bộ lọc hợp đồng" aria-label="Hủy bộ lọc hợp đồng">
                                <span class="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">filter_alt_off</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Table -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full min-w-[1024px] table-fixed text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                                    <th class="w-[16%] py-3.5 pl-6 pr-3 text-left whitespace-nowrap">Số HĐ</th>
                                    <th class="w-[18%] py-3.5 px-3 text-left whitespace-nowrap">Sinh viên</th>
                                    <th class="w-[22%] py-3.5 px-3 text-left whitespace-nowrap">Phòng / Giường</th>
                                    <th class="w-[15%] py-3.5 px-3 text-left whitespace-nowrap">Thời hạn</th>
                                    <th class="w-[11%] py-3.5 px-3 text-right whitespace-nowrap">Tiền phòng/tháng</th>
                                    <th class="w-[10%] py-3.5 px-3 text-right whitespace-nowrap">Tiền cọc</th>
                                    <th class="w-[8%] py-3.5 pl-3 pr-6 text-center whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                ${filtered.map(c => {
                                    const safeContractId = escapeHtml(String(c.contractNumber ?? c.id ?? ''));
                                    const safeContractJs = escapeHtml(String(c.contractNumber ?? c.id ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
                                    const isActionable = c.status !== 'Đã thanh lý' && c.status !== 'Đã hủy';
                                    const canCheckIn = (c.status === 'Hiệu lực' || c.status === 'Sắp hết hạn' || c.statusCode === 'hieuLuc') && !c.actualCheckInDate;
                                    const canRenew = c.status === 'Hiệu lực' || c.status === 'Sắp hết hạn' || c.statusCode === 'hieuLuc';
                                    const statusBadgeClass = c.status === 'Hiệu lực'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                                        : c.status === 'Sắp hết hạn'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
                                            : 'bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

                                    return `
                                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${c.status === 'Sắp hết hạn' ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}">
                                        <td class="py-3.5 pl-6 pr-3 align-middle font-mono font-semibold text-[#0B2A5B] dark:text-blue-400 whitespace-nowrap overflow-hidden">
                                            <span class="block truncate" title="${escapeHtml(c.contractNumber)}">${escapeHtml(c.contractNumber)}</span>
                                        </td>
                                        <td class="py-3.5 px-3 align-middle">
                                            <div class="flex items-center gap-2.5 min-w-0">
                                                <div class="w-8 h-8 rounded-full bg-blue-100 text-[#0B2A5B] flex items-center justify-center text-xs font-bold shrink-0">${escapeHtml(c.avatarInitials)}</div>
                                                <div class="flex flex-col min-w-0">
                                                    <span class="font-semibold text-slate-900 dark:text-white truncate">${escapeHtml(c.studentName)}</span>
                                                    <span class="text-[11px] text-slate-400 font-mono truncate">MSSV: ${escapeHtml(c.mssv)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="py-3.5 px-3 align-middle">
                                            <div class="flex flex-row items-center gap-1.5 whitespace-nowrap">
                                                <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium text-xs shrink-0">
                                                    <span class="material-symbols-outlined text-[15px] text-[#375ba9]">meeting_room</span>
                                                    <span class="font-bold text-[#0B2A5B] dark:text-white">${escapeHtml(c.roomNumber)}</span>
                                                    <span class="text-slate-400">·</span>
                                                    <span>${escapeHtml(c.bedNumber)}</span>
                                                </div>
                                                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${statusBadgeClass}">${escapeHtml(c.status)}</span>
                                            </div>
                                        </td>
                                        <td class="py-3.5 px-3 align-middle">
                                            <div class="flex flex-col">
                                                <span class="font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">${escapeHtml(c.startDate)} → ${escapeHtml(c.endDate)}</span>
                                                <span class="text-[11px] mt-0.5 ${c.remainingDays <= 15 && c.remainingDays > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}">
                                                    ${c.remainingDays > 0 ? `Còn ${c.remainingDays} ngày` : 'Đã tất toán'}
                                                </span>
                                            </div>
                                        </td>
                                        <td class="py-3.5 px-3 align-middle text-right font-mono font-semibold whitespace-nowrap">${formatVND(c.monthlyFee)}</td>
                                        <td class="py-3.5 px-3 align-middle text-right font-mono font-semibold whitespace-nowrap">
                                            <div>${formatVND(c.depositAmount)}</div>
                                        </td>
                                        <td class="py-3.5 pl-3 pr-6 text-center align-middle whitespace-nowrap" onclick="event.stopPropagation();">
                                            <div class="relative inline-flex items-center justify-center">
                                                <button type="button"
                                                    onclick="KtxApp.toggleContractsActionMenu('${safeContractJs}', event)"
                                                    aria-haspopup="menu"
                                                    aria-expanded="false"
                                                    aria-controls="contracts-action-menu-${safeContractId}"
                                                    title="Thao tác"
                                                    aria-label="Mở menu thao tác cho hợp đồng ${safeContractId}"
                                                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-[#0B2A5B] hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 mx-auto">
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                                        <circle cx="3.5" cy="8" r="1.25" />
                                                        <circle cx="8" cy="8" r="1.25" />
                                                        <circle cx="12.5" cy="8" r="1.25" />
                                                    </svg>
                                                </button>
                                                <div id="contracts-action-menu-${safeContractId}"
                                                    data-contracts-menu="true"
                                                    role="menu"
                                                    class="hidden fixed z-50 w-52 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-xl py-1.5 text-left animate-fade-in">
                                                    <div class="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                                        <span class="text-[11px] text-slate-400 font-mono">${safeContractId}</span>
                                                        <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusBadgeClass}">${escapeHtml(c.status)}</span>
                                                    </div>
                                                    <button type="button" role="menuitem"
                                                        onclick="KtxApp.closeContractsActionMenus(); KtxApp.openPrintModal('${safeContractJs}');"
                                                        class="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                                        <span class="material-symbols-outlined text-[16px] text-[#0B2A5B] dark:text-blue-400">print</span>
                                                        <span>Xem &amp; In hợp đồng (A4)</span>
                                                    </button>
                                                    ${canCheckIn ? `
                                                        <button type="button" role="menuitem"
                                                            onclick="KtxApp.closeContractsActionMenus(); KtxApp.checkInContract('${safeContractJs}');"
                                                            class="w-full px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2 transition-colors font-medium">
                                                            <span class="material-symbols-outlined text-[16px]">how_to_reg</span>
                                                            <span>Ghi nhận nhận phòng</span>
                                                        </button>
                                                    ` : ''}
                                                    ${canRenew ? `
                                                        <button type="button" role="menuitem"
                                                            onclick="KtxApp.closeContractsActionMenus(); KtxApp.openRenewContractModal('${safeContractJs}');"
                                                            class="w-full px-3 py-2 text-xs text-[#0B2A5B] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 transition-colors font-semibold">
                                                            <span class="material-symbols-outlined text-[16px]">update</span>
                                                            <span>Gia hạn hợp đồng</span>
                                                        </button>
                                                    ` : ''}
                                                    ${isActionable ? `
                                                        <button type="button" role="menuitem"
                                                            onclick="KtxApp.closeContractsActionMenus(); KtxApp.openLiquidateContractModal('${safeContractJs}');"
                                                            class="w-full px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors font-semibold">
                                                            <span class="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                                                            <span>Thanh lý hợp đồng</span>
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                                ${filtered.length === 0 ? '<tr><td colspan="7" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu.</td></tr>' : ''}
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

        // 1. Áp dụng các bộ lọc ngữ cảnh trước: Tìm kiếm, Thanh toán, Khóa, Khoa viện
        let contextualStudents = students;

        if (state.studentsSearch && state.studentsSearch.trim()) {
            contextualStudents = contextualStudents.filter(s =>
                fuzzyMatch(
                    state.studentsSearch,
                    s.name,
                    s.mssv,
                    s.cccd,
                    s.roomNumber,
                    s.className,
                    s.major,
                    s.phone,
                    s.hometown,
                    s.residenceStatus,
                    s.paymentStatus
                )
            );
        }

        if (state.studentsCohort) {
            contextualStudents = contextualStudents.filter(s => (s.cohort || '').toLowerCase().includes(state.studentsCohort.toLowerCase()));
        }

        if (state.studentsMajor) {
            contextualStudents = contextualStudents.filter(s => (s.major || '').toLowerCase().includes(state.studentsMajor.toLowerCase()));
        }

        // 2. Mọi sinh viên có hồ sơ đều đang nội trú; KPI tính trên toàn bộ hồ sơ
        const residentCount = students.length;
        const maleResidents = students.filter(s => s.gender === 'Nam').length;
        const femaleResidents = students.filter(s => s.gender === 'Nữ').length;
        const allBeds = (state.rooms || []).flatMap(room => room.beds || []);
        const totalBedsCount = allBeds.length;
        const occupiedBedsCount = allBeds.filter(bed => bed.status === 'Đang ở').length;
        const occupancyRate = totalBedsCount ? (Math.round(occupiedBedsCount / totalBedsCount * 1000) / 10).toFixed(1) : '0.0';

        // 3. Bảng sinh viên chỉ lọc theo tìm kiếm, khóa và khoa viện
        const filtered = contextualStudents;

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
                                ${residentCount.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">sinh viên</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-[#375ba9] dark:text-blue-400 font-semibold">Đang ở theo hợp đồng hiện có</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">TỔNG NAM SINH</span>
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
                            <span class="text-[#375ba9] dark:text-blue-400 font-semibold">Tổng nam sinh đang ở toàn KTX</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">TỔNG NỮ SINH</span>
                            <div class="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
                                <span class="material-symbols-outlined text-[18px]">female</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                ${femaleResidents.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">sinh viên</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-red-600 dark:text-red-400 font-semibold">Tổng nữ sinh đang ở toàn KTX</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
                        <div class="flex items-center justify-between">
                            <span class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase">TỶ LỆ LẤP ĐẦY</span>
                            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <span class="material-symbols-outlined text-[18px]">percent</span>
                            </div>
                        </div>
                        <div class="my-3">
                            <div class="text-3xl lg:text-4xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                                ${occupancyRate}% <span class="text-sm font-normal text-slate-500">giường đã sử dụng</span>
                            </div>
                        </div>
                        <div class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">${occupiedBedsCount.toLocaleString('vi-VN')}/${totalBedsCount.toLocaleString('vi-VN')} giường đang có người ở</span>
                            <span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>
                </div>

                <!-- Filters Strip -->
                <div class="page-filter-bar bg-white dark:bg-[#121826] rounded-2xl p-3 shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <!-- 1. Thanh tìm kiếm (kéo giãn hết khoảng trống còn lại) -->
                        <div class="page-filter-search flex-1 min-w-[240px] w-full flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B]">
                            <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                            <input id="studentsSearchInput" type="text" value="${escapeHtml(state.studentsSearch || '')}" onkeydown="if(event.key==='Enter'){event.preventDefault();KtxApp.setStudentsSearch(this.value);}" placeholder="Tìm tên, MSSV, CCCD, số phòng... (Nhấn Enter)" class="min-w-0 flex-1 bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                        </div>

                        <!-- 2. Bộ lọc Khóa, Khoa viện, và Hủy lọc -->
                        <div class="flex items-center gap-2 shrink-0 flex-wrap page-filter-controls">
                            <!-- Bộ lọc Khóa -->
                            <select onchange="KtxApp.setStudentsCohort(this.value)" aria-label="Lọc theo khóa học" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                <option value="">Khóa: Tất cả</option>
                                ${cohorts.map(cohort => `<option value="${escapeHtml(cohort)}" ${state.studentsCohort === cohort ? 'selected' : ''}>Khóa ${escapeHtml(cohort)}</option>`).join('')}
                            </select>

                            <!-- Bộ lọc Khoa Viện -->
                            <select onchange="KtxApp.setStudentsMajor(this.value)" aria-label="Lọc theo khoa viện" class="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                <option value="">Khoa viện: Tất cả</option>
                                ${majors.map(major => `<option value="${escapeHtml(major)}" ${state.studentsMajor === major ? 'selected' : ''}>${escapeHtml(major)}</option>`).join('')}
                            </select>

                            <!-- Nút Hủy bộ lọc -->
                            <button type="button" onclick="KtxApp.resetStudentsFilters()" class="h-10 w-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center shrink-0 shadow-2xs group" title="Hủy bỏ toàn bộ bộ lọc sinh viên" aria-label="Hủy bộ lọc sinh viên">
                                <span class="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">filter_alt_off</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Table -->
                <div class="rounded-2xl bg-white dark:bg-[#121826] shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full min-w-[820px] table-fixed text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                                    <th class="w-[12%] py-3.5 pl-6 pr-3 text-left whitespace-nowrap">MSSV</th>
                                    <th class="w-[22%] py-3.5 px-3 text-left whitespace-nowrap">Họ và tên</th>
                                    <th class="w-[16%] py-3.5 px-3 text-left whitespace-nowrap">Khoa / Lớp</th>
                                    <th class="w-[18%] py-3.5 px-3 text-left whitespace-nowrap">Phòng & Giường</th>
                                    <th class="w-[12%] py-3.5 px-3 text-left whitespace-nowrap">Điện thoại</th>
                                    <th class="w-[12%] py-3.5 px-3 text-left whitespace-nowrap">Quê quán</th>
                                    <th class="w-[8%] py-3.5 pl-3 pr-6 text-center whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                ${filtered.map(s => {
                                    const safeMssvId = escapeHtml(String(s.mssv ?? ''));
                                    const safeMssvJs = escapeHtml(String(s.mssv ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));

                                    return `
                                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                        <td class="py-3.5 pl-6 pr-3 align-middle font-mono font-semibold text-[#0B2A5B] dark:text-blue-400 truncate">${safeMssvId}</td>
                                        <td class="py-3.5 px-3 align-middle">
                                            <div class="flex items-center gap-2.5 min-w-0">
                                                <span class="w-8 h-8 rounded-full shrink-0 ring-1 ring-slate-200 bg-blue-100 text-[#0B2A5B] flex items-center justify-center text-xs font-bold">${getUserInitial(s.name)}</span>
                                                <div class="flex flex-col min-w-0">
                                                    <span class="font-semibold text-slate-900 dark:text-white truncate">${escapeHtml(s.name)}</span>
                                                    <span class="text-[11px] text-slate-400 truncate">${escapeHtml(s.className)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="py-3.5 px-3 align-middle truncate" title="${escapeHtml(s.major)}">${escapeHtml(s.major)}</td>
                                        <td class="py-3.5 px-3 align-middle">
                                            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium text-xs max-w-full">
                                                <span class="material-symbols-outlined text-[15px] text-[#375ba9] shrink-0">meeting_room</span>
                                                <span class="font-bold text-[#0B2A5B] dark:text-white truncate">${escapeHtml(s.roomNumber || '—')}</span>
                                                <span class="text-slate-400 shrink-0">·</span>
                                                <span class="truncate">${escapeHtml(s.bedNumber || '—')}</span>
                                            </div>
                                        </td>
                                        <td class="py-3.5 px-3 align-middle font-mono text-slate-600 dark:text-slate-300 truncate">${escapeHtml(s.phone || '—')}</td>
                                        <td class="py-3.5 px-3 align-middle truncate" title="${escapeHtml(s.hometown || '')}">${escapeHtml(s.hometown || '—')}</td>
                                        <td class="py-3.5 pl-3 pr-6 text-center align-middle whitespace-nowrap" onclick="event.stopPropagation();">
                                            <div class="relative inline-flex items-center justify-center">
                                                <button type="button"
                                                    onclick="KtxApp.toggleStudentsActionMenu('${safeMssvJs}', event)"
                                                    aria-haspopup="menu"
                                                    aria-expanded="false"
                                                    aria-controls="students-action-menu-${safeMssvId}"
                                                    title="Thao tác"
                                                    aria-label="Mở menu thao tác cho sinh viên ${safeMssvId}"
                                                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-[#0B2A5B] hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 mx-auto">
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                                        <circle cx="3.5" cy="8" r="1.25" />
                                                        <circle cx="8" cy="8" r="1.25" />
                                                        <circle cx="12.5" cy="8" r="1.25" />
                                                    </svg>
                                                </button>
                                                <div id="students-action-menu-${safeMssvId}"
                                                    data-students-menu="true"
                                                    role="menu"
                                                    class="hidden fixed z-50 w-52 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-xl py-1.5 text-left animate-fade-in">
                                                    <div class="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                                        <span class="text-[11px] text-slate-400 font-mono">${safeMssvId}</span>
                                                    </div>
                                                    <button type="button" role="menuitem"
                                                        onclick="KtxApp.closeStudentsActionMenus(); KtxApp.openStudentModal('${safeMssvJs}');"
                                                        class="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                                        <span class="material-symbols-outlined text-[16px] text-[#0B2A5B] dark:text-blue-400">badge</span>
                                                        <span>Xem chi tiết hồ sơ</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                                ${filtered.length === 0 ? '<tr><td colspan="7" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu.</td></tr>' : ''}
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
        const buildings = [...new Set(rooms.map(room => room.buildingId).filter(Boolean))].sort();

        // 1. Áp dụng trước các bộ lọc ngữ cảnh: Tòa, Giới tính, Số phòng, Tìm kiếm
        const filteredByBuilding = state.roomsBuilding === 'all'
            ? rooms
            : rooms.filter(room => room.buildingId === state.roomsBuilding);
        const filteredByGender = (!state.roomsGender || state.roomsGender === 'all')
            ? filteredByBuilding
            : filteredByBuilding.filter(room => room.gender === state.roomsGender);
        const filteredByFloor = (!state.roomsFloor || state.roomsFloor === 'all')
            ? filteredByGender
            : filteredByGender.filter(r => String(r.floor) === String(state.roomsFloor));
        const roomNumbers = [...new Set(filteredByFloor.map(room => room.roomNumber).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
        const filteredByRoomNum = state.roomsRoomNumber === 'all'
            ? filteredByFloor
            : filteredByFloor.filter(room => room.roomNumber === state.roomsRoomNumber);
        const contextualRooms = (state.roomsSearch && state.roomsSearch.trim())
            ? filteredByRoomNum.filter(room =>
                fuzzyMatch(
                    state.roomsSearch,
                    room.roomNumber,
                    room.buildingId,
                    room.buildingName,
                    `Tầng ${room.floor}`,
                    ...(room.beds || []).flatMap(b => [b.bedNumber, b.status, b.studentName, b.mssv])
                )
            )
            : filteredByRoomNum;

        // 2. Tính số lượng KPI và các tab trạng thái giường dựa trên tập phòng đang lọc (thay đổi linh hoạt)
        const contextualBeds = contextualRooms.flatMap(room => room.beds || []);
        const totalRoomsCount = contextualRooms.length;
        const totalBedsCount = contextualBeds.length;
        const occupiedBeds = contextualBeds.filter(bed => bed.status === 'Đang ở').length;
        const vacantBeds = contextualBeds.filter(bed => bed.status === 'Giường trống').length;
        const maintenanceBeds = contextualBeds.filter(bed => bed.status === 'Bảo trì').length;
        const occupancyRate = totalBedsCount ? Math.round(occupiedBeds / totalBedsCount * 100) : 0;

        // 3. Lọc theo tab trạng thái giường nếu có chọn ('occupied', 'vacant', 'maintenance')
        let finalRooms = contextualRooms;
        if (state.roomsBedStatus && state.roomsBedStatus !== 'all') {
            const targetStatus = state.roomsBedStatus === 'occupied' ? 'Đang ở' :
                                 state.roomsBedStatus === 'vacant' ? 'Giường trống' :
                                 state.roomsBedStatus === 'maintenance' ? 'Bảo trì' : null;
            if (targetStatus) {
                finalRooms = contextualRooms.filter(r => (r.beds || []).some(b => b.status === targetStatus));
            }
        }
        const filteredRooms = finalRooms;
        const selectClass = 'h-10 min-w-[130px] px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer';

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
                        ${state.currentUser?.roleCode === 'admin' ? `<button type="button" onclick="KtxApp.openCreateRoomModal()" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition-all text-xs font-semibold border border-slate-200 dark:border-slate-700">` : `<button type="button" onclick="KtxApp.openCreateRoomModal()" class="hidden" style="display:none !important;">`}
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
                                ${totalRoomsCount.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">phòng</span>
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
                                ${totalBedsCount.toLocaleString('vi-VN')} <span class="text-sm font-normal text-slate-500">giường</span>
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

                <!-- Filter Strip -->
                <div class="page-filter-bar bg-white dark:bg-[#121826] rounded-2xl p-3 shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <!-- 1. Thanh tìm kiếm (đem ra trước) -->
                        <div class="page-filter-search flex-1 min-w-[220px] w-full flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B]">
                            <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                            <input id="roomsSearchInput" type="text" value="${escapeHtml(state.roomsSearch || '')}" onkeydown="if(event.key==='Enter'){event.preventDefault();KtxApp.setRoomsSearch(this.value);}" placeholder="Tìm phòng, tòa, tên SV, MSSV... (Nhấn Enter)" class="min-w-0 flex-1 bg-transparent text-xs text-slate-800 dark:text-white focus:outline-none" />
                        </div>

                        <!-- 2. Bộ lọc Tòa, Giới tính, Phòng & Nút Hủy lọc -->
                        <div class="flex items-center gap-2 shrink-0 flex-wrap">
                            <select aria-label="Lọc theo tòa" onchange="KtxApp.setRoomsBuilding(this.value)" class="${selectClass}">
                                <option value="all">Tòa: Tất cả</option>
                                ${buildings.map(building => `<option value="${building}" ${state.roomsBuilding === building ? 'selected' : ''}>Tòa ${building}</option>`).join('')}
                            </select>
                            <select aria-label="Lọc theo giới tính" onchange="KtxApp.setRoomsGender(this.value)" class="${selectClass}">
                                <option value="all" ${(!state.roomsGender || state.roomsGender === 'all') ? 'selected' : ''}>Giới tính: Tất cả</option>
                                <option value="Nam" ${state.roomsGender === 'Nam' ? 'selected' : ''}>Phòng Nam</option>
                                <option value="Nữ" ${state.roomsGender === 'Nữ' ? 'selected' : ''}>Phòng Nữ</option>
                            </select>
                            <!-- Custom Room Dropdown (xổ xuống dưới, cuộn mượt mà, khung ngắn gọn) -->
                            <div class="relative inline-block" id="roomsRoomDropdownContainer">
                                <button type="button" onclick="KtxApp.toggleRoomsRoomDropdown(event)" class="${selectClass} flex items-center justify-between gap-2 text-left">
                                    <span class="truncate">${state.roomsRoomNumber === 'all' ? 'Phòng: Tất cả' : 'Phòng ' + state.roomsRoomNumber}</span>
                                    <span class="material-symbols-outlined text-[18px] text-slate-400 transition-transform ${state.roomsRoomDropdownOpen ? 'rotate-180' : ''}">expand_more</span>
                                </button>
                                <div id="roomsRoomDropdownMenu" class="${state.roomsRoomDropdownOpen ? '' : 'hidden'} absolute left-0 top-full mt-1.5 w-48 max-h-56 overflow-y-auto rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-xl py-1 z-50 animate-fade-in custom-scrollbar">
                                    <button type="button" onclick="KtxApp.selectRoomsRoomNumber('all')" class="w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${state.roomsRoomNumber === 'all' ? 'bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}">
                                        <span>Phòng: Tất cả</span>
                                        ${state.roomsRoomNumber === 'all' ? '<span class="material-symbols-outlined text-[16px]">check</span>' : ''}
                                    </button>
                                    ${roomNumbers.map(rn => `
                                        <button type="button" onclick="KtxApp.selectRoomsRoomNumber('${rn}')" class="w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${state.roomsRoomNumber === rn ? 'bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}">
                                            <span>Phòng ${rn}</span>
                                            ${state.roomsRoomNumber === rn ? '<span class="material-symbols-outlined text-[16px]">check</span>' : ''}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                            <button type="button" onclick="KtxApp.resetRoomsFilters()" class="h-10 w-10 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center shrink-0 shadow-2xs group" title="Hủy bỏ toàn bộ bộ lọc phòng" aria-label="Hủy bộ lọc phòng">
                                <span class="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">filter_alt_off</span>
                            </button>
                        </div>

                        <!-- 3. Chuyển chế độ xem (Danh sách vs Sơ đồ) -->
                        <div class="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#0B0F1A] border border-slate-200/80 dark:border-[#232B3B] shadow-2xs shrink-0">
                            <button type="button" onclick="KtxApp.setRoomsViewMode('roster')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                !isGrid ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                            }">
                                <span class="material-symbols-outlined text-[16px]">badge</span>
                                <span>Danh sách</span>
                            </button>
                            <button type="button" onclick="KtxApp.setRoomsViewMode('grid')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                isGrid ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                            }">
                                <span class="material-symbols-outlined text-[16px]">grid_view</span>
                                <span>Sơ đồ buồng</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- View Contents -->
                ${isGrid ? renderRoomsGridView(filteredRooms) : renderRoomsRosterView()}
            </div>
        `;
    }

    function renderRoomsGridView(rooms) {
        const buildings = [...new Set(rooms.map(room => room.buildingId).filter(Boolean))].sort();
        const getRoomTypeStyle = (roomType) => {
            const isClc = (roomType || '').includes('Chất lượng cao');
            const isFemale = (roomType || '').includes('Nữ');
            if (isClc && isFemale) return { short: 'CLC Nữ', chip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60' };
            if (isClc) return { short: 'CLC Nam', chip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60' };
            if (isFemale) return { short: 'TC Nữ', chip: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60' };
            return { short: 'TC Nam', chip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60' };
        };
        return `
            <div class="space-y-6">
                ${rooms.length === 0 ? '<div class="rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] p-10 text-center text-xs text-slate-400 shadow-xs">Không có dữ liệu.</div>' : ''}
                ${buildings.map(bId => {
                    const bRooms = rooms.filter(r => r.buildingId === bId);
                    if (bRooms.length === 0) return '';
                    const bBeds = bRooms.flatMap(r => r.beds || []);
                    const bOccupied = bBeds.filter(b => b.status === 'Đang ở').length;
                    return `
                        <div class="bg-white dark:bg-[#121826] p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[#0B2A5B] dark:text-blue-400 text-[20px]">apartment</span>
                                    <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">${escapeHtml(bRooms[0].buildingName)}</h3>
                                </div>
                                <div class="flex items-center gap-3 text-xs text-slate-500">
                                    <span>${bRooms.length} phòng</span>
                                    <span class="w-px h-3 bg-slate-200 dark:bg-slate-700"></span>
                                    <span>${bBeds.length} giường</span>
                                    <span class="w-px h-3 bg-slate-200 dark:bg-slate-700"></span>
                                    <span class="font-semibold text-[#0B2A5B] dark:text-blue-400">${bOccupied} đang ở</span>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                                ${bRooms.map(r => {
                                    const isFull = r.occupied >= r.capacity;
                                    const hasMaint = r.beds && r.beds.some(b => b.status === 'Bảo trì');
                                    const typeStyle = getRoomTypeStyle(r.roomType);
                                    return `
                                        <div onclick="KtxApp.inspectRoom('${r.id}')" class="h-full p-3.5 rounded-xl border border-slate-200/80 dark:border-[#232B3B] bg-white dark:bg-[#0B0F1A] flex flex-col gap-2.5 transition-all cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600">
                                            <div class="flex items-start justify-between gap-2">
                                                <div class="min-w-0">
                                                    <div class="flex items-center gap-1.5 min-w-0">
                                                        <span class="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">P.${escapeHtml(r.roomNumber)}</span>
                                                        <span class="px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${typeStyle.chip}">${typeStyle.short}</span>
                                                    </div>
                                                    <p class="text-[10px] text-slate-400 truncate mt-0.5" title="${escapeHtml(r.roomType || '')}">${escapeHtml(r.roomType || '—')}</p>
                                                </div>
                                                <span class="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap ${
                                                    hasMaint ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                                                    isFull ? 'bg-blue-50 text-[#0B2A5B] dark:bg-blue-950/60 dark:text-blue-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                                }">${hasMaint ? 'Bảo trì' : `${r.occupied}/${r.capacity} chỗ`}</span>
                                            </div>

                                            <div class="grid grid-cols-4 gap-1.5">
                                                ${(r.beds || []).map(b => `
                                                    <div class="h-6 rounded-md flex items-center justify-center text-[10px] font-bold font-mono ${
                                                        b.status === 'Đang ở' ? 'bg-[#0B2A5B] text-white' :
                                                        b.status === 'Bảo trì' ? 'bg-amber-400 text-amber-950' :
                                                        'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/60'
                                                    }">${b.bedNumber}</div>
                                                `).join('')}
                                            </div>

                                            <div class="flex items-center justify-between text-[11px] pt-2 mt-auto border-t border-slate-100 dark:border-slate-800">
                                                <span class="text-slate-500">Tầng ${r.floor}</span>
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
        const students = (state.students || []).filter(student => {
            const matchBuilding = state.roomsBuilding === 'all' || student.buildingId === state.roomsBuilding;
            const matchGender = (!state.roomsGender || state.roomsGender === 'all') || student.gender === state.roomsGender;
            const matchRoom = state.roomsRoomNumber === 'all' || student.roomNumber === state.roomsRoomNumber;
            const matchBedStatus = state.roomsBedStatus === 'all' ||
                (state.roomsBedStatus === 'occupied' && student.residenceStatus === 'Đang ở') ||
                (state.roomsBedStatus === 'vacant' && student.residenceStatus !== 'Đang ở') ||
                (state.roomsBedStatus === 'maintenance' && student.residenceStatus === 'Bảo trì');
            const matchSearch = !state.roomsSearch || !state.roomsSearch.trim() || fuzzyMatch(
                state.roomsSearch,
                student.mssv,
                student.name,
                student.className,
                student.buildingId,
                student.roomNumber,
                student.bedNumber,
                student.residenceStatus
            );
            return matchBuilding && matchGender && matchRoom && matchBedStatus && matchSearch;
        });
        return `
            <div class="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full min-w-[820px] table-fixed text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                                <th class="w-[13%] py-3.5 pl-6 pr-3 text-left whitespace-nowrap">MSSV</th>
                                <th class="w-[26%] py-3.5 px-3 text-left whitespace-nowrap">Họ và tên</th>
                                <th class="w-[21%] py-3.5 px-3 text-left whitespace-nowrap">Phòng & Giường</th>
                                <th class="w-[12%] py-3.5 px-3 text-left whitespace-nowrap">Tòa</th>
                                <th class="w-[18%] py-3.5 px-3 text-left whitespace-nowrap">Giới tính / Khóa</th>
                                <th class="w-[10%] py-3.5 pl-3 pr-6 text-center whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                            ${students.map(s => {
                                const safeMssvId = escapeHtml(String(s.mssv ?? ''));
                                const safeMssvJs = escapeHtml(String(s.mssv ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
                                const matchedRoom = (state.rooms || []).find(r =>
                                    r.roomNumber === s.roomNumber && (!s.buildingId || r.buildingId === s.buildingId)
                                );
                                const safeRoomIdJs = matchedRoom
                                    ? escapeHtml(String(matchedRoom.id).replace(/\\/g, '\\\\').replace(/'/g, "\\'"))
                                    : '';

                                return `
                                <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                    <td class="py-3.5 pl-6 pr-3 align-middle font-mono font-semibold text-[#0B2A5B] dark:text-blue-400 truncate">${safeMssvId}</td>
                                    <td class="py-3.5 px-3 align-middle">
                                        <div class="flex items-center gap-2.5 min-w-0">
                                            <span class="w-7 h-7 rounded-full shrink-0 ring-1 ring-slate-200 bg-blue-100 text-[#0B2A5B] flex items-center justify-center text-[10px] font-bold">${getUserInitial(s.name)}</span>
                                            <div class="min-w-0">
                                                <div class="font-semibold text-slate-900 dark:text-white leading-tight truncate">${escapeHtml(s.name)}</div>
                                                <div class="text-[11px] text-slate-400 truncate">${escapeHtml(s.className)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="py-3.5 px-3 align-middle">
                                        <div class="flex flex-col items-start gap-1">
                                            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium text-xs max-w-full">
                                                <span class="material-symbols-outlined text-[15px] text-[#375ba9] shrink-0">meeting_room</span>
                                                <span class="font-bold text-[#0B2A5B] dark:text-white truncate">${escapeHtml(s.roomNumber || 'Chưa xếp')}</span>
                                                ${s.bedNumber && s.bedNumber !== '—' ? `<span class="text-slate-400 shrink-0">·</span><span class="font-mono font-bold text-[#375ba9] dark:text-blue-400 truncate">${escapeHtml(s.bedNumber)}</span>` : ''}
                                            </div>
                                            <span class="text-[11px] text-slate-400">Ngày vào: ${escapeHtml(s.admissionDate || '—')}</span>
                                        </div>
                                    </td>
                                    <td class="py-3.5 px-3 align-middle font-medium whitespace-nowrap">${s.buildingId ? 'Tòa ' + escapeHtml(s.buildingId) : '—'}</td>
                                    <td class="py-3.5 px-3 align-middle whitespace-nowrap">
                                        <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold ${s.gender === 'Nam' ? 'bg-blue-100 text-[#0B2A5B]' : 'bg-red-100 text-red-700'}">${escapeHtml(s.gender || '—')}</span>
                                        <span class="text-[11px] text-slate-500 font-medium ml-1">${escapeHtml(s.cohort || '')}</span>
                                    </td>
                                    <td class="py-3.5 pl-3 pr-6 text-center align-middle whitespace-nowrap" onclick="event.stopPropagation();">
                                        <div class="relative inline-flex items-center justify-center">
                                            <button type="button"
                                                onclick="KtxApp.toggleStudentsActionMenu('${safeMssvJs}', event)"
                                                aria-haspopup="menu"
                                                aria-expanded="false"
                                                aria-controls="students-action-menu-${safeMssvId}"
                                                title="Thao tác"
                                                aria-label="Mở menu thao tác cho sinh viên ${safeMssvId}"
                                                class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-[#0B2A5B] hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 mx-auto">
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                                    <circle cx="3.5" cy="8" r="1.25" />
                                                    <circle cx="8" cy="8" r="1.25" />
                                                    <circle cx="12.5" cy="8" r="1.25" />
                                                </svg>
                                            </button>
                                            <div id="students-action-menu-${safeMssvId}"
                                                data-students-menu="true"
                                                role="menu"
                                                class="hidden fixed z-50 w-52 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-xl py-1.5 text-left animate-fade-in">
                                                <div class="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                                    <span class="text-[11px] text-slate-400 font-mono">${safeMssvId}</span>
                                                </div>
                                                <button type="button" role="menuitem"
                                                    onclick="KtxApp.closeStudentsActionMenus(); KtxApp.openStudentModal('${safeMssvJs}');"
                                                    class="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                                    <span class="material-symbols-outlined text-[16px] text-[#0B2A5B] dark:text-blue-400">badge</span>
                                                    <span>Xem hồ sơ sinh viên</span>
                                                </button>
                                                ${safeRoomIdJs ? `
                                                    <button type="button" role="menuitem"
                                                        onclick="KtxApp.closeStudentsActionMenus(); KtxApp.inspectRoom('${safeRoomIdJs}');"
                                                        class="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                                        <span class="material-symbols-outlined text-[16px] text-[#375ba9] dark:text-blue-400">meeting_room</span>
                                                        <span>Xem chi tiết buồng phòng</span>
                                                    </button>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                            ${students.length === 0 ? '<tr><td colspan="6" class="py-10 text-center text-slate-400 text-xs">Không có dữ liệu.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async function openNewContractModal() {
        if (!state.selectedAcademicYear) {
            showToast('Vui lòng chọn năm học trước khi lập hợp đồng.', 'error');
            return;
        }
        const container = document.getElementById('modalsContainer');
        if (!container) return;

        // Nạp lại danh sách sinh viên, phòng/giường và hợp đồng hiện có để dropdown luôn đầy đủ dữ liệu
        const yearQuery = `academicYear=${encodeURIComponent(state.selectedAcademicYear)}`;
        try {
            const [studentsData, roomsData, contractsData] = await Promise.all([
                fetchApiData(`/api/sinhvien?${yearQuery}&pageSize=500`),
                fetchApiData(`/api/phong?${yearQuery}`),
                fetchApiData(`/api/hopdong?${yearQuery}`)
            ]);
            state.students = Array.isArray(studentsData) ? studentsData : [];
            state.rooms = Array.isArray(roomsData) ? roomsData : [];
            state.contracts = Array.isArray(contractsData) ? contractsData : [];
        } catch (e) {
            if (!Array.isArray(state.students) || state.students.length === 0) await loadStudents();
            if (!Array.isArray(state.rooms) || state.rooms.length === 0) await loadRooms();
            if (!Array.isArray(state.contracts) || state.contracts.length === 0) await loadContracts();
        }

        const activeStudentMssvs = new Set(
            (state.contracts || [])
                .filter(c => c.status !== 'Đã thanh lý' && c.status !== 'Đã hủy')
                .map(c => c.mssv)
        );
        const allStudents = (state.students || []).filter(student => student.mssv);

        const availableBeds = (state.rooms || [])
            .flatMap(room =>
                (room.beds || [])
                    .filter(bed => bed.status === 'Giường trống')
                    .map(bed => ({ ...bed, room })))
            .sort((a, b) => {
                const cmpB = String(a.room.buildingId || '').localeCompare(String(b.room.buildingId || ''));
                if (cmpB !== 0) return cmpB;
                return String(a.room.roomNumber || '').localeCompare(String(b.room.roomNumber || ''));
            });

        const currentYearObj = (state.academicYears || []).find(y => getAcademicYearCode(y) === state.selectedAcademicYear);
        const defaultStart = currentYearObj && (currentYearObj.ngayBatDau || currentYearObj.NgayBatDau)
            ? String(currentYearObj.ngayBatDau || currentYearObj.NgayBatDau).slice(0, 10)
            : new Date().toISOString().slice(0, 10);
        const defaultEndDateObj = new Date(defaultStart);
        defaultEndDateObj.setMonth(defaultEndDateObj.getMonth() + 10);
        const defaultEnd = currentYearObj && (currentYearObj.ngayKetThuc || currentYearObj.NgayKetThuc)
            ? String(currentYearObj.ngayKetThuc || currentYearObj.NgayKetThuc).slice(0, 10)
            : defaultEndDateObj.toISOString().slice(0, 10);

        newContractPool = {
            students: allStudents,
            activeMssvs: activeStudentMssvs,
            beds: availableBeds
        };

        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] animate-fade-in">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">post_add</span>
                            <h3 class="text-base font-bold text-slate-900 dark:text-white">Lập hợp đồng nội trú mới</h3>
                        </div>
                        <button type="button" onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <form onsubmit="event.preventDefault(); KtxApp.submitNewContract();" class="py-4 space-y-4 text-xs">
                        <div class="grid grid-cols-2 gap-3">
                            <div class="col-span-2 sm:col-span-1">
                                <label for="ncGenderFilter" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Giới tính</label>
                                <select id="ncGenderFilter" onchange="KtxApp.onNewContractGenderChange()" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                    <option value="">Tất cả giới tính</option>
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                </select>
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label for="ncMssv" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên sinh viên</label>
                                <select id="ncMssv" required onchange="KtxApp.onNewContractSelectionCheck()" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                    <option value="">Chọn sinh viên</option>
                                </select>
                                <p id="ncStudentEmpty" class="hidden text-[11px] text-amber-600 mt-1">Không có sinh viên phù hợp với giới tính đã chọn.</p>
                            </div>
                        </div>

                        <div class="p-3 rounded-xl border border-slate-200 dark:border-[#232B3B] bg-white dark:bg-[#0B0F1A] space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label for="ncFloor" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tầng</label>
                                    <select id="ncFloor" required onchange="KtxApp.onNewContractFloorChange()" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                        <option value="">Chọn tầng</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="ncRoom" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phòng</label>
                                    <select id="ncRoom" required disabled onchange="KtxApp.onNewContractRoomChange()" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                                        <option value="">Chọn phòng</option>
                                    </select>
                                </div>
                            </div>

                            <div id="ncBedWrap" class="hidden pt-3 border-t border-slate-100 dark:border-slate-800">
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Giường trong phòng <span class="text-red-500">*</span></label>
                                <div id="ncBedList" class="flex flex-wrap gap-2"></div>
                                <input type="hidden" id="ncBedId" />
                                <p id="ncBedError" class="hidden text-[11px] text-red-600 font-medium mt-1">Vui lòng chọn giường trước khi lập hợp đồng.</p>
                            </div>

                            <p id="ncFloorEmpty" class="hidden text-[11px] text-amber-600">Hiện tại không còn giường trống khả dụng.</p>
                        </div>

                        <div id="ncCompatHint" class="hidden p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px]"></div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label for="ncMonthlyFee" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tiền phòng / tháng (VND)</label>
                                <input type="number" id="ncMonthlyFee" required min="0.01" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none" />
                            </div>
                            <div>
                                <label for="ncDepositAmount" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tiền cọc giữ chỗ (VND)</label>
                                <input type="number" id="ncDepositAmount" required min="0" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none" />
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label for="ncStartDate" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày bắt đầu</label>
                                <input type="date" id="ncStartDate" value="${escapeHtml(defaultStart)}" required class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none" />
                            </div>
                            <div>
                                <label for="ncEndDate" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày kết thúc</label>
                                <input type="date" id="ncEndDate" value="${escapeHtml(defaultEnd)}" required class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none" />
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

        refreshNewContractStudents();
        refreshNewContractFloors();
    }

    let newContractPool = null;

    function newContractGender() {
        return document.getElementById('ncGenderFilter')?.value || '';
    }

    function getNewContractBeds() {
        const gender = newContractGender();
        return (newContractPool?.beds || []).filter(bed => {
            const roomGender = bed.room.gender || '';
            return !gender || !roomGender || roomGender === '—' || roomGender === gender;
        });
    }

    function refreshNewContractStudents() {
        const sel = document.getElementById('ncMssv');
        if (!sel || !newContractPool) return;
        const gender = newContractGender();
        const students = newContractPool.students.filter(s => !gender || s.gender === gender);
        const eligible = students.filter(s => !newContractPool.activeMssvs.has(s.mssv));
        const existing = students.filter(s => newContractPool.activeMssvs.has(s.mssv));
        const render = (s) => `<option value="${escapeHtml(s.mssv)}" data-gender="${escapeHtml(s.gender || '')}">${escapeHtml(`${s.mssv} · ${s.name}`)}</option>`;
        const prev = sel.value;
        sel.innerHTML = `<option value="">Chọn sinh viên (${students.length} hồ sơ)</option>` +
            (eligible.length ? `<optgroup label="Sinh viên chưa có hợp đồng">${eligible.map(render).join('')}</optgroup>` : '') +
            (existing.length ? `<optgroup label="Sinh viên đã có hợp đồng trong năm học">${existing.map(render).join('')}</optgroup>` : '');
        if (Array.from(sel.options).some(o => o.value === prev)) sel.value = prev;
        document.getElementById('ncStudentEmpty')?.classList.toggle('hidden', students.length > 0);
    }

    function refreshNewContractFloors() {
        const sel = document.getElementById('ncFloor');
        if (!sel) return;
        const beds = getNewContractBeds();
        const buildings = new Map();
        beds.forEach(bed => {
            const key = bed.room.buildingId || '';
            if (!buildings.has(key)) buildings.set(key, { label: bed.room.buildingName || key, floors: new Set() });
            buildings.get(key).floors.add(Number(bed.room.floor) || 0);
        });
        const prev = sel.value;
        let html = '<option value="">Chọn tầng</option>';
        [...buildings.entries()]
            .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
            .forEach(([buildingId, info]) => {
                const floors = [...info.floors].sort((a, b) => a - b)
                    .map(floor => `<option value="${escapeHtml(`${buildingId}::${floor}`)}">Tầng ${floor}</option>`)
                    .join('');
                html += `<optgroup label="${escapeHtml(info.label)}">${floors}</optgroup>`;
            });
        sel.innerHTML = html;
        if (Array.from(sel.options).some(o => o.value === prev)) sel.value = prev;
        document.getElementById('ncFloorEmpty')?.classList.toggle('hidden', beds.length > 0);
    }

    function refreshNewContractRooms() {
        const floorSel = document.getElementById('ncFloor');
        const roomSel = document.getElementById('ncRoom');
        const bedWrap = document.getElementById('ncBedWrap');
        const hiddenBed = document.getElementById('ncBedId');
        if (!floorSel || !roomSel || !hiddenBed) return;

        const floorValue = floorSel.value;
        const prev = roomSel.value;
        roomSel.innerHTML = '<option value="">Chọn phòng</option>';
        hiddenBed.value = '';
        bedWrap?.classList.add('hidden');
        const bedList = document.getElementById('ncBedList');
        if (bedList) bedList.innerHTML = '';

        if (!floorValue) {
            roomSel.disabled = true;
            return;
        }

        const rooms = new Map();
        getNewContractBeds()
            .filter(bed => `${bed.room.buildingId || ''}::${Number(bed.room.floor) || 0}` === floorValue)
            .forEach(bed => {
                if (!rooms.has(bed.room.id)) rooms.set(bed.room.id, { room: bed.room, beds: [] });
                rooms.get(bed.room.id).beds.push(bed);
            });

        roomSel.innerHTML += [...rooms.values()]
            .sort((a, b) => String(a.room.roomNumber || '').localeCompare(String(b.room.roomNumber || '')))
            .map(({ room, beds }) => {
                const fee = Number(room.pricePerMonth ?? room.price ?? 0);
                return `<option value="${escapeHtml(room.id)}">Phòng ${escapeHtml(room.roomNumber)} · ${escapeHtml(room.roomType || '')} · ${beds.length} giường trống · ${formatVND(fee)}/tháng</option>`;
            })
            .join('');
        roomSel.disabled = rooms.size === 0;
        if (rooms.size > 0 && Array.from(roomSel.options).some(o => o.value === prev)) {
            roomSel.value = prev;
            refreshNewContractBeds();
        }
    }

    function refreshNewContractBeds() {
        const roomSel = document.getElementById('ncRoom');
        const wrap = document.getElementById('ncBedWrap');
        const list = document.getElementById('ncBedList');
        const hidden = document.getElementById('ncBedId');
        if (!roomSel || !wrap || !list || !hidden) return;

        const roomId = roomSel.value;
        const beds = getNewContractBeds().filter(bed => bed.room.id === roomId);
        hidden.value = '';
        document.getElementById('ncBedError')?.classList.add('hidden');

        if (!roomId || beds.length === 0) {
            wrap.classList.add('hidden');
            list.innerHTML = '';
            return;
        }

        wrap.classList.remove('hidden');
        list.innerHTML = beds
            .sort((a, b) => String(a.bedNumber || '').localeCompare(String(b.bedNumber || ''), undefined, { numeric: true }))
            .map(bed => `<button type="button" data-bed-id="${escapeHtml(bed.id)}" onclick="KtxApp.selectNewContractBed(this.dataset.bedId)" aria-pressed="false" class="nc-bed-chip px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-[11px] font-semibold hover:border-[#0B2A5B] hover:text-[#0B2A5B] dark:hover:text-blue-400 transition-colors">${escapeHtml(bed.bedNumber)}</button>`)
            .join('');

        if (beds.length === 1) selectNewContractBed(beds[0].id);
    }

    function selectNewContractBed(bedId) {
        const hidden = document.getElementById('ncBedId');
        if (!hidden || !bedId) return;
        hidden.value = bedId;
        document.querySelectorAll('#ncBedList .nc-bed-chip').forEach(chip => {
            const active = chip.dataset.bedId === bedId;
            chip.classList.toggle('bg-[#0B2A5B]', active);
            chip.classList.toggle('border-[#0B2A5B]', active);
            chip.classList.toggle('text-white', active);
            chip.classList.toggle('bg-white', !active);
            chip.classList.toggle('dark:bg-slate-900', !active);
            chip.classList.toggle('text-slate-700', !active);
            chip.classList.toggle('dark:text-slate-200', !active);
            chip.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        document.getElementById('ncBedError')?.classList.add('hidden');
        onNewContractBedChange(bedId);
    }

    function onNewContractGenderChange() {
        refreshNewContractStudents();
        refreshNewContractFloors();
        refreshNewContractRooms();
        onNewContractSelectionCheck();
    }

    function onNewContractFloorChange() {
        refreshNewContractRooms();
        onNewContractSelectionCheck();
    }

    function onNewContractRoomChange() {
        refreshNewContractBeds();
        onNewContractSelectionCheck();
    }

    function onNewContractSelectionCheck() {
        const studentSel = document.getElementById('ncMssv');
        const bedSel = document.getElementById('ncBedId');
        const hintEl = document.getElementById('ncCompatHint');
        if (!hintEl) return;

        const warnings = [];
        const mssv = studentSel?.value || '';
        const bedId = bedSel?.value || '';
        const selectedBed = (newContractPool?.beds || []).find(b => b.id === bedId);
        const studentOpt = studentSel?.selectedOptions?.[0];
        const studentGender = studentOpt?.dataset?.gender || '';
        const bedGender = selectedBed?.room?.gender || '';

        if (mssv) {
            const hasActive = (state.contracts || []).some(c => c.mssv === mssv && c.status !== 'Đã thanh lý' && c.status !== 'Đã hủy');
            if (hasActive) {
                warnings.push('Sinh viên này đang có hợp đồng chưa thanh lý trong năm học.');
            }
        }
        if (studentGender && bedGender && studentGender !== '—' && bedGender !== '—' && studentGender !== bedGender) {
            warnings.push(`Lưu ý: Giới tính sinh viên (${studentGender}) khác quy định tòa nhà (${bedGender}).`);
        }

        if (warnings.length > 0) {
            hintEl.textContent = warnings.join(' ');
            hintEl.classList.remove('hidden');
        } else {
            hintEl.textContent = '';
            hintEl.classList.add('hidden');
        }
    }

    function onNewContractBedChange(bedId) {
        const feeInput = document.getElementById('ncMonthlyFee');
        const depositInput = document.getElementById('ncDepositAmount');
        let fee = 0;

        for (const room of (state.rooms || [])) {
            if ((room.beds || []).some(bed => bed.id === bedId)) {
                fee = Number(room.pricePerMonth ?? room.price ?? 0);
                break;
            }
        }
        if (fee > 0) {
            if (feeInput) feeInput.value = fee;
            if (depositInput && (!depositInput.value || Number(depositInput.value) === 0)) {
                depositInput.value = fee;
            }
        }
        onNewContractSelectionCheck();
    }

    async function submitNewContract() {
        const mssv = document.getElementById('ncMssv').value;
        const bedId = document.getElementById('ncBedId').value;
        if (!bedId) {
            document.getElementById('ncBedError')?.classList.remove('hidden');
            showToast('Vui lòng chọn tầng, phòng và giường trước khi lập hợp đồng.', 'error');
            return;
        }
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
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.success) {
                showToast('Đã ban hành hợp đồng nội trú mới thành công!', 'success');
                closeModal();
                await Promise.all([loadContracts(), loadStudents(), loadRooms(), loadDashboard()]);
                if (['hop-dong', 'dashboard', 'sinh-vien', 'phong-va-giuong'].includes(state.currentTab)) {
                    renderActiveView();
                }
            } else {
                showToast(json.message || 'Không tạo được hợp đồng. Vui lòng kiểm tra giới tính tòa nhà, thời hạn và sinh viên.', 'error');
            }
        } catch (e) {
            showToast('Lỗi gửi yêu cầu lập hợp đồng', 'error');
        }
    }

    function importContractsExcel() {
        if (!state.selectedAcademicYear) {
            showToast('Vui lòng chọn năm học trước khi nhập hợp đồng.', 'error');
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
                const res = await fetch(`/api/hopdong/import?academicYear=${encodeURIComponent(state.selectedAcademicYear)}`, {
                    method: 'POST',
                    body: fd
                });
                const json = await res.json().catch(() => ({}));
                const result = json?.data || {};
                const msg = result.message || json?.message || (res.ok ? 'Tạo hợp đồng từ Excel thành công.' : 'Import hợp đồng thất bại.');
                const toastType = !res.ok || ((result.imported ?? 0) === 0 && (result.failed ?? 0) > 0)
                    ? 'error'
                    : ((result.failed ?? 0) > 0 ? 'info' : 'success');
                showToast(msg, toastType);
                if (res.ok) {
                    await Promise.all([loadContracts(), loadApplications(), loadStudents(), loadRooms(), loadDashboard()]);
                    if (['hop-dong', 'don-dang-ky', 'dashboard', 'sinh-vien', 'phong-va-giuong'].includes(state.currentTab)) {
                        renderActiveView();
                    }
                }
            } catch (err) {
                showToast('Import hợp đồng thất bại.', 'error');
            }
        };
        input.click();
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
                                    <h3 class="text-lg font-bold text-slate-900 dark:text-white">${escapeHtml(s.name)}</h3>
                                    <p class="text-xs text-slate-500 font-mono">MSSV: ${escapeHtml(s.mssv)} • ${escapeHtml(s.className)}</p>
                                </div>
                            </div>
                            <button onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600">
                                <span class="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div class="py-4 space-y-4 text-xs text-slate-700 dark:text-slate-300">
                            <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                                <span class="text-slate-400 font-semibold text-[10px] uppercase">Chỗ ở hiện tại</span>
                                <p class="font-bold text-sm text-[#0B2A5B] dark:text-blue-400">Phòng ${escapeHtml(s.roomNumber)} · Giường ${escapeHtml(s.bedNumber)}</p>
                                <p class="text-slate-500">Tòa ${escapeHtml(s.buildingId)} - Tầng ${escapeHtml(s.floor)}</p>
                                <p class="text-slate-500">Nhập KTX từ: ${escapeHtml(s.admissionDate)}</p>
                            </div>

                            <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-slate-400">Số CCCD / Định danh:</span>
                                    <span class="font-mono font-semibold">${escapeHtml(s.cccd)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-400">Số điện thoại liên lạc:</span>
                                    <span class="font-mono font-semibold">${escapeHtml(s.phone)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-400">Quê quán thường trú:</span>
                                    <span class="font-semibold">${escapeHtml(s.hometown)}</span>
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

    function buildContractA4Html(c, studentDetail) {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();

        const studentClass = studentDetail?.className ? escapeHtml(studentDetail.className) : '—';
        const studentCccd = studentDetail?.cccd ? escapeHtml(studentDetail.cccd) : '—';
        const studentPhone = studentDetail?.phone ? escapeHtml(studentDetail.phone) : '—';
        const studentHometown = studentDetail?.hometown ? escapeHtml(studentDetail.hometown) : '—';

        return `
            <div style="font-family: 'Times New Roman', Times, serif; color: #000000; background: #ffffff; font-size: 11.5pt; line-height: 1.42; page-break-inside: avoid; break-inside: avoid;">
                <div style="text-align: center; margin-bottom: 10px;">
                    <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div style="font-size: 11.5pt; font-weight: bold; margin-top: 1px;">Độc lập - Tự do - Hạnh phúc</div>
                    <div style="width: 140px; height: 1px; background: #000000; margin: 3px auto 8px;"></div>
                    <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-top: 4px;">HỢP ĐỒNG THUÊ CHỖ Ở NỘI TRÚ KÝ TÚC XÁ</div>
                    <div style="font-size: 11pt; font-style: italic; margin-top: 2px;">Số: ${escapeHtml(c.contractNumber)}/HĐ-KTX</div>
                </div>

                <p style="margin: 0 0 8px; text-align: justify; text-indent: 22px;">
                    Hôm nay, ngày ${day} tháng ${month} năm ${year}, tại Văn phòng Ban Quản lý Ký túc xá Phân hiệu Trường Đại học Giao thông Vận tải tại TP. Hồ Chí Minh, hai bên chúng tôi gồm có:
                </p>

                <div style="margin-bottom: 7px;">
                    <p style="margin: 0 0 2px; font-weight: bold;">I. BÊN CHO THUÊ CHỖ Ở NỘI TRÚ (BÊN A): BAN QUẢN LÝ KÝ TÚC XÁ UTC2</p>
                    <p style="margin: 0 0 2px; padding-left: 14px;">Đại diện: Ông Nguyễn Văn An &nbsp;—&nbsp; Chức vụ: Trưởng Ban Quản lý Ký túc xá</p>
                    <p style="margin: 0 0 2px; padding-left: 14px;">Địa chỉ: Số 450–451 Lê Văn Việt, Phường Tăng Nhơn Phú A, TP. Thủ Đức, TP. Hồ Chí Minh</p>
                    <p style="margin: 0; padding-left: 14px;">Điện thoại liên hệ: (028) 3896 6780</p>
                </div>

                <div style="margin-bottom: 7px;">
                    <p style="margin: 0 0 2px; font-weight: bold;">II. BÊN THUÊ CHỖ Ở NỘI TRÚ (BÊN B): SINH VIÊN</p>
                    <p style="margin: 0 0 2px; padding-left: 14px;">Họ và tên sinh viên: <strong>${escapeHtml(c.studentName)}</strong> &nbsp;—&nbsp; Giới tính: ${escapeHtml(c.gender || '—')}</p>
                    <p style="margin: 0 0 2px; padding-left: 14px;">Mã số sinh viên: <strong>${escapeHtml(c.mssv)}</strong> &nbsp;—&nbsp; Lớp: ${studentClass}</p>
                    <p style="margin: 0 0 2px; padding-left: 14px;">Số CCCD: ${studentCccd} &nbsp;—&nbsp; Điện thoại: ${studentPhone}</p>
                    <p style="margin: 0; padding-left: 14px;">Địa chỉ thường trú: ${studentHometown}</p>
                </div>

                <p style="margin: 6px 0 6px; text-align: justify;">
                    Sau khi thỏa thuận, hai bên thống nhất ký kết Hợp đồng thuê chỗ ở nội trú ký túc xá với các điều khoản cụ thể sau đây:
                </p>

                <div style="margin-bottom: 7px;">
                    <p style="margin: 0 0 2px; font-weight: bold;">Điều 1. Vị trí bố trí chỗ ở và thời hạn hợp đồng</p>
                    <p style="margin: 0 0 2px; padding-left: 14px;">1. Bên A đồng ý cho Bên B thuê 01 (một) giường tiêu chuẩn tại: <strong>Phòng ${escapeHtml(c.roomNumber)} – Giường ${escapeHtml(c.bedNumber)}</strong> (Tòa <strong>${escapeHtml(c.buildingId)}</strong>).</p>
                    <p style="margin: 0; padding-left: 14px;">2. Thời hạn thuê chỗ ở: Từ ngày <strong>${escapeHtml(c.startDate)}</strong> đến hết ngày <strong>${escapeHtml(c.endDate)}</strong>.</p>
                </div>

                <div style="margin-bottom: 7px;">
                    <p style="margin: 0 0 2px; font-weight: bold;">Điều 2. Giá thuê chỗ ở, tiền đặt cọc và phương thức thanh toán</p>
                    <p style="margin: 0 0 2px; padding-left: 14px;">1. Đơn giá tiền phòng hàng tháng: <strong>${formatVND(c.monthlyFee)}/tháng</strong>.</p>
                    <p style="margin: 0 0 2px; padding-left: 14px;">2. Tiền đặt cọc giữ chỗ &amp; bảo đảm tài sản: <strong>${formatVND(c.depositAmount)}</strong> (${escapeHtml(c.depositStatus)}).</p>
                    <p style="margin: 0; padding-left: 14px;">3. Chi phí điện, nước và dịch vụ phát sinh được thanh toán hàng tháng theo đơn giá quy định của Nhà trường.</p>
                </div>

                <div style="margin-bottom: 8px;">
                    <p style="margin: 0 0 2px; font-weight: bold;">Điều 3. Cam kết và hiệu lực thi hành</p>
                    <p style="margin: 0 0 2px; padding-left: 14px;">1. Hai bên cam kết thực hiện đúng Quy chế công tác sinh viên nội trú và Nội quy Ký túc xá Phân hiệu Trường Đại học Giao thông Vận tải tại TP. Hồ Chí Minh.</p>
                    <p style="margin: 0; padding-left: 14px;">2. Hợp đồng có hiệu lực kể từ ngày ký và được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản để thực hiện.</p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; text-align: center; margin-top: 14px; page-break-inside: avoid; break-inside: avoid;">
                    <div>
                        <div style="font-weight: bold; text-transform: uppercase;">ĐẠI DIỆN BÊN B</div>
                        <div style="font-size: 10.5pt; font-style: italic;">(Ký và ghi rõ họ tên)</div>
                        <div style="height: 44px;"></div>
                        <div style="font-weight: bold;">${escapeHtml(c.studentName)}</div>
                    </div>
                    <div>
                        <div style="font-weight: bold; text-transform: uppercase;">ĐẠI DIỆN BÊN A</div>
                        <div style="font-size: 10.5pt; font-style: italic;">(Ký tên và đóng dấu)</div>
                        <div style="height: 44px;"></div>
                        <div style="font-weight: bold;">Nguyễn Văn An</div>
                    </div>
                </div>
            </div>
        `;
    }

    function printContractDocument() {
        const sheetEl = document.getElementById('contractPrintSheet');
        if (!sheetEl) {
            window.print();
            return;
        }

        let printFrame = document.getElementById('ktxContractPrintFrame');
        if (printFrame) printFrame.remove();

        printFrame = document.createElement('iframe');
        printFrame.id = 'ktxContractPrintFrame';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.setAttribute('aria-hidden', 'true');
        document.body.appendChild(printFrame);

        const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
        if (!doc) {
            window.print();
            return;
        }

        doc.open();
        doc.write(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Hợp đồng nội trú KTX UTC2</title>
<style>
@page { size: A4 portrait; margin: 12mm 16mm; }
html, body { margin: 0; padding: 0; background: #ffffff; color: #000000; page-break-after: avoid; break-after: avoid; }
</style>
</head>
<body>${sheetEl.innerHTML}</body>
</html>`);
        doc.close();

        setTimeout(() => {
            try {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
            } catch (err) {
                window.print();
            }
        }, 120);
    }

    async function openPrintModal(contractNumber) {
        try {
            const res = await fetch(`/api/hopdong/${encodeURIComponent(contractNumber)}`);
            const json = await res.json();
            if (!json.success || !json.data) {
                showToast('Không tìm thấy thông tin hợp đồng.', 'error');
                return;
            }
            const c = json.data;

            let studentDetail = (state.students || []).find(s => s.mssv === c.mssv) || null;
            if (!studentDetail && c.mssv) {
                try {
                    const sRes = await fetch(`/api/sinhvien/${encodeURIComponent(c.mssv)}`);
                    const sJson = await sRes.json().catch(() => null);
                    if (sRes.ok && sJson?.success && sJson.data) studentDetail = sJson.data;
                } catch (_) {}
            }

            const container = document.getElementById('modalsContainer');
            if (!container) return;

            document.body.classList.add('ktx-printing-contract');
            container.innerHTML = `
                <div id="contractPrintModalShell" class="fixed inset-0 z-50 flex flex-col items-center justify-start p-4 md:p-6 bg-black/65 backdrop-blur-xs overflow-y-auto animate-fade-in" onclick="if (event.target === this) KtxApp.closeModal()">
                    <div class="no-print w-full max-w-[210mm] shrink-0 flex items-center justify-between gap-3 mb-3 px-4 py-3 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-lg" onclick="event.stopPropagation()">
                        <div class="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                            <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">description</span>
                            <span>Xem trước văn bản hợp đồng (Khổ A4) · ${escapeHtml(c.contractNumber)}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">Đóng</button>
                            <button type="button" onclick="KtxApp.printContractDocument()" class="px-4 py-1.5 rounded-lg bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                                <span class="material-symbols-outlined text-[16px]">print</span>
                                <span>In văn bản hợp đồng</span>
                            </button>
                        </div>
                    </div>

                    <div id="contractPrintSheet" onclick="event.stopPropagation()" class="w-full max-w-[210mm] h-auto bg-white text-black px-10 py-8 mb-6 shrink-0 shadow-2xl border border-slate-200">
                        ${buildContractA4Html(c, studentDetail)}
                    </div>
                </div>
            `;
        } catch (e) {
            console.error(e);
            showToast('Không tải được bản in hợp đồng.', 'error');
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
                                        <span class="w-7 h-7 rounded-lg bg-white dark:bg-[#0B0F1A] shadow-2xs flex items-center justify-center font-mono font-bold text-[#0B2A5B] dark:text-blue-400">${escapeHtml(b.bedNumber)}</span>
                                        <div>
                                            <div class="font-semibold text-slate-900 dark:text-white">${escapeHtml(b.studentName || b.status)}</div>
                                            ${b.mssv ? `<div class="text-[10px] text-slate-400 font-mono">MSSV: ${escapeHtml(b.mssv)}</div>` : ''}
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
                        <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200">Đóng</button>
                    </div>
                </div>
            </div>
        `;
    }

    async function toggleBedMaintenance(bedId) {
        try {
            const res = await fetch(`/api/phong/beds/${bedId}/toggle-maintenance`, { method: 'POST' });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.success) {
                showToast(json.message, 'success');
                await loadRooms();
                closeModal();
                if (state.currentTab === 'phong-va-giuong') renderActiveView();
            } else {
                showToast(json.message || 'Không thể cập nhật trạng thái bảo trì giường.', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Lỗi kết nối khi cập nhật trạng thái giường.', 'error');
        }
    }

    function closeAdmissionsActionMenus() {
        closeActionMenusByAttr('[data-admissions-menu="true"]');
    }

    function toggleAdmissionsActionMenu(appId, event) {
        if (event) event.stopPropagation();
        closeContractsActionMenus();
        closeStudentsActionMenus();
        closeAcademicYearActionMenus();
        closeRoundsActionMenus();
        const menu = document.getElementById(`admissions-action-menu-${appId}`);
        if (!menu) return;
        const wasHidden = menu.classList.contains('hidden');
        closeAdmissionsActionMenus();
        if (!wasHidden) return;

        const trigger = event?.currentTarget || menu.parentElement?.querySelector(`button[aria-controls="admissions-action-menu-${appId}"]`);
        menu.classList.remove('hidden');
        positionFloatingActionMenu(menu, trigger, 224, 190);
    }

    function inspectCandidate(appId) {
        const app = (state.applications || []).find(a => a.id === appId);
        if (!app) return;
        const container = document.getElementById('modalsContainer');
        if (!container) return;

        const safeAppId = escapeHtml(String(app.id ?? ''));
        const safeStudentName = escapeHtml(String(app.studentName || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
        const isPending = app.status === 'Chờ duyệt';
        const isRejected = app.status === 'Bị từ chối';
        const statusBadgeClass = app.status === 'Đã duyệt'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
            : (isPending
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60');
        const classCohort = [
            app.className && app.className !== '—' ? app.className : '',
            app.intakeYear ? `Khóa ${app.intakeYear}` : (app.cohort && app.cohort !== '—' ? app.cohort : '')
        ].filter(Boolean).join(' · ') || '—';
        const feeText = app.monthlyFee != null ? `${formatVND(app.monthlyFee)} / tháng` : '—';
        const rejectionText = app.rejectionReason || (isRejected ? (app.note || 'Chưa cập nhật lý do') : '');

        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxApp.closeModal()">
                <div class="w-full max-w-2xl bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] overflow-hidden" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0F1A]">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-12 h-12 rounded-full ring-2 ring-[#0B2A5B]/20 bg-blue-100 text-[#0B2A5B] flex items-center justify-center text-lg font-bold shrink-0">${getUserInitial(app.studentName)}</span>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="text-base font-bold text-slate-900 dark:text-white truncate">${escapeHtml(app.studentName)}</h3>
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeClass}">${escapeHtml(app.status)}</span>
                                </div>
                                <p class="text-xs text-slate-500 font-mono mt-0.5">${escapeHtml(app.applicationCode)} · MSSV: ${escapeHtml(app.mssv || '—')}</p>
                            </div>
                        </div>
                        <button type="button" onclick="KtxApp.closeModal()" aria-label="Đóng chi tiết hồ sơ" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
                        ${isRejected ? `
                            <div class="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 space-y-1">
                                <div class="font-bold flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-[16px]">cancel</span>
                                    <span>Lý do từ chối hồ sơ</span>
                                </div>
                                <p class="leading-relaxed">${escapeHtml(rejectionText)}</p>
                            </div>
                        ` : ''}

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="p-5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70">
                                <h4 class="text-xs font-bold uppercase tracking-wider text-[#0B2A5B] dark:text-blue-300 pb-2.5 mb-2 border-b border-slate-200/80 dark:border-slate-700/70">Thông tin sinh viên</h4>
                                <div class="divide-y divide-slate-200/60 dark:divide-slate-700/50">
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Giới tính</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right">${escapeHtml(app.gender || '—')}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Ngày sinh</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right">${escapeHtml(app.dateOfBirth || '—')}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Số CCCD</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right">${escapeHtml(app.cccd || '—')}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Lớp / Khóa</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right">${escapeHtml(classCohort)}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Khoa / Ngành</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right">${escapeHtml(app.major || '—')}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Điện thoại</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right">${escapeHtml(app.phone || '—')}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Email</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right break-all">${escapeHtml(app.email || '—')}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Thường trú</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right">${escapeHtml(app.hometown || '—')}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Diện ưu tiên</span><span class="font-semibold text-[#0B2A5B] dark:text-blue-300 text-right">${escapeHtml(app.priorityCategory || 'Không')}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Lịch sử lưu trú</span><span class="font-semibold text-right ${app.hasStayedBefore ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}">${app.hasStayedBefore ? 'Đã từng ở KTX' : 'Chưa từng ở KTX'}</span></div>
                                </div>
                            </div>

                            <div class="p-5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70">
                                <h4 class="text-xs font-bold uppercase tracking-wider text-[#0B2A5B] dark:text-blue-300 pb-2.5 mb-2 border-b border-slate-200/80 dark:border-slate-700/70">Chi tiết đơn đăng ký</h4>
                                <div class="divide-y divide-slate-200/60 dark:divide-slate-700/50">
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Mã hồ sơ</span><span class="font-bold text-slate-900 dark:text-white text-right">${escapeHtml(app.applicationCode)}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Đợt đăng ký</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right">${escapeHtml(app.roundName || app.roundCode || '—')}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Nguyện vọng phòng</span><span class="font-semibold text-[#0B2A5B] dark:text-blue-300 text-right">${escapeHtml(app.roomPreference || '—')}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Tòa nhà</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right">${escapeHtml(app.buildingName || '—')}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Đơn giá dự kiến</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right">${escapeHtml(feeText)}</span></div>
                                    <div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Thời gian nộp</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right">${escapeHtml(app.submittedAt || '—')}</span></div>
                                    ${app.approvedAt ? `<div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Ngày xử lý</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right">${escapeHtml(app.approvedAt)}</span></div>` : ''}
                                    ${app.approvedBy ? `<div class="py-2 flex justify-between gap-4"><span class="text-slate-500 dark:text-slate-400 font-medium shrink-0">Người xử lý</span><span class="font-semibold text-slate-800 dark:text-slate-100 text-right">${escapeHtml(app.approvedBy)}</span></div>` : ''}
                                    ${app.note && !isRejected ? `<div class="pt-3"><span class="text-slate-500 dark:text-slate-400 font-medium block mb-1">Ghi chú hồ sơ</span><p class="font-medium text-slate-700 dark:text-slate-200 leading-relaxed">${escapeHtml(app.note)}</p></div>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F1A]">
                        <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50">Đóng</button>
                        ${isPending ? `
                            <button type="button" onclick="KtxApp.rejectApp('${safeAppId}', '${safeStudentName}')" class="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 font-semibold text-xs transition-colors">Từ chối đơn</button>
                            <button type="button" onclick="KtxApp.closeModal(); KtxApp.confirmApproveApp('${safeAppId}', '${safeStudentName}')" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-xs transition-colors">Duyệt hồ sơ</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function confirmApproveApp(appId, studentName) {
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        const app = (state.applications || []).find(a => a.id === appId);
        const displayName = studentName || app?.studentName || 'sinh viên';
        const displayCode = app?.applicationCode || `#${appId}`;
        const safeAppId = escapeHtml(String(appId ?? ''));
        const roomPref = app?.roomPreference || '—';
        const feeText = app?.monthlyFee != null ? `${formatVND(app.monthlyFee)} / tháng` : '—';

        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxApp.closeModal()">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <span class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-400 flex items-center justify-center">
                            <span class="material-symbols-outlined text-[20px]">verified</span>
                        </span>
                        <div>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Xác nhận duyệt hồ sơ</h3>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Hành động này sẽ tự động tạo hợp đồng giữ chỗ 24h.</p>
                        </div>
                    </div>
                    <div class="py-4 space-y-2 text-xs">
                        <div class="flex justify-between gap-3"><span class="text-slate-400">Hồ sơ:</span><span class="font-mono font-bold text-slate-900 dark:text-white">${escapeHtml(displayCode)}</span></div>
                        <div class="flex justify-between gap-3"><span class="text-slate-400">Sinh viên:</span><span class="font-semibold text-slate-900 dark:text-white">${escapeHtml(displayName)}</span></div>
                        <div class="flex justify-between gap-3"><span class="text-slate-400">Nguyện vọng:</span><span class="font-semibold text-[#0B2A5B] dark:text-blue-400">${escapeHtml(roomPref)}</span></div>
                        <div class="flex justify-between gap-3"><span class="text-slate-400">Đơn giá:</span><span class="font-semibold">${escapeHtml(feeText)}</span></div>
                    </div>
                    <div class="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Hủy</button>
                        <button type="button" onclick="KtxApp.closeModal(); KtxApp.approveApp('${safeAppId}', '${escapeHtml(displayName).replace(/'/g, "\\\\'")}');" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-xs transition-colors">Xác nhận duyệt</button>
                    </div>
                </div>
            </div>
        `;
    }

    async function approveApp(appId, studentName) {
        try {
            const res = await fetch(`/api/dondangky/${encodeURIComponent(appId)}/approve`, { method: 'POST' });
            const json = await res.json();
            if (res.ok && json.success) {
                showToast(`Đã duyệt: ${studentName}! Đã tự động tạo hợp đồng giữ chỗ 24h.`, 'success');
                await loadApplications();
                if (state.currentTab === 'don-dang-ky') renderActiveView();
            } else {
                showToast(json.message || 'Không thể duyệt hồ sơ.', 'error');
            }
        } catch (e) {
            showToast('Lỗi duyệt hồ sơ', 'error');
        }
    }

    function openPaymentProofReview(appId) {
        const app = (state.applications || []).find(a => a.id === appId);
        const container = document.getElementById('modalsContainer');
        if (!app || !container || !app.invoiceId) return;

        const year = state.selectedAcademicYear || '';
        const yearQuery = year ? `&academicYear=${encodeURIComponent(year)}` : '';
        const proofSrc = `/api/hoadon/${encodeURIComponent(app.invoiceId)}/student-proof?v=${Date.now()}${yearQuery}`;
        const feeText = app.monthlyFee != null ? `${formatVND(app.monthlyFee)} / tháng` : '—';

        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxApp.closeModal()">
                <div class="w-full max-w-2xl bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] overflow-hidden" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0F1A]">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-[20px]">receipt_long</span>
                            </span>
                            <div class="min-w-0">
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Đối soát minh chứng thanh toán</h3>
                                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">${escapeHtml(app.applicationCode)} · Hóa đơn ${escapeHtml(app.invoiceId)}</p>
                            </div>
                        </div>
                        <button type="button" onclick="KtxApp.closeModal()" aria-label="Đóng hộp thoại đối soát" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
                        <div class="grid grid-cols-2 gap-x-6 gap-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
                            <div class="flex justify-between gap-3"><span class="text-slate-400">Sinh viên:</span><span class="font-semibold text-right">${escapeHtml(app.studentName)}</span></div>
                            <div class="flex justify-between gap-3"><span class="text-slate-400">MSSV:</span><span class="font-mono font-semibold text-right">${escapeHtml(app.mssv || '—')}</span></div>
                            <div class="flex justify-between gap-3"><span class="text-slate-400">Phòng:</span><span class="font-semibold text-right">${escapeHtml(app.roomPreference || '—')}</span></div>
                            <div class="flex justify-between gap-3"><span class="text-slate-400">Đơn giá:</span><span class="font-semibold text-right">${escapeHtml(feeText)}</span></div>
                            <div class="flex justify-between gap-3 col-span-2"><span class="text-slate-400">Nộp minh chứng lúc:</span><span class="font-semibold font-mono text-right">${escapeHtml(app.proofSubmittedAt || '—')}</span></div>
                        </div>

                        <div>
                            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">Ảnh minh chứng sinh viên nộp</span>
                            <img src="${proofSrc}" alt="Ảnh minh chứng thanh toán của sinh viên ${escapeHtml(app.studentName)}" class="w-full max-h-[48vh] object-contain rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800" onerror="this.classList.add('hidden'); this.nextElementSibling?.classList.remove('hidden');" />
                            <div class="hidden py-10 text-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                                <span class="material-symbols-outlined text-[28px] text-slate-300">broken_image</span>
                                <p class="text-[11px] text-slate-500">Không hiển thị được ảnh minh chứng (tệp hỏng hoặc không còn tồn tại). Hãy yêu cầu sinh viên nộp lại.</p>
                                <a href="${proofSrc}" target="_blank" rel="noopener" class="inline-block text-[11px] font-semibold text-[#0B2A5B] dark:text-blue-400 hover:underline">Mở ảnh ở tab mới</a>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F1A]">
                        <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50">Đóng</button>
                        <button type="button" onclick="KtxApp.openRejectProof('${escapeHtml(String(app.id))}')" class="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 font-semibold text-xs transition-colors">Từ chối minh chứng</button>
                        <button type="button" onclick="KtxApp.confirmProofApprove('${escapeHtml(String(app.id))}')" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors">Đồng ý thanh toán</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Bước xác nhận lần 2 trước khi ghi nhận tiền: thao tác này kích hoạt hợp đồng.
    function confirmProofApprove(appId) {
        const app = (state.applications || []).find(a => a.id === appId);
        const container = document.getElementById('modalsContainer');
        if (!app || !container) return;
        const feeText = app.monthlyFee != null ? formatVND(app.monthlyFee) : '—';

        container.innerHTML = `
            <div class="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxApp.closeModal()">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <span class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <span class="material-symbols-outlined text-[20px]">price_check</span>
                        </span>
                        <div>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Xác nhận đã nhận tiền</h3>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Hợp đồng giữ chỗ sẽ chuyển sang hiệu lực ngay sau bước này.</p>
                        </div>
                    </div>
                    <div class="py-4 space-y-2 text-xs">
                        <div class="flex justify-between gap-3"><span class="text-slate-400">Sinh viên:</span><span class="font-semibold text-slate-900 dark:text-white">${escapeHtml(app.studentName)}</span></div>
                        <div class="flex justify-between gap-3"><span class="text-slate-400">Hóa đơn:</span><span class="font-mono font-semibold">${escapeHtml(app.invoiceId || '—')}</span></div>
                        <div class="flex justify-between gap-3"><span class="text-slate-400">Số tiền ghi nhận:</span><span class="font-bold text-emerald-600 dark:text-emerald-400">${escapeHtml(feeText)}</span></div>
                    </div>
                    <div class="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onclick="KtxApp.openPaymentProofReview('${escapeHtml(String(app.id))}')" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Quay lại</button>
                        <button type="button" onclick="KtxApp.submitProofApprove('${escapeHtml(String(app.id))}', this)" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-60">Xác nhận đã nhận tiền</button>
                    </div>
                </div>
            </div>
        `;
    }

    async function submitProofApprove(appId, btn) {
        const app = (state.applications || []).find(a => a.id === appId);
        if (!app || !app.invoiceId) return;
        if (btn) { btn.disabled = true; btn.textContent = 'Đang xử lý...'; }

        const fd = new FormData();
        fd.append('invoiceId', app.invoiceId);
        fd.append('paymentMethod', 'Chuyển khoản');
        const year = state.selectedAcademicYear || '';
        const url = `/api/hoadon/confirm-payment${year ? `?academicYear=${encodeURIComponent(year)}` : ''}`;

        try {
            const res = await fetch(url, { method: 'POST', body: fd });
            const json = await res.json();
            if (res.ok && json.success) {
                closeModal();
                showToast(json.message || 'Đã xác nhận thanh toán và hoàn tất đăng ký phòng.', 'success');
                await loadApplications();
                if (state.currentTab === 'don-dang-ky') renderActiveView();
            } else {
                showToast(json.message || 'Không thể xác nhận thanh toán.', 'error');
                if (btn) { btn.disabled = false; btn.textContent = 'Xác nhận đã nhận tiền'; }
            }
        } catch (e) {
            showToast('Lỗi kết nối máy chủ', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Xác nhận đã nhận tiền'; }
        }
    }

    function openRejectProof(appId) {
        const app = (state.applications || []).find(a => a.id === appId);
        const container = document.getElementById('modalsContainer');
        if (!app || !container) return;
        const quickReasons = [
            'Ảnh minh chứng mờ, không đọc được số tiền hoặc nội dung chuyển khoản',
            'Số tiền chuyển khoản không khớp với hóa đơn',
            'Minh chứng không phải giao dịch cho hóa đơn này'
        ];

        container.innerHTML = `
            <div class="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxApp.closeModal()">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                                <span class="material-symbols-outlined text-[18px]">block</span>
                            </span>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Từ chối minh chứng</h3>
                        </div>
                        <button type="button" onclick="KtxApp.closeModal()" aria-label="Đóng hộp thoại" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxApp.submitRejectProof('${escapeHtml(String(app.id))}');" class="space-y-4 pt-4 text-xs">
                        <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Từ chối minh chứng của <strong class="text-slate-900 dark:text-white">${escapeHtml(app.studentName)}</strong>. Lý do sẽ được gửi tới sinh viên; trong thời hạn giữ chỗ 24 giờ sinh viên có thể nộp lại minh chứng.
                        </p>
                        <div>
                            <label for="proofRejectReasonInput" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Lý do từ chối <span class="text-red-500">*</span></label>
                            <textarea id="proofRejectReasonInput" required rows="3" maxlength="255" placeholder="Nhập lý do cụ thể để sinh viên biết cách khắc phục..." class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"></textarea>
                            <p id="proofRejectReasonError" class="hidden text-[11px] text-red-600 font-medium mt-1">Vui lòng nhập lý do từ chối trước khi xác nhận.</p>
                        </div>
                        <div class="space-y-1.5">
                            <span class="text-[11px] text-slate-400 block">Gợi ý lý do nhanh:</span>
                            <div class="flex flex-wrap gap-1.5">
                                ${quickReasons.map(r => `
                                    <button type="button" onclick="document.getElementById('proofRejectReasonInput').value = '${escapeHtml(r)}'; document.getElementById('proofRejectReasonError')?.classList.add('hidden');" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] text-slate-700 dark:text-slate-300 transition-colors text-left">${escapeHtml(r)}</button>
                                `).join('')}
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.openPaymentProofReview('${escapeHtml(String(app.id))}')" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Quay lại</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs transition-colors">Xác nhận từ chối</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitRejectProof(appId) {
        const app = (state.applications || []).find(a => a.id === appId);
        const input = document.getElementById('proofRejectReasonInput');
        const errorEl = document.getElementById('proofRejectReasonError');
        if (!app || !app.invoiceId || !input) return;

        const reason = input.value.trim();
        if (!reason) {
            errorEl?.classList.remove('hidden');
            input.focus();
            return;
        }
        errorEl?.classList.add('hidden');

        const year = state.selectedAcademicYear || '';
        const url = `/api/hoadon/${encodeURIComponent(app.invoiceId)}/reject-payment-proof${year ? `?academicYear=${encodeURIComponent(year)}` : ''}`;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const json = await res.json();
            if (res.ok && json.success) {
                closeModal();
                showToast(json.message || 'Đã từ chối minh chứng. Sinh viên có thể nộp lại trong thời hạn giữ chỗ.', 'success');
                await loadApplications();
                if (state.currentTab === 'don-dang-ky') renderActiveView();
            } else {
                showToast(json.message || 'Không thể từ chối minh chứng.', 'error');
            }
        } catch (e) {
            showToast('Lỗi kết nối máy chủ', 'error');
        }
    }

    function rejectApp(appId, studentName) {
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        const app = (state.applications || []).find(a => a.id === appId);
        const displayName = studentName || app?.studentName || 'sinh viên';
        const displayCode = app?.applicationCode || `#${appId}`;
        const safeAppId = escapeHtml(String(appId ?? ''));
        const quickReasons = [
            'Không thuộc diện ưu tiên xét duyệt trong đợt này',
            'Phòng đăng ký đã hết chỉ tiêu giường trống',
            'Thông tin hồ sơ hoặc minh chứng chưa đầy đủ'
        ];

        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxApp.closeModal()">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                                <span class="material-symbols-outlined text-[18px]">block</span>
                            </span>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Từ chối đơn đăng ký</h3>
                        </div>
                        <button type="button" onclick="KtxApp.closeModal()" aria-label="Đóng hộp thoại" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxApp.submitRejectApp('${safeAppId}');" class="space-y-4 pt-4 text-xs">
                        <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Bạn đang thao tác từ chối hồ sơ <strong class="font-mono text-slate-900 dark:text-white">${escapeHtml(displayCode)}</strong> của sinh viên <strong class="text-slate-900 dark:text-white">${escapeHtml(displayName)}</strong>. Lý do sẽ được gửi trực tiếp cho sinh viên.
                        </p>
                        <div>
                            <label for="rejectReasonInput" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Lý do từ chối <span class="text-red-500">*</span></label>
                            <textarea id="rejectReasonInput" required rows="3" maxlength="255" placeholder="Nhập lý do từ chối cụ thể..." class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"></textarea>
                            <p id="rejectReasonError" class="hidden text-[11px] text-red-600 font-medium mt-1">Vui lòng nhập lý do từ chối trước khi xác nhận.</p>
                        </div>
                        <div class="space-y-1.5">
                            <span class="text-[11px] text-slate-400 block">Gợi ý lý do nhanh:</span>
                            <div class="flex flex-wrap gap-1.5">
                                ${quickReasons.map(r => `
                                    <button type="button" onclick="document.getElementById('rejectReasonInput').value = '${escapeHtml(r)}'; document.getElementById('rejectReasonError')?.classList.add('hidden');" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] text-slate-700 dark:text-slate-300 transition-colors text-left">${escapeHtml(r)}</button>
                                `).join('')}
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                            <button type="submit" class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs">Xác nhận từ chối</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        setTimeout(() => document.getElementById('rejectReasonInput')?.focus(), 50);
    }

    async function submitRejectApp(appId) {
        const input = document.getElementById('rejectReasonInput');
        const err = document.getElementById('rejectReasonError');
        const reason = (input?.value || '').trim();
        if (!reason) {
            err?.classList.remove('hidden');
            input?.focus();
            return;
        }
        err?.classList.add('hidden');

        try {
            const res = await fetch(`/api/dondangky/${encodeURIComponent(appId)}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId: appId, reason })
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.success) {
                closeModal();
                showToast(json.message || 'Đã từ chối đơn đăng ký.', 'success');
                await loadApplications();
                if (state.currentTab === 'don-dang-ky') renderActiveView();
            } else {
                showToast(json?.message || 'Không thể từ chối hồ sơ.', 'error');
            }
        } catch (e) {
            showToast('Lỗi từ chối hồ sơ', 'error');
        }
    }

    function closeActionMenusByAttr(selector) {
        document.querySelectorAll(selector).forEach(menu => {
            menu.classList.add('hidden');
            const trigger = menu.parentElement?.querySelector(`button[aria-controls="${menu.id}"]`);
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
    }

    /**
     * Tìm tổ tiên đang tạo containing block cho phần tử position: fixed
     * (transform / filter / perspective / contain) — nếu có, toạ độ left/top
     * của menu phải quy đổi theo gốc của tổ tiên đó thay vì viewport.
     */
    function getFixedContainingBlock(el) {
        let node = el?.parentElement;
        while (node && node !== document.body && node !== document.documentElement) {
            const style = window.getComputedStyle(node);
            const createsBlock =
                (style.transform && style.transform !== 'none') ||
                (style.filter && style.filter !== 'none') ||
                (style.backdropFilter && style.backdropFilter !== 'none') ||
                (style.perspective && style.perspective !== 'none') ||
                (style.contain && /paint|layout|strict|content/.test(style.contain));
            if (createsBlock) return node;
            node = node.parentElement;
        }
        return null;
    }

    function getFixedContainingBlockOrigin(el) {
        const block = getFixedContainingBlock(el);
        if (!block) return { x: 0, y: 0 };
        const rect = block.getBoundingClientRect();
        return {
            x: rect.left + block.clientLeft - block.scrollLeft,
            y: rect.top + block.clientTop - block.scrollTop
        };
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
        const origin = getFixedContainingBlockOrigin(menu);
        menu.style.left = `${Math.round(left - origin.x)}px`;
        menu.style.top = `${Math.round(top - origin.y)}px`;
    }

    function closeContractsActionMenus() {
        closeActionMenusByAttr('[data-contracts-menu="true"]');
    }

    function toggleContractsActionMenu(contractId, event) {
        if (event) event.stopPropagation();
        closeAdmissionsActionMenus();
        closeStudentsActionMenus();
        closeAcademicYearActionMenus();
        closeRoundsActionMenus();
        const menu = document.getElementById(`contracts-action-menu-${contractId}`);
        if (!menu) return;
        const wasHidden = menu.classList.contains('hidden');
        closeContractsActionMenus();
        if (!wasHidden) return;

        const trigger = event?.currentTarget || menu.parentElement?.querySelector(`button[aria-controls="contracts-action-menu-${contractId}"]`);
        menu.classList.remove('hidden');
        positionFloatingActionMenu(menu, trigger, 208, 160);
    }

    function closeStudentsActionMenus() {
        closeActionMenusByAttr('[data-students-menu="true"]');
    }

    function toggleStudentsActionMenu(mssv, event) {
        if (event) event.stopPropagation();
        closeAdmissionsActionMenus();
        closeContractsActionMenus();
        closeAcademicYearActionMenus();
        closeRoundsActionMenus();
        const menu = document.getElementById(`students-action-menu-${mssv}`);
        if (!menu) return;
        const wasHidden = menu.classList.contains('hidden');
        closeStudentsActionMenus();
        if (!wasHidden) return;

        const trigger = event?.currentTarget || menu.parentElement?.querySelector(`button[aria-controls="students-action-menu-${mssv}"]`);
        menu.classList.remove('hidden');
        positionFloatingActionMenu(menu, trigger, 208, 96);
    }

    function closeAcademicYearActionMenus() {
        closeActionMenusByAttr('[data-academic-year-menu="true"]');
    }

    function toggleAcademicYearActionMenu(code, event) {
        if (event) event.stopPropagation();
        closeAdmissionsActionMenus();
        closeContractsActionMenus();
        closeStudentsActionMenus();
        const safeCode = String(code || '').replace(/'/g, "\\'");
        const menu = document.getElementById(`academic-year-action-menu-${code}`);
        if (!menu) return;
        const wasHidden = menu.classList.contains('hidden');
        closeAcademicYearActionMenus();
        closeRoundsActionMenus();
        if (!wasHidden) return;
        const trigger = event?.currentTarget || menu.parentElement?.querySelector(`button[aria-controls="academic-year-action-menu-${code}"]`);
        menu.classList.remove('hidden');
        positionFloatingActionMenu(menu, trigger, 216, 120);
    }

    function closeRoundsActionMenus() {
        closeActionMenusByAttr('[data-rounds-menu="true"]');
    }

    function toggleRoundsActionMenu(code, event) {
        if (event) event.stopPropagation();
        closeAdmissionsActionMenus();
        closeContractsActionMenus();
        closeStudentsActionMenus();
        closeAcademicYearActionMenus();
        closeRoundsActionMenus();
        const menu = document.getElementById(`rounds-action-menu-${code}`);
        if (!menu) return;
        const wasHidden = menu.classList.contains('hidden');
        closeRoundsActionMenus();
        if (!wasHidden) return;
        const trigger = event?.currentTarget || menu.parentElement?.querySelector(`button[aria-controls="rounds-action-menu-${code}"]`);
        menu.classList.remove('hidden');
        positionFloatingActionMenu(menu, trigger, 216, 136);
    }

    function addMonthsToVnDate(ddmmyyyy, monthsToAdd) {
        const parts = String(ddmmyyyy || '').split('/');
        if (parts.length !== 3) return ddmmyyyy || '—';
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return ddmmyyyy;
        const dt = new Date(year, month + Number(monthsToAdd || 0), day);
        const targetMonth = (month + Number(monthsToAdd || 0)) % 12;
        if (dt.getMonth() !== (targetMonth < 0 ? targetMonth + 12 : targetMonth)) {
            dt.setDate(0);
        }
        return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
    }

    async function findContractForAction(contractNumber) {
        let c = (state.contracts || []).find(item => item.contractNumber === contractNumber || item.id === contractNumber);
        if (!c) {
            try {
                const res = await fetch(`/api/hopdong/${encodeURIComponent(contractNumber)}`);
                const json = await res.json().catch(() => null);
                if (res.ok && json?.success && json.data) c = json.data;
            } catch (_) {}
        }
        return c || null;
    }

    async function openRenewContractModal(contractNumber) {
        const c = await findContractForAction(contractNumber);
        if (!c) {
            showToast('Không tìm thấy thông tin hợp đồng.', 'error');
            return;
        }
        const container = document.getElementById('modalsContainer');
        if (!container) return;

        const safeContractJs = escapeHtml(String(c.contractNumber || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
        const safeEndJs = escapeHtml(String(c.endDate || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
        const defaultMonths = 5;
        const previewDate = addMonthsToVnDate(c.endDate, defaultMonths);

        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxApp.closeModal()">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B]" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">update</span>
                            <div>
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Gia hạn hợp đồng</h3>
                                <p class="text-[11px] font-mono text-slate-500 mt-0.5">Mã HĐ: ${escapeHtml(c.contractNumber)}</p>
                            </div>
                        </div>
                        <button type="button" onclick="KtxApp.closeModal()" aria-label="Đóng" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <form onsubmit="event.preventDefault(); KtxApp.submitRenewContract('${safeContractJs}');" class="py-4 space-y-4 text-xs">
                        <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200/80 dark:border-[#232B3B] space-y-1">
                            <div class="font-bold text-slate-900 dark:text-white">${escapeHtml(c.studentName)} <span class="font-mono font-normal text-slate-500">(${escapeHtml(c.mssv)})</span></div>
                            <div class="text-slate-600 dark:text-slate-300">Phòng <strong>${escapeHtml(c.roomNumber)}</strong> · Giường <strong>${escapeHtml(c.bedNumber)}</strong> (Tòa ${escapeHtml(c.buildingId)})</div>
                            <div class="text-slate-500">Thời hạn hiện tại: <strong class="text-slate-800 dark:text-slate-200">${escapeHtml(c.startDate)} → ${escapeHtml(c.endDate)}</strong></div>
                        </div>

                        <div>
                            <label for="renewMonthsSelect" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Thời gian gia hạn thêm</label>
                            <select id="renewMonthsSelect" onchange="KtxApp.updateRenewEndPreview('${safeEndJs}', this.value)" class="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                                <option value="1">1 tháng</option>
                                <option value="3">3 tháng</option>
                                <option value="5" selected>5 tháng (1 học kỳ)</option>
                                <option value="6">6 tháng</option>
                                <option value="9">9 tháng</option>
                                <option value="12">12 tháng</option>
                            </select>
                        </div>

                        <div class="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 flex items-center justify-between">
                            <span class="text-slate-600 dark:text-slate-300 font-medium">Ngày kết thúc mới dự kiến:</span>
                            <span id="renewEndDatePreview" class="font-mono font-bold text-sm text-[#0B2A5B] dark:text-blue-400">${escapeHtml(previewDate)}</span>
                        </div>

                        <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100">Hủy</button>
                            <button type="submit" class="px-4 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[16px]">check</span>
                                <span>Xác nhận gia hạn</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    function updateRenewEndPreview(currentEndStr, months) {
        const previewEl = document.getElementById('renewEndDatePreview');
        if (!previewEl) return;
        previewEl.textContent = addMonthsToVnDate(currentEndStr, months);
    }

    async function submitRenewContract(contractNumber) {
        const monthsSelect = document.getElementById('renewMonthsSelect');
        const months = parseInt(monthsSelect?.value || '5', 10) || 5;
        try {
            const res = await fetch(`/api/hopdong/${encodeURIComponent(contractNumber)}/renew?months=${months}`, { method: 'POST' });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.success) {
                showToast(json.message || `Gia hạn hợp đồng ${contractNumber} thêm ${months} tháng thành công!`, 'success');
                closeModal();
                await Promise.all([loadContracts(), loadRooms(), loadDashboard()]);
                if (['hop-dong', 'dashboard', 'phong-va-giuong'].includes(state.currentTab)) renderActiveView();
            } else {
                showToast(json?.message || 'Không thể gia hạn hợp đồng này (có thể hợp đồng không ở trạng thái hiệu lực hoặc trùng lịch giường).', 'error');
            }
        } catch (e) {
            showToast('Lỗi kết nối khi gia hạn hợp đồng.', 'error');
        }
    }

    async function renewContract(contractNumber) {
        return openRenewContractModal(contractNumber);
    }

    async function checkInContract(contractNumber) {
        if (!confirm(`Xác nhận sinh viên đã đến nhận phòng thực tế cho hợp đồng ${contractNumber}?`)) return;
        try {
            const res = await fetch(`/api/hopdong/${encodeURIComponent(contractNumber)}/check-in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.success) {
                showToast(json.message || 'Ghi nhận nhận phòng thành công!', 'success');
                await loadContracts();
                if (state.currentTab === 'hop-dong') renderActiveView();
            } else {
                showToast(json.message || 'Không thể ghi nhận nhận phòng.', 'error');
            }
        } catch (e) {
            showToast('Lỗi khi ghi nhận nhận phòng', 'error');
        }
    }

    async function openLiquidateContractModal(contractNumber) {
        const c = await findContractForAction(contractNumber);
        if (!c) {
            showToast('Không tìm thấy thông tin hợp đồng.', 'error');
            return;
        }
        const container = document.getElementById('modalsContainer');
        if (!container) return;

        const safeContractJs = escapeHtml(String(c.contractNumber || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
        const quickReasons = [
            'Tất toán đúng hạn cuối kỳ và bàn giao phòng',
            'Sinh viên xin ra ký túc xá trước thời hạn',
            'Sinh viên tốt nghiệp / chuyển cơ sở học tập'
        ];

        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxApp.closeModal()">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B]" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-red-600">assignment_turned_in</span>
                            <div>
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Thanh lý hợp đồng</h3>
                                <p class="text-[11px] font-mono text-slate-500 mt-0.5">Mã HĐ: ${escapeHtml(c.contractNumber)}</p>
                            </div>
                        </div>
                        <button type="button" onclick="KtxApp.closeModal()" aria-label="Đóng" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <form onsubmit="event.preventDefault(); KtxApp.submitLiquidateContract('${safeContractJs}');" class="py-4 space-y-4 text-xs">
                        <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200/80 dark:border-[#232B3B] space-y-1">
                            <div class="font-bold text-slate-900 dark:text-white">${escapeHtml(c.studentName)} <span class="font-mono font-normal text-slate-500">(${escapeHtml(c.mssv)})</span></div>
                            <div class="text-slate-600 dark:text-slate-300">Phòng <strong>${escapeHtml(c.roomNumber)}</strong> · Giường <strong>${escapeHtml(c.bedNumber)}</strong> (Tòa ${escapeHtml(c.buildingId)})</div>
                            <div class="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-200/70 dark:border-slate-800">
                                <span class="text-slate-500">Tiền cọc hoàn trả:</span>
                                <span class="font-mono font-bold text-emerald-700 dark:text-emerald-400">${formatVND(c.depositAmount)}</span>
                            </div>
                        </div>

                        <div>
                            <label for="liquidateReasonInput" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Lý do thanh lý &amp; trả phòng <span class="text-red-500">*</span></label>
                            <textarea id="liquidateReasonInput" rows="3" required placeholder="Nhập lý do thanh lý hợp đồng và hoàn trả tiền cọc..." class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/30">Tất toán đúng hạn cuối kỳ và bàn giao phòng</textarea>
                            <div class="flex flex-wrap gap-1.5 mt-2">
                                ${quickReasons.map(r => `<button type="button" onclick="KtxApp.setLiquidateReasonPreset(this.dataset.reason)" data-reason="${escapeHtml(r)}" class="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 transition-colors">${escapeHtml(r)}</button>`).join('')}
                            </div>
                        </div>

                        <div class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300">
                            Sau khi thanh lý, giường sẽ được giải phóng về trạng thái trống và gửi thông báo tất toán đến sinh viên.
                        </div>

                        <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100">Hủy</button>
                            <button type="submit" class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                                <span>Xác nhận thanh lý</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    function setLiquidateReasonPreset(reasonText) {
        const input = document.getElementById('liquidateReasonInput');
        if (input) {
            input.value = reasonText || '';
            input.focus();
        }
    }

    async function submitLiquidateContract(contractNumber) {
        const reasonInput = document.getElementById('liquidateReasonInput');
        const reason = (reasonInput?.value || '').trim();
        if (!reason) {
            showToast('Vui lòng nhập lý do thanh lý hợp đồng.', 'error');
            reasonInput?.focus();
            return;
        }
        try {
            const res = await fetch(`/api/hopdong/${encodeURIComponent(contractNumber)}/liquidate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.success) {
                showToast(json.message || 'Đã thanh lý hợp đồng và hoàn trả tiền cọc!', 'success');
                closeModal();
                await Promise.all([loadContracts(), loadRooms(), loadStudents(), loadDashboard()]);
                if (['hop-dong', 'dashboard', 'phong-va-giuong', 'sinh-vien'].includes(state.currentTab)) renderActiveView();
            } else {
                showToast(json?.message || 'Không thể thanh lý hợp đồng này.', 'error');
            }
        } catch (e) {
            showToast('Lỗi kết nối khi thanh lý hợp đồng.', 'error');
        }
    }

    async function liquidateContract(contractNumber) {
        return openLiquidateContractModal(contractNumber);
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
        document.body.classList.remove('ktx-printing-contract');
        const container = document.getElementById('modalsContainer');
        if (container) container.innerHTML = '';
        document.getElementById('registrationModal')?.classList.add('hidden');
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
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        let yearsList = [];
        try {
            yearsList = await fetchAcademicYears();
        } catch (e) {
            yearsList = state.academicYears || [];
        }
        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxApp.closeModal()">
                <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Tạo Đợt Đăng Ký Mới</h3>
                        <button type="button" onclick="KtxApp.closeModal()" aria-label="Đóng hộp thoại" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                    </div>
                    <form onsubmit="event.preventDefault(); KtxApp.submitCreateRound();" class="space-y-3.5 pt-4 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mã Đợt *</label>
                            <input id="roundCode" required type="text" maxlength="20" placeholder="VD: DOT_K66_2027" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs focus:outline-none" />
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên Đợt *</label>
                            <input id="roundName" required type="text" maxlength="93" placeholder="VD: Đợt đăng ký KTX năm học 2026-2027" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Năm Học *</label>
                            <select id="roundAcademicYear" required class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none">
                                <option value="">Chọn năm học</option>
                                ${(yearsList || []).map(y => {
                                    const code = getAcademicYearCode(y);
                                    const clean = code.replace(/^NH/i, '');
                                    const selected = code === state.selectedAcademicYear ? 'selected' : '';
                                    return `<option value="${escapeHtml(code)}" ${selected}>Năm học ${escapeHtml(clean)} (${escapeHtml(code)})</option>`;
                                }).join('')}
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
                        <div class="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 text-[11px] text-slate-600 dark:text-slate-300">
                            Đợt mới tạo sẽ lưu ở trạng thái <strong>Chưa áp dụng</strong> trong mục <strong>Quản lý đợt đăng ký</strong>. Hãy bấm nút <strong>Áp dụng toàn hệ thống</strong> để công bố chính thức cho sinh viên.
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
        const selectedYear = document.getElementById('roundAcademicYear')?.value || state.selectedAcademicYear;
        const ngayMo = document.getElementById('roundOpen').value;
        const ngayDong = document.getElementById('roundClose').value;
        if (!selectedYear) {
            showToast('Vui lòng chọn năm học.', 'error');
            return;
        }
        if (ngayDong < ngayMo) {
            showToast('Ngày đóng phải sau hoặc bằng ngày mở.', 'error');
            return;
        }
        // Không cho hai đợt đăng ký trong cùng năm học chồng lấn thời gian.
        try {
            const existingRes = await fetch(`/api/dotdangky-rounds?academicYear=${encodeURIComponent(selectedYear)}`);
            const existing = await existingRes.json().catch(() => []);
            const conflict = (Array.isArray(existing) ? existing : []).find(r => {
                const s = String(r.ngayMo ?? r.NgayMo ?? '').slice(0, 10);
                const e = String(r.ngayDong ?? r.NgayDong ?? '').slice(0, 10);
                return s && e && ngayMo <= e && ngayDong >= s;
            });
            if (conflict) {
                const s = String(conflict.ngayMo ?? conflict.NgayMo ?? '').slice(0, 10);
                const e = String(conflict.ngayDong ?? conflict.NgayDong ?? '').slice(0, 10);
                showToast(`Khoảng thời gian bị trùng với đợt "${conflict.tenDot ?? conflict.TenDot ?? conflict.maDotDangKy}" (${s} – ${e}). Đợt mới phải bắt đầu sau khi đợt trước kết thúc.`, 'error');
                return;
            }
        } catch (e) { /* ignore, server will validate */ }
        const body = {
            maDotDangKy: document.getElementById('roundCode').value.trim(),
            tenDot: document.getElementById('roundName').value.trim(),
            maNamHoc: selectedYear,
            ngayMo,
            ngayDong,
            daPhatHanh: false
        };
        const res = await fetch(`/api/dotdangky-rounds?academicYear=${encodeURIComponent(selectedYear)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) {
            const msg = typeof json === 'string' ? json : (json?.message || json?.title || 'Tạo đợt thất bại.');
            showToast(msg, 'error');
            return;
        }
        showToast('Đã tạo đợt đăng ký mới. Vui lòng bấm "Áp dụng toàn hệ thống" để công bố.', 'success');
        await loadApplications();
        if (state.currentTab === 'don-dang-ky') renderActiveView();
        await openManageRoundsModal();
    }

    async function openManageRoundsModal() {
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        const yearParam = state.selectedAcademicYear
            ? `?academicYear=${encodeURIComponent(state.selectedAcademicYear)}`
            : '';

        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxApp.closeModal()">
                <div class="w-full max-w-4xl max-h-[80vh] flex flex-col bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B]" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Quản lý đợt đăng ký</h3>
                            <p class="text-[11px] text-slate-500 mt-0.5">Năm học: <span class="font-mono font-semibold text-slate-700 dark:text-slate-300">${escapeHtml(state.selectedAcademicYear || 'Tất cả')}</span></p>
                        </div>
                        <button type="button" onclick="KtxApp.closeModal()" aria-label="Đóng" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                    <div id="manageRoundsBody" class="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar text-xs text-slate-500">Đang tải danh sách đợt đăng ký...</div>
                </div>
            </div>
        `;

        try {
            const res = await fetch(`/api/dotdangky-rounds${yearParam}`);
            const rounds = await res.json().catch(() => []);
            const bodyEl = document.getElementById('manageRoundsBody');
            if (!bodyEl) return;

            if (!res.ok) {
                bodyEl.innerHTML = `<div class="p-4 rounded-xl bg-red-50 text-red-700 text-xs">Không tải được danh sách đợt đăng ký.</div>`;
                return;
            }

            if (!Array.isArray(rounds) || rounds.length === 0) {
                bodyEl.innerHTML = `
                    <div class="py-10 text-center space-y-2">
                        <span class="material-symbols-outlined text-[36px] text-slate-300">event_busy</span>
                        <p class="text-slate-500">Chưa có đợt đăng ký nào trong năm học này.</p>
                    </div>
                `;
                return;
            }

            const fmtDate = (iso) => {
                if (!iso) return '—';
                const dt = new Date(iso);
                if (Number.isNaN(dt.getTime())) return String(iso);
                return dt.toLocaleDateString('vi-VN');
            };

            bodyEl.innerHTML = `
                <div class="rounded-xl border border-slate-200/80 dark:border-[#232B3B]">
                    <table class="w-full table-fixed text-left border-collapse text-xs">
                        <colgroup>
                            <col style="width:17%" />
                            <col style="width:25%" />
                            <col style="width:19%" />
                            <col style="width:20%" />
                            <col style="width:19%" />
                        </colgroup>
                        <thead>
                            <tr class="border-b border-slate-200/80 dark:border-[#232B3B] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                                <th class="sticky top-0 z-10 py-3 pl-5 pr-3 whitespace-nowrap bg-slate-50 dark:bg-[#0B0F1A] rounded-tl-xl">Mã đợt</th>
                                <th class="sticky top-0 z-10 py-3 px-3 whitespace-nowrap bg-slate-50 dark:bg-[#0B0F1A]">Tên đợt &amp; Năm học</th>
                                <th class="sticky top-0 z-10 py-3 px-3 whitespace-nowrap bg-slate-50 dark:bg-[#0B0F1A]">Thời gian</th>
                                <th class="sticky top-0 z-10 py-3 px-3 whitespace-nowrap bg-slate-50 dark:bg-[#0B0F1A]">Trạng thái</th>
                                <th class="sticky top-0 z-10 py-3 pl-3 pr-5 text-right whitespace-nowrap bg-slate-50 dark:bg-[#0B0F1A] rounded-tr-xl">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                            ${rounds.map(r => {
                                const code = r.maDotDangKy ?? r.MaDotDangKy ?? '';
                                const name = r.tenDot ?? r.TenDot ?? '';
                                const namHoc = r.maNamHoc ?? r.MaNamHoc ?? state.selectedAcademicYear ?? '—';
                                const openDate = fmtDate(r.ngayMo ?? r.NgayMo);
                                const closeDate = fmtDate(r.ngayDong ?? r.NgayDong);
                                const isPublished = (r.daPhatHanh ?? r.DaPhatHanh) !== false;
                                const appCount = r.soDonDangKy ?? r.SoDonDangKy ?? 0;
                                const safeCode = escapeHtml(String(code).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));

                                return `
                                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                        <td class="py-3 pl-5 pr-3 font-mono font-bold text-[#0B2A5B] dark:text-blue-400 truncate" title="${escapeHtml(code)}">${escapeHtml(code)}</td>
                                        <td class="py-3 px-3">
                                            <div class="font-semibold text-slate-900 dark:text-white leading-snug">${escapeHtml(name)}</div>
                                            <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(namHoc)} · ${appCount} hồ sơ</div>
                                        </td>
                                        <td class="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                                            <div class="truncate" title="${escapeHtml(openDate)}">${escapeHtml(openDate)}</div>
                                            <div class="truncate text-slate-400 dark:text-slate-500" title="${escapeHtml(closeDate)}">→ ${escapeHtml(closeDate)}</div>
                                        </td>
                                        <td class="py-3 px-3">
                                            ${isPublished ? `
                                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60">
                                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    <span>Đang áp dụng</span>
                                                </span>
                                            ` : `
                                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60">
                                                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                    <span>Chưa áp dụng</span>
                                                </span>
                                            `}
                                        </td>
                                        <td class="py-3 pl-3 pr-5 text-right">
                                            <div class="relative inline-flex items-center justify-center">
                                                <button type="button"
                                                    onclick="KtxApp.toggleRoundsActionMenu('${safeCode}', event)"
                                                    aria-haspopup="menu"
                                                    aria-expanded="false"
                                                    aria-controls="rounds-action-menu-${safeCode}"
                                                    title="Thao tác"
                                                    aria-label="Mở menu thao tác cho đợt ${escapeHtml(code)}"
                                                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-[#0B2A5B] hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 mx-auto">
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                                        <circle cx="3.5" cy="8" r="1.25" />
                                                        <circle cx="8" cy="8" r="1.25" />
                                                        <circle cx="12.5" cy="8" r="1.25" />
                                                    </svg>
                                                </button>
                                                <div id="rounds-action-menu-${safeCode}"
                                                    data-rounds-menu="true"
                                                    role="menu"
                                                    class="hidden fixed z-50 w-52 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-xl py-1.5 text-left animate-fade-in">
                                                    ${!isPublished ? `
                                                        <button type="button" role="menuitem"
                                                            onclick="KtxApp.closeRoundsActionMenus(); KtxApp.editRound('${safeCode}');"
                                                            class="w-full px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors text-left">
                                                            <span class="material-symbols-outlined text-[16px]">edit</span>
                                                            <span>Chỉnh sửa đợt</span>
                                                        </button>
                                                        <button type="button" role="menuitem"
                                                            onclick="KtxApp.closeRoundsActionMenus(); KtxApp.publishRound('${safeCode}');"
                                                            class="w-full px-3 py-2 text-xs font-semibold text-[#0B2A5B] dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 flex items-center gap-2 transition-colors text-left">
                                                            <span class="material-symbols-outlined text-[16px]">publish</span>
                                                            <span>Áp dụng toàn hệ thống</span>
                                                        </button>
                                                        <button type="button" role="menuitem"
                                                            onclick="KtxApp.closeRoundsActionMenus(); KtxApp.deleteRound('${safeCode}');"
                                                            class="w-full px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors text-left">
                                                            <span class="material-symbols-outlined text-[16px]">delete</span>
                                                            <span>Xoá đợt</span>
                                                        </button>
                                                    ` : `
                                                        <div class="px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                                            <span class="material-symbols-outlined text-[16px]">check_circle</span>
                                                            <span>Đang hiệu lực</span>
                                                        </div>
                                                    `}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (e) {
            const bodyEl = document.getElementById('manageRoundsBody');
            if (bodyEl) bodyEl.innerHTML = `<div class="p-4 rounded-xl bg-red-50 text-red-700 text-xs">Lỗi kết nối khi tải danh sách đợt đăng ký.</div>`;
        }
    }

    async function publishRound(roundCode) {
        try {
            const res = await fetch(`/api/dotdangky-rounds/${encodeURIComponent(roundCode)}/publish`, { method: 'POST' });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.success) {
                showToast(json.message || 'Đã áp dụng và gửi đợt đăng ký ra toàn hệ thống.', 'success');
                await openManageRoundsModal();
                await loadApplications();
                if (state.currentTab === 'don-dang-ky') renderActiveView();
            } else {
                showToast(json?.message || 'Không thể áp dụng đợt đăng ký.', 'error');
            }
        } catch (e) {
            showToast('Lỗi khi gửi đợt đăng ký ra toàn hệ thống.', 'error');
        }
    }

    async function editRound(roundCode) {
        try {
            const res = await fetch(`/api/dotdangky-rounds?academicYear=${encodeURIComponent(state.selectedAcademicYear || '')}`);
            const rounds = await res.json().catch(() => []);
            const round = (Array.isArray(rounds) ? rounds : []).find(r => (r.maDotDangKy ?? r.MaDotDangKy) === roundCode);
            if (!round) { showToast('Không tìm thấy đợt đăng ký.', 'error'); return; }

            const code = round.maDotDangKy ?? round.MaDotDangKy ?? '';
            const name = (round.tenDot ?? round.TenDot ?? '').replace(/^Nháp:\s*/i, '');
            const openDate = String(round.ngayMo ?? round.NgayMo ?? '').slice(0, 10);
            const closeDate = String(round.ngayDong ?? round.NgayDong ?? '').slice(0, 10);
            const yearCode = round.maNamHoc ?? round.MaNamHoc ?? state.selectedAcademicYear ?? '';
            const yearsList = state.academicYears || await fetchAcademicYears();

            const container = document.getElementById('modalsContainer');
            if (!container) return;
            container.innerHTML = `
                <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxApp.closeModal()">
                    <div class="w-full max-w-lg bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Chỉnh sửa đợt đăng ký</h3>
                            <button type="button" onclick="KtxApp.closeModal()" aria-label="Đóng" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined text-[20px]">close</span></button>
                        </div>
                        <form onsubmit="event.preventDefault(); KtxApp.submitEditRound('${escapeHtml(String(code).replace(/'/g, "\\'"))}');" class="space-y-3.5 pt-4 text-xs">
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mã Đợt</label>
                                <input value="${escapeHtml(code)}" disabled class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-500" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên Đợt *</label>
                                <input id="editRoundName" required type="text" maxlength="93" value="${escapeHtml(name)}" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Năm Học</label>
                                <select id="editRoundAcademicYear" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none">
                                    ${(yearsList || []).map(y => {
                                        const c = getAcademicYearCode(y);
                                        const selected = c === yearCode ? 'selected' : '';
                                        return `<option value="${escapeHtml(c)}" ${selected}>${escapeHtml(c)}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày Mở</label>
                                    <input id="editRoundOpen" required type="date" value="${escapeHtml(openDate)}" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày Đóng</label>
                                    <input id="editRoundClose" required type="date" value="${escapeHtml(closeDate)}" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none" />
                                </div>
                            </div>
                            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Hủy</button>
                                <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold shadow-xs">Lưu thay đổi</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } catch (e) {
            showToast('Không tải được thông tin đợt đăng ký.', 'error');
        }
    }

    async function submitEditRound(roundCode) {
        const name = (document.getElementById('editRoundName')?.value || '').trim();
        const openDate = document.getElementById('editRoundOpen')?.value;
        const closeDate = document.getElementById('editRoundClose')?.value;
        const yearCode = document.getElementById('editRoundAcademicYear')?.value;
        if (!name) { showToast('Tên đợt không được để trống.', 'error'); return; }
        if (!openDate || !closeDate) { showToast('Vui lòng chọn ngày mở và ngày đóng.', 'error'); return; }
        if (closeDate < openDate) { showToast('Ngày đóng phải sau hoặc bằng ngày mở.', 'error'); return; }
        // Kiểm tra chồng lấn với các đợt khác (trừ chính nó).
        try {
            const existingRes = await fetch(`/api/dotdangky-rounds?academicYear=${encodeURIComponent(yearCode || state.selectedAcademicYear || '')}`);
            const existing = await existingRes.json().catch(() => []);
            const conflict = (Array.isArray(existing) ? existing : []).find(r => {
                const c = r.maDotDangKy ?? r.MaDotDangKy;
                if (c === roundCode) return false;
                const s = String(r.ngayMo ?? r.NgayMo ?? '').slice(0, 10);
                const e = String(r.ngayDong ?? r.NgayDong ?? '').slice(0, 10);
                return s && e && openDate <= e && closeDate >= s;
            });
            if (conflict) {
                const s = String(conflict.ngayMo ?? conflict.NgayMo ?? '').slice(0, 10);
                const e = String(conflict.ngayDong ?? conflict.NgayDong ?? '').slice(0, 10);
                showToast(`Khoảng thời gian bị trùng với đợt "${conflict.tenDot ?? conflict.TenDot ?? conflict.maDotDangKy}" (${s} – ${e}).`, 'error');
                return;
            }
        } catch (e) { /* ignore */ }

        try {
            const res = await fetch(`/api/dotdangky-rounds/${encodeURIComponent(roundCode)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenDot: name, maNamHoc: yearCode, ngayMo: openDate, ngayDong: closeDate })
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.success !== false) {
                showToast(json.message || 'Đã cập nhật đợt đăng ký.', 'success');
                await openManageRoundsModal();
                await loadApplications();
                if (state.currentTab === 'don-dang-ky') renderActiveView();
            } else {
                showToast(json?.message || 'Không thể cập nhật đợt đăng ký.', 'error');
            }
        } catch (e) {
            showToast('Lỗi khi cập nhật đợt đăng ký.', 'error');
        }
    }

    async function deleteRound(roundCode) {
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onclick="if (event.target === this) KtxApp.closeModal()">
                <div class="w-full max-w-md bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] p-6" onclick="event.stopPropagation()">
                    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <span class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                            <span class="material-symbols-outlined text-[20px]">delete</span>
                        </span>
                        <div>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Xoá đợt đăng ký</h3>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Chỉ xoá được đợt chưa áp dụng và chưa có hồ sơ.</p>
                        </div>
                    </div>
                    <p class="py-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Bạn có chắc muốn xoá đợt <strong class="font-mono text-slate-900 dark:text-white">${escapeHtml(roundCode)}</strong>? Hành động này không thể hoàn tác.
                    </p>
                    <div class="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Hủy</button>
                        <button type="button" onclick="KtxApp.closeModal(); KtxApp.confirmDeleteRound('${escapeHtml(String(roundCode).replace(/'/g, "\\\\'"))}');" class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition-colors">Xác nhận xoá</button>
                    </div>
                </div>
            </div>
        `;
    }

    async function confirmDeleteRound(roundCode) {
        try {
            const res = await fetch(`/api/dotdangky-rounds/${encodeURIComponent(roundCode)}`, { method: 'DELETE' });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.success !== false) {
                showToast(json.message || 'Đã xoá đợt đăng ký.', 'success');
                await openManageRoundsModal();
            } else {
                showToast(json?.message || 'Không thể xoá đợt đăng ký.', 'error');
            }
        } catch (e) {
            showToast('Lỗi khi xoá đợt đăng ký.', 'error');
        }
    }
    async function openCreateStudentModal() {
        if (!state.selectedAcademicYear) {
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
        const ok = res.ok && json.success !== false;
        KtxApp.showToast(ok ? (json?.message || 'Đã tiếp nhận sinh viên.') : (json?.message || json?.title || 'Tiếp nhận thất bại.'), ok ? 'success' : 'error');
        if (ok) {
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
                const res = await fetch(`/api/sinhvien/import?academicYear=${encodeURIComponent(state.selectedAcademicYear)}`, { method: 'POST', body: fd });
                const json = await res.json().catch(() => ({}));
                const totalProcessed = (json.imported ?? 0) + (json.updated ?? 0) + (json.contractsImported ?? 0);
                const toastType = !res.ok || (totalProcessed === 0 && (json.failed ?? 0) > 0)
                    ? 'error'
                    : ((json.failed ?? 0) > 0 ? 'info' : 'success');
                KtxApp.showToast(json.message || (res.ok ? 'Import thành công.' : 'Import thất bại.'), toastType);
                if (res.ok) {
                    await Promise.all([loadStudents(), loadContracts(), loadApplications(), loadRooms(), loadDashboard()]);
                    if (['sinh-vien', 'hop-dong', 'don-dang-ky', 'dashboard', 'phong-va-giuong'].includes(state.currentTab)) {
                        renderActiveView();
                    }
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
        const ok = res.ok && json.success !== false;
        KtxApp.showToast(ok ? (json?.message || 'Đã thêm phòng.') : (json?.message || json?.title || 'Thêm phòng thất bại.'), ok ? 'success' : 'error');
        if (ok) {
            KtxApp.closeModal();
            await loadRooms();
            if (state.currentTab === 'phong-va-giuong' || state.currentTab === 'phong') renderActiveView();
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

        // Branch for student role
        if (state.currentUser && state.currentUser.roleCode === 'sinhVien') {
            try {
                const res = await nativeFetch('/api/me/notifications');
                const json = await res.json();
                const notifs = json?.data || [];
                if (!notifs.length) {
                    list.innerHTML = '<div class="text-center text-slate-400 py-4">Không có thông báo mới.</div>';
                    const badge = document.getElementById('notifBadge');
                    if (badge) badge.classList.add('hidden');
                    return;
                }

                list.innerHTML = notifs.slice(0, 5).map(n => {
                    const isUnread = !n.daDoc;
                    const destTab = n.lienKet || 'sv-thong-bao';
                    return `
                        <button type="button" onclick="KtxApp.closeNotifications(); if(window.KtxStudentViews && typeof window.KtxStudentViews.handleNotifClick === 'function'){ window.KtxStudentViews.handleNotifClick(${n.id}, '${escapeHtml(destTab)}'); } else { KtxApp.navigate('${escapeHtml(destTab)}'); }" class="w-full text-left p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-start gap-2">
                            ${isUnread ? '<span class="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>' : '<span class="w-2 h-2 shrink-0 mt-1.5"></span>'}
                            <div class="min-w-0 flex-1">
                                <div class="font-bold text-xs ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'} truncate">${escapeHtml(n.tieuDe)}</div>
                                <div class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(n.ngayTao)}</div>
                            </div>
                        </button>
                    `;
                }).join('') + `
                    <div class="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                        <button type="button" onclick="KtxApp.closeNotifications(); KtxApp.navigate('sv-thong-bao');" class="text-[11px] font-bold text-[#0B2A5B] dark:text-blue-400 hover:underline">
                            Xem tất cả thông báo &rarr;
                        </button>
                    </div>
                `;
            } catch (err) {
                console.error('Error loading student notifications:', err);
                list.innerHTML = '<div class="text-center text-red-500 py-4">Lỗi tải thông báo.</div>';
            }
            return;
        }

        // Branch for staff/admin unchanged
        const items = [];
        try {
            const apps = await fetchApiData('/api/dondangky?status=pending');
            (apps || []).slice(0, 5).forEach(a => items.push({ text: `Đơn đăng ký chờ duyệt: ${a.studentName || a.mssv || a.applicationCode}`, tab: 'don-dang-ky' }));
        } catch (e) {}
        try {
            const tickets = await fetchApiData('/api/suachua?status=PENDING');
            (tickets?.data || tickets || []).slice(0, 5).forEach(t => items.push({ text: `Phiếu sửa chữa chờ xử lý: ${t.code || t.id}`, tab: 'suachua' }));
        } catch (e) {}
        try {
            const invs = await fetchApiData('/api/hoadon?status=pending');
            (invs?.data || invs || []).slice(0, 5).forEach(i => items.push({ text: `Hóa đơn chưa thu: ${i.code || i.id}`, tab: 'hoadon' }));
        } catch (e) {}

        if (items.length === 0) {
            list.innerHTML = '<div class="text-center text-slate-400 py-4">Không có thông báo mới.</div>';
            const badge = document.getElementById('notifBadge');
            if (badge) badge.classList.add('hidden');
        } else {
            list.innerHTML = items.map(i => `<button type="button" onclick="KtxApp.closeNotifications(); KtxApp.navigate('${escapeHtml(i.tab)}');" class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">${escapeHtml(i.text)}</button>`).join('');
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

    let academicYearEditingCode = '';

    async function toggleAcademicYearMenu() {
        const container = document.getElementById('modalsContainer');
        if (!container) return;
        let years = [];
        try {
            years = await fetchAcademicYears();
            renderAcademicYearOptions();
        } catch (error) {
            showToast(error.message || 'Không tải được danh sách năm học.', 'error');
        }
        if (academicYearEditingCode && !years.some(y => getAcademicYearCode(y) === academicYearEditingCode)) {
            academicYearEditingCode = '';
        }
        renderAcademicYearModal(years);
    }

    function startEditAcademicYear(code) {
        academicYearEditingCode = String(code || '');
        renderAcademicYearModal(state.academicYears || []);
        document.querySelector('#academicYearForm [name="maNamHoc"]')?.focus();
    }

    function cancelEditAcademicYear() {
        academicYearEditingCode = '';
        renderAcademicYearModal(state.academicYears || []);
    }

    function renderAcademicYearModal(years) {
        const container = document.getElementById('modalsContainer');
        if (!container) return;

        const editing = years.find(y => getAcademicYearCode(y) === academicYearEditingCode) || null;
        const editingCode = editing ? getAcademicYearCode(editing) : '';
        const editStart = editing ? String(editing.ngayBatDau || editing.NgayBatDau || '').slice(0, 10) : '';
        const editEnd = editing ? String(editing.ngayKetThuc || editing.NgayKetThuc || '').slice(0, 10) : '';

        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onclick="KtxApp.closeModal()">
                <div class="w-full max-w-4xl bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] overflow-hidden animate-fade-in" onclick="event.stopPropagation()">
                    <div class="px-5 py-4 border-b border-slate-200 dark:border-[#232B3B] flex items-center justify-between">
                        <div>
                            <h3 class="text-sm font-bold text-slate-800 dark:text-white">Quản lý năm học</h3>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Mỗi năm chỉ có một năm học, định dạng NH&lt;năm&gt;-&lt;năm&gt; (ví dụ NH2026-2027), thời gian không được chồng lấn nhau.</p>
                        </div>
                        <button type="button" onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600" aria-label="Đóng">✕</button>
                    </div>
                    <div class="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                        <form id="academicYearForm" onsubmit="KtxApp.submitAcademicYearForm(event)" class="grid grid-cols-1 md:grid-cols-4 gap-2" novalidate>
                            <input name="maNamHoc" maxlength="9" placeholder="Mã năm học (NH2027-2028)" aria-label="Mã năm học" autocomplete="off" spellcheck="false"
                                   pattern="NH[0-9]{4}-[0-9]{4}" title="Định dạng: NH<năm bắt đầu>-<năm kết thúc>, ví dụ NH2026-2027"
                                   oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')"
                                   value="${escapeHtml(editingCode)}"
                                   class="h-10 px-3 rounded-lg border border-slate-200 dark:border-[#232B3B] bg-slate-50 dark:bg-[#0B0F1A] text-xs uppercase" required />
                            <input name="ngayBatDau" type="date" aria-label="Ngày bắt đầu năm học" value="${escapeHtml(editStart)}" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-[#232B3B] bg-slate-50 dark:bg-[#0B0F1A] text-xs" required />
                            <input name="ngayKetThuc" type="date" aria-label="Ngày kết thúc năm học" value="${escapeHtml(editEnd)}" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-[#232B3B] bg-slate-50 dark:bg-[#0B0F1A] text-xs" required />
                            <div class="flex items-center gap-2">
                                <button type="submit" class="flex-1 h-10 px-3 rounded-lg bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold">${editing ? 'Lưu thay đổi' : 'Thêm năm học'}</button>
                                ${editing ? `<button type="button" onclick="KtxApp.cancelEditAcademicYear()" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">Huỷ</button>` : ''}
                            </div>
                            <p id="academicYearFormError" role="alert" class="hidden md:col-span-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900/60 px-3 py-2 text-[11px] font-medium text-red-700 dark:text-red-300"></p>
                            ${editing ? `<p class="md:col-span-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-900/60 px-3 py-2 text-[11px] font-medium text-blue-700 dark:text-blue-300">Đang chỉnh sửa năm học <span class="font-mono font-bold">${escapeHtml(editingCode)}</span>.</p>` : ''}
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
                                const isEditing = code === academicYearEditingCode;
                                return `
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0 border-slate-100 dark:border-slate-800 ${isEditing ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}">
                                        <div class="min-w-0">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <span class="font-semibold text-sm text-slate-800 dark:text-white">Năm học ${escapeHtml(getAcademicYearLabel(year))}</span>
                                                ${isActive ? '<span class="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">Đang hoạt động</span>' : ''}
                                            </div>
                                            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">${codeAttr} · ${formatAcademicYearDate(year.ngayBatDau || year.NgayBatDau)} – ${formatAcademicYearDate(year.ngayKetThuc || year.NgayKetThuc)}</p>
                                        </div>
                                        <div class="relative inline-flex items-center justify-center">
                                            <button type="button"
                                                onclick="KtxApp.toggleAcademicYearActionMenu('${codeAttr}', event)"
                                                aria-haspopup="menu"
                                                aria-expanded="false"
                                                aria-controls="academic-year-action-menu-${codeAttr}"
                                                title="Thao tác"
                                                aria-label="Mở menu thao tác cho năm học ${escapeHtml(getAcademicYearLabel(year))}"
                                                class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-[#0B2A5B] hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 mx-auto">
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                                    <circle cx="3.5" cy="8" r="1.25" />
                                                    <circle cx="8" cy="8" r="1.25" />
                                                    <circle cx="12.5" cy="8" r="1.25" />
                                                </svg>
                                            </button>
                                            <div id="academic-year-action-menu-${codeAttr}"
                                                data-academic-year-menu="true"
                                                role="menu"
                                                class="hidden fixed z-50 w-44 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-xl py-1.5 text-left animate-fade-in">
                                                <button type="button" role="menuitem"
                                                    onclick="KtxApp.closeAcademicYearActionMenus(); KtxApp.startEditAcademicYear('${codeAttr}');"
                                                    class="w-full px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors text-left">
                                                    <span class="material-symbols-outlined text-[16px] text-slate-500">edit</span>
                                                    <span>Sửa năm học</span>
                                                </button>
                                                <button type="button" role="menuitem"
                                                    onclick="KtxApp.closeAcademicYearActionMenus(); KtxApp.changeAcademicYear('${codeAttr}'); KtxApp.closeModal();"
                                                    class="w-full px-3 py-2 text-xs font-medium ${selected ? 'text-[#0B2A5B] dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-200'} hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors text-left">
                                                    <span class="material-symbols-outlined text-[16px] text-slate-500">${selected ? 'check_circle' : 'calendar_month'}</span>
                                                    <span>${selected ? 'Đang chọn' : 'Chọn năm học'}</span>
                                                </button>
                                            </div>
                                        </div>
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
            if (!selectedCode || !codes.includes(selectedCode)) {
                const defaultYear = years.find(y => y.laDangHoat ?? y.LaDangHoat) || years[0];
                selectedCode = defaultYear ? getAcademicYearCode(defaultYear) : '';
            }

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

    function setAcademicYearFormError(message) {
        const el = document.getElementById('academicYearFormError');
        if (!el) {
            if (message) showToast(message, 'error');
            return;
        }
        if (message) {
            el.textContent = message;
            el.classList.remove('hidden');
        } else {
            el.textContent = '';
            el.classList.add('hidden');
        }
    }

    // Mã năm học hợp lệ: NH<năm bắt đầu>-<năm kết thúc>, hai năm liền nhau.
    function parseAcademicYearCode(rawCode) {
        const code = String(rawCode || '').trim().toUpperCase();
        const match = /^NH(\d{4})-(\d{4})$/.exec(code);
        if (!match) {
            return {
                code,
                error: `Mã năm học "${code}" không đúng định dạng. Phải nhập theo mẫu NH<năm bắt đầu>-<năm kết thúc>, ví dụ NH2026-2027.`
            };
        }
        const startYear = Number(match[1]);
        const endYear = Number(match[2]);
        if (endYear !== startYear + 1) {
            return {
                code,
                error: `Năm kết thúc phải là ${startYear + 1}. Mỗi năm học chỉ gồm 2 năm liền nhau, ví dụ NH${startYear}-${startYear + 1}.`
            };
        }
        return { code, startYear, endYear, error: '' };
    }

    async function submitAcademicYearForm(e) {
        e.preventDefault();
        setAcademicYearFormError('');

        const form = e.target;
        const fd = new FormData(form);
        const parsed = parseAcademicYearCode(fd.get('maNamHoc'));
        if (parsed.error) {
            setAcademicYearFormError(parsed.error);
            form.elements['maNamHoc']?.focus();
            return;
        }

        const editingCode = academicYearEditingCode;
        const isEditing = Boolean(editingCode);
        const body = {
            maNamHoc: parsed.code,
            ngayBatDau: fd.get('ngayBatDau'),
            ngayKetThuc: fd.get('ngayKetThuc'),
            laDangHoat: true
        };

        if (!body.ngayBatDau || !body.ngayKetThuc) {
            setAcademicYearFormError('Vui lòng chọn ngày bắt đầu và ngày kết thúc của năm học.');
            return;
        }
        if (body.ngayKetThuc <= body.ngayBatDau) {
            setAcademicYearFormError('Ngày kết thúc phải sau ngày bắt đầu.');
            return;
        }
        if (Number(body.ngayBatDau.slice(0, 4)) !== parsed.startYear || Number(body.ngayKetThuc.slice(0, 4)) !== parsed.endYear) {
            setAcademicYearFormError(`Ngày bắt đầu phải thuộc năm ${parsed.startYear} và ngày kết thúc phải thuộc năm ${parsed.endYear} để khớp với mã ${parsed.code}.`);
            return;
        }

        const others = (state.academicYears || []).filter(y => getAcademicYearCode(y).toUpperCase() !== editingCode.toUpperCase());

        // Mỗi năm học chỉ có một bản ghi: chặn mã trùng ngay trên giao diện.
        if (others.some(y => getAcademicYearCode(y).toUpperCase() === parsed.code)) {
            setAcademicYearFormError(`Mã năm học ${parsed.code} đã tồn tại. Mỗi năm học chỉ được tạo một lần, vui lòng nhập mã khác (ví dụ NH${parsed.startYear + 1}-${parsed.endYear + 1}).`);
            form.elements['maNamHoc']?.focus();
            return;
        }

        // Không cho hai năm học chồng lấn thời gian: năm mới phải bắt đầu sau khi năm cũ kết thúc.
        const conflict = others.find(y => {
            const otherStart = String(y.ngayBatDau || y.NgayBatDau || '').slice(0, 10);
            const otherEnd = String(y.ngayKetThuc || y.NgayKetThuc || '').slice(0, 10);
            if (!otherStart || !otherEnd) return false;
            return body.ngayBatDau <= otherEnd && body.ngayKetThuc >= otherStart;
        });
        if (conflict) {
            const otherStart = String(conflict.ngayBatDau || conflict.NgayBatDau || '').slice(0, 10);
            const otherEnd = String(conflict.ngayKetThuc || conflict.NgayKetThuc || '').slice(0, 10);
            setAcademicYearFormError(`Khoảng thời gian bị trùng với năm học ${getAcademicYearCode(conflict)} (${formatAcademicYearDate(otherStart)} – ${formatAcademicYearDate(otherEnd)}). Ngày bắt đầu của năm học mới phải sau ngày kết thúc năm học cũ.`);
            return;
        }

        try {
            const response = await fetch(isEditing ? `/api/namhoc/${encodeURIComponent(editingCode)}` : '/api/namhoc', {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const result = await response.json().catch(() => null);
            if (!response.ok) {
                const message = typeof result === 'string'
                    ? result
                    : (result?.message || result?.title || Object.values(result?.errors || {}).flat()[0]);
                if (message) {
                    setAcademicYearFormError(message);
                    form.elements['maNamHoc']?.focus();
                } else {
                    setAcademicYearFormError(`${isEditing ? 'Lưu' : 'Thêm'} năm học ${parsed.code} thất bại. Vui lòng kiểm tra lại thông tin.`);
                }
                return;
            }

            // Đổi mã thì bộ chọn hiện tại cũng phải đổi theo.
            if (isEditing && state.selectedAcademicYear === editingCode) {
                state.selectedAcademicYear = body.maNamHoc;
            }
            academicYearEditingCode = '';
            await loadAcademicYearOptions(state.selectedAcademicYear || body.maNamHoc);
            await toggleAcademicYearMenu();
            await renderActiveView();
            showToast(isEditing
                ? `Đã cập nhật năm học ${body.maNamHoc}.`
                : `Đã thêm năm học ${body.maNamHoc} và cập nhật vào bộ chọn.`, 'success');
        } catch (error) {
            setAcademicYearFormError(error.message || `${isEditing ? 'Lưu' : 'Thêm'} năm học thất bại.`);
        }
    }

    // Giữ tên cũ để các chỗ gọi khác không bị vỡ.
    const createAcademicYear = submitAcademicYearForm;


    function showNotificationToast() {
        const taskCount = state.dashboardSummary?.urgentTasks?.filter(task => !task.completed).length || 0;
        showToast(taskCount ? `Có ${taskCount} đầu việc cần xử lý` : 'Hiện không có đầu việc cần xử lý', 'info');
    }

    const STUDENT_SEARCH_SHORTCUTS = [
        { id: 'sv-tong-quan', icon: 'dashboard', label: 'Tổng quan Sinh viên', keywords: 'tong quan dashboard trang chu noi tru' },
        { id: 'sv-ho-so', icon: 'badge', label: 'Hồ sơ của tôi', keywords: 'ho so ca nhan thong tin lien he nguoi than doi mat khau' },
        { id: 'sv-dot-dang-ky', icon: 'event_available', label: 'Đợt đăng ký Nội trú', keywords: 'dot dang ky phong trong xet duyet' },
        { id: 'sv-don-cua-toi', icon: 'assignment', label: 'Đơn đăng ký của tôi', keywords: 'don dang ky trang thai giu cho' },
        { id: 'sv-hop-dong', icon: 'edit_document', label: 'Hợp đồng & Chỗ ở', keywords: 'hop dong phong o giuong ban giao' },
        { id: 'sv-hoa-don', icon: 'receipt_long', label: 'Hóa đơn & Biên nhận', keywords: 'hoa don tien phong dien nuoc thanh toan vietqr' },
        { id: 'sv-sua-chua', icon: 'build', label: 'Yêu cầu Sửa chữa & Báo hỏng', keywords: 'sua chua bao hong thiet bi su co' },
        { id: 'sv-vi-pham', icon: 'gavel', label: 'Vi phạm & Kỷ luật', keywords: 'vi pham ky luat bien ban noi quy' },
        { id: 'sv-thong-bao', icon: 'notifications', label: 'Hộp thư thông báo', keywords: 'thong bao hop thu bql tin nhan' },
        { id: 'sv-ho-tro', icon: 'help', label: 'Nội quy, Hỗ trợ & Liên hệ BQL', keywords: 'ho tro lien he noi quy huong dan bql' }
    ];

    function isStudentSession() {
        const u = state.currentUser;
        if (u && (u.roleCode === 'sinhVien' || String(u.role || '').toLowerCase().includes('sinh viên'))) {
            return true;
        }
        if (String(state.currentTab || '').startsWith('sv-')) {
            return true;
        }
        return Boolean(document.querySelector('#sidebarContainer button[onclick*="sv-"]'));
    }

    function renderStudentShortcutButtons(items) {
        return items.map(item => `
            <button type="button" onclick="KtxApp.navigate('${item.id}'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors">
                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">${item.icon}</span>
                <span class="truncate">${item.label}</span>
            </button>
        `).join('');
    }

    function openSearch() {
        const palette = document.getElementById('commandPaletteContainer');
        if (!palette) return;

        const isStudent = isStudentSession();
        if (isStudent) {
            palette.innerHTML = `
                <div class="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs" onclick="KtxApp.closeSearch()">
                    <div class="w-full max-w-2xl bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] overflow-hidden animate-fade-in" onclick="event.stopPropagation()">
                        <div class="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-[#232B3B]">
                            <span class="material-symbols-outlined text-[20px] text-slate-400">search</span>
                            <input id="paletteInput" autofocus type="text" placeholder="Tìm nhanh chức năng (hóa đơn, hợp đồng, đợt đăng ký, thông báo...)" class="w-full bg-transparent text-sm text-slate-800 dark:text-white focus:outline-none" oninput="KtxApp.handlePaletteInput(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();KtxApp.handlePaletteInput(this.value);}" />
                            <kbd onclick="KtxApp.closeSearch()" class="cursor-pointer text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">ESC</kbd>
                        </div>
                        <div id="paletteResults" class="max-h-96 overflow-y-auto p-2 space-y-3">
                            <div class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lối tắt thao tác nhanh</div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                ${renderStudentShortcutButtons(STUDENT_SEARCH_SHORTCUTS)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            setTimeout(() => document.getElementById('paletteInput')?.focus(), 0);
            return;
        }

        // Preload data in background if not yet loaded so global search has full records
        if (canAccessMenu('sinh-vien') && (!state.students || !state.students.length)) loadStudents();
        if (canAccessMenu('hop-dong') && (!state.contracts || !state.contracts.length)) loadContracts();
        if (canAccessMenu('phong-va-giuong') && (!state.rooms || !state.rooms.length)) loadRooms();
        if (canAccessMenu('don-dang-ky') && (!state.applications || !state.applications.length)) loadApplications();

        palette.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs" onclick="KtxApp.closeSearch()">
                <div class="w-full max-w-2xl bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] overflow-hidden animate-fade-in" onclick="event.stopPropagation()">
                    <div class="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-[#232B3B]">
                        <span class="material-symbols-outlined text-[20px] text-slate-400">search</span>
                        <input id="paletteInput" autoFocus type="text" placeholder="Tìm sinh viên, hợp đồng, phòng ốc hoặc gõ lệnh... (Nhấn Enter)" class="w-full bg-transparent text-sm text-slate-800 dark:text-white focus:outline-none" oninput="KtxApp.handlePaletteInput(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();KtxApp.handlePaletteInput(this.value);}" />
                        <kbd onclick="KtxApp.closeSearch()" class="cursor-pointer text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">ESC</kbd>
                    </div>
                    <div id="paletteResults" class="max-h-96 overflow-y-auto p-2 space-y-3">
                        <div class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lối tắt thao tác nhanh</div>
                        <div id="paletteShortcutsGrid" class="grid grid-cols-2 gap-1.5">
                            <button data-menu="dashboard" onclick="KtxApp.navigate('dashboard'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">dashboard</span>
                                <span>Về Dashboard Tổng quan</span>
                            </button>
                            <button data-menu="don-dang-ky" onclick="KtxApp.navigate('don-dang-ky'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">how_to_reg</span>
                                <span>Xét duyệt đơn đăng ký</span>
                            </button>
                            <button data-menu="hop-dong" onclick="KtxApp.navigate('hop-dong'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">edit_document</span>
                                <span>Quản lý Hợp đồng cư xá</span>
                            </button>
                            <button data-menu="sinh-vien" onclick="KtxApp.navigate('sinh-vien'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">badge</span>
                                <span>Hồ sơ Sinh viên</span>
                            </button>
                            <button data-menu="lop-khoa" onclick="KtxApp.navigate('lop-khoa'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">school</span>
                                <span>Lớp & Khoa viện</span>
                            </button>
                            <button data-menu="phong-va-giuong" onclick="KtxApp.navigate('phong-va-giuong'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">domain</span>
                                <span>Sơ đồ buồng phòng</span>
                            </button>
                            <button data-menu="dien-nuoc-dich-vu" onclick="KtxApp.navigate('dien-nuoc-dich-vu'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">bolt</span>
                                <span>Điện nước & Dịch vụ</span>
                            </button>
                            <button data-menu="hoa-don" onclick="KtxApp.navigate('hoa-don'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">receipt_long</span>
                                <span>Hóa đơn & Thu phí</span>
                            </button>
                            <button data-menu="sua-chua" onclick="KtxApp.navigate('sua-chua'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">build</span>
                                <span>Yêu cầu sửa chữa</span>
                            </button>
                            <button data-menu="vi-pham" onclick="KtxApp.navigate('vi-pham'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">gavel</span>
                                <span>Vi phạm & Kỷ luật</span>
                            </button>
                            <button data-menu="nhan-vien-tai-khoan" onclick="KtxApp.navigate('nhan-vien-tai-khoan'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">manage_accounts</span>
                                <span>Nhân viên & Tài khoản</span>
                            </button>
                            <button data-menu="bao-cao" onclick="KtxApp.navigate('bao-cao'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">bar_chart</span>
                                <span>Báo cáo thống kê</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Ẩn lối tắt mà vai trò hiện tại không được phép dùng.
        palette.querySelectorAll('[data-menu]').forEach(element => {
            if (!canAccessMenu(element.dataset.menu)) element.remove();
        });
        const grid = document.getElementById('paletteShortcutsGrid');
        if (grid && grid.children.length === 0) {
            grid.innerHTML = renderStudentShortcutButtons(STUDENT_SEARCH_SHORTCUTS);
        }
    }

    function closeSearch() {
        const palette = document.getElementById('commandPaletteContainer');
        if (palette) palette.innerHTML = '';
    }

    function handlePaletteInput(query) {
        const results = document.getElementById('paletteResults');
        if (!results) return;

        if (isStudentSession()) {
            const q = (query || '').trim();
            const matched = !q
                ? STUDENT_SEARCH_SHORTCUTS
                : STUDENT_SEARCH_SHORTCUTS.filter(item => fuzzyMatch(q, item.label, item.keywords));
            results.innerHTML = matched.length > 0
                ? `
                    <div class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">${q ? 'Kết quả tìm kiếm' : 'Lối tắt thao tác nhanh'}</div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        ${renderStudentShortcutButtons(matched)}
                    </div>
                `
                : `<div class="px-4 py-8 text-center text-xs text-slate-400">Không tìm thấy mục nào phù hợp với "${escapeHtml(q)}"</div>`;
            return;
        }

        if (!query.trim()) {
            results.innerHTML = `
                <div class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lối tắt thao tác nhanh</div>
                <div class="grid grid-cols-2 gap-1.5">
                    <button data-menu="dashboard" onclick="KtxApp.navigate('dashboard'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <span class="material-symbols-outlined text-[18px] text-[#0B2A5B]">dashboard</span>
                        <span>Về Dashboard Tổng quan</span>
                    </button>
                    <button data-menu="sinh-vien" onclick="KtxApp.navigate('sinh-vien'); KtxApp.closeSearch();" class="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <span class="material-symbols-outlined text-[18px] text-[#0B2A5B]">badge</span>
                        <span>Tra cứu hồ sơ sinh viên</span>
                    </button>
                </div>
            `;
            results.querySelectorAll('[data-menu]').forEach(element => {
                if (!canAccessMenu(element.dataset.menu)) element.remove();
            });
            return;
        }

        const q = query.trim();
        const matchStudents = !canAccessMenu('sinh-vien') ? [] : (state.students || [])
            .filter(s => fuzzyMatch(q, s.name, s.mssv, s.roomNumber, s.className, s.major, s.phone))
            .slice(0, 4);
        const matchContracts = !canAccessMenu('hop-dong') ? [] : (state.contracts || [])
            .filter(c => fuzzyMatch(q, c.contractNumber, c.studentName, c.mssv, c.roomNumber, c.buildingId))
            .slice(0, 4);
        const matchApps = !canAccessMenu('don-dang-ky') ? [] : (state.applications || [])
            .filter(a => fuzzyMatch(q, a.applicationCode, a.studentName, a.mssv, a.priorityCategory, a.roomPreference))
            .slice(0, 3);
        const matchRooms = !canAccessMenu('phong-va-giuong') ? [] : (state.rooms || [])
            .filter(r => fuzzyMatch(q, r.roomNumber, r.buildingId, r.buildingName, `P.${r.roomNumber}`))
            .slice(0, 3);

        results.innerHTML = `
            ${matchStudents.length > 0 ? `
                <div class="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sinh viên</div>
                <div class="space-y-1">
                    ${matchStudents.map(s => `
                        <div onclick="KtxApp.openStudentModal('${escapeHtml(s.mssv)}'); KtxApp.closeSearch();" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer">
                            <span class="font-semibold text-xs text-slate-800 dark:text-slate-200">${escapeHtml(s.name)} (${escapeHtml(s.mssv)})</span>
                            <span class="text-xs text-slate-400">Phòng ${escapeHtml(s.roomNumber)}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${matchContracts.length > 0 ? `
                <div class="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-2">Hợp đồng</div>
                <div class="space-y-1">
                    ${matchContracts.map(c => `
                        <div onclick="KtxApp.openPrintModal('${escapeHtml(c.contractNumber)}'); KtxApp.closeSearch();" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer">
                            <span class="font-semibold text-xs text-slate-800 dark:text-slate-200">${escapeHtml(c.contractNumber)} - ${escapeHtml(c.studentName)}</span>
                            <span class="text-xs text-blue-600 font-mono">${escapeHtml(c.status)}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${matchApps.length > 0 ? `
                <div class="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-2">Đơn đăng ký</div>
                <div class="space-y-1">
                    ${matchApps.map(a => `
                        <div onclick="KtxApp.inspectCandidate('${escapeHtml(a.id)}'); KtxApp.closeSearch();" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer">
                            <span class="font-semibold text-xs text-slate-800 dark:text-slate-200">${escapeHtml(a.applicationCode)} - ${escapeHtml(a.studentName)}</span>
                            <span class="text-xs text-slate-500">${escapeHtml(a.status)}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${matchRooms.length > 0 ? `
                <div class="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-2">Buồng phòng</div>
                <div class="space-y-1">
                    ${matchRooms.map(r => `
                        <div onclick="KtxApp.inspectRoom('${escapeHtml(r.id)}'); KtxApp.closeSearch();" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer">
                            <span class="font-semibold text-xs text-slate-800 dark:text-slate-200">Phòng ${escapeHtml(r.roomNumber)} (${escapeHtml(r.buildingName || r.buildingId)})</span>
                            <span class="text-xs text-emerald-600 font-semibold">${escapeHtml(r.occupied)}/${escapeHtml(r.capacity)} chỗ</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${matchStudents.length === 0 && matchContracts.length === 0 && matchApps.length === 0 && matchRooms.length === 0 ? `
                <div class="p-6 text-center text-xs text-slate-400">Không tìm thấy kết quả phù hợp với "${escapeHtml(query)}"</div>
            ` : ''}
        `;
    }

    // Filter updates (skipFetch = true để phản hồi tức thì và giữ nguyên con trỏ đang gõ)
    function setAdmissionsTab(t) { state.admissionsTab = t; renderActiveView(false, true); }
    function setAdmissionsPriority(p) { state.admissionsPriority = p; renderActiveView(false, true); }
    function setAdmissionsRoomType(rt) { state.admissionsRoomType = rt; renderActiveView(false, true); }
    function setAdmissionsPaymentFilter(v) { state.admissionsPaymentFilter = v; renderActiveView(false, true); }
    function setAdmissionsSearch(s) { state.admissionsSearch = s; renderActiveView(false, true); }
    function resetAdmissionsFilters() {
        state.admissionsSearch = '';
        state.admissionsPriority = '';
        state.admissionsRoomType = '';
        state.admissionsPaymentFilter = '';
        state.admissionsTab = 'all';
        showToast('Đã hủy toàn bộ bộ lọc', 'info');
        renderActiveView(false, true);
    }

    function setContractsTab(t) { state.contractsTab = t; renderActiveView(false, true); }
    function setContractsBuilding(b) {
        state.contractsBuilding = b;
        state.contractsRoom = 'all';
        renderActiveView(false, true);
    }
    function setContractsRoom(r) {
        state.contractsRoom = r;
        renderActiveView(false, true);
    }
    function setContractsSearch(s) { state.contractsSearch = s; renderActiveView(false, true); }
    function resetContractsFilters() {
        state.contractsSearch = '';
        state.contractsBuilding = 'all';
        state.contractsRoom = 'all';
        state.contractsTab = 'all';
        showToast('Đã hủy toàn bộ bộ lọc hợp đồng', 'info');
        renderActiveView(false, true);
    }

    function setStudentsCohort(c) { state.studentsCohort = c; renderActiveView(false, true); }
    function setStudentsMajor(m) { state.studentsMajor = m; renderActiveView(false, true); }
    function setStudentsSearch(s) { state.studentsSearch = s; renderActiveView(false, true); }
    function resetStudentsFilters() {
        state.studentsCohort = '';
        state.studentsMajor = '';
        state.studentsSearch = '';
        showToast('Đã hủy toàn bộ bộ lọc sinh viên', 'info');
        renderActiveView(false, true);
    }

    function setRoomsViewMode(mode) { state.roomsViewMode = mode; renderActiveView(false, true); }
    function setRoomsBuilding(building) {
        state.roomsBuilding = building;
        state.roomsRoomNumber = 'all';
        state.roomsRoomDropdownOpen = false;
        renderActiveView(false, true);
    }
    function setRoomsGender(gender) {
        state.roomsGender = gender;
        state.roomsRoomNumber = 'all';
        renderActiveView(false, true);
    }
    function setRoomsFloor(floor) {
        state.roomsFloor = floor;
        state.roomsRoomNumber = 'all';
        renderActiveView(false, true);
    }
    function toggleRoomsRoomDropdown(e) {
        if (e) e.stopPropagation();
        state.roomsRoomDropdownOpen = !state.roomsRoomDropdownOpen;
        const menu = document.getElementById('roomsRoomDropdownMenu');
        if (menu) {
            menu.classList.toggle('hidden', !state.roomsRoomDropdownOpen);
        }
    }
    function selectRoomsRoomNumber(roomNumber) {
        state.roomsRoomNumber = roomNumber;
        state.roomsRoomDropdownOpen = false;
        renderActiveView(false, true);
    }
    function setRoomsRoomNumber(roomNumber) {
        state.roomsRoomNumber = roomNumber;
        renderActiveView(false, true);
    }
    function setRoomsBedStatus(status) {
        state.roomsBedStatus = status;
        renderActiveView(false, true);
    }
    function setRoomsSearch(s) {
        state.roomsSearch = s;
        renderActiveView(false, true);
    }
    function resetRoomsFilters() {
        state.roomsBuilding = 'all';
        state.roomsGender = 'all';
        state.roomsFloor = 'all';
        state.roomsRoomNumber = 'all';
        state.roomsBedStatus = 'all';
        state.roomsSearch = '';
        showToast('Đã hủy toàn bộ bộ lọc phòng', 'info');
        renderActiveView(false, true);
    }

    async function exportReport(title = 'Báo cáo') {
        if (!state.selectedAcademicYear) {
            showToast('Vui lòng chọn năm học trước khi xuất báo cáo.', 'error');
            return;
        }
        const tab = state.currentTab;
        let rows = null;
        let headers = null;
        if (tab === 'don-dang-ky') {
            try {
                const params = new URLSearchParams();
                params.set('academicYear', state.selectedAcademicYear);
                params.set('status', state.admissionsTab || 'all');
                if (state.admissionsPriority === 'stayed' || state.admissionsPriority === 'new') {
                    params.set('stayed', state.admissionsPriority);
                } else if (state.admissionsPriority) {
                    params.set('priority', state.admissionsPriority);
                }
                if (state.admissionsRoomType) params.set('roomType', state.admissionsRoomType);
                if (state.admissionsSearch && state.admissionsSearch.trim()) {
                    params.set('search', state.admissionsSearch.trim());
                }

                const res = await fetch(`/api/dondangky/export?${params.toString()}`);
                if (!res.ok) {
                    const errJson = await res.json().catch(() => ({}));
                    throw new Error(errJson?.message || 'Xuất danh sách đơn đăng ký thất bại.');
                }
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `DanhSachDonDangKy_${state.selectedAcademicYear}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                showToast('Đã xuất danh sách đơn đăng ký ra file Excel (.xlsx).', 'success');
                return;
            } catch (e) {
                showToast(e?.message || 'Xuất danh sách đơn đăng ký thất bại.', 'error');
                return;
            }
        }

        let exportTitle = title || 'BÁO CÁO DỮ LIỆU KÝ TÚC XÁ UTC2';
        let exportFileName = `BaoCao_${state.selectedAcademicYear}.xlsx`;
        let exportSheetName = 'BaoCao';

        if (tab === 'sinh-vien' && Array.isArray(state.students) && state.students.length) {
            exportTitle = 'DANH SÁCH HỒ SƠ SINH VIÊN NỘI TRÚ KÝ TÚC XÁ UTC2';
            exportFileName = `DanhSachSinhVien_${state.selectedAcademicYear}.xlsx`;
            exportSheetName = 'SinhVien';
            headers = ['STT', 'MSSV', 'Họ và tên', 'Giới tính', 'Lớp / Khóa', 'Khoa / Ngành', 'Phòng đang ở', 'Điện thoại'];
            rows = state.students.map((s, idx) => [String(idx + 1), s.mssv || s.id || '', s.name || '', s.gender || '', s.className || '', s.major || '', s.roomNumber || 'Chưa xếp', s.phone || '']);
        } else if (tab === 'hop-dong' && Array.isArray(state.contracts) && state.contracts.length) {
            exportTitle = 'DANH SÁCH HỢP ĐỒNG NỘI TRÚ KÝ TÚC XÁ UTC2';
            exportFileName = `DanhSachHopDong_${state.selectedAcademicYear}.xlsx`;
            exportSheetName = 'HopDong';
            headers = ['STT', 'Số hợp đồng', 'MSSV', 'Họ và tên', 'Phòng / Giường', 'Ngày bắt đầu', 'Ngày kết thúc', 'Tiền phòng/tháng', 'Trạng thái'];
            rows = state.contracts.map((c, idx) => [String(idx + 1), c.contractNumber || c.id || '', c.mssv || c.studentId || '', c.studentName || '', c.roomNumber || c.room || '', c.startDate || '', c.endDate || '', String(c.monthlyFee || ''), c.status || '']);
        } else if (tab === 'phong-va-giuong' && Array.isArray(state.rooms) && state.rooms.length) {
            exportTitle = 'DANH SÁCH SƠ ĐỒ PHÒNG & GIƯỜNG KÝ TÚC XÁ UTC2';
            exportFileName = `SoDoPhongGiuong_${state.selectedAcademicYear}.xlsx`;
            exportSheetName = 'SoDoPhong';
            headers = ['STT', 'Mã phòng', 'Tòa nhà', 'Tầng', 'Loại phòng', 'Đang ở / Sức chứa', 'Giá thuê/tháng', 'Trạng thái'];
            rows = state.rooms.map((r, idx) => [String(idx + 1), r.roomNumber || r.id || '', r.buildingName || r.buildingId || '', String(r.floor || ''), r.roomType || r.type || '', `${r.occupied || 0}/${r.capacity || 0}`, String(r.pricePerMonth ?? r.price ?? ''), r.status || '']);
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
                a.download = `BaoCaoTongQuanKTX_${state.selectedAcademicYear}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                showToast(`Đã xuất ${title} ra file Excel (.xlsx).`, 'success');
                return;
            } catch (e) {
                showToast('Xuất báo cáo thất bại.', 'error');
                return;
            }
        }

        try {
            const res = await fetch('/api/baocao/export-table', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: exportTitle,
                    sheetName: exportSheetName,
                    fileName: exportFileName,
                    academicYear: state.selectedAcademicYear,
                    headers,
                    rows: rows.map(r => r.map(c => String(c ?? '')))
                })
            });
            if (!res.ok) throw new Error('fail');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = exportFileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showToast(`Đã xuất ${title} ra file Excel (.xlsx).`, 'success');
        } catch (e) {
            showToast('Xuất file Excel thất bại.', 'error');
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
            closeAdmissionsActionMenus();
            closeContractsActionMenus();
            closeStudentsActionMenus();
            if (typeof closeAcademicYearMenu === 'function') closeAcademicYearMenu();
            if (typeof closeAcademicYearActionMenus === 'function') closeAcademicYearActionMenus();
            if (typeof closeRoundsActionMenus === 'function') closeRoundsActionMenus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target?.closest?.('[data-admissions-menu="true"]')) {
            closeAdmissionsActionMenus();
        }
        if (!e.target?.closest?.('[data-contracts-menu="true"]')) {
            closeContractsActionMenus();
        }
        if (!e.target?.closest?.('[data-students-menu="true"]')) {
            closeStudentsActionMenus();
        }
        if (!e.target?.closest?.('[data-academic-year-menu="true"]')) {
            if (typeof closeAcademicYearMenu === 'function') closeAcademicYearMenu();
            if (typeof closeAcademicYearActionMenus === 'function') closeAcademicYearActionMenus();
        }
        if (!e.target?.closest?.('[data-rounds-menu="true"]') && typeof closeRoundsActionMenus === 'function') {
            closeRoundsActionMenus();
        }
    });
    window.addEventListener('scroll', () => {
        closeAdmissionsActionMenus();
        closeContractsActionMenus();
        closeStudentsActionMenus();
        if (typeof closeAcademicYearMenu === 'function') closeAcademicYearMenu();
        if (typeof closeAcademicYearActionMenus === 'function') closeAcademicYearActionMenus();
        if (typeof closeRoundsActionMenus === 'function') closeRoundsActionMenus();
    }, true);
    window.addEventListener('resize', () => {
        closeAdmissionsActionMenus();
        closeContractsActionMenus();
        closeStudentsActionMenus();
        if (typeof closeAcademicYearMenu === 'function') closeAcademicYearMenu();
        if (typeof closeAcademicYearActionMenus === 'function') closeAcademicYearActionMenus();
        if (typeof closeRoundsActionMenus === 'function') closeRoundsActionMenus();
    });

    // Public API
    return {
        init: async function () {
            initTheme();
            await initUser();
            if (state.currentUser && state.currentUser.roleCode !== 'sinhVien') {
                await loadAcademicYearOptions();
            }
            renderApp(Boolean(state.currentUser));
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
        openManageRoundsModal,
        publishRound,
        editRound,
        submitEditRound,
        deleteRound,
        confirmDeleteRound,
        changeAcademicYear,
        createAcademicYear,
        submitAcademicYearForm,
        startEditAcademicYear,
        cancelEditAcademicYear,
        showNotificationToast,
        openSearch,
        closeSearch,
        handlePaletteInput,
        showToast,
        handleLoginForm,
        filterDevQuickLogin,
        quickDevLogin,
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
        setAdmissionsRoomType,
        setAdmissionsPaymentFilter,
        setAdmissionsSearch,
        resetAdmissionsFilters,
        toggleAdmissionsActionMenu,
        toggleAcademicYearActionMenu,
        closeAdmissionsActionMenus,
        closeAcademicYearActionMenus,
        closeRoundsActionMenus,
        toggleRoundsActionMenu,
        inspectCandidate,
        confirmApproveApp,
        approveApp,
        rejectApp,
        submitRejectApp,
        openPaymentProofReview,
        confirmProofApprove,
        submitProofApprove,
        openRejectProof,
        submitRejectProof,
        setContractsTab,
        setContractsBuilding,
        setContractsRoom,
        setContractsSearch,
        resetContractsFilters,
        toggleContractsActionMenu,
        closeContractsActionMenus,
        openNewContractModal,
        importContractsExcel,
        onNewContractBedChange,
        onNewContractSelectionCheck,
        onNewContractGenderChange,
        onNewContractFloorChange,
        onNewContractRoomChange,
        selectNewContractBed,
        submitNewContract,
        openPrintModal,
        printContractDocument,
        openRenewContractModal,
        updateRenewEndPreview,
        submitRenewContract,
        renewContract,
        openLiquidateContractModal,
        setLiquidateReasonPreset,
        submitLiquidateContract,
        liquidateContract,
        checkInContract,
        setStudentsCohort,
        setStudentsMajor,
        setStudentsSearch,
        resetStudentsFilters,
        openStudentModal,
        toggleStudentsActionMenu,
        closeStudentsActionMenus,
        setRoomsViewMode,
        setRoomsBuilding,
        setRoomsGender,
        setRoomsFloor,
        setRoomsRoomNumber,
        toggleRoomsRoomDropdown,
        selectRoomsRoomNumber,
        setRoomsBedStatus,
        setRoomsSearch,
        resetRoomsFilters,
        setRoomsBedStatus,
        inspectRoom,
        toggleBedMaintenance,
        closeModal,
        getCurrentTab: () => state.currentTab,
        getSelectedAcademicYear: () => state.selectedAcademicYear,
        getCurrentUser: () => state.currentUser,
        getState: () => state,
        escapeHtml,
        formatVND,
        fuzzyMatch,
        preserveSearchFocusAndUpdate,
        exportReport,
        updateStudentBadge,
        onCashFlowPointerMove,
        onCashFlowPointerLeave,
        onStudentGroupHover,
        onStudentGroupLeave,
        onStudentGroupClick,
        toggleStudentSeries,
        onRevenueOverviewPointerMove,
        onRevenueOverviewPointerLeave,
        setExpensesPeriod,
        onExpensesRowHover,
        onExpensesRowClick,
        onExpensesRingPointerMove,
        onExpensesRingPointerLeave,
        onExpensesRingClick
    };
})();

// Các file view khác (ktx-extended-views, ktx-student-views) check window.KtxApp
// để bật toast, escapeHtml, nút duyệt đơn... phải gán vào window thì mới hoạt động.
window.KtxApp = KtxApp;

// Auto boot on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    KtxApp.init();
});
// --- XSS/CSV hardening helpers ---
window.escapeHtml = function (value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
};
window.escapeCsv = function (value) {
  const s = String(value ?? '');
  if (/[",\n\r;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};


// =========================================================================
// GLOBAL CUSTOM DROPDOWN ENHANCER (Đồng bộ toàn bộ bộ lọc <select> trên mọi trang & mọi role)
// =========================================================================
(function initKtxCustomSelects() {
    let activePortal = null;
    let activeTrigger = null;
    let scheduled = false;

    function closeActivePortal() {
        if (activePortal) {
            activePortal.remove();
            activePortal = null;
        }
        if (activeTrigger) {
            const icon = activeTrigger.querySelector('[data-ktx-select-arrow]');
            if (icon) icon.classList.remove('rotate-180');
            activeTrigger.setAttribute('aria-expanded', 'false');
            activeTrigger = null;
        }
    }

    function getSelectedLabel(select) {
        const opt = select.options[select.selectedIndex];
        return opt ? opt.textContent.trim() : '';
    }

    function syncTriggerLabel(select, wrapper) {
        const labelEl = wrapper.querySelector('[data-ktx-select-label]');
        if (labelEl) {
            labelEl.textContent = getSelectedLabel(select);
        }
        const trigger = wrapper.querySelector('button[data-ktx-select-trigger]');
        if (trigger) {
            trigger.disabled = !!select.disabled;
            trigger.classList.toggle('opacity-60', !!select.disabled);
            trigger.classList.toggle('cursor-not-allowed', !!select.disabled);
        }
    }

    function openPortal(select, wrapper, trigger) {
        if (activeTrigger === trigger) {
            closeActivePortal();
            return;
        }
        closeActivePortal();

        const rect = trigger.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.setAttribute('role', 'listbox');
        menu.className = 'fixed rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] shadow-xl py-1 max-h-60 overflow-y-auto custom-scrollbar animate-fade-in';
        menu.style.zIndex = '9999';
        menu.style.minWidth = Math.max(rect.width, 192) + 'px';
        menu.style.maxWidth = '320px';

        Array.from(select.options).forEach((opt) => {
            const isSelected = opt.value === select.value;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('role', 'option');
            btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
            btn.disabled = !!opt.disabled;
            btn.className = 'w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between gap-2 ' + (
                isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-400 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            ) + (opt.disabled ? ' opacity-50 cursor-not-allowed' : '');

            const span = document.createElement('span');
            span.className = 'truncate';
            span.textContent = opt.textContent.trim();
            btn.appendChild(span);

            if (isSelected) {
                const check = document.createElement('span');
                check.className = 'material-symbols-outlined text-[16px] shrink-0';
                check.textContent = 'check';
                btn.appendChild(check);
            }

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (opt.disabled) return;
                const changed = select.value !== opt.value;
                select.value = opt.value;
                syncTriggerLabel(select, wrapper);
                closeActivePortal();
                if (changed) {
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            menu.appendChild(btn);
        });

        document.body.appendChild(menu);

        const menuRect = menu.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const top = (spaceBelow < menuRect.height + 12 && rect.top > menuRect.height + 12)
            ? Math.max(8, rect.top - menuRect.height - 6)
            : rect.bottom + 6;
        const left = Math.min(rect.left, Math.max(8, window.innerWidth - menuRect.width - 8));

        menu.style.top = top + 'px';
        menu.style.left = left + 'px';

        const icon = trigger.querySelector('[data-ktx-select-arrow]');
        if (icon) icon.classList.add('rotate-180');
        trigger.setAttribute('aria-expanded', 'true');

        activePortal = menu;
        activeTrigger = trigger;
    }

    function enhanceSelect(select) {
        if (!select || select.dataset.ktxEnhanced === 'true' || select.dataset.nativeSelect === 'true' || select.multiple) {
            return;
        }
        if (select.classList.contains('hidden')) return;

        select.dataset.ktxEnhanced = 'true';
        const isFullWidth = select.classList.contains('w-full') || select.classList.contains('flex-1');

        const wrapper = document.createElement('div');
        wrapper.className = isFullWidth ? 'relative block w-full' : 'relative inline-block';
        wrapper.dataset.ktxSelectWrapper = 'true';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.dataset.ktxSelectTrigger = 'true';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        if (select.getAttribute('aria-label')) {
            trigger.setAttribute('aria-label', select.getAttribute('aria-label'));
        }
        trigger.className = (isFullWidth ? 'w-full ' : '') +
            'h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#232B3B] text-xs font-medium text-slate-800 dark:text-white hover:border-[#0B2A5B]/50 dark:hover:border-blue-500/50 transition-colors flex items-center justify-between gap-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B2A5B]/15';

        const labelSpan = document.createElement('span');
        labelSpan.dataset.ktxSelectLabel = 'true';
        labelSpan.className = 'truncate';
        labelSpan.textContent = getSelectedLabel(select);

        const arrowSpan = document.createElement('span');
        arrowSpan.dataset.ktxSelectArrow = 'true';
        arrowSpan.className = 'material-symbols-outlined text-[18px] text-slate-400 transition-transform shrink-0';
        arrowSpan.textContent = 'expand_more';

        trigger.appendChild(labelSpan);
        trigger.appendChild(arrowSpan);

        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        wrapper.appendChild(trigger);
        select.style.position = 'absolute';
        select.style.width = '1px';
        select.style.height = '1px';
        select.style.opacity = '0';
        select.style.pointerEvents = 'none';
        select.tabIndex = -1;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (select.disabled) return;
            openPortal(select, wrapper, trigger);
        });

        select.addEventListener('change', () => syncTriggerLabel(select, wrapper));

        const optObserver = new MutationObserver(() => syncTriggerLabel(select, wrapper));
        optObserver.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });

        syncTriggerLabel(select, wrapper);
    }

    function scanAllSelects() {
        scheduled = false;
        const roots = [
            document.getElementById('mainContent'),
            document.getElementById('topNavContainer'),
            document.getElementById('modalsContainer')
        ].filter(Boolean);
        roots.forEach((root) => {
            root.querySelectorAll('select:not([data-ktx-enhanced="true"])').forEach(enhanceSelect);
        });
    }

    function scheduleScan() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(scanAllSelects);
    }

    function boot() {
        scanAllSelects();
        if (document.body) {
            const bodyObserver = new MutationObserver(scheduleScan);
            bodyObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    document.addEventListener('click', (e) => {
        if (activePortal && !activePortal.contains(e.target) && (!activeTrigger || !activeTrigger.contains(e.target))) {
            closeActivePortal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeActivePortal();
    });

    window.addEventListener('scroll', (e) => { if (activePortal && (e.target === activePortal || activePortal.contains(e.target))) return; closeActivePortal(); }, true);
    window.addEventListener('resize', closeActivePortal);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
