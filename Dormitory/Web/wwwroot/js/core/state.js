/**
 * Core Application State
 */
const State = {
    currentUser: null,
    currentTab: 'dashboard',
    darkMode: localStorage.getItem('ktx_dark_mode') === 'true',
    selectedSemester: localStorage.getItem('ktx_selected_semester') || null,
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

    setSemester(code) {
        this.selectedSemester = code;
        localStorage.setItem('ktx_selected_semester', code || '');
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