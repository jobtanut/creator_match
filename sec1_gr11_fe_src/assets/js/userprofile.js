const API = 'http://localhost:3030';
const form = document.getElementById('profileForm');
const message = document.getElementById('formMessage');

const dropZone = document.getElementById('dropZone');
const dropText = document.getElementById('dropText');
const dropPreview = document.getElementById('dropPreview');
const pictureInput = document.getElementById('picture');
const clearPictureButton = document.getElementById('clearPictureButton');
const removePictureInput = document.getElementById('remove_picture');

function showMessage(text, type) {
    message.textContent = text;
    message.className = type || '';
}

// Calls the web service with the login token
async function api(method, url, body) {
    const res = await fetch(API + url, {
        method,
        headers: { Authorization: getCookie('token') },
        body,
    });
    if (res.status === 401) {
        window.location.href = '/auth/login';
        throw new Error('Please log in again');
    }
    const data = await res.json();
    if (data.error) throw new Error(data.message);
    return data;
}

// Picture
function showSavedPicture(link) {
    if (link) {
        dropPreview.src = link;
        dropPreview.hidden = false;
        dropText.textContent = 'Drop or click to change';
        clearPictureButton.hidden = false;
    } else {
        dropPreview.hidden = true;
        dropPreview.removeAttribute('src');
        dropText.textContent = 'Drag and drop a picture here, or click to choose';
        clearPictureButton.hidden = true;
    }
    removePictureInput.value = '0';
}

function showChosenFile(file = pictureInput.files[0]) {
    if (!file) return;

    dropText.textContent = `${file.name} (click or drop another to replace)`;
    removePictureInput.value = '0';
    clearPictureButton.hidden = false;
    if (/\.(heic|heif)$/i.test(file.name)) {
        dropPreview.hidden = true;   // HEIC can't be previewed, it's converted to JPG when saved
    } else {
        dropPreview.src = URL.createObjectURL(file);
        dropPreview.hidden = false;
    }
}

function clearPicture() {
    pictureInput.value = '';
    dropPreview.hidden = true;
    dropPreview.removeAttribute('src');
    dropText.textContent = 'No picture. Drag and drop a picture here, or click to choose';
    removePictureInput.value = '1';
    clearPictureButton.hidden = true;
}

clearPictureButton.addEventListener('click', clearPicture);
pictureInput.addEventListener('change', () => showChosenFile());

['dragenter', 'dragover'].forEach((type) => dropZone.addEventListener(type, (e) => {
    e.preventDefault();
    dropZone.classList.add('dragging');
}));
['dragleave', 'drop'].forEach((type) => dropZone.addEventListener(type, () => {
    dropZone.classList.remove('dragging');
}));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
        showMessage('Picture must be an image file', 'error');
        return;
    }

    showChosenFile(file);
    showMessage('', '');

    try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        pictureInput.files = transfer.files;
    } catch (err) {
        showMessage('Your browser could not attach the dropped file, click the box to choose it instead', 'error');
    }
});

window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

// Load
function fillForm(user) {
    document.getElementById('username').value = user.username;
    form.first_name.value = user.first_name;
    form.last_name.value = user.last_name;
    form.email.value = user.email;
    form.Bio.value = user.Bio || '';
    showSavedPicture(user.User_picture_link);
}

async function loadProfile() {
    try {
        const { data } = await api('GET', '/me');
        fillForm(data);
    } catch (err) {
        showMessage(err.message, 'error');
        document.getElementById('saveButton').disabled = true;
    }
}

// Save
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMessage('Saving...', '');

    try {
        const { data, message: text } = await api('PUT', '/me', new FormData(form));
        fillForm(data);
        pictureInput.value = '';
        form.current_password.value = '';
        form.new_password.value = '';
        form.confirm_password.value = '';
        showMessage(text, 'success');
        refreshNavProfile();
    } catch (err) {
        showMessage(err.message, 'error');
    }
});

loadProfile();