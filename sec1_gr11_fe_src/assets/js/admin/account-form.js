// account-form.js: Add / Edit Admin page.
//   /admin/account                 -> add a new admin
//   /admin/account?id=U000000002   -> edit (and delete) that admin
// Needs nav.js and admin-common.js loaded first.

const form = document.getElementById('adminForm');
const message = document.getElementById('formMessage');
const teamSelect = document.getElementById('TeamMemberID');
const editingId = new URLSearchParams(window.location.search).get('id');   // null when adding

// ------------------ TEAM MEMBER DROPDOWN ------------------
async function loadTeamOptions() {
    try {
        const data = await api('GET', '/team');
        teamSelect.innerHTML = '<option value="">None</option>' + data.data.map((t) =>
            `<option value="${escapeHtml(t.TeamMemberID)}">${escapeHtml(t.TeamMemberID)} - ${escapeHtml(t.t_first_name)} ${escapeHtml(t.t_last_name)}</option>`
        ).join('');
    } catch (err) {
        // the dropdown keeps "None" if the team can't be loaded
    }
}

// ------------------ EDIT MODE: load the admin into the form ------------------
async function loadAdminForEdit() {
    try {
        const { data: a } = await api('GET', `/admins/${encodeURIComponent(editingId)}`);

        form.username.value = a.username;
        form.email.value = a.email;
        form.first_name.value = a.first_name;
        form.last_name.value = a.last_name;
        form.Position.value = a.Position || '';
        form.TeamMemberID.value = a.TeamMemberID || '';
        form.password.placeholder = 'Leave empty to keep the current password';

        document.title = `CreatorMatch - Edit ${a.username}`;
        document.getElementById('formTitle').textContent = `Edit Admin (${a.UserID})`;
        document.getElementById('submitButton').textContent = 'Update Admin';

        // you can't delete your own account
        const me = getUser();
        document.getElementById('deleteButton').hidden = !!(me && me.sub === a.username);
    } catch (err) {
        showMessage(message, err.message, 'error');
        document.getElementById('submitButton').disabled = true;
    }
}

// ------------------ SAVE (add or update) ------------------
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const body = Object.fromEntries(new FormData(form));
    if (editingId && !body.password) delete body.password;   // empty = keep the current password

    try {
        if (editingId) {
            await api('PUT', `/admins/${encodeURIComponent(editingId)}`, body);
            window.location.href = '/admin/accounts?msg=' + encodeURIComponent('Admin updated');
        } else {
            await api('POST', '/admins', body);
            window.location.href = '/admin/accounts?msg=' + encodeURIComponent('Admin added');
        }
    } catch (err) {
        showMessage(message, err.message, 'error');
    }
});

// ------------------ DELETE (edit mode only) ------------------
document.getElementById('deleteButton').addEventListener('click', async () => {
    if (!confirm(`Delete admin ${form.username.value}? Their login and edit history are removed too, and this cannot be undone.`)) return;

    try {
        await api('DELETE', `/admins/${encodeURIComponent(editingId)}`);
        window.location.href = '/admin/accounts?msg=' + encodeURIComponent('Admin deleted');
    } catch (err) {
        showMessage(message, err.message, 'error');
    }
});

// load the dropdown first, so the admin's team member can be selected in edit mode
loadTeamOptions().then(() => {
    if (editingId) loadAdminForEdit();
});