/**
 * Core Router
 * Handles hash changes and tab navigation
 */
const Router = {
    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    },

    navigate(tab) {
        window.location.hash = tab;
    },

    handleRoute() {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        State.setTab(hash);
    }
};

window.Router = Router;

