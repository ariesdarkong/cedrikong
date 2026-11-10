/* =========================================
   WORKDESK - MAIN JAVASCRIPT
   Quick Links, Work Cards, My Spiels,
   Link Cleaner, Drag & Drop, Settings,
   Import & Export
========================================= */

const STORAGE_KEY = 'workdesk_dashboard_v1';

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
            content: 'Add your common work notes here.',
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
   DATA
========================================= */

function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (saved && saved.links && saved.cards) {
            saved.spiels = Array.isArray(saved.spiels)
                ? saved.spiels
                : [];

            saved.settings = saved.settings || starter.settings;

            return saved;
        }

        return structuredClone(starter);

    } catch (error) {
        return structuredClone(starter);
    }
}

let data = loadData();

let editLinkId = null;
let editCardId = null;
let editSpielId = null;

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        renderAll();
        toast('Saved automatically ✓');

    } catch (error) {
        toast('Save failed: browser storage may be full');
        console.error('WorkDesk storage error', error);
    }
}

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
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function safeURL(url) {
    url = (url || '').trim();

    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    try {
        const parsed = new URL(url);

        return ['http:', 'https:'].includes(parsed.protocol)
            ? parsed.href
            : null;

    } catch {
        return null;
    }
}


/* =========================================
   PAGE NAVIGATION
========================================= */

