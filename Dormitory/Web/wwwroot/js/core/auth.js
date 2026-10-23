/**
 * Core Auth Management
 */
const Auth = {
    getUser() {
        const stored = localStorage.getItem('ktx_user');
        return stored ? JSON.parse(stored) : null;
    },

    setUser(user) {
        if (user) {
            localStorage.setItem('ktx_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('ktx_user');
        }
    },

    async login(username, password) {
        const res = await Api.post('/api/auth/login', { username, password });
        if (res.success && res.data) {
            this.setUser(res.data);
            return res.data;
        }
        throw new Error(res.message || 'Đăng nhập không thành công.');
    },

    logout() {
        this.setUser(null);
        window.location.href = '/Account/Login';
    },

    isAuthenticated() {
        return !!this.getUser();
    }
};

window.Auth = Auth;

