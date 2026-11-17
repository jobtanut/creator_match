const API = 'http://localhost:3030';

const form = document.getElementById('searchForm');
const results = document.getElementById('results');
const title = document.getElementById('resultTitle');

const minInput = document.getElementById('minFollowers');
const maxInput = document.getElementById('maxFollowers');
const minSlider = document.getElementById('minSlider');
const maxSlider = document.getElementById('maxSlider');

// The slider runs from the lowest to the highest follower count in the database.
// These are filled in by loadFollowerRange() when the page opens.
let SLIDER_MIN = 0;
let SLIDER_MAX = 1000000;

function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
}

// ------------------ FOLLOWER RANGE ------------------
// Boxes and slider always show the same range. Empty Min = no minimum, empty Max = no limit.

// Asks the backend for the lowest and highest follower counts and sizes the slider to match
async function loadFollowerRange() {
    try {
        const res = await fetch(`${API}/creators/follower-range`);
        const data = await res.json();
        if (data.error) throw new Error(data.message);

        SLIDER_MIN = data.min;
        SLIDER_MAX = Math.max(data.max, data.min + 1);   // a slider needs at least 2 positions
    } catch (err) {
        // keep the default 0 - 1,000,000 if the range can't be loaded
    }

    for (const slider of [minSlider, maxSlider]) {
        slider.min = SLIDER_MIN;
        slider.max = SLIDER_MAX;
        slider.step = 1;
    }
    // the numbers at each end show the real range until you type your own
    minInput.placeholder = SLIDER_MIN;
    maxInput.placeholder = SLIDER_MAX;
}

function readRange() {
    const min = minInput.value === '' ? 0 : Math.max(0, Math.floor(Number(minInput.value)));
    const max = maxInput.value === '' ? null : Math.max(0, Math.floor(Number(maxInput.value)));
    return { min, max };
}

// dragging a handle writes into the matching box
minSlider.addEventListener('input', () => {
    // don't let the min handle pass the max handle
    if (Number(minSlider.value) > Number(maxSlider.value)) minSlider.value = maxSlider.value;
    minInput.value = Number(minSlider.value) <= SLIDER_MIN ? '' : minSlider.value;
});

maxSlider.addEventListener('input', () => {
    if (Number(maxSlider.value) < Number(minSlider.value)) maxSlider.value = minSlider.value;
    maxInput.value = Number(maxSlider.value) >= SLIDER_MAX ? '' : maxSlider.value;
});

// typing in a box moves the matching handle (numbers outside the data range park it at that end)
const clamp = (n) => Math.min(Math.max(n, SLIDER_MIN), SLIDER_MAX);

function syncSlidersFromInputs() {
    const { min, max } = readRange();
    minSlider.value = clamp(min);
    maxSlider.value = max === null ? SLIDER_MAX : clamp(max);
}
minInput.addEventListener('input', syncSlidersFromInputs);
maxInput.addEventListener('input', syncSlidersFromInputs);

// ------------------ SEARCH ------------------

// Read the form into ?name=...&category=...&platform=...&min_followers=...&max_followers=...
function buildQuery() {
    const params = new URLSearchParams();

    const name = document.getElementById('creatorName').value.trim();
    const category = document.getElementById('category').value;
    const { min, max } = readRange();

    if (name) params.append('name', name);
    if (category) params.append('category', category);
    document.querySelectorAll('input[name="platform"]:checked')
        .forEach((box) => params.append('platform', box.value));
    if (min > 0) params.append('min_followers', min);
    if (max !== null) params.append('max_followers', max);

    return params;
}

// Put values from the page URL back into the form (used for the home page search bar)
function fillFormFromUrl() {
    const params = new URLSearchParams(window.location.search);

    document.getElementById('creatorName').value = params.get('name') || '';
    document.getElementById('category').value = params.get('category') || '';
    minInput.value = params.get('min_followers') || '';
    maxInput.value = params.get('max_followers') || '';

    const ticked = params.getAll('platform');
    document.querySelectorAll('input[name="platform"]')
        .forEach((box) => { box.checked = ticked.includes(box.value); });

    syncSlidersFromInputs();
}

async function searchCreators() {
    const { min, max } = readRange();
    if (max !== null && min > max) {
        results.innerHTML = '<p>Min followers cannot be more than Max.</p>';
        return;
    }

    const params = buildQuery();
    results.innerHTML = '<p>Searching...</p>';

    // keep the filters in the address bar, so refresh and Back keep the same results
    history.replaceState(null, '', `/search${params.toString() ? '?' + params : ''}`);

    try {
        const res = await fetch(`${API}/creators/search?${params}`);
        const data = await res.json();
        if (data.error) throw new Error(data.message);

        title.textContent = `Search Results (${data.count})`;

        if (data.count === 0) {
            results.innerHTML = '<p>No creators match your search.</p>';
            return;
        }

        results.innerHTML = data.data.map((c) => `
            <article class="card creator-card">
                <img src="${escapeHtml(c.creator_picture_Link || 'https://placehold.co/300x300')}"
                     alt="${escapeHtml(c.creator_name)} profile">
                <h3>${escapeHtml(c.creator_name)}</h3>
                <p>${escapeHtml(c.category)}</p>
                <p>${Number(c.followers).toLocaleString()} followers</p>
                <p class="small-text">${escapeHtml(c.platforms || '-')}</p>
                <a class="button" href="/creator?id=${encodeURIComponent(c.creatorID)}">View Detail</a>
            </article>`).join('');
    } catch (err) {
        results.innerHTML = `<p>${escapeHtml(err.message || 'Could not load creators.')}</p>`;
    }
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    searchCreators();
});

// Clear: reset every filter and show all creators again
document.getElementById('clearButton').addEventListener('click', () => {
    form.reset();
    syncSlidersFromInputs();
    searchCreators();
});

// size the slider from the database first, then apply any filters from the URL and search
loadFollowerRange().then(() => {
    fillFormFromUrl();
    searchCreators();
});