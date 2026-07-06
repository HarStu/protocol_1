https://meditationbook.page/

## This fork (HarStu/protocol_1)

Upstream is one very long static HTML page built from the `*.md` sources via
`./m.sh` (pandoc) + `header.html`/`footer.md`. This fork layers reader tooling
on top, without changing any upstream-authored file:

- a sidebar (☰ Sections, top center) listing every heading in the document
- ☆ favorite a section, ✓ mark it read (auto-marks as you scroll past it too),
  + add it to a reading list (with a shortcut to bulk-add unread favorites)
- a search box to filter the sidebar, and All / Favorites / Reading List tabs
- 5 color palettes (Default, Sepia, Slate, Forest, Rose), each with its own
  light/dark variant, layered on top of the existing dark-mode toggle

All state (favorites/read/reading list/palette) is stored in the browser via
`localStorage` — nothing server-side, consistent with the "single static
page, no external resources" design of the original site.

### How it's built

- `fork/sidebar.css` + `fork/sidebar.js` — all of the new functionality,
  self-contained.
- `fork/inject.py` — inlines those two files into the `index.html` produced
  by upstream's `./m.sh`, right before `</body>`. It also adds a
  `<meta charset="utf-8">` tag if one isn't already present (upstream's
  `header.html` doesn't declare one, which is invisible on GitHub Pages but
  garbles non-ASCII characters when served without that header some other
  way, e.g. a plain local static file server).
- `fork_build.sh` — runs `./m.sh` unmodified, then `fork/inject.py`. Use this
  instead of `./m.sh` directly to get a build with the fork's features.

Nothing in this fork edits `header.html`, `m.sh`, `d.sh`, or any `*.md`
source file — the build is entirely additive/post-processing. That's
deliberate: it means pulling in upstream's changes should almost never
conflict with this fork's changes.

### Pulling in upstream changes

```
git fetch upstream
git merge upstream/master
./fork_build.sh   # regenerate index.html with the fork's features on top
```

`upstream` points at `meditationstuff/protocol_1`; `origin` is this fork.
