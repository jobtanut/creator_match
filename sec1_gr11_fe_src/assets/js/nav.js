const API_URL = 'http://localhost:3030';

function getCookie(cookieName) {
    const match = document.cookie.split('; ').find((c) =>
        c.startsWith(cookieName + '=') && c.length > cookieName.length + 1);
    return match ? match.split('=')[1] : null;
}

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

function escapeNavText(text) {
    return String(text ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
}

// Nav structure
function buildNav() {
    const nav = document.getElementById('nav-links');
    if (!nav) return;

    const user = getUser();

    let links = `
    <a href="/search">Search</a>
    <a href="/trends">Trends</a>
    <a href="/team">Team</a>`;

    if (!user) {
        links += `
    <a href="/auth/login">Login</a>`;
    } else {
        if (user.role === 1) {
            links += `
    <a href="/admin">Admin</a>`;
        }
        links += `
    <div class="nav-menu" id="navMenu">
        <button type="button" class="nav-profile" id="navProfile" aria-haspopup="true" aria-expanded="false">
            <span class="nav-avatar" id="navAvatar">${escapeNavText((user.sub || '?')[0].toUpperCase())}</span>
            <span id="navName">${escapeNavText(user.sub)}</span>
            <span class="nav-caret">&#9662;</span>
        </button>
        <div class="nav-dropdown" id="navDropdown" hidden>
            <a href="/profile">My Profile</a>
            <a href="#" id="navLogout">Logout</a>
        </div>
    </div>`;
    }

    nav.innerHTML = links;
    if (user) {
        setupProfileMenu();
        refreshNavProfile();
    }
}

// Profile dropdown: click the avatar to open, click outside or press Esc to close
function setupProfileMenu() {
    const menu = document.getElementById('navMenu');
    const button = document.getElementById('navProfile');
    const dropdown = document.getElementById('navDropdown');

    const setOpen = (open) => {
        dropdown.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
    };

    button.addEventListener('click', () => setOpen(dropdown.hidden));
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setOpen(false);
    });
    document.getElementById('navLogout').addEventListener('click', (e) => {
        e.preventDefault();
        setOpen(false);
        logout();
    });
}

// Swaps the placeholder for the user's real picture and first name (GET /me)
async function refreshNavProfile() {
    const avatar = document.getElementById('navAvatar');
    const name = document.getElementById('navName');
    if (!avatar || !name) return;

    try {
        const res = await fetch(API_URL + '/me', { headers: { Authorization: getCookie('token') } });
        if (!res.ok) return;
        const { data } = await res.json();

        name.textContent = data.first_name;
        if (data.User_picture_link) {
            avatar.innerHTML = `<img src="${escapeNavText(data.User_picture_link)}?v=${Date.now()}" alt="">`;
        } else {
            avatar.textContent = data.first_name[0].toUpperCase();
        }
    } catch (err) {
        // web service down: keep the username placeholder
    }
}

// Admin-only pages call this
function requireAdmin() {
    const user = getUser();
    if (!user || user.role !== 1) window.location.href = '/auth/login';
}

// Pages for any logged-in user call this
function requireLogin() {
    if (!getUser()) window.location.href = '/auth/login';
}

buildNav();