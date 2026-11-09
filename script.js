
/* =========================================
   WORKDESK DASHBOARD
   Quick Links, Work Cards, Spiels & Settings
========================================= */

const STORAGE_KEY = 'workdesk_dashboard_v1';


/* =========================================
   DEFAULT DATA
========================================= */

const starter = {
    settings: {
        brand: 'WorkDesk',
        welcome: 'Good day, welcome back.'
    },

    links: [
        {
            id: 'l1',
            title: 'Wetracked.io',
            url: 'https://wetracked.io',
            icon: '🌐',
            description: 'Tracking and merchant workspace',
            category: 'Work'
        },
        {
            id: 'l2',
            title: 'Slack',
            url: 'https://slack.com',
            icon: '💬',
            description: 'Team communication',
            category: 'Work'
        },
        {
            id: 'l3',
            title: 'HubSpot',
            url: 'https://app.hubspot.com',
            icon: '🧡',
            description: 'CRM and customer support',
            category: 'Work'
        },
        {
            id: 'l4',
            title: 'Gmail',
            url: 'https://mail.google.com',
            icon: '✉️',
            description: 'Email inbox',
            category: 'Work'
        },
        {
            id: 'l5',
            title: 'Shopify',
            url: 'https://admin.shopify.com',
            icon: '🛍️',
            description: 'Store administration',
            category: 'Work'
        },
        {
            id: 'l6',
            title: 'ChatGPT',
            url: 'https://chatgpt.com',
            icon: '✨',
            description: 'AI assistant',
            category: 'Tools'
        }
    ],

    cards: [
        {
            id: 'c1',
            title: 'Support notes',
            category: 'Notes',
            content: 'Add your common work notes here. Click Edit to customize this card.',
            updated: Date.now()
        },
        {
            id: 'c2',
            title: 'Merchant follow-up template',
            category: 'Templates',
            content: 'Hi there, just following up on this. Please let me know if you need any further assistance.',
            updated: Date.now()
        }
    ],

    spiels: []
};


/* =========================================
   LOAD DATA
========================================= */

function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (saved && saved.links && saved.cards) {
            if (!Array.isArray(saved.spiels)) {
                saved.spiels = [];
            }

            if (!saved.settings) {
                saved.settings = structuredClone(starter.settings);
            }

            return saved;
        }

        return structuredClone(starter);

    } catch (error) {
        console.error('Unable to load WorkDesk data:', error);
        return structuredClone(starter);
    }
}


let data = loadData();

let editLinkId = null;
let editCardId = null;
let editSpielId = null;


/* =========================================
   SAVE DATA
========================================= */

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        renderAll();

        toast('Saved automatically ✓');

    } catch (error) {
        toast('Save failed: browser storage may be full');
        console.error('WorkDesk storage error:', error);
    }
}


/* =========================================
   GENERAL HELPERS
========================================= */

function uid() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8);
}


function toast(message) {
    const el = document.getElementById('toast');

    if (!el) return;

    el.textContent = message;
    el.classList.add('show');

    setTimeout(() => {
        el.classList.remove('show');
    }, 1800);
}


function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[character]));
}


function safeURL(url) {
    url = (url || '').trim();

    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    try {
        const parsedURL = new URL(url);

        return ['http:', 'https:'].includes(parsedURL.protocol)
            ? parsedURL.href
            : null;

    } catch {
        return null;
    }
}


/* =========================================
   PAGE NAVIGATION
========================================= */

function goPage(page) {
    document.querySelectorAll('.page').forEach(element => {
        element.classList.remove('active');
    });

    const targetPage = document.getElementById('page-' + page);

    if (targetPage) {
        targetPage.classList.add('active');
    }

    document.querySelectorAll('.nav button').forEach(button => {
        button.classList.toggle(
            'active',
            button.dataset.page === page
        );
    });

    if (page === 'links') {
        renderLinks();
    }

    if (page === 'cards') {
        renderCards();
    }

    if (page === 'notes' && typeof renderNotes === 'function') {
        renderNotes();
    }
}


document.querySelectorAll('.nav button').forEach(button => {
    button.addEventListener('click', () => {
        goPage(button.dataset.page);
    });
});


