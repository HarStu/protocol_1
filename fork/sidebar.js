// fork features: sidebar nav, favorites, read-tracking, reading list, color palettes.
// self-contained, injected after the pandoc-built content; never edits header.html
// so `git merge upstream/master` stays conflict-free on this file.
(function () {
    "use strict";

    var STORAGE_KEY = "protocol1_fork_state_v1";
    var PALETTE_KEY = "protocol1_fork_palette_v1";

    var PALETTES = {
        default: null,
        sepia: {
            light: { bg: "#f4ecd8", text: "#3b2f2f", link: "#8b5e34", linkVisited: "#5c3d1f" },
            dark: { bg: "#2b2420", text: "#e8dcc8", link: "#d9a066", linkVisited: "#b97d4b" }
        },
        slate: {
            light: { bg: "#eef1f5", text: "#1f2933", link: "#2b6cb0", linkVisited: "#1a4971" },
            dark: { bg: "#16202b", text: "#dbe4ee", link: "#6fa8dc", linkVisited: "#9cc4ee" }
        },
        forest: {
            light: { bg: "#eef3ea", text: "#223121", link: "#2f6b3a", linkVisited: "#1f4d28" },
            dark: { bg: "#16211a", text: "#d9e8d6", link: "#79c07a", linkVisited: "#a3d9a5" }
        },
        rose: {
            light: { bg: "#fbeef0", text: "#3a2029", link: "#b1466f", linkVisited: "#7a2f4d" },
            dark: { bg: "#241016", text: "#f0d9df", link: "#e28ba8", linkVisited: "#f2add0" }
        }
    };

    function loadState() {
        try {
            var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (parsed && typeof parsed === "object") {
                parsed.read = parsed.read || {};
                parsed.favorites = parsed.favorites || {};
                parsed.readingList = parsed.readingList || [];
                return parsed;
            }
        } catch (e) { /* fall through to default */ }
        return { read: {}, favorites: {}, readingList: [] };
    }

    var state = loadState();
    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function collectHeadings() {
        var nodes = document.querySelectorAll("h1, h2, h3");
        var items = [];
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (el.closest("#fork-sidebar")) continue;
            var anchor = el.querySelector("a[id]");
            var span = el.querySelector("span[id]");
            var id = (anchor && anchor.id) || (span && span.id) || null;
            var text = el.textContent.replace(/\s+/g, " ").trim();
            if (!text) continue;
            var key = id || ("pos-" + i + "-" + text.slice(0, 40));
            items.push({ el: el, level: el.tagName.toLowerCase(), text: text, id: id, key: key });
        }
        return items;
    }

    var headings = collectHeadings();
    var headingByKey = {};
    headings.forEach(function (h) { headingByKey[h.key] = h; });

    // ---- build DOM ----
    var backdrop = document.createElement("div");
    backdrop.id = "fork-sidebar-backdrop";
    document.body.appendChild(backdrop);

    var sidebar = document.createElement("div");
    sidebar.id = "fork-sidebar";
    sidebar.innerHTML =
        '<div id="fork-sidebar-header"><strong>Sections</strong>' +
        '<button id="fork-sidebar-close" aria-label="Close">×</button></div>' +
        '<div id="fork-sidebar-disclaimer">This is a fan-made quality-of-life fork, not the ' +
        'original document. <a href="https://meditationbook.page/" target="_blank" rel="noopener">' +
        "See the original here.</a></div>" +
        '<input id="fork-sidebar-search" type="search" placeholder="Filter sections…">' +
        '<div id="fork-sidebar-tabs">' +
        '<button data-tab="all" class="active">All</button>' +
        '<button data-tab="favorites">★ Favorites</button>' +
        '<button data-tab="reading">Reading List</button>' +
        "</div>" +
        '<div id="fork-sidebar-progress"></div>' +
        '<div id="fork-palette-picker"><span>Theme:</span>' +
        '<button class="fork-swatch fork-swatch-default" data-palette="default" title="Default"></button>' +
        '<button class="fork-swatch fork-swatch-sepia" data-palette="sepia" title="Sepia"></button>' +
        '<button class="fork-swatch fork-swatch-slate" data-palette="slate" title="Slate"></button>' +
        '<button class="fork-swatch fork-swatch-forest" data-palette="forest" title="Forest"></button>' +
        '<button class="fork-swatch fork-swatch-rose" data-palette="rose" title="Rose"></button>' +
        "</div>" +
        '<ul id="fork-toc-list"></ul>';
    document.body.appendChild(sidebar);

    var toggleBtn = document.createElement("button");
    toggleBtn.id = "fork-sidebar-toggle";
    toggleBtn.textContent = "☰ Sections";
    document.body.appendChild(toggleBtn);

    function openSidebar() { sidebar.classList.add("fork-open"); }
    function closeSidebar() { sidebar.classList.remove("fork-open"); }
    toggleBtn.onclick = openSidebar;
    document.getElementById("fork-sidebar-close").onclick = closeSidebar;
    backdrop.onclick = closeSidebar;
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeSidebar();
    });

    // ---- list rendering ----
    var currentTab = "all";
    var searchQuery = "";

    function matchesSearch(item) {
        if (!searchQuery) return true;
        return item.text.toLowerCase().indexOf(searchQuery) !== -1;
    }

    function visibleItems() {
        var list = headings;
        if (currentTab === "favorites") {
            list = list.filter(function (i) { return !!state.favorites[i.key]; });
        } else if (currentTab === "reading") {
            list = state.readingList.map(function (k) { return headingByKey[k]; }).filter(Boolean);
        }
        return list.filter(matchesSearch);
    }

    function renderRow(item) {
        var li = document.createElement("li");
        li.className = "fork-toc-item fork-level-" + item.level;
        li.dataset.key = item.key;

        var favBtn = document.createElement("button");
        favBtn.className = "fork-fav-btn";
        favBtn.title = "Toggle favorite";
        favBtn.textContent = state.favorites[item.key] ? "★" : "☆";
        favBtn.onclick = function (e) { e.stopPropagation(); toggleFavorite(item.key); };

        var readBtn = document.createElement("button");
        readBtn.className = "fork-read-btn";
        readBtn.title = "Toggle read";
        readBtn.textContent = state.read[item.key] ? "✓" : "○";
        readBtn.onclick = function (e) { e.stopPropagation(); toggleRead(item.key); };

        var inList = state.readingList.indexOf(item.key) !== -1;
        var listBtn = document.createElement("button");
        listBtn.className = "fork-list-btn";
        listBtn.title = inList ? "Remove from reading list" : "Add to reading list";
        listBtn.textContent = inList ? "−" : "+";
        listBtn.onclick = function (e) { e.stopPropagation(); toggleReadingList(item.key); };

        var link = document.createElement("a");
        link.className = "fork-toc-link";
        link.href = item.id ? ("#" + item.id) : "#";
        link.textContent = item.text;
        link.onclick = function (e) {
            if (!item.id) {
                e.preventDefault();
                item.el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            if (window.innerWidth < 700) closeSidebar();
        };

        li.appendChild(favBtn);
        li.appendChild(readBtn);
        li.appendChild(listBtn);
        li.appendChild(link);
        return li;
    }

    function rerender() {
        var ul = document.getElementById("fork-toc-list");
        ul.innerHTML = "";
        var items = visibleItems();
        if (!items.length) {
            var note = document.createElement("div");
            note.className = "fork-empty-note";
            note.textContent = currentTab === "reading"
                ? "Your reading list is empty. Add sections with the + button."
                : currentTab === "favorites"
                    ? "No favorites yet. Star a section to add it here."
                    : "No sections match your filter.";
            ul.appendChild(note);
        } else {
            var frag = document.createDocumentFragment();
            items.forEach(function (item) { frag.appendChild(renderRow(item)); });
            ul.appendChild(frag);
        }
        updateProgress();
    }

    function updateProgress() {
        var total = headings.length;
        var read = headings.filter(function (h) { return !!state.read[h.key]; }).length;
        document.getElementById("fork-sidebar-progress").textContent = read + " / " + total + " sections read";
    }

    function toggleFavorite(key) {
        if (state.favorites[key]) delete state.favorites[key]; else state.favorites[key] = true;
        saveState();
        rerender();
    }
    function toggleRead(key) {
        if (state.read[key]) delete state.read[key]; else state.read[key] = true;
        saveState();
        rerender();
    }
    function toggleReadingList(key) {
        var idx = state.readingList.indexOf(key);
        if (idx !== -1) state.readingList.splice(idx, 1); else state.readingList.push(key);
        saveState();
        rerender();
    }
    var tabButtons = sidebar.querySelectorAll("#fork-sidebar-tabs button");
    tabButtons.forEach(function (btn) {
        btn.onclick = function () {
            currentTab = btn.dataset.tab;
            tabButtons.forEach(function (b) { b.classList.toggle("active", b === btn); });
            rerender();
        };
    });

    document.getElementById("fork-sidebar-search").addEventListener("input", function (e) {
        searchQuery = e.target.value.trim().toLowerCase();
        rerender();
    });

    rerender();

    // ---- scroll tracking: highlight current section only (read-tracking is manual, via the ✓ button) ----
    function findRow(key) {
        var rows = document.getElementById("fork-toc-list").children;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].dataset && rows[i].dataset.key === key) return rows[i];
        }
        return null;
    }

    var lastCurrentKey = null;
    if ("IntersectionObserver" in window && headings.length) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var item = headings.find(function (h) { return h.el === entry.target; });
                if (!item || lastCurrentKey === item.key) return;

                var prevRow = lastCurrentKey && findRow(lastCurrentKey);
                if (prevRow) prevRow.classList.remove("fork-current");
                lastCurrentKey = item.key;
                var row = findRow(item.key);
                if (row) row.classList.add("fork-current");
            });
        }, { rootMargin: "0px 0px -75% 0px", threshold: 0 });

        headings.forEach(function (h) { observer.observe(h.el); });
    }

    // ---- color palettes (layered on top of header.html's existing light/dark toggle) ----
    function isDarkNow() {
        if (typeof window.isDark === "function") return window.isDark();
        return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    function applyPalette() {
        var name = localStorage.getItem(PALETTE_KEY) || "default";
        var root = document.documentElement;
        var pal = PALETTES[name];
        if (!pal) {
            root.style.removeProperty("--bg");
            root.style.removeProperty("--text");
            root.style.removeProperty("--link");
            root.style.removeProperty("--link-visited");
        } else {
            var vars = pal[isDarkNow() ? "dark" : "light"];
            root.style.setProperty("--bg", vars.bg);
            root.style.setProperty("--text", vars.text);
            root.style.setProperty("--link", vars.link);
            root.style.setProperty("--link-visited", vars.linkVisited);
        }
        sidebar.querySelectorAll(".fork-swatch").forEach(function (btn) {
            btn.classList.toggle("active", btn.dataset.palette === name);
        });
    }

    sidebar.querySelectorAll(".fork-swatch").forEach(function (btn) {
        btn.onclick = function () {
            localStorage.setItem(PALETTE_KEY, btn.dataset.palette);
            applyPalette();
        };
    });

    applyPalette();

    var darkToggleBtn = document.getElementById("darkmode");
    if (darkToggleBtn) darkToggleBtn.addEventListener("click", function () { setTimeout(applyPalette, 0); });
    if (window.matchMedia) {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
            setTimeout(applyPalette, 0);
        });
    }
})();
