const form = document.getElementById('userForm');
const message = document.getElementById('formMessage');
const editingId = new URLSearchParams(window.location.search).get('id');   // null when adding

// Edit
async function loadUserForEdit() {
    try {
        const { data: u } = await api('GET', `/users/${encodeURIComponent(editingId)}`);

        document.getElementById('username').value = u.username;
        document.getElementById('email').value = u.email;
        document.getElementById('first_name').value = u.first_name;
        document.getElementById('last_name').value = u.last_name;
        document.getElementById('Bio').value = u.Bio || '';
        document.getElementById('password').placeholder = 'Leave empty to keep the current password';

        // the user uploads their own picture; an admin can only remove it
        if (u.User_picture_link) {
            document.getElementById('userPicture').src = u.User_picture_link;
            document.getElementById('pictureSection').hidden = false;
        }

        document.title = `CreatorMatch - Edit ${u.username}`;
        document.getElementById('formTitle').textContent = `Edit User (${u.UserID})`;
        document.getElementById('submitButton').textContent = 'Update User';
        document.getElementById('deleteButton').hidden = false;
    } catch (err) {
        showMessage(message, err.message, 'error');
        document.getElementById('submitButton').disabled = true;
    }
}

// Save
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const body = Object.fromEntries(new FormData(form));
    if (editingId && !body.password) delete body.password;   // empty = keep the current password
    body.remove_picture = document.getElementById('remove_picture').checked;

    try {
        if (editingId) {
            await api('PUT', `/users/${encodeURIComponent(editingId)}`, body);
            window.location.href = '/admin/users?msg=' + encodeURIComponent('User updated');
        } else {
            await api('POST', '/users', body);
            window.location.href = '/admin/users?msg=' + encodeURIComponent('User added');
        }
    } catch (err) {
        showMessage(message, err.message, 'error');
    }
});

// Delete
document.getElementById('deleteButton').addEventListener('click', async () => {
    if (!confirm(`Delete user ${document.getElementById('username').value}? Their account and login history are removed, and this cannot be undone.`)) return;

    try {
        await api('DELETE', `/users/${encodeURIComponent(editingId)}`);
        window.location.href = '/admin/users?msg=' + encodeURIComponent('User deleted');
    } catch (err) {
        showMessage(message, err.message, 'error');
    }
});

if (editingId) loadUserForEdit();