"""
Design Audit Scanner -- SRC Design System Compliance

Package entry point. Provides discover_files() and main() CLI orchestrator.
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

from .aggregation import compute_stats, pre_aggregate, truncate_cross_file
from .constants import ALL_PER_FILE_RULES, CATEGORY_RULES, DEFAULT_TOKENS_FILE, DEFAULT_TOKENS_URL
from .cross_file import cross_file_analysis, detect_global_classes
from .formatters import format_report
from .rules import scan_file
from .rules.quality import scan_ts_files
from .tokens import build_token_data, fetch_token_json


def discover_files(src_dir):
    """Find all .scss and .component.ts files under src_dir."""
    scss_files = []
    ts_files = []
    for dirpath, _, filenames in os.walk(src_dir):
        for fn in filenames:
            fp = os.path.join(dirpath, fn)
            if fn.endswith(".scss"):
                scss_files.append(fp)
            elif fn.endswith(".component.ts"):
                ts_files.append(fp)
    return sorted(scss_files), sorted(ts_files)


def main():
    parser = argparse.ArgumentParser(description="Design Audit Scanner")
    parser.add_argument("--mode", choices=["strict", "general"], default="strict")
    parser.add_argument("--focus", choices=["full", "patterns"], default="full")
    parser.add_argument(
        "--category",
        choices=["spacing", "colors", "typography", "layout", "tokens", "quality", "cross-file"],
        default=None,
        help="Run only rules for one category. Omit to run all rules (legacy mode).",
    )
    parser.add_argument("--src-dir", default="src/")
    parser.add_argument("--tokens-url", default=DEFAULT_TOKENS_URL)
    parser.add_argument("--tokens-file", default=DEFAULT_TOKENS_FILE)
    parser.add_argument("--output", choices=["json", "pretty", "report"], default="json")
    args = parser.parse_args()

    src_dir = os.path.abspath(args.src_dir)
    root = os.path.abspath(".")
    global_classes = detect_global_classes(src_dir)

    if not os.path.isdir(src_dir):
        print(f"[error] Source directory not found: {src_dir}", file=sys.stderr)
        sys.exit(1)

    # Compute active rules from category
    if args.category:
        active_rules = CATEGORY_RULES.get(args.category, ALL_PER_FILE_RULES)
        run_cross_file = args.category == "cross-file"
        run_ts_scan = "3.12" in active_rules
    else:
        active_rules = ALL_PER_FILE_RULES
        run_cross_file = True
        run_ts_scan = True

    # Phase 1: Load and parse tokens
    raw_json, tokens_source = fetch_token_json(
        local_path=args.tokens_file, url=args.tokens_url
    )
    tokens_loaded = raw_json is not None
    all_token_names, reverse_maps, resolved_tokens = build_token_data(raw_json)
    print(
        f"[info] Token names: {len(all_token_names)} unique "
        f"(loaded={tokens_loaded}, source={tokens_source})",
        file=sys.stderr,
    )

    # Phase 2: Discover files
    scss_files, ts_files = discover_files(src_dir)
    print(
        f"[info] Found {len(scss_files)} SCSS, {len(ts_files)} TS files",
        file=sys.stderr,
    )

    # Phase 3: Scan files (always runs all per-file rules to collect value_records)
    all_findings = []
    all_value_records = []
    for fp in scss_files:
        ff, vr = scan_file(
            fp, root, all_token_names, reverse_maps, resolved_tokens, args.mode, args.focus
        )
        all_findings.extend(ff)
        all_value_records.extend(vr)

    # Filter findings by active rules
    if args.category and args.category != "cross-file":
        all_findings = [f for f in all_findings if f["rule"] in active_rules]

    # TS file scan (rule 3.12)
    if run_ts_scan:
        ts_findings = scan_ts_files(ts_files, root)
        all_findings.extend(ts_findings)

    # Phase 3B: Cross-file analysis
    cross = {}
    if run_cross_file:
        cross = cross_file_analysis(
            scss_files, root, all_value_records, reverse_maps, global_classes
        )
        if args.category == "cross-file":
            # Discard per-file findings -- only output cross-file results
            all_findings = []

    # Pre-aggregate findings for compact output
    aggregated_findings = pre_aggregate(all_findings)

    # Truncate cross-file data for manageable output
    cross = truncate_cross_file(cross)

    # Statistics (computed from raw findings for accuracy)
    stats = compute_stats(all_findings)

    total_scss_lines = 0
    for fp in scss_files:
        try:
            with open(fp) as f:
                total_scss_lines += sum(1 for _ in f)
        except Exception:
            pass

    # Build token map for the active category
    token_map = {}
    if args.category == "spacing":
        token_map = {
            "spacing": reverse_maps.get("spacing", {}),
            "gap": reverse_maps.get("gap", {}),
            "padding": reverse_maps.get("padding", {}),
        }
    elif args.category == "colors":
        token_map = reverse_maps.get("color", {})
    elif args.category == "typography":
        token_map = {
            **reverse_maps.get("font_size", {}),
            **reverse_maps.get("line_height", {}),
            **reverse_maps.get("letter_spacing", {}),
        }
    elif args.category == "layout":
        token_map = {
            **reverse_maps.get("radius", {}),
            **reverse_maps.get("height", {}),
        }

    output = {
        "meta": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "mode": args.mode,
            "focus": args.focus,
            "category": args.category,
            "src_dir": os.path.relpath(src_dir, root),
            "tokens_source": tokens_source,
            "tokens_loaded": tokens_loaded,
            "token_count": len(all_token_names),
            "files_scanned": len(scss_files),
            "ts_files_scanned": len(ts_files),
            "total_scss_lines": total_scss_lines,
            "global_classes_watched": global_classes,
        },
        "reverse_maps_summary": {
            cat: len(entries) for cat, entries in reverse_maps.items()
        },
        "findings": aggregated_findings,
        "cross_file": cross,
        "stats": stats,
    }

    if token_map:
        output["token_map"] = token_map

    if args.output == "report":
        print(format_report(args.category, aggregated_findings, cross, stats,
                           token_map, len(scss_files), total_scss_lines))
    elif args.output == "pretty":
        print(json.dumps(output, indent=2))
    else:
        print(json.dumps(output, separators=(",", ":")))
