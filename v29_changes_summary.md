# Delivery Schedule App — v29 Feature Build Summary

Files modified in place:
- `/home/user/workspace/delivery-flowchart/index.html` (609 → 655 lines)
- `/home/user/workspace/delivery-flowchart/app.js` (2882 → 3586 lines)
- `/home/user/workspace/delivery-flowchart/style.css` (1966 → 2208 lines)

Version bumped: `v28d` → `v29` (app.js header comment + `index.html` script tag `app.js?v=29`). Also bumped `style.css?v=27` → `style.css?v=29` since substantial new CSS was appended (not required by the rules but done for cache-busting consistency).

All existing features were left intact — every change was additive (new HTML elements, new CSS rules appended at the bottom, new JS wrapped in dedicated IIFEs at the bottom of the file, plus small targeted insertions into `initCard`, `initRow`, `initFacility`, `_reinjectEditOnlyUI`, `STRIP_SEL`, `saveNow`, and the schedule builder's `getBuilderData`/`buildTimelineFromData` region).

## Features implemented

**1. Search / Highlight bar** — `#searchWrap` with `#schedSearch` input, `#searchCount`, `#searchClearBtn`, placed between the Edit button and Builder/Changelog buttons in the header. Live `input` listener highlights matching facility/label/sub text with `.search-highlight` (`#fef08a`), scrolls first match into view, shows "N / M" counts, clears on Escape or the × button. Exposed as `window._rerunSearch()` so it can be re-applied after DOM replacement (import, undo, schedule switch).

**2. Multiple named schedules** — New `#scheduleSelect` dropdown + `#schedNewNameBtn` (+) + `#schedDeleteBtn` (×), edit-mode only, next to the header. Schedules are stored under `localStorage['deliveryScheduleLib_v1']` as `{ schedules: { name: snapshot }, active: name }`. On first load, the existing `deliverySchedule_v1` save is migrated into the library as `"Default"`. Switching schedules confirms first, then replays the same restore flow used by Import (strip edit UI → replace `printArea` → `restoreHeader` → `_reinjectEditOnlyUI` → `initAll`). The active schedule name is shown as a badge (`#activeSchedBadge`) next to the subtitle. Auto-save now also syncs the active schedule's snapshot back into the library via `window._syncActiveScheduleSnapshot()`.

**3. Facility autocomplete in the Builder** — Collects all `.ref-name` text from `#refBody` whenever the Builder opens (also exposed as `window._refreshFacAutocomplete()` for re-collection after data changes). Listens on `input` across all `.bt-fac-input` textareas, matches against the last line being typed, and shows a floating `.bt-autocomplete` dropdown positioned under the textarea. Clicking a suggestion replaces the last line and appends a newline.

**4. Duplicate Card / Duplicate Row** — Added a "⧉ Dup" button to the `.card-list-toolbar` in both `initCard()` and `initFreeBoardCard()` (after the existing "Auto H" button), and a `.dup-row-btn` that appears on `.timeline-row` hover in edit mode (next to insert-above/below). Both call global helpers `window._duplicateCard()` / `window._duplicateRow()`, which `cloneNode(true)`, `stripEditUI()` the clone, reset `_init` flags, re-run `initCard`/`initRow`, insert after the original, and snapshot.

**5. Quick Reference export** — Two new buttons in the export dropdown: `#expRefPrintBtn` ("Print Ref Sheet") opens a new window with a clean two-column HTML table built from `#refBody` rows and auto-triggers `window.print()`; `#expRefCsvBtn` ("Download Ref CSV") builds a `"Facility","Delivery Time(s)"` CSV from the same rows and triggers a Blob download.

**6. Route-filtered print** — `#expRoutePrintBtn` ("Print by Route") opens a small modal (`#routePrintModal`/`#routePrintOverlay`) listing every unique route tag (color + name) found via `.card-tag` classes across all cards. Selecting one opens a new window containing only the timeline rows/cards carrying that route tag, grouped by time, with the route name as a header, then calls `window.print()`.

**7. Cutoff countdown clock** — Parses the offset (in hours) from `#cutoffText` (defaults to 2 if unparsable). For every `.time-chip` in view mode, injects a `.cutoff-countdown` span showing "Cutoff in Xh Ym" or "CUTOFF PASSED" (styled red). Recomputed every 60 seconds via `setInterval`, started as `window._startCountdownClock()` and re-triggered from `_reinjectEditOnlyUI()` so it survives import/undo/schedule-switch. Hidden in edit mode via `.edit-mode .cutoff-countdown { display: none; }`.

**8. Facility status flags** — Every facility span now gets a `data-status="active|onhold|inactive"` attribute (defaulting to `active`) and a colored `.status-dot` (green/orange/grey) inside `.fac-item`. Right-click (via `contextmenu`, edit-mode only) opens a `.status-menu` with "Set Active / On Hold / Inactive". On-hold facilities render with `opacity:0.5` + strikethrough; inactive facilities are hidden (`display:none`) and additionally force-hidden with `!important` inside the print media query.

**Bonus (per follow-up instruction): Builder → Quick Reference auto-population** — The Schedule Builder's "Generate Timeline" button now also rebuilds `#refBody` from the same builder rows: for every facility name across all rows, times are collected into a `Set`, multiple times for the same facility are joined with " · ", rows are sorted alphabetically (case-insensitive) by facility name, and `initAll()` is called afterward so new ref rows get drag handles and edit wiring. "New Schedule" already clears `refBody` as part of rebuilding a blank `printArea` skeleton, so no extra change was needed there.

## Implementation notes / architecture choices

- New ephemeral/injected elements (`.dup-row-btn`, `.status-menu`, `.cutoff-countdown`, `.bt-autocomplete`) were added to `STRIP_SEL` so they don't get baked into snapshots/backups and duplicate on re-init.
- `.status-dot` was deliberately **not** added to `STRIP_SEL` since it's a persistent visual indicator tied to `data-status`, regenerated correctly by `initFacility()` on every re-init anyway.
- `_reinjectEditOnlyUI()` now also calls `window._rerunSearch()`, `window._refreshFacAutocomplete()`, `window._startCountdownClock()`, and `window._applyAllFacStatuses()` at the end, per the task's guidance that features needing to survive import/undo should hook in there.
- Each feature is delimited with a clear `FEATURE N — ...` block comment and wrapped in its own IIFE at the bottom of `app.js`, except for the small in-place edits required inside `initCard`, `initRow`, `initFacility`, `STRIP_SEL`, `saveNow`, and the Schedule Builder's generate handler, which the task explicitly required to be touched directly.

## Follow-up additions (requested after initial 8-feature build)

**A. Builder auto-populates Quick Reference table** — Clicking "Generate Timeline" now also rebuilds `#refBody` from the same builder rows: facility names across all rows are collected into a map, times for repeated facility names are merged with " · " separators, entries are sorted alphabetically (case-insensitive), and `initAll()` re-wires drag handles/edit bindings on the new rows. "New Schedule" already clears `refBody` as part of rebuilding a blank `printArea` skeleton, so no extra change was needed there.

**B. Builder Time column upgraded to a combo box** — The plain time text input was replaced with `.bt-time-wrap` containing a `.bt-time-select` (blank/custom placeholder + 30-minute presets from 6:00 AM–10:00 PM, each option labeled with its military-time equivalent e.g. "6:00 AM (0600)", plus a trailing "Custom..." option) and a `.bt-time-custom` text input that's hidden unless "Custom..." is selected. A `normalizeTime(str)` function handles blur-time formatting for the custom field, supporting:
  - `am/pm` suffixed input (`1pm`, `130pm`, `8a`) → `H:MM AM/PM`
  - Military/digit-only input (`1300`, `0630`, `2000`, `2400`/`0000`) → correctly converted 12-hour form
  - Bare short digit strings with no am/pm marker: 3-digit ambiguous hours 1–7 (e.g. `130`) default to **PM** (pharmacy deliveries skew afternoon); `800`/`8` still default to AM per the original spec example.
  `getBuilderData()` reads the select's value directly unless it's `"custom"`, in which case it re-normalizes and reads the custom input. `addBuilderRow(data)` matches `data.time` against the preset list to pre-select the dropdown, or falls back to "Custom..." with the raw value shown in the text field.

**C. Route Name as a colored card-label option** — Added `{ val: 'route-label', label: 'Route Name (colored tag)' }` to `TAG_PRESETS` in the builder's Card Label/Tag column. Selecting it reveals both the existing custom-text input (repurposed as the route-name text) and a new `.bt-select`-styled route-color dropdown (reusing `ROUTE_COLORS`). In `buildTimelineFromData()`, `route-label` rows render their `card-tag` using the chosen route color class (`tag-route-<color>`) and the typed name as the **primary/first tag** on the card, and the separate Route Tag column's output is skipped for that card (`isRouteLabel` guard) to avoid a duplicate second colored tag. This lets users set a route name as the prominent top-of-card label instead of filling in both a schedule-type label and a separate route tag.

## Caveats

- JS syntax was verified with `node --check app.js` (passes cleanly) rather than a full browser runtime test — no browser environment was available to click through interactions (search highlighting, autocomplete dropdown positioning, drag/drop, print previews, context menu, countdown ticking) to confirm pixel-level/UX behavior. Logic was traced manually for closures and DOM lifecycle correctness.
- The route-tag detection in Feature 6 matches both literal `tag-route*` classes and the existing named color classes (`tag-red`, `tag-blue`, etc., as seen in `ROUTE_COLORS`/CSS), since the codebase's actual route tag classes follow the `tag-<color>` naming convention rather than `tag-route-<color>` as the task's implementation notes suggested — this was cross-checked against `style.css`'s existing `.tag-route-red/blue/green/...` rules and the builder's `routeWrap`/`tdRoute` code, and the broader regex was used to be robust to either naming.
- Cutoff time parsing assumes standard `H:MM AM/PM` chip text (e.g., "1:00 PM"); chips with non-standard formats (ranges, "ASAP", etc.) simply won't get a countdown span rather than erroring.
- No changes were made to any existing feature's behavior — all diffs are additive except the few explicitly-required in-place insertions listed above.
