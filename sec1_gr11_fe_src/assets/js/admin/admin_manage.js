const form = document.getElementById('adminForm');
const message = document.getElementById('formMessage');
const teamSelect = document.getElementById('TeamMemberID');
const editingId = new URLSearchParams(window.location.search).get('id');   // null when adding

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
            window.location.href = '/admin/search?msg=' + encodeURIComponent('Admin updated');
        } else {
            await api('POST', '/admins', body);
            window.location.href = '/admin/search?msg=' + encodeURIComponent('Admin added');
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
        window.location.href = '/admin/search?msg=' + encodeURIComponent('Admin deleted');
    } catch (err) {
        showMessage(message, err.message, 'error');
    }
});

// load the dropdown first, so the admin's team member can be selected in edit mode
loadTeamOptions().then(() => {
    if (editingId) loadAdminForEdit();
});