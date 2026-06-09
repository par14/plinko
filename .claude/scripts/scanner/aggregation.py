"""
Pre-aggregation, truncation, and statistics computation.
"""

import os
from collections import defaultdict


def compute_stats(findings):
    """Aggregate findings into statistics."""
    severity_counts = {"critical": 0, "warning": 0, "info": 0}
    file_stats = defaultdict(lambda: {"critical": 0, "warning": 0, "info": 0})
    value_freq = defaultdict(lambda: defaultdict(int))

    for f in findings:
        sev = f["severity"]
        severity_counts[sev] += 1
        file_stats[f.get("file_short", "unknown")][sev] += 1

        raw_val = f.get("raw_value")
        if raw_val:
            cat = {
                "3.1": "spacing", "3.2": "color", "3.3": "typography",
                "3.4": "radius", "3.5": "size",
            }.get(f["rule"])
            if cat:
                value_freq[cat][raw_val] += 1

    heatmap = []
    for fn, counts in file_stats.items():
        total = sum(counts.values())
        heatmap.append({
            "file": fn,
            "critical": counts["critical"],
            "warning": counts["warning"],
            "info": counts["info"],
            "total": total,
        })
    heatmap.sort(key=lambda x: -x["total"])

    return {
        "severity_counts": severity_counts,
        "findings_total": len(findings),
        "file_heatmap": heatmap[:15],
        "value_frequencies": {k: dict(v) for k, v in value_freq.items()},
    }


def pre_aggregate(findings, max_files=5, max_per_rule=50):
    """Group high-volume findings by (rule, key_value) for compact output.

    Rules with raw_value (3.1-3.5) are grouped by value.
    Rules with token_used (3.6, 3.7, 3.13) are grouped by token name.
    All other rules are grouped by (rule, file).

    File lists are aggregated per unique file path, sorted by occurrence count,
    and truncated to max_files entries per finding. Each rule keeps only the
    top max_per_rule findings sorted by count.
    """
    VALUE_RULES = {"3.1", "3.2", "3.3", "3.4", "3.5"}
    TOKEN_RULES = {"3.6", "3.7", "3.13"}

    # Bucket for per-rule aggregated results
    rule_buckets = defaultdict(list)
    # Group raw findings
    groups = defaultdict(list)

    def _prop_category(css_prop):
        """Normalize CSS property to a category for grouping."""
        if css_prop and css_prop.startswith("padding"):
            return "padding"
        if css_prop and css_prop in ("gap", "row-gap", "column-gap"):
            return "gap"
        return "spacing"  # margin, top, right, bottom, left, inset

    for f in findings:
        rule = f["rule"]
        if rule in VALUE_RULES:
            # For rule 3.1, include property category so padding/gap/margin
            # get different token suggestions
            if rule == "3.1":
                prop_cat = _prop_category(f.get("css_property"))
            elif rule == "3.2":
                prop_cat = f.get("color_category", "")
            else:
                prop_cat = ""
            key = (rule, f.get("raw_value", ""), prop_cat)
        elif rule in TOKEN_RULES:
            key = (rule, f.get("token_used", ""), "")
        else:
            # Non-aggregatable: group by (rule, file) to reduce volume
            key = (rule, f.get("file", ""), "")
        groups[key].append(f)

    for (rule, key_val, _extra), entries in groups.items():
        first = entries[0]

        if rule in VALUE_RULES or rule in TOKEN_RULES:
            # Aggregate occurrences per file
            file_groups = defaultdict(list)
            for e in entries:
                file_groups[e["file"]].append(e["line"])

            sorted_files = sorted(
                file_groups.items(), key=lambda x: -len(x[1])
            )
            unique_file_count = len(sorted_files)
            truncated_files = [
                {
                    "file": fp,
                    "file_short": os.path.basename(fp).replace(".component.scss", "").replace(".scss", ""),
                    "lines": lines[:3],
                    "count": len(lines),
                }
                for fp, lines in sorted_files[:max_files]
            ]

            agg = {
                "rule": rule,
                "rule_name": first["rule_name"],
                "severity": first["severity"],
                "count": len(entries),
                "unique_file_count": unique_file_count,
                "files": truncated_files,
                "suggestion": first["suggestion"],
            }
            if rule in VALUE_RULES:
                agg["raw_value"] = key_val
                agg["matched_token"] = first.get("matched_token")
                if "alt_tokens" in first:
                    agg["alt_tokens"] = first["alt_tokens"]
                if "css_property" in first:
                    agg["css_property"] = first["css_property"]
                if "color_category" in first:
                    agg["color_category"] = first["color_category"]
                if "candidates" in first:
                    agg["candidates"] = first["candidates"]
                if "property" in first:
                    agg["property"] = first["property"]
            elif rule in TOKEN_RULES:
                agg["token_used"] = key_val
                if "candidates" in first:
                    agg["candidates"] = first["candidates"]
                if "token_value" in first:
                    agg["token_value"] = first["token_value"]
            rule_buckets[rule].append(agg)
        else:
            # Non-value/token rules: emit one entry per file with line list
            agg = {
                "rule": rule,
                "rule_name": first["rule_name"],
                "severity": first["severity"],
                "file": first["file"],
                "file_short": first.get("file_short", ""),
                "count": len(entries),
                "lines": [e["line"] for e in entries[:5]],
                "snippet": first.get("snippet", ""),
                "suggestion": first["suggestion"],
            }
            if "depth" in first:
                agg["max_depth"] = max(e.get("depth", 0) for e in entries)
            rule_buckets[rule].append(agg)

    # Sort each rule bucket by count desc, truncate to max_per_rule
    aggregated = []
    for rule in sorted(rule_buckets.keys()):
        bucket = sorted(rule_buckets[rule], key=lambda x: -x.get("count", 1))
        aggregated.extend(bucket[:max_per_rule])

    return aggregated


def truncate_cross_file(cross, max_patterns=20, max_files_per=5):
    """Truncate cross-file analysis for manageable output size."""
    if not cross:
        return cross

    result = dict(cross)

    # Truncate duplicated_patterns: keep top N by impact
    if result.get("duplicated_patterns"):
        patterns = result["duplicated_patterns"][:max_patterns]
        for p in patterns:
            files = p.get("files", [])
            # Keep properties only on first file entry for reference
            if len(files) > 1:
                for f in files[1:]:
                    f.pop("properties", None)
            if len(files) > max_files_per:
                p["files"] = files[:max_files_per]
                p["truncated"] = True
        result["duplicated_patterns"] = patterns

    # Truncate magic_numbers: keep top 15
    if result.get("magic_numbers"):
        numbers = result["magic_numbers"][:15]
        for n in numbers:
            if len(n.get("files", [])) > max_files_per:
                n["files"] = n["files"][:max_files_per]
                n["truncated"] = True
        result["magic_numbers"] = numbers

    # Truncate repeated_library_overrides: keep top 15
    if result.get("repeated_library_overrides"):
        overrides = result["repeated_library_overrides"][:15]
        for o in overrides:
            if len(o.get("files", [])) > max_files_per:
                o["files"] = o["files"][:max_files_per]
                o["truncated"] = True
        result["repeated_library_overrides"] = overrides

    return result
