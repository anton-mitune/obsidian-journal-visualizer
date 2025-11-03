
# Design Document

## Overview
This document designs a small, focused feature for the Vault Visualizer plugin: show a contextual statistic in the Backlinks pane counting how many daily notes in the current calendar month link to the currently-open note.

## Architecture

High-level flow:
- On note open / focus or when backlinks view refreshes, query Obsidian for backlinks to the current note.
- Filter backlink sources to files that are inside the configured daily notes folder and whose filenames match YYYY-MM-DD for the current month.
- Compute the number of distinct daily-note files that link to the note (count distinct file paths).
- Update the Backlinks pane UI by inserting a small badge row labeled "Daily notes (this month)" with the count.

Technology & API rationale
- Use Obsidian plugin APIs. No external network or Node modules.
- Keep all logic in small modules (utilities) to make unit testing straightforward.

## Components and Interfaces

1) BacklinkWatcher
- Purpose: detect when to recompute the daily-note backlink count.

2) DailyNoteClassifier
- Purpose: determine whether a given backlink comes from a daily note in the current month.

4) UIInjector
- Purpose: add a new section to the footer of a note before the backlinks section, showing the computed count.
