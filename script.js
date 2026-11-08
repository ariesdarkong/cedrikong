const STORAGE_KEY = 'workdesk_dashboard_v1';
const starter = {
    settings: {
        brand: 'WorkDesk',
        welcome: 'Good day, welcome back.'
    },
    links: [{
        id: 'l1',
        title: 'Wetracked.io',
        url: 'https://wetracked.io',
        icon: '🌐',
        description: 'Tracking and merchant workspace',
        category: 'Work'
    }, {
        id: 'l2',
        title: 'Slack',
        url: 'https://slack.com',
        icon: '💬',
        description: 'Team communication',
        category: 'Work'
    }, {
        id: 'l3',
        title: 'HubSpot',
        url: 'https://app.hubspot.com',
        icon: '🧡',
        description: 'CRM and customer support',
        category: 'Work'
    }, {
        id: 'l4',
        title: 'Gmail',
        url: 'https://mail.google.com',
        icon: '✉️',
        description: 'Email inbox',
        category: 'Work'
    }, {
        id: 'l5',
        title: 'Shopify',
        url: 'https://admin.shopify.com',
        icon: '🛍️',
        description: 'Store administration',
        category: 'Work'
    }, {
        id: 'l6',
        title: 'ChatGPT',
        url: 'https://chatgpt.com',
        icon: '✨',
        description: 'AI assistant',
        category: 'Tools'
    }],
    cards: [{
        id: 'c1',
        title: 'Support notes',
        category: 'Notes',
        content: 'Add your common work notes here. Click Edit to customize this card.',
        updated: Date.now()
    }, {
        id: 'c2',
        title: 'Merchant follow-up template',
        category: 'Templates',
        content: 'Hi there, just following up on this. Please let me know if you need any further assistance.',
        updated: Date.now()
    }]
};
let data = loadData()
  , editLinkId = null
  , editCardId = null;
