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
            clearPictureButton.hidden = false;
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

    const body = new FormData(form); 

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
const clearPictureButton = document.getElementById('clearPictureButton');
const removePictureInput = document.getElementById('remove_picture');

// Clear Picture
function clearPicture() {
    pictureInput.value = '';
    dropPreview.hidden = true;
    dropPreview.removeAttribute('src');
    dropText.textContent = 'No picture. Drag and drop a picture here, or click to choose';
    removePictureInput.value = editingId ? '1' : '0';
    clearPictureButton.hidden = true;
}

clearPictureButton.addEventListener('click', clearPicture);

const isImageFile = (file) =>
    file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name);


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

// clicking the box opens the file picker by itself
pictureInput.addEventListener('change', showChosenFile);

// highlight while a file is dragged over the box
['dragenter', 'dragover'].forEach((type) => dropZone.addEventListener(type, (e) => {
    e.preventDefault();
    dropZone.classList.add('dragging');
}));
['dragleave', 'drop'].forEach((type) => dropZone.addEventListener(type, () => {
    dropZone.classList.remove('dragging');
}));

// dropping a file puts it into the hidden file input
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!isImageFile(file)) {
        showMessage(message, 'Picture must be an image file', 'error');
        return;
    }

    showChosenFile(file); 
    showMessage(message, '', '');

    // put the file into the hidden input so FormData uploads it
    try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        pictureInput.files = transfer.files;
    } catch (err) {
        showMessage(message, 'Your browser could not attach the dropped file, click the box to choose it instead', 'error');
    }   
});

// stop the browser opening a file that's dropped just outside the box
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

if (editingId) loadCreatorForEdit();