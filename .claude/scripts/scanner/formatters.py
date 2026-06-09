"""
Report formatting — converts aggregated findings into markdown report
and TODO sections.
"""

import json
from collections import defaultdict


def _effort_tag(count, file_count):
    """Return [S], [M], or [L] effort tag."""
    if file_count >= 20 or count >= 50:
        return "[L]"
    if file_count >= 5 or count >= 15:
        return "[M]"
    return "[S]"


def _files_str(files_list, unique_file_count):
    """Format file names with +N notation."""
    names = [f["file_short"] for f in files_list[:3]]
    result = ", ".join(names)
    if unique_file_count > 3:
        result += f", +{unique_file_count - 3}"
    return result


def _format_spacing_report(findings, stats):
    """Format spacing category into report + TODO markdown."""
    rule31 = sorted(
        [f for f in findings if f["rule"] == "3.1"],
        key=lambda x: -x["count"],
    )
    total_raw = stats["findings_total"]
    total_files = len(set(
        fi["file"] for f in rule31 for fi in f.get("files", [])
    ))

    # Report section
    lines = [
        f"## Spacing -- {total_raw} findings across {total_files} files",
        "",
        "All findings are **Critical** severity (rule 3.1: hardcoded px in spacing properties).",
        "",
        "| Value | Property | Token | Alt | Count | Files |",
        "|-------|----------|-------|-----|-------|-------|",
    ]
    for f in rule31:
        val = f.get("raw_value", "?")
        prop = f.get("css_property", "--")
        token = f.get("matched_token")
        alts = f.get("alt_tokens", [])
        count = f.get("count", 1)
        ufc = f.get("unique_file_count", 0)
        token_str = f"`{token}`" if token else "no matching token"
        alt_str = f"`{alts[0]}`" if alts else "--"
        fstr = _files_str(f.get("files", []), ufc)
        lines.append(f"| {val} | {prop} | {token_str} | {alt_str} | {count} | {fstr} |")

    # TODO section — group by property category
    PADDING_PROPS = {"padding", "padding-top", "padding-right", "padding-bottom", "padding-left"}
    GAP_PROPS = {"gap", "row-gap", "column-gap"}

    padding_items = [f for f in rule31 if f.get("css_property") in PADDING_PROPS]
    gap_items = [f for f in rule31 if f.get("css_property") in GAP_PROPS]
    margin_items = [f for f in rule31 if f.get("css_property") not in PADDING_PROPS and f.get("css_property") not in GAP_PROPS]

    todo_lines = ["## Token Replacements -- Spacing", ""]

    def _emit_group(title, items):
        if not items:
            return
        todo_lines.append(f"### {title}")
        todo_lines.append("")
        for f in items:
            val = f.get("raw_value", "?")
            prop = f.get("css_property", "spacing")
            token = f.get("matched_token")
            count = f.get("count", 1)
            ufc = f.get("unique_file_count", 0)
            tag = _effort_tag(count, ufc)
            if token:
                todo_lines.append(
                    f"- [ ] {tag} **Replace `{val}` {prop} with "
                    f"`var({token}, {val})`** -- "
                    f"{count} occurrences across {ufc} files"
                )
            else:
                todo_lines.append(
                    f"- [ ] {tag} **Audit hardcoded `{val}` {prop} "
                    f"(no matching token)** -- "
                    f"{count} occurrences across {ufc} files. "
                    f"Define project custom property or find closest token."
                )
        todo_lines.append("")

    _emit_group("Padding replacements", padding_items)
    _emit_group("Gap replacements", gap_items)
    _emit_group("Margin / position replacements", margin_items)

    # Count effort tags
    all_items = padding_items + gap_items + margin_items
    s = sum(1 for f in all_items if _effort_tag(f["count"], f.get("unique_file_count", 0)) == "[S]")
    m = sum(1 for f in all_items if _effort_tag(f["count"], f.get("unique_file_count", 0)) == "[M]")
    l_count = sum(1 for f in all_items if _effort_tag(f["count"], f.get("unique_file_count", 0)) == "[L]")

    return {
        "report": "\n".join(lines),
        "todo": "\n".join(todo_lines),
        "summary": f"Spacing: {len(rule31)} aggregated findings ({total_raw} raw, all Critical) across {total_files} files. TODO: {len(all_items)} tasks ({s}S, {m}M, {l_count}L)",
    }


