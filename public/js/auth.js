// D:\OPF4896System\public\js\auth.js

(function checkSession() {
    const loginExpiry = localStorage.getItem('loginExpiry');
    const path = window.location.pathname;
    
    // If user is NOT on the login page (index.html) and session is invalid
    if (!path.endsWith('index.html') && (!loginExpiry || Date.now() >= parseInt(loginExpiry))) {
        console.warn('Session expired. Redirecting to login...');
        logout();
    }
})();

function logout() {
    localStorage.removeItem('loginExpiry');
    localStorage.removeItem('user_phone');
    // Redirect to login
    window.location.href = 'index.html'; 
}