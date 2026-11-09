
/* =========================================
   WORKDESK NOTES
   Create, Edit, Delete, Search & Reorder
========================================= */

(() => {
    'use strict';

    const NOTES_STORAGE_KEY = 'workdesk_notes_v1';

    let notes = loadNotes();
    let draggedNoteId = null;

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

    function saveNotes() {
        try {
            localStorage.setItem(
                NOTES_STORAGE_KEY,
                JSON.stringify(notes)
            );

            renderNotes();

            if (typeof toast === 'function') {
                toast('Notes saved ✓');
            }
        } catch (error) {
            console.error('Notes saving error:', error);

            if (typeof toast === 'function') {
                toast('Could not save notes');
            }
        }
    }

    /* =====================================
       HELPERS
    ===================================== */

    function escapeNote(value = '') {
        return String(value).replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]);
    }

    function noteId() {
        return Date.now().toString(36) +
            Math.random().toString(36).slice(2, 8);
    }

    /* =====================================
       NOTES NAVIGATION
    ===================================== */

    function bindNotesNavigation() {
        const nav = document.querySelector('.nav');

        if (!nav) return;

        let button = document.getElementById('notesNavButton');

        if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            button.id = 'notesNavButton';
            button.dataset.page = 'notes';
            button.textContent = '📝 Notes';

            nav.appendChild(button);
        }

        if (button.dataset.notesBound === 'true') return;

        button.dataset.notesBound = 'true';

        button.addEventListener('click', () => {
            if (typeof goPage === 'function') {
                goPage('notes');
            } else {
                document.querySelectorAll('.page').forEach(page => {
                    page.classList.remove('active');
                });

                document.getElementById('page-notes')
                    ?.classList.add('active');
            }

            renderNotes();
        });
    }

    /* =====================================
       SEARCH NOTES
    ===================================== */

    function bindSearch() {
        const search = document.getElementById('notesSearch');

        if (!search || search.dataset.notesSearchBound === 'true') {
            return;
        }

        search.dataset.notesSearchBound = 'true';

        search.addEventListener('input', renderNotes);
    }

    /* =====================================
       DISPLAY NOTES
    ===================================== */

    function renderNotes() {
        const grid = document.getElementById('notesGrid');

        if (!grid) return;

        const search = (
            document.getElementById('notesSearch')?.value || ''
        ).trim().toLowerCase();

        const filtered = notes.filter(note =>
            `${note.title || ''} ${note.content || ''}`
                .toLowerCase()
                .includes(search)
        );

        const count = document.getElementById('notesCount');

        if (count) {
            count.textContent =
                `${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'}`;
        }

        if (!filtered.length) {
            grid.innerHTML = `
                <div class="empty">
                    ${search
                        ? 'No notes match your search.'
                        : 'No notes yet. Click “New note” to create one.'
                    }
                </div>
            `;

            return;
        }

        grid.innerHTML = filtered.map(note => {
            const updated = note.updated
                ? new Date(note.updated).toLocaleString()
                : 'Saved note';

            return `
                <article
                    class="info-card note-card"
                    data-note-card="${escapeNote(note.id)}"
                    draggable="${search ? 'false' : 'true'}"
                >

                    <div class="card-title-row">
                        <div class="card-title">
                            ${escapeNote(note.title || 'Untitled note')}
                        </div>

                        <span class="tag">Note</span>
                    </div>

                    <div class="note-updated">
                        Updated: ${escapeNote(updated)}
                    </div>

                    <div class="card-content note-content">
                        ${escapeNote(note.content || '')}
                    </div>

                    <div class="card-footer">
                        <button
                            type="button"
                            onclick="editNote('${escapeNote(note.id)}')">
                            Edit
                        </button>

                        <button
                            type="button"
                            class="danger"
                            onclick="deleteNote('${escapeNote(note.id)}')">
                            Delete
                        </button>
                    </div>

                </article>
            `;
        }).join('');
    }

    /* =====================================
       DRAG & DROP NOTES
    ===================================== */

    function initializeNotesDragDrop() {
        const grid = document.getElementById('notesGrid');

        if (!grid || grid.dataset.notesDragBound === 'true') {
            return;
        }

        grid.dataset.notesDragBound = 'true';

        let suppressClick = false;

        grid.addEventListener('dragstart', event => {
            const card = event.target.closest('[data-note-card]');

            if (!card) return;

            const search = (
                document.getElementById('notesSearch')?.value || ''
            ).trim();

            if (search) {
                event.preventDefault();
                return;
            }

            draggedNoteId = card.dataset.noteCard;

            card.classList.add('dragging');

            suppressClick = true;

            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', draggedNoteId);
            }
        });

        grid.addEventListener('dragover', event => {
            if (!draggedNoteId) return;

            event.preventDefault();

            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
            }
        });

        grid.addEventListener('drop', event => {
            if (!draggedNoteId) return;

            event.preventDefault();

            const target = event.target.closest('[data-note-card]');

            if (!target) return;

            const targetId = target.dataset.noteCard;

            if (targetId === draggedNoteId) return;

            const visibleNotes = notes.filter(note =>
                grid.querySelector(`[data-note-card="${CSS.escape(note.id)}"]`)
            );

            const fromIndex = visibleNotes.findIndex(
                note => note.id === draggedNoteId
            );

            const toIndex = visibleNotes.findIndex(
                note => note.id === targetId
            );

            if (fromIndex < 0 || toIndex < 0) return;

            // Reorder the visible notes.
            const reordered = [...visibleNotes];

            const movedNote = reordered.splice(fromIndex, 1)[0];

            reordered.splice(toIndex, 0, movedNote);

            // Keep hidden notes in their existing positions.
            let visibleIndex = 0;

            notes = notes.map(note => {
                const isVisible = visibleNotes.some(
                    visible => visible.id === note.id
                );

                if (!isVisible) return note;

                return reordered[visibleIndex++];
            });

            draggedNoteId = null;

            saveNotes();
        });

        grid.addEventListener('dragend', () => {
            grid.querySelectorAll('.dragging').forEach(card => {
                card.classList.remove('dragging');
            });

            draggedNoteId = null;

            setTimeout(() => {
                suppressClick = false;
            }, 100);
        });

        grid.addEventListener('click', event => {
            if (!suppressClick) return;

            event.preventDefault();
            event.stopPropagation();

            suppressClick = false;
        }, true);
    }

    /* =====================================
       CREATE / EDIT NOTE
    ===================================== */

    function openNoteModal(id = null) {
        const existing = notes.find(note => note.id === id);

        const note = existing || {
            title: '',
            content: ''
        };

        if (typeof showModal !== 'function') {
            console.error('WorkDesk showModal() was not found.');
            return;
        }

        const body = `
            <div class="form-grid">

                <div class="field">
                    <label for="noteTitle">Note title *</label>

                    <input
                        id="noteTitle"
                        maxlength="120"
                        value="${escapeNote(note.title)}"
                        placeholder="e.g. Follow-up reminders"
                        required
                    >
                </div>

                <div class="field">
                    <label for="noteContent">Note details</label>

                    <textarea
                        id="noteContent"
                        rows="10"
                        placeholder="Write your note here..."
                    >${escapeNote(note.content)}</textarea>
                </div>

            </div>
        `;

        showModal(
            id ? 'Edit note' : 'Create a note',
            body,
            () => {
                const title = document.getElementById('noteTitle')
                    .value.trim();

                const content = document.getElementById('noteContent')
                    .value;

                if (!title) {
                    if (typeof toast === 'function') {
                        toast('Please enter a note title');
                    }

                    document.getElementById('noteTitle').focus();
                    return;
                }

                const now = Date.now();

                if (id) {
                    notes = notes.map(item =>
                        item.id === id
                            ? {
                                ...item,
                                title,
                                content,
                                updated: now
                            }
                            : item
                    );
                } else {
                    notes.unshift({
                        id: noteId(),
                        title,
                        content,
                        created: now,
                        updated: now
                    });
                }

                if (typeof closeModal === 'function') {
                    closeModal();
                }

                saveNotes();
            }
        );
    }

    function editNote(id) {
        openNoteModal(id);
    }

    /* =====================================
       DELETE NOTE
    ===================================== */

    function deleteNote(id) {
        const note = notes.find(item => item.id === id);

        if (!note) return;

        if (confirm(`Delete the note "${note.title}"?`)) {
            notes = notes.filter(item => item.id !== id);

            saveNotes();

            if (typeof toast === 'function') {
                toast('Note deleted');
            }
        }
    }

    /* =====================================
       EXPOSE FUNCTIONS
    ===================================== */

    window.openNoteModal = openNoteModal;
    window.editNote = editNote;
    window.deleteNote = deleteNote;
    window.renderNotes = renderNotes;

    /* =====================================
       INITIALIZE
    ===================================== */

    function init() {
        bindNotesNavigation();
        bindSearch();
        initializeNotesDragDrop();
        renderNotes();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, {
            once: true
        });
    } else {
        init();
    }

})();
