// admin.js: creator management on the admin page.
// Needs nav.js loaded first (uses its getCookie function).

const API = 'http://localhost:3030';

const form = document.getElementById('creatorForm');
const rows = document.getElementById('creatorRows');
const message = document.getElementById('formMessage');
const formTitle = document.getElementById('formTitle');
const submitButton = document.getElementById('submitButton');
const cancelButton = document.getElementById('cancelButton');

let creators = [];      // last list loaded from the server
let editingId = null;   // creatorID being edited, or null when adding

// Stops creator names like <script> from running as code in the table
function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
}

function showMessage(text, type) {
    message.textContent = text;
    message.className = 'form-message ' + type;
}

// Sends a request with the login token. Returns the JSON reply.
async function api(method, url, body) {
    const res = await fetch(API + url, {
        method,
        headers: { Authorization: getCookie('token') },
        body,
    });
    // passport replies to a missing/bad token with plain text "Unauthorized", not JSON
    if (res.status === 401) throw new Error('Your login has expired, please log in again');

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.message || 'Something went wrong');
    return data;
}

// ------------------ LIST ------------------
async function loadCreators() {
    try {
        const data = await api('GET', '/creators');
        creators = data.data;
        renderTable();
    } catch (err) {
        rows.innerHTML = `<tr><td colspan="8">${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderTable() {
    if (creators.length === 0) {
        rows.innerHTML = '<tr><td colspan="8">No creators yet</td></tr>';
        return;
    }

    rows.innerHTML = creators.map((c) => `
        <tr class="${c.Status === 'Inactive' ? 'inactive' : ''}">
            <td>${c.creator_picture_Link ? `<img class="thumb" src="${escapeHtml(c.creator_picture_Link)}" alt="">` : ''}</td>
            <td>${escapeHtml(c.creatorID)}</td>
            <td>${escapeHtml(c.creator_name)}</td>
            <td>${escapeHtml(c.category)}</td>
            <td>${Number(c.followers).toLocaleString()}</td>
            <td>${escapeHtml(c.platforms || '-')}</td>
            <td>${escapeHtml(c.Status)}</td>
            <td>
                <button class="action-button" onclick="startEdit('${c.creatorID}')">Edit</button>
                <button class="action-button" onclick="deleteCreator('${c.creatorID}')">Delete</button>
            </td>
        </tr>`).join('');
}

// ------------------ ADD / EDIT ------------------
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const body = new FormData(form);   // includes the picture file if one was chosen

    try {
        if (editingId) {
            await api('PUT', `/creators/${editingId}`, body);
            showMessage('Creator updated', 'success');
        } else {
            await api('POST', '/creators', body);
            showMessage('Creator added', 'success');
        }
        resetForm(false);
        loadCreators();
    } catch (err) {
        showMessage(err.message, 'error');
    }
});

function startEdit(id) {
    const c = creators.find((x) => x.creatorID === id);
    if (!c) return;

    editingId = id;
    form.creator_name.value = c.creator_name;
    form.category.value = c.category;
    form.c_first_name.value = c.c_first_name || '';
    form.c_last_name.value = c.c_last_name || '';
    form.followers.value = c.followers;
    form.platforms.value = c.platforms || '';
    form.Description.value = c.Description || '';
    form.Status.value = c.Status;
    form.picture.value = '';

    formTitle.textContent = `Edit Creator (${id})`;
    submitButton.textContent = 'Update Creator';
    cancelButton.hidden = false;
    showMessage('', '');
    form.scrollIntoView({ behavior: 'smooth' });
}

function resetForm(clearMessage = true) {
    editingId = null;
    form.reset();
    formTitle.textContent = 'Add Creator';
    submitButton.textContent = 'Add Creator';
    cancelButton.hidden = true;
    if (clearMessage) showMessage('', '');
}

cancelButton.addEventListener('click', () => resetForm());

// ------------------ DELETE ------------------
async function deleteCreator(id) {
    const c = creators.find((x) => x.creatorID === id);
    if (!confirm(`Delete ${c ? c.creator_name : id}? This removes the creator, their platforms and edit history, and cannot be undone.`)) return;

    try {
        await api('DELETE', `/creators/${id}`);
        showMessage('Creator deleted', 'success');
        if (editingId === id) resetForm(false);
        loadCreators();
    } catch (err) {
        showMessage(err.message, 'error');
    }
}

loadCreators();