def _format_colors_report(findings, stats):
    """Format colors category into report + TODO markdown."""
    color_findings = sorted(
        [f for f in findings if f["rule"] in ("3.2", "3.13")],
        key=lambda x: -x["count"],
    )
    total_raw = stats["findings_total"]
    total_files = len(set(
        fi["file"] for f in color_findings for fi in f.get("files", [])
    ))

    lines = [
        f"## Colors -- {total_raw} findings across {total_files} files",
        "",
        "| Value | Property | Token | Candidates | Count | Files |",
        "|-------|----------|-------|------------|-------|-------|",
    ]
    for f in color_findings:
        val = f.get("raw_value", "?")
        token = f.get("matched_token")
        count = f.get("count", 1)
        ufc = f.get("unique_file_count", 0)
        prop = f.get("css_property", f.get("color_category", ""))
        candidates = f.get("candidates", [])
        token_str = f"`{token}`" if token else "no matching token"
        cand_str = ", ".join(f"`{c}`" for c in candidates) if candidates else "-"
        fstr = _files_str(f.get("files", []), ufc)
        lines.append(f"| {val} | {prop} | {token_str} | {cand_str} | {count} | {fstr} |")

    todo_lines = ["## Token Replacements -- Colors", ""]
    for f in color_findings:
        val = f.get("raw_value", "?")
        token = f.get("matched_token")
        count = f.get("count", 1)
        ufc = f.get("unique_file_count", 0)
        tag = _effort_tag(count, ufc)
        prop = f.get("css_property", f.get("color_category", ""))
        candidates = f.get("candidates", [])
        prop_hint = f" (in `{prop}`)" if prop else ""
        if token:
            cand_note = ""
            if len(candidates) > 1:
                others = [c for c in candidates if c != token]
                cand_note = f" -- also consider: {', '.join(f'`{c}`' for c in others)}"
            todo_lines.append(
                f"- [ ] {tag} **Replace `{val}` with `var({token}, {val})`**{prop_hint} "
                f"-- {count} occurrences across {ufc} files{cand_note}"
            )
        else:
            todo_lines.append(
                f"- [ ] {tag} **Audit hardcoded color `{val}` (no matching token)**{prop_hint} "
                f"-- {count} occurrences across {ufc} files"
            )
    todo_lines.append("")

    return {
        "report": "\n".join(lines),
        "todo": "\n".join(todo_lines),
        "summary": f"Colors: {len(color_findings)} aggregated findings ({total_raw} raw) across {total_files} files",
    }


def _format_typography_report(findings, stats):
    """Format typography category into report + TODO markdown."""
    typo_findings = sorted(
        [f for f in findings if f["rule"] == "3.3"],
        key=lambda x: -x["count"],
    )
    total_raw = stats["findings_total"]
    total_files = len(set(
        fi["file"] for f in typo_findings for fi in f.get("files", [])
    ))

    lines = [
        f"## Typography -- {total_raw} findings across {total_files} files",
        "",
        "| Value | Property | Token | Count | Files |",
        "|-------|----------|-------|-------|-------|",
    ]
    for f in typo_findings:
        val = f.get("raw_value", "?")
        prop = f.get("property", "--")
        token = f.get("matched_token")
        count = f.get("count", 1)
        ufc = f.get("unique_file_count", 0)
        token_str = f"`{token}`" if token else "no matching token"
        fstr = _files_str(f.get("files", []), ufc)
        lines.append(f"| {val} | {prop} | {token_str} | {count} | {fstr} |")

    todo_lines = ["## Token Replacements -- Typography", ""]
    for f in typo_findings:
        val = f.get("raw_value", "?")
        prop = f.get("property", "typography")
        token = f.get("matched_token")
        count = f.get("count", 1)
        ufc = f.get("unique_file_count", 0)
        tag = _effort_tag(count, ufc)
        if token:
            todo_lines.append(
                f"- [ ] {tag} **Replace `{val}` {prop} with "
                f"`var({token}, {val})`** -- "
                f"{count} occurrences across {ufc} files"
            )
        else:
            todo_lines.append(
                f"- [ ] {tag} **Audit hardcoded `{val}` {prop} (no matching token)** "
                f"-- {count} occurrences across {ufc} files"
            )
    todo_lines.append("")

    return {
        "report": "\n".join(lines),
        "todo": "\n".join(todo_lines),
        "summary": f"Typography: {len(typo_findings)} aggregated findings ({total_raw} raw) across {total_files} files",
    }


