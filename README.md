# Flux Todo

A single-page, mobile-first to-do app with a warm gradient aesthetic, category color-coding, and a persistent per-user data store. No build step, no backend to run — it's plain HTML, CSS, and JavaScript.

## Features

- **Tasks** — create, edit, duplicate, pin, and delete tasks with a title, description, deadline, status, category, color, and optional emoji.
- **Status workflow** — each task is `To Do`, `In Progress`, or `Completed`, with quick status tabs and counts at the top of the list.
- **Categories** — default categories (Personal, Work, Shopping, Health) plus custom categories with your own name and color; deleting a category reassigns its tasks to the first remaining one.
- **Search & sort** — live text search across title/description, and sort by date created, due date, alphabetical, or category color.
- **Progress ring** — an animated completion ring and headline summary, with a confetti burst (plus a bonus gold sparkle animation) when you hit 100%.
- **Task actions menu** (kebab menu) — change status, pin/unpin, move to another category, view full details, read the task aloud (Web Speech API), share (native share sheet or clipboard), edit, duplicate, or delete.
- **Profile** — set a display name, upload an avatar image, and see total/completed task stats.
- **Theme toggle** — light/dark mode, switchable from the sidebar or profile sheet.
- **Transfer** — export all tasks, categories, and profile data as a `.json` backup file, or import a backup to merge it into your current data.
- **Purge tools** — clear only completed tasks, or delete everything.
- **Log out & reset** — clears your local name/avatar and dismissed banners without deleting your tasks.
- Ambient decorative touches: an aurora background and a twinkling sparkle field.

## Tech stack

- **HTML/CSS/JS** — no frameworks, no build tools.
- **Fonts** — Fraunces, Plus Jakarta Sans, and IBM Plex Mono, loaded from Google Fonts.
- **Storage** — uses a `window.storage` key-value API (`get`/`set` on an `app-state` key) to persist all app data per user. This means the app expects to run in an environment that provides this storage API rather than using `localStorage` directly.

## File structure

```
.
├── index.html      # Markup: layout, sheets/modals, sidebar, forms
├── styles.css       # Styling, theme variables, animations
├── script.js        # App logic: state, rendering, storage, event wiring
└── favicon.png       # App icon
```

## Running it

Since it relies on the `window.storage` API for persistence rather than a generic browser storage mechanism, it's built to run inside a host environment that injects that API (rather than being opened as a bare static file). If you want to run it as a fully standalone static site, you'd need to supply a `window.storage` implementation (e.g. backed by `localStorage`) before `script.js` runs.

## Data model

State is a single JSON object with:
- `tasks[]` — id, title, description, deadline, status, categoryId, emoji, pinned, createdAt
- `categories[]` — id, name, color
- `profile` — name, avatar (data URL), registered timestamp
- `settings` — theme, sort order, dismissed-banner flag, greeting subtitle index

Exports/imports use this same shape (minus `settings`) as the backup file format.

## Notes

- All rendering is done via direct DOM manipulation and `innerHTML`, with no framework.
- Task list writes are debounced (150ms) before saving to storage.
