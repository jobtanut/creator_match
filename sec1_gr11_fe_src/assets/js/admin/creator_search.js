const rows = document.getElementById('creatorRows');
const listMessage = document.getElementById('listMessage');
const searchForm = document.getElementById('creatorSearchForm');

let creators = [];   // last list loaded from the server

// Reads the search form into ?name=...&category=...&status=...&platform=...
function searchQuery() {
    const params = new URLSearchParams();
    const fields = { name: 'searchName', category: 'searchCategory', status: 'searchStatus', platform: 'searchPlatform' };
    for (const [key, id] of Object.entries(fields)) {
        const value = document.getElementById(id).value.trim();
        if (value) params.append(key, value);
    }
    return params;
}

// Search / list
async function loadCreators() {
    try {
        const data = await api('GET', `/creators?${searchQuery()}`);
        creators = data.data;
        document.getElementById('creatorListTitle').textContent = `Creator List (${creators.length})`;
        renderTable();
    } catch (err) {
        rows.innerHTML = `<tr><td colspan="8">${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderTable() {
    if (creators.length === 0) {
        rows.innerHTML = '<tr><td colspan="8">No creators match your search</td></tr>';
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
                <a class="action-button" href="/admin/creatormanage?id=${encodeURIComponent(c.creatorID)}">Edit</a>
                <button class="action-button" onclick="deleteCreator('${c.creatorID}')">Delete</button>
            </td>
        </tr>`).join('');
}

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loadCreators();
});

document.getElementById('searchClear').addEventListener('click', () => {
    searchForm.reset();
    loadCreators();
});

// Delete
async function deleteCreator(id) {
    const c = creators.find((x) => x.creatorID === id);
    if (!confirm(`Delete ${c ? c.creator_name : id}? This removes the creator, their platforms and edit history, and cannot be undone.`)) return;

    try {
        await api('DELETE', `/creators/${id}`);
        showMessage(listMessage, 'Creator deleted', 'success');
        loadCreators();
    } catch (err) {
        showMessage(listMessage, err.message, 'error');
    }
}

showFlashMessage(listMessage);
loadCreators();