/**
 * Core Application State
 */
const State = {
    currentUser: null,
    currentTab: 'dashboard',
    darkMode: localStorage.getItem('ktx_dark_mode') === 'true',
    selectedAcademicYear: localStorage.getItem('ktx_user_selected_academic_year') || null,
    listeners: [],

    subscribe(fn) {
        this.listeners.push(fn);
    },

    notify() {
        this.listeners.forEach(fn => fn(this));
    },

    setTab(tab) {
        this.currentTab = tab;
        this.notify();
    },

    setAcademicYear(code) {
        this.selectedAcademicYear = code;
        if (code) localStorage.setItem('ktx_user_selected_academic_year', code);
        else localStorage.removeItem('ktx_user_selected_academic_year');
        this.notify();
    },

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('ktx_dark_mode', this.darkMode);
        document.documentElement.classList.toggle('dark', this.darkMode);
        this.notify();
    }
};

window.State = State;
