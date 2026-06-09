"""
Per-file scanning orchestrator.

Reads an SCSS file, strips comments, and delegates to individual rule
modules for line-by-line checks.
"""

from ..helpers import rel_path, short_name
from . import colors, layout, quality, spacing, tokens_check, typography


def scan_file(filepath, root, all_token_names, reverse_maps, resolved_tokens, mode, focus):
    """Scan a single SCSS file and return findings."""
    findings = []
    skip_token_rules = focus == "patterns"
    skip_color_rules = mode == "general"

    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except Exception:
        return findings, []

    rp = rel_path(filepath, root)
    sn = short_name(filepath)
    in_comment = False
    value_records = []

    # ── File-level checks ──
    findings.extend(layout.check_file(lines, rp, sn))

    for i, raw_line in enumerate(lines, 1):
        line = raw_line.strip()

        # Handle block comments that started on a previous line
        if in_comment:
            close_pos = line.find("*/")
            if close_pos >= 0:
                in_comment = False
                line = line[close_pos + 2:].strip()
                if not line:
                    continue
            else:
                continue

        # Strip inline block comments: /* ... */ within a single line
        while "/*" in line:
            open_pos = line.find("/*")
            close_pos = line.find("*/", open_pos + 2)
            if close_pos >= 0:
                line = (line[:open_pos] + line[close_pos + 2:]).strip()
            else:
                line = line[:open_pos].strip()
                in_comment = True
                break

        if line.startswith("//") or not line:
            continue

        # ── Quality rules (3.8, 3.9, 3.10, 3.11, 3.14) ──
        findings.extend(quality.check_line(line, i, rp, sn))

        # ── Rule 3.13: Primitive color tokens ──
        if not skip_color_rules:
            findings.extend(colors.check_primitive(line, i, rp, sn))

        # ── Token-dependent rules (skip in patterns-only focus) ──
        if not skip_token_rules:

            # ── Rule 3.6: Missing var() fallbacks ──
            findings.extend(
                tokens_check.check_missing_fallback(
                    line, i, rp, sn, all_token_names, resolved_tokens
                )
            )

            # ── Rule 3.7: Non-existent token names ──
            if not skip_color_rules:
                findings.extend(
                    tokens_check.check_nonexistent(
                        line, i, rp, sn, all_token_names
                    )
                )

            # ── Rule 3.1: Hardcoded spacing ──
            f, v = spacing.check_line(line, i, rp, sn, reverse_maps)
            findings.extend(f)
            value_records.extend(v)

            # ── Rule 3.2: Hardcoded colors ──
            if not skip_color_rules:
                f, v = colors.check_line(line, i, rp, sn, reverse_maps)
                findings.extend(f)
                value_records.extend(v)

            # ── Rule 3.3: Hardcoded typography ──
            f, v = typography.check_line(line, i, rp, sn, reverse_maps)
            findings.extend(f)
            value_records.extend(v)

            # ── Rule 3.4: Hardcoded border-radius ──
            f, v = layout.check_radius(line, i, rp, sn, reverse_maps)
            findings.extend(f)
            value_records.extend(v)

        # ── Rule 3.18: Deep nesting ──
        findings.extend(layout.check_nesting(line, i, lines, rp, sn))

    return findings, value_records
