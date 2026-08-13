# Frontend & Progressive Web App (PWA)

The IRONLOG frontend is a highly optimized, zero-build Vanilla JavaScript application. It is designed to look, feel, and act like a native mobile application.

## Core Files & Structure

- `frontend/index.html`: The landing/marketing page.
- `frontend/login.html` & `register.html`: Authentication flows.
- `frontend/js/api.js`: The central networking and offline-queue logic.
- `frontend/js/layout.js`: Global App Shell logic, navigation, and sidebar toggling.
- `frontend/css/style.css` & `polish.css`: The primary design system and theming variables.
- `frontend/sw.js`: The Service Worker for caching and PWA installation.

## PWA & Offline-First Strategy

Gym environments often have terrible cellular reception. IRONLOG is built to handle this gracefully.

### 1. The Service Worker (`sw.js`)
The Service Worker caches all static assets (HTML, CSS, JS, Fonts, Icons) on the user's device. When the user opens the app offline, the Service Worker intercepts network requests and serves the cached interface instantly.

### 2. Network Interceptor (`api.js`)
All API calls pass through the `apiRequest` wrapper in `api.js`.
- If a `GET` request fails due to lack of connection, it returns `{ _offline: true }`. The UI catches this and displays empty states or cached data instead of crashing.
- If a `POST/PUT/DELETE` request fails, it is appended to an **IndexedDB Offline Queue**.

### 3. Background Sync
When the browser regains connectivity, `api.js` automatically begins flushing the IndexedDB queue, pushing all the logged workouts and metrics to the server seamlessly in the background.

## UI / UX Principles

1. **Skeleton Loaders**: To prevent jarring layout shifts (Cumulative Layout Shift - CLS), the app uses CSS skeleton loaders (`frontend/js/skeleton.js`) while data is being fetched. Once `Promise.all` resolves, `window.hideLoading()` is called, and the real UI is rendered.
2. **Empty States**: If a user has no data, centralized hero empty states with clear CTAs (e.g., "Log your first workout") are displayed instead of broken charts or blank grids.
3. **Accessibility (a11y)**: Buttons feature `aria-label`s, and contrast ratios (specifically in Dark Mode) are strictly maintained above WCAG AA standards (4.5:1).
4. **Security**: Because it is vanilla JS, all dynamic user input injected into the DOM is rigorously sanitized using `escapeHtml()` and `DOMPurify` to prevent Cross-Site Scripting (XSS).
