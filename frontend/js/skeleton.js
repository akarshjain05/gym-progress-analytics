/**
 * skeleton.js — IRONLOG Loading Skeleton Screens
 *
 * Replaces the spinning loader with animated placeholder cards
 * that exactly match each page's real layout.
 *
 * Usage: call Skeleton.show('dashboard') from layout.js or each page's JS.
 * Automatically dismissed when real content appears (MutationObserver).
 *
 * Include after layout.js on every inner page.
 */

(function () {
  'use strict';

  // ── Skeleton templates per page ───────────────────────────────────────────
  const TEMPLATES = {

    dashboard: `
      <div class="sk-page">
        <!-- Stats row: 4 cards -->
        <div class="sk-grid-4">
          ${repeat(4, '<div class="sk-card"><div class="sk-line sk-line-sm"></div><div class="sk-line sk-line-xl sk-mt8"></div><div class="sk-line sk-line-md sk-mt6"></div></div>')}
        </div>
        <!-- Insights block -->
        <div class="sk-card sk-mt16">
          <div class="sk-line sk-line-sm"></div>
          ${repeat(4, '<div class="sk-line sk-line-full sk-mt10"></div>')}
        </div>
        <!-- Quick log -->
        <div class="sk-card sk-mt16">
          <div class="sk-line sk-line-sm"></div>
          <div class="sk-grid-3 sk-mt12">
            ${repeat(3, '<div class="sk-card-inner"><div class="sk-circle"></div><div class="sk-line sk-line-md sk-mt8"></div><div class="sk-line sk-line-sm sk-mt4"></div></div>')}
          </div>
        </div>
      </div>`,

    weight: `
      <div class="sk-page">
        <!-- Stats row -->
        <div class="sk-grid-3">
          ${repeat(3, '<div class="sk-card"><div class="sk-line sk-line-sm"></div><div class="sk-line sk-line-xl sk-mt8"></div><div class="sk-line sk-line-md sk-mt6"></div></div>')}
        </div>
        <!-- Chart -->
        <div class="sk-card sk-mt16">
          <div class="sk-line sk-line-sm"></div>
          <div class="sk-chart sk-mt12"></div>
        </div>
        <!-- Log form -->
        <div class="sk-card sk-mt16">
          <div class="sk-line sk-line-sm"></div>
          <div class="sk-grid-2 sk-mt12">
            <div class="sk-input"></div>
            <div class="sk-input"></div>
          </div>
          <div class="sk-btn sk-mt12"></div>
        </div>
        <!-- History -->
        <div class="sk-card sk-mt16">
          <div class="sk-line sk-line-sm"></div>
          ${repeat(5, '<div class="sk-row sk-mt10"><div class="sk-line sk-line-md"></div><div class="sk-line sk-line-sm"></div><div class="sk-line sk-line-sm"></div></div>')}
        </div>
      </div>`,

    lifts: `
      <div class="sk-page">
        <!-- Exercise selector pills -->
        <div class="sk-pills sk-mt4">
          ${repeat(6, '<div class="sk-pill"></div>')}
        </div>
        <!-- Exercise dropdown -->
        <div class="sk-input sk-mt12" style="max-width:280px;"></div>
        <!-- Stats row -->
        <div class="sk-grid-3 sk-mt16">
          ${repeat(3, '<div class="sk-card"><div class="sk-line sk-line-sm"></div><div class="sk-line sk-line-xl sk-mt8"></div><div class="sk-line sk-line-md sk-mt6"></div></div>')}
        </div>
        <!-- Strength scale -->
        <div class="sk-card sk-mt16">
          <div class="sk-line sk-line-sm"></div>
          <div class="sk-scale sk-mt12"></div>
        </div>
        <!-- Chart -->
        <div class="sk-card sk-mt16">
          <div class="sk-line sk-line-sm"></div>
          <div class="sk-chart sk-mt12"></div>
        </div>
        <!-- Sessions -->
        <div class="sk-card sk-mt16">
          <div class="sk-line sk-line-sm"></div>
          ${repeat(3, `<div class="sk-session-row sk-mt10">
            <div class="sk-line sk-line-lg"></div>
            <div class="sk-line sk-line-md"></div>
          </div>`)}
        </div>
      </div>`,

    nutrition: `
      <div class="sk-page">
        <!-- Stats row -->
        <div class="sk-grid-4">
          ${repeat(4, '<div class="sk-card"><div class="sk-line sk-line-sm"></div><div class="sk-line sk-line-xl sk-mt8"></div></div>')}
        </div>
        <!-- Chart -->
        <div class="sk-card sk-mt16">
          <div class="sk-line sk-line-sm"></div>
          <div class="sk-chart sk-mt12"></div>
        </div>
        <!-- Log form -->
        <div class="sk-card sk-mt16">
          <div class="sk-line sk-line-sm"></div>
          <div class="sk-grid-2 sk-mt12">
            ${repeat(4, '<div class="sk-input"></div>')}
          </div>
          <div class="sk-btn sk-mt12"></div>
        </div>
      </div>`,

    analytics: `
      <div class="sk-page">
        <!-- Consistency ring + weight card -->
        <div class="sk-grid-2">
          <div class="sk-card">
            <div class="sk-line sk-line-sm"></div>
            <div class="sk-ring sk-mt16"></div>
            ${repeat(4, '<div class="sk-row sk-mt10"><div class="sk-line sk-line-md"></div><div class="sk-line sk-line-sm"></div></div>')}
          </div>
          <div class="sk-card">
            <div class="sk-line sk-line-sm"></div>
            <div class="sk-grid-3 sk-mt12">
              ${repeat(3, '<div class="sk-card-inner"><div class="sk-line sk-line-xl"></div><div class="sk-line sk-line-sm sk-mt4"></div></div>')}
            </div>
          </div>
        </div>
        <!-- Strength -->
        <div class="sk-card sk-mt16">
          <div class="sk-line sk-line-sm"></div>
          ${repeat(4, `<div class="sk-session-row sk-mt12">
            <div class="sk-line sk-line-lg"></div>
            <div class="sk-grid-3 sk-mt6">
              ${repeat(3, '<div class="sk-card-inner"><div class="sk-line sk-line-xl"></div></div>')}
            </div>
          </div>`)}
        </div>
        <!-- Volume bars -->
        <div class="sk-card sk-mt16">
          <div class="sk-line sk-line-sm"></div>
          ${repeat(5, `<div class="sk-vol-row sk-mt12">
            <div class="sk-line sk-line-md"></div>
            <div class="sk-vol-bar sk-mt6"></div>
          </div>`)}
        </div>
      </div>`,
  };

  function repeat(n, html) {
    return Array(n).fill(html).join('');
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.Skeleton = {
    /**
     * Show skeleton for a page type.
     * @param {string} page - 'dashboard' | 'weight' | 'lifts' | 'nutrition' | 'analytics'
     * @param {string} [containerId='pageContent'] - ID of container to fill
     */
    show(page, containerId = 'pageContent') {
      const container = document.getElementById(containerId);
      if (!container) return;

      const template = TEMPLATES[page];
      if (!template) return;

      // Inject skeleton
      container.innerHTML = `<div class="sk-wrapper" id="sk-active">${template}</div>`;

      // Auto-remove when real content appears
      this._watchForContent(container);
    },

    /** Manually hide skeleton */
    hide(containerId = 'pageContent') {
      const wrapper = document.getElementById('sk-active');
      if (wrapper) {
        wrapper.classList.add('sk-fadeout');
        setTimeout(() => wrapper.remove(), 300);
      }
    },

    _watchForContent(container) {
      // Remove skeleton when any non-skeleton child appears
      const REAL_CONTENT_SELECTORS = [
        '.stats-card', '.stat-card', '.dash-grid', '.chart-card',
        '.log-entry', '.lift-row', '.session-group', '.pr-group',
        '.coach-card', '.vol-row', '.strength-row',
        '[data-loaded]', '.entry-list', '.empty-state',
      ].join(',');

      const observer = new MutationObserver(() => {
        const hasReal = container.querySelector(REAL_CONTENT_SELECTORS);
        if (hasReal) {
          this.hide();
          observer.disconnect();
        }
      });

      observer.observe(container, { childList: true, subtree: true });

      // Hard timeout — always remove after 8s
      setTimeout(() => {
        this.hide();
        observer.disconnect();
      }, 8000);
    },
  };

})();
