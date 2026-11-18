// home.js: loads 6 featured creators into the home page
const API = 'http://localhost:3030';

function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
}

async function loadFeatured() {
    const list = document.getElementById('featuredList');

    try {
        const res = await fetch(`${API}/creators/featured`);
        const data = await res.json();
        if (data.error) throw new Error(data.message);

        if (data.data.length === 0) {
            list.innerHTML = '<p>No creators yet</p>';
            return;
        }

        list.innerHTML = data.data.map((c) => `
            <article class="card">
                <img src="${escapeHtml(c.creator_picture_Link || "/pics/blank_profile.svg")}"
                     alt="${escapeHtml(c.creator_name)} profile">
                <h3>${escapeHtml(c.creator_name)}</h3>
                <p>${escapeHtml(c.category)} Creator</p>
                <p class="small-text">${escapeHtml(c.platforms || '')}</p>
                <p class="Small-text">${Number(c.followers).toLocaleString()} Followers</p>
                <a class="button" href="/creator?id=${encodeURIComponent(c.creatorID)}">View Detail</a>
            </article>`).join('');
    } catch (err) {
        list.innerHTML = '<p>Could not load creators</p>';
    }
}

loadFeatured();