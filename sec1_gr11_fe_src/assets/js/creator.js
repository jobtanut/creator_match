const API = 'http://localhost:3030';

async function loadCreator() {
    const id = new URLSearchParams(window.location.search).get('id');
    const name = document.getElementById('creatorName');

    if (!id) {
        name.textContent = 'Creator not found';
        return;
    }

    try {
        const res = await fetch(`${API}/creators/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.message);

        const c = data.data;

        if (c.Status !== 'Active') {
            name.textContent = 'This creator is no longer available';
            return;
        }

        document.title = `CreatorMatch - ${c.creator_name}`;
        name.textContent = c.creator_name;
        document.getElementById('creatorRealName').textContent =
            [c.c_first_name, c.c_last_name].filter(Boolean).join(' ');
        document.getElementById('creatorCategory').textContent = c.category;
        document.getElementById('creatorPlatforms').textContent = c.platforms || '-';
        document.getElementById('creatorDescription').textContent = c.Description || 'No description yet.';

        const img = document.getElementById('creatorPicture');
        if (c.creator_picture_Link) img.src = c.creator_picture_Link;
        img.alt = `${c.creator_name} profile`;
    } catch (err) {
        name.textContent = 'Creator not found';
    }
}

loadCreator();