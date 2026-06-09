#!/usr/bin/env python3
"""
Design Audit Scanner -- SRC Design System Compliance

Thin CLI wrapper. All logic lives in the scanner/ package.

Usage:
    python3 .claude/scripts/design-audit-scanner.py [options]

Options:
    --mode strict|general     Token enforcement mode (default: strict)
    --focus full|patterns     Audit focus (default: full)
    --category CATEGORY       Run only one category: spacing|colors|typography|
                              layout|tokens|quality|cross-file (default: all)
    --src-dir PATH            Root scan directory (default: src/)
    --tokens-file PATH        Local design-tokens.json (default: node_modules)
    --tokens-url URL          Remote fallback if local file is missing
    --output json|pretty      Output format (default: json)

Requires: Python 3.9+, stdlib only (no pip dependencies).
"""

import os
import sys

# Ensure the scripts directory is on the path so the scanner package resolves.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scanner import main

if __name__ == "__main__":
    main()