function loadData() {
    try {
        const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return d && d.links && d.cards ? d : structuredClone(starter)
    } catch (e) {
        return structuredClone(starter)
    }
}
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        renderAll();
        toast('Saved automatically ✓')
    } catch (e) {
        toast('Save failed: browser storage may be full');
        console.error('WorkDesk storage error', e)
    }
}
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout( () => el.classList.remove('show'), 1800)
}
function escapeHTML(s='') {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]))
}
function safeURL(url) {
    url = (url || '').trim();
    if (!/^https?:\/\//i.test(url))
        url = 'https://' + url;
    try {
        const u = new URL(url);
        return ['http:', 'https:'].includes(u.protocol) ? u.href : null
    } catch {
        return null
    }
}
function goPage(page) {
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.querySelectorAll('.nav button').forEach(x => x.classList.toggle('active', x.dataset.page === page));
    if (page === 'links')
        renderLinks();
    if (page === 'cards')
        renderCards()
    if (page === "notes") {
    renderNotes();
}
}
document.querySelectorAll('.nav button').forEach(b => b.addEventListener('click', () => goPage(b.dataset.page)));
function linkHTML(l) {
    return `<div class="link-card"><div class="link-top"><div class="link-icon">${escapeHTML(l.icon || '🔗')}</div><div><div class="link-title">${escapeHTML(l.title)}</div><div class="link-desc">${escapeHTML(l.description || l.category || 'Quick link')}</div></div></div><div class="link-actions"><button class="open-link" onclick="openExternal('${l.id}')">Open ↗</button><div class="mini-actions"><button onclick="editLink('${l.id}')">Edit</button><button class="danger" onclick="deleteLink('${l.id}')">Delete</button></div></div></div>`
}
function renderLinks() {
    const dash = document.getElementById('dashboardLinks');
    if (dash)
        dash.innerHTML = data.links.slice(0, 8).map(linkHTML).join('') || '<div class="empty">Add a quick link to get started.</div>';
    const page = document.getElementById('page-links');
    if (!page || !page.classList.contains('active'))
        return;
    const q = (document.getElementById('linkSearch')?.value || '').toLowerCase();
    const list = data.links.filter(l => (l.title + ' ' + l.description + ' ' + l.category).toLowerCase().includes(q));
    document.getElementById('allLinks').innerHTML = list.length ? list.map(linkHTML).join('') : '<div class="empty">No links found. Add your first shortcut.</div>'
}
function openExternal(id) {
    const l = data.links.find(x => x.id === id);
    if (!l)
        return;
    const url = safeURL(l.url);
    if (!url) {
        toast('Please edit this link: invalid URL');
        return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
}
function openLinkModal(id=null) {
    editLinkId = id;
    const l = data.links.find(x => x.id === id) || {
        title: '',
        url: '',
        icon: '🔗',
        description: '',
        category: 'Work'
    };
    showModal(id ? 'Edit quick link' : 'Add quick link', `<div class="form-grid"><div class="field"><label>Link name *</label><input id="fTitle" value="${escapeHTML(l.title)}" required></div><div class="field"><label>URL *</label><input id="fURL" value="${escapeHTML(l.url)}" placeholder="https://example.com" required></div><div class="field"><label>Icon / emoji</label><input id="fIcon" value="${escapeHTML(l.icon)}" maxlength="8"></div><div class="field"><label>Description</label><input id="fDesc" value="${escapeHTML(l.description || '')}"></div><div class="field"><label>Category</label><input id="fCat" value="${escapeHTML(l.category || 'Work')}"></div></div>`, () => {
        const title = document.getElementById('fTitle').value.trim()
          , url = safeURL(document.getElementById('fURL').value);
        if (!title || !url) {
            toast('Enter a name and valid URL');
            return
        }
        const item = {
            id: id || uid(),
            title,
            url,
            icon: document.getElementById('fIcon').value || '🔗',
            description: document.getElementById('fDesc').value,
            category: document.getElementById('fCat').value
        };
        if (id)
            data.links = data.links.map(x => x.id === id ? item : x);
        else
            data.links.unshift(item);
        closeModal();
        saveData()
    }
    )
}
function editLink(id) {
    openLinkModal(id)
}
function deleteLink(id) {
    if (confirm('Delete this quick link?')) {
        data.links = data.links.filter(x => x.id !== id);
        saveData()
    }
}
function cardHTML(c) {
    return `<div class="info-card"><div class="card-title-row"><div class="card-title">${escapeHTML(c.title)}</div><span class="tag">${escapeHTML(c.category || 'General')}</span></div><div class="card-content">${escapeHTML(c.content || '')}</div><div class="card-footer"><button onclick="copyCard('${c.id}')">Copy</button><button onclick="editCard('${c.id}')">Edit</button><button class="danger" onclick="deleteCard('${c.id}')">Delete</button></div></div>`
}
function renderCards() {
    const dash = document.getElementById('dashboardCards');
    if (dash)
        dash.innerHTML = data.cards.slice(0, 4).map(cardHTML).join('') || '<div class="empty">No saved cards yet.</div>';
    const page = document.getElementById('page-cards');
    if (!page || !page.classList.contains('active'))
        return;
    const q = (document.getElementById('cardSearch')?.value || '').toLowerCase()
      , cat = document.getElementById('cardCategory')?.value || '';
    const list = data.cards.filter(c => (c.title + ' ' + c.content + ' ' + c.category).toLowerCase().includes(q) && (!cat || c.category === cat));
    document.getElementById('allCards').innerHTML = list.length ? list.map(cardHTML).join('') : '<div class="empty">No cards found. Create a work card.</div>';
    const select = document.getElementById('cardCategory');
    if (select) {
        const old = select.value
          , cats = [...new Set(data.cards.map(c => c.category || 'General'))];
        select.innerHTML = '<option value="">All categories</option>' + cats.map(x => `<option>${escapeHTML(x)}</option>`).join('');
        select.value = cats.includes(old) ? old : ''
    }
}
function openCardModal(id=null) {
    editCardId = id;
    const c = data.cards.find(x => x.id === id) || {
        title: '',
        category: 'Notes',
        content: ''
    };
    showModal(id ? 'Edit work card' : 'New work card', `<div class="form-grid"><div class="field"><label>Card title *</label><input id="fTitle" value="${escapeHTML(c.title)}" required></div><div class="field"><label>Category</label><input id="fCat" value="${escapeHTML(c.category || 'Notes')}"></div><div class="field"><label>Information / notes *</label><textarea id="fContent" rows="8">${escapeHTML(c.content || '')}</textarea></div></div>`, () => {
        const title = document.getElementById('fTitle').value.trim()
          , content = document.getElementById('fContent').value;
        if (!title) {
            toast('Enter a card title');
            return
        }
        const item = {
            id: id || uid(),
            title,
            category: document.getElementById('fCat').value.trim() || 'General',
            content,
            updated: Date.now()
        };
        if (id)
            data.cards = data.cards.map(x => x.id === id ? item : x);
        else
            data.cards.unshift(item);
        closeModal();
        saveData()
    }
    )
}
function editCard(id) {
    openCardModal(id)
}
function deleteCard(id) {
    if (confirm('Delete this work card?')) {
        data.cards = data.cards.filter(x => x.id !== id);
        saveData()
    }
}
async function copyCard(id) {
    const c = data.cards.find(x => x.id === id);
    if (c) {
        try {
            await navigator.clipboard.writeText(c.content);
            toast('Card content copied')
        } catch {
            toast('Clipboard unavailable; select and copy the text manually')
        }
    }
}
function showModal(title, body, onSave) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;
    document.getElementById('modalBackdrop').classList.add('show');
    document.getElementById('modalSave').onclick = onSave
}
function closeModal() {
    document.getElementById('modalBackdrop').classList.remove('show')
}
function saveSettings() {
    data.settings = {
        brand: document.getElementById('settingBrand').value.trim() || 'WorkDesk',
        welcome: document.getElementById('settingWelcome').value.trim() || 'Welcome back.'
    };
    saveData()
}
function renderAll() {
    document.getElementById('brandName').textContent = data.settings.brand || 'WorkDesk';
    document.getElementById('welcomeTitle').textContent = data.settings.welcome || 'Welcome back.';
    document.getElementById('settingBrand').value = data.settings.brand || 'WorkDesk';
    document.getElementById('settingWelcome').value = data.settings.welcome || '';
    document.getElementById('linkCount').textContent = data.links.length;
    document.getElementById('cardCount').textContent = data.cards.length;
    renderLinks();
    renderCards()
}
function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)],{
        type: 'application/json'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'workdesk-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup exported')
}
function importData(e) {
    const file = e.target.files[0];
    if (!file)
        return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const d = JSON.parse(reader.result);
            if (!Array.isArray(d.links) || !Array.isArray(d.cards) || !d.settings)
                throw new Error();
            if (confirm('Import this backup? It will replace the current dashboard data.')) {
                data = d;
                saveData();
                toast('Backup restored')
            }
        } catch {
            alert('Invalid WorkDesk backup file.')
        }
        e.target.value = ''
    }
    ;
    reader.readAsText(file)
}
function clearData() {
    if (confirm('This will permanently remove all dashboard links and cards from this browser. Continue?')) {
        localStorage.removeItem(STORAGE_KEY);
        data = {
            settings: {
                brand: 'WorkDesk',
                welcome: 'Good day, welcome back.'
            },
            links: [],
            cards: []
        };
        saveData()
    }
}
renderAll();
