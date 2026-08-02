/* ===========================================================================
   LIVE / DASHBOARD VIEW  —  v31
   Read-only companion to index.html. Reads the same localStorage payload the
   editor writes (deliverySchedule_v1), strips every trace of editing UI, and
   renders a clean, mobile-friendly board.

   v31 adds:
     • Dashboard Options panel (gear) — Quick Reference on/off, Quick Reference
       placement (right / left / top / bottom), auto-scroll, dim-past, refresh
     • Time-aware positioning: on load/refresh the board scrolls to the slot
       that is happening now (or the next one up), and badges it

   Nothing here writes to the schedule key. The only things this page persists
   are its own theme and its own options.
   ========================================================================= */
(function () {
  'use strict';

  var LS_KEY    = 'deliverySchedule_v1';
  var THEME_KEY = 'deliveryLiveTheme';
  var OPTS_KEY  = 'deliveryLiveOpts';

  var contentEl = document.getElementById('liveContent');
  var statusEl  = document.getElementById('liveStatus');
  var titleEl   = document.getElementById('liveTitle');
  var subEl     = document.getElementById('liveSubtitle');
  var cutoffEl  = document.getElementById('liveCutoff');
  var updatedEl = document.getElementById('liveUpdated');
  var refTabEl  = document.getElementById('liveRefTab');

  /* ── Options ───────────────────────────────────────────────────────────── */
  var DEFAULTS = {
    ref: 'on',          // on | off
    refPos: 'right',    // right | left | top | bottom
    autoScroll: 'on',   // on | off
    dimPast: 'on',      // on | off
    refresh: '0'        // minutes, '0' = off
  };

  function loadOpts() {
    var o = {};
    try { o = JSON.parse(localStorage.getItem(OPTS_KEY) || '{}') || {}; }
    catch (e) { o = {}; }
    var out = {};
    for (var k in DEFAULTS) {
      out[k] = Object.prototype.hasOwnProperty.call(o, k) ? String(o[k]) : DEFAULTS[k];
    }
    // Guard against a hand-edited / stale value putting the page in a state
    // with no matching CSS.
    if (['right', 'left', 'top', 'bottom'].indexOf(out.refPos) === -1) out.refPos = 'right';
    if (['on', 'off'].indexOf(out.ref) === -1) out.ref = 'on';
    return out;
  }

  var opts = loadOpts();

  function saveOpts() {
    try { localStorage.setItem(OPTS_KEY, JSON.stringify(opts)); } catch (e) {}
  }

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

  /* ── Time helpers ──────────────────────────────────────────────────────── */
  function parseTimeToMinutes(txt) {
    if (!txt) return null;
    var m = String(txt).trim().match(/(\d{1,2}):(\d{2})\s*([AaPp])[Mm]?/);
    if (!m) return null;
    var hour = parseInt(m[1], 10);
    var min  = parseInt(m[2], 10);
    var pm   = m[3].toUpperCase() === 'P';
    if (pm && hour !== 12) hour += 12;
    if (!pm && hour === 12) hour = 0;
    return hour * 60 + min;
  }

  function rowMinutes(row) {
    var chip = row.querySelector('.time-chip');
    var fromChip = parseTimeToMinutes(chip && chip.textContent);
    if (fromChip !== null) return fromChip;
    return parseTimeToMinutes(row.getAttribute('data-time'));
  }

  /* Rows the editor writes are already in chronological order, but a hand-added
     slot can land out of sequence — so pick by clock value, not by position. */
  function visibleRows() {
    return Array.prototype.filter.call(
      contentEl.querySelectorAll('.timeline-row'),
      function (r) { return r.offsetParent !== null || r.getClientRects().length; }
    );
  }

  /* ── Mark "now" / past slots and scroll to the right place ─────────────── */
  var GRACE_MIN = 30; // a slot stays "current" for half an hour after its time

  function markAndLocate() {
    var rows = visibleRows();
    if (!rows.length) return null;

    var now = new Date();
    var nowMins = now.getHours() * 60 + now.getMinutes();

    var timed = [];
    rows.forEach(function (row) {
      row.classList.remove('live-now-row', 'live-past-row');
      var badge = row.querySelector('.live-now-badge');
      if (badge) badge.remove();
      var mins = rowMinutes(row);
      if (mins !== null) timed.push({ row: row, mins: mins });
    });
    if (!timed.length) return null;

    timed.sort(function (a, b) { return a.mins - b.mins; });

    // Current slot = the most recent one within the grace window.
    // Otherwise the next one coming up. Past everything → the last slot.
    var target = null, isNow = false;
    for (var i = timed.length - 1; i >= 0; i--) {
      if (timed[i].mins <= nowMins && nowMins - timed[i].mins <= GRACE_MIN) {
        target = timed[i]; isNow = true; break;
      }
    }
    if (!target) {
      for (var j = 0; j < timed.length; j++) {
        if (timed[j].mins >= nowMins) { target = timed[j]; break; }
      }
    }
    if (!target) target = timed[timed.length - 1];

    timed.forEach(function (t) {
      if (opts.dimPast === 'on' && t.mins < target.mins) t.row.classList.add('live-past-row');
    });

    target.row.classList.add('live-now-row');
    var label = isNow ? 'NOW' : (target.mins >= nowMins ? 'UP NEXT' : 'LAST RUN');
    var host = target.row.querySelector('.time-col') || target.row.firstElementChild;
    if (host) {
      var b = document.createElement('span');
      b.className = 'live-now-badge';
      b.textContent = label;
      host.appendChild(b);
    }
    return target.row;
  }

  function scrollToRow(row, smooth) {
    if (!row) return;
    var header = document.querySelector('.live-header');
    var offset = (header ? header.getBoundingClientRect().height : 0) + 12;
    var y = row.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'auto' });
  }

  var currentNowRow = null;

  function refreshNowMarker(scroll, smooth) {
    currentNowRow = markAndLocate();
    if (scroll && currentNowRow) {
      // Two frames: let the layout settle (fonts, sticky header) before we
      // measure, otherwise the offset lands short on a cold load.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { scrollToRow(currentNowRow, smooth); });
      });
    }
  }

  var nowBtn = document.getElementById('liveNowBtn');
  if (nowBtn) nowBtn.addEventListener('click', function () {
    // On a phone the timeline may be behind the other tab — switch back first.
    if (document.body.dataset.view === 'reference') selectTab('timeline');
    refreshNowMarker(true, true);
  });

  /* ── Layout / options application ──────────────────────────────────────── */
  function applyOpts() {
    var b = document.body;
    b.dataset.ref    = opts.ref;
    b.dataset.refPos = opts.refPos;
    b.dataset.dimPast = opts.dimPast;

    // Placement is meaningless when the sidebar is hidden
    var posRow = document.getElementById('optRefPosRow');
    if (posRow) posRow.classList.toggle('is-disabled', opts.ref === 'off');

    // Hiding Quick Reference must also remove its mobile tab, or the user can
    // land on an empty pane with no way back except the Timeline tab.
    if (refTabEl) {
      refTabEl.hidden = opts.ref === 'off';
      if (opts.ref === 'off' && b.dataset.view === 'reference') selectTab('timeline');
    }

    syncOptButtons();
    startRefreshTimer();
  }

  function syncOptButtons() {
    var map = {
      optRefShow:    'ref',
      optRefPos:     'refPos',
      optAutoScroll: 'autoScroll',
      optDimPast:    'dimPast',
      optRefresh:    'refresh'
    };
    Object.keys(map).forEach(function (id) {
      var group = document.getElementById(id);
      if (!group) return;
      group.querySelectorAll('.live-opt-btn').forEach(function (btn) {
        var on = btn.dataset.val === opts[map[id]];
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', String(on));
      });
    });
  }

  function wireOptGroup(id, key, after) {
    var group = document.getElementById(id);
    if (!group) return;
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('.live-opt-btn');
      if (!btn || !group.contains(btn)) return;
      opts[key] = btn.dataset.val;
      saveOpts();
      applyOpts();
      if (after) after();
    });
  }

  /* ── Options panel open/close ──────────────────────────────────────────── */
  (function initOptsPanel() {
    var btn   = document.getElementById('liveOptsBtn');
    var panel = document.getElementById('liveOptsPanel');
    if (!btn || !panel) return;

    function close() {
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('active');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.classList.toggle('active', open);
    });
    document.addEventListener('click', function (e) {
      if (panel.hidden) return;
      if (panel.contains(e.target) || btn.contains(e.target)) return;
      close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  })();

  wireOptGroup('optRefShow', 'ref', function () {
    // The sidebar appearing/disappearing reflows the timeline, so re-measure.
    refreshNowMarker(false);
  });
  wireOptGroup('optRefPos', 'refPos', function () {
    refreshNowMarker(false);
  });
  wireOptGroup('optAutoScroll', 'autoScroll');
  wireOptGroup('optDimPast', 'dimPast', function () {
    refreshNowMarker(false);
  });
  wireOptGroup('optRefresh', 'refresh');

  /* ── Auto-refresh ──────────────────────────────────────────────────────── */
  var refreshTimer = null;
  function startRefreshTimer() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    var mins = parseInt(opts.refresh, 10);
    if (!mins) return;
    refreshTimer = setInterval(function () { location.reload(); }, mins * 60000);
  }

  /* Keep the NOW marker honest even without a full reload. */
  setInterval(function () { refreshNowMarker(false); }, 60000);

  /* ── Tabs (mobile shows one pane at a time) ────────────────────────────── */
  function selectTab(view) {
    var tabs = document.querySelectorAll('.live-tab');
    tabs.forEach(function (t) {
      var on = t.dataset.view === view;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    document.body.dataset.view = view;
  }

  function initTabs() {
    document.querySelectorAll('.live-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        selectTab(tab.dataset.view);
        if (tab.dataset.view === 'timeline') refreshNowMarker(true, true);
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
    selectTab('timeline');
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
      return false;
    }

    if (!raw) {
      showStatus(
        '<strong>No saved schedule found in this browser.</strong>' +
        '<p>This dashboard reads the schedule saved by the editor on this same device and browser. ' +
        'Open the <a href="index.html">editor</a>, press <em>Save</em>, then come back.</p>'
      );
      return false;
    }

    var data;
    try { data = JSON.parse(raw); }
    catch (e) {
      showStatus('<strong>Saved schedule could not be read.</strong> The stored data appears to be corrupted.');
      return false;
    }

    if (!data || !data.html) {
      showStatus('<strong>Saved schedule is empty.</strong> Open the <a href="index.html">editor</a> and save again.');
      return false;
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

    /* The editor saves printArea.innerHTML — the CHILDREN of .main-layout, not
       the element itself. Without re-applying that class here the two-column
       flex rules in live.css have nothing to match, which is why the sidebar
       used to fall below the timeline on desktop. */
    var holder = document.createElement('div');
    holder.className = 'main-layout live-layout';
    holder.innerHTML = data.html;
    sanitize(holder);

    // Carry over the saved Quick Reference font size
    var ref = holder.querySelector('#refSection');
    if (ref && data.refFontSize) ref.style.setProperty('--ref-font-size', data.refFontSize);

    contentEl.appendChild(holder);
    updatedEl.textContent = relTime(data.ts);
    initTabs();
    return true;
  }

  var ok = render();
  applyOpts();
  if (ok) refreshNowMarker(opts.autoScroll === 'on', false);

  /* Reflect edits made in another tab without a manual refresh */
  window.addEventListener('storage', function (e) {
    if (e.key === LS_KEY) location.reload();
  });
})();
