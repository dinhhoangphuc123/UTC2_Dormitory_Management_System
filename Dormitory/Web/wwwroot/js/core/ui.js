/**
 * Core UI Utilities (Toast, Modal, Notification)
 */
const UI = {
    toast(message, type = 'info') {
        const container = document.getElementById('toast-container') || this.createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    createToastContainer() {
        const c = document.createElement('div');
        c.id = 'toast-container';
        c.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(c);
        return c;
    },

    formatVND(amount) {
        if (!amount && amount !== 0) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }
};

window.UI = UI;

