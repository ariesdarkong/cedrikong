/* =========================================================
   WORKDESK NOTES
   Auto-save + IndexedDB attachments + paste + drag/drop
   Text stays in localStorage. Files stay in IndexedDB.
========================================================= */

(() => {
    'use strict';

    const NOTES_STORAGE_KEY = 'workdesk_notes_v1';
    const DB_NAME = 'WorkDeskNotesDB';
    const DB_VERSION = 2;
    const STORE_NAME = 'attachments';
    const MAX_FILE_SIZE = 25 * 1024 * 1024;

    let notes = loadNotes();
    let selectedNoteId = null;
    let saveTimer = null;
    let dbPromise = null;
    let galleryObjectUrls = [];

    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');
    const searchInput = document.getElementById('notesSearch');
    const editor = document.getElementById('notesEditorContent');
    const gallery = document.getElementById('noteImageGallery');
    const fileInput = document.getElementById('noteImageInput');

    function loadNotes() {
        try {
            const saved = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '[]');
            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            console.error('Notes loading error:', error);
            return [];
        }
    }

    function persistNotes() {
        try {
            localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
            return true;
        } catch (error) {
            console.error('Notes saving error:', error);
            showToast('Could not save notes. Your browser storage may be full.');
            return false;
        }
    }

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
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

    function formatDate(timestamp) {
        if (!timestamp) return 'Saved note';

        return new Date(timestamp).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function showToast(message) {
        if (typeof window.toast === 'function') {
            window.toast(message);
        } else {
            console.info(message);
        }
    }

    function setStatus(message) {
        const status = document.getElementById('notesEditorStatus');
        if (status) status.textContent = message;
    }

    function setUpdated(timestamp) {
        const target = document.getElementById('noteUpdated');

        if (target) {
            target.textContent = 'Last edited: ' + formatDate(timestamp);
        }
    }

    function updateDeleteButton() {
        const button = document.getElementById('notesDeleteBtn');
        if (button) button.disabled = !selectedNoteId;
    }

    function showEditor() {
        const empty = document.getElementById('notesEditorEmpty');

        if (empty) empty.hidden = true;
        if (editor) editor.hidden = false;
    }

    function showEmptyEditor() {
        const empty = document.getElementById('notesEditorEmpty');

        if (empty) empty.hidden = false;
        if (editor) editor.hidden = true;

        clearGalleryUrls();

        if (gallery) gallery.innerHTML = '';

        updateAttachmentCount(0);
    }

    function currentNote() {
        return notes.find(note => note.id === selectedNoteId) || null;
    }

    function saveCurrentNote() {
        if (!selectedNoteId || !titleInput || !contentInput) return;

        const note = currentNote();
        if (!note) return;

        note.title = titleInput.value.trim() || 'Untitled note';
        note.content = contentInput.value;
        note.updated = Date.now();

        if (persistNotes()) {
            setStatus('Saved');
            setUpdated(note.updated);
            renderNotesList();
        }
    }

    function scheduleSave() {
        setStatus('Saving...');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveCurrentNote, 450);
    }

    function flushSave() {
        clearTimeout(saveTimer);
        saveCurrentNote();
    }

    function renderNotesList() {
        const list = document.getElementById('notesList');
        const count = document.getElementById('notesCount');

        if (!list) return;

        const search = (searchInput?.value || '').trim().toLowerCase();

        const filtered = notes.filter(note =>
            `${note.title || ''} ${note.content || ''}`.toLowerCase().includes(search)
        );

        if (count) {
            count.textContent = `${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'}`;
        }

        if (!filtered.length) {
            list.innerHTML = `
                <div class="notes-list-empty">
                    ${search
                        ? 'No notes match your search.'
                        : 'No notes yet. Click + to create your first note.'}
                </div>`;
            return;
        }

        list.innerHTML = filtered.map(note => {
            const preview = (note.content || '').replace(/\s+/g, ' ').trim();

            return `
                <div class="notes-list-item ${note.id === selectedNoteId ? 'active' : ''}"
                     data-note-id="${escapeHTML(note.id)}"
                     tabindex="0"
                     role="button"
                     aria-label="Open note ${escapeHTML(note.title || 'Untitled note')}">

                    <div class="notes-list-title">
                        ${escapeHTML(note.title || 'Untitled note')}
                    </div>

                    <div class="notes-list-preview">
                        ${escapeHTML(preview || 'No additional text')}
                    </div>

                    <div class="notes-list-date">
                        ${escapeHTML(formatDate(note.updated || note.created))}
                    </div>
                </div>`;
        }).join('');
    }

    function clearGalleryUrls() {
        galleryObjectUrls.forEach(url => URL.revokeObjectURL(url));
        galleryObjectUrls = [];
    }

    /* INDEXEDDB */

    function openDatabase() {
        if (!('indexedDB' in window)) {
            return Promise.reject(
                new Error('IndexedDB is not supported by this browser.')
            );
        }

        if (dbPromise) return dbPromise;

        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: 'id'
                    });

                    store.createIndex('noteId', 'noteId', {
                        unique: false
                    });
                }
            };

            request.onsuccess = () => resolve(request.result);

            request.onerror = () => {
                reject(request.error || new Error('Could not open attachment storage.'));
            };
        }).catch(error => {
            dbPromise = null;
            throw error;
        });

        return dbPromise;
    }

    async function getAttachments(noteId) {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const request = tx.objectStore(STORE_NAME)
                .index('noteId')
                .getAll(noteId);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async function saveAttachment(file, noteId) {
        const db = await openDatabase();

        const record = {
            id: uid(),
            noteId,
            name: file.name || `pasted-image-${Date.now()}.png`,
            type: file.type || 'application/octet-stream',
            size: file.size,
            blob: file,
            created: Date.now()
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');

            tx.objectStore(STORE_NAME).put(record);

            tx.oncomplete = () => resolve(record);

            tx.onerror = () => {
                reject(tx.error || new Error('Could not save attachment.'));
            };

            tx.onabort = () => {
                reject(tx.error || new Error('Attachment save was cancelled.'));
            };
        });
    }

    async function removeAttachment(id) {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');

            tx.objectStore(STORE_NAME).delete(id);

            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    async function removeNoteAttachments(noteId) {
        const records = await getAttachments(noteId);

        if (!records.length) return;

        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            records.forEach(record => store.delete(record.id));

            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    function updateAttachmentCount(count) {
        const target = document.getElementById('noteImageCount');

        if (target) {
            target.textContent = `${count} ${count === 1 ? 'file' : 'files'}`;
        }
    }

    function fileIcon(type, name) {
        if (type.includes('pdf') || /\.pdf$/i.test(name)) return '📕';
        if (type.includes('word') || /\.(doc|docx)$/i.test(name)) return '📘';
        if (type.includes('sheet') || /\.(xls|xlsx|csv)$/i.test(name)) return '📗';
        if (type.startsWith('text/') || /\.(txt|md)$/i.test(name)) return '📄';

        return '📎';
    }

    /* RENDER ATTACHMENTS */

    async function renderAttachments() {
        if (!gallery || !selectedNoteId) return;

        const noteId = selectedNoteId;

        clearGalleryUrls();

        gallery.innerHTML = `
            <div class="notes-attachments-loading">
                Loading attachments...
            </div>`;

        try {
            const records = await getAttachments(noteId);

            if (selectedNoteId !== noteId) return;

            updateAttachmentCount(records.length);

            if (!records.length) {
                gallery.innerHTML = `
                    <div class="notes-attachments-empty">
                        No files attached yet.
                    </div>`;
                return;
            }

            gallery.innerHTML = records.map(record => {
                const url = URL.createObjectURL(record.blob);
                galleryObjectUrls.push(url);

                const isImage = (record.type || '').startsWith('image/');
                const safeName = escapeHTML(record.name);
                const size = formatBytes(record.size);

                return `
                    <article class="notes-image-card">
                        ${isImage
                            ? `
                                <img
                                    src="${url}"
                                    alt="${safeName}"
                                    data-open-attachment="${escapeHTML(record.id)}"
                                    title="Click to open image">
                            `
                            : `
                                <a
                                    class="notes-file-preview"
                                    href="${url}"
                                    download="${safeName}">

                                    <span class="notes-file-icon">
                                        ${fileIcon(record.type || '', record.name)}
                                    </span>

                                    <span class="notes-file-label">
                                        ${safeName}
                                    </span>

                                    <span class="notes-file-size">
                                        ${size}
                                    </span>
                                </a>
                            `
                        }

                        <button
                            type="button"
                            class="notes-image-delete"
                            data-delete-attachment="${escapeHTML(record.id)}"
                            aria-label="Remove ${safeName}"
                            title="Remove attachment">
                            ×
                        </button>

                        ${isImage
                            ? `<div class="notes-image-name">${safeName}</div>`
                            : ''
                        }
                    </article>`;
            }).join('');

        } catch (error) {
            console.error('Attachment loading error:', error);

            gallery.innerHTML = `
                <div class="notes-attachments-empty">
                    Could not load attachments. Try refreshing the page.
                </div>`;
        }
    }

    function formatBytes(bytes = 0) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function ensureSelectedNote() {
        if (selectedNoteId) return true;

        createNote();
        return Boolean(selectedNoteId);
    }

    /* ADD FILES */

    async function addFiles(fileList) {
        const files = Array.from(fileList || [])
            .filter(file => file && typeof file.size === 'number');

        if (!files.length) return;
        if (!ensureSelectedNote()) return;

        const noteId = selectedNoteId;

        let added = 0;
        let skipped = 0;

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                skipped++;
                continue;
            }

            try {
                await saveAttachment(file, noteId);
                added++;
            } catch (error) {
                console.error('Attachment save error:', error);
                skipped++;
            }
        }

        if (selectedNoteId === noteId) {
            await renderAttachments();
        }

        if (added && skipped) {
            showToast(`${added} file(s) attached. ${skipped} skipped (over 25 MB or could not be saved).`);
        } else if (added) {
            showToast(`${added} file(s) attached`);
        } else if (skipped) {
            showToast('Files could not be attached. Each file must be under 25 MB.');
        }
    }

    /* INSERT DRAGGED TEXT */

    function insertTextAtCursor(text) {
        if (!contentInput || !text) return;

        const start = contentInput.selectionStart ?? contentInput.value.length;
        const end = contentInput.selectionEnd ?? contentInput.value.length;

        const before = contentInput.value.slice(0, start);
        const after = contentInput.value.slice(end);

        const needsNewline = before.length && !before.endsWith('\n') ? '\n' : '';

        contentInput.value = before + needsNewline + text + after;

        const cursor = (before + needsNewline + text).length;

        contentInput.setSelectionRange(cursor, cursor);
        contentInput.focus();

        scheduleSave();
    }

    /* NOTE ACTIONS */

    function selectNote(id) {
        if (selectedNoteId === id) return;

        flushSave();

        const note = notes.find(item => item.id === id);
        if (!note) return;

        selectedNoteId = id;

        showEditor();

        titleInput.value = note.title || '';
        contentInput.value = note.content || '';

        setStatus('Saved');
        setUpdated(note.updated || note.created);

        renderNotesList();
        updateDeleteButton();
        renderAttachments();
    }

    function createNote() {
        flushSave();

        const now = Date.now();

        const note = {
            id: uid(),
            title: '',
            content: '',
            created: now,
            updated: now
        };

        notes.unshift(note);
        selectedNoteId = note.id;

        persistNotes();

        showEditor();

        titleInput.value = '';
        contentInput.value = '';

        setStatus('New note');
        setUpdated(now);

        renderNotesList();
        updateDeleteButton();
        renderAttachments();

        titleInput.focus();
    }

    async function deleteNote() {
        if (!selectedNoteId) return;

        const note = currentNote();
        if (!note) return;

        if (!confirm(`Delete "${note.title || 'Untitled note'}" and its attachments?`)) {
            return;
        }

        clearTimeout(saveTimer);

        const deletedId = selectedNoteId;

        notes = notes.filter(item => item.id !== deletedId);
        selectedNoteId = null;

        persistNotes();

        try {
            await removeNoteAttachments(deletedId);
        } catch (error) {
            console.error('Could not remove note attachments:', error);
        }

        if (notes.length) {
            const next = notes[0];

            selectedNoteId = next.id;

            showEditor();

            titleInput.value = next.title || '';
            contentInput.value = next.content || '';

            setStatus('Saved');
            setUpdated(next.updated || next.created);

            renderAttachments();
        } else {
            titleInput.value = '';
            contentInput.value = '';

            showEmptyEditor();
        }

        renderNotesList();
        updateDeleteButton();

        showToast('Note deleted');
    }

    /* EDITOR EVENTS */

    function bindEditor() {
        titleInput?.addEventListener('input', scheduleSave);
        contentInput?.addEventListener('input', scheduleSave);

        [titleInput, contentInput].forEach(input => {
            input?.addEventListener('blur', flushSave);
        });

        document.querySelectorAll('.nav button').forEach(button => {
            button.addEventListener('click', flushSave);
        });

        window.addEventListener('beforeunload', flushSave);

        document.getElementById('attachImageBtn')?.addEventListener('click', () => {
            fileInput?.click();
        });

        fileInput?.addEventListener('change', async event => {
            await addFiles(event.target.files);
            event.target.value = '';
        });

        /* PASTE SCREENSHOTS */

        contentInput?.addEventListener('paste', async event => {
            const items = Array.from(event.clipboardData?.items || []);

            const imageFiles = items
                .filter(item =>
                    item.kind === 'file' && item.type.startsWith('image/')
                )
                .map(item => item.getAsFile())
                .filter(Boolean);

            if (imageFiles.length) {
                event.preventDefault();
                await addFiles(imageFiles);
            }

            // Plain text continues to paste normally into the textarea.
        });

        /* DRAG AND DROP */

        editor?.addEventListener('dragover', event => {
            event.preventDefault();

            editor.classList.add('drag-over');

            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'copy';
            }
        });

        editor?.addEventListener('dragleave', event => {
            if (!editor.contains(event.relatedTarget)) {
                editor.classList.remove('drag-over');
            }
        });

        editor?.addEventListener('drop', async event => {
            event.preventDefault();

            editor.classList.remove('drag-over');

            const files = Array.from(event.dataTransfer?.files || []);

            if (files.length) {
                await addFiles(files);
                return;
            }

            const text = event.dataTransfer?.getData('text/plain');

            if (text) {
                insertTextAtCursor(text);
            }
        });

        editor?.addEventListener('dragend', () => {
            editor.classList.remove('drag-over');
        });
    }

    /* SEARCH, LIST AND GALLERY EVENTS */

    function bindSearchAndList() {
        searchInput?.addEventListener('input', renderNotesList);

        const list = document.getElementById('notesList');
        if (!list) return;

        list.addEventListener('click', event => {
            const removeButton = event.target.closest('[data-delete-attachment]');

            if (removeButton) return;

            const item = event.target.closest('[data-note-id]');

            if (item) {
                selectNote(item.dataset.noteId);
            }
        });

        list.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;

            const item = event.target.closest('[data-note-id]');
            if (!item) return;

            event.preventDefault();
            selectNote(item.dataset.noteId);
        });

        gallery?.addEventListener('click', async event => {
            const deleteButton = event.target.closest('[data-delete-attachment]');

            if (deleteButton) {
                event.preventDefault();

                try {
                    await removeAttachment(deleteButton.dataset.deleteAttachment);
                    await renderAttachments();
                    showToast('Attachment removed');
                } catch (error) {
                    console.error(error);
                    showToast('Could not remove attachment');
                }

                return;
            }

            const image = event.target.closest('[data-open-attachment]');

            if (image) {
                const recordId = image.dataset.openAttachment;

                try {
                    const records = await getAttachments(selectedNoteId);
                    const record = records.find(item => item.id === recordId);

                    if (record) {
                        const url = URL.createObjectURL(record.blob);

                        window.open(url, '_blank', 'noopener');

                        setTimeout(() => {
                            URL.revokeObjectURL(url);
                        }, 60000);
                    }
                } catch (error) {
                    console.error(error);
                    showToast('Could not open image');
                }
            }
        });
    }

    /* RENDER NOTES */

    function renderNotes() {
        if (!selectedNoteId && notes.length) {
            selectedNoteId = notes[0].id;
        }

        const note = currentNote();

        if (note) {
            showEditor();

            titleInput.value = note.title || '';
            contentInput.value = note.content || '';

            setStatus('Saved');
            setUpdated(note.updated || note.created);

            renderAttachments();
        } else {
            selectedNoteId = null;

            titleInput.value = '';
            contentInput.value = '';

            showEmptyEditor();
        }

        renderNotesList();
        updateDeleteButton();
    }

    /* INITIALIZE */

    function init() {
        if (!titleInput || !contentInput) {
            console.warn('WorkDesk Notes: noteTitle or noteContent was not found in index.html.');
            return;
        }

        bindEditor();
        bindSearchAndList();
        renderNotes();
    }

    window.createNote = createNote;
    window.deleteNote = deleteNote;
    window.renderNotes = renderNotes;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, {
            once: true
        });
    } else {
        init();
    }
})();
