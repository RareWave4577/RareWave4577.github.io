<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Delivery Schedule</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css?v=30" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
</head>
<body>

  <!-- ═══════════════════════════════════════════════════════════
       HEADER
  ═══════════════════════════════════════════════════════════ -->
  <header class="site-header" id="siteHeader">
    <div class="header-inner">

      <div class="header-brand">
        <svg class="brand-logo" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect x="2" y="9" width="26" height="17" rx="3" stroke="currentColor" stroke-width="2.2"/>
          <path d="M28 15h5l4 5v7h-9V15z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
          <circle cx="9"  cy="28" r="3" fill="currentColor"/>
          <circle cx="30" cy="28" r="3" fill="currentColor"/>
          <line x1="7"  y1="16" x2="20" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="7"  y1="20" x2="16" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div class="brand-text">
          <h1 class="site-title" id="siteTitle" spellcheck="false">It's Not Delivery… It's DiGiorno</h1>
          <p class="site-subtitle" id="siteSubtitle" spellcheck="false">Facility Delivery Schedule</p>
          <span id="activeSchedBadge" class="active-sched-badge" hidden></span>
        </div>
      </div>

      <div class="header-meta">
        <div class="cutoff-pill" id="cutoffPill">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span id="cutoffText" spellcheck="false">Cutoff: 2 hrs prior to delivery</span>
          <button id="hideCutoffPassedBtn" title="Hide/show Cutoff Passed indicators" aria-label="Toggle cutoff passed badges" class="cutoff-toggle-btn">
            <svg id="cutoffEyeIcon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>

      <nav class="header-actions" aria-label="App controls">
        <a id="liveViewBtn" class="icon-btn live-view-btn" href="live.html" target="_blank" rel="noopener" title="Open the read-only live dashboard (saves first)" aria-label="Open live dashboard">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          <span class="live-view-label">Live</span>
        </a>
        <div class="btn-group">
          <button id="undoBtn" class="icon-btn" disabled title="Undo (Ctrl+Z)" aria-label="Undo">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>
          </button>
          <button id="redoBtn" class="icon-btn" disabled title="Redo (Ctrl+Y)" aria-label="Redo">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-4.95"/></svg>
          </button>
        </div>

        <button id="editToggleBtn" class="pill-btn btn-edit" aria-pressed="false">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          <span>Edit</span>
        </button>

        <!-- Weekend Routes toggle -->
        <button id="weekendToggleBtn" class="pill-btn btn-weekend" title="Show only weekend (SAT/SUN) routes" aria-pressed="false">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span id="weekendToggleLabel">Weekend View</span>
          <span id="weekendPill" class="weekend-pill">SAT / SUN</span>
        </button>

        <!-- Search / Highlight bar -->
        <div id="searchWrap" class="search-wrap">
          <svg class="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="schedSearch" class="search-input" placeholder="Search facilities…" spellcheck="false" aria-label="Search facilities" />
          <span id="searchCount" class="search-count" hidden></span>
          <button id="searchClearBtn" class="search-clear-btn" title="Clear search" aria-label="Clear search" hidden>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Multiple named schedules (edit mode only) -->
        <div class="sched-lib-wrap edit-only" id="schedLibWrap">
          <select id="scheduleSelect" class="sched-select" title="Switch schedule"></select>
          <button id="schedNewNameBtn" class="icon-btn sched-lib-btn" title="Save current as a new named schedule" aria-label="Save as new schedule">+</button>
          <button id="schedDeleteBtn" class="icon-btn sched-lib-btn sched-delete-btn" title="Delete this named schedule" aria-label="Delete schedule">×</button>
        </div>

        <button id="builderOpenBtn" class="pill-btn btn-builder edit-only" title="Build a new schedule from a data table" style="display:none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
          <span>Builder</span>
        </button>

        <button id="changelogBtn" class="pill-btn btn-log" title="Change Log">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>
          <span>History</span>
          <span id="changelogCount" class="count-badge" style="display:none">0</span>
        </button>

        <div class="btn-pdf-wrap">
        <button id="exportPdfBtn" class="pill-btn btn-pdf" title="Export / Print">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          <span>Export PDF</span>
        </button>

        <!-- ── Export options dropdown ── -->
        <div id="exportDropdown" class="export-dropdown" hidden>
          <div class="exp-header">Print / Export Options</div>
          <div class="exp-row">
            <label class="exp-label">Paper Size</label>
            <div class="exp-options" id="expSizeOptions">
              <button class="exp-opt" data-size="letter">Letter</button>
              <button class="exp-opt" data-size="legal">Legal</button>
              <button class="exp-opt" data-size="A4">A4</button>
              <button class="exp-opt active" data-size="A3">A3</button>
            </div>
          </div>
          <div class="exp-row">
            <label class="exp-label">Orientation</label>
            <div class="exp-options" id="expOrientOptions">
              <button class="exp-opt" data-orient="portrait">Portrait</button>
              <button class="exp-opt active" data-orient="landscape">Landscape</button>
            </div>
          </div>
          <div class="exp-row">
            <label class="exp-label">Include</label>
            <div class="exp-options" id="expIncludeOptions">
              <button class="exp-opt active" id="expInclRefBtn" data-incl="ref" aria-pressed="true">Quick Reference</button>
            </div>
          </div>
          <button id="expPrintBtn" class="exp-print-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print / Save PDF
          </button>
          <div class="exp-divider"></div>
          <button id="expNewScheduleBtn" class="exp-print-btn exp-fullsize-btn exp-new-schedule-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            New Schedule (Start from Scratch)
          </button>
          <div class="exp-divider"></div>
          <button id="expResetColorsBtn" class="exp-print-btn exp-fullsize-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>
            Reset All Card Colors to Default
          </button>
          <button id="expAutoHeightBtn" class="exp-print-btn exp-fullsize-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="12 3 12 21"/><polyline points="8 7 12 3 16 7"/><polyline points="8 17 12 21 16 17"/></svg>
            Auto-Size All Card Heights
          </button>
          <button id="expAutoWidthBtn" class="exp-print-btn exp-fullsize-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 12 21 12"/><polyline points="7 8 3 12 7 16"/><polyline points="17 8 21 12 17 16"/></svg>
            Auto-Size All Card Widths
          </button>
          <div class="exp-divider"></div>
          <button id="expRefDaysBtn" class="exp-print-btn exp-fullsize-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Fill Delivery Days from Timeline
          </button>
          <button id="expRefPrintBtn" class="exp-print-btn exp-fullsize-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
            Print Ref Sheet
          </button>
          <button id="expRefCsvBtn" class="exp-print-btn exp-fullsize-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Download Ref CSV
          </button>
          <button id="expRoutePrintBtn" class="exp-print-btn exp-fullsize-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            Print by Route
          </button>
          <div class="exp-divider"></div>
          <button id="expFullSizeBtn" class="exp-print-btn exp-fullsize-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            Full Size (no page splits)
          </button>
        </div>
        </div><!-- /btn-pdf-wrap -->

        <!-- Save / Backup / Import -->
        <div class="backup-wrap">
          <button id="saveBtn" class="pill-btn btn-save" title="Save to this browser (Ctrl+S)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span id="saveBtnLabel">Save</span>
          </button>
          <button id="backupBtn" class="pill-btn btn-backup" title="Download backup file">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Backup</span>
          </button>
          <button id="importBtn" class="pill-btn btn-import" title="Load a backup file">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Import</span>
          </button>
          <input type="file" id="importFileInput" accept=".json" style="display:none" />
        </div>
        <!-- Save state indicator -->
        <div id="saveIndicator" class="save-indicator" aria-live="polite"></div>

        <button id="themeBtn" class="icon-btn" aria-label="Toggle dark mode" title="Toggle theme">
          <svg class="icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg class="icon-sun"  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
      </nav>

    </div>
  </header>

  <!-- ═══════════════════════════════════════════════════════════
       EDIT BANNER
  ═══════════════════════════════════════════════════════════ -->
  <div id="editBanner" class="edit-banner" hidden>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <span><strong>Edit Mode</strong> — Click any text to edit. Drag cards via the ⠿ handle. Use <kbd>+</kbd> buttons to add. Click <kbd>×</kbd> to delete. <kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd> to undo/redo.</span>
  </div>

  <!-- ═══════════════════════════════════════════════════════════
       RICH TEXT TOOLBAR (floating, shown when editing text)
  ═══════════════════════════════════════════════════════════ -->
  <div id="rteToolbar" class="rte-toolbar" role="toolbar" aria-label="Text formatting" hidden>
    <div class="rte-drag-handle" id="rteDragHandle" title="Drag to move toolbar">
      <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/><circle cx="3" cy="6" r="1.2"/><circle cx="7" cy="6" r="1.2"/><circle cx="3" cy="10" r="1.2"/><circle cx="7" cy="10" r="1.2"/><circle cx="3" cy="14" r="1.2"/><circle cx="7" cy="14" r="1.2"/></svg>
    </div>
    <div class="rte-divider"></div>
    <button class="rte-btn" data-cmd="bold"         title="Bold"><strong>B</strong></button>
    <button class="rte-btn" data-cmd="italic"       title="Italic"><em>I</em></button>
    <button class="rte-btn" data-cmd="underline"    title="Underline"><u>U</u></button>
    <button class="rte-btn" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
    <div class="rte-divider"></div>
    <div class="rte-size-wrap" id="rteSizeWrap">
      <button class="rte-size-btn" id="rteSizeBtn" title="Font size">Size <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg></button>
      <div class="rte-size-menu" id="rteSizeMenu" hidden>
        <button class="rte-size-opt" data-size="1" data-pt="8pt">XS <span>8pt</span></button>
        <button class="rte-size-opt" data-size="2" data-pt="10pt">S <span>10pt</span></button>
        <button class="rte-size-opt" data-size="3" data-pt="12pt">M <span>12pt</span></button>
        <button class="rte-size-opt" data-size="4" data-pt="14pt">L <span>14pt</span></button>
        <button class="rte-size-opt" data-size="5" data-pt="18pt">XL <span>18pt</span></button>
        <button class="rte-size-opt" data-size="6" data-pt="24pt">2X <span>24pt</span></button>
        <button class="rte-size-opt" data-size="7" data-pt="36pt">3X <span>36pt</span></button>
      </div>
    </div>
    <div class="rte-divider"></div>
    <label class="rte-color-wrap" title="Text color">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c-.6 0-1.1.4-1.3.9L5.3 18.5c-.3.7.1 1.5.8 1.5h2.3l1.4-3.5h4.4l1.4 3.5h2.3c.7 0 1.1-.8.8-1.5L13.3 3.9C13.1 3.4 12.6 3 12 3zm-1.3 10.5L12 8.8l1.3 4.7h-2.6z"/></svg>
      <input type="color" id="rteColorInput" value="#111827" />
    </label>
    <div class="rte-divider"></div>
    <button class="rte-btn rte-clear" data-cmd="removeFormat" title="Clear formatting">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="rte-divider"></div>
    <button class="rte-btn rte-delete" data-cmd="deleteText" title="Delete selected text (or all text if nothing selected)">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
    </button>
  </div>

  <!-- ═══════════════════════════════════════════════════════════
       SCHEDULE BUILDER MODAL
  ═══════════════════════════════════════════════════════════ -->
  <div id="builderOverlay" class="builder-overlay" hidden></div>
  <div id="builderModal" class="builder-modal" role="dialog" aria-modal="true" aria-label="Schedule Builder" hidden>
    <div class="builder-header">
      <div class="builder-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
        Schedule Builder
      </div>
      <div class="builder-header-actions">
        <button id="builderNewScheduleBtn" class="builder-action-btn builder-new-btn" title="Wipe everything and start a brand new schedule">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          New Schedule
        </button>
        <button id="builderImportBtn" class="builder-action-btn builder-import-btn" title="Load current timeline into builder for editing">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="21" x2="12" y2="9"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
          Import from Timeline
        </button>
        <button id="builderExportFileBtn" class="builder-action-btn builder-export-file-btn" title="Export builder rows as a .json file">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export List
        </button>
        <button id="builderImportFileBtn" class="builder-action-btn builder-import-file-btn" title="Load builder rows from a .json file">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Import List
        </button>
        <input type="file" id="builderImportFileInput" accept=".json" style="display:none">
        <button id="builderClearBtn" class="builder-action-btn builder-clear-btn" title="Clear all rows">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          Clear All
        </button>
        <button id="builderClose" class="icon-btn" aria-label="Close builder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <p class="builder-hint">Enter each time slot below. Facilities in the same row will be grouped into one card. Use the <strong>+</strong> to add more groups at the same time. Click <strong>Generate Timeline</strong> to build.</p>
    <div class="builder-table-wrap">
      <table class="builder-table" id="builderTable">
        <thead>
          <tr>
            <th class="bt-col-time">Time</th>
            <th class="bt-col-freq">Frequency</th>
            <th class="bt-col-type">Type</th>
            <th class="bt-col-label">Card Label / Tag</th>
            <th class="bt-col-facilities">Facilities <span class="bt-col-hint">(name | TYPE per line)</span></th>
            <th class="bt-col-factype">Fac. Type</th>
            <th class="bt-col-route">Route Tag</th>
            <th class="bt-col-del"></th>
          </tr>
        </thead>
        <tbody id="builderBody">
          <!-- rows injected by JS -->
        </tbody>
      </table>
    </div>
    <!-- Sticky inline add-row bar inside scroll area -->
    <div class="builder-inline-add">
      <button id="builderInlineAddBtn" class="builder-inline-add-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Row &nbsp;<kbd>Ctrl+Enter</kbd>
      </button>
    </div>
    <div class="builder-footer">
      <div class="builder-footer-left">
        <button id="builderAddRowBtn" class="ghost-btn builder-add-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Row
        </button>
        <span id="builderRowCount" class="builder-row-count">0 rows</span>
      </div>
      <div class="builder-footer-right">
        <button id="builderPreviewBtn" class="pill-btn builder-preview-btn">Preview</button>
        <button id="builderGenerateBtn" class="pill-btn builder-generate-btn">Generate Timeline</button>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════
       CHANGELOG PANEL
  ═══════════════════════════════════════════════════════════ -->
  <div id="changelogOverlay" class="cl-overlay"></div>
  <aside id="changelogPanel" class="cl-panel" aria-label="Change history">
    <div class="cl-header">
      <span class="cl-header-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Change History
      </span>
      <button id="changelogClose" class="icon-btn" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <p class="cl-hint">Click "Revert" on any entry to restore that version.</p>
    <ul id="changelogList" class="cl-list" role="list"></ul>
    <p id="changelogEmpty" class="cl-empty">No changes yet — start editing to build history.</p>
  </aside>

  <!-- ═══════════════════════════════════════════════════════════
       MAIN CONTENT
  ═══════════════════════════════════════════════════════════ -->
  <main class="main-layout" id="printArea">

    <!-- ── LEFT: Timeline ── -->
    <section class="timeline-section" aria-label="Delivery timeline">

      <!-- Sticky notes -->
      <div class="sticky-note sticky-blue" data-card>
        <p><strong>Cutoff is <u>2 hours</u> prior to delivery time.</strong></p>
        <p>If you promise something please <strong>follow it all the way through.</strong></p>
      </div>

      <div class="sticky-note sticky-yellow" data-card>
        <p><strong>Skilled Facilities</strong></p>
        <p>(excluding Casa Maria, Coronado, Farmington, San Juan, and Sunset)</p>
        <p class="badge-row"><span class="badge badge-green">All Skilled Facilities receive daily delivery</span></p>
      </div>

      <!-- ── Free cards board (not tied to timeline) ── -->
      <div class="free-board" id="freeBoard">
        <!-- Cards added here by user -->
      </div>
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

        <!-- 11:30 AM -->
        <div class="timeline-row" data-time="11:30 AM">
          <div class="time-col">
            <span class="time-chip" data-editable>11:30 AM</span>
          </div>
          <div class="timeline-spine"><div class="spine-dot"></div></div>
          <div class="cards-col">
            <div class="card card-purple" data-card>
              <div class="card-label" data-editable>Hospice</div>
              <div class="card-sub"   data-editable>Spanish Trails</div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-tag tag-mwf" data-editable>MON / WED / FRI — Offices</div>
              <div class="card-list" data-list>
                <span data-editable>Advantage Homes</span>
                <span data-editable>Carefree Living</span>
                <span data-editable>Great Living</span>
              </div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>Wellesley</span>
                <span data-editable>Haven Care</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 1:00 PM -->
        <div class="timeline-row" data-time="1:00 PM">
          <div class="time-col">
            <span class="time-chip" data-editable>1:00 PM</span>
          </div>
          <div class="timeline-spine"><div class="spine-dot"></div></div>
          <div class="cards-col">
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>Advanced HC</span>
                <span data-editable>Betty Dare Wellness</span>
                <span data-editable>Casa Arena</span>
                <span data-editable>Gallup</span>
              </div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>La Vida Buena</span>
                <span data-editable>Las Cruces V/W</span>
                <span data-editable>Los Alamos</span>
                <span data-editable>Northrise</span>
              </div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>NMVA</span>
                <span data-editable>Paloma</span>
                <span data-editable>Vanguard</span>
              </div>
            </div>
            <div class="card card-skilled" data-card>
              <div class="card-tag tag-skilled" data-editable>Skilled Facilities</div>
              <div class="card-sub" data-editable>Excl. Casa Maria, Coronado, Farmington, San Juan, Sunset</div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>Bernalillo YSC</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 1:30 PM -->
        <div class="timeline-row" data-time="1:30 PM">
          <div class="time-col">
            <span class="time-chip" data-editable>1:30 PM</span>
          </div>
          <div class="timeline-spine"><div class="spine-dot"></div></div>
          <div class="cards-col">
            <div class="card card-default" data-card>
              <div class="card-tag tag-tuth" data-editable>TUE / THU — Offices</div>
              <div class="card-list" data-list>
                <span data-editable>Advantage Homes</span>
                <span data-editable>Carefree Living</span>
                <span data-editable>Great Living</span>
              </div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>Haven Care</span>
                <span data-editable>Wellesley</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2:00 PM PICKUP -->
        <div class="timeline-row" data-time="2:00 PM PICKUP">
          <div class="time-col">
            <span class="time-chip time-chip-pickup" data-editable>2:00 PM</span>
            <span class="pickup-badge">PICKUP</span>
          </div>
          <div class="timeline-spine"><div class="spine-dot dot-pickup"></div></div>
          <div class="cards-col">
            <div class="card card-pickup" data-card>
              <div class="card-label" data-editable>Turning Point</div>
              <div class="card-sub"   data-editable>Pickup only — not a delivery</div>
            </div>
          </div>
        </div>

        <!-- 6:00 PM -->
        <div class="timeline-row" data-time="6:00 PM">
          <div class="time-col">
            <span class="time-chip" data-editable>6:00 PM</span>
          </div>
          <div class="timeline-spine"><div class="spine-dot"></div></div>
          <div class="cards-col">
            <div class="card card-default" data-card>
              <div class="card-label" data-editable>Hospice</div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>Las Soleras</span>
                <span data-editable>Montecito ALF</span>
                <span data-editable>Montecito MC</span>
              </div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>Aldea House</span>
                <span data-editable>Beehive Houses</span>
                <span data-editable>Casita Senior Living</span>
              </div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>Sandia View</span>
                <span data-editable>Suvida</span>
                <span data-editable>Compassionate Care</span>
              </div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>Everest ALF</span>
                <span data-editable>Franciscan Friars</span>
                <span data-editable>Hannett House</span>
              </div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>Night &amp; Gail ALF</span>
                <span data-editable>Palmilla Senior Living</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 7:00 PM -->
        <div class="timeline-row" data-time="7:00 PM">
          <div class="time-col">
            <span class="time-chip" data-editable>7:00 PM</span>
          </div>
          <div class="timeline-spine"><div class="spine-dot"></div></div>
          <div class="cards-col">
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>Morada Quintessence</span>
                <span data-editable>Carefree Living</span>
                <span data-editable>Wellesley</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 8:00 PM -->
        <div class="timeline-row" data-time="8:00 PM">
          <div class="time-col">
            <span class="time-chip time-chip-late" data-editable>8:00 PM</span>
          </div>
          <div class="timeline-spine"><div class="spine-dot dot-late"></div></div>
          <div class="cards-col">
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>Advanced HC</span>
                <span data-editable>Betty Dare Wellness</span>
                <span data-editable>Casa Arena</span>
                <span data-editable>Northrise</span>
              </div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>Casa Maria</span>
                <span data-editable>Coronado</span>
                <span data-editable>Gallup</span>
                <span data-editable>Spanish Trails</span>
              </div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>La Vida Buena</span>
                <span data-editable>Las Cruces V/W</span>
                <span data-editable>Los Alamos SNF/ALF</span>
                <span data-editable>Farmington</span>
              </div>
            </div>
            <div class="card card-default" data-card>
              <div class="card-list" data-list>
                <span data-editable>NMVA</span>
                <span data-editable>Paloma</span>
                <span data-editable>Sunset Villa</span>
                <span data-editable>San Juan</span>
              </div>
            </div>
            <div class="card card-skilled" data-card>
              <div class="card-tag tag-skilled" data-editable>All Skilled Facilities</div>
            </div>
          </div>
        </div>

        <!-- Add slot row -->
        <div class="add-slot-row edit-only">
          <button id="addSlotBtn" class="ghost-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Time Slot
          </button>
        </div>

      </div><!-- /timeline -->
    </section>

    <!-- ── RIGHT: Quick Reference ── -->
    <aside class="ref-section" id="refSection" aria-label="Quick reference">
      <div class="ref-resize-handle" id="refResizeHandle" title="Drag to resize"></div>
      <div class="ref-title-row">
        <h2 class="ref-title">Quick Reference</h2>
        <div class="ref-size-ctrl" id="refSizeCtrl">
          <span class="ref-size-label">Text</span>
          <button class="ref-size-btn" id="refSizeDown" title="Decrease text size">−</button>
          <span class="ref-size-display" id="refSizeDisplay">13px</span>
          <button class="ref-size-btn" id="refSizeUp" title="Increase text size">+</button>
          <button class="ref-size-btn ref-sort-btn" id="refSortBtn" title="Sort A–Z">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><polyline points="3 6 4 5 5 6"/><polyline points="3 10 5 10 5 18 3 18"/></svg>
            A–Z
          </button>
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
        <tbody id="refBody">
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Advanced HC</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>1 PM, 8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Advantage Homes</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>M/W/F 11:30 AM · T/Th 1:30 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Aldea House</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>6 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Beehive Homes</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>6 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Bernalillo YSC</span><span class="ref-type" data-editable contenteditable="true">CORR</span></td><td class="ref-td-times"><span class="ref-times" data-editable>1 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Betty Dare Wellness</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>1 PM, 8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Carefree Living</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>M/W/F 11:30 AM · T/Th 1:30 PM · 7 PM Daily</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Casa Arena</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>1 PM, 8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Casa Maria</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Casita Senior Living</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times ref-note" data-editable>6 PM · Georgia &amp; Academy</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Compassionate Care</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>6 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Coronado</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Everest ALF</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>6 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Farmington</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Franciscan Friars</span><span class="ref-type" data-editable contenteditable="true">CUST</span></td><td class="ref-td-times"><span class="ref-times" data-editable>6 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Gallup</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>1 PM, 8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Great Living</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>M/W/F 11:30 AM · T/Th 1:30 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Hannett House</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>6 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Haven Care</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>M/W/F 11:30 AM · T/Th 1:30 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Hospice</span><span class="ref-type" data-editable contenteditable="true">HOSP</span></td><td class="ref-td-times"><span class="ref-times" data-editable>11:30 AM, 6 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>La Vida Buena</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>1 PM, 8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Las Cruces V/W</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>1 PM, 8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Las Soleras</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>6 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Los Alamos SNF/ALF</span><span class="ref-type" data-editable contenteditable="true">SNF/ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>1 PM, 8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Montecito ALF/MC</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>6 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Morada Quintessence</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>7 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Night &amp; Gail ALF</span><span class="ref-type" data-editable contenteditable="true"></span></td><td class="ref-td-times"><span class="ref-times" data-editable>6 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>NMVA</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>1 PM, 8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Northrise</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>1 PM, 8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Palmilla Senior Living</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>6 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Paloma</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>1 PM, 8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>San Juan</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Sandia View</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>6 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Spanish Trails</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>11:30 AM, 8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Sunset Villa</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>8 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Suvida</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>6 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Turning Point</span><span class="ref-type" data-editable contenteditable="true">CUST</span></td><td class="ref-td-times"><span class="ref-times ref-pickup" data-editable>Pickup @ 2 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Vanguard Behavioral</span><span class="ref-type" data-editable contenteditable="true">SNF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>1 PM</span></td></tr>
          <tr data-ref-row><td class="ref-td-name"><span class="ref-name" data-editable>Wellesley</span><span class="ref-type" data-editable contenteditable="true">ALF</span></td><td class="ref-td-times"><span class="ref-times" data-editable>M/W/F 11:30 AM · T/Th 1:30 PM · 7 PM Daily</span></td></tr>
        </tbody>
      </table>
      <div class="edit-only add-ref-row">
        <button id="addRefBtn" class="ghost-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Facility
        </button>
      </div>
    </aside>

  </main>

  <!-- ═══════════════════════════════════════════════════════════
       ROUTE PRINT MODAL (Feature 6)
  ═══════════════════════════════════════════════════════════ -->
  <div id="routePrintOverlay" class="builder-overlay" hidden></div>
  <div id="routePrintModal" class="builder-modal route-print-modal" role="dialog" aria-modal="true" aria-label="Print by Route" hidden>
    <div class="builder-header">
      <div class="builder-title">Print by Route</div>
      <button id="routePrintClose" class="icon-btn" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <p class="builder-hint">Select a route to print only the cards tagged with it.</p>
    <ul id="routePrintList" class="route-print-list"></ul>
  </div>

  <script src="app.js?v=30l"></script>
