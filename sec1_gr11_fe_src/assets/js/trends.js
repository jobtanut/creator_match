const API = 'http://localhost:3030';
const CACHE_KEY = 'trends-cache';
const CACHE_MINUTES = 30;      // reuse results for 30 min so refreshing doesn't call the API again

// category -> label shown on the tile + tile colour
const CATEGORIES = [
    { id: 'general',       label: 'Top Stories',   color: '#716A75' },
    { id: 'entertainment', label: 'Entertainment', color: '#9B6883' },
    { id: 'sports',        label: 'Sports',        color: '#76658D' },
    { id: 'technology',    label: 'Technology',    color: '#4F6D7A' },
    { id: 'business',      label: 'Business',      color: '#6B7F5E' },
];

let allArticles = [];
let activeFilter = 'all';

function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
}

const safeUrl = (url) => (/^https?:\/\//i.test(url || '') ? url : '');

// Asks our web service for one category (the WS calls NewsAPI)
async function fetchCategory(category) {
    const res = await fetch(`${API}/trends?category=${category.id}`);
    const data = await res.json();
    if (data.error) throw new Error(data.message);
    return data.data.map((a) => ({ ...a, category: category.id }));
}

function readCache() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
        if (cached && Date.now() - cached.time < CACHE_MINUTES * 60 * 1000) return cached.articles;
    } catch (err) { /* no cache or storage blocked */ }
    return null;
}

function writeCache(articles) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), articles }));
    } catch (err) { /* storage blocked, just skip caching */ }
}

function timeAgo(dateText) {
    const minutes = Math.floor((Date.now() - new Date(dateText)) / 60000);
    if (!(minutes >= 0)) return '';
    if (minutes < 60) return minutes + ' min ago';
    if (minutes < 1440) return Math.floor(minutes / 60) + ' hr ago';
    return Math.floor(minutes / 1440) + ' days ago';
}

function renderTiles() {
    const grid = document.getElementById('trendGrid');
    const shown = activeFilter === 'all'
        ? allArticles
        : allArticles.filter((a) => a.category === activeFilter);

    if (shown.length === 0) {
        grid.innerHTML = '<p>No headlines yet</p>';
        return;
    }

    grid.innerHTML = shown.map((a, i) => {
        const cat = CATEGORIES.find((c) => c.id === a.category);
        // first tile is big, every 5th after that is wide: gives the mosaic look
        const size = i === 0 ? 'tile-big' : (i % 5 === 3 ? 'tile-wide' : '');
        const image = safeUrl(a.image);
        return `
        <a class="trend-tile ${size}" href="${escapeHtml(safeUrl(a.url))}" target="_blank" rel="noopener"
           style="--tint: ${cat.color}; ${image ? `background-image: url('${escapeHtml(image)}');` : ''}">
            <span class="trend-tag">${escapeHtml(cat.label)}</span>
            <div class="trend-text">
                <h3>${escapeHtml(a.title)}</h3>
                <p>${escapeHtml(a.source)} · ${escapeHtml(timeAgo(a.publishedAt))}</p>
            </div>
        </a>`;
    }).join('');
}

function buildFilters() {
    const bar = document.getElementById('trendFilters');
    const buttons = [{ id: 'all', label: 'All' }, ...CATEGORIES];

    bar.innerHTML = buttons.map((b) =>
        `<button type="button" class="filter-button${b.id === activeFilter ? ' active' : ''}" data-id="${b.id}">${b.label}</button>`
    ).join('');

    bar.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
            activeFilter = btn.dataset.id;
            buildFilters();
            renderTiles();
        });
    });
}

async function loadTrends() {
    const status = document.getElementById('trendStatus');
    buildFilters();

    const cached = readCache();
    if (cached) {
        allArticles = cached;
        renderTiles();
        return;
    }

    try {
        const seen = new Set();
        for (const category of CATEGORIES) {
            status.textContent = `Loading ${category.label}...`;
            const articles = await fetchCategory(category);

            // the same story can appear under two categories, keep it once
            articles.forEach((a) => {
                if (!seen.has(a.url)) {
                    seen.add(a.url);
                    allArticles.push(a);
                }
            });
            renderTiles();                 // show tiles as each category arrives
        }
        status.textContent = '';
        writeCache(allArticles);
    } catch (err) {
        console.error(err);
        status.textContent = err.message;
        if (allArticles.length === 0) document.getElementById('trendGrid').innerHTML = '';
    }
}

loadTrends();