def _format_layout_report(findings, stats):
    """Format layout category into report + TODO markdown."""
    hardcoded = sorted(
        [f for f in findings if f["rule"] in ("3.4", "3.5")],
        key=lambda x: -x.get("count", 1),
    )
    structural = [f for f in findings if f["rule"] in ("3.17", "3.18")]
    total_raw = stats["findings_total"]

    lines = [f"## Layout -- {total_raw} findings", ""]
    if hardcoded:
        lines.extend([
            "### Hardcoded Values",
            "",
            "| Value | Rule | Token | Count | Files |",
            "|-------|------|-------|-------|-------|",
        ])
        for f in hardcoded:
            val = f.get("raw_value", "?")
            rule = f["rule_name"]
            token = f.get("matched_token")
            count = f.get("count", 1)
            ufc = f.get("unique_file_count", 0)
            token_str = f"`{token}`" if token else "no matching token"
            fstr = _files_str(f.get("files", []), ufc)
            lines.append(f"| {val} | {rule} | {token_str} | {count} | {fstr} |")
    if structural:
        lines.extend(["", "### Structural Issues", ""])
        for f in structural:
            rule = f["rule_name"]
            snippet = f.get("snippet", "")
            fp = f.get("file_short", "")
            lines.append(f"- **{rule}** in {fp}: {snippet}")

    todo_lines = ["## Layout Fixes", ""]
    for f in hardcoded:
        val = f.get("raw_value", "?")
        token = f.get("matched_token")
        count = f.get("count", 1)
        ufc = f.get("unique_file_count", 0)
        tag = _effort_tag(count, ufc)
        if token:
            todo_lines.append(
                f"- [ ] {tag} **Replace `{val}` with `var({token}, {val})`** "
                f"-- {count} occurrences across {ufc} files"
            )
        else:
            todo_lines.append(
                f"- [ ] {tag} **Audit hardcoded `{val}` (no matching token)** "
                f"-- {count} occurrences across {ufc} files"
            )
    for f in structural:
        fp = f.get("file_short", "")
        todo_lines.append(f"- [ ] [S] **Fix {f['rule_name']} in {fp}** -- {f.get('suggestion', '')}")
    todo_lines.append("")

    return {
        "report": "\n".join(lines),
        "todo": "\n".join(todo_lines),
        "summary": f"Layout: {len(findings)} findings ({total_raw} raw)",
    }


