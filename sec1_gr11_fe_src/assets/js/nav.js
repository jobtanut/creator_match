function getCookie(cookieName) {
    const match = document.cookie.split('; ').find((c) =>
        c.startsWith(cookieName + '=') && c.length > cookieName.length + 1);
    return match ? match.split('=')[1] : null;
}

// Get user who is logged in from cookie
function getUser() {
    const token = getCookie('token');
    if (!token) return null;
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch (err) {
        return null;
    }
}

function logout() {
    if (!confirm('Are you sure you want to log out?')) return;
    document.cookie = 'token=; Max-Age=0; path=/';
    window.location.href = '/';
}

// Nav structure
function buildNav() {
    const nav = document.getElementById('nav-links');
    if (!nav) return;

    const user = getUser();

    let links = `
    <a href="/search">Search</a>
    <a href="/team">About Us</a>
    <a href="/trends">Trends</a>`;

    if (!user) {
        links += `
    <a href="/auth/login">Login</a>`;
    } else if (user.role === 1) {
        links += `
    <a href="/admin">Admin</a>
    <a href="#" onclick="logout(); return false;">Logout</a>`;
    } else {
        links += `
    <a href="#" onclick="logout(); return false;">Logout</a>`;
    }

    nav.innerHTML = links;
}

// Admin-only pages call this
function requireAdmin() {
    const user = getUser();
    if (!user || user.role !== 1) window.location.href = '/auth/login';
}

buildNav();