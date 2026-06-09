"""
Cross-file analysis: duplicated patterns, magic numbers, global class
redefinitions, and repeated library overrides.
"""

import os
import re
from collections import defaultdict

from .helpers import rel_path, short_name

RE_TOP_LEVEL_CLASS = re.compile(r"^(\.[a-zA-Z][\w-]*)\s*[,{\s]")


def detect_global_classes(src_dir):
    """Auto-detect global class names from top-level selectors in src/styles/.

    Skips library selectors (.mat-*, .src-*, .mdc-*) and BEM elements (.__).
    Only returns project-owned block-level classes.
    """
    styles_dir = os.path.join(src_dir, "styles")
    if not os.path.isdir(styles_dir):
        return []
    classes = set()
    for fname in os.listdir(styles_dir):
        if not fname.endswith(".scss"):
            continue
        fpath = os.path.join(styles_dir, fname)
        try:
            with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    m = RE_TOP_LEVEL_CLASS.match(line)
                    if m:
                        cls = m.group(1)
                        # Skip library selectors and BEM elements
                        if cls.startswith((".mat-", ".src-", ".mdc-")):
                            continue
                        if "__" in cls:
                            continue
                        classes.add(cls)
        except Exception:
            continue
    return sorted(classes)


def cross_file_analysis(scss_files, root, all_value_records, reverse_maps, global_classes):
    """Phase 3B: cross-file pattern detection."""
    result = {
        "inconsistencies": [],
        "magic_numbers": [],
        "duplicated_patterns": [],
        "global_class_redefinitions": [],
        "repeated_library_overrides": [],
    }

    # ── 3.16: Magic numbers (3+ files, no SRC token) ──
    val_groups = defaultdict(lambda: defaultdict(list))
    for cat, val, fp, lineno in all_value_records:
        val_groups[cat][val].append({"file": fp, "line": lineno})

    for cat, values in val_groups.items():
        for val, occurrences in values.items():
            unique_files = list(set(o["file"] for o in occurrences))
            if len(unique_files) >= 3:
                has_token = False
                if cat == "spacing":
                    has_token = val in reverse_maps.get("spacing", {})
                elif cat == "typography":
                    has_token = (val in reverse_maps.get("font_size", {}) or
                                 val in reverse_maps.get("line_height", {}))
                elif cat == "radius":
                    has_token = val in reverse_maps.get("radius", {})
                if not has_token:
                    result["magic_numbers"].append({
                        "rule": "3.16", "value": val, "category": cat,
                        "occurrences": len(occurrences),
                        "file_count": len(unique_files),
                        "files": [{"file": o["file"], "line": o["line"]}
                                  for o in occurrences],
                    })

    # ── 3B.4: Global class redefinitions ──
    for fp in scss_files:
        rp = rel_path(fp, root)
        if "/styles/" in fp:
            continue
        try:
            with open(fp, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception:
            continue

        sn = short_name(fp)
        for gc in global_classes:
            pattern = re.escape(gc) + r"\s*\{"
            for m in re.finditer(pattern, content):
                start = m.end()
                depth = 1
                end = start
                while end < len(content) and depth > 0:
                    if content[end] == "{":
                        depth += 1
                    elif content[end] == "}":
                        depth -= 1
                    end += 1
                block = content[start : end - 1]
                props = []
                for block_line in block.split("\n"):
                    stripped = block_line.strip()
                    if (":" in stripped and
                            not stripped.startswith("//") and
                            not stripped.startswith("&") and
                            not stripped.startswith(".")):
                        prop = stripped.split(":")[0].strip()
                        if prop and not prop.startswith("@") and not prop.startswith("$"):
                            props.append(prop)
                if props:
                    line_num = content[: m.start()].count("\n") + 1
                    result["global_class_redefinitions"].append({
                        "global_class": gc,
                        "file": rp, "file_short": sn, "line": line_num,
                        "properties_overridden": props,
                    })

    # ── 3B.5: Repeated library overrides ──
    override_map = defaultdict(list)
    for fp in scss_files:
        rp = rel_path(fp, root)
        if "/styles/" in fp:
            continue
        try:
            with open(fp, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception:
            continue

        sn = short_name(fp)

        def _extract_block_props(text, block_start):
            """Extract property names from a CSS block starting after '{'."""
            depth = 1
            end = block_start
            while end < len(text) and depth > 0:
                if text[end] == "{":
                    depth += 1
                elif text[end] == "}":
                    depth -= 1
                end += 1
            block = text[block_start:end - 1]
            props = set()
            for bl in block.split("\n"):
                s = bl.strip()
                if (":" in s and
                        not s.startswith("//") and
                        not s.startswith("&") and
                        not s.startswith(".")):
                    prop = s.split(":")[0].strip()
                    if prop and not prop.startswith("@") and not prop.startswith("$"):
                        props.add(prop)
            return props

        for m in re.finditer(r"::ng-deep\s+([^\{]+)\{", content):
            selector = re.sub(r"\s+", " ", m.group(1).strip())
            line_num = content[: m.start()].count("\n") + 1
            props = _extract_block_props(content, m.end())
            override_map[f"::ng-deep {selector}"].append({
                "file": rp, "file_short": sn, "line": line_num,
                "properties": sorted(props),
            })

        for m in re.finditer(
            r"(\.(?:mat-mdc-|mdc-|src-|cdk-)[a-zA-Z0-9_-]+)\s*\{", content
        ):
            selector = m.group(1).strip()
            line_num = content[: m.start()].count("\n") + 1
            props = _extract_block_props(content, m.end())
            override_map[selector].append({
                "file": rp, "file_short": sn, "line": line_num,
                "properties": sorted(props),
            })

    for selector, entries in override_map.items():
        unique_files = list(set(e["file"] for e in entries))
        if len(unique_files) < 2:
            continue
        # Group entries by their property set — only flag when the same
        # properties are overridden in multiple files (truly duplicated).
        prop_groups = defaultdict(list)
        for e in entries:
            key = tuple(e.get("properties", []))
            prop_groups[key].append(e)
        for prop_key, group_entries in prop_groups.items():
            group_files = list(set(e["file"] for e in group_entries))
            if len(group_files) >= 2:
                result["repeated_library_overrides"].append({
                    "target_selector": selector,
                    "file_count": len(group_files),
                    "files": group_entries,
                    "properties": list(prop_key),
                })

    # ── 3B.2: Duplicated property patterns ──
    block_patterns = defaultdict(list)
    for fp in scss_files:
        rp = rel_path(fp, root)
        try:
            with open(fp, "r", encoding="utf-8", errors="replace") as f:
                file_lines = f.readlines()
        except Exception:
            continue

        sn = short_name(fp)
        selector_stack = []  # stack of (selector, props, line_start)
        current_selector = ""
        current_props = {}
        line_start = 0

        for idx, raw_line in enumerate(file_lines):
            stripped = raw_line.strip()
            if stripped.startswith("//") or not stripped:
                continue
            if "{" in stripped and ":" not in stripped.split("{")[0]:
                sel = stripped.split("{")[0].strip()
                if sel:
                    # Push current context onto stack before entering nested block
                    if current_selector:
                        selector_stack.append((current_selector, current_props, line_start))
                    current_selector = sel
                    current_props = {}
                    line_start = idx + 1
            if ":" in stripped and "{" not in stripped and "}" not in stripped:
                parts = stripped.split(":", 1)
                prop = parts[0].strip()
                val = parts[1].strip().rstrip(";")
                if (prop and not prop.startswith("@") and
                        not prop.startswith("$") and not prop.startswith("//")):
                    current_props[prop] = val
            if "}" in stripped:
                if current_selector and len(current_props) >= 3:
                    prop_set = frozenset(current_props.keys())
                    block_patterns[prop_set].append({
                        "file": rp, "file_short": sn,
                        "selector": current_selector,
                        "line_start": line_start, "line_end": idx + 1,
                        "properties": dict(current_props),
                    })
                # Pop parent context from stack
                if selector_stack:
                    current_selector, current_props, line_start = selector_stack.pop()
                else:
                    current_selector = ""
                    current_props = {}

    for prop_set, entries in block_patterns.items():
        if len(prop_set) < 3:
            continue
        unique_files = list(set(e["file"] for e in entries))
        if len(unique_files) < 2:
            continue
        result["duplicated_patterns"].append({
            "fingerprint": "+".join(sorted(prop_set)),
            "property_count": len(prop_set),
            "occurrences": len(entries),
            "file_count": len(unique_files),
            "files": entries,
        })

    result["duplicated_patterns"].sort(
        key=lambda p: -(p["file_count"] * p["property_count"])
    )
    result["repeated_library_overrides"].sort(
        key=lambda o: -o["file_count"]
    )
    result["magic_numbers"].sort(key=lambda m: -m["file_count"])

    return result
