/* ===========================================================================
   LIVE / DASHBOARD VIEW
   Read-only companion to index.html. Reads the same localStorage payload the
   editor writes (deliverySchedule_v1), strips every trace of editing UI, and
   renders a clean, mobile-friendly board.

   Nothing here writes to the schedule key. The only thing this page persists
   is its own theme preference.
   ========================================================================= */
(function () {
  'use strict';

  var LS_KEY    = 'deliverySchedule_v1';
  var THEME_KEY = 'deliveryLiveTheme';

  var contentEl = document.getElementById('liveContent');
  var statusEl  = document.getElementById('liveStatus');
  var titleEl   = document.getElementById('liveTitle');
  var subEl     = document.getElementById('liveSubtitle');
  var cutoffEl  = document.getElementById('liveCutoff');
  var updatedEl = document.getElementById('liveUpdated');

  /* ── Theme ─────────────────────────────────────────────────────────────── */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  var themeBtn = document.getElementById('liveThemeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  /* ── Status message ────────────────────────────────────────────────────── */
  function showStatus(html) {
    statusEl.innerHTML = html;
    statusEl.hidden = false;
  }

  /* ── Strip everything interactive or edit-related ──────────────────────── */
  var STRIP = [
    '.add-slot-row', '.add-ref-row', '.ref-resize-handle', '.card-del-btn',
    '.color-panel-toggle-btn', '.color-panel', '.slot-del-btn', '.row-del-btn',
    '.fac-add-ref-btn', '.card-resize-handle', '.card-resize-handle-x',
    '.drag-handle', '.ref-drag-cell', '.ref-del-btn', '.add-fac-btn',
    '.edit-banner', '.toolbar', '.add-card-btn', '.slot-add-btn',
    '[data-edit-only]', '.free-board-hint'
  ].join(',');

  function sanitize(root) {
    root.querySelectorAll(STRIP).forEach(function (n) { n.remove(); });

    // Remove editability and any leftover handlers/ids that could collide
    root.querySelectorAll('[contenteditable]').forEach(function (n) {
      n.removeAttribute('contenteditable');
      n.removeAttribute('data-editable');
      n.removeAttribute('spellcheck');
    });
    root.querySelectorAll('[draggable]').forEach(function (n) {
      n.removeAttribute('draggable');
    });
    Array.prototype.forEach.call(root.querySelectorAll('*'), function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        if (a.name.indexOf('on') === 0) n.removeAttribute(a.name);
      });
    });
    root.querySelectorAll('script').forEach(function (n) { n.remove(); });

    /* Inline heights/widths come from the editor's resize handles and are
       tuned for a wide desktop board. They cause clipping on a phone, so
       drop them and let content size itself. */
    root.querySelectorAll('.card, .card-list, .free-card').forEach(function (n) {
      n.style.removeProperty('height');
      n.style.removeProperty('min-height');
      n.style.removeProperty('max-height');
      n.style.removeProperty('width');
      n.style.removeProperty('min-width');
      n.style.removeProperty('max-width');
    });
    return root;
  }

  /* ── Tabs (mobile shows one pane at a time) ────────────────────────────── */
  function initTabs() {
    var tabs = document.querySelectorAll('.live-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('active', on);
          t.setAttribute('aria-selected', String(on));
        });
        document.body.dataset.view = tab.dataset.view;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
    document.body.dataset.view = 'timeline';
  }

  /* ── Relative "updated" label ──────────────────────────────────────────── */
  function relTime(iso) {
    if (!iso) return 'Last updated: unknown';
    var then = new Date(iso);
    if (isNaN(then)) return 'Last updated: unknown';
    var mins = Math.round((Date.now() - then.getTime()) / 60000);
    var label;
    if (mins < 1)        label = 'just now';
    else if (mins < 60)  label = mins + ' min ago';
    else if (mins < 1440) {
      var h = Math.round(mins / 60);
      label = h + (h === 1 ? ' hour ago' : ' hours ago');
    } else {
      var d = Math.round(mins / 1440);
      label = d + (d === 1 ? ' day ago' : ' days ago');
    }
    return 'Updated ' + label + ' · ' + then.toLocaleString([], {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  /* ── Load and render ───────────────────────────────────────────────────── */
  function render() {
    var raw;
    try { raw = localStorage.getItem(LS_KEY); }
    catch (e) {
      showStatus('<strong>Storage unavailable.</strong> This browser is blocking local storage, so the schedule can\u2019t be read.');
      return;
    }

    if (!raw) {
      showStatus(
        '<strong>No saved schedule found in this browser.</strong>' +
        '<p>This dashboard reads the schedule saved by the editor on this same device and browser. ' +
        'Open the <a href="index.html">editor</a>, press <em>Save</em>, then come back.</p>'
      );
      return;
    }

    var data;
    try { data = JSON.parse(raw); }
    catch (e) {
      showStatus('<strong>Saved schedule could not be read.</strong> The stored data appears to be corrupted.');
      return;
    }

    if (!data || !data.html) {
      showStatus('<strong>Saved schedule is empty.</strong> Open the <a href="index.html">editor</a> and save again.');
      return;
    }

    // Theme: explicit live preference wins, otherwise follow the saved schedule
    var stored;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) {}
    applyTheme(stored || data.theme || 'light');

    // Header text
    if (data.header) {
      if (data.header.title)    titleEl.innerHTML = data.header.title;
      if (data.header.subtitle) subEl.innerHTML   = data.header.subtitle;
      if (data.header.cutoff) {
        cutoffEl.innerHTML = data.header.cutoff;
        cutoffEl.hidden = false;
      }
    }
    document.title = (titleEl.textContent || 'Delivery Schedule').trim() + ' — Live';

    // Body
    var holder = document.createElement('div');
    holder.innerHTML = data.html;
    sanitize(holder);

    // Carry over the saved Quick Reference font size
    var ref = holder.querySelector('#refSection');
    if (ref && data.refFontSize) ref.style.setProperty('--ref-font-size', data.refFontSize);

    contentEl.appendChild(holder);
    updatedEl.textContent = relTime(data.ts);
    initTabs();
  }

  render();

  /* Reflect edits made in another tab without a manual refresh */
  window.addEventListener('storage', function (e) {
    if (e.key === LS_KEY) location.reload();
  });
})();