def _format_tokens_report(findings, stats):
    """Format tokens category into report + TODO markdown."""
    nonexist = sorted(
        [f for f in findings if f["rule"] == "3.7"],
        key=lambda x: -x.get("count", 1),
    )
    nofallback = sorted(
        [f for f in findings if f["rule"] == "3.6"],
        key=lambda x: -x.get("count", 1),
    )
    total_raw = stats["findings_total"]

    lines = [f"## Token Issues -- {total_raw} findings", ""]
    if nonexist:
        lines.extend([
            "### Non-Existent Tokens", "",
            "| Wrong Token | Candidates | Count | Files |",
            "|-------------|------------|-------|-------|",
        ])
        for f in nonexist:
            token = f.get("token_used", "?")
            cands = f.get("candidates", [])
            cand_str = ", ".join(f"`{c}`" for c in cands) if cands else "--"
            count = f.get("count", 1)
            ufc = f.get("unique_file_count", 0)
            fstr = _files_str(f.get("files", []), ufc)
            lines.append(f"| `{token}` | {cand_str} | {count} | {fstr} |")
    if nofallback:
        lines.extend([
            "", "### Missing Fallbacks", "",
            "| Token | Resolved Value | Count | Files |",
            "|-------|---------------|-------|-------|",
        ])
        for f in nofallback:
            token = f.get("token_used", "?")
            resolved = f.get("token_value", "--")
            count = f.get("count", 1)
            ufc = f.get("unique_file_count", 0)
            fstr = _files_str(f.get("files", []), ufc)
            lines.append(f"| `{token}` | {resolved} | {count} | {fstr} |")

    todo_lines = ["## Token Fixes", ""]
    for f in nonexist:
        token = f.get("token_used", "?")
        cands = f.get("candidates", [])
        count = f.get("count", 1)
        ufc = f.get("unique_file_count", 0)
        tag = _effort_tag(count, ufc)
        if cands:
            todo_lines.append(
                f"- [ ] {tag} **Rename `{token}` -> `{cands[0]}`** "
                f"-- {count} occurrences across {ufc} files"
            )
        else:
            todo_lines.append(
                f"- [ ] {tag} **Fix non-existent token `{token}`** "
                f"-- {count} occurrences across {ufc} files"
            )
    for f in nofallback:
        token = f.get("token_used", "?")
        resolved = f.get("token_value", "")
        count = f.get("count", 1)
        ufc = f.get("unique_file_count", 0)
        tag = _effort_tag(count, ufc)
        fallback = f", {resolved}" if resolved else ""
        todo_lines.append(
            f"- [ ] {tag} **Add fallback to `var({token}{fallback})`** "
            f"-- {count} occurrences across {ufc} files"
        )
    todo_lines.append("")

    return {
        "report": "\n".join(lines),
        "todo": "\n".join(todo_lines),
        "summary": f"Tokens: {len(nonexist)} non-existent, {len(nofallback)} missing fallbacks ({total_raw} raw)",
    }


def _format_quality_report(findings, stats):
    """Format quality category into report + TODO markdown."""
    total_raw = stats["findings_total"]
    by_rule = defaultdict(list)
    for f in findings:
        by_rule[f["rule_name"]].append(f)

    lines = [
        f"## Code Quality -- {total_raw} findings",
        "",
        "| Rule | Issue | Count | Top Files |",
        "|------|-------|-------|-----------|"]
    for rule_name, items in by_rule.items():
        total_count = sum(i.get("count", 1) for i in items)
        top_files = ", ".join(set(i.get("file_short", "") for i in items[:3]))
        lines.append(f"| {rule_name} | {items[0]['rule']} | {total_count} | {top_files} |")

    todo_lines = ["## Code Quality Fixes", ""]
    for rule_name, items in by_rule.items():
        total_count = sum(i.get("count", 1) for i in items)
        file_count = len(set(i.get("file_short", "") for i in items))
        tag = _effort_tag(total_count, file_count)
        sug = items[0].get("suggestion", "")
        todo_lines.append(f"- [ ] {tag} **Fix {rule_name}** -- {total_count} occurrences. {sug}")
    todo_lines.append("")

    return {
        "report": "\n".join(lines),
        "todo": "\n".join(todo_lines),
        "summary": f"Quality: {len(by_rule)} rule types ({total_raw} raw findings)",
    }


