// accounts.js: Admin Account Management page (search + list + delete).
// Adding and editing happen on their own page: /admin/account (add) and /admin/account?id=... (edit).
// Needs nav.js and admin-common.js loaded first.

const rows = document.getElementById('adminRows');
const listMessage = document.getElementById('listMessage');
const searchForm = document.getElementById('adminSearchForm');

let admins = [];   // last list loaded from the server

// ------------------ SEARCH / LIST ------------------
async function loadAdmins() {
    const params = new URLSearchParams();
    const name = document.getElementById('searchName').value.trim();
    const email = document.getElementById('searchEmail').value.trim();
    const position = document.getElementById('searchPosition').value.trim();
    if (name) params.append('name', name);
    if (email) params.append('email', email);
    if (position) params.append('position', position);

    try {
        const data = await api('GET', `/admins?${params}`);
        admins = data.data;
        document.getElementById('adminListTitle').textContent = `Admin List (${data.count})`;
        renderTable();
    } catch (err) {
        rows.innerHTML = `<tr><td colspan="7">${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderTable() {
    if (admins.length === 0) {
        rows.innerHTML = '<tr><td colspan="7">No admins match your search</td></tr>';
        return;
    }

    const me = getUser();   // from nav.js, so you can't delete yourself
    rows.innerHTML = admins.map((a) => `
        <tr>
            <td>${escapeHtml(a.UserID)}</td>
            <td>${escapeHtml(a.username)}</td>
            <td>${escapeHtml(a.first_name)} ${escapeHtml(a.last_name)}</td>
            <td>${escapeHtml(a.email)}</td>
            <td>${escapeHtml(a.Position || '-')}</td>
            <td>${escapeHtml(a.TeamMemberID || '-')}</td>
            <td>
                <a class="action-button" href="/admin/account?id=${encodeURIComponent(a.UserID)}">Edit</a>
                ${me && me.sub === a.username
                    ? '(you)'
                    : `<button class="action-button" onclick="deleteAdmin('${a.UserID}')">Delete</button>`}
            </td>
        </tr>`).join('');
}

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loadAdmins();
});

document.getElementById('searchClear').addEventListener('click', () => {
    searchForm.reset();
    loadAdmins();
});

// ------------------ DELETE ------------------
async function deleteAdmin(id) {
    const a = admins.find((x) => x.UserID === id);
    if (!confirm(`Delete admin ${a ? a.username : id}? Their login and edit history are removed too, and this cannot be undone.`)) return;

    try {
        await api('DELETE', `/admins/${id}`);
        showMessage(listMessage, 'Admin deleted', 'success');
        loadAdmins();
    } catch (err) {
        showMessage(listMessage, err.message, 'error');
    }
}

showFlashMessage(listMessage);   // "Admin added" / "Admin updated" after coming back from the form
loadAdmins();