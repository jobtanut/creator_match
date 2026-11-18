const API = 'http://localhost:3030';

// Stops names like <script> from running as code when put into the page
function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
}

// Shows a message in a <p class="form-message"> element. type: 'success' or 'error'
function showMessage(el, text, type) {
    el.textContent = text;
    el.className = 'form-message ' + (type || '');
}

// Sends a request to the web service with the login token. Returns the JSON reply.
// body can be FormData (file uploads) or a plain object (sent as JSON).
async function api(method, url, body) {
    const options = { method, headers: { Authorization: getCookie('token') } };

    if (body instanceof FormData) {
        options.body = body;
    } else if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    const res = await fetch(API + url, options);
    // passport replies to a missing/bad token with plain text "Unauthorized", not JSON
    if (res.status === 401) throw new Error('Your login has expired, please log in again');

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.message || 'Something went wrong');
    return data;
}

// After add/edit, the form page sends you back to the list with ?msg=...
// This shows that message on the list page, then removes it from the address bar.
function showFlashMessage(el) {
    const params = new URLSearchParams(window.location.search);
    const msg = params.get('msg');
    if (msg) {
        showMessage(el, msg, 'success');
        history.replaceState(null, '', window.location.pathname);
    }
}