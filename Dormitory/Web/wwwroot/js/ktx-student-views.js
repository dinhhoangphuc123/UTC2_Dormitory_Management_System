/**
 * KTX UTC2 - Student Portal Views Module (ktx-student-views.js)
 * Implements Group 1 (01-03) full data binding + Group 2 & 3 scaffolding frames:
 * 01. sv-tong-quan (Tổng quan Dashboard)
 * 02. sv-ho-so (Hồ sơ của tôi)
 * 03. sv-dot-dang-ky (Đợt đăng ký nội trú)
 * 04. sv-dang-ky (Form đăng ký - sub-tab)
 * 05. sv-don-cua-toi (Đơn của tôi)
 * 06. sv-thanh-toan (Thanh toán đăng ký giữ chỗ)
 * 07. sv-hop-dong (Hợp đồng & Chỗ ở)
 * 08. sv-hoa-don (Hóa đơn & Biên nhận)
 * 09. sv-sua-chua (Yêu cầu sửa chữa)
 * 10. sv-vi-pham (Vi phạm & Kỷ luật)
 * 11. sv-thong-bao (Thông báo sinh viên)
 * 12. sv-ho-tro (Nội quy & Hỗ trợ)
 */

window.KtxStudentViews = (function () {
    'use strict';

    // Internal state for student portal
    const studentState = {
        activeTab: 'sv-tong-quan',
        loading: {},
        errors: {},
        // 01. Dashboard
        dashboard: null,
        recentNotifs: [],
        recentTickets: [],
        hasOpenRound: false,
        openRoundId: null,
        // 02. Profile
        profile: null,
        guardians: [],
        profileRequests: [],
        isEditingContact: false,
        contactFormData: { dienThoai: '', email: '', diaChiThuongTru: '' },
        pwdFormData: { currentPassword: '', newPassword: '', confirmPassword: '' },
        pwdVisible: { current: false, next: false, confirm: false },
        // 03. Rounds
        rounds: [],
        roundFilter: 'DANG_MO',
        // 04. Registration Form
        regRoundId: null,
        regRound: null,
        regStep: 1,
        selectedBuildingId: null,
        selectedRoomId: null,
        regBuildings: [],
        regRooms: [],
        acceptRules: false,
        submittingApp: false,
        // 05. My Applications
        applications: [],
        appFilter: 'ALL',
        selectedAppDetail: null,
        // 06. Payment
        paymentAppId: null,
        paymentInfo: null,
        paymentRemainingSeconds: 0,
        // 07. Contracts
        contracts: [],
        // 08. Invoices & Utilities
        invoices: [],
        invoiceTab: 'UNPAID',
        utilities: null,
        // 09. Maintenance
        maintenanceTickets: [],
        // 10. Violations
        violations: [],
        // 11. Notifications
        notifications: [],
        // 12. Support
        supportInfo: null,
        // Countdown interval tracker
        activeIntervals: []
    };

    const STUDENT_TABS = new Set([
        'sv-tong-quan',
        'sv-dot-dang-ky',
        'sv-dang-ky',
        'sv-don-cua-toi',
        'sv-thanh-toan',
        'sv-hop-dong',
        'sv-hoa-don',
        'sv-sua-chua',
        'sv-vi-pham',
        'sv-ho-so',
        'sv-thong-bao',
        'sv-ho-tro'
    ]);

    function hasView(tabId) {
        const baseTab = (tabId || '').split('?')[0];
        return STUDENT_TABS.has(baseTab);
    }

    // Clear background timers
    function clearTimers() {
        if (studentState.activeIntervals && studentState.activeIntervals.length) {
            studentState.activeIntervals.forEach(t => clearInterval(t));
            studentState.activeIntervals = [];
        }
    }

    // Helper: Safe HTML escaping
    function esc(val) {
        if (window.KtxApp && typeof window.KtxApp.escapeHtml === 'function') {
            return window.KtxApp.escapeHtml(val);
        }
        return String(val ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    // Helper: Currency format
    function fmtVND(val) {
        if (window.KtxApp && typeof window.KtxApp.formatVND === 'function') {
            return window.KtxApp.formatVND(val);
        }
        return new Intl.NumberFormat('vi-VN').format(val || 0) + ' đ';
    }

    // Helper: Mask CCCD (e.g. 079203001842 -> 079******842)
    function maskCccd(cccd) {
        if (!cccd || typeof cccd !== 'string') return '—';
        const str = cccd.trim();
        if (str.length < 8) return str;
        return str.substring(0, 3) + '******' + str.substring(str.length - 3);
    }

    // Helper: Fetch json wrapper with error handling
    async function apiGet(url) {
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.message || `Lỗi tải dữ liệu (${res.status})`);
        }
        return json.data;
    }

    async function apiPost(url, data) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.message || `Thao tác thất bại (${res.status})`);
        }
        return json;
    }

    async function apiPut(url, data) {
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.message || `Thao tác thất bại (${res.status})`);
        }
        return json;
    }

    async function apiDelete(url) {
        const res = await fetch(url, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.message || `Xóa thất bại (${res.status})`);
        }
        return json;
    }

    // Metric card proxy
    function renderMetricCard(opts) {
        if (window.KtxExtendedViews && typeof window.KtxExtendedViews.renderMetricCard === 'function') {
            return window.KtxExtendedViews.renderMetricCard(opts);
        }
        return `
            <div class="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">${esc(opts.label)}</div>
                <div class="text-2xl font-bold mt-2 text-[#0b2a5b] dark:text-blue-300">${esc(opts.value)}</div>
                ${opts.footer ? `<div class="text-xs text-slate-500 mt-2">${esc(opts.footer)}</div>` : ''}
            </div>
        `;
    }

    /**
     * Standard status pill badge
     */
    function statusBadge(state) {
        const s = String(state || '').toLowerCase();
        let bg = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        let text = state || '—';

        switch (s) {
            case 'dango':
            case 'dang_o':
                bg = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60';
                text = 'Đang ở KTX';
                break;
            case 'hieuluc':
            case 'da_duyet':
            case 'daduyet':
                bg = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60';
                text = 'Đã duyệt / Hiệu lực';
                break;
            case 'dathanhtoan':
            case 'dathanhtoanchonhanphong':
                bg = 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/60';
                text = 'Đã thanh toán (Chờ nhận phòng)';
                break;
            case 'choduyet':
            case 'cho_duyet':
                bg = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60';
                text = 'Chờ BQL duyệt';
                break;
            case 'chothanhtoan':
            case 'cho_thanh_toan':
            case 'duocduyetchothanhtoan':
                bg = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60';
                text = 'Được duyệt - Chờ thanh toán';
                break;
            case 'hethan':
            case 'het_han':
            case 'hethanthanhtoan':
                bg = 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60';
                text = 'Hết hạn thanh toán';
                break;
            case 'bituchoi':
            case 'tuchoi':
            case 'dahuy':
                bg = 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60';
                text = 'Bị từ chối';
                break;
            case 'dathanhtoan':
            case 'dathanhtoanchonhanphong':
                bg = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60';
                text = 'Đã thanh toán - Chờ nhận phòng';
                break;
            case 'hoantat':
            case 'hoanthanh':
            case 'completed':
                bg = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60';
                text = 'Hoàn tất đăng ký';
                break;
            case 'chuadangky':
                bg = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60';
                text = 'Chưa đăng ký';
                break;
            case 'dangxuly':
            case 'in_progress':
                bg = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60';
                text = 'Đang xử lý';
                break;
            case 'hoanthanh':
            case 'completed':
                bg = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60';
                text = 'Hoàn tất';
                break;
            case 'dangmo':
                bg = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60';
                text = 'Đang mở';
                break;
            case 'sapmo':
                bg = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60';
                text = 'Sắp mở';
                break;
            case 'dadong':
                bg = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
                text = 'Đã đóng';
                break;
            default:
                break;
        }

        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${bg}">${esc(text)}</span>`;
    }

    /**
     * Standard view header
     */
    function renderViewHeader(title, subtitle, actionsHtml = '') {
        return `
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-[#232B3B]/80 mb-6">
                <div>
                    <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">${esc(title)}</h1>
                    <p class="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1">${esc(subtitle)}</p>
                </div>
                ${actionsHtml ? `<div class="flex items-center gap-2 shrink-0">${actionsHtml}</div>` : ''}
            </div>
        `;
    }

    /**
     * Loading skeleton generator
     */
    function renderLoadingSkeleton(title, subtitle) {
        return `
            <div class="space-y-6 animate-pulse page-content-enter">
                ${renderViewHeader(title, subtitle)}
                <div class="h-32 bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B]"></div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="h-28 bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B]"></div>
                    <div class="h-28 bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B]"></div>
                    <div class="h-28 bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B]"></div>
                    <div class="h-28 bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B]"></div>
                </div>
                <div class="h-64 bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-[#232B3B]"></div>
            </div>
        `;
    }

    /**
     * Error block generator
     */
    function renderErrorState(title, subtitle, tabId, errorMsg) {
        return `
            <div class="space-y-6 page-content-enter">
                ${renderViewHeader(title, subtitle)}
                <div class="bg-white dark:bg-[#121826] rounded-2xl p-8 shadow-xs border border-red-200 dark:border-red-900/50 text-center space-y-4">
                    <div class="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
                        <span class="material-symbols-outlined text-[30px]">error</span>
                    </div>
                    <h3 class="text-base font-bold text-slate-900 dark:text-white">Không thể nạp dữ liệu</h3>
                    <p class="text-xs text-red-600 dark:text-red-400 max-w-md mx-auto">${esc(errorMsg)}</p>
                    <div class="pt-2">
                        <button type="button" onclick="KtxStudentViews.retryLoadTab('${esc(tabId)}')" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all">
                            Thử lại
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Reusable countdown timer binder
     */
    function startCountdown(deadlineUtcStr, elementId, onExpire) {
        const el = document.getElementById(elementId);
        if (!el || !deadlineUtcStr) return;

        const targetTime = new Date(deadlineUtcStr).getTime();

        function updateClock() {
            const now = Date.now();
            const diff = targetTime - now;
            if (diff <= 0) {
                el.textContent = '00:00:00 (Đã hết hạn)';
                el.classList.add('text-red-600');
                if (typeof onExpire === 'function') onExpire();
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const hh = String(hours).padStart(2, '0');
            const mm = String(minutes).padStart(2, '0');
            const ss = String(seconds).padStart(2, '0');
            el.textContent = `${hh}:${mm}:${ss}`;

            if (hours < 3) {
                el.classList.add('text-red-600');
                el.classList.remove('text-amber-700', 'text-slate-800');
            }
        }

        updateClock();
        const timer = setInterval(updateClock, 1000);
        studentState.activeIntervals.push(timer);
    }

    // =========================================================================
    // 01. TỔNG QUAN (sv-tong-quan)
    // =========================================================================

    async function loadDashboardData() {
        try {
            const [dash, notifs, tickets, rounds] = await Promise.all([
                apiGet('/api/me/dashboard'),
                apiGet('/api/me/notifications?unreadOnly=false').catch(() => []),
                apiGet('/api/me/maintenance').catch(() => []),
                apiGet('/api/me/rounds').catch(() => [])
            ]);

            studentState.dashboard = dash;
            studentState.recentNotifs = Array.isArray(notifs) ? notifs.slice(0, 5) : [];
            studentState.recentTickets = Array.isArray(tickets) ? tickets.slice(0, 3) : [];

            const openRound = Array.isArray(rounds) ? rounds.find(r => r.trangThai === 'dangMo') : null;
            studentState.hasOpenRound = Boolean(openRound);
            studentState.openRoundId = openRound ? openRound.id : null;
            studentState.errors['sv-tong-quan'] = null;
        } catch (e) {
            console.error('Error loading dashboard:', e);
            studentState.errors['sv-tong-quan'] = e.message || 'Lỗi tải tổng quan';
        }
    }

    function renderDashboardHero(d) {
        const state = d?.registrationState || 'chuaDangKy';
        const room = d?.room;

        switch (state) {
            case 'choThanhToan':
                return `
                    <div class="p-6 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-[28px]">timer</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">CẦN THANH TOÁN GIỮ CHỖ</span>
                                </div>
                                <h2 class="text-lg font-bold text-slate-900 dark:text-white mt-1">Đơn đăng ký đã duyệt — Hoàn tất nộp phí trong 24 giờ</h2>
                                <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                    Số tiền giữ chỗ: <strong class="text-amber-700 dark:text-amber-400 font-bold text-sm">${fmtVND(d.amountDue)}</strong>
                                    ${d.holdDeadline ? `• Thời gian còn lại: <span id="dashCountdownHero" class="font-mono font-bold text-amber-700 dark:text-amber-400 px-1.5 py-0.5 bg-amber-200/60 dark:bg-amber-900/60 rounded">Đang tính...</span>` : ''}
                                </p>
                            </div>
                        </div>
                        <div class="shrink-0 flex items-center gap-2">
                            <button type="button" onclick="KtxApp.navigate('sv-thanh-toan')" class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition-all inline-flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[18px]">qr_code_2</span>
                                <span>Thanh toán VietQR ngay</span>
                            </button>
                        </div>
                    </div>
                `;

            case 'choDuyet':
                return `
                    <div class="p-6 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-300/70 dark:border-amber-800/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-[28px]">pending_actions</span>
                            </div>
                            <div>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">CHỜ DUYỆT HỒ SƠ</span>
                                <h2 class="text-lg font-bold text-slate-900 dark:text-white mt-1">Đơn đăng ký đang được Ban Quản lý xét duyệt</h2>
                                <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Hồ sơ của bạn đã được ghi nhận. Ngay khi được duyệt, hệ thống sẽ cấp giường và gửi thông báo thanh toán giữ chỗ 24h.</p>
                            </div>
                        </div>
                        <div class="shrink-0">
                            <button type="button" onclick="KtxApp.navigate('sv-don-cua-toi')" class="px-4 py-2 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] hover:bg-slate-50 text-slate-800 dark:text-white font-semibold text-xs transition-all shadow-2xs">
                                Xem đơn của tôi
                            </button>
                        </div>
                    </div>
                `;

            case 'hetHan':
            case 'biTuChoi':
                return `
                    <div class="p-6 rounded-2xl bg-red-500/10 dark:bg-red-950/20 border border-red-300/70 dark:border-red-800/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-[28px]">${state === 'hetHan' ? 'event_busy' : 'cancel'}</span>
                            </div>
                            <div>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-700 dark:text-red-400">
                                    ${state === 'hetHan' ? 'HẾT HẠN GIỮ CHỖ' : 'KHÔNG ĐƯỢC DUYỆT'}
                                </span>
                                <h2 class="text-lg font-bold text-slate-900 dark:text-white mt-1">
                                    ${state === 'hetHan' ? 'Hồ sơ đã hết thời hạn thanh toán giữ chỗ 24 giờ' : 'Đơn đăng ký của bạn không được xét duyệt'}
                                </h2>
                                <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                    ${state === 'hetHan'
                                        ? 'Giường đã được tự động giải phóng cho các sinh viên khác. Bạn có thể nộp đơn mới nếu đợt đăng ký vẫn đang mở.'
                                        : 'Vui lòng kiểm tra chi tiết lý do từ chối của BQL trong mục Đơn của tôi.'}
                                </p>
                            </div>
                        </div>
                        <div class="shrink-0 flex items-center gap-2">
                            ${studentState.hasOpenRound ? `
                                <button type="button" onclick="KtxApp.navigate('sv-dot-dang-ky')" class="px-4 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all">
                                    Đăng ký lại
                                </button>
                            ` : ''}
                            <button type="button" onclick="KtxApp.navigate('sv-don-cua-toi')" class="px-4 py-2.5 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-2xs">
                                Chi tiết đơn
                            </button>
                        </div>
                    </div>
                `;

            case 'daThanhToanChoNhanPhong':
                return `
                    <div class="p-6 rounded-2xl bg-blue-500/10 dark:bg-blue-950/30 border border-blue-300/70 dark:border-blue-800/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-xl bg-blue-500/20 text-[#0B2A5B] dark:text-blue-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-[28px]">verified</span>
                            </div>
                            <div>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-[#0B2A5B] dark:text-blue-300">ĐÃ THANH TOÁN THÀNH CÔNG</span>
                                <h2 class="text-lg font-bold text-slate-900 dark:text-white mt-1">Đã giữ chỗ thành công — Chờ nhận phòng thực tế</h2>
                                <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                    Vui lòng mang theo CCCD và Thẻ sinh viên đến văn phòng Ban Quản lý KTX UTC2 vào ngày nhận phòng để nhận chìa khóa và kiểm kê tài sản.
                                </p>
                            </div>
                        </div>
                        <div class="shrink-0">
                            <button type="button" onclick="KtxApp.navigate('sv-hop-dong')" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all">
                                Xem thông tin chỗ ở
                            </button>
                        </div>
                    </div>
                `;

            case 'dangO':
                return `
                    <div class="p-6 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-300/70 dark:border-emerald-800/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-[28px]">domain_verification</span>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">ĐANG Ở KTX</span>
                                    <span class="text-xs text-slate-500 dark:text-slate-400">Nhận phòng: ${esc(room?.ngayNhanPhong || 'Đã bàn giao')}</span>
                                </div>
                                <h2 class="text-xl font-bold text-slate-900 dark:text-white mt-1">
                                    ${esc(room?.toa || 'Tòa nhà')} • Phòng ${esc(room?.phong || '—')} • Giường ${esc(room?.giuong || '—')}
                                </h2>
                                <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Hợp đồng nội trú đang có hiệu lực. Bạn có thể gửi yêu cầu sửa chữa hoặc tra cứu hóa đơn định kỳ.</p>
                            </div>
                        </div>
                        <div class="shrink-0 flex items-center gap-2">
                            <button type="button" onclick="KtxApp.navigate('sv-hop-dong')" class="px-4 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all inline-flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[17px]">home</span>
                                <span>Chỗ ở của tôi</span>
                            </button>
                        </div>
                    </div>
                `;

            case 'chuaDangKy':
            default:
                return `
                    <div class="p-6 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-[#232B3B] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-[28px]">apartment</span>
                            </div>
                            <div>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#0B2A5B] dark:text-blue-300">CHƯA ĐĂNG KÝ NỘI TRÚ</span>
                                <h2 class="text-lg font-bold text-slate-900 dark:text-white mt-1">
                                    ${studentState.hasOpenRound ? 'Ký túc xá đang mở đợt đăng ký phòng mới' : 'Hiện chưa có đợt đăng ký nội trú mở'}
                                </h2>
                                <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                    ${studentState.hasOpenRound
                                        ? 'Đăng ký phòng sớm để chọn tòa nhà, số giường phù hợp và hưởng mức giá nội trú ưu đãi của UTC2.'
                                        : 'Vui lòng theo dõi bảng tin thông báo để cập nhật lịch mở đợt đăng ký tiếp theo.'}
                                </p>
                            </div>
                        </div>
                        <div class="shrink-0">
                            ${studentState.hasOpenRound ? `
                                <button type="button" onclick="KtxApp.navigate('sv-dot-dang-ky')" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all inline-flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-[18px]">how_to_reg</span>
                                    <span>Đăng ký ngay</span>
                                </button>
                            ` : `
                                <button type="button" onclick="KtxApp.navigate('sv-dot-dang-ky')" class="px-4 py-2 rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#232B3B] text-slate-700 dark:text-slate-300 font-semibold text-xs">
                                    Xem lịch đợt
                                </button>
                            `}
                        </div>
                    </div>
                `;
        }
    }

    async function renderTongQuan(container) {
        clearTimers();
        if (!studentState.dashboard && !studentState.loading['sv-tong-quan']) {
            studentState.loading['sv-tong-quan'] = true;
            container.innerHTML = renderLoadingSkeleton('Tổng quan Sinh viên', 'Đang nạp dữ liệu trung tâm nội trú...');
            await loadDashboardData();
            studentState.loading['sv-tong-quan'] = false;
        }

        if (studentState.errors['sv-tong-quan']) {
            container.innerHTML = renderErrorState('Tổng quan Sinh viên', 'Trung tâm theo dõi trạng thái nội trú', 'sv-tong-quan', studentState.errors['sv-tong-quan']);
            return;
        }

        const d = studentState.dashboard || {
            registrationState: 'chuaDangKy',
            amountDue: 0,
            nextDueDate: null,
            unpaidInvoiceCount: 0,
            unreadNotificationCount: 0,
            openMaintenanceCount: 0
        };

        const heroHtml = renderDashboardHero(d);

        const metricCards = `
            <div class="cursor-pointer transition-transform hover:-translate-y-0.5" onclick="KtxApp.navigate('sv-hoa-don')">
                ${renderMetricCard({
                    label: 'CẦN THANH TOÁN',
                    value: fmtVND(d.amountDue),
                    tone: d.amountDue > 0 ? 'amber' : 'green',
                    icon: 'payments',
                    footer: d.amountDue > 0 ? (d.nextDueDate ? `Hạn nộp: ${esc(d.nextDueDate)}` : 'Khoản nợ hiện tại') : 'Không có nợ tồn đọng'
                })}
            </div>
            <div class="cursor-pointer transition-transform hover:-translate-y-0.5" onclick="KtxApp.navigate('sv-hoa-don')">
                ${renderMetricCard({
                    label: 'HÓA ĐƠN CÒN NỢ',
                    value: String(d.unpaidInvoiceCount || 0),
                    tone: d.unpaidInvoiceCount > 0 ? 'red' : 'blue',
                    icon: 'receipt_long',
                    footer: d.unpaidInvoiceCount > 0 ? 'Cần thanh toán sớm' : 'Đã hoàn tất thanh toán'
                })}
            </div>
            <div class="cursor-pointer transition-transform hover:-translate-y-0.5" onclick="KtxApp.navigate('sv-thong-bao')">
                ${renderMetricCard({
                    label: 'THÔNG BÁO CHƯA ĐỌC',
                    value: String(d.unreadNotificationCount || 0),
                    tone: d.unreadNotificationCount > 0 ? 'amber' : 'slate',
                    icon: 'notifications',
                    footer: 'Từ Ban Quản lý KTX'
                })}
            </div>
            <div class="cursor-pointer transition-transform hover:-translate-y-0.5" onclick="KtxApp.navigate('sv-sua-chua')">
                ${renderMetricCard({
                    label: 'PHIẾU SỬA CHỮA ĐANG MỞ',
                    value: String(d.openMaintenanceCount || 0),
                    tone: d.openMaintenanceCount > 0 ? 'blue' : 'slate',
                    icon: 'build',
                    footer: d.openMaintenanceCount > 0 ? 'Kỹ thuật viên đang xử lý' : 'Không có sự cố mở'
                })}
            </div>
        `;

        const notifs = studentState.recentNotifs;
        const tickets = studentState.recentTickets;

        container.innerHTML = `
            <div class="space-y-6 page-content-enter">
                ${renderViewHeader('Tổng quan Sinh viên', 'Trung tâm theo dõi trạng thái nội trú, hóa đơn, thông báo và hỗ trợ KTX', `
                    <button type="button" onclick="KtxStudentViews.retryLoadTab('sv-tong-quan')" class="px-3 py-2 rounded-xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs">
                        <span class="material-symbols-outlined text-[17px]">refresh</span>
                        <span>Làm mới</span>
                    </button>
                `)}

                <!-- Hero Registration State Banner -->
                ${heroHtml}

                <!-- Metric Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${metricCards}
                </div>

                <!-- Bottom Two Column Section -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Left: Latest Notifications -->
                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">notifications</span>
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Thông báo mới nhất</h3>
                            </div>
                            <button type="button" onclick="KtxApp.navigate('sv-thong-bao')" class="text-xs font-semibold text-[#0B2A5B] dark:text-blue-400 hover:underline">
                                Xem tất cả
                            </button>
                        </div>
                        <div class="divide-y divide-slate-100 dark:divide-slate-800">
                            ${notifs.length ? notifs.map(n => `
                                <div class="py-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition-colors" onclick="KtxStudentViews.openNotificationModal(${n.id})">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="text-xs font-semibold text-slate-900 dark:text-white truncate ${n.daDoc ? 'opacity-80' : 'font-bold'}">
                                            ${esc(n.tieuDe)}
                                        </span>
                                        ${!n.daDoc ? '<span class="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>' : ''}
                                    </div>
                                    <div class="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                                        <span>${esc(n.loai || 'chung')}</span>
                                        <span>${esc(n.ngayTao)}</span>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="py-8 text-center text-xs text-slate-400">
                                    Chưa có thông báo nào mới
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- Right: Recent Maintenance Tickets -->
                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">build</span>
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Phiếu báo hỏng gần đây</h3>
                            </div>
                            <button type="button" onclick="KtxApp.navigate('sv-sua-chua')" class="text-xs font-semibold text-[#0B2A5B] dark:text-blue-400 hover:underline">
                                Xem tất cả
                            </button>
                        </div>
                        <div class="divide-y divide-slate-100 dark:divide-slate-800">
                            ${tickets.length ? tickets.map(t => `
                                <div class="py-3 flex items-center justify-between gap-3">
                                    <div class="min-w-0">
                                        <div class="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            SC-${String(t.id).padStart(6, '0')} • ${esc(t.loaiSuCo || t.moTa || 'Sửa chữa')}
                                        </div>
                                        <div class="text-[11px] text-slate-400 mt-0.5 truncate">
                                            ${esc(t.moTa)}
                                        </div>
                                    </div>
                                    <div class="shrink-0 text-right">
                                        ${statusBadge(t.trangThai)}
                                        <div class="text-[10px] text-slate-400 mt-1">${esc(t.ngayGui)}</div>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="py-8 text-center text-xs text-slate-400">
                                    Không có phiếu sửa chữa nào gần đây
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // If in hold state, attach countdown
        if (d.registrationState === 'choThanhToan' && d.holdDeadline) {
            startCountdown(d.holdDeadline, 'dashCountdownHero', () => {
                KtxStudentViews.retryLoadTab('sv-tong-quan');
            });
        }
    }

    // =========================================================================
    // 02. HỒ SƠ CỦA TÔI (sv-ho-so)
    // =========================================================================

    async function loadProfileData() {
        try {
            const [prof, guards, reqs] = await Promise.all([
                apiGet('/api/me/profile'),
                apiGet('/api/me/guardians').catch(() => []),
                apiGet('/api/me/profile-change-requests').catch(() => [])
            ]);

            studentState.profile = prof;
            studentState.guardians = Array.isArray(guards) ? guards : [];
            studentState.profileRequests = Array.isArray(reqs) ? reqs : [];
            studentState.contactFormData = {
                dienThoai: prof?.dienThoai || '',
                email: prof?.email || '',
                diaChiThuongTru: prof?.diaChiThuongTru || ''
            };
            studentState.errors['sv-ho-so'] = null;
        } catch (e) {
            console.error('Error loading profile:', e);
            studentState.errors['sv-ho-so'] = e.message || 'Lỗi tải hồ sơ cá nhân';
        }
    }

    async function renderHoSo(container) {
        if (!studentState.profile && !studentState.loading['sv-ho-so']) {
            studentState.loading['sv-ho-so'] = true;
            container.innerHTML = renderLoadingSkeleton('Hồ sơ của tôi', 'Đang nạp thông tin cá nhân...');
            await loadProfileData();
            studentState.loading['sv-ho-so'] = false;
        }

        if (studentState.errors['sv-ho-so']) {
            container.innerHTML = renderErrorState('Hồ sơ của tôi', 'Quản lý thông tin định danh và người thân', 'sv-ho-so', studentState.errors['sv-ho-so']);
            return;
        }

        const p = studentState.profile || {};
        const isEditing = studentState.isEditingContact;

        container.innerHTML = `
            <div class="space-y-6 page-content-enter">
                ${renderViewHeader('Hồ sơ của tôi', 'Thông tin định danh sinh viên, thông tin liên hệ và người thân', `
                    <button type="button" onclick="KtxStudentViews.retryLoadTab('sv-ho-so')" class="px-3 py-2 rounded-xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs">
                        <span class="material-symbols-outlined text-[17px]">refresh</span>
                        <span>Làm mới</span>
                    </button>
                `)}

                <!-- Top: Profile Header Card -->
                <div class="p-6 rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-16 h-16 rounded-full bg-[#0B2A5B] text-white flex items-center justify-center text-xl font-bold ring-4 ring-blue-100 dark:ring-blue-900/40 shrink-0">
                            ${esc(p.hoTen ? p.hoTen.charAt(0) : 'S')}
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-lg font-bold text-slate-900 dark:text-white">${esc(p.hoTen)}</h2>
                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0B2A5B] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60">
                                    ${esc(p.maSinhVien)}
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Lớp: <strong>${esc(p.maLop || '—')}</strong> • Khoa: <strong>${esc(p.tenKhoa || '—')}</strong> • Niên khóa: <strong>${esc(p.namNhapHoc || '—')}</strong>
                            </p>
                        </div>
                    </div>
                    <div>
                        ${statusBadge(p.trangThai === 'dangHoc' ? 'Đang học' : p.trangThai)}
                    </div>
                </div>

                <!-- Block A: Read-only Identity Info -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">badge</span>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Thông tin định danh</h3>
                        </div>
                        <span class="text-[11px] text-slate-400 italic">Chỉ đọc • Bấm điều chỉnh để đề xuất BQL sửa</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] flex items-center justify-between">
                            <div>
                                <span class="text-slate-400 block text-[11px]">Họ và tên</span>
                                <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(p.hoTen)}</span>
                            </div>
                            <button type="button" onclick="KtxStudentViews.openChangeRequestModal('hoTen', 'Họ và tên', '${esc(p.hoTen)}')" class="text-[#0B2A5B] dark:text-blue-400 hover:underline font-semibold text-[11px]">
                                Điều chỉnh
                            </button>
                        </div>

                        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] flex items-center justify-between">
                            <div>
                                <span class="text-slate-400 block text-[11px]">Ngày sinh</span>
                                <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(p.ngaySinh)}</span>
                            </div>
                            <button type="button" onclick="KtxStudentViews.openChangeRequestModal('ngaySinh', 'Ngày sinh', '${esc(p.ngaySinh)}')" class="text-[#0B2A5B] dark:text-blue-400 hover:underline font-semibold text-[11px]">
                                Điều chỉnh
                            </button>
                        </div>

                        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] flex items-center justify-between">
                            <div>
                                <span class="text-slate-400 block text-[11px]">Giới tính</span>
                                <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${p.gioiTinh === 'nam' ? 'Nam' : 'Nữ'}</span>
                            </div>
                            <button type="button" onclick="KtxStudentViews.openChangeRequestModal('gioiTinh', 'Giới tính', '${esc(p.gioiTinh)}')" class="text-[#0B2A5B] dark:text-blue-400 hover:underline font-semibold text-[11px]">
                                Điều chỉnh
                            </button>
                        </div>

                        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] flex items-center justify-between">
                            <div>
                                <span class="text-slate-400 block text-[11px]">Số CCCD / Mã định danh</span>
                                <span class="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(maskCccd(p.cccd))}</span>
                            </div>
                            <button type="button" onclick="KtxStudentViews.openChangeRequestModal('cccd', 'Số CCCD', '${esc(p.cccd)}')" class="text-[#0B2A5B] dark:text-blue-400 hover:underline font-semibold text-[11px]">
                                Điều chỉnh
                            </button>
                        </div>

                        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] flex items-center justify-between">
                            <div>
                                <span class="text-slate-400 block text-[11px]">Mã lớp sinh viên</span>
                                <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(p.maLop)}</span>
                            </div>
                            <button type="button" onclick="KtxStudentViews.openChangeRequestModal('maLop', 'Mã lớp', '${esc(p.maLop)}')" class="text-[#0B2A5B] dark:text-blue-400 hover:underline font-semibold text-[11px]">
                                Điều chỉnh
                            </button>
                        </div>

                        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                            <span class="text-slate-400 block text-[11px]">Đối tượng ưu tiên</span>
                            <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(p.doiTuongUuTien || 'Không có')}</span>
                        </div>
                    </div>

                    <!-- Change Request History -->
                    ${studentState.profileRequests.length ? `
                        <div class="pt-3">
                            <span class="text-xs font-bold text-slate-800 dark:text-white block mb-2">Lịch sử yêu cầu điều chỉnh hồ sơ</span>
                            <div class="overflow-x-auto border border-slate-200/60 dark:border-[#232B3B] rounded-xl">
                                <table class="w-full text-left text-xs">
                                    <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200/60 dark:border-[#232B3B]">
                                        <tr>
                                            <th class="p-2.5">Trường</th>
                                            <th class="p-2.5">Giá trị mới đề xuất</th>
                                            <th class="p-2.5">Lý do</th>
                                            <th class="p-2.5">Ngày gửi</th>
                                            <th class="p-2.5">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                        ${studentState.profileRequests.map(r => `
                                            <tr>
                                                <td class="p-2.5 font-semibold text-slate-800 dark:text-white">${esc(r.truong)}</td>
                                                <td class="p-2.5 font-bold text-blue-700 dark:text-blue-400">${esc(r.giaTriMoi)}</td>
                                                <td class="p-2.5 text-slate-600 dark:text-slate-300 max-w-[200px] truncate" title="${esc(r.lyDo)}">${esc(r.lyDo)}</td>
                                                <td class="p-2.5 text-slate-400">${esc(r.ngayGui)}</td>
                                                <td class="p-2.5">${statusBadge(r.trangThai)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Block B: Editable Contact Information -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">contact_phone</span>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Thông tin liên hệ</h3>
                        </div>
                        ${!isEditing ? `
                            <button type="button" onclick="KtxStudentViews.toggleEditContact(true)" class="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors">
                                <span class="material-symbols-outlined text-[16px]">edit</span>
                                <span>Chỉnh sửa</span>
                            </button>
                        ` : ''}
                    </div>

                    ${!isEditing ? `
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                <span class="text-slate-400 block text-[11px]">Số điện thoại</span>
                                <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(p.dienThoai || 'Chưa cập nhật')}</span>
                            </div>
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                <span class="text-slate-400 block text-[11px]">Email liên hệ</span>
                                <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(p.email || 'Chưa cập nhật')}</span>
                            </div>
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                <span class="text-slate-400 block text-[11px]">Địa chỉ thường trú</span>
                                <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block truncate" title="${esc(p.diaChiThuongTru)}">${esc(p.diaChiThuongTru || 'Chưa cập nhật')}</span>
                            </div>
                        </div>
                    ` : `
                        <form onsubmit="KtxStudentViews.submitContactUpdate(event)" class="space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Số điện thoại (10 số)</label>
                                    <input type="text" id="contactPhone" required value="${esc(studentState.contactFormData.dienThoai)}" class="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold" />
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                    <input type="email" id="contactEmail" required value="${esc(studentState.contactFormData.email)}" class="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold" />
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Địa chỉ thường trú</label>
                                    <input type="text" id="contactAddress" required value="${esc(studentState.contactFormData.diaChiThuongTru)}" class="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold" />
                                </div>
                            </div>
                            <div class="flex items-center gap-2 pt-2">
                                <button type="submit" id="btnSaveContact" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all">
                                    Lưu thay đổi
                                </button>
                                <button type="button" onclick="KtxStudentViews.toggleEditContact(false)" class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors">
                                    Hủy
                                </button>
                            </div>
                        </form>
                    `}
                </div>

                <!-- Block C: Guardians (Người thân liên hệ) -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">group</span>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Người thân liên hệ (${studentState.guardians.length}/5)</h3>
                        </div>
                        <button type="button" onclick="KtxStudentViews.openGuardianModal()" ${studentState.guardians.length >= 5 ? 'disabled' : ''} class="px-3.5 py-1.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] disabled:bg-slate-300 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs">
                            <span class="material-symbols-outlined text-[16px]">add</span>
                            <span>Thêm người thân</span>
                        </button>
                    </div>

                    ${studentState.guardians.length ? `
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${studentState.guardians.map(g => `
                                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] space-y-2">
                                    <div class="flex items-start justify-between gap-2">
                                        <div>
                                            <h4 class="text-sm font-bold text-slate-900 dark:text-white">${esc(g.hoTen)}</h4>
                                            <span class="text-xs text-slate-500 font-semibold">${esc(g.quanHe || g.moiQuanHe)}</span>
                                        </div>
                                        ${g.laLienHeKhanCap ? `
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200/60">
                                                Khẩn cấp
                                            </span>
                                        ` : ''}
                                    </div>
                                    <div class="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pt-1">
                                        <span class="material-symbols-outlined text-[16px] text-slate-400">call</span>
                                        <span class="font-mono font-bold">${esc(g.dienThoai)}</span>
                                    </div>
                                    <div class="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-[#232B3B]">
                                        <button type="button" onclick="KtxStudentViews.openGuardianModal('${esc(g.id)}')" class="text-xs font-semibold text-[#0B2A5B] dark:text-blue-400 hover:underline">Sửa</button>
                                        <span class="text-slate-300">•</span>
                                        <button type="button" onclick="KtxStudentViews.confirmDeleteGuardian('${esc(g.id)}', '${esc(g.hoTen)}')" class="text-xs font-semibold text-red-600 hover:underline">Xóa</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="py-8 text-center text-xs text-slate-400">
                            Chưa có thông tin người thân. Vui lòng thêm ít nhất một người để liên hệ trong trường hợp khẩn cấp.
                        </div>
                    `}
                </div>

                <!-- Block D: Change Password -->
                <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                    <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">lock_reset</span>
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Đổi mật khẩu tài khoản</h3>
                    </div>

                    <form onsubmit="KtxStudentViews.submitChangePassword(event)" class="max-w-xl space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mật khẩu hiện tại</label>
                            <div class="relative">
                                <input type="${studentState.pwdVisible.current ? 'text' : 'password'}" id="pwdCurrent" required class="w-full h-10 px-3 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold" />
                                <button type="button" onclick="KtxStudentViews.togglePwdView('current')" class="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-1">
                                    <span class="material-symbols-outlined text-[18px]">${studentState.pwdVisible.current ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mật khẩu mới (Tối thiểu 8 ký tự)</label>
                            <div class="relative">
                                <input type="${studentState.pwdVisible.next ? 'text' : 'password'}" id="pwdNew" required minlength="8" class="w-full h-10 px-3 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold" />
                                <button type="button" onclick="KtxStudentViews.togglePwdView('next')" class="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-1">
                                    <span class="material-symbols-outlined text-[18px]">${studentState.pwdVisible.next ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Xác nhận mật khẩu mới</label>
                            <div class="relative">
                                <input type="${studentState.pwdVisible.confirm ? 'text' : 'password'}" id="pwdConfirm" required minlength="8" class="w-full h-10 px-3 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold" />
                                <button type="button" onclick="KtxStudentViews.togglePwdView('confirm')" class="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-1">
                                    <span class="material-symbols-outlined text-[18px]">${studentState.pwdVisible.confirm ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        <div class="pt-2">
                            <button type="submit" id="btnChangePassword" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all">
                                Cập nhật mật khẩu
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 03. ĐỢT ĐĂNG KÝ (sv-dot-dang-ky)
    // =========================================================================

    async function loadRoundsData() {
        try {
            const rounds = await apiGet('/api/me/rounds');
            studentState.rounds = Array.isArray(rounds) ? rounds : [];
            studentState.errors['sv-dot-dang-ky'] = null;
        } catch (e) {
            console.error('Error loading rounds:', e);
            studentState.errors['sv-dot-dang-ky'] = e.message || 'Lỗi tải đợt đăng ký';
        }
    }

    async function renderDotDangKy(container) {
        clearTimers();
        if (!studentState.rounds.length && !studentState.loading['sv-dot-dang-ky']) {
            studentState.loading['sv-dot-dang-ky'] = true;
            container.innerHTML = renderLoadingSkeleton('Đợt đăng ký Nội trú', 'Đang nạp danh sách đợt xét tuyển...');
            await loadRoundsData();
            studentState.loading['sv-dot-dang-ky'] = false;
        }

        if (studentState.errors['sv-dot-dang-ky']) {
            container.innerHTML = renderErrorState('Đợt đăng ký Nội trú', 'Tra cứu đợt xét duyệt và nộp đơn giữ chỗ', 'sv-dot-dang-ky', studentState.errors['sv-dot-dang-ky']);
            return;
        }

        const filter = studentState.roundFilter;
        const allRounds = studentState.rounds;

        const countDangMo = allRounds.filter(r => r.trangThai === 'dangMo').length;
        const countSapMo = allRounds.filter(r => r.trangThai === 'sapMo').length;
        const countDaDong = allRounds.filter(r => r.trangThai === 'daDong').length;

        let filtered = allRounds;
        if (filter === 'DANG_MO') filtered = allRounds.filter(r => r.trangThai === 'dangMo');
        else if (filter === 'SAP_MO') filtered = allRounds.filter(r => r.trangThai === 'sapMo');
        else if (filter === 'DA_DONG') filtered = allRounds.filter(r => r.trangThai === 'daDong');

        container.innerHTML = `
            <div class="space-y-6 page-content-enter">
                ${renderViewHeader('Đợt đăng ký Nội trú', 'Tra cứu danh sách đợt đăng ký, tiêu chuẩn xét duyệt và phòng còn trống', `
                    <button type="button" onclick="KtxStudentViews.retryLoadTab('sv-dot-dang-ky')" class="px-3 py-2 rounded-xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs">
                        <span class="material-symbols-outlined text-[17px]">refresh</span>
                        <span>Làm mới</span>
                    </button>
                `)}

                <!-- Filter Tabs -->
                <div class="flex items-center gap-2 border-b border-slate-200/60 dark:border-[#232B3B] pb-2 overflow-x-auto">
                    <button type="button" onclick="KtxStudentViews.setRoundFilter('DANG_MO')" class="px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                        filter === 'DANG_MO' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }">
                        Đang mở (${countDangMo})
                    </button>
                    <button type="button" onclick="KtxStudentViews.setRoundFilter('SAP_MO')" class="px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                        filter === 'SAP_MO' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }">
                        Sắp mở (${countSapMo})
                    </button>
                    <button type="button" onclick="KtxStudentViews.setRoundFilter('DA_DONG')" class="px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                        filter === 'DA_DONG' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }">
                        Đã đóng (${countDaDong})
                    </button>
                    <button type="button" onclick="KtxStudentViews.setRoundFilter('ALL')" class="px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                        filter === 'ALL' ? 'bg-[#0B2A5B] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }">
                        Tất cả (${allRounds.length})
                    </button>
                </div>

                <!-- Rounds Grid -->
                ${filtered.length ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${filtered.map(r => {
                            const isDangMo = r.trangThai === 'dangMo';
                            const isEligible = r.eligible;
                            const canRegister = isDangMo && isEligible;
                            const reasons = Array.isArray(r.reasons) ? r.reasons : [];

                            return `
                                <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] flex flex-col justify-between gap-5 transition-shadow hover:shadow-md">
                                    <div class="space-y-3">
                                        <div class="flex items-start justify-between gap-3">
                                            <div>
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0B2A5B] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60">
                                                    ${esc(r.maKyHoc || 'Kỳ học')}
                                                </span>
                                                <h3 class="text-base font-bold text-slate-900 dark:text-white mt-1">${esc(r.tenDot)}</h3>
                                            </div>
                                            ${statusBadge(r.trangThai)}
                                        </div>

                                        <div class="text-xs text-slate-500 space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-[#232B3B]">
                                            <div class="flex items-center justify-between">
                                                <span>Thời gian mở:</span>
                                                <strong class="text-slate-800 dark:text-slate-200">${esc(r.ngayMo)}</strong>
                                            </div>
                                            <div class="flex items-center justify-between">
                                                <span>Thời gian đóng:</span>
                                                <strong class="text-slate-800 dark:text-slate-200">${esc(r.ngayDong)}</strong>
                                            </div>
                                            ${r.ghiChu ? `<div class="pt-1 text-[11px] text-slate-400 italic">${esc(r.ghiChu)}</div>` : ''}
                                        </div>

                                        <!-- Eligibility Check block -->
                                        <div>
                                            ${isEligible ? `
                                                <div class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                                                    <span class="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                                                    <span class="font-semibold">Đủ điều kiện đăng ký đợt này</span>
                                                </div>
                                            ` : `
                                                <div class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 text-xs space-y-1">
                                                    <div class="flex items-center gap-1.5 font-bold">
                                                        <span class="material-symbols-outlined text-[18px] text-amber-600">warning</span>
                                                        <span>Chưa đủ điều kiện:</span>
                                                    </div>
                                                    <ul class="list-disc list-inside text-[11px] text-amber-800 dark:text-amber-300/80 pl-1">
                                                        ${reasons.map(res => `<li>${esc(res)}</li>`).join('')}
                                                    </ul>
                                                </div>
                                            `}
                                        </div>
                                    </div>

                                    <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                                        <span class="text-[11px] text-slate-400">Giữ chỗ 24h sau khi duyệt</span>
                                        ${canRegister ? `
                                            <button type="button" onclick="KtxStudentViews.openRegistrationForm('${esc(r.id)}')" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all inline-flex items-center gap-1.5">
                                                <span>Đăng ký ngay</span>
                                                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                                            </button>
                                        ` : `
                                            <button type="button" disabled class="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold text-xs cursor-not-allowed">
                                                ${r.trangThai === 'daDong' ? 'Đã đóng' : (r.trangThai === 'sapMo' ? 'Sắp mở' : 'Không khả dụng')}
                                            </button>
                                        `}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : `
                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-12 text-center border border-slate-200/80 dark:border-[#232B3B] space-y-3">
                        <div class="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                            <span class="material-symbols-outlined text-[28px]">event_busy</span>
                        </div>
                        <h4 class="text-sm font-bold text-slate-800 dark:text-white">Không có đợt đăng ký nào trong mục này</h4>
                        <p class="text-xs text-slate-500 max-w-sm mx-auto">Vui lòng chọn mục tab khác hoặc quay lại sau để cập nhật lịch tuyển sinh mới.</p>
                    </div>
                `}
            </div>
        `;
    }

    // =========================================================================
    // MODALS & EVENT HANDLERS (GROUP 1)
    // =========================================================================

    function toggleEditContact(isEdit) {
        studentState.isEditingContact = Boolean(isEdit);
        if (!isEdit && studentState.profile) {
            studentState.contactFormData = {
                dienThoai: studentState.profile.dienThoai || '',
                email: studentState.profile.email || '',
                diaChiThuongTru: studentState.profile.diaChiThuongTru || ''
            };
        }
        const container = document.getElementById('mainContent');
        if (container) renderHoSo(container);
    }

    async function submitContactUpdate(e) {
        e.preventDefault();
        const phone = document.getElementById('contactPhone')?.value.trim();
        const email = document.getElementById('contactEmail')?.value.trim();
        const address = document.getElementById('contactAddress')?.value.trim();

        if (!phone || !/^0\d{9,10}$/.test(phone)) {
            if (window.KtxApp) window.KtxApp.showToast('Số điện thoại không hợp lệ (10-11 số, bắt đầu số 0)', 'error');
            return;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (window.KtxApp) window.KtxApp.showToast('Email không đúng định dạng', 'error');
            return;
        }

        const btn = document.getElementById('btnSaveContact');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Đang lưu...';
        }

        try {
            await apiPut('/api/me/profile', {
                dienThoai: phone,
                email: email,
                diaChiThuongTru: address
            });

            if (window.KtxApp) window.KtxApp.showToast('Cập nhật thông tin liên hệ thành công!', 'success');
            studentState.isEditingContact = false;
            await loadProfileData();
            const container = document.getElementById('mainContent');
            if (container) renderHoSo(container);
        } catch (err) {
            if (window.KtxApp) window.KtxApp.showToast(err.message || 'Lỗi cập nhật', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Lưu thay đổi';
            }
        }
    }

    function openChangeRequestModal(fieldName, fieldLabel, currentValue) {
        const modalsContainer = document.getElementById('modalsContainer');
        if (!modalsContainer) return;

        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
                <div class="bg-white dark:bg-[#121826] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] space-y-4">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Yêu cầu đính chính hồ sơ</h3>
                        <button type="button" onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>

                    <form onsubmit="KtxStudentViews.submitChangeRequest(event)" class="space-y-4 text-xs">
                        <input type="hidden" id="reqField" value="${esc(fieldName)}" />

                        <div>
                            <span class="text-slate-400 block mb-1">Trường thông tin cần sửa</span>
                            <div class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-white">
                                ${esc(fieldLabel)}
                            </div>
                        </div>

                        <div>
                            <span class="text-slate-400 block mb-1">Giá trị hiện tại</span>
                            <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-500">
                                ${esc(currentValue)}
                            </div>
                        </div>

                        <div>
                            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Giá trị mới đề xuất (*)</label>
                            <input type="text" id="reqNewVal" required placeholder="Nhập giá trị mới chính xác..." class="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold" />
                        </div>

                        <div>
                            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Lý do yêu cầu đính chính (*)</label>
                            <textarea id="reqReason" required rows="3" placeholder="Ghi rõ lý do (ví dụ: sai sót theo CCCD mới cấp)..." class="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold"></textarea>
                        </div>

                        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs">Hủy</button>
                            <button type="submit" id="btnSubmitChangeReq" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm">Gửi yêu cầu</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitChangeRequest(e) {
        e.preventDefault();
        const truong = document.getElementById('reqField')?.value;
        const giaTriMoi = document.getElementById('reqNewVal')?.value.trim();
        const lyDo = document.getElementById('reqReason')?.value.trim();

        if (!truong || !giaTriMoi || !lyDo) {
            if (window.KtxApp) window.KtxApp.showToast('Vui lòng điền đầy đủ giá trị mới và lý do', 'error');
            return;
        }

        const btn = document.getElementById('btnSubmitChangeReq');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Đang gửi...';
        }

        try {
            await apiPost('/api/me/profile-change-requests', {
                truong,
                giaTriMoi,
                lyDo
            });

            if (window.KtxApp) {
                window.KtxApp.closeModal();
                window.KtxApp.showToast('Đã gửi yêu cầu đính chính đến BQL xét duyệt!', 'success');
            }
            await loadProfileData();
            const container = document.getElementById('mainContent');
            if (container) renderHoSo(container);
        } catch (err) {
            if (window.KtxApp) window.KtxApp.showToast(err.message || 'Lỗi gửi yêu cầu', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Gửi yêu cầu';
            }
        }
    }

    function openGuardianModal(guardianId = null) {
        const modalsContainer = document.getElementById('modalsContainer');
        if (!modalsContainer) return;

        let g = null;
        if (guardianId) {
            g = studentState.guardians.find(x => x.id === guardianId);
        }

        const isEdit = Boolean(g);

        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
                <div class="bg-white dark:bg-[#121826] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] space-y-4">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                            ${isEdit ? 'Chỉnh sửa người thân liên hệ' : 'Thêm người thân liên hệ mới'}
                        </h3>
                        <button type="button" onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>

                    <form onsubmit="KtxStudentViews.submitGuardianForm(event, '${isEdit ? esc(g.id) : ''}')" class="space-y-4 text-xs">
                        <div>
                            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Họ và tên (*)</label>
                            <input type="text" id="gName" required value="${esc(g?.hoTen || '')}" placeholder="Nguyễn Văn A" class="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold" />
                        </div>

                        <div>
                            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mối quan hệ (*)</label>
                            <select id="gRelation" required class="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold">
                                <option value="Bố" ${g?.quanHe === 'Bố' ? 'selected' : ''}>Bố</option>
                                <option value="Mẹ" ${g?.quanHe === 'Mẹ' ? 'selected' : ''}>Mẹ</option>
                                <option value="Anh/Chị/Em" ${g?.quanHe === 'Anh/Chị/Em' ? 'selected' : ''}>Anh / Chị / Em</option>
                                <option value="Người giám hộ" ${g?.quanHe === 'Người giám hộ' ? 'selected' : ''}>Người giám hộ</option>
                                <option value="Khác" ${g?.quanHe === 'Khác' ? 'selected' : ''}>Khác</option>
                            </select>
                        </div>

                        <div>
                            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Số điện thoại (*)</label>
                            <input type="text" id="gPhone" required value="${esc(g?.dienThoai || '')}" placeholder="0987654321" class="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold" />
                        </div>

                        <div class="flex items-center gap-2 pt-1">
                            <input type="checkbox" id="gIsEmergency" ${g?.laLienHeKhanCap ? 'checked' : ''} class="w-4 h-4 rounded text-[#0B2A5B] focus:ring-blue-500" />
                            <label for="gIsEmergency" class="font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                                Đặt làm liên hệ khẩn cấp ưu tiên
                            </label>
                        </div>

                        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs">Hủy</button>
                            <button type="submit" id="btnSaveGuardian" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm">
                                ${isEdit ? 'Lưu thay đổi' : 'Thêm người thân'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    async function submitGuardianForm(e, guardianId) {
        e.preventDefault();
        const hoTen = document.getElementById('gName')?.value.trim();
        const quanHe = document.getElementById('gRelation')?.value.trim();
        const dienThoai = document.getElementById('gPhone')?.value.trim();
        const laLienHeKhanCap = Boolean(document.getElementById('gIsEmergency')?.checked);

        if (!hoTen || !quanHe || !dienThoai) {
            if (window.KtxApp) window.KtxApp.showToast('Vui lòng điền đủ họ tên, quan hệ và số điện thoại', 'error');
            return;
        }

        if (!/^0\d{9,10}$/.test(dienThoai)) {
            if (window.KtxApp) window.KtxApp.showToast('Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng số 0)', 'error');
            return;
        }

        const btn = document.getElementById('btnSaveGuardian');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Đang xử lý...';
        }

        try {
            if (guardianId) {
                await apiPut(`/api/me/guardians/${guardianId}`, {
                    hoTen,
                    quanHe,
                    dienThoai,
                    laLienHeKhanCap
                });
                if (window.KtxApp) window.KtxApp.showToast('Cập nhật người thân thành công!', 'success');
            } else {
                await apiPost('/api/me/guardians', {
                    hoTen,
                    quanHe,
                    dienThoai,
                    laLienHeKhanCap
                });
                if (window.KtxApp) window.KtxApp.showToast('Thêm người thân thành công!', 'success');
            }

            if (window.KtxApp) window.KtxApp.closeModal();
            await loadProfileData();
            const container = document.getElementById('mainContent');
            if (container) renderHoSo(container);
        } catch (err) {
            if (window.KtxApp) window.KtxApp.showToast(err.message || 'Lỗi lưu thông tin', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = guardianId ? 'Lưu thay đổi' : 'Thêm người thân';
            }
        }
    }

    function confirmDeleteGuardian(guardianId, name) {
        const modalsContainer = document.getElementById('modalsContainer');
        if (!modalsContainer) return;

        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
                <div class="bg-white dark:bg-[#121826] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] space-y-4 text-center">
                    <div class="w-12 h-12 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 mx-auto flex items-center justify-center">
                        <span class="material-symbols-outlined text-[26px]">delete</span>
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Xác nhận xóa người thân</h3>
                        <p class="text-xs text-slate-500 mt-1">Bạn có chắc chắn muốn xóa thông tin của <strong>${esc(name)}</strong>?</p>
                    </div>
                    <div class="flex items-center justify-center gap-2 pt-2">
                        <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs">Hủy</button>
                        <button type="button" onclick="KtxStudentViews.executeDeleteGuardian('${esc(guardianId)}')" class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm">Xóa</button>
                    </div>
                </div>
            </div>
        `;
    }

    async function executeDeleteGuardian(guardianId) {
        try {
            await apiDelete(`/api/me/guardians/${guardianId}`);
            if (window.KtxApp) {
                window.KtxApp.closeModal();
                window.KtxApp.showToast('Đã xóa thông tin người thân.', 'success');
            }
            await loadProfileData();
            const container = document.getElementById('mainContent');
            if (container) renderHoSo(container);
        } catch (err) {
            if (window.KtxApp) window.KtxApp.showToast(err.message || 'Lỗi xóa người thân', 'error');
        }
    }

    function togglePwdView(field) {
        studentState.pwdVisible[field] = !studentState.pwdVisible[field];
        const container = document.getElementById('mainContent');
        if (container) renderHoSo(container);
    }

    async function submitChangePassword(e) {
        e.preventDefault();
        const currentPassword = document.getElementById('pwdCurrent')?.value;
        const newPassword = document.getElementById('pwdNew')?.value;
        const confirmPassword = document.getElementById('pwdConfirm')?.value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            if (window.KtxApp) window.KtxApp.showToast('Vui lòng điền đầy đủ các ô mật khẩu', 'error');
            return;
        }

        if (newPassword.length < 8) {
            if (window.KtxApp) window.KtxApp.showToast('Mật khẩu mới phải có tối thiểu 8 ký tự', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            if (window.KtxApp) window.KtxApp.showToast('Mật khẩu xác nhận không trùng khớp', 'error');
            return;
        }

        if (newPassword === currentPassword) {
            if (window.KtxApp) window.KtxApp.showToast('Mật khẩu mới phải khác mật khẩu hiện tại', 'error');
            return;
        }

        const btn = document.getElementById('btnChangePassword');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Đang cập nhật...';
        }

        try {
            await apiPost('/api/me/change-password', {
                currentPassword,
                newPassword
            });

            if (window.KtxApp) window.KtxApp.showToast('Đổi mật khẩu thành công!', 'success');
            if (document.getElementById('pwdCurrent')) document.getElementById('pwdCurrent').value = '';
            if (document.getElementById('pwdNew')) document.getElementById('pwdNew').value = '';
            if (document.getElementById('pwdConfirm')) document.getElementById('pwdConfirm').value = '';
        } catch (err) {
            if (window.KtxApp) window.KtxApp.showToast(err.message || 'Đổi mật khẩu thất bại', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Cập nhật mật khẩu';
            }
        }
    }

    function setRoundFilter(tab) {
        studentState.roundFilter = tab;
        const container = document.getElementById('mainContent');
        if (container) renderDotDangKy(container);
    }

    function openNotificationModal(notifId) {
        const notif = studentState.recentNotifs.find(x => x.id === notifId);
        if (!notif) return;

        const modalsContainer = document.getElementById('modalsContainer');
        if (!modalsContainer) return;

        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
                <div class="bg-white dark:bg-[#121826] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] space-y-4">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0B2A5B] dark:bg-blue-950/60 dark:text-blue-300">
                            ${esc(notif.loai || 'chung')}
                        </span>
                        <button type="button" onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>

                    <div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white">${esc(notif.tieuDe)}</h3>
                        <span class="text-[11px] text-slate-400 block mt-0.5">${esc(notif.ngayTao)}</span>
                    </div>

                    <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                        ${esc(notif.noiDung)}
                    </div>

                    <div class="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onclick="KtxApp.closeModal()" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (!notif.daDoc) {
            notif.daDoc = true;
            fetch(`/api/me/notifications/${notifId}/read`, { method: 'POST' }).catch(() => {});
        }
    }

    // =========================================================================
    // GROUP 2 & GROUP 3 PLACEHOLDER FRAMES (PROMPT SUBSEQUENT PHASES)
    // =========================================================================

    function renderPlaceholderFrame({ tabId, title, subtitle, icon, description, badgeText, primaryBtnText, primaryBtnAction }) {
        return `
            <div class="space-y-6 page-content-enter">
                ${renderViewHeader(title, subtitle)}
                <div class="bg-white dark:bg-[#121826] rounded-2xl p-8 sm:p-12 shadow-xs border border-slate-200/80 dark:border-[#232B3B] text-center space-y-4">
                    <div class="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-400 mx-auto flex items-center justify-center shadow-xs">
                        <span class="material-symbols-outlined text-[32px]">${esc(icon)}</span>
                    </div>
                    <div class="space-y-1">
                        <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 dark:bg-blue-950/60 text-[#0B2A5B] dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                            ${esc(badgeText || 'Khung chức năng')}
                        </div>
                        <h2 class="text-lg font-bold text-slate-900 dark:text-white">${esc(title)}</h2>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                        ${esc(description)}
                    </p>
                    ${primaryBtnText && primaryBtnAction ? `
                        <div class="pt-2">
                            <button type="button" onclick="${primaryBtnAction}" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all inline-flex items-center gap-2">
                                <span class="material-symbols-outlined text-[17px]">arrow_forward</span>
                                <span>${esc(primaryBtnText)}</span>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 04. FORM ĐĂNG KÝ NỘI TRÚ (sv-dang-ky?round=ID)
    // =========================================================================

    async function loadDangKyData(roundId) {
        studentState.loading['sv-dang-ky'] = true;
        delete studentState.errors['sv-dang-ky'];

        try {
            // Load Profile if missing
            if (!studentState.profile) {
                studentState.profile = await apiGet('/api/me/profile');
            }

            // Determine active round
            if (!roundId && studentState.rounds.length === 0) {
                studentState.rounds = await apiGet('/api/me/rounds');
            }

            let targetRoundId = roundId;
            if (!targetRoundId) {
                const openRound = studentState.rounds.find(r => r.status === 'dangMo');
                if (openRound) targetRoundId = openRound.id;
            }

            studentState.regRoundId = targetRoundId;
            if (targetRoundId) {
                studentState.regRound = studentState.rounds.find(r => r.id === targetRoundId) || null;
                studentState.regBuildings = await apiGet(`/api/me/rounds/${targetRoundId}/buildings`);
            } else {
                studentState.regRound = null;
                studentState.regBuildings = [];
            }
        } catch (err) {
            console.error('Error loading registration form data:', err);
            studentState.errors['sv-dang-ky'] = err.message || 'Không thể tải dữ liệu biểu mẫu đăng ký.';
        } finally {
            studentState.loading['sv-dang-ky'] = false;
        }
    }

    async function renderDangKyForm(container, roundId) {
        if (roundId && roundId !== studentState.regRoundId) {
            studentState.regRoundId = roundId;
            studentState.regStep = 1;
            studentState.selectedBuildingId = null;
            studentState.selectedRoomId = null;
            studentState.regRooms = [];
            studentState.acceptRules = false;
        }

        if (!studentState.profile || (studentState.regRoundId && !studentState.regBuildings.length && !studentState.errors['sv-dang-ky'])) {
            await loadDangKyData(studentState.regRoundId);
        }

        if (studentState.loading['sv-dang-ky']) {
            container.innerHTML = renderSkeleton();
            return;
        }

        if (studentState.errors['sv-dang-ky']) {
            container.innerHTML = renderErrorAlert('Lỗi tải dữ liệu đăng ký', studentState.errors['sv-dang-ky'], 'KtxStudentViews.retryLoadTab(\'sv-dang-ky\')');
            return;
        }

        if (!studentState.regRoundId || (!studentState.regRound && !studentState.regBuildings.length)) {
            container.innerHTML = `
                <div class="space-y-6 page-content-enter">
                    ${renderViewHeader('Đăng ký Nội trú trực tuyến', 'Quy trình chọn phòng và giữ chỗ nội trú trực tuyến')}
                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-10 shadow-xs border border-slate-200/80 dark:border-[#232B3B] text-center space-y-4">
                        <div class="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 mx-auto flex items-center justify-center">
                            <span class="material-symbols-outlined text-[32px]">event_busy</span>
                        </div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white">Hiện không có đợt đăng ký nào khả dụng</h3>
                        <p class="text-xs text-slate-500 max-w-md mx-auto">
                            Hiện tại hệ thống chưa mở đợt đăng ký nội trú mới hoặc bạn chưa chọn đợt đăng ký hợp lệ. Vui lòng quay lại danh sách đợt đăng ký để kiểm tra thời gian mở đơn.
                        </p>
                        <div class="pt-2">
                            <button type="button" onclick="KtxApp.navigate('sv-dot-dang-ky')" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all inline-flex items-center gap-2">
                                <span class="material-symbols-outlined text-[17px]">arrow_back</span>
                                <span>Xem danh sách đợt đăng ký</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const p = studentState.profile || {};
        const round = studentState.regRound || { tenDot: 'Đợt đăng ký KTX UTC2', maKyHoc: 'Kỳ hiện tại' };
        const step = studentState.regStep || 1;

        // Current selected building and room
        const selBuilding = studentState.regBuildings.find(b => b.id === studentState.selectedBuildingId);
        const selRoom = studentState.regRooms.find(r => r.maPhong === studentState.selectedRoomId);

        container.innerHTML = `
            <div class="space-y-6 page-content-enter">
                ${renderViewHeader(
                    'Đăng ký Nội trú trực tuyến',
                    `${esc(round.tenDot)} • Hệ thống xét duyệt và giữ chỗ tự động 24h`
                )}

                <!-- Two-Column Layout -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <!-- Left Column: 4-Step Form (8 cols) -->
                    <div class="lg:col-span-8 space-y-6">
                        <!-- Progress Stepper Bar -->
                        <div class="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-[#232B3B]">
                            <div class="grid grid-cols-4 gap-2 text-center text-xs">
                                <!-- Step 1 -->
                                <button type="button" onclick="KtxStudentViews.setRegStep(1)" class="group flex flex-col items-center gap-1.5 focus:outline-hidden">
                                    <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                                        step >= 1 ? 'bg-[#0B2A5B] text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                    }">
                                        ${step > 1 ? '<span class="material-symbols-outlined text-[16px]">check</span>' : '1'}
                                    </div>
                                    <span class="text-[11px] font-semibold ${step === 1 ? 'text-[#0B2A5B] dark:text-blue-400 font-bold' : 'text-slate-500'}">
                                        Thông tin SV
                                    </span>
                                </button>

                                <!-- Step 2 -->
                                <button type="button" onclick="KtxStudentViews.setRegStep(2)" class="group flex flex-col items-center gap-1.5 focus:outline-hidden">
                                    <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                                        step >= 2 ? 'bg-[#0B2A5B] text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                    }">
                                        ${step > 2 ? '<span class="material-symbols-outlined text-[16px]">check</span>' : '2'}
                                    </div>
                                    <span class="text-[11px] font-semibold ${step === 2 ? 'text-[#0B2A5B] dark:text-blue-400 font-bold' : 'text-slate-500'}">
                                        Chọn tòa nhà
                                    </span>
                                </button>

                                <!-- Step 3 -->
                                <button type="button" onclick="KtxStudentViews.setRegStep(3)" ${!studentState.selectedBuildingId ? 'disabled' : ''} class="group flex flex-col items-center gap-1.5 focus:outline-hidden disabled:opacity-40">
                                    <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                                        step >= 3 ? 'bg-[#0B2A5B] text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                    }">
                                        ${step > 3 ? '<span class="material-symbols-outlined text-[16px]">check</span>' : '3'}
                                    </div>
                                    <span class="text-[11px] font-semibold ${step === 3 ? 'text-[#0B2A5B] dark:text-blue-400 font-bold' : 'text-slate-500'}">
                                        Chọn phòng
                                    </span>
                                </button>

                                <!-- Step 4 -->
                                <button type="button" onclick="KtxStudentViews.setRegStep(4)" ${!studentState.selectedRoomId ? 'disabled' : ''} class="group flex flex-col items-center gap-1.5 focus:outline-hidden disabled:opacity-40">
                                    <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                                        step >= 4 ? 'bg-[#0B2A5B] text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                    }">
                                        4
                                    </div>
                                    <span class="text-[11px] font-semibold ${step === 4 ? 'text-[#0B2A5B] dark:text-blue-400 font-bold' : 'text-slate-500'}">
                                        Xác nhận
                                    </span>
                                </button>
                            </div>

                            <!-- Indicator line -->
                            <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div class="bg-[#0B2A5B] dark:bg-blue-600 h-full transition-all duration-300" style="width: ${(step / 4) * 100}%"></div>
                            </div>
                        </div>

                        <!-- Step 1 Content: Student Info (Read-only) -->
                        ${step === 1 ? `
                            <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-5">
                                <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">person</span>
                                    <h3 class="text-sm font-bold text-slate-900 dark:text-white">Bước 1: Xác nhận thông tin sinh viên</h3>
                                </div>

                                <div class="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                                    <span class="material-symbols-outlined text-[18px] text-blue-600 shrink-0 mt-0.5">info</span>
                                    <span>Thông tin định danh dưới đây được đồng bộ trực tiếp từ hồ sơ sinh viên của bạn tại KTX UTC2 và được khóa bảo vệ. Nếu có sai sót, vui lòng gửi yêu cầu đính chính tại màn hình <strong>Hồ sơ của tôi</strong>.</span>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                        <span class="text-slate-400 block text-[11px]">Mã số sinh viên (MSSV)</span>
                                        <span class="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(p.mssv)}</span>
                                    </div>
                                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                        <span class="text-slate-400 block text-[11px]">Họ và tên</span>
                                        <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(p.hoTen)}</span>
                                    </div>
                                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                        <span class="text-slate-400 block text-[11px]">Giới tính</span>
                                        <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${p.gioiTinh === 'nam' ? 'Nam' : 'Nữ'}</span>
                                    </div>
                                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                        <span class="text-slate-400 block text-[11px]">Ngày sinh</span>
                                        <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(p.ngaySinh)}</span>
                                    </div>
                                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                        <span class="text-slate-400 block text-[11px]">CCCD / CMND</span>
                                        <span class="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(maskCccd(p.cccd))}</span>
                                    </div>
                                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                        <span class="text-slate-400 block text-[11px]">Mã lớp sinh viên</span>
                                        <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(p.maLop || 'Chưa cập nhật')}</span>
                                    </div>
                                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                        <span class="text-slate-400 block text-[11px]">Số điện thoại liên hệ</span>
                                        <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(p.dienThoai || 'Chưa cập nhật')}</span>
                                    </div>
                                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                        <span class="text-slate-400 block text-[11px]">Đối tượng ưu tiên</span>
                                        <span class="font-bold text-blue-700 dark:text-blue-400 text-sm mt-0.5 block">${esc(p.doiTuongUuTien || 'Không có')}</span>
                                    </div>
                                </div>

                                <div class="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button type="button" onclick="KtxStudentViews.setRegStep(2)" class="px-6 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm inline-flex items-center gap-1.5 transition-all">
                                        <span>Tiếp tục: Chọn tòa nhà</span>
                                        <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Step 2 Content: Select Building -->
                        ${step === 2 ? `
                            <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-5">
                                <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <div class="flex items-center gap-2">
                                        <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">apartment</span>
                                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Bước 2: Chọn tòa nhà nội trú</h3>
                                    </div>
                                    <span class="text-xs text-slate-400">Có ${studentState.regBuildings.length} tòa nhà khả dụng</span>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${studentState.regBuildings.map(b => {
                                        const isSelected = b.id === studentState.selectedBuildingId;
                                        return `
                                            <div onclick="KtxStudentViews.selectBuilding('${esc(b.id)}')" class="cursor-pointer p-4 rounded-xl border transition-all text-left relative ${
                                                isSelected
                                                    ? 'border-[#0B2A5B] ring-2 ring-[#0B2A5B]/30 bg-blue-50/30 dark:border-blue-500 dark:bg-blue-950/20'
                                                    : 'border-slate-200/80 dark:border-[#232B3B] bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300'
                                            }">
                                                ${isSelected ? `
                                                    <span class="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#0B2A5B] text-white flex items-center justify-center">
                                                        <span class="material-symbols-outlined text-[14px]">check</span>
                                                    </span>
                                                ` : ''}
                                                <div class="flex items-center gap-2 mb-2">
                                                    <span class="material-symbols-outlined text-[22px] text-[#0B2A5B] dark:text-blue-400">domain</span>
                                                    <h4 class="font-bold text-sm text-slate-900 dark:text-white">${esc(b.tenToaNha)}</h4>
                                                </div>
                                                <div class="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                                                    <div class="flex items-center justify-between">
                                                        <span>Quy định giới tính:</span>
                                                        <span class="font-semibold text-slate-800 dark:text-white">${esc(b.gioiTinhQuyDinh || 'Tất cả')}</span>
                                                    </div>
                                                    <div class="flex items-center justify-between">
                                                        <span>Số tầng:</span>
                                                        <span class="font-semibold text-slate-800 dark:text-white">${b.soTang} tầng</span>
                                                    </div>
                                                    <div class="flex items-center justify-between">
                                                        <span>Phòng còn chỗ:</span>
                                                        <span class="font-bold text-emerald-600 dark:text-emerald-400">${b.availableRooms} / ${b.totalRooms} phòng</span>
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>

                                <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button type="button" onclick="KtxStudentViews.setRegStep(1)" class="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors inline-flex items-center gap-1.5">
                                        <span class="material-symbols-outlined text-[16px]">arrow_back</span>
                                        <span>Quay lại</span>
                                    </button>
                                    <button type="button" onclick="KtxStudentViews.setRegStep(3)" ${!studentState.selectedBuildingId ? 'disabled' : ''} class="px-6 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] disabled:bg-slate-300 text-white font-semibold text-xs shadow-sm inline-flex items-center gap-1.5 transition-all">
                                        <span>Tiếp tục: Chọn phòng</span>
                                        <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Step 3 Content: Select Room -->
                        ${step === 3 ? `
                            <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-5">
                                <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <div class="flex items-center gap-2">
                                        <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">bed</span>
                                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                                            Bước 3: Chọn phòng (${esc(selBuilding?.tenToaNha || 'Tòa nhà đã chọn')})
                                        </h3>
                                    </div>
                                    <span class="text-xs text-slate-400">Có ${studentState.regRooms.length} phòng</span>
                                </div>

                                ${studentState.regRooms.length === 0 ? `
                                    <div class="p-8 text-center text-xs text-slate-400">
                                        Đang tải danh sách phòng hoặc tòa này hiện chưa có phòng mở...
                                    </div>
                                ` : `
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        ${studentState.regRooms.map(r => {
                                            const isSelected = r.maPhong === studentState.selectedRoomId;
                                            const isSelectable = r.selectable !== false;
                                            const percentFull = r.sucChua > 0 ? Math.round(((r.sucChua - r.availableBedsCount) / r.sucChua) * 100) : 100;

                                            return `
                                                <div ${isSelectable ? `onclick="KtxStudentViews.selectRoom('${esc(r.maPhong)}')"` : ''} class="p-4 rounded-xl border transition-all relative text-left ${
                                                    !isSelectable
                                                        ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900/60 border-dashed border-slate-200 dark:border-slate-800'
                                                        : isSelected
                                                            ? 'cursor-pointer border-[#0B2A5B] ring-2 ring-[#0B2A5B]/30 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-950/20'
                                                            : 'cursor-pointer border-slate-200/80 dark:border-[#232B3B] bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300'
                                                }">
                                                    ${isSelected ? `
                                                        <span class="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#0B2A5B] text-white flex items-center justify-center">
                                                            <span class="material-symbols-outlined text-[14px]">check</span>
                                                        </span>
                                                    ` : ''}

                                                    <div class="flex items-center justify-between mb-2">
                                                        <span class="font-bold text-sm text-slate-900 dark:text-white">Phòng ${esc(r.maPhong)}</span>
                                                        <span class="text-[11px] font-semibold text-slate-500">${esc(r.tenLoaiPhong)}</span>
                                                    </div>

                                                    <div class="space-y-1 text-xs">
                                                        <div class="flex items-center justify-between text-slate-500">
                                                            <span>Đơn giá thuê:</span>
                                                            <span class="font-bold text-[#0B2A5B] dark:text-blue-300">${fmtVND(r.giaThueThang)} / tháng</span>
                                                        </div>
                                                        <div class="flex items-center justify-between text-slate-500">
                                                            <span>Chỗ trống còn lại:</span>
                                                            <span class="font-bold ${r.availableBedsCount > 0 ? 'text-emerald-600' : 'text-red-500'}">
                                                                Còn ${r.availableBedsCount} / ${r.sucChua} giường
                                                            </span>
                                                        </div>

                                                        <!-- Occupancy Progress Bar -->
                                                        <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                                            <div class="h-full ${percentFull >= 100 ? 'bg-red-500' : 'bg-[#0B2A5B] dark:bg-blue-500'}" style="width: ${percentFull}%"></div>
                                                        </div>

                                                        ${!isSelectable ? `
                                                            <div class="mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200">
                                                                <span class="material-symbols-outlined text-[13px]">block</span>
                                                                <span>${esc(r.unselectableReason || 'Không thể chọn')}</span>
                                                            </div>
                                                        ` : ''}
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                `}

                                <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button type="button" onclick="KtxStudentViews.setRegStep(2)" class="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors inline-flex items-center gap-1.5">
                                        <span class="material-symbols-outlined text-[16px]">arrow_back</span>
                                        <span>Quay lại</span>
                                    </button>
                                    <button type="button" onclick="KtxStudentViews.setRegStep(4)" ${!studentState.selectedRoomId ? 'disabled' : ''} class="px-6 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] disabled:bg-slate-300 text-white font-semibold text-xs shadow-sm inline-flex items-center gap-1.5 transition-all">
                                        <span>Tiếp tục: Xác nhận</span>
                                        <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Step 4 Content: Confirm & Rules -->
                        ${step === 4 ? `
                            <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-5">
                                <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">verified</span>
                                    <h3 class="text-sm font-bold text-slate-900 dark:text-white">Bước 4: Xác nhận và cam kết nội quy KTX</h3>
                                </div>

                                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] space-y-2.5 text-xs">
                                    <span class="font-bold text-slate-800 dark:text-white block uppercase text-[11px] tracking-wider">Thông tin đơn đăng ký</span>
                                    <div class="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                                        <div>Đợt đăng ký: <strong class="text-slate-900 dark:text-white">${esc(round.tenDot)}</strong></div>
                                        <div>Kỳ học: <strong class="text-slate-900 dark:text-white">${esc(round.maKyHoc)}</strong></div>
                                        <div>Tòa nhà: <strong class="text-slate-900 dark:text-white">${esc(selBuilding?.tenToaNha || '—')}</strong></div>
                                        <div>Phòng đăng ký: <strong class="text-blue-700 dark:text-blue-400 font-bold">${esc(selRoom?.maPhong || '—')}</strong> (${esc(selRoom?.tenLoaiPhong || '')})</div>
                                        <div>Đơn giá dự kiến: <strong class="text-[#0B2A5B] dark:text-blue-300">${fmtVND(selRoom?.giaThueThang || 0)} / tháng</strong></div>
                                    </div>
                                </div>

                                <div class="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                                    <div class="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                                        <span class="material-symbols-outlined text-[18px]">timer</span>
                                        <span>Lưu ý quan trọng về thời hạn thanh toán giữ chỗ 24h</span>
                                    </div>
                                    <p class="leading-relaxed">
                                        Sau khi nộp đơn, Ban Quản lý KTX sẽ xét duyệt hồ sơ trong vòng 24-48 giờ. Khi đơn được duyệt, bạn sẽ nhận được thông báo nộp tiền giữ chỗ và có <strong>đúng 24 giờ</strong> để chuyển khoản qua VietQR. Quá thời hạn trên, vị trí phòng sẽ tự động hủy bỏ để nhường cho sinh viên khác.
                                    </p>
                                </div>

                                <!-- Rules agreement checkbox -->
                                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] flex items-start gap-3">
                                    <input type="checkbox" id="acceptRulesCheck" ${studentState.acceptRules ? 'checked' : ''} onchange="KtxStudentViews.toggleAcceptRules(this.checked)" class="w-4 h-4 rounded text-[#0B2A5B] focus:ring-blue-500 mt-0.5 cursor-pointer" />
                                    <label for="acceptRulesCheck" class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer select-none">
                                        Tôi xác nhận đã đọc, hiểu rõ và cam kết nghiêm túc chấp hành toàn bộ
                                        <button type="button" onclick="KtxStudentViews.openRulesModal()" class="text-[#0B2A5B] dark:text-blue-400 underline font-bold hover:text-blue-800">
                                            Nội quy & Quy chế Ký túc xá UTC2
                                        </button>. Nếu vi phạm, tôi hoàn toàn chịu trách nhiệm theo quy định của nhà trường.
                                    </label>
                                </div>

                                <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button type="button" onclick="KtxStudentViews.setRegStep(3)" class="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors inline-flex items-center gap-1.5">
                                        <span class="material-symbols-outlined text-[16px]">arrow_back</span>
                                        <span>Quay lại chọn phòng</span>
                                    </button>
                                    <button type="button" id="btnSubmitApp" onclick="KtxStudentViews.submitRegistrationForm(event)" ${!studentState.acceptRules || studentState.submittingApp ? 'disabled' : ''} class="px-6 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] disabled:bg-slate-300 text-white font-semibold text-xs shadow-sm inline-flex items-center gap-2 transition-all">
                                        ${studentState.submittingApp ? `
                                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                            </svg>
                                            <span>Đang gửi đơn...</span>
                                        ` : `
                                            <span class="material-symbols-outlined text-[17px]">send</span>
                                            <span>Gửi đơn đăng ký nội trú</span>
                                        `}
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Right Column: Sticky Summary Card (4 cols) -->
                    <div class="lg:col-span-4 sticky top-24 space-y-4">
                        <div class="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                            <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">receipt</span>
                                <h3 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Tóm tắt phiếu đăng ký</h3>
                            </div>

                            <div class="space-y-3 text-xs">
                                <div>
                                    <span class="text-slate-400 block text-[11px]">Đợt đăng ký:</span>
                                    <span class="font-bold text-slate-800 dark:text-white block mt-0.5">${esc(round.tenDot)}</span>
                                </div>

                                <div>
                                    <span class="text-slate-400 block text-[11px]">Tòa nhà đã chọn:</span>
                                    <span class="font-bold text-slate-800 dark:text-white block mt-0.5">
                                        ${selBuilding ? esc(selBuilding.tenToaNha) : '<span class="text-slate-400 italic">Chưa chọn</span>'}
                                    </span>
                                </div>

                                <div>
                                    <span class="text-slate-400 block text-[11px]">Phòng đã chọn:</span>
                                    <span class="font-bold text-blue-700 dark:text-blue-400 block mt-0.5">
                                        ${selRoom ? `Phòng ${esc(selRoom.maPhong)} (${esc(selRoom.tenLoaiPhong)})` : '<span class="text-slate-400 italic">Chưa chọn</span>'}
                                    </span>
                                </div>

                                <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <span class="text-slate-400 block text-[11px]">Đơn giá thuê dự kiến:</span>
                                    <span class="text-base font-bold text-[#0B2A5B] dark:text-blue-300 block mt-0.5">
                                        ${selRoom ? fmtVND(selRoom.giaThueThang) + ' / tháng' : '—'}
                                    </span>
                                </div>
                            </div>

                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] text-[11px] text-slate-500 space-y-1.5">
                                <div class="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <span class="material-symbols-outlined text-[15px] text-[#0B2A5B]">support_agent</span>
                                    <span>Hỗ trợ sinh viên UTC2</span>
                                </div>
                                <p>Cần hỗ trợ tư vấn chọn phòng? Liên hệ Văn phòng BQL Ký túc xá qua hotline 028.3896.xxxx hoặc gửi yêu cầu hỗ trợ.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Step navigation
    function setRegStep(step) {
        if (step === 3 && !studentState.selectedBuildingId) {
            if (window.KtxApp) window.KtxApp.showToast('Vui lòng chọn tòa nhà trước!', 'warning');
            return;
        }
        if (step === 4 && !studentState.selectedRoomId) {
            if (window.KtxApp) window.KtxApp.showToast('Vui lòng chọn phòng trước!', 'warning');
            return;
        }
        studentState.regStep = step;
        const container = document.getElementById('mainContent');
        if (container) renderDangKyForm(container, studentState.regRoundId);
    }

    async function selectBuilding(buildingId) {
        studentState.selectedBuildingId = buildingId;
        studentState.selectedRoomId = null;
        studentState.regRooms = [];

        try {
            studentState.regRooms = await apiGet(`/api/me/rounds/${studentState.regRoundId}/rooms?buildingId=${buildingId}`);
        } catch (err) {
            if (window.KtxApp) window.KtxApp.showToast(err.message || 'Lỗi tải danh sách phòng', 'error');
        }

        const container = document.getElementById('mainContent');
        if (container) renderDangKyForm(container, studentState.regRoundId);
    }

    function selectRoom(roomId) {
        studentState.selectedRoomId = roomId;
        const container = document.getElementById('mainContent');
        if (container) renderDangKyForm(container, studentState.regRoundId);
    }

    function toggleAcceptRules(checked) {
        studentState.acceptRules = Boolean(checked);
        const btn = document.getElementById('btnSubmitApp');
        if (btn) {
            btn.disabled = !studentState.acceptRules || studentState.submittingApp;
        }
    }

    async function submitRegistrationForm(e) {
        if (e) e.preventDefault();
        if (!studentState.regRoundId || !studentState.selectedRoomId) {
            if (window.KtxApp) window.KtxApp.showToast('Thông tin đăng ký chưa đầy đủ!', 'error');
            return;
        }
        if (!studentState.acceptRules) {
            if (window.KtxApp) window.KtxApp.showToast('Vui lòng đọc và chấp thuận nội quy KTX!', 'error');
            return;
        }

        studentState.submittingApp = true;
        const btn = document.getElementById('btnSubmitApp');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Đang gửi đơn...</span>
            `;
        }

        try {
            const res = await apiPost('/api/me/applications', {
                maDotDangKy: studentState.regRoundId,
                maPhong: studentState.selectedRoomId,
                acceptRules: true
            });

            if (window.KtxApp) {
                window.KtxApp.showToast('Nộp đơn đăng ký thành công! Đơn đang chờ BQL duyệt.', 'success');
                // Navigate to applications list
                window.KtxApp.navigate('sv-don-cua-toi');
            }
        } catch (err) {
            console.error('Submit application error:', err);
            if (window.KtxApp) window.KtxApp.showToast(err.message || 'Không thể nộp đơn đăng ký', 'error');
            // Refresh rooms to get up-to-date availability
            if (studentState.selectedBuildingId) {
                try {
                    studentState.regRooms = await apiGet(`/api/me/rounds/${studentState.regRoundId}/rooms?buildingId=${studentState.selectedBuildingId}`);
                } catch { }
            }
            const container = document.getElementById('mainContent');
            if (container) renderDangKyForm(container, studentState.regRoundId);
        } finally {
            studentState.submittingApp = false;
        }
    }

    async function openRulesModal() {
        const modalsContainer = document.getElementById('modalsContainer');
        if (!modalsContainer) return;

        let content = 'Quy chế Ký túc xá UTC2:\n1. Chấp hành nghiêm chỉnh nội quy KTX và pháp luật nhà nước.\n2. Giữ gìn an ninh trật tự, vệ sinh chung trong phòng và khuôn viên.\n3. Nộp tiền giữ chỗ và phí nội trú đúng thời hạn quy định (24h sau khi duyệt).\n4. Không tàng trữ chất gây cháy nổ, chất cấm.';

        try {
            const support = await apiGet('/api/me/support-info');
            if (support && support.regulations) content = support.regulations;
        } catch { }

        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
                <div class="bg-white dark:bg-[#121826] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] space-y-4">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">gavel</span>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Nội quy & Quy chế Ký túc xá UTC2</h3>
                        </div>
                        <button type="button" onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>

                    <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap">
                        ${esc(content)}
                    </div>

                    <div class="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onclick="KtxApp.closeModal()" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm">
                            Đã hiểu và Đóng
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 05. ĐƠN CỦA TÔI (sv-don-cua-toi)
    // =========================================================================

    async function loadApplicationsData() {
        studentState.loading['sv-don-cua-toi'] = true;
        delete studentState.errors['sv-don-cua-toi'];

        try {
            studentState.applications = await apiGet('/api/me/applications');
        } catch (err) {
            console.error('Error loading applications:', err);
            studentState.errors['sv-don-cua-toi'] = err.message || 'Không thể tải danh sách đơn đăng ký.';
        } finally {
            studentState.loading['sv-don-cua-toi'] = false;
        }
    }

    async function renderDonCuaToi(container) {
        if (!studentState.applications.length && !studentState.errors['sv-don-cua-toi']) {
            await loadApplicationsData();
        }

        if (studentState.loading['sv-don-cua-toi']) {
            container.innerHTML = renderSkeleton();
            return;
        }

        if (studentState.errors['sv-don-cua-toi']) {
            container.innerHTML = renderErrorAlert('Lỗi tải danh sách đơn', studentState.errors['sv-don-cua-toi'], 'KtxStudentViews.retryLoadTab(\'sv-don-cua-toi\')');
            return;
        }

        const apps = studentState.applications || [];
        const filter = studentState.appFilter || 'ALL';

        let filtered = apps;
        if (filter === 'CHO_DUYET') filtered = apps.filter(a => a.state === 'choDuyet');
        else if (filter === 'CHO_THANH_TOAN') filtered = apps.filter(a => a.state === 'duocDuyetChoThanhToan' || a.canPay);
        else if (filter === 'HOAN_TAT') filtered = apps.filter(a => a.state === 'hoanTat' || a.state === 'daThanhToanChoNhanPhong');

        container.innerHTML = `
            <div class="space-y-6 page-content-enter">
                ${renderViewHeader('Đơn đăng ký của tôi', 'Theo dõi tiến trình xét duyệt và nộp phí giữ chỗ cho các đợt nội trú')}

                <!-- Filter Tabs -->
                <div class="flex items-center gap-2 border-b border-slate-200/80 dark:border-[#232B3B] pb-3 text-xs overflow-x-auto">
                    <button type="button" onclick="KtxStudentViews.setAppFilter('ALL')" class="px-4 py-2 rounded-xl font-semibold transition-all ${
                        filter === 'ALL'
                            ? 'bg-[#0B2A5B] text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }">
                        Tất cả (${apps.length})
                    </button>
                    <button type="button" onclick="KtxStudentViews.setAppFilter('CHO_DUYET')" class="px-4 py-2 rounded-xl font-semibold transition-all ${
                        filter === 'CHO_DUYET'
                            ? 'bg-[#0B2A5B] text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }">
                        Chờ BQL duyệt (${apps.filter(a => a.state === 'choDuyet').length})
                    </button>
                    <button type="button" onclick="KtxStudentViews.setAppFilter('CHO_THANH_TOAN')" class="px-4 py-2 rounded-xl font-semibold transition-all ${
                        filter === 'CHO_THANH_TOAN'
                            ? 'bg-[#0B2A5B] text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }">
                        Chờ thanh toán (${apps.filter(a => a.state === 'duocDuyetChoThanhToan' || a.canPay).length})
                    </button>
                    <button type="button" onclick="KtxStudentViews.setAppFilter('HOAN_TAT')" class="px-4 py-2 rounded-xl font-semibold transition-all ${
                        filter === 'HOAN_TAT'
                            ? 'bg-[#0B2A5B] text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }">
                        Đã duyệt / Hoàn tất (${apps.filter(a => a.state === 'hoanTat' || a.state === 'daThanhToanChoNhanPhong').length})
                    </button>
                </div>

                <!-- Empty State -->
                ${filtered.length === 0 ? `
                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-10 shadow-xs border border-slate-200/80 dark:border-[#232B3B] text-center space-y-4">
                        <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                            <span class="material-symbols-outlined text-[32px]">assignment</span>
                        </div>
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Không có đơn đăng ký nào</h3>
                        <p class="text-xs text-slate-500 max-w-sm mx-auto">
                            Bạn chưa có đơn đăng ký nội trú nào trong danh mục này. Hãy xem các đợt đăng ký đang mở để nộp đơn mới.
                        </p>
                        <div class="pt-2">
                            <button type="button" onclick="KtxApp.navigate('sv-dot-dang-ky')" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all inline-flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[16px]">add</span>
                                <span>Đăng ký nội trú ngay</span>
                            </button>
                        </div>
                    </div>
                ` : `
                    <!-- Table / Card List of Applications -->
                    <div class="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200/80 dark:border-[#232B3B]">
                                    <tr>
                                        <th class="p-3.5">Mã đơn</th>
                                        <th class="p-3.5">Đợt đăng ký</th>
                                        <th class="p-3.5">Phòng / Giường</th>
                                        <th class="p-3.5">Ngày nộp</th>
                                        <th class="p-3.5">Trạng thái</th>
                                        <th class="p-3.5 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                    ${filtered.map(app => {
                                        const roomDisplay = app.maPhong
                                            ? `${esc(app.tenToaNha || '')} - Phòng ${esc(app.maPhong)}${app.assignedBed ? ` (G.${esc(app.assignedBed)})` : ''}`
                                            : 'Chưa phân bổ';

                                        return `
                                            <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                <td class="p-3.5 font-mono font-bold text-[#0B2A5B] dark:text-blue-400">
                                                    ${esc(app.maDonDangKy)}
                                                </td>
                                                <td class="p-3.5 font-semibold text-slate-800 dark:text-white">
                                                    ${esc(app.tenDot)}
                                                </td>
                                                <td class="p-3.5 text-slate-700 dark:text-slate-300">
                                                    ${roomDisplay}
                                                </td>
                                                <td class="p-3.5 text-slate-400">
                                                    ${esc(app.ngayDangKy)}
                                                </td>
                                                <td class="p-3.5">
                                                    ${statusBadge(app.state)}
                                                    ${app.hanGiuCho && app.state === 'duocDuyetChoThanhToan' ? `
                                                        <span class="block text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                                                            Hạn: ${esc(app.hanGiuCho)}
                                                        </span>
                                                    ` : ''}
                                                </td>
                                                <td class="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                                    ${app.state === 'duocDuyetChoThanhToan' || app.canPay ? `
                                                        <button type="button" onclick="KtxApp.navigate('sv-thanh-toan?appId=${esc(app.id)}')" class="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-[11px] shadow-2xs inline-flex items-center gap-1 transition-all">
                                                            <span class="material-symbols-outlined text-[14px]">qr_code_2</span>
                                                            <span>Thanh toán ngay</span>
                                                        </button>
                                                    ` : ''}
                                                    ${app.state === 'hoanTat' ? `
                                                        <button type="button" onclick="KtxApp.navigate('sv-hop-dong')" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs inline-flex items-center gap-1 transition-all">
                                                            <span class="material-symbols-outlined text-[14px]">home</span>
                                                            <span>Xem chỗ ở</span>
                                                        </button>
                                                    ` : ''}
                                                    <button type="button" onclick="KtxStudentViews.openAppDrawer('${esc(app.id)}')" class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors inline-flex items-center gap-1">
                                                        <span class="material-symbols-outlined text-[14px]">visibility</span>
                                                        <span>Chi tiết</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `}
            </div>
        `;
    }

    function setAppFilter(filter) {
        studentState.appFilter = filter;
        const container = document.getElementById('mainContent');
        if (container) renderDonCuaToi(container);
    }

    function openAppDrawer(appId) {
        const app = studentState.applications.find(a => a.id === appId);
        if (!app) return;

        const modalsContainer = document.getElementById('modalsContainer');
        if (!modalsContainer) return;

        // Determine step index for timeline (1 to 4)
        let stepIdx = 1;
        if (app.state === 'choDuyet') stepIdx = 1;
        else if (app.state === 'duocDuyetChoThanhToan') stepIdx = 2;
        else if (app.state === 'daThanhToanChoNhanPhong') stepIdx = 3;
        else if (app.state === 'hoanTat' || app.state === 'dangO') stepIdx = 4;

        const isRejected = app.state === 'biTuChoi';
        const isExpired = app.state === 'hetHanThanhToan';

        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-end backdrop-blur-xs animate-fade-in" onclick="if(event.target === this) KtxStudentViews.closeAppDrawer()">
                <div class="bg-white dark:bg-[#121826] w-full max-w-md h-full shadow-2xl border-l border-slate-200 dark:border-[#232B3B] p-6 flex flex-col justify-between overflow-y-auto">
                    <div class="space-y-5">
                        <!-- Drawer Header -->
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chi tiết đơn đăng ký</span>
                                <h3 class="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5">${esc(app.maDonDangKy)}</h3>
                            </div>
                            <button type="button" onclick="KtxStudentViews.closeAppDrawer()" class="text-slate-400 hover:text-slate-600 p-1">
                                <span class="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <!-- Status Badge Block -->
                        <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] flex items-center justify-between">
                            <span class="text-xs font-semibold text-slate-500">Trạng thái xét duyệt:</span>
                            <div>${statusBadge(app.state)}</div>
                        </div>

                        ${isRejected ? `
                            <div class="p-3.5 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 text-xs space-y-1">
                                <span class="font-bold block flex items-center gap-1">
                                    <span class="material-symbols-outlined text-[16px]">cancel</span>
                                    <span>Lý do từ chối:</span>
                                </span>
                                <p>${esc(app.rejectionReason || 'Hồ sơ không đáp ứng tiêu chuẩn ưu tiên hoặc đợt đã hết chỗ.')}</p>
                            </div>
                        ` : ''}

                        ${isExpired ? `
                            <div class="p-3.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 text-xs">
                                Đơn đăng ký đã bị hủy tự động do quá thời hạn 24 giờ mà không hoàn tất nộp phí giữ chỗ.
                            </div>
                        ` : ''}

                        <!-- Info grid -->
                        <div class="space-y-2.5 text-xs">
                            <span class="font-bold text-slate-800 dark:text-white block uppercase text-[11px] tracking-wider">Thông tin lưu trú</span>
                            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] space-y-2 text-slate-600 dark:text-slate-300">
                                <div class="flex justify-between">
                                    <span>Đợt đăng ký:</span>
                                    <strong class="text-slate-900 dark:text-white">${esc(app.tenDot)}</strong>
                                </div>
                                <div class="flex justify-between">
                                    <span>Tòa nhà:</span>
                                    <strong class="text-slate-900 dark:text-white">${esc(app.tenToaNha || '—')}</strong>
                                </div>
                                <div class="flex justify-between">
                                    <span>Phòng đăng ký:</span>
                                    <strong class="text-blue-700 dark:text-blue-400 font-bold">${esc(app.maPhong || '—')}</strong>
                                </div>
                                <div class="flex justify-between">
                                    <span>Loại phòng:</span>
                                    <strong class="text-slate-900 dark:text-white">${esc(app.tenLoaiPhong || '—')}</strong>
                                </div>
                                <div class="flex justify-between">
                                    <span>Giường được xếp:</span>
                                    <strong class="text-emerald-600 font-bold">${esc(app.assignedBed ? `Giường số ${app.assignedBed}` : 'Chưa phân bổ')}</strong>
                                </div>
                                <div class="flex justify-between">
                                    <span>Ngày nộp đơn:</span>
                                    <span class="text-slate-900 dark:text-white">${esc(app.ngayDangKy)}</span>
                                </div>
                            </div>
                        </div>

                        <!-- 4-Step Timeline -->
                        <div class="space-y-3 pt-2">
                            <span class="font-bold text-slate-800 dark:text-white block uppercase text-[11px] tracking-wider">Tiến trình xét duyệt</span>
                            <div class="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700 pl-8 text-xs">
                                <!-- Step 1: Submit -->
                                <div class="relative">
                                    <span class="absolute -left-8 top-0.5 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-4 ring-white dark:ring-[#121826]">
                                        <span class="material-symbols-outlined text-[15px]">done</span>
                                    </span>
                                    <div class="font-bold text-slate-900 dark:text-white">1. Gửi đơn đăng ký</div>
                                    <div class="text-[11px] text-slate-400 mt-0.5">${esc(app.ngayDangKy)}</div>
                                </div>

                                <!-- Step 2: Approval -->
                                <div class="relative">
                                    <span class="absolute -left-8 top-0.5 w-7 h-7 rounded-full ${
                                        isRejected
                                            ? 'bg-red-600 text-white'
                                            : stepIdx >= 2
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-slate-200 text-slate-400 dark:bg-slate-700'
                                    } flex items-center justify-center ring-4 ring-white dark:ring-[#121826]">
                                        <span class="material-symbols-outlined text-[15px]">
                                            ${isRejected ? 'close' : stepIdx >= 2 ? 'done' : 'hourglass_empty'}
                                        </span>
                                    </span>
                                    <div class="font-bold text-slate-900 dark:text-white">2. BQL xét duyệt hồ sơ</div>
                                    <div class="text-[11px] text-slate-400 mt-0.5">
                                        ${isRejected ? 'Bị từ chối' : stepIdx >= 2 ? 'Đã phê duyệt' : 'Đang chờ xử lý'}
                                    </div>
                                </div>

                                <!-- Step 3: Payment -->
                                <div class="relative">
                                    <span class="absolute -left-8 top-0.5 w-7 h-7 rounded-full ${
                                        isExpired
                                            ? 'bg-rose-600 text-white'
                                            : stepIdx >= 3
                                                ? 'bg-emerald-600 text-white'
                                                : stepIdx === 2
                                                    ? 'bg-orange-500 text-white animate-pulse'
                                                    : 'bg-slate-200 text-slate-400 dark:bg-slate-700'
                                    } flex items-center justify-center ring-4 ring-white dark:ring-[#121826]">
                                        <span class="material-symbols-outlined text-[15px]">
                                            ${isExpired ? 'schedule' : stepIdx >= 3 ? 'done' : 'payments'}
                                        </span>
                                    </span>
                                    <div class="font-bold text-slate-900 dark:text-white">3. Nộp tiền giữ chỗ (24h)</div>
                                    <div class="text-[11px] text-slate-400 mt-0.5">
                                        ${stepIdx >= 3 ? 'Đã xác nhận thanh toán' : isExpired ? 'Đã quá hạn' : app.hanGiuCho ? `Hạn chót: ${esc(app.hanGiuCho)}` : 'Chờ hoàn tất bước 2'}
                                    </div>
                                </div>

                                <!-- Step 4: Check-in -->
                                <div class="relative">
                                    <span class="absolute -left-8 top-0.5 w-7 h-7 rounded-full ${
                                        stepIdx >= 4
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-200 text-slate-400 dark:bg-slate-700'
                                    } flex items-center justify-center ring-4 ring-white dark:ring-[#121826]">
                                        <span class="material-symbols-outlined text-[15px]">home</span>
                                    </span>
                                    <div class="font-bold text-slate-900 dark:text-white">4. Nhận phòng & Ký HĐ</div>
                                    <div class="text-[11px] text-slate-400 mt-0.5">
                                        ${stepIdx >= 4 ? 'Đã bàn giao phòng' : 'Tại văn phòng BQL KTX'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Drawer Footer Actions -->
                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        ${app.state === 'duocDuyetChoThanhToan' || app.canPay ? `
                            <button type="button" onclick="KtxStudentViews.closeAppDrawer(); KtxApp.navigate('sv-thanh-toan?appId=${esc(app.id)}')" class="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all">
                                <span class="material-symbols-outlined text-[18px]">qr_code_2</span>
                                <span>Thanh toán giữ chỗ ngay</span>
                            </button>
                        ` : ''}
                        ${app.state === 'hoanTat' ? `
                            <button type="button" onclick="KtxStudentViews.closeAppDrawer(); KtxApp.navigate('sv-hop-dong')" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all">
                                <span class="material-symbols-outlined text-[18px]">home</span>
                                <span>Xem thông tin chỗ ở</span>
                            </button>
                        ` : ''}
                        <button type="button" onclick="KtxStudentViews.closeAppDrawer()" class="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function closeAppDrawer() {
        const modalsContainer = document.getElementById('modalsContainer');
        if (modalsContainer) modalsContainer.innerHTML = '';
    }

    // =========================================================================
    // 06. THANH TOÁN ĐĂNG KÝ (sv-thanh-toan?appId=ID)
    // =========================================================================

    async function loadPaymentData(appId) {
        studentState.loading['sv-thanh-toan'] = true;
        delete studentState.errors['sv-thanh-toan'];

        try {
            // Find application id
            let targetAppId = appId;
            if (!targetAppId) {
                if (!studentState.applications.length) {
                    studentState.applications = await apiGet('/api/me/applications');
                }
                const dueApp = studentState.applications.find(a => a.state === 'duocDuyetChoThanhToan' || a.canPay);
                if (dueApp) targetAppId = dueApp.id;
            }

            studentState.paymentAppId = targetAppId;
            if (targetAppId) {
                studentState.paymentInfo = await apiGet(`/api/me/applications/${targetAppId}/payment`);
            } else {
                studentState.paymentInfo = null;
            }
        } catch (err) {
            console.error('Error loading payment info:', err);
            studentState.errors['sv-thanh-toan'] = err.message || 'Không thể tải thông tin thanh toán.';
        } finally {
            studentState.loading['sv-thanh-toan'] = false;
        }
    }

    async function renderThanhToan(container, appId) {
        clearTimers();

        if (appId && appId !== studentState.paymentAppId) {
            studentState.paymentAppId = appId;
            studentState.paymentInfo = null;
        }

        if (!studentState.paymentInfo && !studentState.errors['sv-thanh-toan']) {
            await loadPaymentData(studentState.paymentAppId);
        }

        if (studentState.loading['sv-thanh-toan']) {
            container.innerHTML = renderSkeleton();
            return;
        }

        if (studentState.errors['sv-thanh-toan']) {
            container.innerHTML = renderErrorAlert('Lỗi tải thông tin thanh toán', studentState.errors['sv-thanh-toan'], 'KtxStudentViews.retryLoadTab(\'sv-thanh-toan\')');
            return;
        }

        const info = studentState.paymentInfo;

        // Empty state if no payment due
        if (!info || !info.invoice) {
            container.innerHTML = `
                <div class="space-y-6 page-content-enter">
                    ${renderViewHeader('Thanh toán Đăng ký giữ chỗ', 'Cổng thanh toán tự động qua mã chuẩn VietQR')}
                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-10 shadow-xs border border-slate-200/80 dark:border-[#232B3B] text-center space-y-4">
                        <div class="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mx-auto flex items-center justify-center">
                            <span class="material-symbols-outlined text-[32px]">check_circle</span>
                        </div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white">Hiện không có khoản phí giữ chỗ nào cần đóng</h3>
                        <p class="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                            Khoản nộp phí giữ chỗ sẽ tự động xuất hiện tại đây sau khi Đơn đăng ký nội trú của bạn được Ban Quản lý phê duyệt. Thời hạn nộp là 24 giờ kể từ thời điểm duyệt.
                        </p>
                        <div class="pt-2 flex items-center justify-center gap-2">
                            <button type="button" onclick="KtxApp.navigate('sv-don-cua-toi')" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all inline-flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[17px]">assignment</span>
                                <span>Xem đơn đăng ký của tôi</span>
                            </button>
                            <button type="button" onclick="KtxApp.navigate('sv-tong-quan')" class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors">
                                Về trang Tổng quan
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const inv = info.invoice;
        const qr = info.qr || {};
        const isVerified = info.verification === 'daXacNhan';

        // Render Two-column layout
        container.innerHTML = `
            <div class="space-y-6 page-content-enter">
                ${renderViewHeader(
                    'Thanh toán Đăng ký giữ chỗ',
                    `Hóa đơn #${esc(inv.code)} • Nộp phí giữ chỗ trong vòng 24 giờ để đảm bảo chỗ ở`
                )}

                ${isVerified ? `
                    <!-- Success banner -->
                    <div class="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
                        <div class="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-sm">
                            <span class="material-symbols-outlined text-[26px]">check</span>
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-emerald-900 dark:text-emerald-200">Thanh toán phí giữ chỗ thành công!</h3>
                            <p class="text-xs text-emerald-700 dark:text-emerald-400 mt-1 max-w-lg mx-auto">
                                Hệ thống KTX UTC2 đã xác nhận giao dịch thành công. Vị trí phòng của bạn đã được đảm bảo an toàn.
                            </p>
                        </div>
                        <div class="pt-2">
                            <button type="button" onclick="KtxApp.navigate('sv-hop-dong')" class="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm inline-flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[17px]">home</span>
                                <span>Xem hợp đồng & thủ tục nhận phòng</span>
                            </button>
                        </div>
                    </div>
                ` : `
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <!-- Left Column: Invoice Details & Countdown (7 cols) -->
                        <div class="lg:col-span-7 space-y-6">
                            <!-- Countdown Card -->
                            <div id="paymentCountdownCard" class="bg-white dark:bg-[#121826] rounded-2xl p-5 shadow-xs border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                        <span class="material-symbols-outlined text-[22px]">timer</span>
                                    </div>
                                    <div>
                                        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Thời hạn giữ chỗ còn lại</span>
                                        <span id="countdownDisplay" class="font-mono text-xl font-bold text-amber-600 dark:text-amber-400">Đang tính...</span>
                                    </div>
                                </div>
                                <span class="text-[11px] text-slate-400">Hạn chót: ${esc(info.deadline || '24 giờ')}</span>
                            </div>

                            <!-- Invoice details card -->
                            <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                                <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <div class="flex items-center gap-2">
                                        <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">receipt_long</span>
                                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Chi tiết phiếu thu phí giữ chỗ</h3>
                                    </div>
                                    <span class="font-mono text-xs font-bold text-slate-500">#${esc(inv.code)}</span>
                                </div>

                                <div class="overflow-x-auto">
                                    <table class="w-full text-left text-xs">
                                        <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200/60 dark:border-[#232B3B]">
                                            <tr>
                                                <th class="p-2.5">Khoản mục</th>
                                                <th class="p-2.5 text-center">Số lượng</th>
                                                <th class="p-2.5 text-right">Đơn giá</th>
                                                <th class="p-2.5 text-right">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                            ${(inv.lines || []).map(line => `
                                                <tr>
                                                    <td class="p-2.5 font-semibold text-slate-800 dark:text-white">${esc(line.description)}</td>
                                                    <td class="p-2.5 text-center text-slate-500">${line.quantity}</td>
                                                    <td class="p-2.5 text-right text-slate-600 dark:text-slate-300">${fmtVND(line.unitPrice)}</td>
                                                    <td class="p-2.5 text-right font-bold text-slate-900 dark:text-white">${fmtVND(line.amount)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                        <tfoot class="border-t-2 border-slate-200 dark:border-slate-700 font-bold">
                                            <tr>
                                                <td colspan="3" class="p-3 text-right text-slate-700 dark:text-slate-300 text-xs">Tổng số tiền cần thanh toán:</td>
                                                <td class="p-3 text-right text-base text-[#0B2A5B] dark:text-blue-300">${fmtVND(inv.total)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] text-xs text-slate-500 space-y-1">
                                    <div class="font-bold text-slate-700 dark:text-slate-300">Quy định hoàn phí:</div>
                                    <p>Tiền giữ chỗ sẽ được cấn trừ trực tiếp vào tiền thuê phòng tháng đầu tiên khi sinh viên làm thủ tục nhận phòng. Sinh viên hủy giữ chỗ sau khi nộp sẽ thực hiện theo quy chế hoàn phí của KTX.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: VietQR & Bank Info (5 cols) -->
                        <div class="lg:col-span-5 space-y-6">
                            <!-- QR Card -->
                            <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] text-center space-y-4">
                                <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-[#0B2A5B] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60">
                                    Mã VietQR tự động
                                </div>

                                <!-- QR Image with Fallback -->
                                <div class="p-3 bg-white rounded-2xl border border-slate-200 inline-block shadow-xs">
                                    <img src="${esc(qr.imageUrl)}" alt="VietQR" class="w-56 h-56 mx-auto rounded-xl object-contain" onerror="this.onerror=null; this.src='https://api.vietqr.io/image/970422-0123456789-compact2.jpg';" />
                                </div>

                                <p class="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                                    Mở app ngân hàng bất kỳ, chọn <strong>Quét mã QR</strong> để chuyển khoản tự động chính xác nội dung.
                                </p>

                                <!-- Bank info details with Copy button -->
                                <div class="space-y-2 text-left text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] flex items-center justify-between">
                                        <div>
                                            <span class="text-slate-400 block text-[10px]">Ngân hàng thụ hưởng</span>
                                            <span class="font-bold text-slate-800 dark:text-white mt-0.5 block">${esc(qr.bankId || 'MB Bank (Quân Đội)')}</span>
                                        </div>
                                        <button type="button" onclick="KtxStudentViews.copyToClipboard('${esc(qr.bankId)}', 'tên ngân hàng')" class="text-[#0B2A5B] dark:text-blue-400 hover:underline font-semibold text-[11px] p-1">Sao chép</button>
                                    </div>

                                    <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] flex items-center justify-between">
                                        <div>
                                            <span class="text-slate-400 block text-[10px]">Số tài khoản</span>
                                            <span class="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">${esc(qr.accountNo)}</span>
                                        </div>
                                        <button type="button" onclick="KtxStudentViews.copyToClipboard('${esc(qr.accountNo)}', 'số tài khoản')" class="text-[#0B2A5B] dark:text-blue-400 hover:underline font-semibold text-[11px] p-1">Sao chép</button>
                                    </div>

                                    <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] flex items-center justify-between">
                                        <div>
                                            <span class="text-slate-400 block text-[10px]">Chủ tài khoản</span>
                                            <span class="font-bold text-slate-800 dark:text-white mt-0.5 block">${esc(qr.accountName)}</span>
                                        </div>
                                        <button type="button" onclick="KtxStudentViews.copyToClipboard('${esc(qr.accountName)}', 'chủ tài khoản')" class="text-[#0B2A5B] dark:text-blue-400 hover:underline font-semibold text-[11px] p-1">Sao chép</button>
                                    </div>

                                    <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] flex items-center justify-between">
                                        <div>
                                            <span class="text-slate-400 block text-[10px]">Số tiền</span>
                                            <span class="font-bold text-[#0B2A5B] dark:text-blue-300 mt-0.5 block">${fmtVND(qr.amount)}</span>
                                        </div>
                                        <button type="button" onclick="KtxStudentViews.copyToClipboard('${qr.amount}', 'số tiền')" class="text-[#0B2A5B] dark:text-blue-400 hover:underline font-semibold text-[11px] p-1">Sao chép</button>
                                    </div>

                                    <div class="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                                        <div class="min-w-0 pr-2">
                                            <span class="text-amber-700 dark:text-amber-400 block text-[10px] font-bold">Nội dung chuyển khoản (Bắt buộc đúng)</span>
                                            <span class="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block truncate" title="${esc(qr.content)}">${esc(qr.content)}</span>
                                        </div>
                                        <button type="button" onclick="KtxStudentViews.copyToClipboard('${esc(qr.content)}', 'nội dung chuyển khoản')" class="text-[#0B2A5B] dark:text-blue-400 hover:underline font-bold text-[11px] p-1 shrink-0">Sao chép</button>
                                    </div>
                                </div>

                                <!-- Verification status & Polling trigger -->
                                <div class="pt-2 space-y-2">
                                    <div class="flex items-center justify-center gap-2 text-xs text-slate-500">
                                        <span class="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                                        <span>Hệ thống tự động kiểm tra giao dịch mỗi 15 giây...</span>
                                    </div>

                                    <button type="button" id="btnCheckPayment" onclick="KtxStudentViews.triggerPaymentCheck('${esc(studentState.paymentAppId)}')" class="w-full py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5">
                                        <span class="material-symbols-outlined text-[17px]">sync</span>
                                        <span>Tôi đã chuyển khoản thành công</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        `;

        // Start Countdown and Polling
        if (!isVerified && info.deadline) {
            startPaymentCountdown(info.deadline, info.serverNow);
            startPaymentPolling(studentState.paymentAppId);
        }
    }

    function startPaymentCountdown(deadlineStr, serverNowStr) {
        let diff = 86400; // default 24h
        if (deadlineStr) {
            const dl = Date.parse(deadlineStr);
            const now = serverNowStr ? Date.parse(serverNowStr) : Date.now();
            if (!isNaN(dl) && !isNaN(now)) {
                diff = Math.max(0, Math.floor((dl - now) / 1000));
            }
        }

        function updateDisplay() {
            const el = document.getElementById('countdownDisplay');
            const card = document.getElementById('paymentCountdownCard');
            if (!el) return;

            if (diff <= 0) {
                el.textContent = 'HẾT HẠN';
                if (card) {
                    card.className = 'bg-red-50 dark:bg-red-950/40 rounded-2xl p-5 shadow-xs border border-red-300 dark:border-red-800 flex items-center justify-between text-red-600';
                }
                return;
            }

            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

            // Warning style if under 3 hours
            if (diff < 10800 && card) {
                card.className = 'bg-rose-50 dark:bg-rose-950/40 rounded-2xl p-5 shadow-xs border border-rose-300 dark:border-rose-800 flex items-center justify-between text-rose-700 animate-pulse';
            }

            diff--;
        }

        updateDisplay();
        const timer = setInterval(updateDisplay, 1000);
        studentState.activeIntervals.push(timer);
    }

    function startPaymentPolling(appId) {
        if (!appId) return;

        const timer = setInterval(async () => {
            if (studentState.activeTab !== 'sv-thanh-toan') {
                clearInterval(timer);
                return;
            }

            try {
                const info = await apiGet(`/api/me/applications/${appId}/payment`);
                if (info && info.verification === 'daXacNhan') {
                    clearInterval(timer);
                    studentState.paymentInfo = info;
                    if (window.KtxApp) window.KtxApp.showToast('Giao dịch đã được hệ thống xác nhận thành công!', 'success');
                    const container = document.getElementById('mainContent');
                    if (container) renderThanhToan(container, appId);
                }
            } catch (err) {
                console.warn('Payment polling check failed:', err);
            }
        }, 15000);

        studentState.activeIntervals.push(timer);
    }

    async function triggerPaymentCheck(appId) {
        const btn = document.getElementById('btnCheckPayment');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Đang kiểm tra giao dịch...</span>
            `;
        }

        try {
            const info = await apiGet(`/api/me/applications/${appId}/payment`);
            studentState.paymentInfo = info;

            if (info && info.verification === 'daXacNhan') {
                if (window.KtxApp) window.KtxApp.showToast('Xác nhận thanh toán thành công!', 'success');
                clearTimers();
            } else {
                if (window.KtxApp) window.KtxApp.showToast('Chưa ghi nhận thanh toán từ ngân hàng. Vui lòng thử lại sau giây lát!', 'info');
            }

            const container = document.getElementById('mainContent');
            if (container) renderThanhToan(container, appId);
        } catch (err) {
            if (window.KtxApp) window.KtxApp.showToast(err.message || 'Lỗi kiểm tra giao dịch', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `
                    <span class="material-symbols-outlined text-[17px]">sync</span>
                    <span>Tôi đã chuyển khoản thành công</span>
                `;
            }
        }
    }

    function copyToClipboard(text, label) {
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                if (window.KtxApp) window.KtxApp.showToast(`Đã sao chép ${label || 'thông tin'} vào bộ nhớ tạm!`, 'success');
            }).catch(() => fallbackCopy(text, label));
        } else {
            fallbackCopy(text, label);
        }
    }

    function fallbackCopy(text, label) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            if (window.KtxApp) window.KtxApp.showToast(`Đã sao chép ${label || 'thông tin'} vào bộ nhớ tạm!`, 'success');
        } catch {
            if (window.KtxApp) window.KtxApp.showToast('Không thể sao chép tự động', 'error');
        }
        document.body.removeChild(ta);
    }

    // =========================================================================
    // 07. HỢP ĐỒNG & CHỖ Ở CỦA TÔI (sv-hop-dong)
    // =========================================================================

    async function loadContractsData() {
        studentState.loading['sv-hop-dong'] = true;
        delete studentState.errors['sv-hop-dong'];

        try {
            studentState.contracts = await apiGet('/api/me/contracts');
        } catch (err) {
            console.error('Error loading contracts:', err);
            studentState.errors['sv-hop-dong'] = err.message || 'Không thể tải thông tin hợp đồng.';
        } finally {
            studentState.loading['sv-hop-dong'] = false;
        }
    }

    async function renderHopDong(container) {
        if (!studentState.contracts.length && !studentState.errors['sv-hop-dong']) {
            await loadContractsData();
        }

        if (studentState.loading['sv-hop-dong']) {
            container.innerHTML = renderSkeleton();
            return;
        }

        if (studentState.errors['sv-hop-dong']) {
            container.innerHTML = renderErrorAlert('Lỗi tải hợp đồng', studentState.errors['sv-hop-dong'], 'KtxStudentViews.retryLoadTab(\'sv-hop-dong\')');
            return;
        }

        const contracts = studentState.contracts || [];
        const activeContract = contracts.find(c => c.trangThai === 'hieuLuc') || contracts[0] || null;
        const pastContracts = activeContract ? contracts.filter(c => c.id !== activeContract.id) : [];

        container.innerHTML = `
            <div class="space-y-6 page-content-enter">
                ${renderViewHeader('Hợp đồng & Chỗ ở của tôi', 'Tra cứu hợp đồng nội trú, vị trí phòng ở và biên bản bàn giao phòng')}

                ${!activeContract ? `
                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-10 shadow-xs border border-slate-200/80 dark:border-[#232B3B] text-center space-y-4">
                        <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                            <span class="material-symbols-outlined text-[32px]">home</span>
                        </div>
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Chưa có hợp đồng nội trú nào</h3>
                        <p class="text-xs text-slate-500 max-w-sm mx-auto">
                            Hiện bạn chưa có hợp đồng nội trú nào tại KTX UTC2. Hãy tham gia đợt đăng ký nội trú mới để được phân bổ chỗ ở.
                        </p>
                        <div class="pt-2">
                            <button type="button" onclick="KtxApp.navigate('sv-dot-dang-ky')" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm inline-flex items-center gap-1.5 transition-all">
                                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                                <span>Xem các đợt đăng ký</span>
                            </button>
                        </div>
                    </div>
                ` : `
                    <!-- Top Block: Current Accommodation Card -->
                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 sm:p-7 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-5">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-400 flex items-center justify-center">
                                    <span class="material-symbols-outlined text-[26px]">home</span>
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h3 class="text-base font-bold text-slate-900 dark:text-white">Chỗ ở hiện tại: ${esc(activeContract.toaNha)} - Phòng ${esc(activeContract.soPhong)}</h3>
                                        ${statusBadge(activeContract.trangThai)}
                                    </div>
                                    <span class="text-xs text-slate-400 mt-0.5 block">Hợp đồng số: <strong class="font-mono text-slate-700 dark:text-slate-300">${esc(activeContract.maHopDong)}</strong></span>
                                </div>
                            </div>

                            <!-- Check-in status separate badge + Print CTA -->
                            <div class="flex items-center gap-2">
                                <div class="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                                    activeContract.daNhanPhong
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200'
                                }">
                                    <span class="material-symbols-outlined text-[16px]">
                                        ${activeContract.daNhanPhong ? 'check_circle' : 'pending_actions'}
                                    </span>
                                    <span>${activeContract.daNhanPhong ? 'Đã nhận bàn giao phòng' : 'Chưa nhận phòng'}</span>
                                </div>

                                <button type="button" onclick="KtxStudentViews.printContract('${esc(activeContract.id)}')" class="px-3.5 py-1.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 transition-all">
                                    <span class="material-symbols-outlined text-[16px]">print</span>
                                    <span>In hợp đồng</span>
                                </button>
                            </div>
                        </div>

                        <!-- Accommodation details grid -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                <span class="text-slate-400 block text-[11px]">Tòa nhà</span>
                                <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(activeContract.toaNha)}</span>
                            </div>
                            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                <span class="text-slate-400 block text-[11px]">Phòng & Giường</span>
                                <span class="font-bold text-blue-700 dark:text-blue-400 text-sm mt-0.5 block">Phòng ${esc(activeContract.soPhong)}${activeContract.soGiuong ? ` (G.${esc(activeContract.soGiuong)})` : ''}</span>
                            </div>
                            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                <span class="text-slate-400 block text-[11px]">Kỳ học lưu trú</span>
                                <span class="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">${esc(activeContract.kyHoc || 'Kỳ hiện tại')}</span>
                            </div>
                            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                <span class="text-slate-400 block text-[11px]">Đơn giá thuê</span>
                                <span class="font-bold text-[#0B2A5B] dark:text-blue-300 text-sm mt-0.5 block">${fmtVND(activeContract.giaThueThang)} / tháng</span>
                            </div>
                        </div>

                        <!-- Contract Duration Bar -->
                        <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">calendar_month</span>
                                <span class="text-slate-600 dark:text-slate-300">
                                    Thời hạn lưu trú: <strong>${esc(activeContract.ngayBatDau)}</strong> đến <strong>${esc(activeContract.ngayKetThuc)}</strong>
                                </span>
                            </div>
                            ${activeContract.ngayNhanPhongThucTe ? `
                                <span class="text-slate-400">
                                    Ngày nhận phòng thực tế: <strong class="text-slate-700 dark:text-slate-200">${esc(activeContract.ngayNhanPhongThucTe)}</strong>
                                </span>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Bottom Block: Contract History Table -->
                    ${pastContracts.length > 0 ? `
                        <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">history</span>
                                    <h3 class="text-sm font-bold text-slate-900 dark:text-white">Lịch sử hợp đồng các kỳ trước</h3>
                                </div>
                                <span class="text-xs text-slate-400">${pastContracts.length} hợp đồng cũ</span>
                            </div>

                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs">
                                    <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200/60 dark:border-[#232B3B]">
                                        <tr>
                                            <th class="p-3">Số HĐ</th>
                                            <th class="p-3">Chỗ ở</th>
                                            <th class="p-3">Kỳ học</th>
                                            <th class="p-3">Thời gian</th>
                                            <th class="p-3">Đơn giá</th>
                                            <th class="p-3">Trạng thái</th>
                                            <th class="p-3 text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                        ${pastContracts.map(c => `
                                            <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                <td class="p-3 font-mono font-bold text-[#0B2A5B] dark:text-blue-400">${esc(c.maHopDong)}</td>
                                                <td class="p-3 font-semibold text-slate-800 dark:text-white">${esc(c.toaNha)} - Phòng ${esc(c.soPhong)}</td>
                                                <td class="p-3 text-slate-600 dark:text-slate-300">${esc(c.kyHoc)}</td>
                                                <td class="p-3 text-slate-500">${esc(c.ngayBatDau)} - ${esc(c.ngayKetThuc)}</td>
                                                <td class="p-3 font-semibold">${fmtVND(c.giaThueThang)}</td>
                                                <td class="p-3">${statusBadge(c.trangThai)}</td>
                                                <td class="p-3 text-right">
                                                    <button type="button" onclick="KtxStudentViews.printContract('${esc(c.id)}')" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                                                        Xem / In
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}
                `}
            </div>
        `;
    }

    function printContract(contractId) {
        const c = studentState.contracts.find(x => x.id === contractId);
        if (!c) return;

        const p = studentState.profile || {};
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            if (window.KtxApp) window.KtxApp.showToast('Vui lòng cho phép mở cửa sổ popup để in hợp đồng.', 'warning');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="utf-8" />
                <title>Hợp đồng nội trú KTX UTC2 - ${esc(c.maHopDong)}</title>
                <style>
                    body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.5; padding: 40px; color: #000; }
                    .text-center { text-align: center; }
                    .font-bold { font-weight: bold; }
                    .uppercase { text-transform: uppercase; }
                    .header-table, .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    .info-table td { padding: 4px 0; }
                    .signature-table { width: 100%; margin-top: 40px; }
                    .signature-table td { text-align: center; width: 50%; vertical-align: top; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom: 20px; text-align: right;">
                    <button onclick="window.print()" style="padding: 8px 16px; background: #0B2A5B; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">In Hợp Đồng</button>
                </div>

                <div class="text-center">
                    <div class="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div>Độc lập - Tự do - Hạnh phúc</div>
                    <div style="margin-top: 5px;">---------------o0o---------------</div>
                </div>

                <div class="text-center" style="margin-top: 30px;">
                    <h2 class="font-bold uppercase" style="margin: 0; font-size: 16pt;">HỢP ĐỒNG CHO THUÊ CHỖ Ở NỘI TRÚ</h2>
                    <div>Số: <strong>${esc(c.maHopDong)}</strong>/HĐ-KTX</div>
                </div>

                <p style="margin-top: 25px;">Hôm nay, ngày ... tháng ... năm ..., tại Ban Quản lý Ký túc xá Phân hiệu Trường Đại học Giao thông Vận tải tại TP. Hồ Chí Minh (UTC2), chúng tôi gồm:</p>

                <p class="font-bold uppercase" style="margin-bottom: 5px;">BÊN CHO THUÊ (BÊN A): BAN QUẢN LÝ KÝ TÚC XÁ UTC2</p>
                <table class="info-table">
                    <tr><td style="width: 25%;">Đại diện:</td><td>Ban Quản lý Ký túc xá UTC2</td></tr>
                    <tr><td>Địa chỉ:</td><td>Số 450-451 Lê Văn Việt, Phường Tăng Nhơn Phú A, TP. Thủ Đức, TP. Hồ Chí Minh</td></tr>
                    <tr><td>Điện thoại:</td><td>028.3896.xxxx</td></tr>
                </table>

                <p class="font-bold uppercase" style="margin-top: 20px; margin-bottom: 5px;">BÊN THUÊ (BÊN B): SINH VIÊN</p>
                <table class="info-table">
                    <tr><td style="width: 25%;">Họ và tên:</td><td><strong>${esc(p.hoTen || '................................')}</strong></td></tr>
                    <tr><td>Mã số sinh viên:</td><td><strong>${esc(p.mssv || '................................')}</strong></td></tr>
                    <tr><td>Ngày sinh:</td><td>${esc(p.ngaySinh || '................................')}</td><td>Giới tính: ${p.gioiTinh === 'nam' ? 'Nam' : 'Nữ'}</td></tr>
                    <tr><td>CCCD/CMND:</td><td>${esc(p.cccd || '................................')}</td><td>Lớp: ${esc(p.maLop || '................................')}</td></tr>
                    <tr><td>Điện thoại:</td><td>${esc(p.dienThoai || '................................')}</td><td>Email: ${esc(p.email || '................................')}</td></tr>
                </table>

                <p class="font-bold" style="margin-top: 20px;">Hai bên thống nhất ký kết hợp đồng nội trú với các điều khoản sau:</p>
                <p><strong>Điều 1: Nội dung hợp đồng</strong><br/>
                Bên A đồng ý bố trí cho Bên B một chỗ ở tại Ký túc xá UTC2: <strong>${esc(c.toaNha)}</strong>, <strong>Phòng ${esc(c.soPhong)}</strong> (Giường số: ${esc(c.soGiuong || '...')}).</p>

                <p><strong>Điều 2: Thời hạn hợp đồng</strong><br/>
                Từ ngày <strong>${esc(c.ngayBatDau)}</strong> đến ngày <strong>${esc(c.ngayKetThuc)}</strong> (Kỳ học: ${esc(c.kyHoc || '...')}).</p>

                <p><strong>Điều 3: Giá thuê và phương thức thanh toán</strong><br/>
                - Giá thuê chỗ ở: <strong>${new Intl.NumberFormat('vi-VN').format(c.giaThueThang || 0)} đồng/tháng</strong>.<br/>
                - Tiền điện, nước và các dịch vụ khác thanh toán theo chỉ số công tơ thực tế hàng tháng theo quy định của Nhà trường.</p>

                <p><strong>Điều 4: Trách nhiệm và quyền hạn</strong><br/>
                Bên B có nghĩa vụ chấp hành nghiêm chỉnh Nội quy, Quy chế Ký túc xá UTC2; giữ gìn vệ sinh chung, bảo quản tài sản được bàn giao. Hợp đồng này được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</p>

                <table class="signature-table">
                    <tr>
                        <td><strong>ĐẠI DIỆN BÊN A</strong><br/><em>(Ký, ghi rõ họ tên và đóng dấu)</em></td>
                        <td><strong>ĐẠI DIỆN BÊN B</strong><br/><em>(Ký và ghi rõ họ tên)</em><br/><br/><br/><br/><strong>${esc(p.hoTen || '')}</strong></td>
                    </tr>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    // =========================================================================
    // 08. HÓA ĐƠN & THANH TOÁN ĐỊNH KỲ (sv-hoa-don)
    // =========================================================================

    async function loadInvoicesData() {
        studentState.loading['sv-hoa-don'] = true;
        delete studentState.errors['sv-hoa-don'];

        try {
            const [invoices, utils] = await Promise.all([
                apiGet('/api/me/invoices'),
                apiGet('/api/me/utilities')
            ]);
            studentState.invoices = invoices || [];
            studentState.utilities = utils || { meterReadings: [], registeredServices: [] };
        } catch (err) {
            console.error('Error loading invoices & utilities:', err);
            studentState.errors['sv-hoa-don'] = err.message || 'Không thể tải thông tin hóa đơn & điện nước.';
        } finally {
            studentState.loading['sv-hoa-don'] = false;
        }
    }

    async function renderHoaDon(container) {
        if (!studentState.invoices.length && !studentState.errors['sv-hoa-don']) {
            await loadInvoicesData();
        }

        if (studentState.loading['sv-hoa-don']) {
            container.innerHTML = renderSkeleton();
            return;
        }

        if (studentState.errors['sv-hoa-don']) {
            container.innerHTML = renderErrorAlert('Lỗi tải hóa đơn', studentState.errors['sv-hoa-don'], 'KtxStudentViews.retryLoadTab(\'sv-hoa-don\')');
            return;
        }

        const tab = studentState.invoiceTab || 'UNPAID';
        const invoices = studentState.invoices || [];
        const unpaidInvoices = invoices.filter(i => i.daThanhToan < i.tongTien);
        const paidInvoices = invoices.filter(i => i.daThanhToan >= i.tongTien && i.tongTien > 0);
        const utils = studentState.utilities || { meterReadings: [], registeredServices: [] };

        container.innerHTML = `
            <div class="space-y-6 page-content-enter">
                ${renderViewHeader('Hóa đơn & Biên nhận', 'Quản lý các khoản thanh toán tiền phòng, điện nước định kỳ và dịch vụ tiện ích')}

                <!-- 3 Navigation Tabs -->
                <div class="flex items-center gap-2 border-b border-slate-200/80 dark:border-[#232B3B] pb-3 text-xs overflow-x-auto">
                    <button type="button" onclick="KtxStudentViews.setInvoiceTab('UNPAID')" class="px-4 py-2 rounded-xl font-semibold transition-all ${
                        tab === 'UNPAID'
                            ? 'bg-[#0B2A5B] text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }">
                        Hóa đơn còn nợ (${unpaidInvoices.length})
                    </button>
                    <button type="button" onclick="KtxStudentViews.setInvoiceTab('PAID')" class="px-4 py-2 rounded-xl font-semibold transition-all ${
                        tab === 'PAID'
                            ? 'bg-[#0B2A5B] text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }">
                        Lịch sử thanh toán (${paidInvoices.length})
                    </button>
                    <button type="button" onclick="KtxStudentViews.setInvoiceTab('UTILITIES')" class="px-4 py-2 rounded-xl font-semibold transition-all ${
                        tab === 'UTILITIES'
                            ? 'bg-[#0B2A5B] text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }">
                        Chỉ số điện nước & Dịch vụ
                    </button>
                </div>

                <!-- Tab 1: Unpaid Invoices -->
                ${tab === 'UNPAID' ? `
                    ${unpaidInvoices.length === 0 ? `
                        <div class="bg-white dark:bg-[#121826] rounded-2xl p-10 shadow-xs border border-slate-200/80 dark:border-[#232B3B] text-center space-y-3">
                            <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mx-auto flex items-center justify-center">
                                <span class="material-symbols-outlined text-[30px]">check_circle</span>
                            </div>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Tuyệt vời! Bạn không còn hóa đơn nợ nào</h3>
                            <p class="text-xs text-slate-500 max-w-sm mx-auto">
                                Toàn bộ các khoản phí nội trú và điện nước phòng của bạn đã được thanh toán đầy đủ.
                            </p>
                        </div>
                    ` : `
                        <div class="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs">
                                    <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200/60 dark:border-[#232B3B]">
                                        <tr>
                                            <th class="p-3.5">Mã hóa đơn</th>
                                            <th class="p-3.5">Kỳ thu</th>
                                            <th class="p-3.5">Hạn nộp</th>
                                            <th class="p-3.5 text-right">Tổng tiền</th>
                                            <th class="p-3.5 text-right">Đã trả</th>
                                            <th class="p-3.5 text-right">Còn nợ</th>
                                            <th class="p-3.5 text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                        ${unpaidInvoices.map(inv => {
                                            const remaining = inv.tongTien - inv.daThanhToan;
                                            return `
                                                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                    <td class="p-3.5 font-mono font-bold text-[#0B2A5B] dark:text-blue-400">${esc(inv.maHoaDon)}</td>
                                                    <td class="p-3.5 font-semibold text-slate-800 dark:text-white">Tháng ${inv.thang}/${inv.nam}</td>
                                                    <td class="p-3.5 text-rose-600 font-semibold">${esc(inv.hanThanhToan)}</td>
                                                    <td class="p-3.5 text-right font-semibold">${fmtVND(inv.tongTien)}</td>
                                                    <td class="p-3.5 text-right text-slate-500">${fmtVND(inv.daThanhToan)}</td>
                                                    <td class="p-3.5 text-right font-bold text-rose-600">${fmtVND(remaining)}</td>
                                                    <td class="p-3.5 text-right">
                                                        <button type="button" onclick="KtxStudentViews.openInvoicePaymentModal('${esc(inv.id)}')" class="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow-2xs inline-flex items-center gap-1 transition-all">
                                                            <span class="material-symbols-outlined text-[15px]">qr_code_2</span>
                                                            <span>Thanh toán</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `}
                ` : ''}

                <!-- Tab 2: Paid History -->
                ${tab === 'PAID' ? `
                    ${paidInvoices.length === 0 ? `
                        <div class="bg-white dark:bg-[#121826] rounded-2xl p-10 shadow-xs border border-slate-200/80 dark:border-[#232B3B] text-center space-y-3">
                            <span class="material-symbols-outlined text-[32px] text-slate-300">receipt_long</span>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Chưa có lịch sử thanh toán</h3>
                            <p class="text-xs text-slate-500 max-w-sm mx-auto">Bạn chưa có biên lai hoặc hóa đơn đã thanh toán nào trong hệ thống.</p>
                        </div>
                    ` : `
                        <div class="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs">
                                    <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200/60 dark:border-[#232B3B]">
                                        <tr>
                                            <th class="p-3.5">Mã hóa đơn</th>
                                            <th class="p-3.5">Kỳ thu</th>
                                            <th class="p-3.5">Ngày lập</th>
                                            <th class="p-3.5 text-right">Số tiền</th>
                                            <th class="p-3.5">Trạng thái</th>
                                            <th class="p-3.5 text-right">Biên nhận</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                        ${paidInvoices.map(inv => `
                                            <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                <td class="p-3.5 font-mono font-bold text-[#0B2A5B] dark:text-blue-400">${esc(inv.maHoaDon)}</td>
                                                <td class="p-3.5 font-semibold text-slate-800 dark:text-white">Tháng ${inv.thang}/${inv.nam}</td>
                                                <td class="p-3.5 text-slate-500">${esc(inv.ngayLap)}</td>
                                                <td class="p-3.5 text-right font-bold text-emerald-600">${fmtVND(inv.tongTien)}</td>
                                                <td class="p-3.5"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Đã thanh toán</span></td>
                                                <td class="p-3.5 text-right">
                                                    <button type="button" onclick="KtxStudentViews.viewInvoiceReceipt('${esc(inv.id)}')" class="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                                                        Xem chi tiết
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `}
                ` : ''}

                <!-- Tab 3: Utilities Meter Readings & Services -->
                ${tab === 'UTILITIES' ? `
                    <div class="space-y-6">
                        <!-- Meter readings table -->
                        <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                            <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">speed</span>
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Chỉ số điện nước định kỳ của phòng</h3>
                            </div>

                            ${utils.meterReadings.length === 0 ? `
                                <p class="text-xs text-slate-400 text-center py-4">Chưa có dữ liệu ghi nhận chỉ số điện nước định kỳ.</p>
                            ` : `
                                <div class="overflow-x-auto">
                                    <table class="w-full text-left text-xs">
                                        <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200/60 dark:border-[#232B3B]">
                                            <tr>
                                                <th class="p-3">Kỳ</th>
                                                <th class="p-3 text-right">Điện cũ (kWh)</th>
                                                <th class="p-3 text-right">Điện mới (kWh)</th>
                                                <th class="p-3 text-right font-bold text-blue-700">Tiêu thụ điện</th>
                                                <th class="p-3 text-right">Nước cũ (m³)</th>
                                                <th class="p-3 text-right">Nước mới (m³)</th>
                                                <th class="p-3 text-right font-bold text-teal-700">Tiêu thụ nước</th>
                                                <th class="p-3">Ngày ghi</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                            ${utils.meterReadings.map(m => `
                                                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                    <td class="p-3 font-semibold text-slate-900 dark:text-white">T${m.thang}/${m.nam}</td>
                                                    <td class="p-3 text-right text-slate-500">${m.chiSoDienCu}</td>
                                                    <td class="p-3 text-right text-slate-500">${m.chiSoDienMoi}</td>
                                                    <td class="p-3 text-right font-bold text-blue-700 dark:text-blue-400">${m.dienTieuThu} kWh</td>
                                                    <td class="p-3 text-right text-slate-500">${m.chiSoNuocCu}</td>
                                                    <td class="p-3 text-right text-slate-500">${m.chiSoNuocMoi}</td>
                                                    <td class="p-3 text-right font-bold text-teal-700 dark:text-teal-400">${m.nuocTieuThu} m³</td>
                                                    <td class="p-3 text-slate-400">${esc(m.ngayGhi || '—')}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `}
                        </div>

                        <!-- Registered Services -->
                        <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                            <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">room_service</span>
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Dịch vụ phòng đã đăng ký sử dụng</h3>
                            </div>

                            ${utils.registeredServices.length === 0 ? `
                                <p class="text-xs text-slate-400 text-center py-4">Hiện không có dịch vụ gia tăng nào đang đăng ký (gửi xe, internet,...).</p>
                            ` : `
                                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    ${utils.registeredServices.map(s => `
                                        <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] space-y-2 text-xs">
                                            <div class="font-bold text-slate-900 dark:text-white text-sm">${esc(s.tenDichVu)}</div>
                                            <div class="flex justify-between text-slate-500">
                                                <span>Đơn giá:</span>
                                                <strong class="text-[#0B2A5B] dark:text-blue-400">${fmtVND(s.donGia)} / tháng</strong>
                                            </div>
                                            <div class="flex justify-between text-slate-500">
                                                <span>Số lượng:</span>
                                                <span>${s.soLuong}</span>
                                            </div>
                                            <div class="flex justify-between text-slate-500">
                                                <span>Bắt đầu:</span>
                                                <span>${esc(s.ngayBatDau)}</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function setInvoiceTab(tab) {
        studentState.invoiceTab = tab;
        const container = document.getElementById('mainContent');
        if (container) renderHoaDon(container);
    }

    async function openInvoicePaymentModal(invoiceId) {
        const inv = studentState.invoices.find(i => i.id === invoiceId);
        if (!inv) return;

        const modalsContainer = document.getElementById('modalsContainer');
        if (!modalsContainer) return;

        const remaining = inv.tongTien - inv.daThanhToan;
        const qrUrl = `https://img.vietqr.io/image/970422-0123456789-compact2.jpg?amount=${remaining}&addInfo=KTX%20${encodeURIComponent(inv.maHoaDon || '')}`;

        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
                <div class="bg-white dark:bg-[#121826] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] space-y-4 text-center">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Thanh toán hóa đơn ${esc(inv.maHoaDon)}</h3>
                        <button type="button" onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>

                    <div class="p-3 bg-white rounded-xl border border-slate-200 inline-block shadow-xs">
                        <img src="${qrUrl}" alt="VietQR" class="w-52 h-52 mx-auto rounded-lg object-contain" />
                    </div>

                    <div class="space-y-1.5 text-xs text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                        <div class="flex justify-between">
                            <span class="text-slate-400">Số tiền:</span>
                            <strong class="text-base text-[#0B2A5B] dark:text-blue-300 font-bold">${fmtVND(remaining)}</strong>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">Nội dung:</span>
                            <strong class="font-mono text-slate-800 dark:text-white">KTX ${esc(inv.maHoaDon)}</strong>
                        </div>
                    </div>

                    <p class="text-[11px] text-slate-400">Sau khi chuyển khoản, giao dịch sẽ được kế toán đối soát và cập nhật trong 1-2 giờ làm việc.</p>

                    <div class="pt-2">
                        <button type="button" onclick="KtxApp.closeModal()" class="w-full py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm">
                            Đóng cửa sổ
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async function viewInvoiceReceipt(invoiceId) {
        try {
            const detail = await apiGet(`/api/me/invoices/${invoiceId}`);
            const modalsContainer = document.getElementById('modalsContainer');
            if (!modalsContainer || !detail) return;

            modalsContainer.innerHTML = `
                <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
                    <div class="bg-white dark:bg-[#121826] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] space-y-4">
                        <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Biên lai thanh toán #${esc(detail.maHoaDon)}</h3>
                            <button type="button" onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600">
                                <span class="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        <div class="space-y-3 text-xs">
                            <div class="flex justify-between">
                                <span class="text-slate-400">Kỳ thanh toán:</span>
                                <span class="font-bold">Tháng ${detail.thang}/${detail.nam}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-400">Tổng tiền:</span>
                                <span class="font-bold text-emerald-600 text-sm">${fmtVND(detail.tongTien)}</span>
                            </div>
                        </div>

                        ${detail.lines && detail.lines.length ? `
                            <div class="overflow-x-auto border border-slate-200/60 dark:border-[#232B3B] rounded-xl">
                                <table class="w-full text-left text-xs">
                                    <thead class="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                                        <tr>
                                            <th class="p-2">Khoản thu</th>
                                            <th class="p-2 text-right">Số tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                        ${detail.lines.map(l => `
                                            <tr>
                                                <td class="p-2">${esc(l.description)}</td>
                                                <td class="p-2 text-right font-semibold">${fmtVND(l.amount)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : ''}

                        <div class="pt-2 flex justify-end">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            if (window.KtxApp) window.KtxApp.showToast(err.message || 'Lỗi tải biên lai', 'error');
        }
    }

    // =========================================================================
    // 09. YÊU CẦU SỬA CHỮA & BÁO HỎNG (sv-sua-chua)
    // =========================================================================

    async function loadMaintenanceData() {
        studentState.loading['sv-sua-chua'] = true;
        delete studentState.errors['sv-sua-chua'];

        try {
            studentState.maintenanceTickets = await apiGet('/api/me/maintenance');
        } catch (err) {
            console.error('Error loading maintenance tickets:', err);
            studentState.errors['sv-sua-chua'] = err.message || 'Không thể tải danh sách phiếu sửa chữa.';
        } finally {
            studentState.loading['sv-sua-chua'] = false;
        }
    }

    async function renderSuaChua(container) {
        if (!studentState.maintenanceTickets.length && !studentState.errors['sv-sua-chua']) {
            await loadMaintenanceData();
        }

        if (studentState.loading['sv-sua-chua']) {
            container.innerHTML = renderSkeleton();
            return;
        }

        if (studentState.errors['sv-sua-chua']) {
            container.innerHTML = renderErrorAlert('Lỗi tải phiếu sửa chữa', studentState.errors['sv-sua-chua'], 'KtxStudentViews.retryLoadTab(\'sv-sua-chua\')');
            return;
        }

        const tickets = studentState.maintenanceTickets || [];
        // Check active room
        const hasActiveRoom = studentState.dashboard?.room?.phong || (studentState.contracts && studentState.contracts.some(c => c.trangThai === 'hieuLuc'));

        container.innerHTML = `
            <div class="space-y-6 page-content-enter">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    ${renderViewHeader('Yêu cầu Sửa chữa & Báo hỏng', 'Báo cáo sự cố điện, nước, nội thất trong phòng để kỹ thuật viên hỗ trợ kịp thời')}
                    ${hasActiveRoom ? `
                        <button type="button" onclick="KtxStudentViews.openCreateMaintenanceModal()" class="px-5 py-2.5 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm inline-flex items-center gap-1.5 transition-all self-start sm:self-auto shrink-0">
                            <span class="material-symbols-outlined text-[17px]">add_circle</span>
                            <span>Tạo phiếu báo hỏng</span>
                        </button>
                    ` : ''}
                </div>

                ${!hasActiveRoom ? `
                    <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-3">
                        <span class="material-symbols-outlined text-[20px] text-amber-600 shrink-0">lock</span>
                        <span>Bạn chưa được bố trí phòng nội trú hoặc hợp đồng chưa có hiệu lực để gửi yêu cầu sửa chữa thiết bị phòng.</span>
                    </div>
                ` : ''}

                <!-- Tickets List -->
                ${tickets.length === 0 ? `
                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-10 shadow-xs border border-slate-200/80 dark:border-[#232B3B] text-center space-y-3">
                        <div class="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                            <span class="material-symbols-outlined text-[30px]">build</span>
                        </div>
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Chưa có yêu cầu sửa chữa nào</h3>
                        <p class="text-xs text-slate-500 max-w-sm mx-auto">Khi thiết bị trong phòng gặp sự cố hư hỏng, hãy bấm nút "Tạo phiếu báo hỏng" để kỹ thuật viên tiếp nhận.</p>
                    </div>
                ` : `
                    <div class="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200/60 dark:border-[#232B3B]">
                                    <tr>
                                        <th class="p-3.5">Mã phiếu</th>
                                        <th class="p-3.5">Phòng</th>
                                        <th class="p-3.5">Loại sự cố</th>
                                        <th class="p-3.5">Mô tả sự cố</th>
                                        <th class="p-3.5">Ngày gửi</th>
                                        <th class="p-3.5">Trạng thái</th>
                                        <th class="p-3.5 text-right">Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                    ${tickets.map(t => `
                                        <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                            <td class="p-3.5 font-mono font-bold text-[#0B2A5B] dark:text-blue-400">#${t.id}</td>
                                            <td class="p-3.5 font-semibold text-slate-800 dark:text-white">${esc(t.maPhong)}</td>
                                            <td class="p-3.5 font-semibold text-slate-700 dark:text-slate-300">${esc(t.loaiSuCo || 'Chung')}</td>
                                            <td class="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate" title="${esc(t.moTa)}">${esc(t.moTa)}</td>
                                            <td class="p-3.5 text-slate-400">${esc(t.ngayGui)}</td>
                                            <td class="p-3.5">${statusBadge(t.trangThai)}</td>
                                            <td class="p-3.5 text-right">
                                                <button type="button" onclick="KtxStudentViews.viewMaintenanceDetail(${t.id})" class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors">
                                                    Xem tiến trình
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `}
            </div>
        `;
    }

    function openCreateMaintenanceModal() {
        const modalsContainer = document.getElementById('modalsContainer');
        if (!modalsContainer) return;

        modalsContainer.innerHTML = `
            <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
                <div class="bg-white dark:bg-[#121826] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] space-y-4">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">build</span>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Tạo phiếu yêu cầu sửa chữa thiết bị</h3>
                        </div>
                        <button type="button" onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600">
                            <span class="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>

                    <form onsubmit="KtxStudentViews.submitMaintenanceForm(event)" class="space-y-4 text-xs">
                        <div>
                            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Loại sự cố / Thiết bị (*)</label>
                            <select id="maintCategory" required class="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold">
                                <option value="Hệ thống điện">Hệ thống điện (Đèn, ổ cắm, quạt)</option>
                                <option value="Hệ thống nước">Hệ thống nước (Vòi, bồn rửa, đường ống)</option>
                                <option value="Cửa & Khóa">Cửa phòng, ổ khóa, cửa sổ</option>
                                <option value="Giường & Tủ">Giường ngủ, tủ đồ, bàn ghế</option>
                                <option value="Thiết bị vệ sinh">Thiết bị nhà vệ sinh</option>
                                <option value="Khác">Sự cố khác</option>
                            </select>
                        </div>

                        <div>
                            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mức độ khẩn cấp (*)</label>
                            <select id="maintPriority" required class="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold">
                                <option value="Bình thường">Bình thường (Xử lý trong 24-48h)</option>
                                <option value="Khẩn cấp">Khẩn cấp (Xử lý trong ngày)</option>
                                <option value="Rất khẩn cấp">Rất khẩn cấp (Nguy cơ rò điện, ngập nước)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mô tả chi tiết sự cố (*)</label>
                            <textarea id="maintDesc" rows="3" required placeholder="Mô tả cụ thể vị trí và tình trạng hư hỏng..." class="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-[#232B3B] text-xs font-semibold"></textarea>
                        </div>

                        <div>
                            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ảnh chụp hiện trường (tùy chọn, tối đa 5MB)</label>
                            <input type="file" id="maintImage" accept="image/jpeg,image/png,image/jpg" onchange="KtxStudentViews.handleMaintenanceImagePreview(this)" class="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0B2A5B] hover:file:bg-blue-100" />
                            <div id="maintImagePreview" class="mt-2 hidden">
                                <img id="maintPreviewImg" src="" alt="Preview" class="w-32 h-24 rounded-lg object-cover border border-slate-200" />
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs">Hủy</button>
                            <button type="submit" id="btnSubmitMaint" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm">
                                Gửi yêu cầu
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    function handleMaintenanceImagePreview(input) {
        const preview = document.getElementById('maintImagePreview');
        const img = document.getElementById('maintPreviewImg');
        if (!input.files || !input.files[0]) {
            if (preview) preview.classList.add('hidden');
            return;
        }

        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) {
            if (window.KtxApp) window.KtxApp.showToast('Kích thước ảnh vượt quá giới hạn 5MB!', 'error');
            input.value = '';
            if (preview) preview.classList.add('hidden');
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            if (img) img.src = e.target.result;
            if (preview) preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    async function submitMaintenanceForm(e) {
        e.preventDefault();
        const loaiSuCo = document.getElementById('maintCategory')?.value;
        const mucDoKhanCap = document.getElementById('maintPriority')?.value;
        const moTa = document.getElementById('maintDesc')?.value.trim();
        const fileInput = document.getElementById('maintImage');

        if (!moTa) {
            if (window.KtxApp) window.KtxApp.showToast('Vui lòng nhập mô tả sự cố!', 'error');
            return;
        }

        const btn = document.getElementById('btnSubmitMaint');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Đang gửi...';
        }

        const formData = new FormData();
        formData.append('LoaiSuCo', loaiSuCo);
        formData.append('MucDoKhanCap', mucDoKhanCap);
        formData.append('MoTa', moTa);
        if (fileInput && fileInput.files[0]) {
            formData.append('Image', fileInput.files[0]);
        }

        try {
            const res = await fetch('/api/me/maintenance', {
                method: 'POST',
                body: formData
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || 'Lỗi gửi yêu cầu');

            if (window.KtxApp) {
                window.KtxApp.closeModal();
                window.KtxApp.showToast('Gửi phiếu yêu cầu sửa chữa thành công!', 'success');
            }
            await loadMaintenanceData();
            const container = document.getElementById('mainContent');
            if (container) renderSuaChua(container);
        } catch (err) {
            if (window.KtxApp) window.KtxApp.showToast(err.message || 'Lỗi gửi yêu cầu', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Gửi yêu cầu';
            }
        }
    }

    async function viewMaintenanceDetail(ticketId) {
        try {
            const ticket = await apiGet(`/api/me/maintenance/${ticketId}`);
            const modalsContainer = document.getElementById('modalsContainer');
            if (!modalsContainer || !ticket) return;

            modalsContainer.innerHTML = `
                <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
                    <div class="bg-white dark:bg-[#121826] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-[#232B3B] space-y-4">
                        <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Chi tiết phiếu sửa chữa #${ticket.id}</h3>
                                <span class="text-xs text-slate-400">Phòng: ${esc(ticket.maPhong)}</span>
                            </div>
                            <button type="button" onclick="KtxApp.closeModal()" class="text-slate-400 hover:text-slate-600">
                                <span class="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        <div class="space-y-3 text-xs">
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] flex items-center justify-between">
                                <span class="text-slate-500">Trạng thái:</span>
                                <div>${statusBadge(ticket.trangThai)}</div>
                            </div>

                            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] space-y-2">
                                <div><span class="text-slate-400">Loại sự cố:</span> <strong class="text-slate-800 dark:text-white">${esc(ticket.loaiSuCo || 'Chung')}</strong></div>
                                <div><span class="text-slate-400">Mức độ:</span> <strong class="text-slate-800 dark:text-white">${esc(ticket.mucDoKhanCap || 'Bình thường')}</strong></div>
                                <div><span class="text-slate-400">Mô tả của sinh viên:</span> <p class="mt-1 text-slate-700 dark:text-slate-300 font-semibold">${esc(ticket.moTa)}</p></div>
                            </div>
                        </div>

                        <div class="pt-2 flex justify-end">
                            <button type="button" onclick="KtxApp.closeModal()" class="px-5 py-2 rounded-xl bg-[#0B2A5B] hover:bg-[#143F8C] text-white font-semibold text-xs shadow-sm">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            if (window.KtxApp) window.KtxApp.showToast(err.message || 'Lỗi tải phiếu', 'error');
        }
    }

    // =========================================================================
    // 10. VI PHẠM & KỶ LUẬT (sv-vi-pham) - CHỈ ĐỌC
    // =========================================================================

    async function loadViolationsData() {
        studentState.loading['sv-vi-pham'] = true;
        delete studentState.errors['sv-vi-pham'];

        try {
            studentState.violations = await apiGet('/api/me/violations');
        } catch (err) {
            console.error('Error loading violations:', err);
            studentState.errors['sv-vi-pham'] = err.message || 'Không thể tải thông tin vi phạm.';
        } finally {
            studentState.loading['sv-vi-pham'] = false;
        }
    }

    async function renderViPham(container) {
        if (!studentState.violations.length && !studentState.errors['sv-vi-pham']) {
            await loadViolationsData();
        }

        if (studentState.loading['sv-vi-pham']) {
            container.innerHTML = renderSkeleton();
            return;
        }

        if (studentState.errors['sv-vi-pham']) {
            container.innerHTML = renderErrorAlert('Lỗi tải vi phạm', studentState.errors['sv-vi-pham'], 'KtxStudentViews.retryLoadTab(\'sv-vi-pham\')');
            return;
        }

        const list = studentState.violations || [];
        const totalViolations = list.length;
        const totalFines = list.reduce((sum, v) => sum + (Number(v.tienPhat) || 0), 0);
        const unpaidFines = list.filter(v => !v.daNopPhat).reduce((sum, v) => sum + (Number(v.tienPhat) || 0), 0);
        const latestViolation = list.length > 0 ? list[0] : null;

        function getActionBadge(action) {
            const a = String(action || '').toLowerCase();
            if (a.includes('nhắc nhở')) {
                return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Nhắc nhở</span>';
            }
            if (a.includes('phạt tiền')) {
                return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">Phạt tiền</span>';
            }
            if (a.includes('cảnh cáo')) {
                return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60">Cảnh cáo</span>';
            }
            if (a.includes('buộc rời') || a.includes('trục xuất') || a.includes('đuổi')) {
                return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60">Buộc rời KTX</span>';
            }
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">${esc(action || 'Xử lý')}</span>`;
        }

        container.innerHTML = `
            <div class="space-y-6 page-content-enter">
                ${renderViewHeader('Vi phạm & Kỷ luật', 'Biên bản ghi nhận vi phạm nội quy và hình thức xử lý kỷ luật (Chế độ chỉ đọc)')}

                <!-- Metric Summary Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    ${renderMetricCard({
                        label: 'Tổng số biên bản',
                        value: totalViolations,
                        footer: totalViolations === 0 ? 'Chấp hành nội quy xuất sắc' : 'Đã ghi nhận trong hồ sơ',
                        color: totalViolations === 0 ? 'green' : 'amber'
                    })}
                    ${renderMetricCard({
                        label: 'Lần vi phạm gần nhất',
                        value: latestViolation ? esc(latestViolation.ngayViPham) : 'Không có',
                        footer: latestViolation ? esc(latestViolation.tenLoaiViPham) : 'Không có ghi nhận vi phạm',
                        color: latestViolation ? 'amber' : 'slate'
                    })}
                    ${renderMetricCard({
                        label: 'Tổng tiền phạt nợ',
                        value: fmtVND(unpaidFines),
                        footer: unpaidFines === 0 ? 'Đã hoàn tất mọi nghĩa vụ phạt' : `Tổng mức phạt: ${fmtVND(totalFines)}`,
                        color: unpaidFines === 0 ? 'green' : 'red'
                    })}
                </div>

                ${list.length === 0 ? `
                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-10 sm:p-12 shadow-xs border border-slate-200/80 dark:border-[#232B3B] text-center space-y-3">
                        <div class="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-xs">
                            <span class="material-symbols-outlined text-[32px]">verified</span>
                        </div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white">Bạn chưa có biên bản vi phạm nào</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                            Tuyệt vời! Bạn luôn chấp hành nghiêm chỉnh Quy chế Ký túc xá UTC2 và pháp luật Nhà nước. Hãy tiếp tục phát huy nếp sống văn minh nội trú!
                        </p>
                    </div>
                ` : `
                    <div class="bg-white dark:bg-[#121826] rounded-2xl shadow-xs border border-slate-200/80 dark:border-[#232B3B] overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200/60 dark:border-[#232B3B]">
                                    <tr>
                                        <th class="p-3.5">Mã biên bản</th>
                                        <th class="p-3.5">Ngày lập</th>
                                        <th class="p-3.5">Hành vi vi phạm</th>
                                        <th class="p-3.5">Nội dung chi tiết</th>
                                        <th class="p-3.5">Hình thức xử lý</th>
                                        <th class="p-3.5 text-right">Tiền phạt</th>
                                        <th class="p-3.5 text-center">Tình trạng nộp</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                    ${list.map(v => {
                                        const year = v.ngayViPham ? (v.ngayViPham.split('/')?.[2] || v.ngayViPham.split('-')?.[0] || '2026') : '2026';
                                        const code = `BB-${year}-${String(v.id).padStart(4, '0')}`;
                                        return `
                                            <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                <td class="p-3.5 font-mono font-bold text-[#0B2A5B] dark:text-blue-400">
                                                    ${esc(code)}
                                                </td>
                                                <td class="p-3.5 text-slate-500 whitespace-nowrap">
                                                    ${esc(v.ngayViPham)}
                                                </td>
                                                <td class="p-3.5 font-bold text-slate-900 dark:text-white">
                                                    ${esc(v.tenLoaiViPham)}
                                                </td>
                                                <td class="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed" title="${esc(v.moTa)}">
                                                    ${esc(v.moTa)}
                                                </td>
                                                <td class="p-3.5 whitespace-nowrap">
                                                    ${getActionBadge(v.hinhThucXuLy)}
                                                </td>
                                                <td class="p-3.5 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                                    ${fmtVND(v.tienPhat)}
                                                </td>
                                                <td class="p-3.5 text-center whitespace-nowrap">
                                                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        v.daNopPhat
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200'
                                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200'
                                                    }">
                                                        ${v.daNopPhat ? 'Đã nộp phạt' : 'Chưa nộp phạt'}
                                                    </span>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `}
            </div>
        `;
    }

    // =========================================================================
    // 11. HÒM THƯ THÔNG BÁO (sv-thong-bao)
    // =========================================================================

    async function loadNotificationsData() {
        studentState.loading['sv-thong-bao'] = true;
        delete studentState.errors['sv-thong-bao'];

        try {
            studentState.notifications = await apiGet('/api/me/notifications');
        } catch (err) {
            console.error('Error loading notifications:', err);
            studentState.errors['sv-thong-bao'] = err.message || 'Không thể tải hòm thư thông báo.';
        } finally {
            studentState.loading['sv-thong-bao'] = false;
        }
    }

    function getNotifVisuals(loai) {
        const l = String(loai || '').toLowerCase();
        if (l.includes('dondangky') || l.includes('đăng ký')) {
            return { icon: 'assignment', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' };
        }
        if (l.includes('thanhtoan') || l.includes('học phí') || l.includes('tiền')) {
            return { icon: 'qr_code_2', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' };
        }
        if (l.includes('nhachan') || l.includes('hạn') || l.includes('cảnh báo')) {
            return { icon: 'timer', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' };
        }
        if (l.includes('baotri') || l.includes('sửa chữa')) {
            return { icon: 'build', color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40' };
        }
        return { icon: 'notifications', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800' };
    }

    async function renderThongBao(container) {
        if (!studentState.notifications.length && !studentState.errors['sv-thong-bao']) {
            await loadNotificationsData();
        }

        if (studentState.loading['sv-thong-bao']) {
            container.innerHTML = renderSkeleton();
            return;
        }

        if (studentState.errors['sv-thong-bao']) {
            container.innerHTML = renderErrorAlert('Lỗi tải thông báo', studentState.errors['sv-thong-bao'], 'KtxStudentViews.retryLoadTab(\'sv-thong-bao\')');
            return;
        }

        const notifs = studentState.notifications || [];
        const filter = studentState.notifFilter || 'ALL';
        const unreadCount = notifs.filter(n => !n.daDoc).length;

        let filtered = notifs;
        if (filter === 'UNREAD') {
            filtered = notifs.filter(n => !n.daDoc);
        }

        // Chronological grouping: "Hôm nay" vs "Trước đó"
        const now = new Date();
        const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        const todayItems = [];
        const pastItems = [];

        filtered.forEach(n => {
            const dateStr = String(n.ngayTao || '');
            if (dateStr.includes(todayStr) || dateStr.startsWith(todayStr)) {
                todayItems.push(n);
            } else {
                pastItems.push(n);
            }
        });

        function renderNotifCard(n) {
            const v = getNotifVisuals(n.loai);
            const isUnread = !n.daDoc;
            const destTab = n.lienKet || '';

            return `
                <div class="p-4 rounded-2xl bg-white dark:bg-[#121826] border transition-all ${
                    isUnread
                        ? 'border-blue-200 dark:border-blue-900/60 shadow-xs ring-1 ring-blue-500/10'
                        : 'border-slate-200/80 dark:border-[#232B3B] hover:border-slate-300 shadow-2xs'
                }">
                    <div class="flex items-start gap-3">
                        <!-- Icon -->
                        <div class="w-10 h-10 rounded-xl ${v.bg} ${v.color} flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-[20px]">${v.icon}</span>
                        </div>

                        <!-- Content -->
                        <div class="min-w-0 flex-1 cursor-pointer" onclick="KtxStudentViews.handleNotifClick(${n.id}, '${esc(destTab)}')">
                            <div class="flex items-center justify-between gap-2">
                                <div class="flex items-center gap-1.5 min-w-0">
                                    ${isUnread ? '<span class="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>' : ''}
                                    <h4 class="text-sm font-bold ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'} truncate">
                                        ${esc(n.tieuDe)}
                                    </h4>
                                </div>
                                <span class="text-[11px] text-slate-400 shrink-0">${esc(n.ngayTao)}</span>
                            </div>

                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                ${esc(n.noiDung)}
                            </p>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center gap-1.5 shrink-0 self-center">
                            ${isUnread ? `
                                <button type="button" onclick="KtxStudentViews.markNotifRead(${n.id})" title="Đánh dấu đã đọc" class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors">
                                    <span class="material-symbols-outlined text-[18px]">done</span>
                                </button>
                            ` : ''}
                            <button type="button" onclick="KtxStudentViews.openNotificationModal(${n.id})" title="Xem chi tiết" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <span class="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="space-y-6 page-content-enter">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    ${renderViewHeader('Hộp thư thông báo', 'Thông báo chính thức từ Ban Quản lý Ký túc xá UTC2')}

                    <!-- Mark all read action -->
                    ${unreadCount > 0 ? `
                        <button type="button" onclick="KtxStudentViews.markAllNotifsRead()" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto">
                            <span class="material-symbols-outlined text-[16px]">done_all</span>
                            <span>Đọc tất cả (${unreadCount})</span>
                        </button>
                    ` : ''}
                </div>

                <!-- Filter Tabs -->
                <div class="flex items-center gap-2 border-b border-slate-200/80 dark:border-[#232B3B] pb-3 text-xs">
                    <button type="button" onclick="KtxStudentViews.setNotifFilter('ALL')" class="px-4 py-2 rounded-xl font-semibold transition-all ${
                        filter === 'ALL'
                            ? 'bg-[#0B2A5B] text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }">
                        Tất cả (${notifs.length})
                    </button>
                    <button type="button" onclick="KtxStudentViews.setNotifFilter('UNREAD')" class="px-4 py-2 rounded-xl font-semibold transition-all ${
                        filter === 'UNREAD'
                            ? 'bg-[#0B2A5B] text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }">
                        Chưa đọc (${unreadCount})
                    </button>
                </div>

                <!-- Empty State -->
                ${filtered.length === 0 ? `
                    <div class="bg-white dark:bg-[#121826] rounded-2xl p-10 shadow-xs border border-slate-200/80 dark:border-[#232B3B] text-center space-y-3">
                        <div class="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                            <span class="material-symbols-outlined text-[30px]">notifications_off</span>
                        </div>
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Không có thông báo nào</h3>
                        <p class="text-xs text-slate-500 max-w-sm mx-auto">
                            ${filter === 'UNREAD' ? 'Bạn đã đọc toàn bộ thông báo.' : 'Hộp thư thông báo của bạn hiện đang trống.'}
                        </p>
                    </div>
                ` : `
                    <div class="space-y-6">
                        <!-- Group: Hôm nay -->
                        ${todayItems.length > 0 ? `
                            <div class="space-y-3">
                                <div class="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    <span class="material-symbols-outlined text-[16px] text-blue-600">today</span>
                                    <span>Hôm nay (${todayItems.length})</span>
                                </div>
                                <div class="space-y-2.5">
                                    ${todayItems.map(renderNotifCard).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Group: Trước đó -->
                        ${pastItems.length > 0 ? `
                            <div class="space-y-3">
                                <div class="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    <span class="material-symbols-outlined text-[16px] text-slate-400">history</span>
                                    <span>Trước đó (${pastItems.length})</span>
                                </div>
                                <div class="space-y-2.5">
                                    ${pastItems.map(renderNotifCard).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `}
            </div>
        `;
    }

    function setNotifFilter(f) {
        studentState.notifFilter = f;
        const container = document.getElementById('mainContent');
        if (container) renderThongBao(container);
    }

    async function markNotifRead(id) {
        try {
            await fetch(`/api/me/notifications/${id}/read`, { method: 'POST' });
            const item = studentState.notifications.find(n => n.id === id);
            if (item) item.daDoc = true;
            // update badge
            if (window.KtxApp && typeof window.KtxApp.updateStudentBadge === 'function') {
                window.KtxApp.updateStudentBadge();
            }
            const container = document.getElementById('mainContent');
            if (container) renderThongBao(container);
        } catch (err) {
            console.error('Mark notif read error:', err);
        }
    }

    async function markAllNotifsRead() {
        try {
            await fetch('/api/me/notifications/read-all', { method: 'POST' });
            (studentState.notifications || []).forEach(n => n.daDoc = true);
            if (window.KtxApp) {
                window.KtxApp.showToast('Đã đánh dấu tất cả thông báo là đã đọc!', 'success');
                if (typeof window.KtxApp.updateStudentBadge === 'function') {
                    window.KtxApp.updateStudentBadge();
                }
            }
            const container = document.getElementById('mainContent');
            if (container) renderThongBao(container);
        } catch (err) {
            if (window.KtxApp) window.KtxApp.showToast('Lỗi cập nhật thông báo', 'error');
        }
    }

    function handleNotifClick(notifId, destTab) {
        markNotifRead(notifId);
        if (destTab && window.KtxApp) {
            window.KtxApp.navigate(destTab);
        } else {
            openNotificationModal(notifId);
        }
    }

    // =========================================================================
    // 12. NỘI QUY, HỖ TRỢ & LIÊN HỆ BQL (sv-ho-tro)
    // =========================================================================

    async function loadSupportData() {
        studentState.loading['sv-ho-tro'] = true;
        delete studentState.errors['sv-ho-tro'];

        try {
            studentState.supportInfo = await apiGet('/api/me/support-info');
        } catch (err) {
            console.error('Error loading support info:', err);
            studentState.errors['sv-ho-tro'] = err.message || 'Không thể tải thông tin hỗ trợ.';
        } finally {
            studentState.loading['sv-ho-tro'] = false;
        }
    }

    async function renderHoTro(container) {
        if (!studentState.supportInfo && !studentState.errors['sv-ho-tro']) {
            await loadSupportData();
        }

        if (studentState.loading['sv-ho-tro']) {
            container.innerHTML = renderSkeleton();
            return;
        }

        if (studentState.errors['sv-ho-tro']) {
            container.innerHTML = renderErrorAlert('Lỗi tải cẩm nang hỗ trợ', studentState.errors['sv-ho-tro'], 'KtxStudentViews.retryLoadTab(\'sv-ho-tro\')');
            return;
        }

        const info = studentState.supportInfo || {};
        const openAcc = studentState.openAccordion = studentState.openAccordion || { 1: true, 2: false, 3: false, 4: false, 5: false };

        const faqs = [
            { q: 'Tôi có thể đổi phòng sau khi đã nhận phòng không?', a: 'Sinh viên có thể làm đơn xin chuyển phòng gửi Ban Quản lý trong 2 tuần đầu học kỳ nếu có lý do chính đáng và còn chỗ trống phù hợp.' },
            { q: 'Người thân đến thăm KTX cần những thủ tục gì?', a: 'Khách đến thăm phải xuất trình CCCD/CMND tại phòng bảo vệ cổng, ghi sổ theo dõi và chỉ được tiếp đón tại phòng tiếp khách chung từ 07:00 đến 21:00.' },
            { q: 'Nếu quá 24h chưa nộp tiền giữ chỗ thì xử lý thế nào?', a: 'Vị trí giường sẽ tự động hủy trên hệ thống. Sinh viên phải nộp đơn đăng ký lại nếu đợt đăng ký vẫn còn mở và còn phòng trống.' },
            { q: 'Tiền điện nước hàng tháng được tính như thế nào?', a: 'Điện nước được tính theo chỉ số đồng hồ thực tế của từng phòng chia đều cho số sinh viên ở trong phòng theo đơn giá quy định của Nhà trường.' }
        ];

        function renderAccordionItem(id, title, icon, content) {
            const isOpen = Boolean(openAcc[id]);
            return `
                <div class="rounded-2xl bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-[#232B3B] overflow-hidden transition-all shadow-xs">
                    <button type="button" onclick="KtxStudentViews.toggleAccordion(${id})" class="w-full p-4 sm:p-5 flex items-center justify-between text-left focus:outline-hidden hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0B2A5B] dark:text-blue-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-[20px]">${esc(icon)}</span>
                            </div>
                            <span class="text-sm font-bold text-slate-900 dark:text-white">${esc(title)}</span>
                        </div>
                        <span class="material-symbols-outlined text-slate-400 text-[20px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}">
                            expand_more
                        </span>
                    </button>
                    ${isOpen ? `
                        <div class="px-5 pb-5 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 whitespace-pre-wrap">
                            ${content}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        container.innerHTML = `
            <div class="space-y-6 page-content-enter">
                ${renderViewHeader('Nội quy, Hỗ trợ & Liên hệ BQL', 'Cẩm nang quy chế nội trú, quy trình thanh toán VietQR và kênh hỗ trợ trực tiếp KTX UTC2')}

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <!-- Left Column: Accordions (8 cols) -->
                    <div class="lg:col-span-8 space-y-4">
                        ${renderAccordionItem(1, 'Nội quy & Quy chế Ký túc xá UTC2', 'gavel', esc(info.regulations || '1. Chấp hành nghiêm chỉnh nội quy KTX và pháp luật nhà nước.\n2. Giữ gìn an ninh trật tự, không gây ồn ào sau 22h00.\n3. Tiết kiệm điện nước, bảo quản tài sản công cộng.\n4. Tuyệt đối không nấu ăn trong phòng không đúng nơi quy định.'))}
                        ${renderAccordionItem(2, 'Hướng dẫn Đăng ký nội trú trực tuyến', 'how_to_reg', esc(info.registrationGuide || 'Quy trình 4 bước:\nBước 1: Kiểm tra thông tin định danh sinh viên.\nBước 2: Chọn tòa nhà theo giới tính quy định.\nBước 3: Chọn phòng còn chỗ trống phù hợp.\nBước 4: Xác nhận cam kết và nộp đơn trực tuyến.'))}
                        ${renderAccordionItem(3, 'Cách thức nộp tiền giữ chỗ qua VietQR', 'qr_code_2', esc(info.paymentGuide || 'Sau khi đơn được BQL phê duyệt:\n- Sinh viên có 24 giờ để hoàn tất chuyển khoản giữ chỗ.\n- Mở app ngân hàng bất kỳ, quét mã VietQR tự động trên hệ thống.\n- Giữ nguyên cú pháp nội dung chuyển khoản để hệ thống tự động gạch nợ trong 15 giây.'))}
                        ${renderAccordionItem(4, 'Quy trình Nhận & Trả phòng KTX', 'key', esc(info.checkInOutProcess || 'Nhận phòng: Mang CCCD và Giấy báo nhập học / Thẻ sinh viên đến Văn phòng BQL KTX để nhận chìa khóa và ký biên bản bàn giao.\nTrả phòng: Đăng ký trả phòng trước 1 tuần, dọn dẹp vệ sinh phòng và làm thủ tục thanh lý hợp đồng.'))}
                        ${renderAccordionItem(5, 'Câu hỏi thường gặp (FAQ)', 'quiz', faqs.map(f => `
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B] mb-2.5">
                                <div class="font-bold text-slate-800 dark:text-white mb-1">Q: ${esc(f.q)}</div>
                                <div class="text-slate-600 dark:text-slate-300">A: ${esc(f.a)}</div>
                            </div>
                        `).join(''))}
                    </div>

                    <!-- Right Column: Contact & Quick Maintenance Card (4 cols) -->
                    <div class="lg:col-span-4 space-y-4 sticky top-24">
                        <!-- Contact BQL Card -->
                        <div class="bg-white dark:bg-[#121826] rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-[#232B3B] space-y-4">
                            <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <span class="material-symbols-outlined text-[20px] text-[#0B2A5B] dark:text-blue-400">contact_phone</span>
                                <h3 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Thông tin liên hệ BQL</h3>
                            </div>

                            <div class="space-y-3 text-xs">
                                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                    <span class="text-slate-400 block text-[11px]">Hotline khẩn cấp (24/7):</span>
                                    <a href="tel:02838960000" class="font-bold text-base text-[#0B2A5B] dark:text-blue-300 hover:underline mt-0.5 inline-flex items-center gap-1.5">
                                        <span class="material-symbols-outlined text-[18px]">call</span>
                                        <span>028.3896.xxxx</span>
                                    </a>
                                </div>

                                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                    <span class="text-slate-400 block text-[11px]">Email liên hệ BQL:</span>
                                    <a href="mailto:ktx@utc2.edu.vn" class="font-bold text-slate-900 dark:text-white hover:underline mt-0.5 inline-flex items-center gap-1.5">
                                        <span class="material-symbols-outlined text-[18px]">mail</span>
                                        <span>ktx@utc2.edu.vn</span>
                                    </a>
                                </div>

                                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                    <span class="text-slate-400 block text-[11px]">Giờ làm việc văn phòng:</span>
                                    <span class="font-semibold text-slate-700 dark:text-slate-200 mt-0.5 block">
                                        Sáng: 07h30 – 11h30<br/>Chiều: 13h00 – 17h00 (T2 – T6)<br/>Bảo vệ túc trực 24/7
                                    </span>
                                </div>

                                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-[#232B3B]">
                                    <span class="text-slate-400 block text-[11px]">Địa chỉ văn phòng:</span>
                                    <span class="font-semibold text-slate-700 dark:text-slate-200 mt-0.5 block">
                                        Văn phòng BQL KTX, Tầng trệt Nhà A1, Phân hiệu UTC2, 450-451 Lê Văn Việt, P. Tăng Nhơn Phú A, TP. Thủ Đức, TP.HCM.
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Action Card: "Gặp sự cố thiết bị?" -->
                        <div class="bg-gradient-to-br from-[#0B2A5B] to-[#143F8C] text-white rounded-2xl p-6 shadow-md space-y-3">
                            <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <span class="material-symbols-outlined text-[22px]">build</span>
                            </div>
                            <div>
                                <h4 class="text-sm font-bold">Gặp sự cố thiết bị phòng?</h4>
                                <p class="text-xs text-blue-100 mt-1 leading-relaxed">
                                    Đèn chớp nháy, vòi nước rò rỉ hoặc ổ khóa bị kẹt? Hãy gửi yêu cầu báo hỏng để kỹ thuật viên KTX hỗ trợ kiểm tra xử lý ngay.
                                </p>
                            </div>
                            <div class="pt-1">
                                <button type="button" onclick="KtxApp.navigate('sv-sua-chua')" class="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#0B2A5B] font-bold text-xs shadow-sm transition-all inline-flex items-center justify-center gap-1.5">
                                    <span class="material-symbols-outlined text-[17px]">add_circle</span>
                                    <span>Tạo phiếu sửa chữa ngay</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function toggleAccordion(id) {
        if (!studentState.openAccordion) studentState.openAccordion = {};
        studentState.openAccordion[id] = !studentState.openAccordion[id];
        const container = document.getElementById('mainContent');
        if (container) renderHoTro(container);
    }

    // =========================================================================
    // MAIN RENDER DISPATCHER
    // =========================================================================

    async function renderView(tabId, container, appState) {
        clearTimers();
        const baseTab = (tabId || '').split('?')[0];
        const queryStr = tabId.includes('?') ? tabId.substring(tabId.indexOf('?') + 1) : '';
        const params = new URLSearchParams(queryStr);
        studentState.activeTab = baseTab;
        if (!container) return;

        switch (baseTab) {
            case 'sv-tong-quan':
                await renderTongQuan(container);
                break;
            case 'sv-ho-so':
                await renderHoSo(container);
                break;
            case 'sv-dot-dang-ky':
                await renderDotDangKy(container);
                break;
            case 'sv-dang-ky':
                await renderDangKyForm(container, params.get('round'));
                break;
            case 'sv-don-cua-toi':
                await renderDonCuaToi(container);
                break;
            case 'sv-thanh-toan':
                await renderThanhToan(container, params.get('appId'));
                break;
            case 'sv-hop-dong':
                await renderHopDong(container);
                break;
            case 'sv-hoa-don':
                await renderHoaDon(container);
                break;
            case 'sv-sua-chua':
                await renderSuaChua(container);
                break;
            case 'sv-vi-pham':
                await renderViPham(container);
                break;
            case 'sv-thong-bao':
                await renderThongBao(container);
                break;
            case 'sv-ho-tro':
                await renderHoTro(container);
                break;
            default:
                await renderTongQuan(container);
                break;
        }
    }

    // Action Helpers
    function retryLoadTab(tabId) {
        delete studentState.errors[tabId];
        studentState.loading[tabId] = true;
        if (tabId === 'sv-tong-quan') studentState.dashboard = null;
        if (tabId === 'sv-ho-so') studentState.profile = null;
        if (tabId === 'sv-dot-dang-ky') studentState.rounds = [];

        const container = document.getElementById('mainContent');
        if (container) {
            renderView(tabId, container, window.KtxApp ? window.KtxApp.getState() : {});
        }
    }

    function openRegistrationForm(roundId) {
        if (window.KtxApp && typeof window.KtxApp.navigate === 'function') {
            window.KtxApp.navigate(`sv-dang-ky${roundId ? `?round=${roundId}` : ''}`);
        }
    }

    return {
        hasView,
        renderView,
        statusBadge,
        retryLoadTab,
        openRegistrationForm,
        // Profile helpers
        toggleEditContact,
        submitContactUpdate,
        openChangeRequestModal,
        submitChangeRequest,
        openGuardianModal,
        submitGuardianForm,
        confirmDeleteGuardian,
        executeDeleteGuardian,
        togglePwdView,
        submitChangePassword,
        // Round helpers
        setRoundFilter,
        openNotificationModal,
        // Group 2: Form Đăng ký
        setRegStep,
        selectBuilding,
        selectRoom,
        toggleAcceptRules,
        submitRegistrationForm,
        openRulesModal,
        // Group 2: Đơn của tôi
        setAppFilter,
        openAppDrawer,
        closeAppDrawer,
        // Group 2: Thanh toán
        triggerPaymentCheck,
        copyToClipboard,
        // Group 3: Hợp đồng
        printContract,
        // Group 3: Hóa đơn & Điện nước
        setInvoiceTab,
        openInvoicePaymentModal,
        viewInvoiceReceipt,
        // Group 3: Sửa chữa
        openCreateMaintenanceModal,
        handleMaintenanceImagePreview,
        submitMaintenanceForm,
        viewMaintenanceDetail,
        // Thông báo
        openNotificationDetailModal,
        setNotifFilter,
        markNotifRead,
        markAllNotifsRead,
        handleNotifClick,
        // Hỗ trợ
        toggleAccordion
    };
})();
