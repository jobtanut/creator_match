const rows = document.getElementById('userRows');
const listMessage = document.getElementById('listMessage');
const searchForm = document.getElementById('userSearchForm');

let users = [];   // last list loaded from the server

// Search
async function loadUsers() {
    const params = new URLSearchParams();
    const name = document.getElementById('searchName').value.trim();
    const email = document.getElementById('searchEmail').value.trim();
    if (name) params.append('name', name);
    if (email) params.append('email', email);

    try {
        const data = await api('GET', `/users?${params}`);
        users = data.data;
        document.getElementById('userListTitle').textContent = `User List (${data.count})`;
        renderTable();
    } catch (err) {
        rows.innerHTML = `<tr><td colspan="7">${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderTable() {
    if (users.length === 0) {
        rows.innerHTML = '<tr><td colspan="7">No users match your search</td></tr>';
        return;
    }

    rows.innerHTML = users.map((u) => `
        <tr>
            <td>${u.User_picture_link
                ? `<img class="user-thumb" src="${escapeHtml(u.User_picture_link)}" alt="">`
                : `<span class="user-thumb">${escapeHtml(u.first_name[0].toUpperCase())}</span>`}</td>
            <td>${escapeHtml(u.UserID)}</td>
            <td>${escapeHtml(u.username)}</td>
            <td>${escapeHtml(u.first_name)} ${escapeHtml(u.last_name)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td>${escapeHtml(new Date(u.created_at).toLocaleDateString())}</td>
            <td>
                <a class="action-button" href="/admin/usermanage?id=${encodeURIComponent(u.UserID)}">Edit</a>
                <button class="action-button" onclick="deleteUser('${u.UserID}')">Delete</button>
            </td>
        </tr>`).join('');
}

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loadUsers();
});

document.getElementById('searchClear').addEventListener('click', () => {
    searchForm.reset();
    loadUsers();
});

// Delete
async function deleteUser(id) {
    const u = users.find((x) => x.UserID === id);
    if (!confirm(`Delete user ${u ? u.username : id}? Their account and login history are removed, and this cannot be undone.`)) return;

    try {
        await api('DELETE', `/users/${id}`);
        showMessage(listMessage, 'User deleted', 'success');
        loadUsers();
    } catch (err) {
        showMessage(listMessage, err.message, 'error');
    }
}

showFlashMessage(listMessage);
loadUsers();