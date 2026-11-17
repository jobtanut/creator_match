// creator_manage.js: Add / Edit Creator page.
//   /admin/creator                 -> add a new creator
//   /admin/creator?id=C000000001   -> edit (and delete) that creator
// Needs nav.js and common.js loaded first.

const form = document.getElementById('creatorForm');
const message = document.getElementById('formMessage');
const editingId = new URLSearchParams(window.location.search).get('id');   // null when adding

// ------------------ EDIT MODE: load the creator into the form ------------------
async function loadCreatorForEdit() {
    try {
        const { data: c } = await api('GET', `/creators/${encodeURIComponent(editingId)}`);

        form.creator_name.value = c.creator_name;
        form.category.value = c.category;
        form.c_first_name.value = c.c_first_name || '';
        form.c_last_name.value = c.c_last_name || '';
        form.followers.value = c.followers;
        form.platforms.value = c.platforms || '';
        form.Description.value = c.Description || '';
        form.Status.value = c.Status;

        // show the current picture until a new one is chosen
        if (c.creator_picture_Link) {
            dropPreview.src = c.creator_picture_Link;
            dropPreview.hidden = false;
            dropText.textContent = 'Current picture. Drop or click to replace it';
        }

        document.title = `CreatorMatch - Edit ${c.creator_name}`;
        document.getElementById('formTitle').textContent = `Edit Creator (${c.creatorID})`;
        document.getElementById('submitButton').textContent = 'Update Creator';
        document.getElementById('deleteButton').hidden = false;
    } catch (err) {
        showMessage(message, err.message, 'error');
        form.querySelector('#submitButton').disabled = true;
    }
}

// ------------------ SAVE (add or update) ------------------
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const body = new FormData(form);   // includes the picture file if one was chosen

    try {
        if (editingId) {
            await api('PUT', `/creators/${encodeURIComponent(editingId)}`, body);
            window.location.href = '/admin/creators?msg=' + encodeURIComponent('Creator updated');
        } else {
            await api('POST', '/creators', body);
            window.location.href = '/admin/creators?msg=' + encodeURIComponent('Creator added');
        }
    } catch (err) {
        showMessage(message, err.message, 'error');
    }
});

// ------------------ DELETE (edit mode only) ------------------
document.getElementById('deleteButton').addEventListener('click', async () => {
    if (!confirm(`Delete ${form.creator_name.value}? This removes the creator, their platforms and edit history, and cannot be undone.`)) return;

    try {
        await api('DELETE', `/creators/${encodeURIComponent(editingId)}`);
        window.location.href = '/admin/creators?msg=' + encodeURIComponent('Creator deleted');
    } catch (err) {
        showMessage(message, err.message, 'error');
    }
});

// ------------------ DRAG AND DROP PICTURE ------------------
const dropZone = document.getElementById('dropZone');
const dropText = document.getElementById('dropText');
const dropPreview = document.getElementById('dropPreview');
const pictureInput = form.picture;

const isImageFile = (file) =>
    file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name);

// Shows the chosen file's name, and a preview if the browser can display it (HEIC can't be previewed)
function showChosenFile() {
    const file = pictureInput.files[0];
    if (!file) return;

    dropText.textContent = `${file.name} (click or drop another to replace)`;
    if (/\.(heic|heif)$/i.test(file.name)) {
        dropPreview.hidden = true;   // converted to JPG on the server after upload
    } else {
        dropPreview.src = URL.createObjectURL(file);
        dropPreview.hidden = false;
    }
}

// clicking the box opens the file picker by itself, because the box is a <label for="picture">
pictureInput.addEventListener('change', showChosenFile);

// highlight while a file is dragged over the box
['dragenter', 'dragover'].forEach((type) => dropZone.addEventListener(type, (e) => {
    e.preventDefault();   // without this the browser opens the file instead of dropping it
    dropZone.classList.add('dragging');
}));
['dragleave', 'drop'].forEach((type) => dropZone.addEventListener(type, () => {
    dropZone.classList.remove('dragging');
}));

// dropping a file puts it into the hidden file input, so FormData sends it like a normal pick
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!isImageFile(file)) {
        showMessage(message, 'Picture must be an image file', 'error');
        return;
    }

    const transfer = new DataTransfer();
    transfer.items.add(file);
    pictureInput.files = transfer.files;
    showMessage(message, '', '');
    showChosenFile();
});

// stop the browser opening a file that's dropped just outside the box
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

if (editingId) loadCreatorForEdit();