/* =========================================
   QUICK LINKS
========================================= */

function linkHTML(link) {
    return `
        <div class="link-card">

            <div class="link-top">

                <div class="link-icon">
                    ${escapeHTML(link.icon || '🔗')}
                </div>

                <div>
                    <div class="link-title">
                        ${escapeHTML(link.title)}
                    </div>

                    <div class="link-desc">
                        ${escapeHTML(link.description || link.category || 'Quick link')}
                    </div>
                </div>

            </div>

            <div class="link-actions">

                <button
                    class="open-link"
                    onclick="openExternal('${escapeHTML(link.id)}')"
                >
                    Open ↗
                </button>

                <div class="mini-actions">

                    <button onclick="editLink('${escapeHTML(link.id)}')">
                        Edit
                    </button>

                    <button
                        class="danger"
                        onclick="deleteLink('${escapeHTML(link.id)}')"
                    >
                        Delete
                    </button>

                </div>

            </div>

        </div>
    `;
}


function renderLinks() {
    const dashboard = document.getElementById('dashboardLinks');

    if (dashboard) {
        dashboard.innerHTML =
            data.links.slice(0, 8).map(linkHTML).join('') ||
            '<div class="empty">Add a quick link to get started.</div>';
    }

    const page = document.getElementById('page-links');

    if (!page || !page.classList.contains('active')) {
        return;
    }

    const search = (
        document.getElementById('linkSearch')?.value || ''
    ).toLowerCase();

    const filteredLinks = data.links.filter(link => {
        const searchableText =
            link.title + ' ' +
            link.description + ' ' +
            link.category;

        return searchableText.toLowerCase().includes(search);
    });

    const allLinks = document.getElementById('allLinks');

    if (allLinks) {
        allLinks.innerHTML = filteredLinks.length
            ? filteredLinks.map(linkHTML).join('')
            : '<div class="empty">No links found. Add your first shortcut.</div>';
    }
}