def _format_crossfile_report(findings, cross, stats):
    """Format cross-file category into report + TODO markdown."""
    lines = ["## Cross-File Patterns", ""]
    todo_lines = ["## Cross-File Consolidation", ""]

    dupes = cross.get("duplicated_patterns", [])
    if dupes:
        lines.extend([
            "### Duplicated Property Patterns", "",
            "| Properties | Occurrences | Files | Suggestion |",
            "|-----------|------------|-------|------------|",
        ])
        for d in dupes:
            fingerprint = d.get("fingerprint", "?")
            # Show as comma-separated property list
            props_display = ", ".join(fingerprint.split("+")) if fingerprint != "?" else "?"
            occ = d.get("occurrences", 0)
            file_count = d.get("file_count", 0)
            file_entries = d.get("files", [])
            file_names = _files_str(file_entries, file_count)
            lines.append(f"| {props_display} | {occ} across {file_count} files | {file_names} | Extract to shared class |")
            tag = _effort_tag(occ, file_count)
            # Build location list for TODO
            location_lines = []
            for entry in file_entries:
                fn = entry.get("file_short", entry.get("file", "?"))
                sel = entry.get("selector", "")
                ls = entry.get("line_start", "")
                le = entry.get("line_end", "")
                loc = f"  - `{fn}` L{ls}-{le}"
                if sel:
                    loc += f" (`{sel}`)"
                location_lines.append(loc)
            todo_lines.append(
                f"- [ ] {tag} **Extract duplicated `{props_display}` pattern** "
                f"-- {occ} occurrences across {file_count} files"
            )
            todo_lines.extend(location_lines)

    # Group global class redefinitions by class name
    raw_redefs = cross.get("global_class_redefinitions", [])
    global_redefs_grouped = {}
    for g in raw_redefs:
        cls = g.get("global_class", "?")
        if cls not in global_redefs_grouped:
            global_redefs_grouped[cls] = {"files": set(), "entries": []}
        global_redefs_grouped[cls]["files"].add(g.get("file", ""))
        global_redefs_grouped[cls]["entries"].append(g)
    global_redefs = list(global_redefs_grouped.items())
    if global_redefs:
        lines.extend(["", "### Global Class Redefinitions", ""])
        for cls, data in global_redefs:
            count = len(data["files"])
            display_cls = cls if cls.startswith(".") else f".{cls}"
            lines.append(f"- `{display_cls}` redefined in {count} components")
            todo_lines.append(f"- [ ] [M] **Consolidate `{display_cls}` overrides** -- {count} components")

    repeated = cross.get("repeated_library_overrides", [])
    if repeated:
        lines.extend(["", "### Repeated Library Overrides (identical properties)", ""])
        for r in repeated:
            target = r.get("target_selector", "?")
            count = r.get("file_count", 0)
            props = r.get("properties", [])
            file_entries = r.get("files", [])
            props_str = ", ".join(props) if props else "(unknown)"
            file_names = _files_str(file_entries, count)
            lines.append(f"- `{target}` ({props_str}) -- identical in {count} files: {file_names}")
            # Build location list for TODO
            location_lines = []
            for entry in file_entries:
                fn = entry.get("file_short", entry.get("file", "?"))
                ln = entry.get("line", "")
                location_lines.append(f"  - `{fn}` L{ln}")
            todo_lines.append(
                f"- [ ] [M] **Move `{target}` override to global partial** "
                f"-- identical override ({props_str}) in {count} files"
            )
            todo_lines.extend(location_lines)

    magic = cross.get("magic_numbers", [])
    if magic:
        lines.extend(["", "### Magic Numbers", ""])
        for mn in magic:
            val = mn.get("value", "?")
            cat = mn.get("category", "")
            occ = mn.get("occurrences", 0)
            file_count = mn.get("file_count", 0)
            lines.append(f"- `{val}` ({cat}) -- {occ} occurrences across {file_count} files")
            todo_lines.append(
                f"- [ ] [M] **Define custom property for magic number `{val}`** "
                f"-- used in {file_count} files as {cat}"
            )

    todo_lines.append("")

    return {
        "report": "\n".join(lines),
        "todo": "\n".join(todo_lines),
        "summary": f"Cross-file: {len(dupes)} duplicated patterns, {len(global_redefs)} global redefs, {len(repeated)} repeated overrides, {len(magic)} magic numbers",
    }


def format_report(category, findings, cross, stats, token_map,
                  files_scanned, total_lines):
    """Format scanner output as markdown-ready report.

    Output is a JSON object with keys:
      - report: markdown for design-audit-report.md
      - todo: markdown for design-audit-todo.md
      - summary: one-line progress summary for chat
      - stats: severity counts and totals
    """
    formatters = {
        "spacing": lambda: _format_spacing_report(findings, stats),
        "colors": lambda: _format_colors_report(findings, stats),
        "typography": lambda: _format_typography_report(findings, stats),
        "layout": lambda: _format_layout_report(findings, stats),
        "tokens": lambda: _format_tokens_report(findings, stats),
        "quality": lambda: _format_quality_report(findings, stats),
        "cross-file": lambda: _format_crossfile_report(findings, cross, stats),
    }

    formatter = formatters.get(category)
    if formatter:
        result = formatter()
    else:
        result = {
            "report": f"## {category} -- no formatter available",
            "todo": "",
            "summary": f"{category}: no formatter",
        }

    result["stats"] = stats["severity_counts"]
    result["findings_total"] = stats["findings_total"]
    result["files_scanned"] = files_scanned
    result["total_lines"] = total_lines

    return json.dumps(result, indent=2)
