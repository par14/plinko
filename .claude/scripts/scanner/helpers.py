"""
Utility functions used across the scanner package.
"""

import math
import os
import re


def short_name(filepath):
    """Return a concise file identifier: 'component-name' or 'filename'."""
    base = os.path.basename(filepath)
    base = base.replace(".component.scss", "").replace(".scss", "")
    return base


def rel_path(filepath, root):
    """Return filepath relative to root directory."""
    return os.path.relpath(filepath, root)


def is_in_var_fallback(line, pos):
    """Check whether *pos* sits inside a var(..., <fallback>) region.

    Returns True if the position is after the comma inside a var() call,
    meaning it's the fallback value (which is intentional, not a violation).
    """
    depth = 0
    i = pos - 1
    while i >= 0:
        ch = line[i]
        if ch == ")":
            depth += 1
        elif ch == "(":
            if depth > 0:
                depth -= 1
            else:
                # Check if this is a var( ... , <fallback> region
                prefix = line[max(0, i - 4) : i + 1]
                if prefix.endswith("var("):
                    # Check if there's a comma between var( and pos
                    inner = line[i + 1 : pos]
                    return "," in inner
                return False
        i -= 1
    return False


def is_in_calc(line, pos):
    """Check whether *pos* sits inside a calc() expression."""
    before = line[:pos].lower()
    # Find last calc( before pos
    idx = before.rfind("calc(")
    if idx < 0:
        return False
    # Check nesting: count parens from calc( to pos
    depth = 0
    for ch in line[idx + 5 : pos]:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth < 0:
                return False
    return True


def normalize_hex(hex_str):
    """Normalize hex color to lowercase 6-char form without alpha."""
    h = hex_str.lower()
    if len(h) == 4:  # #abc -> #aabbcc
        return "#" + h[1] * 2 + h[2] * 2 + h[3] * 2
    if len(h) == 9 and h.endswith("ff"):  # #rrggbbff -> #rrggbb
        return h[:7]
    if len(h) == 9:  # keep 8-char alpha hex as-is
        return h
    return h


def rgb_to_hex(rgb_str):
    """Convert rgb(r,g,b) or rgba(r,g,b,a) to 6-digit hex, or None."""
    m = re.match(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", rgb_str)
    if not m:
        return None
    r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return f"#{r:02x}{g:02x}{b:02x}"


def hsl_to_hex(hsl_str):
    """Convert hsl(h,s%,l%) or hsla(h,s%,l%,a) to 6-digit hex, or None."""
    m = re.match(
        r"hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%", hsl_str
    )
    if not m:
        return None
    h = float(m.group(1)) / 360
    s = float(m.group(2)) / 100
    l_val = float(m.group(3)) / 100

    if s == 0:
        r = g = b = l_val
    else:
        def _hue2rgb(p, q, t):
            if t < 0:
                t += 1
            if t > 1:
                t -= 1
            if t < 1 / 6:
                return p + (q - p) * 6 * t
            if t < 1 / 2:
                return q
            if t < 2 / 3:
                return p + (q - p) * (2 / 3 - t) * 6
            return p

        q = l_val * (1 + s) if l_val < 0.5 else l_val + s - l_val * s
        p = 2 * l_val - q
        r = _hue2rgb(p, q, h + 1 / 3)
        g = _hue2rgb(p, q, h)
        b = _hue2rgb(p, q, h - 1 / 3)

    ri = min(255, max(0, round(r * 255)))
    gi = min(255, max(0, round(g * 255)))
    bi = min(255, max(0, round(b * 255)))
    return f"#{ri:02x}{gi:02x}{bi:02x}"


def get_nesting_depth(lines, line_idx):
    """Count brace nesting depth at line_idx by scanning from file start."""
    depth = 0
    for idx in range(line_idx + 1):
        raw = lines[idx]
        for ch in raw:
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
    return depth