function openExternal(id) {
    const link = data.links.find(item => item.id === id);

    if (!link) return;

    const url = safeURL(link.url);

    if (!url) {
        toast('Please edit this link: invalid URL');
        return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
}


function openLinkModal(id = null) {
    editLinkId = id;

    const link = data.links.find(item => item.id === id) || {
        title: '',
        url: '',
        icon: '🔗',
        description: '',
        category: 'Work'
    };

    showModal(
        id ? 'Edit quick link' : 'Add quick link',

        `
            <div class="form-grid">

                <div class="field">
                    <label>Link name *</label>
                    <input
                        id="fTitle"
                        value="${escapeHTML(link.title)}"
                        required
                    >
                </div>

                <div class="field">
                    <label>URL *</label>
                    <input
                        id="fURL"
                        value="${escapeHTML(link.url)}"
                        placeholder="https://example.com"
                        required
                    >
                </div>

                <div class="field">
                    <label>Icon / emoji</label>
                    <input
                        id="fIcon"
                        value="${escapeHTML(link.icon)}"
                        maxlength="8"
                    >
                </div>

                <div class="field">
                    <label>Description</label>
                    <input
                        id="fDesc"
                        value="${escapeHTML(link.description || '')}"
                    >
                </div>

                <div class="field">
                    <label>Category</label>
                    <input
                        id="fCat"
                        value="${escapeHTML(link.category || 'Work')}"
                    >
                </div>

            </div>
        `,

        () => {
            const title = document.getElementById('fTitle').value.trim();
            const url = safeURL(document.getElementById('fURL').value);

            if (!title || !url) {
                toast('Enter a name and valid URL');
                return;
            }

            const item = {
                id: id || uid(),
                title,
                url,
                icon: document.getElementById('fIcon').value || '🔗',
                description: document.getElementById('fDesc').value,
                category: document.getElementById('fCat').value
            };

            if (id) {
                data.links = data.links.map(existing =>
                    existing.id === id ? item : existing
                );
            } else {
                data.links.unshift(item);
            }

            closeModal();
            saveData();
        }
    );
}


function editLink(id) {
    openLinkModal(id);
}


function deleteLink(id) {
    if (confirm('Delete this quick link?')) {
        data.links = data.links.filter(item => item.id !== id);
        saveData();
    }
}


/* =========================================
   WORK CARDS
========================================= */

function cardHTML(card) {
    return `
        <div class="info-card">

            <div class="card-title-row">

                <div class="card-title">
                    ${escapeHTML(card.title)}
                </div>

                <span class="tag">
                    ${escapeHTML(card.category || 'General')}
                </span>

            </div>

            <div class="card-content">
                ${escapeHTML(card.content || '')}
            </div>

            <div class="card-footer">

                <button onclick="copyCard('${escapeHTML(card.id)}')">
                    Copy
                </button>

                <button onclick="editCard('${escapeHTML(card.id)}')">
                    Edit
                </button>

                <button
                    class="danger"
                    onclick="deleteCard('${escapeHTML(card.id)}')"
                >
                    Delete
                </button>

            </div>

        </div>
    `;
}


function renderCards() {
    const dashboard = document.getElementById('dashboardCards');

    if (dashboard) {
        dashboard.innerHTML =
            data.cards.slice(0, 4).map(cardHTML).join('') ||
            '<div class="empty">No saved cards yet.</div>';
    }

    const page = document.getElementById('page-cards');

    if (!page || !page.classList.contains('active')) {
        return;
    }

    const search = (
        document.getElementById('cardSearch')?.value || ''
    ).toLowerCase();

    const category =
        document.getElementById('cardCategory')?.value || '';

    const filteredCards = data.cards.filter(card => {
        const searchableText =
            card.title + ' ' +
            card.content + ' ' +
            card.category;

        return searchableText.toLowerCase().includes(search) &&
            (!category || card.category === category);
    });

    const allCards = document.getElementById('allCards');

    if (allCards) {
        allCards.innerHTML = filteredCards.length
            ? filteredCards.map(cardHTML).join('')
            : '<div class="empty">No cards found. Create a work card.</div>';
    }

    const select = document.getElementById('cardCategory');

    if (select) {
        const oldValue = select.value;

        const categories = [
            ...new Set(data.cards.map(card => card.category || 'General'))
        ];

        select.innerHTML =
            '<option value="">All categories</option>' +
            categories.map(categoryName =>
                `<option value="${escapeHTML(categoryName)}">${escapeHTML(categoryName)}</option>`
            ).join('');

        select.value = categories.includes(oldValue) ? oldValue : '';
    }
}


function openCardModal(id = null) {
    editCardId = id;

    const card = data.cards.find(item => item.id === id) || {
        title: '',
        category: 'Notes',
        content: ''
    };

    showModal(
        id ? 'Edit work card' : 'New work card',

        `
            <div class="form-grid">

                <div class="field">
                    <label>Card title *</label>
                    <input
                        id="fTitle"
                        value="${escapeHTML(card.title)}"
                        required
                    >
                </div>

                <div class="field">
                    <label>Category</label>
                    <input
                        id="fCat"
                        value="${escapeHTML(card.category || 'Notes')}"
                    >
                </div>

                <div class="field">
                    <label>Information / notes *</label>
                    <textarea id="fContent" rows="8">${escapeHTML(card.content || '')}</textarea>
                </div>

            </div>
        `,

        () => {
            const title = document.getElementById('fTitle').value.trim();
            const content = document.getElementById('fContent').value;

            if (!title) {
                toast('Enter a card title');
                return;
            }

            const item = {
                id: id || uid(),
                title,
                category: document.getElementById('fCat').value.trim() || 'General',
                content,
                updated: Date.now()
            };

            if (id) {
                data.cards = data.cards.map(existing =>
                    existing.id === id ? item : existing
                );
            } else {
                data.cards.unshift(item);
            }

            closeModal();
            saveData();
        }
    );
}


function editCard(id) {
    openCardModal(id);
}


function deleteCard(id) {
    if (confirm('Delete this work card?')) {
        data.cards = data.cards.filter(item => item.id !== id);
        saveData();
    }
}


async function copyCard(id) {
    const card = data.cards.find(item => item.id === id);

    if (!card) return;

    try {
        await navigator.clipboard.writeText(card.content);
        toast('Card content copied');

    } catch {
        toast('Clipboard unavailable; select and copy the text manually');
    }
}


/* =========================================
   SPIELS LIBRARY
   Three cards per row
   Click card to copy
   Pencil button to edit
========================================= */

function renderSpiels() {
    const grid = document.getElementById('spielsGrid');

    if (!grid) return;

    if (!Array.isArray(data.spiels)) {
        data.spiels = [];
    }

    if (data.spiels.length === 0) {
        grid.innerHTML = `
            <div class="spiel-empty">
                <strong>No spiels yet</strong>
                <p>Add your first customer support spiel.</p>
            </div>
        `;

        return;
    }

    grid.innerHTML = data.spiels.map(spiel => `
        <article
            class="spiel-card"
            data-spiel-card="${escapeHTML(spiel.id)}"
            tabindex="0"
            role="button"
            aria-label="Copy ${escapeHTML(spiel.title)}"
            title="Click to copy spiel"
        >

            <div class="spiel-title">
                ${escapeHTML(spiel.title)}
            </div>

            <button
                type="button"
                class="spiel-edit-btn"
                data-edit-spiel="${escapeHTML(spiel.id)}"
                title="Edit spiel"
                aria-label="Edit ${escapeHTML(spiel.title)}"
            >
                ✎
            </button>

        </article>
    `).join('');
}


/* OPEN ADD / EDIT MODAL */

function openSpielModal(id = null) {
    editSpielId = id;

    const spiel = data.spiels.find(item => item.id === id) || {
        title: '',
        content: ''
    };

    document.getElementById('spielModalTitle').textContent =
        id ? 'Edit Spiel' : 'Add New Spiel';

    document.getElementById('spielTitle').value = spiel.title;
    document.getElementById('spielContent').value = spiel.content;

    document.getElementById('spielModalBackdrop').classList.add('show');

    setTimeout(() => {
        document.getElementById('spielTitle').focus();
    }, 50);
}


/* CLOSE MODAL */

function closeSpielModal() {
    const backdrop = document.getElementById('spielModalBackdrop');

    if (backdrop) {
        backdrop.classList.remove('show');
    }

    editSpielId = null;
}


/* SAVE SPIEL */

function saveSpiel() {
    const title = document.getElementById('spielTitle').value.trim();
    const content = document.getElementById('spielContent').value.trim();

    if (!title) {
        toast('Please enter a spiel title.');
        document.getElementById('spielTitle').focus();
        return;
    }

    if (!content) {
        toast('Please enter the spiel content.');
        document.getElementById('spielContent').focus();
        return;
    }

    const now = Date.now();

    if (editSpielId) {
        data.spiels = data.spiels.map(spiel =>
            spiel.id === editSpielId
                ? {
                    ...spiel,
                    title,
                    content,
                    updated: now
                }
                : spiel
        );

    } else {
        data.spiels.unshift({
            id: uid(),
            title,
            content,
            created: now,
            updated: now
        });
    }

    closeSpielModal();
    saveData();

    toast('Spiel saved successfully!');
}


/* EDIT SPIEL */

function editSpiel(id) {
    openSpielModal(id);
}


/* COPY SPIEL */

async function copySpiel(id) {
    const spiel = data.spiels.find(item => item.id === id);

    if (!spiel) return;

    try {
        await navigator.clipboard.writeText(spiel.content);

        toast('Spiel copied successfully! ✓');

    } catch (error) {
        // Fallback for browsers where Clipboard API is unavailable.

        const textarea = document.createElement('textarea');

        textarea.value = spiel.content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';

        document.body.appendChild(textarea);

        textarea.select();

        const copied = document.execCommand('copy');

        textarea.remove();

        toast(
            copied
                ? 'Spiel copied successfully! ✓'
                : 'Unable to copy spiel.'
        );
    }
}


/* SPIEL CARD EVENTS */

function initializeSpielEvents() {
    const grid = document.getElementById('spielsGrid');

    if (!grid || grid.dataset.spielsBound === 'true') {
        return;
    }

    grid.dataset.spielsBound = 'true';

    // Clicking the pencil edits the spiel.
    // Clicking anywhere else on the card copies it.

    grid.addEventListener('click', event => {
        const editButton = event.target.closest('[data-edit-spiel]');

        if (editButton) {
            event.stopPropagation();

            editSpiel(editButton.dataset.editSpiel);
            return;
        }

        const card = event.target.closest('[data-spiel-card]');

        if (card && grid.contains(card)) {
            copySpiel(card.dataset.spielCard);
        }
    });

    // Keyboard support: Enter or Space copies the card.

    grid.addEventListener('keydown', event => {
        const card = event.target.closest('[data-spiel-card]');

        if (!card || event.target !== card) return;

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            copySpiel(card.dataset.spielCard);
        }
    });
}


