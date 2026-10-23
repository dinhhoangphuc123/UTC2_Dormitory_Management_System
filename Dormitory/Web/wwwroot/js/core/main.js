/**
 * Application Entry Point
 */
document.addEventListener('DOMContentLoaded', () => {
    // Check dark mode
    if (State.darkMode) {
        document.documentElement.classList.add('dark');
    }

    // Initialize Router
    Router.init();
});

