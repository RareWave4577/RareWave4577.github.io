/* =============================================================================
   Delivery Schedule — Full App v30l
   Features: theme, edit mode, contenteditable, RTE toolbar, drag-and-drop,
             add/delete cards/rows/facilities/ref-rows, undo/redo, change log,
             print/PDF export, search/highlight, named schedules, builder
             autocomplete, duplicate card/row, quick-ref export, route print,
             cutoff countdown, facility status flags, infinite timeline +
             row counter, weekend routes toggle, 20-color route palette with
             upgraded swatch-panel pickers (tag/card/builder)
============================================================================= */
(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────────────
     DOM REFS
  ───────────────────────────────────────────────────────────────────────── */
  const html          = document.documentElement;
  const themeBtn      = document.getElementById('themeBtn');
  const editBtn       = document.getElementById('editToggleBtn');
  const editBanner    = document.getElementById('editBanner');
  const undoBtn       = document.getElementById('undoBtn');
  const redoBtn       = document.getElementById('redoBtn');
  const pdfBtn        = document.getElementById('exportPdfBtn');
  const exportDropdown= document.getElementById('exportDropdown');
  const expPrintBtn   = document.getElementById('expPrintBtn');
  const expSizeOpts   = document.getElementById('expSizeOptions');
  const expOrientOpts = document.getElementById('expOrientOptions');
  let   refSection    = document.getElementById('refSection');
  const refResizeHandle = document.getElementById('refResizeHandle');
  const clBtn         = document.getElementById('changelogBtn');
  const clPanel       = document.getElementById('changelogPanel');
  const clClose       = document.getElementById('changelogClose');
  const clOverlay     = document.getElementById('changelogOverlay');
  const clList        = document.getElementById('changelogList');
  const clEmpty       = document.getElementById('changelogEmpty');
  const clCount       = document.getElementById('changelogCount');
  const printArea     = document.getElementById('printArea');
  let   timeline      = document.getElementById('timeline');
  let   addSlotBtn    = document.getElementById('addSlotBtn');
  let   addRefBtn     = document.getElementById('addRefBtn');
  let   addFreeBoardBtn = document.getElementById('addFreeBoardBtn');
  let   addBannerBtn    = document.getElementById('addBannerBtn');
  let   freeBoard     = document.getElementById('freeBoard');
  let   refBody       = document.getElementById('refBody');
  const rteToolbar    = document.getElementById('rteToolbar');
  const rteSizeBtn  = document.getElementById('rteSizeBtn');
  const rteSizeMenu = document.getElementById('rteSizeMenu');
  const rteColorInput = document.getElementById('rteColorInput');
  const siteTitle     = document.getElementById('siteTitle');
  const siteSubtitle  = document.getElementById('siteSubtitle');
  const cutoffText    = document.getElementById('cutoffText');

  /* ─────────────────────────────────────────────────────────────────────────
     THEME
  ───────────────────────────────────────────────────────────────────────── */
  let theme = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  applyTheme(theme);

  themeBtn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
  });

  function applyTheme(t) {
    html.setAttribute('data-theme', t);
    themeBtn.querySelector('.icon-moon').style.display = t === 'dark' ? 'none'  : '';
    themeBtn.querySelector('.icon-sun').style.display  = t === 'dark' ? ''      : 'none';
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  /* ─────────────────────────────────────────────────────────────────────────
     HISTORY / UNDO-REDO
  ───────────────────────────────────────────────────────────────────────── */
  const MAX_HIST = 100;
  let hist    = [];
  let cursor  = -1;
  let _noSnap = false;
  let _debTimer = null;

  function captureHeader() {
    return {
      title:    siteTitle.innerHTML,
      subtitle: siteSubtitle.innerHTML,
      cutoff:   cutoffText.innerHTML
    };
  }

  function restoreHeader(h) {
    if (!h) return;
    siteTitle.innerHTML    = h.title;
    siteSubtitle.innerHTML = h.subtitle;
    cutoffText.innerHTML   = h.cutoff;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     RE-INJECT EDIT-ONLY UI
     Called after printArea.innerHTML is replaced (import / undo / localStorage).
     Puts back the add-slot-row, add-ref-row, and refResizeHandle which are
     stripped from snapshots/backups, then re-assigns all stale let-refs and
     re-wires event listeners on the fresh elements.
  ───────────────────────────────────────────────────────────────────────── */
  function _reinjectEditOnlyUI() {
    // ── Re-assign live DOM refs that lived inside printArea ──
    refSection    = document.getElementById('refSection');
    timeline      = document.getElementById('timeline');
    freeBoard     = document.getElementById('freeBoard');
    refBody       = document.getElementById('refBody');

    // ── 1. Add-slot-row (timeline) ──
    if (timeline && !timeline.querySelector('.add-slot-row')) {
      const slotRow = document.createElement('div');
      slotRow.className = 'add-slot-row edit-only';
      slotRow.innerHTML = `<button id="addSlotBtn" class="ghost-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Time Slot
      </button>
      <span id="slotCountBadge" class="slot-count-badge"></span>`;
      timeline.appendChild(slotRow);
    }

    // ── 2. Add-ref-row (refSection) ──
    if (refSection && !refSection.querySelector('.add-ref-row')) {
      const refRow = document.createElement('div');
      refRow.className = 'edit-only add-ref-row';
      refRow.innerHTML = `<button id="addRefBtn" class="ghost-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Facility
      </button>`;
      refSection.appendChild(refRow);
    }

    // ── 3. refResizeHandle ──
    if (refSection && !document.getElementById('refResizeHandle')) {
      const handle = document.createElement('div');
      handle.className = 'ref-resize-handle';
      handle.id = 'refResizeHandle';
      handle.title = 'Drag to resize';
      refSection.insertBefore(handle, refSection.firstChild);
    }

    // ── Re-assign button refs (may have been freshly injected above) ──
    addSlotBtn    = document.getElementById('addSlotBtn');
    addRefBtn     = document.getElementById('addRefBtn');
    addFreeBoardBtn = document.getElementById('addFreeBoardBtn');
    addBannerBtn    = document.getElementById('addBannerBtn');

    // ── Re-wire button listeners (guard with _wired flag to avoid duplicates) ──
    if (addSlotBtn && !addSlotBtn._wired) {
      addSlotBtn._wired = true;
      addSlotBtn.addEventListener('click', () => createRow(null));
    }
    if (addRefBtn && !addRefBtn._wired) {
      addRefBtn._wired = true;
      addRefBtn.addEventListener('click', () => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-ref-row', '');
        tr.innerHTML = `
          <td class="ref-td-name"><span class="ref-name" data-editable contenteditable="true">New Facility</span><span class="ref-type" data-editable contenteditable="true"></span></td>
          <td class="ref-td-times"><span class="ref-times" data-editable contenteditable="true">Time</span></td>`;
        refBody.appendChild(tr);
        initRefRow(tr);
        snapshot('Added reference entry');
        tr.querySelector('.ref-name').focus();
        document.execCommand('selectAll', false, null);
      });
    }
    if (addFreeBoardBtn && !addFreeBoardBtn._wired) {
      addFreeBoardBtn._wired = true;
      addFreeBoardBtn.addEventListener('click', addFreeBoardCard);
    }
    if (addBannerBtn && !addBannerBtn._wired) {
      addBannerBtn._wired = true;
      addBannerBtn.addEventListener('click', addBannerNote);
    }

    // ── Re-init newly-added features (Features 1/3/7/8) so they survive
    //    import / undo / schedule-switch DOM replacement ──
    if (window._rerunSearch) window._rerunSearch();
    if (window._refreshFacAutocomplete) window._refreshFacAutocomplete();
    if (window._startCountdownClock) window._startCountdownClock();
    if (window._applyAllFacStatuses) window._applyAllFacStatuses();
    updateSlotCountBadge();
    if (window._applyWeekendMode) window._applyWeekendMode();
  }

  /* ─────────────────────────────────────────────────────────────────
     TIMELINE ROW COUNTER BADGE (Feature: Infinite Timeline)
     No hard cap on timeline rows — createRow() may be called any number of
     times. This badge simply reflects the current count near the
     "+ Add Time Slot" button so it's clear the list can keep growing.
  ─────────────────────────────────────────────────────────────── */
  function updateSlotCountBadge() {
    const tl = document.getElementById('timeline');
    const badge = document.getElementById('slotCountBadge');
    if (!tl || !badge) return;
    const n = tl.querySelectorAll('.timeline-row').length;
    badge.textContent = n === 1 ? '1 time slot' : `${n} time slots`;
  }
  window._updateSlotCountBadge = updateSlotCountBadge;

  // Selector for all ephemeral edit-only UI elements injected at runtime.
  // These must be stripped from snapshots/backups before restoring, otherwise
  // re-init (initRow/initCard/etc.) will inject a second copy alongside the
  // dead first copy (no JS listeners), making every button appear broken.
  const STRIP_SEL = '.del-btn,.add-fac-btn,.add-card-btn,.row-del-btn,.ref-del-btn,.drag-handle,.ref-drag-cell,.insert-above,.insert-below,.add-slot-row,.add-ref-row,.banner-add-title-btn,.add-tag-btn,.tag-color-row,.tag-add-ref-btn,.card-color-row,.banner-color-row,.card-resize-handle,.card-list-toolbar,.add-title-btn,.banner-add-title-btn,.fac-ref-btn,.field-clear-btn,.dup-row-btn,.status-menu,.cutoff-countdown,.bt-autocomplete,.color-panel-toggle-btn';

  function stripEditUI(root) {
    root.querySelectorAll(STRIP_SEL).forEach(el => el.remove());
  }

  function snapshot(desc) {
    if (_noSnap) return;
    clearTimeout(_debTimer);
    if (cursor < hist.length - 1) hist = hist.slice(0, cursor + 1);
    const clone = printArea.cloneNode(true);
    // Strip ephemeral edit UI from snapshot
    stripEditUI(clone);
    hist.push({ html: clone.innerHTML, header: captureHeader(), desc: desc || 'Edit', ts: new Date() });
    if (hist.length > MAX_HIST) hist.shift();
    cursor = hist.length - 1;
    pushChangelog(hist[cursor]);
    syncUndoRedo();
    // Auto-save to localStorage (debounced 1.5s)
    if (window._scheduleAutoSave) window._scheduleAutoSave();
  }

  function dSnap(desc, delay = 700) {
    clearTimeout(_debTimer);
    _debTimer = setTimeout(() => snapshot(desc), delay);
  }

  function syncUndoRedo() {
    undoBtn.disabled = cursor <= 0;
    redoBtn.disabled = cursor >= hist.length - 1;
  }

  function jumpTo(idx) {
    if (idx < 0 || idx >= hist.length) return;
    _noSnap = true;
    const wasEdit = editMode;
    if (wasEdit) setEditMode(false);
    cursor = idx;
    printArea.innerHTML = hist[idx].html;
    restoreHeader(hist[idx].header);
    _reinjectEditOnlyUI();
    // Strip stale inline styles from time chips and default cards
    printArea.querySelectorAll('.time-chip').forEach(chip => {
      chip.style.removeProperty('border-color');
      chip.style.removeProperty('border');
      chip.style.removeProperty('background');
      chip.style.removeProperty('background-color');
      chip.style.removeProperty('color');
    });
    printArea.querySelectorAll('.card-default, .card:not([class*="card-purple"]):not([class*="card-pickup"]):not([class*="card-skilled"])').forEach(card => {
      const bg = card.style.background || card.style.backgroundColor;
      if (!bg) card.style.removeProperty('border-color');
    });
    initAll();
    if (window._applyAllCardCols) window._applyAllCardCols();
    if (wasEdit) setEditMode(true);
    _noSnap = false;
    syncUndoRedo();
    highlightCL(idx);
  }

  function undo() { if (cursor > 0) jumpTo(cursor - 1); }
  function redo() { if (cursor < hist.length - 1) jumpTo(cursor + 1); }

  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.target.closest('[contenteditable="true"]')) return;
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
  });

  /* ─────────────────────────────────────────────────────────────────────────
     CHANGE LOG
  ───────────────────────────────────────────────────────────────────────── */
  let clSeq = 0;

  function pushChangelog(entry) {
    clSeq++;
    clEmpty.hidden = true;
    const li = document.createElement('li');
    li.className = 'cl-item';
    li.dataset.idx = cursor;
    li.innerHTML = `
      <div class="cl-item-meta">
        <span class="cl-seq">#${clSeq}</span>
        <span class="cl-time">${entry.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span class="cl-cur-badge" id="clbadge-${cursor}" hidden>current</span>
      </div>
      <div class="cl-item-desc">${esc(entry.desc)}</div>
      <button class="cl-revert" data-idx="${cursor}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>
        Revert
      </button>`;
    li.querySelector('.cl-revert').addEventListener('click', () => jumpTo(+li.dataset.idx));
    clList.prepend(li);
    highlightCL(cursor);
    // Update badge count
    clCount.textContent = clList.children.length;
    clCount.style.display = 'inline-flex';
  }

  function highlightCL(idx) {
    clList.querySelectorAll('.cl-item').forEach(li => {
      const active = +li.dataset.idx === idx;
      li.classList.toggle('cl-active', active);
      const b = li.querySelector('.cl-cur-badge');
      if (b) b.hidden = !active;
    });
  }

  clBtn.addEventListener('click', () => {
    clPanel.classList.toggle('open');
    clBtn.classList.toggle('active');
  });
  clClose.addEventListener('click', closeChangelog);
  clOverlay.addEventListener('click', closeChangelog);
  function closeChangelog() {
    clPanel.classList.remove('open');
    clBtn.classList.remove('active');
  }

  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ─────────────────────────────────────────────────────────────────────────
     RTE TOOLBAR
  ───────────────────────────────────────────────────────────────────────── */
  let rteTarget   = null;
  let rteHideTimer = null;
  let _savedRange  = null; // saved selection for toolbar interactions that blur the field
  let _rtePinned   = false; // true once user manually drags the toolbar

  function showRte(el) {
    if (!editMode) return;
    clearTimeout(rteHideTimer);
    rteTarget = el;
    positionRte(el);
    rteToolbar.hidden = false;
    syncRteState();
  }

  function hideRte() {
    _rtePinned = false;
    rteHideTimer = setTimeout(() => {
      rteToolbar.hidden = true;
      rteTarget = null;
    }, 150);
  }

  function positionRte(el) {
    if (_rtePinned) return; // user has manually placed toolbar — don't auto-reposition
    const r  = el.getBoundingClientRect();
    const br = document.body.getBoundingClientRect();
    const W  = 300;
    let left = r.left - br.left;
    let top  = r.top  - br.top - 44;
    left = Math.max(8, Math.min(left, document.documentElement.clientWidth - W - 8));
    if (top < window.scrollY + 8) top = r.bottom - br.top + 6;
    rteToolbar.style.left = left + 'px';
    rteToolbar.style.top  = top  + 'px';
  }

  function syncRteState() {
    ['bold','italic','underline','strikeThrough'].forEach(cmd => {
      const btn = rteToolbar.querySelector(`[data-cmd="${cmd}"]`);
      if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
    });
  }

  rteToolbar.addEventListener('mousedown', e => {
    e.preventDefault(); // prevents the toolbar click from stealing focus
    clearTimeout(rteHideTimer);
  });

  function _restoreFocusAndSelection() {
    if (!rteTarget) return false;
    rteTarget.focus();
    if (_savedRange) {
      // Verify the range is still inside rteTarget
      try {
        if (rteTarget.contains(_savedRange.commonAncestorContainer)) {
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(_savedRange);
        }
      } catch(_) {}
    }
    return true;
  }
  rteToolbar.addEventListener('mouseenter', () => clearTimeout(rteHideTimer));
  rteToolbar.addEventListener('mouseleave', () => { if (document.activeElement !== rteTarget) hideRte(); });

  /* ── Toolbar drag-to-move ── */
  (function () {
    const handle = document.getElementById('rteDragHandle');
    let dragging = false, ox = 0, oy = 0;

    handle.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      _rtePinned = true;
      handle.setPointerCapture(e.pointerId);
      const rect = rteToolbar.getBoundingClientRect();
      ox = e.clientX - rect.left;
      oy = e.clientY - rect.top;
      rteToolbar.classList.add('is-dragging');
    });

    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      e.preventDefault();
      const vpW = document.documentElement.clientWidth;
      const vpH = document.documentElement.clientHeight;
      const tbW = rteToolbar.offsetWidth;
      const tbH = rteToolbar.offsetHeight;
      const br  = document.body.getBoundingClientRect();
      // Position relative to document (body-relative) so it stays put when scrolling
      let left = e.clientX - ox - br.left;
      let top  = e.clientY - oy - br.top + window.scrollY;
      // Clamp so toolbar can't leave the viewport
      left = Math.max(8, Math.min(left, vpW - tbW - 8));
      top  = Math.max(window.scrollY + 8, Math.min(top, window.scrollY + vpH - tbH - 8));
      rteToolbar.style.left = left + 'px';
      rteToolbar.style.top  = top  + 'px';
    });

    handle.addEventListener('pointerup', e => {
      if (!dragging) return;
      dragging = false;
      rteToolbar.classList.remove('is-dragging');
    });

    handle.addEventListener('pointercancel', () => {
      dragging = false;
      rteToolbar.classList.remove('is-dragging');
    });
  })();

  // Size picker: capture range on button mousedown (before blur fires)
  rteSizeBtn.addEventListener('mousedown', () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      try { _savedRange = sel.getRangeAt(0).cloneRange(); } catch(_) {}
    }
  });

  // Toggle the size menu open/closed
  rteSizeBtn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    rteSizeMenu.hidden = !rteSizeMenu.hidden;
  });

  // Close menu when clicking outside
  document.addEventListener('click', e => {
    if (!rteSizeMenu.hidden && !rteSizeBtn.contains(e.target) && !rteSizeMenu.contains(e.target)) {
      rteSizeMenu.hidden = true;
    }
  });

  // Each size option
  rteSizeMenu.querySelectorAll('.rte-size-opt').forEach(opt => {
    opt.addEventListener('mousedown', () => {
      // Capture range right before focus leaves (same as button mousedown)
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        try { _savedRange = sel.getRangeAt(0).cloneRange(); } catch(_) {}
      }
    });
    opt.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      rteSizeMenu.hidden = true;
      const pt = opt.dataset.pt;
      if (!pt || !_restoreFocusAndSelection()) return;
      const sel = window.getSelection();
      let range = (_savedRange && rteTarget && rteTarget.contains(_savedRange.commonAncestorContainer))
        ? _savedRange.cloneRange()
        : (sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
      if (!range || range.collapsed) {
        const r = document.createRange();
        r.selectNodeContents(rteTarget);
        sel.removeAllRanges();
        sel.addRange(r);
        range = r;
      }
      _applyFontSize(range, pt);
      _savedRange = null;
      if (rteTarget) dSnap(descChange(rteTarget));
    });
  });

  rteToolbar.querySelectorAll('[data-cmd]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;

      if (cmd === 'deleteText') {
        if (!rteTarget) return;
        _restoreFocusAndSelection();
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) {
          document.execCommand('delete', false, null);
        } else {
          document.execCommand('selectAll', false, null);
          document.execCommand('delete', false, null);
        }
        dSnap(descChange(rteTarget));
        return;
      }

      _restoreFocusAndSelection();
      document.execCommand(cmd, false, null);
      syncRteState();
      if (rteTarget) dSnap(descChange(rteTarget));
    });
  });

  // Wraps a range's contents in a <span style="font-size:pt">
  // Works even when the range crosses multiple nodes (unlike surroundContents)
  function _applyFontSize(range, pt) {
    const span = document.createElement('span');
    span.style.fontSize = pt;
    // extractContents moves the selected nodes into a fragment
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
    // Move caret to end of inserted span
    const nr = document.createRange();
    nr.selectNodeContents(span);
    nr.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(nr);
    return span;
  }

  // (size picker now handled by rteSizeBtn / rteSizeMenu click handlers above)

  rteColorInput.addEventListener('input', e => {
    _restoreFocusAndSelection();
    document.execCommand('foreColor', false, e.target.value);
    if (rteTarget) dSnap(descChange(rteTarget));
  });

  function wireRte(el) {
    el.addEventListener('focus',  () => showRte(el));
    el.addEventListener('blur',   e  => {
      // Save the current selection so toolbar controls can restore it
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        try { _savedRange = sel.getRangeAt(0).cloneRange(); } catch(_) {}
      }
      if (!rteToolbar.contains(e.relatedTarget)) hideRte();
    });
    el.addEventListener('keyup',  ()  => syncRteState());
    el.addEventListener('mouseup',()  => syncRteState());
  }

  /* ─────────────────────────────────────────────────────────────────────────
     EDIT MODE
  ───────────────────────────────────────────────────────────────────────── */
  let editMode = false;

  function setEditMode(on) {
    editMode = on;
    // CSS handles all control visibility via .edit-mode on <html>
    html.classList.toggle('edit-mode', on);
    editBanner.hidden = !on;
    editBtn.setAttribute('aria-pressed', on);
    editBtn.classList.toggle('active', on);
    editBtn.querySelector('span').textContent = on ? 'Done' : 'Edit';
    editBtn.querySelector('svg').innerHTML = on
      ? '<polyline points="20 6 9 17 4 12"/>'
      : '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>';

    // Toggle contenteditable on all editable elements
    document.querySelectorAll('[data-editable]').forEach(el => {
      el.contentEditable = on ? 'true' : 'false';
    });

    // Header editables
    [siteTitle, siteSubtitle, cutoffText].forEach(el => {
      el.contentEditable = on ? 'true' : 'false';
      el.classList.toggle('editing', on);
    });

    if (!on) {
      rteToolbar.hidden = true;
      rteTarget = null;
    }
  }

  editBtn.addEventListener('click', () => setEditMode(!editMode));

  /* ─────────────────────────────────────────────────────────────────────────
     CHANGE DESCRIPTION HELPER
  ───────────────────────────────────────────────────────────────────────── */
  function descChange(el) {
    const txt = el.textContent.trim().slice(0, 40);
    if (el === siteTitle)            return `Updated title → "${txt}"`;
    if (el === siteSubtitle)         return `Updated subtitle → "${txt}"`;
    if (el === cutoffText)           return `Updated cutoff → "${txt}"`;
    if (el.closest('.time-col'))     return `Updated time → "${txt}"`;
    if (el.closest('.card-label'))   return `Updated card heading → "${txt}"`;
    if (el.closest('.card-tag'))     return `Updated card tag → "${txt}"`;
    if (el.closest('.card-list'))    return `Updated facility → "${txt}"`;
    if (el.closest('.ref-name'))     return `Updated reference name → "${txt}"`;
    if (el.closest('.ref-times'))    return `Updated reference time → "${txt}"`;
    if (el.closest('.sticky-note'))  return `Updated note → "${txt}"`;
    return `Edited → "${txt}"`;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     DRAG AND DROP  (pointer-event based — avoids contentEditable conflicts)
  ───────────────────────────────────────────────────────────────────────── */
  let dragEl    = null;
  let dragType  = null;
  let dragPH    = null;
  let _dragging = false;

  // Ghost element that follows the cursor
  let _ghost    = null;
  let _ghostOX  = 0; // offset within element where pointer hit
  let _ghostOY  = 0;

  function _makePH(ref) {
    const ph = document.createElement('div');
    ph.className = 'drag-ph';
    ph.style.height   = ref.offsetHeight + 'px';
    ph.style.minWidth = ref.offsetWidth  + 'px';
    ph.style.width    = ref.offsetWidth  + 'px';
    return ph;
  }

  function _makeGhost(ref) {
    const g = ref.cloneNode(true);
    g.style.cssText = [
      'position:fixed','z-index:9999','pointer-events:none',
      'opacity:0.75','box-shadow:0 8px 24px rgba(0,0,0,.18)',
      'border-radius:10px','transform:rotate(1.5deg)',
      'width:' + ref.offsetWidth + 'px',
      'max-width:' + ref.offsetWidth + 'px',
    ].join(';');
    // Strip edit controls from ghost
    g.querySelectorAll('.del-btn,.drag-handle,.ghost-btn,.card-resize-handle,.banner-color-row,.card-color-row,.add-title-btn,.banner-add-title-btn,.add-tag-btn,.tag-color-row,.tag-add-ref-btn').forEach(x => x.remove());
    document.body.appendChild(g);
    return g;
  }

  function _posGhost(e) {
    if (!_ghost) return;
    _ghost.style.left = (e.clientX - _ghostOX) + 'px';
    _ghost.style.top  = (e.clientY - _ghostOY) + 'px';
  }

  // Call this from each drag-handle mousedown
  function startDrag(e, el, type) {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();

    dragEl   = el;
    dragType = type;
    _dragging = true;

    const rect  = el.getBoundingClientRect();
    _ghostOX = e.clientX - rect.left;
    _ghostOY = e.clientY - rect.top;

    dragPH = _makePH(el);
    el.parentElement.insertBefore(dragPH, el.nextSibling);
    el.style.display = 'none';

    _ghost = _makeGhost(el);
    _posGhost(e);

    document.body.style.userSelect = 'none';
    document.body.style.cursor     = 'grabbing';
  }

  function _endDrag() {
    if (!_dragging || !dragEl) return;
    _dragging = false;

    dragEl.style.display = '';
    if (_ghost) { _ghost.remove(); _ghost = null; }

    if (dragPH && dragPH.parentElement) {
      dragPH.parentElement.insertBefore(dragEl, dragPH);
      dragPH.remove();
    }
    dragPH = null;
    dragEl = null;

    document.body.style.userSelect = '';
    document.body.style.cursor     = '';
    snapshot('Reordered');
  }

  function _overDrag(e) {
    if (!_dragging || !dragEl || !dragPH) return;

    // Find drop target under the cursor (skip ghost + dragEl + dragPH)
    _ghost.style.display = 'none';
    dragEl.style.display = '';
    const under = document.elementFromPoint(e.clientX, e.clientY);
    _ghost.style.display = '';
    dragEl.style.display = 'none';

    if (!under) return;

    if (dragType === 'card') {
      // Find closest [data-card] or .cards-col or #freeBoard
      const targetCard = under.closest('[data-card]');
      const targetCol  = under.closest('.cards-col, #freeBoard');

      if (targetCard && targetCard !== dragEl && targetCard !== dragPH) {
        const r   = targetCard.getBoundingClientRect();
        const mid = r.left + r.width / 2;
        targetCard.parentElement.insertBefore(dragPH, e.clientX < mid ? targetCard : targetCard.nextSibling);
      } else if (targetCol && !targetCol.contains(dragPH)) {
        // Drop into empty column — append before the add-card button if present
        const addBtn = targetCol.querySelector('.add-card-btn, .ghost-btn');
        targetCol.insertBefore(dragPH, addBtn || null);
      }

    } else if (dragType === 'row') {
      const targetRow = under.closest('.timeline-row');
      if (targetRow && targetRow !== dragEl && targetRow !== dragPH) {
        const r   = targetRow.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        targetRow.parentElement.insertBefore(dragPH, e.clientY < mid ? targetRow : targetRow.nextSibling);
      }
    }
  }

  document.addEventListener('pointermove', e => {
    if (!_dragging) return;
    _posGhost(e);
    _overDrag(e);
  });

  document.addEventListener('pointerup', _endDrag);

  // Escape key cancels drag
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _dragging) {
      _dragging = false;
      dragEl.style.display = '';
      if (_ghost) { _ghost.remove(); _ghost = null; }
      if (dragPH) { dragPH.remove(); dragPH = null; }
      dragEl = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  });

  // Keep these as no-ops so existing call sites don't error
  function endDrag()  {}
  function dropDrag() {}
  function overDrag() {}

  /* ─────────────────────────────────────────────────────────────────────────
     ELEMENT FACTORIES
  ───────────────────────────────────────────────────────────────────────── */
  function mkDelBtn(label, cb) {
    const b = document.createElement('button');
    b.className = 'del-btn';
    b.setAttribute('aria-label', label);
    // Visibility controlled by CSS .edit-mode selector
    b.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    b.addEventListener('click', e => { e.stopPropagation(); cb(); });
    return b;
  }

  function mkGhostBtn(label, icon, cb) {
    const b = document.createElement('button');
    b.className = 'ghost-btn';
    // Visibility controlled by CSS .edit-mode selector
    b.innerHTML = icon + ' ' + label;
    b.addEventListener('click', cb);
    return b;
  }

  const PLUS = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const DOTS = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="5" r="1.5" fill="currentColor"/><circle cx="15" cy="5" r="1.5" fill="currentColor"/><circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="9" cy="19" r="1.5" fill="currentColor"/><circle cx="15" cy="19" r="1.5" fill="currentColor"/></svg>';

  /* ─────────────────────────────────────────────────────────────────────────
     WIRE EDITABLE
  ───────────────────────────────────────────────────────────────────────── */
  function wireEditable(el) {
    if (el._ew) return;
    el._ew = true;
    el.addEventListener('input',   () => dSnap(descChange(el)));
    el.addEventListener('keydown', e  => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); } });
    wireRte(el);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     INIT: FACILITY SPAN
  ───────────────────────────────────────────────────────────────────────── */
  function initFacility(span) {
    if (span._init) return;
    span._init = true;
    span.setAttribute('data-editable', '');
    if (editMode) span.contentEditable = 'true';
    wireEditable(span);

    // Wrap in a facility-item div for delete button
    const wrap = document.createElement('div');
    wrap.className = 'fac-item';
    span.parentNode.insertBefore(wrap, span);
    wrap.appendChild(span);

    // ── Status dot + context menu (Feature 8) ──
    if (!span.hasAttribute('data-status')) span.setAttribute('data-status', 'active');
    const statusDot = document.createElement('span');
    statusDot.className = 'status-dot';
    wrap.insertBefore(statusDot, span);
    if (window._applyFacStatus) window._applyFacStatus(span);
    span.addEventListener('contextmenu', e => {
      if (!editMode) return;
      e.preventDefault();
      if (window._showStatusMenu) window._showStatusMenu(span, statusDot, e.clientX, e.clientY);
    });

    const del = mkDelBtn('Remove facility', () => {
      const nm = span.textContent.trim();
      snapshot(`Removed "${nm}"`);
      wrap.remove();
    });
    wrap.appendChild(del);

    // ── +Ref button (edit mode only) ──
    const refBtn = document.createElement('button');
    refBtn.className = 'fac-ref-btn';
    refBtn.title = 'Add to Quick Reference';
    refBtn.innerHTML = '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Ref';
    refBtn.addEventListener('click', e => {
      e.stopPropagation();
      const facName = span.textContent.trim() || 'Facility';
      const facBadgeEl = span.closest('.fac-item')?.querySelector('.fac-type-badge');
      const facTypeVal = facBadgeEl ? facBadgeEl.textContent.trim() : '';
      // Prefill the times cell with this card's delivery days + slot time
      const srcCard  = span.closest('.card');
      const freqTag  = srcCard?.querySelector('.tag-freq');
      const timeChip = span.closest('.timeline-row')?.querySelector('.time-chip');
      const prefill  = daysPlusTime(
        freqTag  ? freqTag.textContent.trim()  : '',
        timeChip ? timeChip.textContent.trim() : ''
      ) || '—';
      const tr = document.createElement('tr');
      tr.setAttribute('data-ref-row', '');
      tr.innerHTML = `
        <td class="ref-td-name"><span class="ref-name" data-editable contenteditable="true">${facName}</span><span class="ref-type" data-editable contenteditable="true">${facTypeVal}</span></td>
        <td class="ref-td-times"><span class="ref-times" data-editable contenteditable="true">${prefill}</span></td>`;
      refBody.appendChild(tr);
      initRefRow(tr);
      snapshot('Added to Quick Reference');
      // Flash ref panel
      const refSection = document.getElementById('refSection');
      if (refSection) {
        refSection.style.transition = 'box-shadow .2s';
        refSection.style.boxShadow = '0 0 0 3px var(--accent)';
        setTimeout(() => { refSection.style.boxShadow = ''; }, 700);
      }
      // Brief visual confirmation on the button
      refBtn.classList.add('added');
      refBtn.innerHTML = '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Added';
      setTimeout(() => {
        refBtn.classList.remove('added');
        refBtn.innerHTML = '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Ref';
      }, 1500);
      tr.querySelector('.ref-times').focus();
    });
    wrap.insertBefore(refBtn, del);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     INIT: CARD LIST
  ───────────────────────────────────────────────────────────────────────── */
  function initList(list) {
    if (list._init) return;
    list._init = true;
    list.querySelectorAll(':scope > span').forEach(initFacility);

    const addBtn = mkGhostBtn('Add facility', PLUS, () => addFacility(list));
    addBtn.className = 'ghost-btn add-fac-btn';
    // Visibility controlled by CSS
    list.parentElement.appendChild(addBtn);
  }

  function addFacility(list) {
    const span = document.createElement('span');
    span.textContent = 'New Facility';
    list.appendChild(span);
    initFacility(span);
    if (editMode) span.contentEditable = 'true';
    span.focus();
    document.execCommand('selectAll', false, null);
    snapshot('Added facility');
  }

  /* ─────────────────────────────────────────────────────────────────────────
     INIT: CARD
  ───────────────────────────────────────────────────────────────────────── */
  function initCard(card) {
    if (card._init) return;
    card._init = true;

    // Wire any [data-editable] children
    card.querySelectorAll('[data-editable]').forEach(el => {
      wireEditable(el);
      // Add inline clear button on card-sub and card-tag fields
      if ((el.classList.contains('card-sub') || el.classList.contains('card-tag') || el.classList.contains('card-label')) && !el._hasClear) {
        el._hasClear = true;
        const clr = document.createElement('button');
        clr.className = 'field-clear-btn';
        clr.title = 'Clear this field';
        clr.innerHTML = '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        clr.addEventListener('click', e => {
          e.stopPropagation();
          snapshot('Cleared field');
          el.innerHTML = '';
        });
        el.parentElement.style.position = 'relative';
        el.after(clr);
      }
    });

    // Ensure list exists if card has no data-list
    if (!card.querySelector('[data-list]') && !card.classList.contains('sticky-note')) {
      const list = document.createElement('div');
      list.className = 'card-list';
      list.setAttribute('data-list', '');
      card.appendChild(list);
    }
    const list = card.querySelector('[data-list]');
    if (list) initList(list);

    // ── Add Title button (shown in edit mode when card has no card-label) ──
    if (!card.classList.contains('sticky-note')) {
      function refreshAddTitleBtn() {
        const existing = card.querySelector('.add-title-btn');
        if (card.querySelector('.card-label')) {
          if (existing) existing.remove();
        } else {
          if (!existing) {
            const btn = document.createElement('button');
            btn.className = 'add-title-btn ghost-inline-btn';
            btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Title`;
            btn.title = 'Add a title to this card';
            btn.addEventListener('click', e => {
              e.stopPropagation();
              const lbl = document.createElement('div');
              lbl.className = 'card-label';
              lbl.setAttribute('data-editable', '');
              lbl.setAttribute('contenteditable', 'true');
              lbl.textContent = '';
              // Insert before first content element (tag, list, etc.) or prepend
              const firstContent = card.querySelector('.card-tag, .card-sub, [data-list], .card-list');
              if (firstContent) card.insertBefore(lbl, firstContent);
              else card.prepend(lbl);
              // Wire editable + clear button
              wireEditable(lbl);
              if (!lbl._hasClear) {
                lbl._hasClear = true;
                const clr = document.createElement('button');
                clr.className = 'field-clear-btn';
                clr.title = 'Clear this field';
                clr.innerHTML = '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
                clr.addEventListener('click', ev => {
                  ev.stopPropagation();
                  snapshot('Cleared title');
                  lbl.innerHTML = '';
                });
                lbl.parentElement.style.position = 'relative';
                lbl.after(clr);
              }
              btn.remove();
              snapshot('Added card title');
              lbl.focus();
            });
            // Insert before drag handle or prepend
            const dh = card.querySelector('.drag-handle');
            if (dh) dh.after(btn);
            else card.prepend(btn);
          }
        }
      }
      refreshAddTitleBtn();
      // Re-check when edit mode toggles (MutationObserver on html class)
      card._refreshAddTitle = refreshAddTitleBtn;
    }

    // Delete button
    const del = mkDelBtn('Delete card', () => {
      if (confirm('Remove this card?')) {
        snapshot('Removed card');
        card.remove();
      }
    });
    del.className = 'del-btn card-del-btn';
    card.appendChild(del);

    // Color picker row
    injectCardColorRow(card);
    injectTagSystem(card);
    // ── List-style & Spacing toolbar (edit mode only, non-sticky cards) ──
    if (!card.classList.contains('sticky-note') && !card.querySelector('.card-list-toolbar')) {
      const clt = document.createElement('div');
      clt.className = 'card-list-toolbar';

      // Helper: make a group of toggle buttons
      function makeCltGroup(buttons, attrName) {
        const grp = document.createElement('div');
        grp.className = 'clt-group';
        buttons.forEach(({ label, title, val }) => {
          const b = document.createElement('button');
          b.className = 'clt-btn';
          b.title = title;
          b.innerHTML = label;
          b.dataset.val = val;
          b.addEventListener('click', e => {
            e.stopPropagation();
            const current = card.dataset[attrName];
            if (current === val) {
              delete card.dataset[attrName];
              grp.querySelectorAll('.clt-btn').forEach(x => x.classList.remove('active'));
            } else {
              card.dataset[attrName] = val;
              grp.querySelectorAll('.clt-btn').forEach(x => x.classList.toggle('active', x.dataset.val === val));
            }
            snapshot('Changed card style');
          });
          if (card.dataset[attrName] === val) b.classList.add('active');
          grp.appendChild(b);
        });
        return grp;
      }

      // List-style group
      clt.appendChild(makeCltGroup([
        { label: '&bull;', title: 'Bullet list',   val: 'bullet'   },
        { label: '1.',      title: 'Numbered list', val: 'numbered' },
        { label: '&mdash;', title: 'Plain (none)',  val: 'plain'    }
      ], 'listStyle'));

      const sep = document.createElement('span');
      sep.className = 'clt-sep';
      clt.appendChild(sep);

      // Spacing group
      clt.appendChild(makeCltGroup([
        { label: 'Tight',   title: 'Tight spacing',   val: 'tight'   },
        { label: 'Normal',  title: 'Normal spacing',  val: 'normal'  },
        { label: 'Relaxed', title: 'Relaxed spacing', val: 'relaxed' }
      ], 'spacing'));

      // Auto-height button: clears manual height so card fits content
      const sepAH = document.createElement('span');
      sepAH.className = 'clt-sep';
      clt.appendChild(sepAH);
      const ahBtn = document.createElement('button');
      ahBtn.className = 'clt-btn clt-autoheight-btn';
      ahBtn.title = 'Auto-size height to fit content';
      ahBtn.textContent = 'Auto H';
      ahBtn.addEventListener('click', e => {
        e.stopPropagation();
        card.style.removeProperty('height');
        card.style.removeProperty('min-height');
        snapshot('Auto-sized card height');
      });
      clt.appendChild(ahBtn);

      const awBtn = document.createElement('button');
      awBtn.className = 'clt-btn clt-autowidth-btn';
      awBtn.title = 'Auto-size width to fit content';
      awBtn.textContent = 'Auto W';
      awBtn.addEventListener('click', e => {
        e.stopPropagation();
        card.style.removeProperty('width');
        card.style.removeProperty('min-width');
        card.style.removeProperty('max-width');
        snapshot('Auto-sized card width');
      });
      clt.appendChild(awBtn);

      // Duplicate card button (Feature 4)
      const dupBtn = document.createElement('button');
      dupBtn.className = 'clt-btn clt-dup-btn';
      dupBtn.title = 'Duplicate this card';
      dupBtn.innerHTML = '&#10697; Dup';
      dupBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (window._duplicateCard) window._duplicateCard(card);
      });
      clt.appendChild(dupBtn);

      card.appendChild(clt);
    }

    // Resize handle
    if (!card.querySelector('.card-resize-handle')) {
      const rh = document.createElement('div');
      rh.className = 'card-resize-handle';
      rh.title = 'Drag to resize';
      rh.addEventListener('mousedown', e => { if (editMode) window._startCardResize(e, card); });
      card.appendChild(rh);
    }

    // Drag handle (only for non-sticky cards in timeline)
    if (!card.classList.contains('sticky-note') && card.closest('.cards-col, .timeline-section')) {
      const handle = document.createElement('div');
      handle.className = 'drag-handle';
      handle.title = 'Drag to reorder';
      // Visibility controlled by CSS .edit-mode selector
      handle.innerHTML = DOTS;
      card.insertBefore(handle, card.firstChild);

      handle.addEventListener('mousedown', e => { if (editMode) startDrag(e, card, 'card'); });
    }

    // Sticky notes — make the whole card editable
    if (card.classList.contains('sticky-note')) {
      card.setAttribute('data-editable', '');
      if (editMode) card.contentEditable = 'true';
      wireEditable(card);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     INIT: TIMELINE ROW
  ───────────────────────────────────────────────────────────────────────── */
  function initRow(row) {
    if (row._init) return;
    row._init = true;

    const cardsCol = row.querySelector('.cards-col');
    const timeChip = row.querySelector('.time-chip');

    // Wire time chip editable
    if (timeChip && !timeChip._ew) wireEditable(timeChip);

    // Wire pickup-badge editable (if present)
    const pickupBadge = row.querySelector('.pickup-badge');
    if (pickupBadge && !pickupBadge._ew) {
      pickupBadge.setAttribute('data-editable', '');
      pickupBadge.setAttribute('contenteditable', 'true');
      pickupBadge.setAttribute('spellcheck', 'false');
      wireEditable(pickupBadge);
    }

    // Row delete button
    const rowDel = mkDelBtn('Delete time slot', () => {
      const t = timeChip?.textContent?.trim() || 'slot';
      if (confirm(`Remove the "${t}" time slot and all its cards?`)) {
        snapshot(`Removed slot "${t}"`);
        row.remove();
        updateSlotCountBadge();
      }
    });
    rowDel.className = 'del-btn row-del-btn';
    row.appendChild(rowDel);

    // Insert above
    const insAbove = document.createElement('button');
    insAbove.className = 'insert-above edit-only';
    // Visibility controlled by CSS .edit-mode selector
    insAbove.title = 'Insert time slot above';
    insAbove.innerHTML = PLUS + ' Insert above';
    insAbove.addEventListener('click', e => { e.stopPropagation(); createRow(row); });
    row.insertBefore(insAbove, row.firstChild);

    // Insert below
    const insBelow = document.createElement('button');
    insBelow.className = 'insert-below edit-only';
    // Visibility controlled by CSS
    insBelow.title = 'Insert time slot below';
    insBelow.innerHTML = PLUS + ' Insert below';
    insBelow.addEventListener('click', e => { e.stopPropagation(); createRow(row.nextSibling); });
    row.appendChild(insBelow);

    // Duplicate row (Feature 4)
    const dupRow = document.createElement('button');
    dupRow.className = 'dup-row-btn edit-only';
    dupRow.title = 'Duplicate this time slot';
    dupRow.innerHTML = '&#10697; Dup row';
    dupRow.addEventListener('click', e => { e.stopPropagation(); if (window._duplicateRow) window._duplicateRow(row); });
    row.appendChild(dupRow);

    // Add card button
    if (cardsCol) {
      const addCard = mkGhostBtn('Add card', PLUS, () => addCardToRow(cardsCol));
      addCard.className = 'ghost-btn add-card-btn';
      // Visibility controlled by CSS
      cardsCol.appendChild(addCard);

      // Init existing cards
      cardsCol.querySelectorAll('[data-card]').forEach(initCard);

      // Drop zone handled by pointer-based DnD
    }

    // Row drag
    const timeCol = row.querySelector('.time-col');
    if (timeCol) {
      timeCol.addEventListener('mousedown', e => { if (editMode) startDrag(e, row, 'row'); });
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     INIT: REFERENCE TABLE ROW
  ───────────────────────────────────────────────────────────────────────── */
  function initRefRow(tr) {
    if (tr._init) return;
    tr._init = true;
    tr.querySelectorAll('[data-editable]').forEach(el => {
      if (editMode) el.contentEditable = 'true';
      wireEditable(el);
    });
    const del = mkDelBtn('Remove row', () => {
      const nm = tr.querySelector('.ref-name')?.textContent?.trim() || 'entry';
      snapshot(`Removed "${nm}" from reference`);
      tr.remove();
    });
    del.className = 'del-btn ref-del-btn';
    // Place del inside the last td (times cell)
    const lastTd = tr.querySelector('td:last-of-type') || tr.lastElementChild;
    if (lastTd) {
      lastTd.style.position = 'relative';
      lastTd.appendChild(del);
    }
    // Drag handle (injected by initRefDrag, but call if already initialized)
    if (window._wireRefDragHandles) window._wireRefDragHandles();
  }

  /* ─────────────────────────────────────────────────────────────────────────
     INIT: HEADER EDITABLES
  ───────────────────────────────────────────────────────────────────────── */
  function initHeader() {
    [siteTitle, siteSubtitle, cutoffText].forEach(el => {
      if (el._ew) return;
      el._ew = true;
      el.addEventListener('input', () => dSnap(descChange(el)));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); } });
      wireRte(el);
    });
  }


  /* ─── CARD COLOR PICKER ───────────────────────────────────────────────────── */
  const CARD_VARIANTS = [
    { key: 'default',  label: 'White/Default', hex: '#ffffff' },
    { key: 'purple',   label: 'Purple',        hex: '#a855f7' },
    { key: 'pickup',   label: 'Orange',        hex: '#f97316' },
    { key: 'skilled',  label: 'Green',         hex: '#16a34a' },
    { key: 'assisted', label: 'Blue (ALF)',    hex: '#2563eb' },
  ];

  function injectCardColorRow(card) {
    if (card._hasColorRow || card.classList.contains('sticky-note')) return;
    card._hasColorRow = true;

    const row = document.createElement('div');
    row.className = 'card-color-row';

    const panelHeader = document.createElement('div');
    panelHeader.className = 'swatch-panel-header';
    panelHeader.textContent = 'Card Color';
    row.appendChild(panelHeader);

    const swatchGrid = document.createElement('div');
    swatchGrid.className = 'swatch-panel-grid card-swatch-grid';
    row.appendChild(swatchGrid);

    // Preset swatches
    CARD_VARIANTS.forEach(v => {
      const sw = document.createElement('button');
      sw.className = `card-color-swatch swatch-card-${v.key}`;
      sw.title = v.label;
      sw.setAttribute('aria-label', v.label);
      // Mark selected if card currently has this variant
      const isActive = v.key === 'default'
        ? !card.classList.contains('card-purple') && !card.classList.contains('card-pickup') && !card.classList.contains('card-skilled')
        : card.classList.contains(`card-${v.key}`);
      if (isActive) sw.classList.add('selected');

      sw.addEventListener('click', e => {
        e.stopPropagation();
        // Remove all variants
        CARD_VARIANTS.forEach(x => card.classList.remove(`card-${x.key}`));
        card.style.removeProperty('background');
        card.style.removeProperty('border-color');
        if (v.key !== 'default') card.classList.add(`card-${v.key}`);
        // Update selected state
        row.querySelectorAll('.card-color-swatch, .card-color-custom').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        snapshot(`Changed card color to ${v.label}`);
      });
      swatchGrid.appendChild(sw);
    });

    // Custom color picker — styled with a live hex preview
    const customWrap = document.createElement('label');
    customWrap.className = 'card-color-custom';
    customWrap.title = 'Custom color';
    const customPreview = document.createElement('span');
    customPreview.className = 'custom-color-swatch-preview';
    customPreview.style.background = '#ffffff';
    const customHexLabel = document.createElement('span');
    customHexLabel.className = 'custom-color-hex-label';
    customHexLabel.textContent = 'Custom…';
    const colorIn = document.createElement('input');
    colorIn.type = 'color';
    colorIn.value = '#ffffff';
    colorIn.addEventListener('input', e => {
      e.stopPropagation();
      CARD_VARIANTS.forEach(x => card.classList.remove(`card-${x.key}`));
      card.style.background   = e.target.value;
      card.style.borderColor  = e.target.value;
      row.querySelectorAll('.card-color-swatch, .card-color-custom').forEach(s => s.classList.remove('selected'));
      customWrap.classList.add('selected');
      customPreview.style.background = e.target.value;
      customHexLabel.textContent = e.target.value;
    });
    colorIn.addEventListener('change', () => snapshot('Changed card to custom color'));
    customWrap.appendChild(customPreview);
    customWrap.appendChild(customHexLabel);
    customWrap.appendChild(colorIn);
    row.appendChild(customWrap);

    // ── Toggle button (palette icon) — opens/closes panel on click ──
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'color-panel-toggle-btn';
    toggleBtn.title = 'Card color';
    toggleBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>';
    toggleBtn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = row.classList.contains('color-panel-open');
      // Close all other open panels first
      document.querySelectorAll('.color-panel-open').forEach(p => p.classList.remove('color-panel-open'));
      if (!isOpen) row.classList.add('color-panel-open');
    });

    // Close on outside click
    function onOutsideClick(e) {
      if (!row.contains(e.target) && e.target !== toggleBtn) {
        row.classList.remove('color-panel-open');
      }
    }
    document.addEventListener('click', onOutsideClick);

    // Close on Escape
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') row.classList.remove('color-panel-open');
    });

    // Insert toggle button and panel at top of card
    const dh = card.querySelector('.drag-handle');
    const titleBtn = card.querySelector('.add-title-btn');
    const firstRef = dh || titleBtn || card.firstChild;
    if (firstRef) {
      card.insertBefore(toggleBtn, firstRef.nextSibling || null);
      card.insertBefore(row, toggleBtn.nextSibling || null);
    } else {
      card.prepend(row);
      card.prepend(toggleBtn);
    }
  }


  /* ─── STYLED BADGE / TAG SYSTEM ────────────────────────────────────────── */
  // ── Shared 20-color route palette (v30) — single source of truth used by
  //    TAG_VARIANTS, TAG_SWATCH_BG, and the builder's ROUTE_COLORS list. ──
  const ROUTE_PALETTE = [
    { key: 'crimson', label: 'Crimson', hex: '#dc2626' },
    { key: 'rose',    label: 'Rose',    hex: '#e11d48' },
    { key: 'orange',  label: 'Orange',  hex: '#ea580c' },
    { key: 'amber',   label: 'Amber',   hex: '#d97706' },
    { key: 'lime',    label: 'Lime',    hex: '#65a30d' },
    { key: 'emerald', label: 'Emerald', hex: '#059669' },
    { key: 'teal',    label: 'Teal',    hex: '#0f766e' },
    { key: 'cyan',    label: 'Cyan',    hex: '#0891b2' },
    { key: 'sky',     label: 'Sky',     hex: '#0284c7' },
    { key: 'blue',    label: 'Blue',    hex: '#1d4ed8' },
    { key: 'indigo',  label: 'Indigo',  hex: '#4338ca' },
    { key: 'violet',  label: 'Violet',  hex: '#7c3aed' },
    { key: 'purple',  label: 'Purple',  hex: '#9333ea' },
    { key: 'fuchsia', label: 'Fuchsia', hex: '#c026d3' },
    { key: 'pink',    label: 'Pink',    hex: '#db2777' },
    { key: 'slate',   label: 'Slate',   hex: '#475569' },
    { key: 'zinc',    label: 'Zinc',    hex: '#52525b' },
    { key: 'stone',   label: 'Stone',   hex: '#78716c' },
    { key: 'black',   label: 'Black',   hex: '#1f2937' },
    { key: 'silver',  label: 'Silver',  hex: '#94a3b8' },
  ];

  const TAG_VARIANTS = [
    { key: 'skilled', label: 'Orange (Skilled)', bg: 'var(--tag-sk-bg)',  tx: 'var(--tag-sk-tx)'  },
    { key: 'mwf',     label: 'Blue (MWF)',       bg: 'var(--tag-mwf-bg)', tx: 'var(--tag-mwf-tx)' },
    { key: 'tuth',    label: 'Green (T/Th)',      bg: 'var(--tag-tth-bg)', tx: 'var(--tag-tth-tx)' },
    { key: 'purple',  label: 'Purple',            bg: 'var(--c-purple-bg)',tx: 'var(--c-purple-tx)'},
    { key: 'red',     label: 'Red',               bg: '#fef2f2',           tx: '#b91c1c'           },
    { key: 'gray',    label: 'Gray',              bg: 'var(--surface-2)',  tx: 'var(--text-2)'     },
    // ── Route / solid label colors (20-color palette, v30) ──
    ...ROUTE_PALETTE.map(c => ({
      key: 'route-' + c.key,
      label: 'Route ' + c.label,
      bg: c.hex,
      tx: '#ffffff',
    })),
  ];

  // Swatch background colors (static, for the picker dots)
  const TAG_SWATCH_BG = {
    skilled: '#fdba74',
    mwf:     '#93c5fd',
    tuth:    '#86efac',
    purple:  '#c4b5fd',
    red:     '#fca5a5',
    gray:    '#9ca3af',
  };
  ROUTE_PALETTE.forEach(c => { TAG_SWATCH_BG['route-' + c.key] = c.hex; });

  /**
   * Wire a single .card-tag element: color-picker row + "Add to Ref" button.
   * Safe to call on both new and existing (HTML) card-tags.
   */
  function wireCardTag(tagEl, card) {
    if (tagEl._tagWired) return;
    tagEl._tagWired = true;

    // Make the tag editable + clear button
    if (!tagEl._ew) {
      tagEl.setAttribute('data-editable', '');
      tagEl.setAttribute('contenteditable', 'true');
      wireEditable(tagEl);
    }
    if (!tagEl._hasClear) {
      tagEl._hasClear = true;
      const clr = document.createElement('button');
      clr.className = 'field-clear-btn';
      clr.title = 'Clear tag text';
      clr.innerHTML = '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      clr.addEventListener('click', e => {
        e.stopPropagation();
        snapshot('Cleared tag text');
        tagEl.innerHTML = '';
      });
      tagEl.style.position = 'relative';
      tagEl.after(clr);
    }

    // ── Color picker panel (v30 — floating swatch grid) ──
    const colorRow = document.createElement('div');
    colorRow.className = 'tag-color-row';

    const panelHeader = document.createElement('div');
    panelHeader.className = 'swatch-panel-header';
    panelHeader.textContent = 'Tag Color';
    colorRow.appendChild(panelHeader);

    const swatchGrid = document.createElement('div');
    swatchGrid.className = 'swatch-panel-grid';
    colorRow.appendChild(swatchGrid);

    function getActiveKey() {
      return TAG_VARIANTS.find(v => tagEl.classList.contains(`tag-${v.key}`))?.key || null;
    }

    TAG_VARIANTS.forEach(v => {
      const sw = document.createElement('button');
      sw.className = 'tag-color-swatch';
      sw.title = v.label;
      sw.style.background = TAG_SWATCH_BG[v.key] || v.bg;
      if (getActiveKey() === v.key) sw.classList.add('selected');
      sw.addEventListener('click', e => {
        e.stopPropagation();
        TAG_VARIANTS.forEach(x => tagEl.classList.remove(`tag-${x.key}`));
        tagEl.style.removeProperty('background');
        tagEl.style.removeProperty('color');
        tagEl.classList.add(`tag-${v.key}`);
        colorRow.querySelectorAll('.tag-color-swatch, .tag-color-custom-wrap').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        snapshot('Changed tag color');
      });
      swatchGrid.appendChild(sw);
    });

    // Custom color — pinned at the bottom of the panel
    const customWrap = document.createElement('label');
    customWrap.className = 'tag-color-custom-wrap';
    customWrap.title = 'Custom color';
    const customInput = document.createElement('input');
    customInput.type = 'color';
    customInput.value = '#3b82f6';
    customInput.addEventListener('input', e => {
      e.stopPropagation();
      TAG_VARIANTS.forEach(x => tagEl.classList.remove(`tag-${x.key}`));
      tagEl.style.background = e.target.value;
      // Auto-pick white or dark text based on luminance
      const hex = e.target.value.replace('#','');
      const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
      const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
      tagEl.style.color = lum > 0.55 ? '#1f2937' : '#ffffff';
      colorRow.querySelectorAll('.tag-color-swatch,.tag-color-custom-wrap').forEach(s => s.classList.remove('selected'));
      customWrap.classList.add('selected');
      customSwatchPreview.style.background = e.target.value;
      customHexLabel.textContent = e.target.value;
    });
    customInput.addEventListener('change', () => snapshot('Changed tag to custom color'));
    const customSwatchPreview = document.createElement('span');
    customSwatchPreview.className = 'custom-color-swatch-preview';
    customSwatchPreview.style.background = customInput.value;
    const customHexLabel = document.createElement('span');
    customHexLabel.className = 'custom-color-hex-label';
    customHexLabel.textContent = 'Custom…';
    customWrap.appendChild(customSwatchPreview);
    customWrap.appendChild(customHexLabel);
    customWrap.appendChild(customInput);
    colorRow.appendChild(customWrap);

    // ── Action row (Add to Ref / Delete) ──
    const actionRow = document.createElement('div');
    actionRow.className = 'swatch-panel-actions';
    colorRow.appendChild(actionRow);

    // ── "Add to Quick Ref" button ──
    const addRefBtn2 = document.createElement('button');
    addRefBtn2.className = 'tag-add-ref-btn';
    addRefBtn2.title = 'Add this tag as a Quick Reference entry';
    addRefBtn2.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> + Ref';
    addRefBtn2.addEventListener('click', e => {
      e.stopPropagation();
      const tagText = tagEl.textContent.trim() || 'Tag';
      const tr = document.createElement('tr');
      tr.setAttribute('data-ref-row', '');
      tr.innerHTML = `
        <td class="ref-td-name"><span class="ref-name" data-editable contenteditable="true">${tagText}</span><span class="ref-type" data-editable contenteditable="true"></span></td>
        <td class="ref-td-times"><span class="ref-times" data-editable contenteditable="true">—</span></td>`;
      refBody.appendChild(tr);
      initRefRow(tr);
      snapshot('Added tag to Quick Reference');
      // Flash the ref panel to indicate success
      const refSection = document.getElementById('refSection');
      if (refSection) {
        refSection.style.transition = 'box-shadow .2s';
        refSection.style.boxShadow = '0 0 0 3px var(--accent)';
        setTimeout(() => { refSection.style.boxShadow = ''; }, 800);
      }
      tr.querySelector('.ref-name').focus();
    });
    actionRow.appendChild(addRefBtn2);

    // ── Delete tag button ──
    const delTag = document.createElement('button');
    delTag.className = 'del-btn tag-del-btn';
    delTag.setAttribute('aria-label', 'Remove tag');
    delTag.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    delTag.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm('Remove this tag?')) {
        snapshot('Removed tag');
        colorRow.remove();
        tagEl.nextElementSibling?.classList.contains('field-clear-btn') && tagEl.nextElementSibling.remove();
        tagEl.remove();
        if (card) refreshAddTagBtn(card);
      }
    });
    actionRow.appendChild(delTag);

    // Insert the colorRow immediately after the tagEl (and its clear btn)
    const clrBtn = tagEl.nextElementSibling?.classList.contains('field-clear-btn') ? tagEl.nextElementSibling : null;
    const insertAfter = clrBtn || tagEl;
    if (insertAfter.nextSibling) insertAfter.parentNode.insertBefore(colorRow, insertAfter.nextSibling);
    else insertAfter.parentNode.appendChild(colorRow);
  }

  /**
   * Refresh the "+ Tag" ghost button on a card:
   * If card already has a card-tag, hide the button (one tag per card),
   * otherwise show it.
   */
  const MAX_TAGS_PER_CARD = 2; // allow one schedule tag + one route tag

  function refreshAddTagBtn(card) {
    const btn = card.querySelector('.add-tag-btn');
    if (!btn) return;
    const tagCount = card.querySelectorAll('.card-tag').length;
    btn.style.display = tagCount >= MAX_TAGS_PER_CARD ? 'none' : '';
    // Update button label based on context
    const hasRoute = [...card.querySelectorAll('.card-tag')].some(t =>
      [...t.classList].some(c => c.startsWith('tag-route')));
    const svgPlus = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    btn.innerHTML = tagCount === 0
      ? svgPlus + ' Tag'
      : svgPlus + ' Route';
  }

  /**
   * Inject the "+ Tag" button system into a card.
   * Also wires any existing .card-tag already in the card.
   */
  function injectTagSystem(card) {
    if (card._hasTagSystem || card.classList.contains('sticky-note')) return;
    card._hasTagSystem = true;

    // Wire any existing card-tag elements
    card.querySelectorAll('.card-tag').forEach(t => wireCardTag(t, card));

    // ── "+ Tag" ghost button ──
    const addBtn = document.createElement('button');
    addBtn.className = 'add-tag-btn';
    addBtn.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Tag';
    addBtn.title = 'Add a styled badge/tag label to this card';
    addBtn.addEventListener('click', e => {
      e.stopPropagation();
      const isRoute = card.querySelectorAll('.card-tag').length >= 1;
      const tag = document.createElement('div');
      tag.className = isRoute ? 'card-tag tag-route-blue' : 'card-tag tag-skilled';
      tag.setAttribute('data-editable', '');
      tag.setAttribute('contenteditable', 'true');
      tag.textContent = isRoute ? 'Route Name' : 'New Tag';
      if (isRoute) {
        // Route tag goes right after the existing first tag
        const firstTag = card.querySelector('.card-tag');
        if (firstTag && firstTag.nextSibling) card.insertBefore(tag, firstTag.nextSibling);
        else if (firstTag) firstTag.after(tag);
        else card.prepend(tag);
      } else {
        // Schedule tag goes before first content element
        const firstContent = card.querySelector('.card-label, .card-sub, [data-list], .card-list, .add-fac-btn');
        if (firstContent) card.insertBefore(tag, firstContent);
        else {
          const addTitleBtn = card.querySelector('.add-title-btn');
          if (addTitleBtn) card.insertBefore(tag, addTitleBtn.nextSibling);
          else card.prepend(tag);
        }
      }
      wireCardTag(tag, card);
      refreshAddTagBtn(card);
      snapshot('Added badge tag');
      tag.focus();
      document.execCommand('selectAll', false, null);
    });

    // Insert after the color row (near bottom of edit controls) but before list-toolbar
    const clt = card.querySelector('.card-list-toolbar');
    if (clt) card.insertBefore(addBtn, clt);
    else card.appendChild(addBtn);

    refreshAddTagBtn(card);
  }

  /* ─── BANNER NOTES (full-width) ─────────────────────────────────────────── */
  const BANNER_COLORS = ['blue', 'yellow', 'green', 'orange'];
  let   _bannerColorIdx = 0; // cycles through colors for new banners

  function initBannerNote(note) {
    if (note._initBanner) return;
    note._initBanner = true;

    // Wire existing banner-title if present
    const existingTitle = note.querySelector('.banner-title');
    if (existingTitle && !existingTitle._ew) {
      existingTitle._ew = true;
      existingTitle.setAttribute('contenteditable', 'true');
      existingTitle.setAttribute('data-editable', '');
      wireEditable(existingTitle);
      wireRte(existingTitle);
    }

    // Make body editable
    note.setAttribute('data-editable', '');
    if (editMode) note.contentEditable = 'true';
    wireEditable(note);

    // ── Add Title button ──
    function refreshBannerTitleBtn() {
      const existBtn = note.querySelector('.banner-add-title-btn');
      if (note.querySelector('.banner-title')) {
        if (existBtn) existBtn.remove();
      } else {
        if (!existBtn) {
          const btn = document.createElement('button');
          btn.className = 'banner-add-title-btn';
          btn.innerHTML = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Title`;
          btn.title = 'Add a title to this banner';
          btn.addEventListener('click', e => {
            e.stopPropagation();
            e.preventDefault();
            // Temporarily disable contenteditable on note so click doesn't propagate into it
            const wasCE = note.contentEditable;
            note.contentEditable = 'false';
            const titleEl = document.createElement('div');
            titleEl.className = 'banner-title';
            titleEl.setAttribute('contenteditable', 'true');
            titleEl.setAttribute('data-editable', '');
            titleEl.setAttribute('spellcheck', 'false');
            // Insert before btn or as first child after drag handle
            const dh = note.querySelector('.drag-handle');
            const anchor = dh ? dh.nextSibling : note.firstChild;
            note.insertBefore(titleEl, anchor);
            btn.remove();
            // Re-enable note contenteditable
            note.contentEditable = wasCE;
            // Wire the new title
            titleEl._ew = true;
            wireEditable(titleEl);
            wireRte(titleEl);
            // Delete button on title
            titleEl.addEventListener('keydown', ev => {
              if (ev.key === 'Backspace' && titleEl.textContent === '') {
                ev.preventDefault();
                snapshot('Removed banner title');
                titleEl.remove();
                refreshBannerTitleBtn();
              }
            });
            snapshot('Added banner title');
            titleEl.focus();
          });
          // Insert before first content after drag handle
          const dh2 = note.querySelector('.drag-handle');
          if (dh2) dh2.after(btn);
          else note.prepend(btn);
        }
      }
    }
    refreshBannerTitleBtn();
    note._refreshBannerTitle = refreshBannerTitleBtn;

    // Color swatch row
    const colorRow = document.createElement('div');
    colorRow.className = 'banner-color-row';
    BANNER_COLORS.forEach(c => {
      const sw = document.createElement('button');
      sw.className = `banner-color-swatch swatch-${c}`;
      sw.title = c.charAt(0).toUpperCase() + c.slice(1);
      if (note.classList.contains(`banner-${c}`)) sw.classList.add('selected');
      sw.addEventListener('click', e => {
        e.stopPropagation();
        BANNER_COLORS.forEach(x => note.classList.remove(`banner-${x}`));
        note.classList.add(`banner-${c}`);
        colorRow.querySelectorAll('.banner-color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        snapshot(`Changed banner color to ${c}`);
      });
      colorRow.appendChild(sw);
    });
    note.appendChild(colorRow);

    // Delete button
    const del = mkDelBtn('Delete banner note', () => {
      if (confirm('Remove this banner note?')) {
        snapshot('Removed banner note');
        note.remove();
      }
    });
    del.className = 'del-btn card-del-btn';
    note.appendChild(del);

    // Drag handle (reorder among siblings)
    const handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.title = 'Drag to reorder';
    handle.innerHTML = DOTS;
    note.insertBefore(handle, note.firstChild);

    handle.addEventListener('mousedown', e => { if (editMode) startDrag(e, note, 'card'); });
  }

  function addBannerNote() {
    const color = BANNER_COLORS[_bannerColorIdx % BANNER_COLORS.length];
    _bannerColorIdx++;
    const note = document.createElement('div');
    note.className = `banner-note banner-${color}`;
    note.setAttribute('data-banner', '');
    note.innerHTML = '<p>New banner note — click to edit.</p>';
    // Insert before the free-board-add div (i.e. at the bottom of sticky/banner area)
    const fbAdd = document.querySelector('.free-board-add');
    fbAdd ? fbAdd.parentElement.insertBefore(note, fbAdd) : freeBoard.parentElement.insertBefore(note, freeBoard);
    initBannerNote(note);
    if (editMode) { note.contentEditable = 'true'; note.focus(); }
    snapshot('Added banner note');
  }


  /* ─────────────────────────────────────────────────────────────────────────
     FREE BOARD CARDS (not tied to timeline)
  ───────────────────────────────────────────────────────────────────────── */
  function initFreeBoardCard(card) {
    if (card._init) return;
    card._init = true;

    // Title (editable heading)
    let titleEl = card.querySelector('.card-label');
    if (titleEl && !titleEl._ew) wireEditable(titleEl);
    if (titleEl && editMode) titleEl.contentEditable = 'true';

    // Body text (editable paragraph)
    let bodyEl = card.querySelector('.card-body');
    if (bodyEl && !bodyEl._ew) wireEditable(bodyEl);
    if (bodyEl && editMode) bodyEl.contentEditable = 'true';

    // List if present
    const list = card.querySelector('[data-list]');
    if (list) initList(list);

    // Delete button
    const del = mkDelBtn('Delete card', () => {
      const nm = titleEl?.textContent?.trim() || 'card';
      if (confirm(`Remove "${nm}"?`)) {
        snapshot(`Removed free card "${nm}"`);
        card.remove();
      }
    });
    del.className = 'del-btn card-del-btn';
    card.appendChild(del);

    // Color picker row
    injectCardColorRow(card);
    injectTagSystem(card);
    // ── List-style & Spacing toolbar (edit mode only, non-sticky cards) ──
    if (!card.classList.contains('sticky-note') && !card.querySelector('.card-list-toolbar')) {
      const clt = document.createElement('div');
      clt.className = 'card-list-toolbar';

      // Helper: make a group of toggle buttons
      function makeCltGroup(buttons, attrName) {
        const grp = document.createElement('div');
        grp.className = 'clt-group';
        buttons.forEach(({ label, title, val }) => {
          const b = document.createElement('button');
          b.className = 'clt-btn';
          b.title = title;
          b.innerHTML = label;
          b.dataset.val = val;
          b.addEventListener('click', e => {
            e.stopPropagation();
            const current = card.dataset[attrName];
            if (current === val) {
              delete card.dataset[attrName];
              grp.querySelectorAll('.clt-btn').forEach(x => x.classList.remove('active'));
            } else {
              card.dataset[attrName] = val;
              grp.querySelectorAll('.clt-btn').forEach(x => x.classList.toggle('active', x.dataset.val === val));
            }
            snapshot('Changed card style');
          });
          if (card.dataset[attrName] === val) b.classList.add('active');
          grp.appendChild(b);
        });
        return grp;
      }

      // List-style group
      clt.appendChild(makeCltGroup([
        { label: '&bull;', title: 'Bullet list',   val: 'bullet'   },
        { label: '1.',      title: 'Numbered list', val: 'numbered' },
        { label: '&mdash;', title: 'Plain (none)',  val: 'plain'    }
      ], 'listStyle'));

      const sep = document.createElement('span');
      sep.className = 'clt-sep';
      clt.appendChild(sep);

      // Spacing group
      clt.appendChild(makeCltGroup([
        { label: 'Tight',   title: 'Tight spacing',   val: 'tight'   },
        { label: 'Normal',  title: 'Normal spacing',  val: 'normal'  },
        { label: 'Relaxed', title: 'Relaxed spacing', val: 'relaxed' }
      ], 'spacing'));

      // Auto-height button: clears manual height so card fits content
      const sepAH = document.createElement('span');
      sepAH.className = 'clt-sep';
      clt.appendChild(sepAH);
      const ahBtn = document.createElement('button');
      ahBtn.className = 'clt-btn clt-autoheight-btn';
      ahBtn.title = 'Auto-size height to fit content';
      ahBtn.textContent = 'Auto H';
      ahBtn.addEventListener('click', e => {
        e.stopPropagation();
        card.style.removeProperty('height');
        card.style.removeProperty('min-height');
        snapshot('Auto-sized card height');
      });
      clt.appendChild(ahBtn);

      const awBtn = document.createElement('button');
      awBtn.className = 'clt-btn clt-autowidth-btn';
      awBtn.title = 'Auto-size width to fit content';
      awBtn.textContent = 'Auto W';
      awBtn.addEventListener('click', e => {
        e.stopPropagation();
        card.style.removeProperty('width');
        card.style.removeProperty('min-width');
        card.style.removeProperty('max-width');
        snapshot('Auto-sized card width');
      });
      clt.appendChild(awBtn);

      // Duplicate card button (Feature 4)
      const dupBtn = document.createElement('button');
      dupBtn.className = 'clt-btn clt-dup-btn';
      dupBtn.title = 'Duplicate this card';
      dupBtn.innerHTML = '&#10697; Dup';
      dupBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (window._duplicateCard) window._duplicateCard(card);
      });
      clt.appendChild(dupBtn);

      card.appendChild(clt);
    }

    // Resize handle
    if (!card.querySelector('.card-resize-handle')) {
      const rh = document.createElement('div');
      rh.className = 'card-resize-handle';
      rh.title = 'Drag to resize';
      rh.addEventListener('mousedown', e => { if (editMode) window._startCardResize(e, card); });
      card.appendChild(rh);
    }

    // Drag handle for reordering within the free board
    const handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.title = 'Drag to reorder';
    handle.innerHTML = DOTS;
    card.insertBefore(handle, card.firstChild);

    handle.addEventListener('mousedown', e => { if (editMode) startDrag(e, card, 'card'); });
  }

  function addFreeBoardCard() {
    const card = document.createElement('div');
    card.className = 'card card-default';
    card.setAttribute('data-card', '');
    card.innerHTML = `
      <div class="card-label" data-editable contenteditable="true">New Card</div>
      <div class="card-list" data-list></div>`;
    freeBoard.appendChild(card);
    initFreeBoardCard(card);
    // Wire the list
    const list = card.querySelector('[data-list]');
    if (list) initList(list);
    snapshot('Added free card');
    const title = card.querySelector('.card-label');
    if (title) { title.focus(); document.execCommand('selectAll', false, null); }
  }

  // Free board drop zone
  // freeBoard drop handled by pointer-based DnD

  /* ─── Day abbreviations for Quick Reference ──────────────────────────────
     Card tags read "MON / WED / FRI"; the sidebar is narrow, so compress to
     "M/W/F" before pairing a day set with a delivery time. */
  function compactDays(label) {
    if (!label) return '';
    return String(label)
      .toUpperCase()
      .replace(/\bMONDAY\b|\bMON\b/g,    'M')
      .replace(/\bTUESDAY\b|\bTUES\b|\bTUE\b/g, 'T')
      .replace(/\bWEDNESDAY\b|\bWED\b/g, 'W')
      .replace(/\bTHURSDAY\b|\bTHURS\b|\bTHU\b/g, 'Th')
      .replace(/\bFRIDAY\b|\bFRI\b/g,    'F')
      .replace(/\bSATURDAY\b|\bSAT\b/g,  'Sa')
      .replace(/\bSUNDAY\b|\bSUN\b/g,    'Su')
      .replace(/\bDAILY\b/g,             'Daily')
      .replace(/\s*([\/&–—-])\s*/g, '$1')
      .trim();
  }

  /* Pair a day set with a time: "M/W/F 11:30 AM". Falls back to the bare
     time when a card carries no frequency tag. */
  function daysPlusTime(days, time) {
    const d = compactDays(days);
    if (!time) return d;
    return d ? `${d} ${time}` : time;
  }

  /* ─── Fill Quick Reference times with delivery days ───────────────────────
     Walks the timeline, pairs each card's frequency tag with its slot time,
     and rewrites the matching Quick Reference row. Lets an existing saved
     schedule gain day information without regenerating the whole board. */
  function fillRefDaysFromTimeline() {
    // facility name (lowercased) -> ordered set of "M/W/F 11:30 AM" strings
    const map = new Map();

    document.querySelectorAll('.timeline-row').forEach(row => {
      const timeChip = row.querySelector('.time-chip');
      const time = timeChip ? timeChip.textContent.trim() : '';
      row.querySelectorAll('.card').forEach(card => {
        const freqTag = card.querySelector('.tag-freq');
        const entry = daysPlusTime(freqTag ? freqTag.textContent.trim() : '', time);
        if (!entry) return;
        card.querySelectorAll('.card-list span[data-editable]').forEach(s => {
          const nm = s.textContent.trim();
          if (!nm) return;
          const k = nm.toLowerCase();
          if (!map.has(k)) map.set(k, new Set());
          map.get(k).add(entry);
        });
      });
    });

    const unmatched = [];
    let updated = 0;
    document.querySelectorAll('#refBody tr[data-ref-row]').forEach(tr => {
      const nameEl  = tr.querySelector('.ref-name');
      const timesEl = tr.querySelector('.ref-times');
      if (!nameEl || !timesEl) return;
      const name = nameEl.textContent.trim();
      const set  = map.get(name.toLowerCase());
      if (!set || !set.size) { if (name) unmatched.push(name); return; }
      const next = [...set].join(' \u00b7 ');
      if (timesEl.textContent.trim() !== next) { timesEl.textContent = next; updated++; }
    });

    return { updated, unmatched };
  }

  /* Live dashboard opens in a new tab and reads the SAVED state, so flush any
     pending edits to localStorage first — otherwise it shows stale data. */
  const liveViewBtn = document.getElementById('liveViewBtn');
  if (liveViewBtn) liveViewBtn.addEventListener('click', () => {
    try { if (typeof saveNow === 'function') saveNow(true); } catch (e) {}
  });

  const expRefDaysBtn = document.getElementById('expRefDaysBtn');
  if (expRefDaysBtn) expRefDaysBtn.addEventListener('click', () => {
    const dd = document.getElementById('exportDropdown');
    if (dd) dd.hidden = true;
    if (!confirm('Rewrite Quick Reference delivery times to include the days each facility is served?\n\nDays are read from the timeline cards. Facilities not found on the timeline are left untouched.')) return;

    if (typeof snapshot === 'function') snapshot('Filled delivery days in Quick Reference');
    const { updated, unmatched } = fillRefDaysFromTimeline();

    let msg = `Updated ${updated} Quick Reference ${updated === 1 ? 'row' : 'rows'} with delivery days.`;
    if (unmatched.length) {
      const shown = unmatched.slice(0, 8).join(', ');
      msg += `\n\nNot found on the timeline (left unchanged): ${shown}`;
      if (unmatched.length > 8) msg += `, +${unmatched.length - 8} more`;
    }
    alert(msg);
  });

  /* ─────────────────────────────────────────────────────────────────────────
     FULL INIT PASS
  ───────────────────────────────────────────────────────────────────────── */
  /* ─── Quick Reference structural migration ──────────────────────────────
     Saved schedules (localStorage / imported backups) may come from any
     earlier version — some with no Type at all, some with Type as its own
     column. The reference table is now TWO columns, with the type badge
     rendered inline beside the facility name to save horizontal space.
     This collapses any older shape into that canonical structure. */
  function normalizeRefTable() {
    const table = document.getElementById('refTable');
    if (!table) return;

    // 1. Canonical header row — two visible columns
    const headRow = table.querySelector('thead tr');
    if (headRow) {
      headRow.innerHTML =
        '<th class="ref-drag-cell ref-drag-th"></th>' +
        '<th class="ref-th-name">Facility</th>' +
        '<th class="ref-th-times">Delivery Time(s)</th>';
    }

    // 2. Canonical body cells
    table.querySelectorAll('tbody tr[data-ref-row]').forEach(tr => {
      const nameSpan  = tr.querySelector('.ref-name');
      const nameCell  = nameSpan?.closest('td');
      const timesCell = tr.querySelector('.ref-times')?.closest('td');
      let   typeSpan  = tr.querySelector('.ref-type');

      if (nameCell)  nameCell.classList.add('ref-td-name');
      if (timesCell) timesCell.classList.add('ref-td-times');
      if (!nameCell || !nameSpan) return;

      // Create a type badge if this row predates the Type field
      if (!typeSpan) {
        typeSpan = document.createElement('span');
        typeSpan.className = 'ref-type';
        typeSpan.setAttribute('data-editable', '');
        typeSpan.setAttribute('contenteditable', 'true');
      }

      // Move the badge inline, directly after the facility name
      if (typeSpan.parentElement !== nameCell || nameSpan.nextElementSibling !== typeSpan) {
        nameSpan.after(typeSpan);
      }

      // Drop any now-empty standalone Type cell left over from older saves
      tr.querySelectorAll('td.ref-td-type').forEach(td => {
        if (!td.querySelector('.ref-type')) td.remove();
      });
    });
  }


  function initAll() {
    initHeader();
    normalizeRefTable();
    // Sticky notes
    document.querySelectorAll('.sticky-note').forEach(initCard);
    // Banner notes
    document.querySelectorAll('[data-banner]').forEach(initBannerNote);
    // Free board cards
    document.querySelectorAll('#freeBoard [data-card]').forEach(initFreeBoardCard);
    // Timeline rows
    document.querySelectorAll('.timeline-row').forEach(initRow);
    // Cards inside rows (initRow calls initCard for .cards-col children,
    // but call again for any restored from snapshot)
    document.querySelectorAll('[data-card]:not(.sticky-note):not(#freeBoard [data-card])').forEach(initCard);
    // Lists
    document.querySelectorAll('[data-list]').forEach(initList);
    // Reference table rows
    document.querySelectorAll('#refBody tr[data-ref-row]').forEach(initRefRow);
    if (window._wireRefDragHandles) window._wireRefDragHandles();
    // Standalone [data-editable] not inside data-list
    document.querySelectorAll('[data-editable]').forEach(el => {
      if (!el.closest('[data-list]') && !el._ew) {
        el._ew = true;
        wireEditable(el);
      }
    });
    updateSlotCountBadge();
    if (window._applyWeekendMode) window._applyWeekendMode();
  }

  /* ─────────────────────────────────────────────────────────────────────────
     ADD ACTIONS
  ───────────────────────────────────────────────────────────────────────── */
  function createRow(insertBefore) {
    const row = document.createElement('div');
    row.className = 'timeline-row';
    row.setAttribute('data-time', 'New Time');
    row.innerHTML = `
      <div class="time-col">
        <span class="time-chip" data-editable contenteditable="true">New Time</span>
      </div>
      <div class="timeline-spine"><div class="spine-dot"></div></div>
      <div class="cards-col"></div>`;
    // Insert before the add-slot-row if present, otherwise append to timeline
    const slotAnchor = timeline.querySelector('.add-slot-row');
    timeline.insertBefore(row, insertBefore || slotAnchor || null);
    initRow(row);
    updateSlotCountBadge();
    if (window._applyWeekendMode) window._applyWeekendMode();
    snapshot('Added time slot');
    row.querySelector('.time-chip').focus();
    document.execCommand('selectAll', false, null);
    return row;
  }

  function addCardToRow(cardsCol) {
    const card = document.createElement('div');
    card.className = 'card card-default';
    card.setAttribute('data-card', '');
    const list = document.createElement('div');
    list.className = 'card-list';
    list.setAttribute('data-list', '');
    card.appendChild(list);
    const addCardBtn = cardsCol.querySelector('.add-card-btn');
    cardsCol.insertBefore(card, addCardBtn || null);
    initCard(card);
    // CSS .edit-mode class handles visibility
    snapshot('Added card');
    addFacility(list);
  }

  // addSlotBtn / addRefBtn listeners are wired in _reinjectEditOnlyUI()

  /* ─────────────────────────────────────────────────────────────────────────
     PDF / PRINT EXPORT
  ───────────────────────────────────────────────────────────────────────── */
  let printSize   = 'A3';
  let printOrient = 'landscape';

  // Toggle dropdown
  pdfBtn.addEventListener('click', e => {
    e.stopPropagation();
    exportDropdown.hidden = !exportDropdown.hidden;
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!exportDropdown.hidden && !exportDropdown.contains(e.target) && e.target !== pdfBtn) {
      exportDropdown.hidden = true;
    }
  });

  // Size selection
  expSizeOpts.addEventListener('click', e => {
    const btn = e.target.closest('[data-size]');
    if (!btn) return;
    printSize = btn.dataset.size;
    expSizeOpts.querySelectorAll('.exp-opt').forEach(b => b.classList.toggle('active', b === btn));
  });

  // Orientation selection
  expOrientOpts.addEventListener('click', e => {
    const btn = e.target.closest('[data-orient]');
    if (!btn) return;
    printOrient = btn.dataset.orient;
    expOrientOpts.querySelectorAll('.exp-opt').forEach(b => b.classList.toggle('active', b === btn));
  });

  /* Include / exclude the Quick Reference sidebar in exports.
     Persisted so the choice survives reloads. */
  const inclRefBtn = document.getElementById('expInclRefBtn');
  let includeRefInExport = localStorage.getItem('exportIncludeRef') !== '0';
  function syncInclRefBtn() {
    if (!inclRefBtn) return;
    inclRefBtn.classList.toggle('active', includeRefInExport);
    inclRefBtn.setAttribute('aria-pressed', String(includeRefInExport));
  }
  syncInclRefBtn();
  if (inclRefBtn) inclRefBtn.addEventListener('click', () => {
    includeRefInExport = !includeRefInExport;
    localStorage.setItem('exportIncludeRef', includeRefInExport ? '1' : '0');
    syncInclRefBtn();
  });

  // Print button inside dropdown
  expPrintBtn.addEventListener('click', () => {
    exportDropdown.hidden = true;
    if (editMode) setEditMode(false);
    // Capture the current ref-section width and bake it into print CSS
    const refW = refSection ? Math.round(refSection.getBoundingClientRect().width) : 400;
    let pageStyle = document.getElementById('printPageStyle');
    if (!pageStyle) {
      pageStyle = document.createElement('style');
      pageStyle.id = 'printPageStyle';
      document.head.appendChild(pageStyle);
    }
    // Override both the @page size AND the ref-section width for print
    /* Letter is the tightest common sheet, so auto-condense: measure the
       laid-out schedule against the printable area and zoom it down just
       enough to land on a single page. Never scales up. */
    let condense = '';
    if (printSize === 'letter') {
      const MM_PER_IN = 25.4, PX_PER_IN = 96;
      const marginXin = 16 / MM_PER_IN, marginYin = 14 / MM_PER_IN;
      const sheetIn   = printOrient === 'landscape' ? [11, 8.5] : [8.5, 11];
      const availW = (sheetIn[0] - marginXin * 2) * PX_PER_IN;
      const availH = (sheetIn[1] - marginYin * 2) * PX_PER_IN;

      const area = document.getElementById('printArea');
      const contentW = area ? Math.max(area.scrollWidth,  area.offsetWidth)  : 0;
      const contentH = area ? Math.max(area.scrollHeight, area.offsetHeight) : 0;

      if (contentW > 0 && contentH > 0) {
        // 0.4 floor keeps it legible rather than shrinking into unreadability
        const fit = Math.min(availW / contentW, availH / contentH, 1);
        const z   = Math.max(fit, 0.4);
        if (z < 0.995) {
          condense =
            `  #printArea { zoom: ${z.toFixed(4)}; }\n` +
            `  .card, .timeline-row, .ref-table tbody tr, .sticky-note {\n` +
            `    page-break-inside: avoid !important; break-inside: avoid !important; }`;
          console.log('[Condensed Letter] content', Math.round(contentW), 'x', Math.round(contentH),
                      '→ zoom', z.toFixed(4));
        }
      }
    }

    pageStyle.textContent = [
      `@media print {`,
      `  @page { size: ${printSize} ${printOrient}; margin: 14mm 16mm; }`,
      includeRefInExport
        ? `  .ref-section { width: ${refW}px !important; }`
        : `  .ref-section { display: none !important; }\n  .timeline-section { border-right: none !important; padding-right: 0 !important; }`,
      condense,
      `}`
    ].filter(Boolean).join('\n');
    setTimeout(() => window.print(), 80);
  });

  /* ─── QUICK REFERENCE RESIZE ─────────────────────────────────────────────── */
  // Full-size PDF: capture printArea as a single image, no page splits
  const expFullSizeBtn = document.getElementById('expFullSizeBtn');
  if (expFullSizeBtn) {
    expFullSizeBtn.addEventListener('click', async () => {
      exportDropdown.hidden = true;
      const wasEdit = editMode;
      if (wasEdit) setEditMode(false);
      expFullSizeBtn.innerHTML = 'Capturing…';
      expFullSizeBtn.disabled = true;

      // Hide UI chrome, but KEEP the Quick Reference sidebar in the capture
      const refEl   = document.getElementById('refSection');
      const toolbar = document.querySelector('.toolbar');
      const prevToolbarDisplay = toolbar ? toolbar.style.display : null;

      /* Capture <body> so the site header (title, subtitle, cutoff pill) is
         part of the image, then hide the interactive chrome inside it. */
      const el = document.body;
      const header  = document.querySelector('.site-header');
      const hdrActs = document.querySelector('.header-actions');
      const editBan = document.querySelector('.edit-banner');
      const prevHdrPosition = header  ? header.style.position  : null;
      const prevHdrTop      = header  ? header.style.top       : null;
      const prevHdrActs     = hdrActs ? hdrActs.style.display  : null;
      const prevEditBan     = editBan ? editBan.style.display  : null;
      if (header) {
        // Un-stick the header so it renders inline at the top of the capture
        header.style.position = 'static';
        header.style.top      = 'auto';
      }
      if (hdrActs) hdrActs.style.display = 'none';
      if (editBan) editBan.style.display = 'none';

      if (toolbar) toolbar.style.display = 'none';
      const prevRefDisplay = refEl ? refEl.style.display : null;
      if (refEl && !includeRefInExport) refEl.style.display = 'none';

      // Force el (and the sidebar, which scrolls independently) to full height
      const origOverflow = el.style.overflow;
      const origMaxH     = el.style.maxHeight;
      el.style.overflow  = 'visible';
      el.style.maxHeight = 'none';
      const prevRefOverflow = refEl ? refEl.style.overflow  : null;
      const prevRefMaxH     = refEl ? refEl.style.maxHeight : null;
      const prevRefPos      = refEl ? refEl.style.position  : null;
      if (refEl) {
        refEl.style.overflow  = 'visible';
        refEl.style.maxHeight = 'none';
        refEl.style.position  = 'static';
      }

      // Brief reflow pause
      await new Promise(r => setTimeout(r, 60));

      try {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const bgColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--bg').trim() || '#ffffff';

        /* <body> can report a scrollWidth narrower than the laid-out page
           (percentage widths, sticky children), which crops the capture.
           Take the widest honest measurement available. */
        const docEl = document.documentElement;
        const capW = Math.ceil(Math.max(
          el.scrollWidth, el.offsetWidth,
          docEl.scrollWidth, docEl.offsetWidth,
          docEl.getBoundingClientRect().width,
          window.innerWidth
        ));
        const capH = Math.ceil(Math.max(
          el.scrollHeight, el.offsetHeight,
          docEl.scrollHeight, docEl.offsetHeight
        ));
        console.log('[Full Size PDF] capture size', capW, 'x', capH);

        const canvas = await html2canvas(el, {
          scale: dpr,
          useCORS: true,
          allowTaint: true,
          backgroundColor: bgColor,
          logging: false,
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0,
          windowWidth:  capW,
          windowHeight: capH,
          width:  capW,
          height: capH,
          onclone: (clonedDoc) => {
            // Bake all CSS custom properties so var() resolves in the iframe
            const liveStyles = getComputedStyle(document.documentElement);
            const clonedRoot = clonedDoc.documentElement;
            const allRules = [...document.styleSheets].flatMap(ss => {
              try { return [...ss.cssRules]; } catch { return []; }
            });
            const customProps = new Set();
            allRules.forEach(rule => {
              if (rule.style) {
                [...rule.style].forEach(prop => {
                  if (prop.startsWith('--')) customProps.add(prop);
                });
              }
            });
            customProps.forEach(prop => {
              const val = liveStyles.getPropertyValue(prop);
              if (val) clonedRoot.style.setProperty(prop, val);
            });
            // Hide toolbar in clone; keep Quick Reference visible and unclipped
            const clonedRef     = clonedDoc.getElementById('refSection');
            const clonedToolbar = clonedDoc.querySelector('.toolbar');
            if (clonedToolbar) clonedToolbar.style.display = 'none';
            if (clonedRef) {
              if (includeRefInExport) {
                clonedRef.style.overflow  = 'visible';
                clonedRef.style.maxHeight = 'none';
                clonedRef.style.position  = 'static';
              } else {
                clonedRef.style.display = 'none';
              }
            }
            // Bake computed colors onto all colored elements
            const SELECTORS = '.card, .card-tag, .timeline-row, .time-chip, .banner-note, .free-card, [data-card]';
            const liveEls   = el.querySelectorAll(SELECTORS);
            const clonedEl  = clonedDoc.body;
            const clonedEls = clonedEl ? clonedEl.querySelectorAll(SELECTORS) : [];
            liveEls.forEach((liveEl, i) => {
              if (!clonedEls[i]) return;
              const cs = getComputedStyle(liveEl);
              clonedEls[i].style.backgroundColor = cs.backgroundColor;
              clonedEls[i].style.color           = cs.color;
              clonedEls[i].style.borderColor     = cs.borderColor;
            });
          },
        });

        console.log('[Full Size PDF] canvas', canvas.width, 'x', canvas.height, 'dpr', dpr);
        const imgData = canvas.toDataURL('image/png');
        const pxToMm  = px => parseFloat((px * 25.4 / 96).toFixed(2));
        const wMm = pxToMm(canvas.width  / dpr);
        const hMm = pxToMm(canvas.height / dpr);

        // Lazy-load jsPDF
        if (!window.jspdf) {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
        }
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: wMm > hMm ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [wMm, hMm],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, wMm, hMm, undefined, 'FAST');
        pdf.save('delivery-schedule-full.pdf');

      } catch (err) {
        console.error('Full-size PDF error:', err);
        alert('Could not generate PDF: ' + err.message);
      } finally {
        // Restore hidden / unclipped elements
        if (refEl) {
          refEl.style.display   = prevRefDisplay;
          refEl.style.overflow  = prevRefOverflow;
          refEl.style.maxHeight = prevRefMaxH;
          refEl.style.position  = prevRefPos;
        }
        if (toolbar) toolbar.style.display = prevToolbarDisplay;
        if (header) {
          header.style.position = prevHdrPosition;
          header.style.top      = prevHdrTop;
        }
        if (hdrActs) hdrActs.style.display = prevHdrActs;
        if (editBan) editBan.style.display = prevEditBan;
        el.style.overflow  = origOverflow;
        el.style.maxHeight = origMaxH;
        expFullSizeBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg> Full Size (no page splits)';
        expFullSizeBtn.disabled = false;
        if (wasEdit) setEditMode(true);
      }
    });
  }

  // Reset all card colors to default
  const expResetColorsBtn = document.getElementById('expResetColorsBtn');
  if (expResetColorsBtn) {
    expResetColorsBtn.addEventListener('click', () => {
      exportDropdown.hidden = true;
      const count = document.querySelectorAll('.card:not(.sticky-note)').length;
      if (!confirm(`Reset all ${count} card colors back to white/default?`)) return;
      document.querySelectorAll('.card:not(.sticky-note)').forEach(card => {
        CARD_VARIANTS.forEach(v => card.classList.remove(`card-${v.key}`));
        card.classList.add('card-default');
        card.style.removeProperty('background');
        card.style.removeProperty('border-color');
      });
      snapshot('Reset all card colors to default');
    });
  }

  // Global auto-size all card heights
  const expAutoHeightBtn = document.getElementById('expAutoHeightBtn');
  if (expAutoHeightBtn) {
    expAutoHeightBtn.addEventListener('click', () => {
      exportDropdown.hidden = true;
      document.querySelectorAll('[data-card]').forEach(card => {
        card.style.removeProperty('height');
        card.style.removeProperty('min-height');
      });
      snapshot('Auto-sized all card heights');
    });
  }

  const expAutoWidthBtn = document.getElementById('expAutoWidthBtn');
  if (expAutoWidthBtn) {
    expAutoWidthBtn.addEventListener('click', () => {
      exportDropdown.hidden = true;
      document.querySelectorAll('[data-card]').forEach(card => {
        card.style.removeProperty('width');
        card.style.removeProperty('min-width');
        card.style.removeProperty('max-width');
      });
      snapshot('Auto-sized all card widths');
    });
  }

  (function initRefResize() {
    const MIN_W = 240;
    const MAX_W = 700;
    let isResizing = false;
    let startX     = 0;
    let startW     = 0;
    let activeHandle = null;
    let activeSection = null;

    // Use event delegation on document so it works even after import replaces the DOM
    document.addEventListener('mousedown', e => {
      const handle = e.target.closest('#refResizeHandle');
      if (!handle) return;
      const sec = document.getElementById('refSection');
      if (!sec) return;
      isResizing    = true;
      activeHandle  = handle;
      activeSection = sec;
      startX = e.clientX;
      startW = sec.getBoundingClientRect().width;
      handle.classList.add('resizing');
      document.body.style.cursor     = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!isResizing) return;
      const delta = startX - e.clientX;
      const newW  = Math.min(MAX_W, Math.max(MIN_W, startW + delta));
      activeSection.style.width = newW + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!isResizing) return;
      isResizing = false;
      if (activeHandle) activeHandle.classList.remove('resizing');
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      activeHandle = null;
      activeSection = null;
    });
  })();


  /* ─── CARD RESIZE ────────────────────────────────────────────────────────── */
  /* ─── QUICK REFERENCE TEXT SIZE ─────────────────────────────────────────── */
  (function initRefSize() {
    const SIZES  = [9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24];
    let curIdx   = SIZES.indexOf(13); // default 13px
    const refSizeUp      = document.getElementById('refSizeUp');
    const refSizeDown    = document.getElementById('refSizeDown');
    const refSizeDisplay = document.getElementById('refSizeDisplay');

    function applyRefSize() {
      const px = SIZES[curIdx];
      refSection.style.setProperty('--ref-font-size', px + 'px');
      if (refSizeDisplay) refSizeDisplay.textContent = px + 'px';
    }

    if (refSizeUp) refSizeUp.addEventListener('click', () => {
      if (curIdx < SIZES.length - 1) { curIdx++; applyRefSize(); snapshot('Increased ref text size'); }
    });
    if (refSizeDown) refSizeDown.addEventListener('click', () => {
      if (curIdx > 0) { curIdx--; applyRefSize(); snapshot('Decreased ref text size'); }
    });

    applyRefSize(); // apply default on load

    // ── Sort Quick Reference A–Z ──
    function sortRefAlpha() {
      const rows = [...refBody.querySelectorAll('tr[data-ref-row]')];
      rows.sort((a, b) => {
        const na = (a.querySelector('.ref-name')?.textContent || '').trim().toLowerCase();
        const nb = (b.querySelector('.ref-name')?.textContent || '').trim().toLowerCase();
        return na.localeCompare(nb);
      });
      rows.forEach(r => refBody.appendChild(r));
    }

    // Auto-sort on load
    sortRefAlpha();

    const refSortBtn = document.getElementById('refSortBtn');
    if (refSortBtn) refSortBtn.addEventListener('click', () => {
      sortRefAlpha();
      snapshot('Sorted Quick Reference A–Z');
    });
  })();

  (function initCardResize() {
    const CARD_MIN_W = 110;
    const CARD_MAX_W = 520;
    const CARD_MIN_H = 48;
    const CARD_MAX_H = 600;
    let rCard = null, rStartX = 0, rStartY = 0, rStartW = 0, rStartH = 0;

    // Column breakpoints: width → col count
    // < 220px → 1 col, 220–339px → 2 cols, 340–459px → 3 cols, ≥460px → 4 cols
    function colsForWidth(w) {
      if (w >= 460) return 4;
      if (w >= 340) return 3;
      if (w >= 220) return 2;
      return 1;
    }
    function applyColCount(card, w) {
      const cols = colsForWidth(w);
      if (cols === 1) card.removeAttribute('data-cols');
      else card.setAttribute('data-cols', cols);
    }

    // Apply column count to all existing cards on load
    window._applyAllCardCols = function() {
      document.querySelectorAll('[data-card]').forEach(card => {
        const w = card.getBoundingClientRect().width || parseFloat(card.style.width) || 0;
        if (w > 0) applyColCount(card, w);
      });
    };

    document.addEventListener('mousemove', e => {
      if (!rCard) return;
      const dw = e.clientX - rStartX;
      const dh = e.clientY - rStartY;
      const newW = Math.min(CARD_MAX_W, Math.max(CARD_MIN_W, rStartW + dw));
      const newH = Math.min(CARD_MAX_H, Math.max(CARD_MIN_H, rStartH + dh));
      rCard.style.width    = newW + 'px';
      rCard.style.minWidth = newW + 'px';
      rCard.style.height   = newH + 'px';
      applyColCount(rCard, newW);
    });

    document.addEventListener('mouseup', () => {
      if (!rCard) return;
      rCard.classList.remove('card-resizing');
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      snapshot('Resized card');
      rCard = null;
    });

    // Called by initCard and initFreeBoardCard for every card
    window._startCardResize = function(e, card) {
      e.preventDefault();
      e.stopPropagation();
      const rect = card.getBoundingClientRect();
      rCard    = card;
      rStartX  = e.clientX;
      rStartY  = e.clientY;
      rStartW  = rect.width;
      rStartH  = rect.height;
      card.classList.add('card-resizing');
      document.body.style.cursor     = 'se-resize';
      document.body.style.userSelect = 'none';
    };
  })();

  /* ─── BACKUP & IMPORT ────────────────────────────────────────────────────── */

  /* ─── LOCAL STORAGE AUTO-SAVE ────────────────────────────────────────────── */
  const LS_KEY       = 'deliverySchedule_v1';
  const saveBtn      = document.getElementById('saveBtn');
  const saveBtnLabel = document.getElementById('saveBtnLabel');
  const saveIndicator = document.getElementById('saveIndicator');
  let   _saveTimer   = null;
  let   _hasUnsaved  = false;

  function serializeState() {
    const clone = printArea.cloneNode(true);
    stripEditUI(clone);
    return {
      version:     2,
      ts:          new Date().toISOString(),
      html:        clone.innerHTML,
      header:      captureHeader(),
      refFontSize: refSection.style.getPropertyValue('--ref-font-size') || '13px',
      theme:       document.documentElement.dataset.theme || 'light',
    };
  }

  function showSaveToast(msg, type /* 'saved' | 'error' */) {
    clearTimeout(saveIndicator._hideTimer);
    saveIndicator.textContent = msg;
    saveIndicator.className = 'save-indicator show si-' + type;
    saveIndicator._hideTimer = setTimeout(() => {
      saveIndicator.classList.remove('show');
    }, 2200);
  }

  function markUnsaved() {
    _hasUnsaved = true;
    saveBtnLabel.textContent = 'Save*';
    saveBtn.classList.remove('saved');
  }

  function markSaved() {
    _hasUnsaved = false;
    saveBtnLabel.textContent = 'Saved ✓';
    saveBtn.classList.add('saved');
    // Revert label after 3s
    clearTimeout(saveBtn._revertTimer);
    saveBtn._revertTimer = setTimeout(() => {
      saveBtnLabel.textContent = 'Save';
    }, 3000);
  }

  function saveNow(silent) {
    try {
      const data = serializeState();
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      markSaved();
      if (window._syncActiveScheduleSnapshot) window._syncActiveScheduleSnapshot();
      if (!silent) showSaveToast('✓ Saved to browser', 'saved');
      return true;
    } catch (err) {
      // localStorage full or unavailable
      const msg = err.name === 'QuotaExceededError'
        ? 'Storage full — use Backup to download a file'
        : 'Save failed: ' + err.message;
      showSaveToast('⚠ ' + msg, 'error');
      return false;
    }
  }

  function scheduleAutoSave() {
    markUnsaved();
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => saveNow(true), 1500);
  }

  // ── Load from localStorage on startup ──
  function loadSavedState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data.html || !data.header) return false;
      _noSnap = true;
      printArea.innerHTML = data.html;
      stripEditUI(printArea); // remove any injected edit UI so re-init doesn't double up
      restoreHeader(data.header);
      _reinjectEditOnlyUI();
      // Clean up stale inline border-color on default cards.
      // A card-default card should never have a custom borderColor
      // unless its background was also customized (non-default).
      printArea.querySelectorAll('.card-default, .card:not([class*="card-purple"]):not([class*="card-pickup"]):not([class*="card-skilled"])').forEach(card => {
        const bg = card.style.background || card.style.backgroundColor;
        if (!bg) card.style.removeProperty('border-color');
      });
      // Time chips must never have inline border-color or background
      printArea.querySelectorAll('.time-chip').forEach(chip => {
        chip.style.removeProperty('border-color');
        chip.style.removeProperty('border');
        chip.style.removeProperty('background');
        chip.style.removeProperty('background-color');
        chip.style.removeProperty('color');
      });
      if (data.refFontSize) {
        const rs = document.getElementById('refSection');
        if (rs) rs.style.setProperty('--ref-font-size', data.refFontSize);
      }
      // Restore font-size display
      const display = document.getElementById('refSizeDisplay');
      if (display) display.textContent = data.refFontSize || '13px';
      _noSnap = false;
      return true;
    } catch (err) {
      console.warn('Could not load saved state:', err);
      return false;
    }
  }

  // ── Wire Save button ──
  saveBtn.addEventListener('click', () => saveNow(false));

  // ── Ctrl+S / Cmd+S keyboard shortcut ──
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveNow(false);
    }
  });

  // ── Hook into snapshot to schedule auto-save ──
  // We wrap the existing snapshot function
  const _origSnapshot = snapshot;
  // Override snapshot to also trigger auto-save
  window._scheduleAutoSave = scheduleAutoSave;

  // ── Check if saved data exists, show last-saved time in title ──
  (function checkSavedBadge() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const ts = data.ts ? new Date(data.ts) : null;
        if (ts) {
          const timeStr = ts.toLocaleDateString(undefined, { month:'short', day:'numeric' })
            + ' ' + ts.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
          saveBtn.title = `Save to browser (last saved: ${timeStr}) — Ctrl+S`;
        }
        saveBtnLabel.textContent = 'Save';
        saveBtn.classList.remove('saved');
      }
    } catch(_) {}
  })();

  (function initBackupImport() {
    const backupBtn       = document.getElementById('backupBtn');
    const importBtn       = document.getElementById('importBtn');
    const importFileInput = document.getElementById('importFileInput');

    // ── Backup: serialize current state to JSON and download ──
    backupBtn.addEventListener('click', () => {
      const clone = printArea.cloneNode(true);
      stripEditUI(clone); // strip injected edit UI so backup is clean on re-import
      const data = {
        version: 1,
        ts: new Date().toISOString(),
        html: clone.innerHTML,
        header: captureHeader(),
        refFontSize: refSection.style.getPropertyValue('--ref-font-size') || '13px',
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `delivery-schedule-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // ── Import: read JSON file and restore state ──
    importBtn.addEventListener('click', () => importFileInput.click());

    importFileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!data.html || !data.header) throw new Error('Invalid backup file');
          if (!confirm('This will replace the current schedule with the backup. Continue?')) return;
          _noSnap = true;
          const wasEdit = editMode;
          if (wasEdit) setEditMode(false);
          printArea.innerHTML = data.html;
          stripEditUI(printArea); // remove any injected edit UI so re-init doesn't double up
          restoreHeader(data.header);
          // Re-inject edit-only UI — stripped above, will be re-injected cleanly
          _reinjectEditOnlyUI();
          // Clean stale border-color on default cards
          printArea.querySelectorAll('.card-default, .card:not([class*="card-purple"]):not([class*="card-pickup"]):not([class*="card-skilled"])').forEach(card => {
            const bg = card.style.background || card.style.backgroundColor;
            if (!bg) card.style.removeProperty('border-color');
          });
          // Time chips must never have inline border-color or background
          printArea.querySelectorAll('.time-chip').forEach(chip => {
            chip.style.removeProperty('border-color');
            chip.style.removeProperty('border');
            chip.style.removeProperty('background');
            chip.style.removeProperty('background-color');
            chip.style.removeProperty('color');
          });
          const restoredRefSection = document.getElementById('refSection');
          if (restoredRefSection && data.refFontSize) restoredRefSection.style.setProperty('--ref-font-size', data.refFontSize);
          initAll();
          if (window._applyAllCardCols) window._applyAllCardCols();
          if (wasEdit) setEditMode(true);
          _noSnap = false;
          snapshot('Imported backup');
        } catch(err) {
          alert('Could not load backup: ' + err.message);
        }
        importFileInput.value = ''; // reset so same file can be re-imported
      };
      reader.readAsText(file);
    });
  })();

  /* ─── QUICK REFERENCE DRAG-TO-REORDER ────────────────────────────────────── */
  (function initRefDrag() {
    let dragRow   = null;
    let overRow   = null;

    // Inject drag handle cell into each ref row
    function injectRefDragHandle(tr) {
      if (tr._refDrag) return;
      tr._refDrag = true;
      const td = document.createElement('td');
      td.className = 'ref-drag-cell';
      td.title = 'Drag to reorder';
      td.innerHTML = '⠿';
      // Insert as FIRST cell
      tr.insertBefore(td, tr.firstChild);

      td.addEventListener('mousedown', e => {
        if (!editMode) return;
        e.preventDefault();
        dragRow = tr;
        tr.classList.add('ref-dragging');
        document.body.style.userSelect = 'none';
      });
    }

    // Wire on existing rows and re-wire after initAll
    function wireAllRefRows() {
      document.querySelectorAll('#refBody tr[data-ref-row]').forEach(injectRefDragHandle);
    }
    window._wireRefDragHandles = wireAllRefRows;
    wireAllRefRows();

    document.addEventListener('mousemove', e => {
      if (!dragRow) return;
      const target = e.target.closest('#refBody tr[data-ref-row]');
      if (target && target !== dragRow) {
        if (overRow && overRow !== target) overRow.classList.remove('ref-drag-over');
        overRow = target;
        overRow.classList.add('ref-drag-over');
      } else if (!target && overRow) {
        overRow.classList.remove('ref-drag-over');
        overRow = null;
      }
    });

    document.addEventListener('mouseup', () => {
      if (!dragRow) return;
      dragRow.classList.remove('ref-dragging');
      if (overRow) {
        overRow.classList.remove('ref-drag-over');
        // Insert dragRow before or after overRow based on vertical position
        const dragIdx = [...refBody.children].indexOf(dragRow);
        const overIdx = [...refBody.children].indexOf(overRow);
        if (dragIdx < overIdx) overRow.after(dragRow);
        else overRow.before(dragRow);
        snapshot('Reordered quick reference');
      }
      document.body.style.userSelect = '';
      dragRow = null;
      overRow = null;
    });
  })();

  /* ─────────────────────────────────────────────────────────────────────────
     BOOT
  ───────────────────────────────────────────────────────────────────────── */
  // Load saved state from localStorage (if any), then init
  const _hadSaved = loadSavedState();
  // Ensure edit-only UI is injected even on a fresh page load (no saved state)
  if (!_hadSaved) _reinjectEditOnlyUI();
  initAll();
  // Apply multi-column layout to any pre-sized cards
  requestAnimationFrame(() => {
    if (window._applyAllCardCols) window._applyAllCardCols();
  });
  snapshot(_hadSaved ? 'Restored saved schedule' : 'Schedule loaded');
  syncUndoRedo();

  /* ─────────────────────────────────────────────────────────────────────────
     SCHEDULE BUILDER
  ───────────────────────────────────────────────────────────────────────── */
  (function initScheduleBuilder() {
    const builderOpenBtn    = document.getElementById('builderOpenBtn');
    const builderOverlay    = document.getElementById('builderOverlay');
    const builderModal      = document.getElementById('builderModal');
    const builderClose      = document.getElementById('builderClose');
    const builderBody       = document.getElementById('builderBody');
    const builderAddRowBtn  = document.getElementById('builderAddRowBtn');
    const builderGenerateBtn = document.getElementById('builderGenerateBtn');
    const builderPreviewBtn = document.getElementById('builderPreviewBtn');
    const builderClearBtn        = document.getElementById('builderClearBtn');
    const builderNewScheduleBtn  = document.getElementById('builderNewScheduleBtn');
    const expNewScheduleBtn      = document.getElementById('expNewScheduleBtn');

    if (!builderOpenBtn || !builderModal) return;

    // ── New Schedule: wipe everything, open builder blank ──
    function newSchedule() {
      if (!confirm(
        'This will permanently clear the entire schedule — timeline, cards, sticky notes, quick reference, and saved data — and open a blank builder.\n\nMake sure you have a backup first. Continue?'
      )) return;

      // 1. Clear localStorage
      try { localStorage.removeItem(LS_KEY); } catch(e) {}

      // 2. Reset header text
      siteTitle.innerHTML    = 'Schedule Title';
      siteSubtitle.innerHTML = 'Facility Delivery Schedule';
      cutoffText.innerHTML   = 'Cutoff: 2 hrs prior to delivery';

      // 3. Wipe printArea and rebuild blank skeleton
      const blankHTML = `
        <section class="timeline-section" aria-label="Delivery timeline">
          <div class="free-board" id="freeBoard"></div>
          <div class="edit-only free-board-add">
            <button id="addFreeBoardBtn" class="ghost-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Card
            </button>
            <button id="addBannerBtn" class="ghost-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Banner Note
            </button>
          </div>
          <div class="timeline" id="timeline">
            <div class="add-slot-row edit-only">
              <button id="addSlotBtn" class="ghost-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Time Slot
              </button>
            </div>
          </div>
        </section>
        <aside class="ref-section" id="refSection" aria-label="Quick reference">
          <div class="ref-resize-handle" id="refResizeHandle" title="Drag to resize"></div>
          <div class="ref-title-row">
            <h2 class="ref-title">Quick Reference</h2>
            <div class="ref-size-ctrl" id="refSizeCtrl">
              <span class="ref-size-label">Text</span>
              <button class="ref-size-btn" id="refSizeDown" title="Decrease text size">−</button>
              <span class="ref-size-display" id="refSizeDisplay">13px</span>
              <button class="ref-size-btn" id="refSizeUp" title="Increase text size">+</button>
            </div>
          </div>
          <table class="ref-table" id="refTable">
            <thead>
              <tr>
                <th class="ref-drag-cell ref-drag-th"></th>
                <th class="ref-th-name">Facility</th>
                <th class="ref-th-times">Delivery Time(s)</th>
              </tr>
            </thead>
            <tbody id="refBody"></tbody>
          </table>
          <div class="edit-only add-ref-row">
            <button id="addRefBtn" class="ghost-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Facility
            </button>
          </div>
        </aside>`;

      printArea.innerHTML = blankHTML;
      stripEditUI(printArea);
      _reinjectEditOnlyUI();
      initAll();

      // 4. Reset undo history
      snapshot('New blank schedule');

      // 5. Close export dropdown, open builder with empty rows
      exportDropdown.hidden = true;
      builderBody.innerHTML = '';
      for (let i = 0; i < 5; i++) addBuilderRow();
      openBuilder();
    }

    // Show/hide Builder button with edit mode
    const _origSetEditMode = window._setEditModeHook || null;
    function syncBuilderBtn() {
      builderOpenBtn.style.display = editMode ? '' : 'none';
    }
    // Hook into setEditMode — watch editMode variable via MutationObserver on html class
    const htmlEl = document.documentElement;
    new MutationObserver(() => syncBuilderBtn()).observe(htmlEl, { attributes: true, attributeFilter: ['class'] });
    syncBuilderBtn();

    const CARD_TYPES = [
      { val: 'default',  label: 'Default (white)' },
      { val: 'purple',   label: 'Purple (Hospice)' },
      { val: 'pickup',   label: 'Orange (Pickup)' },
      { val: 'skilled',  label: 'Green (Skilled)' },
      { val: 'assisted', label: 'Blue (Assisted Living)' },
    ];
    const FREQ_PRESETS = [
      { val: '',       label: '— Any day —' },
      { val: 'daily',  label: 'Daily (M–F)' },
      { val: 'mwf',    label: 'M / W / F' },
      { val: 'tuth',   label: 'T / Th' },
      { val: 'mf',     label: 'Mon & Fri' },
      { val: 'mon',    label: 'Mon only' },
      { val: 'tue',    label: 'Tue only' },
      { val: 'wed',    label: 'Wed only' },
      { val: 'thu',    label: 'Thu only' },
      { val: 'fri',    label: 'Fri only' },
      { val: 'sat',    label: 'Sat only' },
      { val: 'sun',    label: 'Sun only' },
      { val: 'wknd',   label: 'Sat & Sun' },
      { val: 'mth',    label: 'M / T / H' },
      { val: 'twf',    label: 'T / W / F' },
      { val: 'custom', label: 'Custom…' },
    ];

    // Maps freq val -> display label shown on the card tag
    const FREQ_LABELS = {
      daily:  'MON – FRI',
      mwf:    'MON / WED / FRI',
      tuth:   'TUE / THU',
      mf:     'MON & FRI',
      mon:    'MON',
      tue:    'TUE',
      wed:    'WED',
      thu:    'THU',
      fri:    'FRI',
      sat:    'SAT',
      sun:    'SUN',
      wknd:   'SAT & SUN',
      mth:    'MON / TUE / THU',
      twf:    'TUE / WED / FRI',
    };

    const TAG_PRESETS = [
      { val: '',           label: 'None' },
      { val: 'mwf',        label: 'MON/WED/FRI' },
      { val: 'tuth',       label: 'TUE/THU' },
      { val: 'skilled',    label: 'Skilled Facilities' },
      { val: 'custom',     label: 'Custom...' },
      { val: 'route-label','label': 'Route Name (colored tag)' },
    ];
    const ROUTE_COLORS = [
      { val: '', label: 'None' },
      ...ROUTE_PALETTE.map(c => ({ val: 'route-' + c.key, label: c.label, hex: c.hex })),
    ];

    // ── Time presets (Feature: time combo box) ──
    // Generate 30-min increments from 6:00 AM to 10:00 PM, each shown with its
    // military-time equivalent so users can recognize either format.
    function pad2(n) { return n < 10 ? '0' + n : String(n); }
    function to12Label(h24, m) {
      let h12 = h24 % 12; if (h12 === 0) h12 = 12;
      const ampm = h24 < 12 ? 'AM' : 'PM';
      return `${h12}:${pad2(m)} ${ampm}`;
    }
    function toMilitaryLabel(h24, m) { return pad2(h24) + pad2(m); }

    const TIME_PRESETS = [];
    for (let h = 6; h <= 22; h++) {
      for (const m of [0, 30]) {
        if (h === 22 && m === 30) continue; // stop at 10:00 PM
        const val = to12Label(h, m);
        TIME_PRESETS.push({ val, label: `${val} (${toMilitaryLabel(h, m)})` });
      }
    }

    // ── normalizeTime(): coerce loose user input into "H:MM AM/PM" ──
    function normalizeTime(str) {
      if (!str) return '';
      const raw = str.trim();
      if (!raw) return '';

      // Already-clean "H:MM AM/PM" or "HH:MM" with am/pm suffix
      const ampmMatch = raw.match(/^(\d{1,2})(?::?(\d{2}))?\s*([AaPp])\.?[Mm]?\.?$/);
      if (ampmMatch) {
        let hour = parseInt(ampmMatch[1], 10);
        const min = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
        const isPM = ampmMatch[3].toLowerCase() === 'p';
        if (hour === 12) hour = isPM ? 12 : 0;
        else if (isPM) hour += 12;
        return to12Label(hour === 0 ? 0 : hour, min);
      }

      // Digits-only input (military time or shorthand): strip all non-digits
      const digits = raw.replace(/\D/g, '');
      if (!digits) return raw; // unparseable, leave as-is

      let hourStr, minStr, bareAmbiguousHour = false;
      if (digits.length <= 2) {
        // Just an hour, e.g. "8" or "13"
        hourStr = digits;
        minStr = '00';
        bareAmbiguousHour = digits.length <= 2 && parseInt(digits, 10) >= 1 && parseInt(digits, 10) <= 7;
      } else if (digits.length === 3) {
        // e.g. "800" -> "0800", "130" -> "0130"
        const padded = '0' + digits;
        hourStr = padded.slice(0, 2);
        minStr = padded.slice(2, 4);
        // Bare "1xx"-"7xx" with no am/pm marker is ambiguous; pharmacy delivery
        // schedules skew afternoon, so default these small bare hours to PM
        // (e.g. "130" -> 1:30 PM) while "8xx"+ still defaults to AM via to12Label.
        bareAmbiguousHour = parseInt(hourStr, 10) >= 1 && parseInt(hourStr, 10) <= 7;
      } else {
        // 4+ digits, e.g. "1300", "0630", "2130" -- take first 4 (unambiguous military time)
        const d4 = digits.slice(0, 4);
        hourStr = d4.slice(0, 2);
        minStr = d4.slice(2, 4);
      }

      let hour24 = parseInt(hourStr, 10);
      let min = parseInt(minStr, 10);
      if (isNaN(hour24)) return raw;
      if (isNaN(min) || min > 59) min = 0;

      // Military-time normalization
      if (hour24 === 24) hour24 = 0;         // "2400" -> midnight
      if (hour24 > 24) hour24 = hour24 % 24; // guard against garbage
      // Bare small hours (1-7) with no explicit am/pm and no military-length
      // input default to PM (pharmacy deliveries run daytime/afternoon).
      if (bareAmbiguousHour && hour24 >= 1 && hour24 <= 7) hour24 += 12;
      // hour24 is now 0-23 in 24-hour form; convert straight to 12-hour label.
      return to12Label(hour24, min);
    }
    window._normalizeTime = normalizeTime; // exposed for potential reuse/testing

    function makeSelect(options, cls) {
      const sel = document.createElement('select');
      sel.className = cls || 'bt-select';
      options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.val;
        opt.textContent = o.label;
        sel.appendChild(opt);
      });
      return sel;
    }

    function addBuilderRow(data) {
      data = data || {};
      const tr = document.createElement('tr');

      // Time
      const tdTime = document.createElement('td');
      const timeWrap = document.createElement('div');
      timeWrap.className = 'bt-time-wrap';

      const timeSelect = document.createElement('select');
      timeSelect.className = 'bt-time-select';
      const blankOpt = document.createElement('option');
      blankOpt.value = '';
      blankOpt.textContent = '— type custom...';
      timeSelect.appendChild(blankOpt);
      TIME_PRESETS.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.val;
        opt.textContent = o.label;
        timeSelect.appendChild(opt);
      });
      const customOpt = document.createElement('option');
      customOpt.value = 'custom';
      customOpt.textContent = 'Custom...';
      timeSelect.appendChild(customOpt);

      const timeCustomInput = document.createElement('input');
      timeCustomInput.type = 'text';
      timeCustomInput.className = 'bt-input bt-time-custom';
      timeCustomInput.placeholder = 'e.g. 1:00 PM, 1300, 130pm';

      // Determine initial state from data.time
      const initialTime = data.time || '';
      const presetMatch = TIME_PRESETS.some(o => o.val === initialTime);
      if (initialTime && presetMatch) {
        timeSelect.value = initialTime;
        timeCustomInput.style.display = 'none';
        timeCustomInput.value = '';
      } else if (initialTime) {
        timeSelect.value = 'custom';
        timeCustomInput.style.display = '';
        timeCustomInput.value = initialTime;
      } else {
        timeSelect.value = '';
        timeCustomInput.style.display = 'none';
      }

      timeSelect.addEventListener('change', () => {
        timeCustomInput.style.display = timeSelect.value === 'custom' ? '' : 'none';
        if (timeSelect.value === 'custom') timeCustomInput.focus();
      });

      timeCustomInput.addEventListener('blur', () => {
        const normalized = normalizeTime(timeCustomInput.value);
        if (normalized) timeCustomInput.value = normalized;
      });

      timeWrap.appendChild(timeSelect);
      timeWrap.appendChild(timeCustomInput);
      tdTime.appendChild(timeWrap);

      // Type
      // Frequency
      const tdFreq = document.createElement('td');
      tdFreq.className = 'bt-col-freq';
      const freqWrap = document.createElement('div');
      freqWrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
      const freqSel = makeSelect(FREQ_PRESETS);
      freqSel.className = 'bt-select bt-freq-sel';
      freqSel.value = data.freq || '';
      const freqCustom = document.createElement('input');
      freqCustom.className = 'bt-input bt-freq-custom';
      freqCustom.placeholder = 'e.g. 1st & 3rd Mon';
      freqCustom.value = data.freqCustom || '';
      freqCustom.style.display = (data.freq === 'custom') ? '' : 'none';
      freqSel.addEventListener('change', () => {
        freqCustom.style.display = freqSel.value === 'custom' ? '' : 'none';
      });
      freqWrap.appendChild(freqSel);
      freqWrap.appendChild(freqCustom);
      tdFreq.appendChild(freqWrap);

      const tdType = document.createElement('td');
      const typeSelect = makeSelect(CARD_TYPES);
      typeSelect.value = data.type || 'default';
      tdType.appendChild(typeSelect);

      // Label/tag
      const tdLabel = document.createElement('td');
      const tagSelect = makeSelect(TAG_PRESETS);
      const customLabelInput = document.createElement('input');
      customLabelInput.className = 'bt-input';
      customLabelInput.placeholder = 'Custom label text';
      customLabelInput.style.display = 'none';
      customLabelInput.style.marginTop = '4px';
      customLabelInput.value = data.customLabel || '';

      // Route-name color picker (shown only when tagSelect === 'route-label')
      const labelRouteColorSel = makeSelect(ROUTE_COLORS, 'bt-select');
      labelRouteColorSel.style.display = 'none';
      labelRouteColorSel.style.marginTop = '4px';
      labelRouteColorSel.value = data.labelRouteColor || '';

      function syncLabelFieldVisibility() {
        const isCustom = tagSelect.value === 'custom';
        const isRouteLabel = tagSelect.value === 'route-label';
        customLabelInput.style.display = (isCustom || isRouteLabel) ? '' : 'none';
        customLabelInput.placeholder = isRouteLabel ? 'Route name (e.g. ROUTE A, DRIVER 2)' : 'Custom label text';
        labelRouteColorSel.style.display = isRouteLabel ? '' : 'none';
      }

      tagSelect.value = data.tag || '';
      tagSelect.addEventListener('change', syncLabelFieldVisibility);
      syncLabelFieldVisibility();
      tdLabel.appendChild(tagSelect);
      tdLabel.appendChild(labelRouteColorSel);
      tdLabel.appendChild(customLabelInput);

      // Facilities
      const tdFac = document.createElement('td');
      const facInput = document.createElement('textarea');
      facInput.className = 'bt-fac-input';
      facInput.placeholder = 'One per line\ne.g. Sunrise SNF | SNF';
      facInput.value = data.facilities || '';
      // Auto-grow: no facility limit
      function autoGrowFac() {
        facInput.style.height = 'auto';
        facInput.style.height = facInput.scrollHeight + 'px';
      }
      facInput.addEventListener('input', autoGrowFac);
      // Size correctly on initial render (after paint)
      requestAnimationFrame(autoGrowFac);
      tdFac.appendChild(facInput);

      // Facility Type (default for all facilities in this row)
      const FAC_TYPES = [
        { val: '',            label: '— None —' },
        { val: 'SNF',              label: 'SNF — Skilled Nursing' },
        { val: 'SNF/ALF',          label: 'SNF/ALF' },
        { val: 'ALF',              label: 'ALF — Assisted Living' },
        { val: 'ANF/ALF',          label: 'ANF/ALF' },
        { val: 'ASSISTED LIVING',  label: 'Assisted Living' },
        { val: 'CUSTODIAL',        label: 'Custodial' },
        { val: 'CORRECTIONAL',     label: 'Correctional' },
        { val: 'HOSPICE',          label: 'Hospice' },
        { val: 'GROUP HOME',       label: 'Group Home' },
        { val: 'custom',           label: 'Custom…' },
      ];
      const tdFacType = document.createElement('td');
      tdFacType.className = 'bt-col-factype';
      const facTypeWrap = document.createElement('div');
      facTypeWrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
      const facTypeSel = makeSelect(FAC_TYPES);
      facTypeSel.className = 'bt-select bt-factype-sel';
      facTypeSel.title = 'Default facility type for all facilities in this row (can override per line with | TYPE)';
      facTypeSel.value = data.facType || '';
      const facTypeCustom = document.createElement('input');
      facTypeCustom.className = 'bt-input bt-factype-custom';
      facTypeCustom.placeholder = 'Type abbreviation';
      facTypeCustom.value = data.facTypeCustom || '';
      facTypeCustom.style.display = (data.facType === 'custom') ? '' : 'none';
      facTypeSel.addEventListener('change', () => {
        facTypeCustom.style.display = facTypeSel.value === 'custom' ? '' : 'none';
      });
      facTypeWrap.appendChild(facTypeSel);
      facTypeWrap.appendChild(facTypeCustom);
      tdFacType.appendChild(facTypeWrap);

      // Route tag
      const tdRoute = document.createElement('td');
      const routeWrap = document.createElement('div');
      routeWrap.style.display = 'flex';
      routeWrap.style.flexDirection = 'column';
      routeWrap.style.gap = '4px';
      // v30: visual swatch-button picker instead of a plain <select> —
      // much faster to scan/click across 20 colors. Value is tracked in a
      // hidden input so getBuilderData() can keep reading a simple value.
      const routeColorHidden = document.createElement('input');
      routeColorHidden.type = 'hidden';
      routeColorHidden.className = 'bt-route-color-value';
      routeColorHidden.value = data.routeColor || '';

      const routeSwatchGrid = document.createElement('div');
      routeSwatchGrid.className = 'bt-route-swatch-grid';

      // "None" swatch first
      const noneBtn = document.createElement('button');
      noneBtn.type = 'button';
      noneBtn.className = 'bt-route-swatch bt-route-swatch-none';
      noneBtn.title = 'None';
      if (!data.routeColor) noneBtn.classList.add('selected');
      routeSwatchGrid.appendChild(noneBtn);

      const routeSwatchBtns = [noneBtn];
      ROUTE_COLORS.forEach(c => {
        if (!c.val) return; // skip the { val: '' } None entry already handled above
        const swBtn = document.createElement('button');
        swBtn.type = 'button';
        swBtn.className = 'bt-route-swatch';
        swBtn.title = c.label;
        swBtn.style.background = c.hex || '';
        if (data.routeColor === c.val) swBtn.classList.add('selected');
        swBtn.addEventListener('click', () => {
          routeColorHidden.value = c.val;
          routeSwatchBtns.forEach(b => b.classList.remove('selected'));
          swBtn.classList.add('selected');
          routeNameInput.style.display = '';
        });
        routeSwatchGrid.appendChild(swBtn);
        routeSwatchBtns.push(swBtn);
      });

      noneBtn.addEventListener('click', () => {
        routeColorHidden.value = '';
        routeSwatchBtns.forEach(b => b.classList.remove('selected'));
        noneBtn.classList.add('selected');
        routeNameInput.style.display = 'none';
      });

      const routeNameInput = document.createElement('input');
      routeNameInput.className = 'bt-input bt-route-name';
      routeNameInput.placeholder = 'Route name';
      routeNameInput.value = data.routeName || '';
      routeNameInput.style.display = data.routeColor ? '' : 'none';
      routeWrap.appendChild(routeSwatchGrid);
      routeWrap.appendChild(routeColorHidden);
      routeWrap.appendChild(routeNameInput);
      tdRoute.appendChild(routeWrap);

      // Delete
      const tdDel = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.className = 'bt-del-btn';
      delBtn.title = 'Remove this row';
      delBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      delBtn.addEventListener('click', () => tr.remove());
      tdDel.appendChild(delBtn);

      tr.append(tdTime, tdFreq, tdType, tdLabel, tdFac, tdFacType, tdRoute, tdDel);
      builderBody.appendChild(tr);
      return tr;
    }

    function getBuilderData() {
      const rows = [];
      builderBody.querySelectorAll('tr').forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 6) return;
        const timeSel    = tds[0].querySelector('.bt-time-select');
        const timeCustom = tds[0].querySelector('.bt-time-custom');
        const time       = (timeSel && timeSel.value === 'custom')
          ? normalizeTime((timeCustom && timeCustom.value || '').trim())
          : (timeSel ? timeSel.value.trim() : (tds[0].querySelector('input')?.value.trim() || ''));
        const freqRaw     = tds[1].querySelector('.bt-freq-sel')?.value || '';
        const freqCustomV  = tds[1].querySelector('.bt-freq-custom')?.value.trim() || '';
        const freq         = freqRaw === 'custom' ? freqCustomV : freqRaw;
        const type         = tds[2].querySelector('select').value;
        const tagSel        = tds[3].querySelectorAll('select')[0]?.value || '';
        const labelRouteColor = tds[3].querySelectorAll('select')[1]?.value || '';
        const customLbl     = tds[3].querySelectorAll('input')[0]?.value.trim() || '';
        const facilities    = tds[4].querySelector('textarea').value.trim();
        const facTypeRaw    = tds[5].querySelector('.bt-factype-sel')?.value || '';
        const facTypeCustomV= tds[5].querySelector('.bt-factype-custom')?.value.trim() || '';
        const facType       = facTypeRaw === 'custom' ? facTypeCustomV : facTypeRaw;
        const routeColor    = tds[6].querySelector('.bt-route-color-value')?.value || '';
        const routeName     = tds[6].querySelector('.bt-route-name')?.value.trim() || '';
        if (!time && !facilities) return; // skip empty rows
        rows.push({ time, freq, type, tagSel, customLbl, labelRouteColor, facilities, facType, routeColor, routeName });
      });
      return rows;
    }

    // ── Auto-populate Quick Reference table from builder rows ──
    function populateRefFromBuilderRows(rows) {
      const refBodyEl = document.getElementById('refBody');
      if (!refBodyEl) return;

      // Map facility name -> { name, type, times: Set }
      const facMap = new Map();
      rows.forEach(r => {
        const time = (r.time || '').trim();
        // Delivery days for this slot, compressed (e.g. "M/W/F")
        const dayLabel = r.freq ? (FREQ_LABELS[r.freq] || r.freq) : '';
        const timeWithDays = daysPlusTime(dayLabel, time);
        // Row-level facility type (from Fac. Type column)
        const rowFacType = (r.facType || '').trim();
        const facs = (r.facilities || '').split('\n').map(s => s.trim()).filter(Boolean);
        facs.forEach(raw => {
          // Parse "Facility Name | TYPE" inline syntax
          const pipeIdx = raw.lastIndexOf('|');
          const fac  = pipeIdx !== -1 ? raw.slice(0, pipeIdx).trim() : raw;
          const type = pipeIdx !== -1 ? raw.slice(pipeIdx + 1).trim() : rowFacType;
          const key  = fac.toLowerCase();
          if (!facMap.has(key)) facMap.set(key, { name: fac, type, times: new Set() });
          // Keep type if not yet set
          if (!facMap.get(key).type && type) facMap.get(key).type = type;
          if (timeWithDays) facMap.get(key).times.add(timeWithDays);
        });
      });

      // Sort alphabetically by facility name
      const sortedFacs = [...facMap.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );

      refBodyEl.innerHTML = '';
      sortedFacs.forEach(entry => {
        const timesText = [...entry.times].join(' \u00b7 ') || '\u2014';
        const tr = document.createElement('tr');
        tr.setAttribute('data-ref-row', '');
        tr.innerHTML =
          '<td class="ref-td-name"><span class="ref-name" data-editable contenteditable="true">' + entry.name + '</span><span class="ref-type" data-editable contenteditable="true">' + (entry.type || '') + '</span></td>' +
          '<td class="ref-td-times"><span class="ref-times" data-editable contenteditable="true">' + timesText + '</span></td>';
        refBodyEl.appendChild(tr);
      });
    }

    function buildTimelineFromData(rows, preview) {
      // Group rows by time — multiple rows with same time = multiple cards in same slot
      const slots = {};
      const order = [];
      rows.forEach(r => {
        const key = r.time || 'Unknown';
        if (!slots[key]) { slots[key] = []; order.push(key); }
        slots[key].push(r);
      });

      // Sort time slots chronologically regardless of entry order
      function timeKeyToMins(key) {
        const m = key.match(/(\d{1,2}):(\d{2})\s*([AaPp][Mm])/);
        if (!m) return 9999; // unknown/non-time keys go to end
        let h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        const ampm = m[3].toUpperCase();
        if (ampm === 'PM' && h !== 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return h * 60 + min;
      }
      order.sort((a, b) => timeKeyToMins(a) - timeKeyToMins(b));

      const frag = document.createDocumentFragment();

      order.forEach(timeKey => {
        const cards = slots[timeKey];
        const rowDiv = document.createElement('div');
        rowDiv.className = 'timeline-row';
        rowDiv.setAttribute('data-time', timeKey);

        // Detect pickup from type or time label
        const isPickup = cards.some(c => c.type === 'pickup');
        const isLate   = /^([89]|1[012]):\d{2}\s*[Pp]/.test(timeKey);

        // Time col
        const timeCol = document.createElement('div');
        timeCol.className = 'time-col';
        const chip = document.createElement('span');
        chip.className = 'time-chip' + (isPickup ? ' time-chip-pickup' : '') + (isLate ? ' time-chip-late' : '');
        chip.setAttribute('data-editable', '');
        chip.textContent = timeKey;
        timeCol.appendChild(chip);
        if (isPickup) {
          const badge = document.createElement('span');
          badge.className = 'pickup-badge';
          badge.textContent = 'PICKUP';
          timeCol.appendChild(badge);
        }

        // Spine
        const spine = document.createElement('div');
        spine.className = 'timeline-spine';
        const dot = document.createElement('div');
        dot.className = 'spine-dot' + (isPickup ? ' dot-pickup' : '') + (isLate ? ' dot-late' : '');
        spine.appendChild(dot);

        // Cards col
        const cardsCol = document.createElement('div');
        cardsCol.className = 'cards-col';

        cards.forEach(c => {
          const facs = c.facilities.split('\n').map(s => s.trim()).filter(Boolean);
          if (!facs.length && !c.tagSel && !c.customLbl) return;

          const card = document.createElement('div');
          const typeClass = c.type === 'default'  ? 'card-default'
            : c.type === 'pickup'   ? 'card-pickup'
            : c.type === 'skilled'  ? 'card-skilled'
            : c.type === 'purple'   ? 'card-purple'
            : c.type === 'assisted' ? 'card-assisted'
            : 'card-default';
          card.className = 'card ' + typeClass;
          card.setAttribute('data-card', '');

          // Frequency tag (topmost)
          if (c.freq) {
            const freqLabel = FREQ_LABELS[c.freq] || c.freq.toUpperCase();
            const freqEl = document.createElement('div');
            freqEl.className = 'card-tag tag-freq';
            freqEl.setAttribute('data-editable', '');
            freqEl.textContent = freqLabel;
            card.appendChild(freqEl);
          }

          // Declare isRouteLabel early — used by both route tag and label tag blocks
          const isRouteLabel = c.tagSel === 'route-label';

          // Route tag — placed at top, right after freq (before label tag & facilities)
          // Only render if a route name was actually typed; color alone is not enough
          if (c.routeColor && !isRouteLabel && c.routeName) {
            const routeTag = document.createElement('div');
            routeTag.className = 'card-tag tag-' + c.routeColor;
            routeTag.setAttribute('data-editable', '');
            routeTag.textContent = c.routeName;
            card.appendChild(routeTag);
          }

          // Label / schedule tag
          let tagClass = '';
          let tagText  = '';
          if (c.tagSel === 'mwf')     { tagClass = 'tag-mwf';     tagText = 'MON / WED / FRI — Offices'; }
          else if (c.tagSel === 'tuth')    { tagClass = 'tag-tuth';    tagText = 'TUE / THU — Offices'; }
          else if (c.tagSel === 'skilled') { tagClass = 'tag-skilled'; tagText = 'Skilled Facilities'; }
          else if (c.tagSel === 'custom')  { tagClass = 'tag-mwf';     tagText = c.customLbl || 'Label'; }
          else if (isRouteLabel) {
            // Route name as the primary colored card tag (top of card)
            tagClass = c.labelRouteColor ? 'tag-' + c.labelRouteColor : 'tag-mwf';
            tagText  = c.customLbl || 'Route';
          }

          if (tagClass) {
            const tagEl = document.createElement('div');
            tagEl.className = 'card-tag ' + tagClass;
            tagEl.setAttribute('data-editable', '');
            tagEl.textContent = tagText;
            card.appendChild(tagEl);
          }

          // Facilities list — parse "Facility Name | TYPE" inline override
          if (facs.length > 0) {
            const list = document.createElement('div');
            list.className = 'card-list';
            list.setAttribute('data-list', '');
            facs.forEach(f => {
              // Check for inline type override: "Name | SNF"
              const pipeIdx = f.lastIndexOf('|');
              let facName = f;
              let facType = c.facType || '';
              if (pipeIdx !== -1) {
                facName = f.slice(0, pipeIdx).trim();
                const inlineType = f.slice(pipeIdx + 1).trim();
                if (inlineType) facType = inlineType;
              }
              const span = document.createElement('span');
              span.setAttribute('data-editable', '');
              span.setAttribute('data-status', 'active');
              if (facType) {
                span.setAttribute('data-fac-type', facType);
                span.innerHTML = facName + ' <span class="fac-type-badge">' + facType + '</span>';
              } else {
                span.textContent = facName;
              }
              list.appendChild(span);
            });
            card.appendChild(list);
          }

          cardsCol.appendChild(card);
        });

        rowDiv.append(timeCol, spine, cardsCol);
        frag.appendChild(rowDiv);
      });

      return frag;
    }

    function openBuilder() {
      builderOverlay.hidden = false;
      builderModal.hidden = false;
      // If table is empty, add starter rows
      if (!builderBody.querySelector('tr')) {
        for (let i = 0; i < 5; i++) addBuilderRow();
      }
    }

    function closeBuilder() {
      builderOverlay.hidden = true;
      builderModal.hidden = true;
    }

    builderOpenBtn.addEventListener('click', openBuilder);
    builderOverlay.addEventListener('click', closeBuilder);
    builderClose.addEventListener('click', closeBuilder);
    if (builderNewScheduleBtn) builderNewScheduleBtn.addEventListener('click', newSchedule);
    if (expNewScheduleBtn)     expNewScheduleBtn.addEventListener('click', newSchedule);

    builderClearBtn.addEventListener('click', () => {
      if (builderBody.querySelector('tr') && !confirm('Clear all builder rows?')) return;
      builderBody.innerHTML = '';
      for (let i = 0; i < 5; i++) addBuilderRow();
    });

    // ── Ctrl+Enter anywhere in builder = add row ──
    document.getElementById('builderModal').addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        addBuilderRow();
        // Scroll new row into view
        const lastRow = builderBody.querySelector('tr:last-child');
        if (lastRow) lastRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    // ── Row counter ──
    const builderRowCount = document.getElementById('builderRowCount');
    function updateBuilderRowCount() {
      if (!builderRowCount) return;
      const n = builderBody.querySelectorAll('tr').length;
      builderRowCount.textContent = n === 1 ? '1 row' : `${n} rows`;
    }
    // Observe mutations on builderBody to keep count live
    new MutationObserver(updateBuilderRowCount).observe(builderBody, { childList: true });

    builderAddRowBtn.addEventListener('click', () => { addBuilderRow(); updateBuilderRowCount(); });

    // ── Import from Timeline ──
    function importTimelineToBuilder() {
      const timelineRows = document.querySelectorAll('#timeline .timeline-row');
      if (!timelineRows.length) { alert('No timeline rows found to import.'); return; }
      if (builderBody.querySelector('tr') &&
          !confirm('This will replace the current builder rows with data from the live timeline. Continue?')) return;

      builderBody.innerHTML = '';

      timelineRows.forEach(row => {
        const chip = row.querySelector('.time-chip');
        const time = chip ? chip.textContent.trim() : '';

        const cards = row.querySelectorAll('[data-card]');
        if (!cards.length) {
          addBuilderRow({ time, freq: '', type: 'default', tagSel: '', customLbl: '', facilities: '', facType: '', routeColor: '', routeName: '' });
          return;
        }

        cards.forEach(card => {
          // ── Classify all card-tags ──────────────────────────────────────────
          const allTags = [...card.querySelectorAll('.card-tag')];

          // 1. Freq tag
          const freqTagEl = allTags.find(t => t.classList.contains('tag-freq'));

          // 2. Route tag — has a tag-route-* class
          const routeTagEl = allTags.find(t =>
            !t.classList.contains('tag-freq') &&
            [...t.classList].some(c => c.startsWith('tag-route-'))
          );

          // 3. Label tag — everything else (mwf, tuth, skilled, custom, route-label)
          const labelTagEl = allTags.find(t =>
            t !== freqTagEl && t !== routeTagEl
          );

          // ── Frequency ───────────────────────────────────────────────────────
          let cardFreq = '', cardFreqCustom = '';
          if (freqTagEl) {
            const ft = freqTagEl.textContent.trim().toUpperCase();
            if      (ft.includes('MON') && ft.includes('WED') && ft.includes('FRI')) cardFreq = 'mwf';
            else if (ft.includes('TUE') && ft.includes('THU') && !ft.includes('WED')) cardFreq = 'tuth';
            else if (ft.includes('SAT') && ft.includes('SUN')) cardFreq = 'wknd';
            else if (ft === 'SAT')  cardFreq = 'sat';
            else if (ft === 'SUN')  cardFreq = 'sun';
            else if (ft === 'MON')  cardFreq = 'mon';
            else if (ft === 'TUE')  cardFreq = 'tue';
            else if (ft === 'WED')  cardFreq = 'wed';
            else if (ft === 'THU')  cardFreq = 'thu';
            else if (ft === 'FRI')  cardFreq = 'fri';
            else if (ft.includes('MON') && ft.includes('FRI')) cardFreq = 'mf';
            else if (ft.includes('MON') && ft.includes('TUE') && ft.includes('THU')) cardFreq = 'mth';
            else if (ft.includes('TUE') && ft.includes('WED') && ft.includes('FRI')) cardFreq = 'twf';
            else if (ft.includes('DAILY') || ft.includes('MON') && ft.includes('FRI')) cardFreq = 'daily';
            else { cardFreq = 'custom'; cardFreqCustom = freqTagEl.textContent.trim(); }
          }

          // ── Route tag ───────────────────────────────────────────────────────
          let importRouteColor = '', importRouteName = '';
          if (routeTagEl) {
            const rc = [...routeTagEl.classList].find(c => c.startsWith('tag-route-'));
            if (rc) {
              importRouteColor = rc.replace('tag-', ''); // e.g. 'route-rose'
              importRouteName  = routeTagEl.textContent.trim();
            }
          }

          // ── Label / schedule tag ────────────────────────────────────────────
          let tagSel = '', labelRouteColor = '', tagCustomLbl = '';
          if (labelTagEl) {
            const cls = [...labelTagEl.classList];
            const routeLabelCls = cls.find(c => c.startsWith('tag-route-'));
            if (routeLabelCls)            { tagSel = 'route-label'; labelRouteColor = routeLabelCls.replace('tag-', ''); tagCustomLbl = labelTagEl.textContent.trim(); }
            else if (cls.includes('tag-mwf'))     { tagSel = 'mwf'; }
            else if (cls.includes('tag-tuth'))    { tagSel = 'tuth'; }
            else if (cls.includes('tag-skilled')) { tagSel = 'skilled'; }
            else { tagSel = 'custom'; tagCustomLbl = labelTagEl.textContent.trim(); }
          }

          // ── Card type ───────────────────────────────────────────────────────
          let cardType = 'default';
          if      (card.classList.contains('card-assisted')) cardType = 'assisted';
          else if (card.classList.contains('card-skilled'))  cardType = 'skilled';
          else if (card.classList.contains('card-purple'))   cardType = 'purple';
          else if (card.classList.contains('card-pickup'))   cardType = 'pickup';

          // ── Facilities ──────────────────────────────────────────────────────
          const facLines = [];
          card.querySelectorAll('.fac-item').forEach(item => {
            const nameSpan = item.querySelector('span[data-editable]');
            const badge    = item.querySelector('.fac-type-badge');
            let facStr = nameSpan ? nameSpan.textContent.trim() : '';
            if (badge && badge.textContent.trim()) facStr += ' | ' + badge.textContent.trim();
            if (facStr) facLines.push(facStr);
          });

          addBuilderRow({
            time, type: cardType,
            freq: cardFreq, freqCustom: cardFreqCustom,
            tagSel,
            customLbl: tagCustomLbl,
            labelRouteColor,
            facilities: facLines.join('\n'),
            facType: '',
            routeColor: importRouteColor,
            routeName:  importRouteName,
          });
        });
      });

      updateBuilderRowCount();
    }

    const builderImportBtn = document.getElementById('builderImportBtn');
    if (builderImportBtn) builderImportBtn.addEventListener('click', importTimelineToBuilder);

    // ── Export builder rows as JSON file ──
    const builderExportFileBtn = document.getElementById('builderExportFileBtn');
    if (builderExportFileBtn) {
      builderExportFileBtn.addEventListener('click', () => {
        const rows = getBuilderData();
        if (!rows.length) { alert('No rows to export.'); return; }
        const payload = { version: 1, exported: new Date().toISOString(), rows };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        const schedName = (document.getElementById('siteTitle')?.textContent || 'schedule').trim().replace(/\s+/g, '-').toLowerCase();
        a.href = URL.createObjectURL(blob);
        a.download = `builder-${schedName}-${new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'2-digit'}).replace(/\//g,'-')}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }

    // ── Import builder rows from JSON file ──
    const builderImportFileBtn  = document.getElementById('builderImportFileBtn');
    const builderImportFileInput = document.getElementById('builderImportFileInput');
    if (builderImportFileBtn && builderImportFileInput) {
      builderImportFileBtn.addEventListener('click', () => builderImportFileInput.click());
      builderImportFileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const payload = JSON.parse(ev.target.result);
            const rows = Array.isArray(payload) ? payload : (payload.rows || []);
            if (!rows.length) { alert('No rows found in file.'); return; }
            if (builderBody.querySelector('tr') &&
                !confirm(`Load ${rows.length} rows from "${file.name}"? This will replace current builder rows.`)) return;
            builderBody.innerHTML = '';
            rows.forEach(r => addBuilderRow(r));
            updateBuilderRowCount();
          } catch (err) {
            alert('Could not read file. Make sure it is a valid builder export (.json).');
          }
        };
        reader.readAsText(file);
        // Reset so same file can be re-imported
        builderImportFileInput.value = '';
      });
    }

    const builderInlineAddBtn = document.getElementById('builderInlineAddBtn');
    if (builderInlineAddBtn) builderInlineAddBtn.addEventListener('click', () => {
      addBuilderRow();
      const lastRow = builderBody.querySelector('tr:last-child');
      if (lastRow) lastRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    builderPreviewBtn.addEventListener('click', () => {
      const rows = getBuilderData();
      if (!rows.length) { alert('Add at least one row with a time and facilities first.'); return; }
      const frag = buildTimelineFromData(rows, true);
      const preview = document.createElement('div');
      preview.style.cssText = 'position:fixed;inset:0;z-index:900;background:var(--bg);overflow:auto;padding:24px';
      const close = document.createElement('button');
      close.textContent = '✕ Close Preview';
      close.style.cssText = 'position:fixed;top:16px;right:16px;z-index:901;padding:8px 16px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700';
      close.addEventListener('click', () => preview.remove());
      const tl = document.createElement('div');
      tl.className = 'timeline';
      tl.appendChild(frag);
      preview.appendChild(close);
      preview.appendChild(tl);
      document.body.appendChild(preview);
    });

    builderGenerateBtn.addEventListener('click', () => {
      const rows = getBuilderData();
      if (!rows.length) { alert('Add at least one row with a time and facilities.'); return; }
      if (!confirm('This will replace the current timeline with the generated schedule. Continue?')) return;

      const timeline = document.getElementById('timeline');
      const addSlotRow = timeline.querySelector('.add-slot-row');

      // Remove all existing timeline-rows
      timeline.querySelectorAll('.timeline-row').forEach(r => r.remove());

      // Build and insert new rows
      const frag = buildTimelineFromData(rows);
      timeline.insertBefore(frag, addSlotRow);

      // Init all new rows
      timeline.querySelectorAll('.timeline-row').forEach(row => {
        row._init = false; // allow re-init
        initRow(row);
        row.querySelectorAll('[data-card]').forEach(card => {
          card._init = false;
          initCard(card);
        });
      });

      // Auto-populate Quick Reference table from the same builder rows
      populateRefFromBuilderRows(rows);
      initAll();

      closeBuilder();
      snapshot('Generated schedule from builder');
      alert('Timeline generated! You can now edit it directly.');
    });

  })();


  /* =============================================================================
     FEATURE 1 — SEARCH / HIGHLIGHT BAR
  ============================================================================= */
  (function initSearchBar() {
    const searchInput = document.getElementById('schedSearch');
    const clearBtn    = document.getElementById('searchClearBtn');
    const countEl     = document.getElementById('searchCount');
    if (!searchInput) return;

    const MATCH_SEL = '.fac-item span[data-editable], .card-list span[data-editable], .card-label[data-editable], .card-sub[data-editable]';

    function runSearch(term) {
      const q = term.trim().toLowerCase();
      // Clear all existing highlights first
      document.querySelectorAll('.search-highlight').forEach(el => el.classList.remove('search-highlight'));

      if (!q) {
        countEl.hidden = true;
        clearBtn.hidden = true;
        return;
      }
      clearBtn.hidden = false;

      const matches = [];
      document.querySelectorAll(MATCH_SEL).forEach(el => {
        const txt = (el.textContent || '').toLowerCase();
        if (txt.includes(q)) {
          el.classList.add('search-highlight');
          matches.push(el);
        }
      });

      if (matches.length) {
        countEl.hidden = false;
        countEl.textContent = `1 / ${matches.length}`;
        matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        countEl.hidden = false;
        countEl.textContent = '0 / 0';
      }
    }

    searchInput.addEventListener('input', () => runSearch(searchInput.value));

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        runSearch('');
        searchInput.blur();
      }
    });

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      runSearch('');
      searchInput.focus();
    });

    // Expose for re-run after DOM replacement (import/undo/schedule switch)
    window._rerunSearch = function () { runSearch(searchInput.value); };
  })();

  /* =============================================================================
     FEATURE 2 — MULTIPLE NAMED SCHEDULES
  ============================================================================= */
  (function initScheduleLibrary() {
    const LIB_KEY = 'deliveryScheduleLib_v1';
    const select     = document.getElementById('scheduleSelect');
    const newBtn     = document.getElementById('schedNewNameBtn');
    const delBtn     = document.getElementById('schedDeleteBtn');
    const badge      = document.getElementById('activeSchedBadge');
    if (!select) return;

    function readLib() {
      try {
        const raw = localStorage.getItem(LIB_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return null;
    }

    function writeLib(lib) {
      try {
        localStorage.setItem(LIB_KEY, JSON.stringify(lib));
        return true;
      } catch (e) {
        console.error('Schedule library save failed:', e);
        return false;
      }
    }

    function migrateIfNeeded() {
      let lib = readLib();
      if (lib && lib.schedules) return lib;
      // Migrate existing single-schedule save (if any) into the lib as "Default"
      let snap = null;
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) snap = JSON.parse(raw);
      } catch (e) {}
      lib = {
        schedules: { 'Default': snap || serializeState() },
        active: 'Default'
      };
      writeLib(lib);
      return lib;
    }

    function renderSelect(lib) {
      select.innerHTML = '';
      Object.keys(lib.schedules).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === lib.active) opt.selected = true;
        select.appendChild(opt);
      });
      if (badge) {
        badge.textContent = lib.active;
        badge.hidden = false;
      }
    }

    function applySnapshotData(snap) {
      if (!snap || !snap.html) return;
      const wasEdit = editMode;
      if (wasEdit) setEditMode(false);
      window._noSnap = true;
      printArea.innerHTML = snap.html;
      stripEditUI(printArea);
      if (typeof restoreHeader === 'function') restoreHeader(snap.header);
      _reinjectEditOnlyUI();
      // Clean stale inline styles same as import flow
      document.querySelectorAll('.card-default').forEach(c => {
        if (!c.style.background && !c.style.borderColor) { /* noop, keep clean */ }
      });
      if (snap.refFontSize && refSection) refSection.style.setProperty('--ref-font-size', snap.refFontSize);
      if (snap.theme) document.documentElement.setAttribute('data-theme', snap.theme);
      initAll();
      window._noSnap = false;
      if (wasEdit) setEditMode(true);
      snapshot('Switched schedule');
      if (window._rerunSearch) window._rerunSearch();
      if (window._startCountdownClock) window._startCountdownClock();
      if (window._refreshFacAutocomplete) window._refreshFacAutocomplete();
    }

    function switchTo(name, lib) {
      const snap = lib.schedules[name];
      if (!snap) return;
      lib.active = name;
      writeLib(lib);
      renderSelect(lib);
      applySnapshotData(snap);
    }

    select.addEventListener('change', () => {
      const lib = migrateIfNeeded();
      const target = select.value;
      if (target === lib.active) return;
      if (!confirm(`Switch to schedule "${target}"? Any unsaved changes to the current schedule may be lost unless already saved.`)) {
        select.value = lib.active;
        return;
      }
      switchTo(target, lib);
    });

    if (newBtn) newBtn.addEventListener('click', () => {
      const lib = migrateIfNeeded();
      const name = prompt('Save current schedule as a new name:');
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      if (lib.schedules[trimmed] && !confirm(`"${trimmed}" already exists. Overwrite it?`)) return;
      lib.schedules[trimmed] = serializeState();
      lib.active = trimmed;
      writeLib(lib);
      renderSelect(lib);
      if (badge) { badge.textContent = trimmed; badge.hidden = false; }
      showSaveToast(`Saved as "${trimmed}"`, 'success');
    });

    if (delBtn) delBtn.addEventListener('click', () => {
      const lib = migrateIfNeeded();
      const name = lib.active;
      if (Object.keys(lib.schedules).length <= 1) {
        alert('Cannot delete the only remaining schedule.');
        return;
      }
      if (!confirm(`Delete the schedule "${name}"? This cannot be undone.`)) return;
      delete lib.schedules[name];
      const remaining = Object.keys(lib.schedules);
      lib.active = remaining[0];
      writeLib(lib);
      renderSelect(lib);
      switchTo(lib.active, lib);
    });

    // Init on load
    const lib = migrateIfNeeded();
    renderSelect(lib);

    // Keep the active snapshot in the lib updated whenever we auto-save
    window._syncActiveScheduleSnapshot = function () {
      try {
        const l = readLib();
        if (!l || !l.active || !l.schedules[l.active]) return;
        l.schedules[l.active] = serializeState();
        writeLib(l);
      } catch (e) {}
    };
  })();

  /* =============================================================================
     FEATURE 3 — FACILITY AUTOCOMPLETE IN BUILDER
  ============================================================================= */
  (function initBuilderAutocomplete() {
    let facilityNames = [];

    function collectFacilityNames() {
      facilityNames = [];
      const refBodyEl = document.getElementById('refBody');
      if (!refBodyEl) return;
      refBodyEl.querySelectorAll('.ref-name').forEach(el => {
        const t = (el.textContent || '').trim();
        if (t) facilityNames.push(t);
      });
    }
    window._refreshFacAutocomplete = collectFacilityNames;

    function closeDropdown() {
      const existing = document.querySelector('.bt-autocomplete');
      if (existing) existing.remove();
    }

    function showDropdown(textarea, matches, lineStart, lineEnd) {
      closeDropdown();
      if (!matches.length) return;
      const rect = textarea.getBoundingClientRect();
      const ul = document.createElement('ul');
      ul.className = 'bt-autocomplete';
      ul.style.left = rect.left + 'px';
      ul.style.top  = (rect.top + Math.min(textarea.scrollHeight, rect.height) ) + 'px';
      ul.style.width = rect.width + 'px';
      matches.slice(0, 8).forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        li.addEventListener('mousedown', e => {
          e.preventDefault();
          const val = textarea.value;
          textarea.value = val.slice(0, lineStart) + name + '\n' + val.slice(lineEnd).replace(/^\n/, '');
          const newPos = lineStart + name.length + 1;
          textarea.selectionStart = textarea.selectionEnd = newPos;
          closeDropdown();
          textarea.focus();
        });
        ul.appendChild(li);
      });
      document.body.appendChild(ul);
    }

    document.addEventListener('input', e => {
      const ta = e.target;
      if (!ta.classList || !ta.classList.contains('bt-fac-input')) return;
      const val = ta.value;
      const caret = ta.selectionStart;
      const lineStart = val.lastIndexOf('\n', caret - 1) + 1;
      let lineEnd = val.indexOf('\n', caret);
      if (lineEnd === -1) lineEnd = val.length;
      const currentLine = val.slice(lineStart, lineEnd).trim();
      if (!currentLine) { closeDropdown(); return; }
      const q = currentLine.toLowerCase();
      const matches = facilityNames.filter(n => n.toLowerCase().includes(q) && n.toLowerCase() !== q);
      if (matches.length) showDropdown(ta, matches, lineStart, lineEnd);
      else closeDropdown();
    });

    document.addEventListener('mousedown', e => {
      if (e.target.closest('.bt-autocomplete') || e.target.classList.contains('bt-fac-input')) return;
      closeDropdown();
    });

    // Collect names whenever builder opens
    const builderOpenBtnEl = document.getElementById('builderOpenBtn');
    if (builderOpenBtnEl) builderOpenBtnEl.addEventListener('click', collectFacilityNames);
    collectFacilityNames();
  })();

  /* =============================================================================
     FEATURE 4 — DUPLICATE CARD / DUPLICATE ROW (global helpers)
  ============================================================================= */
  (function initDuplicateHelpers() {
    window._duplicateCard = function (card) {
      const clone = card.cloneNode(true);
      stripEditUI(clone);
      clone._init = false;
      card.parentNode.insertBefore(clone, card.nextSibling);
      initCard(clone);
      snapshot('Duplicated card');
    };

    window._duplicateRow = function (row) {
      const clone = row.cloneNode(true);
      stripEditUI(clone);
      clone._init = false;
      clone.querySelectorAll('[data-card]').forEach(c => { c._init = false; });
      row.parentNode.insertBefore(clone, row.nextSibling);
      initRow(clone);
      clone.querySelectorAll('[data-card]').forEach(initCard);
      if (window._updateSlotCountBadge) window._updateSlotCountBadge();
      if (window._applyWeekendMode) window._applyWeekendMode();
      snapshot('Duplicated time slot');
    };
  })();

  /* =============================================================================
     FEATURE 5 — QUICK REFERENCE EXPORT (Print sheet + CSV)
  ============================================================================= */
  (function initRefExport() {
    const printBtn = document.getElementById('expRefPrintBtn');
    const csvBtn   = document.getElementById('expRefCsvBtn');

    function getRefRows() {
      const rows = [];
      const body = document.getElementById('refBody');
      if (!body) return rows;
      body.querySelectorAll('[data-ref-row]').forEach(tr => {
        const nameEl  = tr.querySelector('.ref-name');
        const typeEl  = tr.querySelector('.ref-type');
        const timesEl = tr.querySelector('.ref-times');
        const name  = nameEl  ? nameEl.textContent.trim()  : '';
        const type  = typeEl  ? typeEl.textContent.trim()  : '';
        const times = timesEl ? timesEl.textContent.trim() : '';
        if (name) rows.push({ name, type, times });
      });
      return rows;
    }

    if (printBtn) printBtn.addEventListener('click', () => {
      const dd = document.getElementById('exportDropdown');
      if (dd) dd.hidden = true;
      const rows = getRefRows();
      const title = (document.getElementById('siteTitle') || {}).textContent || 'Delivery Schedule';
      const rowsHtml = rows.map(r => `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.times)}</td></tr>`).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Quick Reference — ${escapeHtml(title)}</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#111}
          h1{font-size:18px;margin-bottom:12px}
          table{width:100%;border-collapse:collapse;column-count:2;}
          table{display:table}
          .ref-print-wrap{column-count:2;column-gap:24px}
          table{break-inside:avoid;margin-bottom:0}
          td,th{border:1px solid #ccc;padding:5px 8px;font-size:12px;text-align:left}
          th{background:#f0f0f0}
        </style></head><body>
        <h1>Quick Reference — ${escapeHtml(title)}</h1>
        <div class="ref-print-wrap">
        <table><thead><tr><th class="ref-th-name">Facility</th><th class="ref-th-times">Delivery Time(s)</th></tr></thead><tbody>${rowsHtml}</tbody></table>
        </div>
        <script>window.onload=function(){window.print();}</script>
        </body></html>`;
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    });

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    }

    if (csvBtn) csvBtn.addEventListener('click', () => {
      const dd = document.getElementById('exportDropdown');
      if (dd) dd.hidden = true;
      const rows = getRefRows();
      const csvEscape = v => `"${String(v).replace(/"/g, '""')}"`;
      // Type stays a dedicated column in the CSV even though it renders as an
      // inline badge on screen — keeps the export sortable/filterable in Excel.
      let csv = `"Facility","Type","Delivery Time(s)"\n`;
      rows.forEach(r => { csv += `${csvEscape(r.name)},${csvEscape(r.type)},${csvEscape(r.times)}\n`; });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'quick-reference.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    });
  })();

  /* =============================================================================
     FEATURE 6 — ROUTE-FILTERED PRINT
  ============================================================================= */
  (function initRoutePrint() {
    const openBtn  = document.getElementById('expRoutePrintBtn');
    const overlay  = document.getElementById('routePrintOverlay');
    const modal    = document.getElementById('routePrintModal');
    const closeBtn = document.getElementById('routePrintClose');
    const listEl   = document.getElementById('routePrintList');
    if (!openBtn || !modal) return;

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    }

    function collectRoutes() {
      const routes = new Map(); // key: colorClass|name -> {colorClass, name}
      document.querySelectorAll('.card-tag').forEach(tag => {
        const routeClass = [...tag.classList].find(c => c.startsWith('tag-route') || /^tag-(red|blue|green|orange|purple|teal|black)$/.test(c));
        if (!routeClass) return;
        const name = tag.textContent.trim() || routeClass;
        const key = routeClass + '|' + name;
        if (!routes.has(key)) routes.set(key, { colorClass: routeClass, name });
      });
      return [...routes.values()];
    }

    function openModal() {
      const dd = document.getElementById('exportDropdown');
      if (dd) dd.hidden = true;
      const routes = collectRoutes();
      listEl.innerHTML = '';
      if (!routes.length) {
        listEl.innerHTML = '<li class="route-print-empty">No route tags found on any cards.</li>';
      } else {
        routes.forEach(r => {
          const li = document.createElement('li');
          li.className = 'route-print-item';
          li.innerHTML = `<span class="card-tag ${r.colorClass} route-print-swatch">${escapeHtml(r.name)}</span>`;
          li.addEventListener('click', () => printRoute(r));
          listEl.appendChild(li);
        });
      }
      overlay.hidden = false;
      modal.hidden = false;
    }

    function closeModal() {
      overlay.hidden = true;
      modal.hidden = true;
    }

    function printRoute(route) {
      closeModal();
      const rowsHtml = [];
      document.querySelectorAll('.timeline-row').forEach(row => {
        const cardsWithRoute = [...row.querySelectorAll('.card')].filter(card =>
          [...card.querySelectorAll('.card-tag')].some(t => t.classList.contains(route.colorClass) && t.textContent.trim() === route.name)
        );
        if (!cardsWithRoute.length) return;
        const timeChip = row.querySelector('.time-chip');
        const timeTxt = timeChip ? timeChip.textContent.trim() : '';
        const cardsHtml = cardsWithRoute.map(card => {
          const facs = [...card.querySelectorAll('.card-list span[data-editable]')].map(s => `<li>${escapeHtml(s.textContent.trim())}</li>`).join('');
          const label = card.querySelector('.card-label');
          const labelTxt = label ? escapeHtml(label.textContent.trim()) : '';
          return `<div class="rp-card"><div class="rp-card-label">${labelTxt}</div><ul>${facs}</ul></div>`;
        }).join('');
        rowsHtml.push(`<div class="rp-row"><div class="rp-time">${escapeHtml(timeTxt)}</div><div class="rp-cards">${cardsHtml}</div></div>`);
      });

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Route: ${escapeHtml(route.name)}</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#111}
          h1{font-size:20px;margin-bottom:16px;border-bottom:2px solid #333;padding-bottom:6px}
          .rp-row{margin-bottom:14px;break-inside:avoid}
          .rp-time{font-weight:700;font-size:14px;margin-bottom:4px}
          .rp-card{margin-bottom:8px;padding-left:12px;border-left:3px solid #888}
          .rp-card-label{font-weight:600;font-size:12px;margin-bottom:2px}
          ul{margin:0;padding-left:18px;font-size:12px}
        </style></head><body>
        <h1>Route: ${escapeHtml(route.name)}</h1>
        ${rowsHtml.join('') || '<p>No matching time slots found.</p>'}
        <script>window.onload=function(){window.print();}</script>
        </body></html>`;
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    }

    openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);
  })();

  /* =============================================================================
     FEATURE 7 — CUTOFF COUNTDOWN CLOCK
  ============================================================================= */
  (function initCutoffCountdown() {
    let intervalId = null;

    function parseCutoffOffsetHours() {
      const el = document.getElementById('cutoffText');
      const txt = el ? el.textContent : '';
      const m = txt && txt.match(/(\d+(?:\.\d+)?)\s*hr/i);
      return m ? parseFloat(m[1]) : 2;
    }

    function parseTimeToMinutes(txt) {
      if (!txt) return null;
      const m = txt.trim().match(/(\d{1,2}):(\d{2})\s*([AaPp][Mm])/);
      if (!m) return null;
      let hour = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const ampm = m[3].toUpperCase();
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      return hour * 60 + min;
    }

    function fmtRemaining(mins) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h > 0) return `Cutoff in ${h}h ${m}m`;
      return `Cutoff in ${m}m`;
    }

    function renderCountdowns() {
      if (document.documentElement.classList.contains('edit-mode')) return;
      const offsetHours = parseCutoffOffsetHours();
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      document.querySelectorAll('.time-chip').forEach(chip => {
        const deliveryMins = parseTimeToMinutes(chip.textContent);
        let span = chip.parentNode ? chip.parentNode.querySelector(':scope > .cutoff-countdown') : null;
        if (deliveryMins === null) {
          if (span) span.remove();
          return;
        }
        if (!span) {
          span = document.createElement('span');
          span.className = 'cutoff-countdown';
          chip.insertAdjacentElement('afterend', span);
        }
        const cutoffMins = deliveryMins - Math.round(offsetHours * 60);
        const remaining = cutoffMins - nowMins;
        if (remaining <= 0) {
          span.textContent = 'CUTOFF PASSED';
          span.classList.add('cutoff-passed');
        } else {
          span.textContent = fmtRemaining(remaining);
          span.classList.remove('cutoff-passed');
        }
      });
    }

    window._startCountdownClock = function () {
      renderCountdowns();
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(renderCountdowns, 60000);
    };

    // Re-render live whenever the cutoff text is edited
    const cutoffEl = document.getElementById('cutoffText');
    if (cutoffEl) {
      const obs = new MutationObserver(() => renderCountdowns());
      obs.observe(cutoffEl, { characterData: true, childList: true, subtree: true });
      cutoffEl.addEventListener('input', renderCountdowns);
      cutoffEl.addEventListener('blur',  renderCountdowns);
    }

    window._startCountdownClock();
  })();

  /* =============================================================================
     FEATURE 8 — FACILITY STATUS FLAGS (global helpers used by initFacility)
  ============================================================================= */
  (function initFacilityStatus() {
    function closeStatusMenu() {
      const m = document.querySelector('.status-menu');
      if (m) m.remove();
    }

    window._applyFacStatus = function (span) {
      const status = span.getAttribute('data-status') || 'active';
      span.classList.remove('status-active', 'status-onhold', 'status-inactive');
      span.classList.add('status-' + status);
      const wrap = span.closest('.fac-item');
      if (wrap) {
        const dot = wrap.querySelector('.status-dot');
        if (dot) {
          dot.classList.remove('dot-active', 'dot-onhold', 'dot-inactive');
          dot.classList.add('dot-' + status);
        }
      }
    };

    const FAC_TYPE_OPTS = [
      '— None —', 'SNF', 'SNF/ALF', 'ALF', 'ANF/ALF',
      'ASSISTED LIVING', 'CUSTODIAL', 'CORRECTIONAL', 'HOSPICE', 'GROUP HOME'
    ];

    function getFacName(span) {
      // Return just the text without the .fac-type-badge text
      const badge = span.querySelector('.fac-type-badge');
      return badge ? span.textContent.replace(badge.textContent, '').trim() : span.textContent.trim();
    }

    function setFacType(span, typeVal) {
      const name = getFacName(span);
      span.setAttribute('data-fac-type', typeVal);
      if (typeVal) {
        span.innerHTML = name + ' <span class="fac-type-badge">' + typeVal + '</span>';
      } else {
        span.textContent = name;
        span.removeAttribute('data-fac-type');
      }
    }

    window._showStatusMenu = function (span, dot, x, y) {
      closeStatusMenu();
      const menu = document.createElement('div');
      menu.className = 'status-menu';
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';

      // ── Status section header ──
      const statusHdr = document.createElement('div');
      statusHdr.className = 'status-menu-hdr';
      statusHdr.textContent = 'Status';
      menu.appendChild(statusHdr);

      [
        { label: '✓ Active',    val: 'active'   },
        { label: '⏸ On Hold',   val: 'onhold'   },
        { label: '✕ Inactive',  val: 'inactive' }
      ].forEach(opt => {
        const item = document.createElement('div');
        item.className = 'status-menu-item';
        if (span.getAttribute('data-status') === opt.val) item.classList.add('status-menu-active');
        item.textContent = opt.label;
        item.addEventListener('click', () => {
          span.setAttribute('data-status', opt.val);
          window._applyFacStatus(span);
          closeStatusMenu();
          snapshot(`Set "${getFacName(span)}" ${opt.label}`);
        });
        menu.appendChild(item);
      });

      // ── Divider ──
      const div = document.createElement('div');
      div.className = 'status-menu-divider';
      menu.appendChild(div);

      // ── Facility Type section header ──
      const typeHdr = document.createElement('div');
      typeHdr.className = 'status-menu-hdr';
      typeHdr.textContent = 'Facility Type';
      menu.appendChild(typeHdr);

      const currentType = span.getAttribute('data-fac-type') || '';
      FAC_TYPE_OPTS.forEach(t => {
        const val = t === '— None —' ? '' : t;
        const item = document.createElement('div');
        item.className = 'status-menu-item';
        if (currentType === val) item.classList.add('status-menu-active');
        item.textContent = t;
        item.addEventListener('click', () => {
          setFacType(span, val);
          closeStatusMenu();
          snapshot(`Set type "${val || 'none'}" on "${getFacName(span)}"`);
        });
        menu.appendChild(item);
      });

      // Custom type input
      const customWrap = document.createElement('div');
      customWrap.style.cssText = 'padding: 4px 8px; display:flex; gap:4px;';
      const customIn = document.createElement('input');
      customIn.className = 'bt-input';
      customIn.style.cssText = 'font-size:11px; padding:2px 5px; flex:1;';
      customIn.placeholder = 'Custom type…';
      customIn.addEventListener('keydown', e => {
        if (e.key === 'Enter' && customIn.value.trim()) {
          setFacType(span, customIn.value.trim().toUpperCase());
          closeStatusMenu();
          snapshot(`Set custom type on "${getFacName(span)}"`);
        }
      });
      customWrap.appendChild(customIn);
      menu.appendChild(customWrap);

      document.body.appendChild(menu);
      customIn.focus();
    };

    document.addEventListener('mousedown', e => {
      if (!e.target.closest('.status-menu')) closeStatusMenu();
    });
    document.addEventListener('scroll', closeStatusMenu, true);

    // Apply status classes to all existing facility spans on load / re-init
    window._applyAllFacStatuses = function () {
      document.querySelectorAll('.fac-item span[data-editable]').forEach(span => {
        if (!span.hasAttribute('data-status')) span.setAttribute('data-status', 'active');
        window._applyFacStatus(span);
      });
    };
    window._applyAllFacStatuses();
  })();

  /* ── Cutoff countdown visibility toggle (3 states) ──────────────────── */
  // States: 'all' (show everything) → 'passed' (hide passed only) → 'none' (hide all)
  (function initHideCutoffPassed() {
    const btn = document.getElementById('hideCutoffPassedBtn');
    if (!btn) return;
    const LS_KEY_CP = 'deliveryCutoffVisibility';
    const STATES = ['all', 'passed', 'none'];
    let state = localStorage.getItem(LS_KEY_CP) || 'all';
    if (!STATES.includes(state)) state = 'all';

    const EYE_OPEN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    const EYE_HALF = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="1" y1="19" x2="23" y2="5" stroke-dasharray="3 3"/></svg>';
    const EYE_SHUT = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

    function apply() {
      html.classList.remove('hide-cutoff-passed', 'hide-cutoff-all');
      btn.classList.remove('cutoff-hidden', 'cutoff-half');
      if (state === 'passed') {
        html.classList.add('hide-cutoff-passed');
        btn.classList.add('cutoff-half');
        btn.title = 'Countdowns: hiding passed only — click to hide all';
        btn.innerHTML = EYE_HALF;
      } else if (state === 'none') {
        html.classList.add('hide-cutoff-all');
        btn.classList.add('cutoff-hidden');
        btn.title = 'Countdowns: all hidden — click to show all';
        btn.innerHTML = EYE_SHUT;
      } else {
        btn.title = 'Countdowns: all visible — click to hide passed';
        btn.innerHTML = EYE_OPEN;
      }
    }

    apply();
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = (STATES.indexOf(state) + 1) % STATES.length;
      state = STATES[idx];
      localStorage.setItem(LS_KEY_CP, state);
      apply();
    });
  })();

  /* =============================================================================
     FEATURE — DAY FILTER (3-state cycle)

     One header button cycles through:
        all      → Weekday + Weekend (nothing hidden)
        weekday  → only rows/cards serving MON–FRI
        weekend  → only rows/cards serving SAT/SUN

     Classification is per-card, read from the .tag-freq chips:
        weekend  — SAT, SUN, WKND, WEEKEND
        weekday  — MON..FRI (long or short), M/W/F style, M–F, DAILY, WKDY
     A card with no recognisable frequency tag is treated as BOTH, so an
     untagged card is never hidden by the filter — silently disappearing data
     is far worse than showing one row too many.

     Rows are hidden purely via CSS (display:none) and never deleted. State
     persists in localStorage under deliveryDayFilter, with a migration from
     the old boolean deliveryWeekendMode key.
  ============================================================================= */
  (function initDayFilterToggle() {
    const btn   = document.getElementById('weekendToggleBtn');
    const label = document.getElementById('weekendToggleLabel');
    const pill  = document.getElementById('weekendPill');
    if (!btn) return;

    const LS_KEY_DAY  = 'deliveryDayFilter';
    const LS_KEY_WKND = 'deliveryWeekendMode'; // legacy boolean

    const WEEKEND_RE = /\b(SAT(URDAY)?|SUN(DAY)?|WKND|WEEKEND)\b/i;
    // Long names, 3-letter abbreviations, and the compact M/T/W/Th/F forms the
    // Quick Reference uses. "M–F" / "M-F" and DAILY count as weekday too.
    const WEEKDAY_RE = /(\b(MON|TUE|TUES|WED|THU|THUR|THURS|FRI)(DAY|DAYS)?\b)|(\bM\s*[–—-]\s*F\b)|(\bDAILY\b)|(\bWKDY\b)|(\bWEEKDAY?S?\b)|(\bEVERY\s*DAY\b)|((^|[^A-Z])(M|T|W|R|TH|F)(\s*\/\s*(M|T|W|R|TH|F))+([^A-Z]|$))/i;

    const MODES = ['all', 'weekday', 'weekend'];
    const META = {
      all: {
        label: 'All Days',
        pill:  'WEEKDAY + WEEKEND',
        cls:   '',
        title: 'Showing every route — click for Weekday only'
      },
      weekday: {
        label: 'Weekday View',
        pill:  'MON – FRI',
        cls:   'mode-weekday',
        title: 'Showing weekday (MON–FRI) routes only — click for Weekend only'
      },
      weekend: {
        label: 'Weekend View',
        pill:  'SAT / SUN',
        cls:   'mode-weekend',
        title: 'Showing weekend (SAT/SUN) routes only — click to show all days'
      }
    };

    let mode = localStorage.getItem(LS_KEY_DAY);
    if (MODES.indexOf(mode) === -1) {
      // Migrate the old two-state key: ON meant weekend-only, OFF meant everything.
      mode = localStorage.getItem(LS_KEY_WKND) === '1' ? 'weekend' : 'all';
    }

    function freqTextOf(card) {
      const tags = card.querySelectorAll('.tag-freq');
      if (!tags.length) return '';
      return Array.from(tags).map(t => t.textContent || '').join(' ');
    }

    /* Tag every card and every row with what days it serves. */
    function markDays() {
      document.querySelectorAll('.timeline-row').forEach(row => {
        let rowWeekend = false, rowWeekday = false;
        row.querySelectorAll('.card').forEach(card => {
          const txt = freqTextOf(card);
          let isWknd = WEEKEND_RE.test(txt);
          let isWkdy = WEEKDAY_RE.test(txt);
          if (!isWknd && !isWkdy) { isWknd = true; isWkdy = true; } // untagged → always visible
          card.classList.toggle('day-weekend', isWknd);
          card.classList.toggle('day-weekday', isWkdy);
          if (isWknd) rowWeekend = true;
          if (isWkdy) rowWeekday = true;
        });
        // A row with no cards at all stays visible in every mode.
        if (!row.querySelector('.card')) { rowWeekend = true; rowWeekday = true; }
        row.classList.toggle('has-weekend', rowWeekend);
        row.classList.toggle('has-weekday', rowWeekday);
      });
    }

    function apply() {
      markDays();
      const meta = META[mode] || META.all;
      html.classList.toggle('weekend-mode', mode === 'weekend');
      html.classList.toggle('weekday-mode', mode === 'weekday');
      html.dataset.dayFilter = mode;

      btn.classList.toggle('active', mode !== 'all');
      btn.classList.remove('mode-weekday', 'mode-weekend');
      if (meta.cls) btn.classList.add(meta.cls);
      btn.setAttribute('aria-pressed', String(mode !== 'all'));
      btn.title = meta.title;
      if (label) label.textContent = meta.label;
      if (pill) {
        pill.textContent = meta.pill;
        pill.classList.toggle('active', mode !== 'all');
      }
    }

    btn.addEventListener('click', () => {
      mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      try { localStorage.setItem(LS_KEY_DAY, mode); } catch (e) {}
      apply();
    });

    // Exposed so other init paths (undo/redo, import, builder generate,
    // add/duplicate row, etc.) can re-tag rows after the DOM changes.
    window._applyWeekendMode = apply;
    window._getDayFilter = () => mode;

    apply();
  })();

  /* =============================================================================
     LIVE DASHBOARD LAUNCHER
     Moved out of the header (which had run out of room) into a floating
     bottom-right pill. Ctrl+Shift+L opens it from anywhere, and the button can
     be dismissed for a completely clean board — the shortcut still works.
  ============================================================================= */
  (function initLiveLauncher() {
    const wrap    = document.getElementById('liveLauncher');
    const hideBtn = document.getElementById('liveLauncherHide');
    const LS_KEY_LAUNCH = 'deliveryLiveLauncherHidden';
    if (!wrap) return;

    if (localStorage.getItem(LS_KEY_LAUNCH) === '1') wrap.classList.add('is-hidden');

    if (hideBtn) hideBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      wrap.classList.add('is-hidden');
      try { localStorage.setItem(LS_KEY_LAUNCH, '1'); } catch (err) {}
    });

    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
      if ((e.key || '').toLowerCase() !== 'l') return;
      e.preventDefault();
      // Un-hide so the user can find it again after using the shortcut once.
      wrap.classList.remove('is-hidden');
      try { localStorage.setItem(LS_KEY_LAUNCH, '0'); } catch (err) {}
      try { if (typeof saveNow === 'function') saveNow(true); } catch (err) {}
      window.open('live.html', '_blank', 'noopener');
    });
  })();


})();