/* CLOSE SPIEL MODAL WHEN CLICKING OUTSIDE */

document.getElementById('spielModalBackdrop')?.addEventListener('click', function(event) {
    if (event.target === this) {
        closeSpielModal();
    }
});


/* =========================================
   GENERAL DASHBOARD MODAL
========================================= */

function showModal(title, body, onSave) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;

    document.getElementById('modalBackdrop').classList.add('show');

    document.getElementById('modalSave').onclick = onSave;
}


function closeModal() {
    document.getElementById('modalBackdrop').classList.remove('show');
}


/* =========================================
   SETTINGS
========================================= */

function saveSettings() {
    data.settings = {
        brand: document.getElementById('settingBrand').value.trim() || 'WorkDesk',
        welcome: document.getElementById('settingWelcome').value.trim() || 'Welcome back.'
    };

    saveData();
}


/* =========================================
   RENDER ALL DASHBOARD CONTENT
========================================= */

function renderAll() {
    const brandName = document.getElementById('brandName');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const settingBrand = document.getElementById('settingBrand');
    const settingWelcome = document.getElementById('settingWelcome');
    const linkCount = document.getElementById('linkCount');
    const cardCount = document.getElementById('cardCount');

    if (brandName) {
        brandName.textContent = data.settings.brand || 'WorkDesk';
    }

    if (welcomeTitle) {
        welcomeTitle.textContent = data.settings.welcome || 'Welcome back.';
    }

    if (settingBrand) {
        settingBrand.value = data.settings.brand || 'WorkDesk';
    }

    if (settingWelcome) {
        settingWelcome.value = data.settings.welcome || '';
    }

    if (linkCount) {
        linkCount.textContent = data.links.length;
    }

    if (cardCount) {
        cardCount.textContent = data.cards.length;
    }

    renderLinks();
    renderCards();
    renderSpiels();
}


