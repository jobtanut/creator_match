// team.js: About Us page. Loads every team member from the web service (GET /team).
const API = 'http://localhost:3030';

function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
}

// Only allow real web links, so a bad value in the database can't become a javascript: link
const safeUrl = (url) => (/^https?:\/\//i.test(url || '') ? url : '');

async function loadTeam() {
    const list = document.getElementById('teamList');

    try {
        const res = await fetch(`${API}/team`);
        const data = await res.json();
        if (data.error) throw new Error(data.message);

        if (data.data.length === 0) {
            list.innerHTML = '<p>No team members yet</p>';
            return;
        }

        list.innerHTML = data.data.map((m) => {
            const name = `${m.t_first_name} ${m.t_last_name}`;
            const link = safeUrl(m.social_link);
            return `
            <article class="team-card">
                <figure>
                    <img src="${escapeHtml(m.member_picture_link || 'https://placehold.co/300x300')}"
                         alt="${escapeHtml(name)}">
                    <figcaption><h3>${escapeHtml(name)}</h3></figcaption>
                </figure>
                <p>${escapeHtml(m.student_id || '')}</p>
                <p>Section 1</p>
                <p>${escapeHtml(m.position)}</p>
                ${link ? `<a class="button" href="${escapeHtml(link)}" target="_blank" rel="noopener">Social Media</a>` : ''}
            </article>`;
        }).join('');
    } catch (err) {
        list.innerHTML = '<p>Could not load the team</p>';
    }
}

loadTeam();