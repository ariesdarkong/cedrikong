
/* =========================================
   WORKDESK NOTES
   Two-Panel Notes Workspace
   Create, Edit, Delete, Search & Auto-Save
========================================= */

(() => {
    'use strict';

    const NOTES_STORAGE_KEY = 'workdesk_notes_v1';

    let notes = loadNotes();
    let selectedNoteId = null;
    let saveTimer = null;

    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');
    const searchInput = document.getElementById('notesSearch');

    /* =====================================
       LOAD AND SAVE
    ===================================== */

    function loadNotes() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(NOTES_STORAGE_KEY)
            );

            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            console.error('Notes loading error:', error);
            return [];
        }
    }

    function persistNotes() {
        try {
            localStorage.setItem(
                NOTES_STORAGE_KEY,
                JSON.stringify(notes)
            );

            return true;
        } catch (error) {
            console.error('Notes saving error:', error);

            if (typeof toast === 'function') {
                toast('Could not save notes');
            }

            return false;
        }
    }

    function uid() {
        return Date.now().toString(36) +
            Math.random().toString(36).slice(2, 8);
    }

    function escapeNote(value = '') {
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

    /* =====================================
       UPDATE DELETE BUTTON
    ===================================== */

    function updateDeleteButton() {
        const button = document.getElementById('notesDeleteBtn');

        if (button) {
            button.disabled = !selectedNoteId;
        }
    }

    /* =====================================
       EDITOR VISIBILITY
    ===================================== */

    function showEditor() {
        const empty = document.getElementById('notesEditorEmpty');
        const editor = document.getElementById('notesEditorContent');

        if (empty) empty.hidden = true;
        if (editor) editor.hidden = false;
    }

    function showEmptyEditor() {
        const empty = document.getElementById('notesEditorEmpty');
        const editor = document.getElementById('notesEditorContent');

        if (empty) empty.hidden = false;
        if (editor) editor.hidden = true;
    }

    /* =====================================
       SAVE CURRENT NOTE
    ===================================== */

    function saveCurrentNote() {
        if (!selectedNoteId || !titleInput || !contentInput) {
            return;
        }

        const note = notes.find(
            item => item.id === selectedNoteId
        );

        if (!note) return;

        note.title = titleInput.value.trim() || 'Untitled note';
        note.content = contentInput.value;
        note.updated = Date.now();

        if (persistNotes()) {
            updateEditorStatus('Saved');
            updateNoteDate(note.updated);
            renderNotesList();
        }
    }

    function scheduleSave() {
        updateEditorStatus('Saving...');

        clearTimeout(saveTimer);

        saveTimer = setTimeout(() => {
            saveCurrentNote();
        }, 400);
    }

    function updateEditorStatus(message) {
        const status = document.getElementById('notesEditorStatus');

        if (status) {
            status.textContent = message;
        }
    }

    function updateNoteDate(timestamp) {
        const date = document.getElementById('noteUpdated');

        if (date) {
            date.textContent = 'Last edited: ' + formatDate(timestamp);
        }
    }

    /* =====================================
       RENDER NOTES LIST
    ===================================== */

    function renderNotesList() {
        const list = document.getElementById('notesList');
        const count = document.getElementById('notesCount');

        if (!list) return;

        const search = (searchInput?.value || '')
            .trim()
            .toLowerCase();

        const filtered = notes.filter(note => {
            const text = `${note.title || ''} ${note.content || ''}`;
            return text.toLowerCase().includes(search);
        });

        if (count) {
            count.textContent =
                `${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'}`;
        }

        if (!filtered.length) {
            list.innerHTML = `
                <div class="notes-list-empty">
                    ${search
                        ? 'No notes match your search.'
                        : 'No notes yet. Click + to create your first note.'
                    }
                </div>
            `;

            return;
        }

        list.innerHTML = filtered.map(note => {
            const preview = (note.content || '')
                .replace(/\s+/g, ' ')
                .trim();

            return `
                <div
                    class="notes-list-item ${note.id === selectedNoteId ? 'active' : ''}"
                    data-note-id="${escapeNote(note.id)}"
                    tabindex="0"
                    role="button"
                    aria-label="Open note ${escapeNote(note.title || 'Untitled note')}">

                    <div class="notes-list-title">
                        ${escapeNote(note.title || 'Untitled note')}
                    </div>

                    <div class="notes-list-preview">
                        ${escapeNote(preview || 'No additional text')}
                    </div>

                    <div class="notes-list-date">
                        ${escapeNote(formatDate(note.updated || note.created))}
                    </div>

                </div>
            `;
        }).join('');
    }

    /* =====================================
       SELECT NOTE
    ===================================== */

    function selectNote(id) {
        if (selectedNoteId === id) return;

        clearTimeout(saveTimer);
        saveCurrentNote();

        const note = notes.find(item => item.id === id);

        if (!note) return;

        selectedNoteId = id;

        showEditor();

        titleInput.value = note.title || '';
        contentInput.value = note.content || '';

        updateEditorStatus('Saved');
        updateNoteDate(note.updated || note.created);

        renderNotesList();
        updateDeleteButton();
    }

    /* =====================================
       CREATE NOTE
    ===================================== */

    function createNote() {
        clearTimeout(saveTimer);
        saveCurrentNote();

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

        updateEditorStatus('New note');
        updateNoteDate(now);

        renderNotesList();
        updateDeleteButton();

        titleInput.focus();
    }

    /* =====================================
       DELETE NOTE
    ===================================== */

    function deleteNote() {
        if (!selectedNoteId) return;

        const note = notes.find(
            item => item.id === selectedNoteId
        );

        if (!note) return;

        const noteTitle = note.title || 'Untitled note';

        if (!confirm(`Delete "${noteTitle}"?`)) {
            return;
        }

        clearTimeout(saveTimer);

        notes = notes.filter(
            item => item.id !== selectedNoteId
        );

        selectedNoteId = null;

        persistNotes();

        if (notes.length) {
            selectedNoteId = notes[0].id;

            const firstNote = notes[0];

            showEditor();

            titleInput.value = firstNote.title || '';
            contentInput.value = firstNote.content || '';

            updateEditorStatus('Saved');
            updateNoteDate(firstNote.updated || firstNote.created);
        } else {
            titleInput.value = '';
            contentInput.value = '';

            showEmptyEditor();
        }

        renderNotesList();
        updateDeleteButton();

        if (typeof toast === 'function') {
            toast('Note deleted');
        }
    }

    /* =====================================
       SEARCH
    ===================================== */

    function bindSearch() {
        if (!searchInput) return;

        searchInput.addEventListener('input', renderNotesList);
    }

    /* =====================================
       EDITOR EVENTS
    ===================================== */

    function bindEditor() {
        if (titleInput) {
            titleInput.addEventListener('input', scheduleSave);
        }

        if (contentInput) {
            contentInput.addEventListener('input', scheduleSave);
        }

        [titleInput, contentInput].forEach(input => {
            if (!input) return;

            input.addEventListener('blur', () => {
                clearTimeout(saveTimer);
                saveCurrentNote();
            });
        });

        document.querySelectorAll('.nav button').forEach(button => {
            button.addEventListener('click', () => {
                clearTimeout(saveTimer);
                saveCurrentNote();
            });
        });

        window.addEventListener('beforeunload', () => {
            clearTimeout(saveTimer);
            saveCurrentNote();
        });
    }

    /* =====================================
       NOTES LIST EVENTS
    ===================================== */

    function bindListEvents() {
        const list = document.getElementById('notesList');

        if (!list) return;

        list.addEventListener('click', event => {
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
    }

    /* =====================================
       RENDER NOTES
    ===================================== */

    function renderNotes() {
        if (!selectedNoteId && notes.length) {
            selectedNoteId = notes[0].id;
        }

        const note = notes.find(
            item => item.id === selectedNoteId
        );

        if (note) {
            showEditor();

            titleInput.value = note.title || '';
            contentInput.value = note.content || '';

            updateEditorStatus('Saved');
            updateNoteDate(note.updated || note.created);
        } else {
            selectedNoteId = null;

            titleInput.value = '';
            contentInput.value = '';

            showEmptyEditor();
        }

        renderNotesList();
        updateDeleteButton();
    }

    /* =====================================
       INITIALIZE
    ===================================== */

    function init() {
        bindSearch();
        bindEditor();
        bindListEvents();
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
