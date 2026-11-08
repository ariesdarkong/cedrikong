
/* =========================================
   WORKDESK NOTES SYSTEM
   Standalone Notes Manager
   ========================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "workdesk_notes_v1";

    let notes = [];

    // =========================================
    // LOAD AND SAVE NOTES
    // =========================================

    function loadNotes() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            notes = saved ? JSON.parse(saved) : [];

            if (!Array.isArray(notes)) {
                notes = [];
            }
        } catch (error) {
            console.error("Error loading notes:", error);
            notes = [];
        }
    }

    function saveNotes() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
            renderNotes();
            showNoteToast("Note saved successfully!");
        } catch (error) {
            console.error("Error saving notes:", error);
            showNoteToast("Unable to save note.");
        }
    }

    // =========================================
    // HELPERS
    // =========================================

    function createNoteId() {
        return Date.now().toString(36) +
            Math.random().toString(36).substring(2, 9);
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function showNoteToast(message) {
        const toast = document.getElementById("toast");

        if (toast) {
            toast.textContent = message;
            toast.classList.add("show");

            setTimeout(() => {
                toast.classList.remove("show");
            }, 2500);
        } else {
            console.log(message);
        }
    }

    // =========================================
    // OPEN NOTE MODAL
    // =========================================

    function openNoteModal(id = null) {

        const existingNote = notes.find(note => note.id === id);

        const note = existingNote || {
            title: "",
            content: ""
        };

        const backdrop = document.getElementById("modalBackdrop");
        const modalTitle = document.getElementById("modalTitle");
        const modalBody = document.getElementById("modalBody");
        const saveButton = document.getElementById("modalSave");

        if (!backdrop || !modalTitle || !modalBody || !saveButton) {
            console.error("Notes modal elements are missing.");
            alert("The Notes modal could not be found. Please check your HTML.");
            return;
        }

        // Set modal heading
        modalTitle.textContent = id ? "Edit Note" : "Create New Note";

        // Create modal content
        modalBody.innerHTML = `
            <div class="form-grid">

                <div class="field">
                    <label for="noteTitle">Note Title *</label>

                    <input
                        type="text"
                        id="noteTitle"
                        maxlength="120"
                        placeholder="Enter your note title..."
                        value="${escapeHTML(note.title)}"
                        required
                    >
                </div>

                <div class="field">
                    <label for="noteContent">Note Details</label>

                    <textarea
                        id="noteContent"
                        rows="10"
                        placeholder="Write your notes here..."
                    >${escapeHTML(note.content)}</textarea>
                </div>

            </div>
        `;

        // Display modal
        backdrop.classList.add("show");

        // Save button action
        saveButton.onclick = function () {

            const titleInput = document.getElementById("noteTitle");
            const contentInput = document.getElementById("noteContent");

            const title = titleInput.value.trim();
            const content = contentInput.value;

            if (!title) {
                alert("Please enter a note title.");
                titleInput.focus();
                return;
            }

            const now = Date.now();

            if (id) {

                // UPDATE EXISTING NOTE
                notes = notes.map(item => {
                    if (item.id === id) {
                        return {
                            ...item,
                            title: title,
                            content: content,
                            updated: now
                        };
                    }

                    return item;
                });

            } else {

                // CREATE NEW NOTE
                notes.unshift({
                    id: createNoteId(),
                    title: title,
                    content: content,
                    created: now,
                    updated: now
                });

            }

            closeNoteModal();
            saveNotes();
        };

        // Focus title field
        setTimeout(() => {
            document.getElementById("noteTitle")?.focus();
        }, 50);
    }

    // =========================================
    // CLOSE NOTE MODAL
    // =========================================

    function closeNoteModal() {
        const backdrop = document.getElementById("modalBackdrop");

        if (backdrop) {
            backdrop.classList.remove("show");
        }
    }

    // =========================================
    // EDIT NOTE
    // =========================================

    function editNote(id) {
        openNoteModal(id);
    }

    // =========================================
    // DELETE NOTE
    // =========================================

    function deleteNote(id) {

        const note = notes.find(item => item.id === id);

        if (!note) return;

        const confirmed = confirm(
            `Are you sure you want to delete "${note.title}"?`
        );

        if (!confirmed) return;

        notes = notes.filter(item => item.id !== id);

        saveNotes();

        showNoteToast("Note deleted successfully!");
    }

    // =========================================
    // DISPLAY NOTES
    // =========================================

    function renderNotes() {

        const grid = document.getElementById("notesGrid");
        const count = document.getElementById("notesCount");
        const searchInput = document.getElementById("notesSearch");

        if (!grid) return;

        const search = searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

        const filteredNotes = notes.filter(note => {
            const title = (note.title || "").toLowerCase();
            const content = (note.content || "").toLowerCase();

            return title.includes(search) || content.includes(search);
        });

        // Update note count
        if (count) {
            count.textContent =
                `${filteredNotes.length} ${
                    filteredNotes.length === 1 ? "note" : "notes"
                }`;
        }

        // Empty state
        if (filteredNotes.length === 0) {

            grid.innerHTML = `
                <div class="empty">
                    ${
                        search
                            ? "No notes match your search."
                            : "No notes yet. Click + New Note to create your first note."
                    }
                </div>
            `;

            return;
        }

        // Display note cards
        grid.innerHTML = filteredNotes.map(note => {

            const updated = note.updated
                ? new Date(note.updated).toLocaleString()
                : "Recently saved";

            return `
                <article class="info-card note-card">

                    <div class="card-title-row">
                        <div class="card-title">
                            ${escapeHTML(note.title || "Untitled Note")}
                        </div>

                        <span class="tag">Note</span>
                    </div>

                    <div class="note-updated">
                        Updated: ${escapeHTML(updated)}
                    </div>

                    <div class="card-content note-content">${escapeHTML(note.content || "")}</div>

                    <div class="card-footer">

                        <button
                            type="button"
                            class="note-edit-btn"
                            data-action="edit"
                            data-id="${escapeHTML(note.id)}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="danger"
                            data-action="delete"
                            data-id="${escapeHTML(note.id)}"
                        >
                            Delete
                        </button>

                    </div>

                </article>
            `;

        }).join("");
    }

    // =========================================
    // NOTES CARD BUTTON EVENTS
    // =========================================

    function bindNoteCardActions() {

        const grid = document.getElementById("notesGrid");

        if (!grid || grid.dataset.notesActionsBound === "true") {
            return;
        }

        grid.dataset.notesActionsBound = "true";

        grid.addEventListener("click", function(event) {

            const button = event.target.closest("button[data-action]");

            if (!button) return;

            const id = button.dataset.id;
            const action = button.dataset.action;

            if (action === "edit") {
                editNote(id);
            }

            if (action === "delete") {
                deleteNote(id);
            }
        });
    }

    // =========================================
    // SEARCH NOTES
    // =========================================

    function bindNoteSearch() {

        const searchInput = document.getElementById("notesSearch");

        if (!searchInput || searchInput.dataset.notesSearchBound === "true") {
            return;
        }

        searchInput.dataset.notesSearchBound = "true";

        searchInput.addEventListener("input", renderNotes);
    }

    // =========================================
    // NOTES NAVIGATION
    // =========================================

    function bindNotesNavigation() {

        const notesButton = document.getElementById("notesNavButton");

        if (!notesButton || notesButton.dataset.notesNavigationBound === "true") {
            return;
        }

        notesButton.dataset.notesNavigationBound = "true";

        notesButton.addEventListener("click", function() {

            if (typeof window.goPage === "function") {
                window.goPage("notes");
            } else {
                document.querySelectorAll(".page").forEach(page => {
                    page.classList.remove("active");
                });

                document.getElementById("page-notes")?.classList.add("active");
            }

            renderNotes();
        });
    }

    // =========================================
    // MODAL BACKDROP CLICK
    // =========================================

    function bindModalBackdrop() {

        const backdrop = document.getElementById("modalBackdrop");

        if (!backdrop || backdrop.dataset.notesBackdropBound === "true") {
            return;
        }

        backdrop.dataset.notesBackdropBound = "true";

        backdrop.addEventListener("click", function(event) {
            if (event.target === backdrop) {
                closeNoteModal();
            }
        });
    }

    // =========================================
    // INITIALIZE NOTES
    // =========================================

    function initNotes() {

        loadNotes();

        bindNoteCardActions();
        bindNoteSearch();
        bindNotesNavigation();
        bindModalBackdrop();

        renderNotes();

        console.log("WorkDesk Notes loaded successfully.");
    }

    // =========================================
    // MAKE FUNCTIONS AVAILABLE TO HTML
    // =========================================

    window.openNoteModal = openNoteModal;
    window.editNote = editNote;
    window.deleteNote = deleteNote;
    window.renderNotes = renderNotes;
    window.closeNoteModal = closeNoteModal;

    // =========================================
    // START NOTES
    // =========================================

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initNotes);
    } else {
        initNotes();
    }

})();