/* =========================================
   EXPORT BACKUP
========================================= */

function exportData() {
    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: 'application/json' }
    );

    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);

    link.download =
        'workdesk-backup-' +
        new Date().toISOString().slice(0, 10) +
        '.json';

    link.click();

    URL.revokeObjectURL(link.href);

    toast('Backup exported');
}


/* =========================================
   IMPORT BACKUP
========================================= */

function importData(event) {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
        try {
            const importedData = JSON.parse(reader.result);

            if (
                !Array.isArray(importedData.links) ||
                !Array.isArray(importedData.cards) ||
                !importedData.settings
            ) {
                throw new Error('Invalid backup structure');
            }

            if (!Array.isArray(importedData.spiels)) {
                importedData.spiels = [];
            }

            if (confirm('Import this backup? It will replace the current dashboard data.')) {
                data = importedData;

                saveData();

                toast('Backup restored');
            }

        } catch (error) {
            alert('Invalid WorkDesk backup file.');
            console.error(error);

        }

        event.target.value = '';
    };

    reader.readAsText(file);
}


/* =========================================
   CLEAR DASHBOARD DATA
========================================= */

function clearData() {
    if (confirm('This will permanently remove all dashboard links, cards, and spiels from this browser. Continue?')) {

        localStorage.removeItem(STORAGE_KEY);

        data = {
            settings: {
                brand: 'WorkDesk',
                welcome: 'Good day, welcome back.'
            },

            links: [],
            cards: [],
            spiels: []
        };

        saveData();
    }
}


/* =========================================
   INITIALIZE DASHBOARD
========================================= */

initializeSpielEvents();

renderAll();