<script data-pplx-inline-edit>
(function () {
  if (window === window.top) return;

  const allowedParentOrigins = ["https://www.perplexity.ai","https://perplexity.ai","https://testing.perplexity.ai","https://staging.perplexity.ai","https://*.preview.i.perplexity.ai","http://perplexity.localhost","http://localhost:1420","http://127.0.0.1:1420","http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173","http://127.0.0.1:5173"];
  const MAX_FONT_BYTES = 500 * 1024;
  const MAX_TOTAL_FONT_BYTES = 2 * 1024 * 1024;
  let scrollForwarding = false;
  let scrollRaf = 0;
  let trustedTopOrigin = null;

  // Allow entries like "https://*.preview.i.perplexity.ai" — the wildcard
  // matches a single DNS label (no dots), so "https://*.foo" cannot stretch
  // across multiple labels.
  function matchesAllowedOrigin(origin) {
    if (!origin) return false;
    for (const entry of allowedParentOrigins) {
      if (!entry.includes("*")) {
        if (entry === origin) return true;
        continue;
      }
      const pattern = new RegExp(
        "^" +
          entry.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^.]+") +
          "$",
      );
      if (pattern.test(origin)) return true;
    }
    return false;
  }

  // Trust decision: when the sender is same-origin-visible (event.origin is a
  // real origin like https://www.perplexity.ai) we trust event.origin directly.
  // When event.origin is "null" (opaque broker srcdoc), we fall back to the
  // broker's stamped `parentOrigin` to identify the top window. The fallback
  // is claim-only — we rely on the browser's native `targetOrigin` enforcement
  // on the response path (see postToTrustedTop) to ensure replies can't be
  // delivered to anyone but the actual top window of that claimed origin.
  function getTrustedParentOrigin(event) {
    const forwardedParentOrigin =
      typeof event.data.parentOrigin === "string" ? event.data.parentOrigin : null;
    const parentOrigin = event.origin === "null" ? forwardedParentOrigin : event.origin;
    return matchesAllowedOrigin(parentOrigin) ? parentOrigin : null;
  }

  // All responses go to window.top with targetOrigin = the allowlisted origin.
  // An attacker that iframes us inside their own null-origin broker can claim
  // any parentOrigin they like, but the browser will drop the reply whenever
  // the real top's origin doesn't match — so the screenshot never leaves.
  function postToTrustedTop(message) {
    if (!trustedTopOrigin) return;
    try {
      window.top.postMessage(message, trustedTopOrigin);
    } catch (_error) {}
  }

  function inlineAll(original, clone) {
    if (original.nodeType !== 1 || clone.nodeType !== 1) return;

    try {
      const computedStyle = getComputedStyle(original);
      // cssText on a computed style is the serialized declaration in modern
      // Chromium/Safari — a single read beats enumerating ~400 longhand
      // properties. Firefox returns "" here, so we fall back on empty.
      const serialized = computedStyle.cssText;
      if (serialized) {
        clone.style.cssText = serialized;
      } else {
        const parts = new Array(computedStyle.length);
        for (let index = 0; index < computedStyle.length; index += 1) {
          const property = computedStyle[index];
          parts[index] = `${property}:${computedStyle.getPropertyValue(property)};`;
        }
        clone.style.cssText = parts.join("");
      }
    } catch (_error) {}

    const originalChildren = original.children;
    const clonedChildren = clone.children;
    for (
      let index = 0;
      index < originalChildren.length && index < clonedChildren.length;
      index += 1
    ) {
      inlineAll(originalChildren[index], clonedChildren[index]);
    }
  }

  function extractFontUrl(srcValue) {
    const matches = [
      ...srcValue.matchAll(
        /url\(["']?([^"')]+)["']?\)(?:\s*format\(["']?([^"')]+)["']?\))?/gi,
      ),
    ];
    if (matches.length === 0) return null;
    const woff2 = matches.find((m) => m[2] && m[2].toLowerCase().includes("woff2"));
    if (woff2) return woff2[1];
    const woff = matches.find((m) => m[2] && m[2].toLowerCase().includes("woff"));
    if (woff) return woff[1];
    return matches[0][1];
  }

  // Cache resolved font URL -> data URI across captures. Fonts on a page
  // essentially never change, and a batch run emits multiple captures back to
  // back — without this we'd refetch + re-base64 every time.
  const fontDataUriCache = new Map();
  const SRC_DECLARATION_RE = /src\s*:\s*[^;}]+/i;

  async function fetchAsDataUri(url) {
    if (fontDataUriCache.has(url)) return fontDataUriCache.get(url);
    let dataUri = null;
    try {
      const response = await fetch(url, { mode: "cors", credentials: "omit" });
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size <= MAX_FONT_BYTES) {
          dataUri = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () =>
              resolve(typeof reader.result === "string" ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        }
      }
    } catch (_error) {
      dataUri = null;
    }
    fontDataUriCache.set(url, dataUri);
    return dataUri;
  }

  function collectFontFaceRuleTexts() {
    const rules = [];
    for (const sheet of document.styleSheets) {
      let cssRules;
      try {
        cssRules = sheet.cssRules;
      } catch (_error) {
        continue;
      }
      if (!cssRules) continue;
      for (const rule of cssRules) {
        const cssText = rule.cssText || "";
        if (cssText.startsWith("@font-face")) rules.push(cssText);
      }
    }
    return rules;
  }

  async function buildInlinedFontCss() {
    const ruleTexts = collectFontFaceRuleTexts();
    if (ruleTexts.length === 0) return null;

    const resolved = ruleTexts.map((cssText) => {
      if (!SRC_DECLARATION_RE.test(cssText)) return null;
      const srcMatch = cssText.match(/src\s*:\s*([^;}]+)[;}]/i);
      if (!srcMatch) return null;
      const url = extractFontUrl(srcMatch[1]);
      if (!url) return null;
      try {
        return { cssText, url: new URL(url, document.baseURI).href };
      } catch (_error) {
        return null;
      }
    });

    const dataUris = await Promise.all(
      resolved.map((entry) => (entry ? fetchAsDataUri(entry.url) : Promise.resolve(null))),
    );

    const inlined = [];
    let totalBytes = 0;
    for (let index = 0; index < resolved.length; index += 1) {
      const entry = resolved[index];
      const dataUri = dataUris[index];
      if (!entry || !dataUri) continue;
      const approxBytes = dataUri.length * 0.75;
      if (totalBytes + approxBytes > MAX_TOTAL_FONT_BYTES) break;
      totalBytes += approxBytes;
      inlined.push(entry.cssText.replace(SRC_DECLARATION_RE, `src: url("${dataUri}")`));
    }
    return inlined.length > 0 ? inlined.join("\n") : null;
  }

  function stripExternal(clone) {
    const images = clone.querySelectorAll("img");
    for (let index = 0; index < images.length; index += 1) {
      const src = images[index].getAttribute("src");
      if (src && !src.startsWith("data:")) images[index].removeAttribute("src");
    }

    const elements = clone.querySelectorAll("*");
    for (let index = 0; index < elements.length; index += 1) {
      const style = elements[index].style.cssText;
      if (style && style.includes("url(")) {
        elements[index].style.cssText = style.replace(
          /url\(["']?(?!data:)[^)"']*["']?\)/gi,
          "none",
        );
      }
    }
  }

  function emitScroll() {
    scrollRaf = 0;
    if (!scrollForwarding) return;
    postToTrustedTop({
      type: "INLINE_EDIT_SCROLL",
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    });
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!scrollForwarding || scrollRaf) return;
      scrollRaf = requestAnimationFrame(emitScroll);
    },
    { passive: true, capture: true },
  );

  async function handleCaptureRequest(event) {
    const requestId = event.data.requestId;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const width = window.innerWidth;
    const height = window.innerHeight;

    function postResult(dataUrl) {
      postToTrustedTop({
        type: "INLINE_EDIT_SCREENSHOT_RESULT",
        requestId,
        dataUrl,
        scrollX,
        scrollY,
      });
    }

    try {
      // Wait for any pending web fonts to resolve so both inline metrics and
      // the @font-face inlining below see the same loaded faces.
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (_error) {}
      }

      const clone = document.documentElement.cloneNode(true);
      inlineAll(document.documentElement, clone);

      const removedNodes = clone.querySelectorAll("script,link[rel=\"stylesheet\"],style");
      for (let index = 0; index < removedNodes.length; index += 1) {
        removedNodes[index].remove();
      }

      stripExternal(clone);

      // Re-embed web fonts as data-URI @font-face rules so the SVG rasterizer
      // can resolve them — external font URLs aren't fetched during
      // foreignObject rendering, which would otherwise force a fallback face
      // and change text metrics.
      const inlinedFontCss = await buildInlinedFontCss();
      if (inlinedFontCss) {
        const styleEl = document.createElement("style");
        styleEl.textContent = inlinedFontCss;
        const head = clone.querySelector("head");
        if (head) head.appendChild(styleEl);
        else clone.insertBefore(styleEl, clone.firstChild);
      }

      const html = new XMLSerializer().serializeToString(clone);
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
        '<foreignObject width="100%" height="100%">' +
        `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden">` +
        `<div style="position:relative;left:-${scrollX}px;top:-${scrollY}px">` +
        html +
        "</div></div></foreignObject></svg>";
      const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      const image = new Image();
      image.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(image, 0, 0);
        postResult(canvas.toDataURL("image/png"));
      };
      image.onerror = function () {
        postResult(null);
      };
      image.src = svgUrl;
    } catch (_error) {
      postResult(null);
    }
  }

  window.addEventListener("message", function (event) {
    if (!event.data) return;
    // Only accept messages from the direct parent frame. Blocks sibling /
    // unrelated-window postMessage senders that could otherwise reach us.
    if (event.source !== window.parent) return;

    const trustedParentOrigin = getTrustedParentOrigin(event);
    if (!trustedParentOrigin) return;
    trustedTopOrigin = trustedParentOrigin;

    if (event.data.type === "INLINE_EDIT_SCROLL_START") {
      scrollForwarding = true;
      emitScroll();
      return;
    }

    if (event.data.type === "INLINE_EDIT_SCROLL_STOP") {
      scrollForwarding = false;
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      scrollRaf = 0;
      return;
    }

    if (event.data.type !== "INLINE_EDIT_CAPTURE_REQUEST") return;

    handleCaptureRequest(event);
  });
})();


</script></body>
</html>
