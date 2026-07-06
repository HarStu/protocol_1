#!/bin/bash

# build index.html with this fork's features (sidebar nav, favorites,
# read-tracking, reading list, color palettes) layered on top of the
# unmodified upstream build.
#
# run as so:
# ./fork_build.sh
#
# this deliberately calls the upstream ./m.sh unmodified, then injects
# fork/sidebar.css + fork/sidebar.js as a post-processing step. that way
# nothing under upstream's control (header.html, m.sh, the *.md sources)
# is ever edited by this fork, so `git merge upstream/master` stays
# conflict-free. see README.md for the merge workflow.

set -e

./m.sh
python3 fork/inject.py