function goPage(page) {
    document.querySelectorAll('.page').forEach(el => {
        el.classList.remove('active');
    });

    const target = document.getElementById('page-' + page);

    if (target) {
        target.classList.add('active');
    }

    document.querySelectorAll('.nav button').forEach(button => {
        button.classList.toggle(
            'active',
            button.dataset.page === page
        );
    });

    if (page === 'links') renderLinks();
    if (page === 'cards') renderCards();
    if (page === 'spiels') renderSpiels();

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
        <div class="link-card"
             data-link-card="${escapeHTML(link.id)}"
             draggable="true">

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
                <button class="open-link"
                        onclick="openExternal('${escapeHTML(link.id)}')">
                    Open ↗
                </button>

                <div class="mini-actions">
                    <button onclick="editLink('${escapeHTML(link.id)}')">Edit</button>

                    <button class="danger"
                            onclick="deleteLink('${escapeHTML(link.id)}')">
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
        dashboard.innerHTML = data.links
            .slice(0, 8)
            .map(linkHTML)
            .join('') ||
            '<div class="empty">Add a quick link to get started.</div>';
    }

    const page = document.getElementById('page-links');

    if (!page || !page.classList.contains('active')) return;

    const search = (
        document.getElementById('linkSearch')?.value || ''
    ).toLowerCase();

    const filtered = data.links.filter(link => {
        return (
            (link.title + ' ' + link.description + ' ' + link.category)
                .toLowerCase()
                .includes(search)
        );
    });

    const container = document.getElementById('allLinks');

    if (container) {
        container.innerHTML = filtered.length
            ? filtered.map(linkHTML).join('')
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
                    <input id="fTitle" value="${escapeHTML(link.title)}" required>
                </div>

                <div class="field">
                    <label>URL *</label>
                    <input id="fURL" value="${escapeHTML(link.url)}"
                           placeholder="https://example.com" required>
                </div>

                <div class="field">
                    <label>Icon / emoji</label>
                    <input id="fIcon" value="${escapeHTML(link.icon)}" maxlength="8">
                </div>

                <div class="field">
                    <label>Description</label>
                    <input id="fDesc" value="${escapeHTML(link.description || '')}">
                </div>

                <div class="field">
                    <label>Category</label>
                    <input id="fCat" value="${escapeHTML(link.category || 'Work')}">
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
                data.links = data.links.map(old =>
                    old.id === id ? item : old
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
    if (!confirm('Delete this quick link?')) return;

    data.links = data.links.filter(item => item.id !== id);
    saveData();
}


/* =========================================
   LINK CLEANER
========================================= */

function extractCleanLinks(text) {
    const links = [];

    if (!text || !text.trim()) return links;

    // Extract Shopify domains from notification messages.
    const shopifyMatches = text.match(
        /[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com/gi
    );

    if (shopifyMatches) {
        shopifyMatches.forEach(domain => {
            links.push(domain.toLowerCase());
        });
    }

    // Extract regular URLs and www links.
    const urlMatches = text.match(
        /(?:https?:\/\/|www\.)[^\s<>"']+/gi
    );

    if (urlMatches) {
        urlMatches.forEach(foundURL => {
            let url = foundURL
                .replace(/^https?:\/\//i, '')
                .replace(/^[([{]+/, '')
                .replace(/[)\]},.!?;:]+$/, '')
                .replace(/^www\./i, '');

            if (url) {
                links.push(url);
            }
        });
    }

    // Extract plain domains that do not have a protocol.
    const plainDomainMatches = text.match(
        /(?:^|[\s([{])([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(?::\d+)?(?:\/[^\s<>"']*)?/gim
    );

    if (plainDomainMatches) {
        plainDomainMatches.forEach(found => {
            let url = found.trim()
                .replace(/^[([{]+/, '')
                .replace(/[)\]},.!?;:]+$/, '')
                .replace(/^www\./i, '');

            if (url && /\.[a-zA-Z]{2,}/.test(url)) {
                links.push(url);
            }
        });
    }

    // Remove duplicates and empty entries.
    return [...new Set(
        links.map(link => link.trim()).filter(Boolean)
    )];
}


/* =========================================
   GENERATE CLEAN LINKS
   ALWAYS REPLACES PREVIOUS RESULTS
========================================= */

function generateCleanLinks(options = {}) {
    const input = document.getElementById('linkCleanerInput');
    const output = document.getElementById('linkCleanerOutput');
    const status = document.getElementById('linkCleanerStatus');

    if (!input || !output) return;

    const pastedText = input.value.trim();

    if (!pastedText) return;

    // Extract only the links from the current input.
    const newLinks = extractCleanLinks(pastedText);

    // IMPORTANT:
    // Replace previous output instead of appending.
    output.value = newLinks.join('\n');

    if (newLinks.length > 0) {
        if (status) {
            status.textContent =
                newLinks.length +
                ' new link(s) generated. Click the box to copy.';
        }

        if (!options.silent) {
            toast('New clean links generated ✓');
        }

    } else {
        if (status) {
            status.textContent = 'No valid links found.';
        }

        if (!options.silent) {
            toast('No valid links found');
        }
    }

    // Clear the input after generating.
    input.value = '';

    // Focus the input again for the next paste.
    if (options.focus !== false) {
        input.focus();
    }
}


/* =========================================
   AUTOMATIC LINK CLEANER
   PASTE = GENERATE IMMEDIATELY
   TYPING = GENERATE AFTER PAUSE
========================================= */

function initializeLinkCleaner() {
    const input = document.getElementById('linkCleanerInput');
    const output = document.getElementById('linkCleanerOutput');

    if (input && input.dataset.autoCleanBound !== 'true') {
        input.dataset.autoCleanBound = 'true';

        // Automatically process pasted content.
        input.addEventListener('paste', () => {
            setTimeout(() => {
                if (input.value.trim()) {
                    generateCleanLinks({
                        silent: true,
                        focus: true
                    });
                }
            }, 0);
        });

        // Automatically process manually typed content.
        input.addEventListener('input', () => {
            if (input.dataset.autoCleanTimer) {
                clearTimeout(Number(input.dataset.autoCleanTimer));
            }

            const timer = setTimeout(() => {
                if (input.value.trim()) {
                    generateCleanLinks({
                        silent: true,
                        focus: false
                    });
                }

                delete input.dataset.autoCleanTimer;

            }, 1000);

            input.dataset.autoCleanTimer = String(timer);
        });
    }

    // Clicking anywhere inside the output copies all links.
    if (output && output.dataset.autoCopyBound !== 'true') {
        output.dataset.autoCopyBound = 'true';

        output.addEventListener('click', () => {
            copyCleanLinks();
        });

        output.style.cursor = 'pointer';
        output.style.textAlign = 'center';
        output.title = 'Click to copy all cleaned links';
    }
}


/* =========================================
   COPY ALL CLEANED LINKS
========================================= */

async function copyCleanLinks() {
    const output = document.getElementById('linkCleanerOutput');
    const status = document.getElementById('linkCleanerStatus');

    if (!output || !output.value.trim()) {
        toast('No cleaned links to copy');
        return;
    }

    const textToCopy = output.value;

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(textToCopy);

        } else {
            throw new Error('Clipboard API unavailable');
        }

        if (status) {
            status.textContent = 'All cleaned links copied successfully ✓';
        }

        toast('All cleaned links copied ✓');

    } catch (error) {
        // Fallback for browsers without Clipboard API access.
        output.focus();
        output.select();
        output.setSelectionRange(0, output.value.length);

        try {
            const copied = document.execCommand('copy');

            if (copied) {
                if (status) {
                    status.textContent = 'All cleaned links copied successfully ✓';
                }

                toast('All cleaned links copied ✓');

            } else {
                toast('Please copy the links manually');
            }

        } catch (fallbackError) {
            toast('Please copy the links manually');
        }
    }
}


/* =========================================
   CLEAR LINK CLEANER
========================================= */

function clearLinkCleaner() {
    const input = document.getElementById('linkCleanerInput');
    const output = document.getElementById('linkCleanerOutput');
    const status = document.getElementById('linkCleanerStatus');

    if (input) {
        input.value = '';

        if (input.dataset.autoCleanTimer) {
            clearTimeout(Number(input.dataset.autoCleanTimer));
            delete input.dataset.autoCleanTimer;
        }
    }

    if (output) {
        output.value = '';
    }

    if (status) {
        status.textContent = 'No links generated yet.';
    }

    if (input) {
        input.focus();
    }

    toast('Link cleaner cleared');
}


/* =========================================
   WORK CARDS
========================================= */

function cardHTML(card) {
    return `
        <div class="info-card"
             data-work-card="${escapeHTML(card.id)}"
             draggable="true">

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
                <button onclick="copyCard('${escapeHTML(card.id)}')">Copy</button>
                <button onclick="editCard('${escapeHTML(card.id)}')">Edit</button>

                <button class="danger"
                        onclick="deleteCard('${escapeHTML(card.id)}')">
                    Delete
                </button>
            </div>
        </div>
    `;
}

function renderCards() {
    const dashboard = document.getElementById('dashboardCards');

    if (dashboard) {
        dashboard.innerHTML = data.cards
            .slice(0, 4)
            .map(cardHTML)
            .join('') ||
            '<div class="empty">No saved cards yet.</div>';
    }

    const page = document.getElementById('page-cards');

    if (!page || !page.classList.contains('active')) return;

    const search = (
        document.getElementById('cardSearch')?.value || ''
    ).toLowerCase();

    const category = document.getElementById('cardCategory')?.value || '';

    const filtered = data.cards.filter(card => {
        const matchesSearch = (
            card.title + ' ' + card.content + ' ' + card.category
        ).toLowerCase().includes(search);

        return matchesSearch &&
            (!category || card.category === category);
    });

    const container = document.getElementById('allCards');

    if (container) {
        container.innerHTML = filtered.length
            ? filtered.map(cardHTML).join('')
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
            categories.map(category =>
                `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
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
                    <input id="fTitle" value="${escapeHTML(card.title)}" required>
                </div>

                <div class="field">
                    <label>Category</label>
                    <input id="fCat" value="${escapeHTML(card.category || 'Notes')}">
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
                data.cards = data.cards.map(old =>
                    old.id === id ? item : old
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
    if (!confirm('Delete this work card?')) return;

    data.cards = data.cards.filter(item => item.id !== id);
    saveData();
}

async function copyCard(id) {
    const card = data.cards.find(item => item.id === id);

    if (!card) return;

    try {
        await navigator.clipboard.writeText(card.content);
        toast('Card content copied');

    } catch {
        toast('Clipboard unavailable; select and copy manually');
    }
}


/* =========================================
   MY SPIELS
========================================= */

function renderSpiels() {
    const grid = document.getElementById('spielsGrid');

    if (!grid) return;

    grid.innerHTML = data.spiels.length
        ? data.spiels.map(spiel => `
            <div class="spiel-card"
                 data-spiel-card="${escapeHTML(spiel.id)}"
                 draggable="true"
                 tabindex="0"
                 role="button"
                 aria-label="Copy ${escapeHTML(spiel.title)}">

                <div class="spiel-card-content">
                    <div class="spiel-title">
                        ${escapeHTML(spiel.title)}
                    </div>
                </div>

                <div class="spiel-actions">
                    <button
                        type="button"
                        class="spiel-edit-btn"
                        data-edit-spiel="${escapeHTML(spiel.id)}"
                        title="Edit spiel"
                        aria-label="Edit ${escapeHTML(spiel.title)}">
                        ✏️
                    </button>
                </div>

            </div>
        `).join('')
        : '<div class="empty">No spiels yet. Add your first spiel.</div>';
}

function openSpielModal(id = null) {
    editSpielId = id;

    const spiel = data.spiels.find(item => item.id === id) || {
        title: '',
        content: ''
    };

    const backdrop = document.getElementById('spielModalBackdrop');
    const modalTitle = document.getElementById('spielModalTitle');
    const titleInput = document.getElementById('spielTitle');
    const contentInput = document.getElementById('spielContent');

    if (!backdrop || !modalTitle || !titleInput || !contentInput) {
        toast('Spiel modal not found. Check your HTML.');
        return;
    }

    modalTitle.textContent = id ? 'Edit spiel' : 'Add new spiel';

    titleInput.value = spiel.title || '';
    contentInput.value = spiel.content || '';

    backdrop.classList.add('show');
}

function closeSpielModal() {
    const backdrop = document.getElementById('spielModalBackdrop');

    if (backdrop) {
        backdrop.classList.remove('show');
    }

    editSpielId = null;
}

function saveSpiel() {
    const titleInput = document.getElementById('spielTitle');
    const contentInput = document.getElementById('spielContent');

    if (!titleInput || !contentInput) return;

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
        toast('Please enter a title and spiel message');
        return;
    }

    const existingSpiel = editSpielId
        ? data.spiels.find(item => item.id === editSpielId)
        : null;

    const item = {
        ...(existingSpiel || {}),
        id: editSpielId || uid(),
        title,
        content
    };

    if (editSpielId) {
        data.spiels = data.spiels.map(old =>
            old.id === editSpielId ? item : old
        );
    } else {
        data.spiels.unshift(item);
    }

    closeSpielModal();
    saveData();
}

function editSpiel(id) {
    openSpielModal(id);
}

function deleteSpiel(id) {
    if (!confirm('Delete this spiel?')) return;

    data.spiels = data.spiels.filter(item => item.id !== id);
    saveData();
}

async function copySpiel(id) {
    const spiel = data.spiels.find(item => item.id === id);

    if (!spiel) return;

    try {
        await navigator.clipboard.writeText(spiel.content || '');
        toast('Spiel copied ✓');

    } catch {
        toast('Clipboard unavailable. Please copy manually.');
    }
}


/* =========================================
   SPIEL CLICK EVENTS
========================================= */

function initializeSpielEvents() {
    const grid = document.getElementById('spielsGrid');

    if (grid && grid.dataset.spielClickBound !== 'true') {
        grid.dataset.spielClickBound = 'true';

        grid.addEventListener('click', event => {

            const editButton = event.target.closest('[data-edit-spiel]');

            if (editButton) {
                event.preventDefault();
                event.stopPropagation();

                editSpiel(editButton.dataset.editSpiel);
                return;
            }

            const card = event.target.closest('[data-spiel-card]');

            if (card) {
                copySpiel(card.dataset.spielCard);
            }
        });

        grid.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;

            if (event.target.closest('.spiel-actions')) return;

            const card = event.target.closest('[data-spiel-card]');

            if (card) {
                event.preventDefault();
                copySpiel(card.dataset.spielCard);
            }
        });
    }

    const backdrop = document.getElementById('spielModalBackdrop');

    if (backdrop && backdrop.dataset.spielModalBound !== 'true') {
        backdrop.dataset.spielModalBound = 'true';

        backdrop.addEventListener('click', event => {
            if (event.target === backdrop) {
                closeSpielModal();
            }
        });
    }

    initializeSpielDragAndDrop();
}


/* =========================================
   DRAG & DROP FOR ALL CARDS
========================================= */

function initializeSpielDragAndDrop() {
    const configurations = [
        {
            selectors: ['spielsGrid'],
            itemSelector: '[data-spiel-card]',
            collection: 'spiels',
            attribute: 'spielCard'
        },
        {
            selectors: ['allCards', 'dashboardCards'],
            itemSelector: '[data-work-card]',
            collection: 'cards',
            attribute: 'workCard'
        },
        {
            selectors: ['allLinks', 'dashboardLinks'],
            itemSelector: '[data-link-card]',
            collection: 'links',
            attribute: 'linkCard'
        }
    ];

    configurations.forEach(config => {
        config.selectors.forEach(containerId => {
            const container = document.getElementById(containerId);

            if (!container || container.dataset.dragInitialized === 'true') {
                return;
            }

            container.dataset.dragInitialized = 'true';

            let draggedId = null;
            let suppressClick = false;

            container.addEventListener('dragstart', event => {
                const card = event.target.closest(config.itemSelector);

                if (!card) return;

                draggedId = card.dataset[config.attribute];

                card.classList.add('dragging');

                suppressClick = true;

                if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', draggedId);
                }
            });

            container.addEventListener('dragover', event => {
                if (!draggedId) return;

                event.preventDefault();

                const target = event.target.closest(config.itemSelector);

                if (!target || target.dataset[config.attribute] === draggedId) {
                    return;
                }

                if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = 'move';
                }
            });

            container.addEventListener('drop', event => {
                if (!draggedId) return;

                event.preventDefault();

                const target = event.target.closest(config.itemSelector);

                if (!target) return;

                const targetId = target.dataset[config.attribute];

                if (targetId === draggedId) return;

                const items = data[config.collection];

                const fromIndex = items.findIndex(item => item.id === draggedId);
                const toIndex = items.findIndex(item => item.id === targetId);

                if (fromIndex < 0 || toIndex < 0) return;

                const movedItem = items.splice(fromIndex, 1)[0];

                items.splice(toIndex, 0, movedItem);

                draggedId = null;

                saveData();
            });

            container.addEventListener('dragend', () => {
                container.querySelectorAll('.dragging').forEach(card => {
                    card.classList.remove('dragging');
                });

                draggedId = null;

                setTimeout(() => {
                    suppressClick = false;
                }, 100);
            });

            container.addEventListener('click', event => {
                if (!suppressClick) return;

                event.preventDefault();
                event.stopPropagation();
                suppressClick = false;
            }, true);
        });
    });
}


/* =========================================
   GENERAL MODAL
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
   RENDER EVERYTHING
========================================= */

function renderAll() {
    data.spiels = data.spiels || [];

    const brandName = document.getElementById('brandName');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const settingBrand = document.getElementById('settingBrand');
    const settingWelcome = document.getElementById('settingWelcome');

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

    const linkCount = document.getElementById('linkCount');
    const cardCount = document.getElementById('cardCount');

    if (linkCount) linkCount.textContent = data.links.length;
    if (cardCount) cardCount.textContent = data.cards.length;

    renderLinks();
    renderCards();
    renderSpiels();
}


/* =========================================
   EXPORT DATA
========================================= */

function exportData() {
    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: 'application/json' }
    );

    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = 'workdesk-backup-' +
        new Date().toISOString().slice(0, 10) + '.json';

    link.click();

    URL.revokeObjectURL(link.href);

    toast('Backup exported');
}


/* =========================================
   IMPORT DATA
========================================= */

function importData(event) {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
        try {
            const imported = JSON.parse(reader.result);

            if (
                !Array.isArray(imported.links) ||
                !Array.isArray(imported.cards) ||
                !imported.settings
            ) {
                throw new Error('Invalid backup');
            }

            imported.spiels = Array.isArray(imported.spiels)
                ? imported.spiels
                : [];

            if (confirm('Import this backup? It will replace the current dashboard data.')) {
                data = imported;
                saveData();
                toast('Backup restored');
            }

        } catch {
            alert('Invalid WorkDesk backup file.');
        }

        event.target.value = '';
    };

    reader.readAsText(file);
}


/* =========================================
   CLEAR DATA
========================================= */

function clearData() {
    if (!confirm('This will permanently remove all dashboard links, cards, and spiels from this browser. Continue?')) {
        return;
    }

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


/* =========================================
   INITIALIZE
========================================= */

initializeSpielEvents();
initializeLinkCleaner();
renderAll();
