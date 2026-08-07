# Flux Todo — Multi-Page Edition

A mobile-first to-do app with a warm gradient aesthetic, category color-coding, and a persistent per-user data store — now split into a real multi-page site (one HTML file per sidebar section) instead of a single-page app. No build step, no backend to run.

## Pages

| File | Section |
|---|---|
| `index.html` | Tasks — list/board view, search, sort, progress ring |
| `add-task.html` | Add Task (also used for editing via `?id=<taskId>`) |
| `categories.html` | Categories — add, edit, delete |
| `purge.html` | Purge Tasks — clear completed / delete all |
| `transfer.html` | Transfer — export / import a `.json` backup |
| `sync.html` | Sync Devices — storage status |
| `profile.html` | Profile — name/avatar, theme, password field, logout |

Every page shares the same sidebar, topbar, toast, and confirm-modal markup, and every navigation link is a real `<a href="...">` — no client-side routing, no single-page-app framework.

## Scripts

- **`core.js`** — loaded on every page. Holds shared state, storage (`window.storage` get/set on the `app-state` key, with a `localStorage` fallback), utilities, theme, sidebar, toast, and the confirm modal. Exposes everything through `window.Flux`.
- **`tasks.js`**, **`task-form.js`**, **`categories.js`**, **`purge.js`**, **`transfer.js`**, **`sync.js`**, **`profile.js`** — one file per page, containing only that page's rendering and event logic. Each calls into `window.Flux` for shared state/utilities.

## Tech stack

- Plain HTML/CSS/JS — no frameworks, no build tools.
- Fonts: Fraunces, Plus Jakarta Sans, IBM Plex Mono (Google Fonts).
- Drag-and-drop kanban board on the Tasks page uses `sortable.min.js`.

## Running it

Since it relies on the `window.storage` API for persistence, it's built to run inside a host environment that injects that API. Opened as a bare set of static files (e.g. via a local server), it automatically falls back to `localStorage` so it still works standalone — just serve the folder over HTTP (opening `index.html` directly via `file://` will not work because of the ES-module-free but fetch/storage-dependent script loading; use something like `npx serve` or `python3 -m http.server`).

## Data model

Unchanged from the single-page version — a single JSON object with `tasks[]`, `categories[]`, `profile`, and `settings`, stored under the `app-state` key. Export/import in Transfer uses the same shape (minus `settings`).