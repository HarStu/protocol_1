#!/usr/bin/env python3
"""Inline the fork's CSS/JS into a built index.html, right before </body>.

Kept separate from m.sh on purpose: upstream never touches this file, and
this script never touches header.html/m.sh/the *.md content, so
`git merge upstream/master` stays conflict-free.
"""
import sys
from pathlib import Path

def main():
    root = Path(__file__).resolve().parent.parent
    index_path = root / "index.html"
    css_path = Path(__file__).parent / "sidebar.css"
    js_path = Path(__file__).parent / "sidebar.js"

    html = index_path.read_text(encoding="utf-8")
    if "</body>" not in html:
        sys.exit("fork/inject.py: no </body> found in index.html; did ./m.sh run first?")

    # upstream's header.html has no <meta charset>, so encoding is left to
    # guesswork by whatever serves the file (fine on GitHub Pages, wrong for
    # a plain local static server). declaring it explicitly is safe and
    # doesn't require touching header.html.
    if "charset=" not in html.split("</head>", 1)[0].lower():
        html = html.replace("<head>", '<head>\n<meta charset="utf-8">', 1)

    fragment = (
        "\n<style>\n" + css_path.read_text(encoding="utf-8") + "\n</style>\n"
        "<script>\n" + js_path.read_text(encoding="utf-8") + "\n</script>\n"
    )

    # there's exactly one </body>, at the very end of the document (from footer.md)
    html = html.replace("</body>", fragment + "</body>", 1)
    index_path.write_text(html, encoding="utf-8")
    print("fork/inject.py: injected sidebar CSS/JS into index.html")

if __name__ == "__main__":
    main()
