(() => {
    const paths = {
        arrowForward: '<path d="M5 12h14M13 6l6 6-6 6"/>',
        arrowBack: '<path d="M19 12H5m6 6-6-6 6-6"/>',
        add: '<path d="M12 5v14M5 12h14"/>',
        addCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
        search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/>',
        grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
        person: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
        personPlus: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6m-3-3h6"/>',
        people: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.5"/>',
        badge: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1 7 4.5-2.5 4.5 2.5-1-7"/>',
        school: '<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M6 11v5c3.5 3 8.5 3 12 0v-5M21 9v7"/>',
        building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3"/>',
        buildingPlus: '<path d="M14 21V4H4v17M2 21h20M7 8h2m-2 4h2m-2 4h2m10-5v6m-3-3h6"/>',
        water: '<path d="M12 3s7 8 7 12a7 7 0 1 1-14 0c0-4 7-12 7-12Z"/><path d="M9 16a3 3 0 0 0 3 3"/>',
        receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6m-6 4h6m-6 4h3"/>',
        wrench: '<path d="M14.5 6.5a5 5 0 0 0-6.8 6.8L3 18l3 3 4.7-4.7a5 5 0 0 0 6.8-6.8l-3 3-3-3 3-3Z"/><path d="m15 15 5 5"/>',
        hammer: '<path d="m14 5 5 5m-8-8 8 8-3 3-8-8 3-3ZM10 10 3 17l4 4 7-7"/>',
        gavel: '<path d="m14 4 6 6m-9-9 9 9-3 3-9-9 3-3ZM9 9l6 6m-9-3 6 6m-9 0 4 4m3-7 3 3M3 21h12"/>',
        chart: '<path d="M4 20V11m5 9V5m5 15v-7m5 7V8M2 20h20"/>',
        pie: '<path d="M12 3v9h9A9 9 0 1 1 12 3Z"/><path d="M15 3.5A8 8 0 0 1 20.5 9H15V3.5Z"/>',
        wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 9V6a2 2 0 0 1 2-2h13m-1 9h4m-4 0a1 1 0 1 0 0 .1"/>',
        card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-14 5h4"/>',
        cardPlus: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-8 5h5m-2.5-2.5v5"/>',
        check: '<path d="m5 12 4 4L19 6"/>',
        checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
        close: '<path d="m6 6 12 12M18 6 6 18"/>',
        closeCircle: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
        eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
        bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
        chevronDown: '<path d="m6 9 6 6 6-6"/>',
        menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
        moon: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
        key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9m-4 4 3 3m-6-1 3 3"/>',
        lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
        logout: '<path d="M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',
        download: '<path d="M12 3v12m-5-5 5 5 5-5M4 19v2h16v-2"/>',
        upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',
        print: '<path d="M6 9V3h12v6M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6zM17 12h1"/>',
        edit: '<path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
        calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-13 4h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        warning: '<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
        room: '<path d="M4 21V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v17M2 21h20M9 21v-5h6v5M8 7h.01M16 7h.01"/>',
        bed: '<path d="M3 19v-9m0 5h18v4M3 12h5a4 4 0 0 1 4 4m0-4h5a4 4 0 0 1 4 4M3 19v2m18-2v2"/>',
        bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
        filter: '<path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"/>',
        filterOff: '<path d="M4 5h16l-6 7v6l-4 2v-8L4 5Zm1 14L19 5"/>',
        file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v6h5m-9 4h5m-5 4h5"/>',
        cancel: '<circle cx="12" cy="12" r="9"/><path d="m8 8 8 8m0-8-8 8"/>',
        male: '<circle cx="10" cy="14" r="6"/><path d="m14.5 9.5 6-6m-5 0h5v5"/>',
        female: '<circle cx="12" cy="9" r="6"/><path d="M12 15v7m-3-3h6"/>',
        task: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m7 9 1.5 1.5L11 8m2 1h4m-10 6 1.5 1.5L11 14m2 1h4"/>',
        dataset: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5m-16 6v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
        shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
        help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.3 2c-1.2 1-1.8 1.3-1.8 3m0 3h.01"/>'
    };

    const iconMap = {
        account_balance_wallet: 'wallet', add: 'add', add_card: 'cardPlus', add_circle: 'addCircle', add_task: 'task',
        admin_panel_settings: 'shield', analytics: 'chart', apartment: 'building', arrow_back: 'arrowBack',
        arrow_forward: 'arrowForward', assignment: 'file', assignment_turned_in: 'task', badge: 'badge',
        bar_chart: 'chart', bed: 'bed', bolt: 'bolt', build: 'wrench', build_circle: 'wrench', cancel: 'cancel',
        check: 'check', check_circle: 'checkCircle', class: 'school', close: 'close', construction: 'hammer',
        credit_card: 'card', dashboard: 'grid', dataset: 'dataset', domain: 'building', domain_add: 'buildingPlus',
        download: 'download', edit: 'edit', edit_document: 'edit', engineering: 'wrench', event_busy: 'calendar',
        expand_more: 'chevronDown', female: 'female', file_download: 'download', filter_alt_off: 'filterOff',
        gavel: 'gavel', grid_view: 'grid', groups: 'people', handyman: 'hammer', how_to_reg: 'personPlus',
        ios_share: 'upload', key: 'key', light_mode: 'sun', lock: 'lock', logout: 'logout', dark_mode: 'moon', male: 'male', manage_accounts: 'person',
        meeting_room: 'room', menu: 'menu', notifications: 'bell', notifications_active: 'bell', payments: 'wallet',
        pending_actions: 'clock', person: 'person', person_add: 'personPlus', pie_chart: 'pie', post_add: 'file',
        print: 'print', receipt_long: 'receipt', report_problem: 'warning', savings: 'wallet', schedule: 'clock',
        school: 'school', search: 'search', table_view: 'grid', task_alt: 'checkCircle', update: 'clock',
        upload_file: 'upload', verified_user: 'shield', visibility: 'eye', warning: 'warning', water_drop: 'water'
    };

    function renderIcon(element) {
        const name = element.textContent.trim();
        if (!name) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('class', `${element.className} material-symbols-svg`);
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '1.8');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        svg.setAttribute('data-icon-name', name);
        svg.innerHTML = paths[iconMap[name]] || paths.help;
        element.replaceWith(svg);
    }

    function renderIcons(root) {
        if (root.nodeType !== Node.ELEMENT_NODE && root !== document) return;
        if (root.matches?.('span.material-symbols-outlined')) renderIcon(root);
        root.querySelectorAll?.('span.material-symbols-outlined').forEach(renderIcon);
    }

    renderIcons(document);
    new MutationObserver(records => {
        for (const record of records) {
            record.addedNodes.forEach(renderIcons);
        }
    }).observe(document.documentElement, { childList: true, subtree: true });
})();
