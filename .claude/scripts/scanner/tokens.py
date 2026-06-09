"""
Token loading, var-chain resolution, and reverse-map building.
"""

import json
import re
import sys
import urllib.request
from collections import defaultdict

from .helpers import normalize_hex


def fetch_token_json(local_path=None, url=None):
    """Load design-tokens.json -- local file first, URL as fallback.

    Returns (data, source) where source is "local", "url", or None.
    """
    # Try local file first (faster, no network dependency)
    if local_path:
        try:
            with open(local_path) as f:
                raw = json.load(f)
            print(f"[info] Loaded tokens from local file: {local_path}", file=sys.stderr)
            return raw, "local"
        except Exception as e:
            print(f"[warn] Could not read local tokens file: {e}", file=sys.stderr)

    # Fall back to URL
    if url:
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": "design-audit-scanner/1.0"}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = json.loads(resp.read().decode("utf-8"))
            print(f"[info] Loaded tokens from URL: {url}", file=sys.stderr)
            return raw, "url"
        except Exception as e:
            print(f"[warn] Could not fetch tokens from URL: {e}", file=sys.stderr)

    return None, None


def resolve_var_chain(value, lookup, depth=0):
    """Resolve var(--token) chains to a final raw value (px or hex)."""
    if depth > 10:
        return value
    m = re.match(r"var\((--[a-zA-Z0-9_-]+)", value)
    if m:
        ref = m.group(1)
        if ref in lookup:
            return resolve_var_chain(lookup[ref], lookup, depth + 1)
    return value


def build_token_data(raw_json):
    """
    Parse design-tokens.json and build:
      - all_token_names: set of every --src-* name (for existence checks)
      - reverse_maps: dict of category -> {raw_value: [token_name, ...]}
        Built dynamically from the JSON groups.
    """
    if raw_json is None:
        return set(), {}, {}

    # Step 1: collect tokens by group category
    groups_by_cat = defaultdict(dict)
    for group in raw_json.get("groups", []):
        cat = group["category"]
        for token in group["tokens"]:
            groups_by_cat[cat][token["name"]] = token["value"]

    # Step 2: all unique token names (for rule 3.7 existence check)
    all_names = set()
    for tokens in groups_by_cat.values():
        all_names.update(tokens.keys())

    # Step 3: build a flat lookup for resolving var() chains
    # Priority: primitives first, then light-theme colors, then default scopes
    flat = {}
    # Primitives always go first (they have raw px/hex values)
    flat.update(groups_by_cat.get("primitives", {}))
    # Light theme colors (semantic tokens referencing primitives)
    flat.update(groups_by_cat.get("color-light", {}))
    # Typeface tokens
    flat.update(groups_by_cat.get("typeface", {}))
    # UI default scope (ui-md is global)
    flat.update(groups_by_cat.get("ui-md", {}))
    # Layout default scope (layout-lg is 1440px+, the common desktop breakpoint)
    flat.update(groups_by_cat.get("layout-lg", {}))

    # Step 4: resolve every token to its final raw value
    resolved = {}
    for name in flat:
        resolved[name] = resolve_var_chain(flat[name], flat)

    # Step 5: build reverse maps (raw_value -> list of token names)
    # Categorize tokens by their name prefix
    spacing_map = {}      # px -> token  (--src-space-*)
    font_size_map = {}    # px -> token  (--src-font-size-*)
    line_height_map = {}  # px -> token  (--src-font-line-*)
    letter_spacing_map = {}  # px -> token (--src-font-spacing-*)
    radius_map = {}       # px -> token  (--src-border-rounded-*, --src-layout-radius-*)
    height_map = {}       # px -> token  (--src-height-*, --src-layout-height-*)
    gap_map = {}          # px -> token  (--src-gap-*, --src-layout-gap-*)
    padding_map = {}      # px -> token  (--src-padding-*, --src-layout-padding-*)
    color_map = {}        # hex -> token (semantic and primitive colors)
    font_weight_map = {}  # weight -> token (--src-font-weight-*)

    # Property-scoped color maps: hex -> [list of tokens]
    color_text_map = {}      # --src-text-*
    color_surface_map = {}   # --src-surface-*, --src-ui-*
    color_border_map = {}    # --src-border-* (not border-rounded)
    color_icon_map = {}      # --src-icon-*, --src-graphics-*
    color_shadow_map = {}    # --src-shadow-*, --src-gradient-*
    color_primitive_map = {} # --src-color-* only (fallback when no scoped match)

    for name, val in resolved.items():
        val_lower = val.lower().strip()

        # Spacing tokens: --src-space-*
        if name.startswith("--src-space-") and val_lower.endswith("px"):
            spacing_map[val_lower] = name

        # Font size tokens: --src-font-size-*
        elif name.startswith("--src-font-size-") and val_lower.endswith("px"):
            font_size_map[val_lower] = name

        # Line height tokens: --src-font-line-*
        elif name.startswith("--src-font-line-") and val_lower.endswith("px"):
            line_height_map[val_lower] = name

        # Letter spacing tokens: --src-font-spacing-*
        elif name.startswith("--src-font-spacing-") and val_lower.endswith("px"):
            letter_spacing_map[val_lower] = name

        # Border radius tokens (component + layout)
        elif (name.startswith("--src-border-rounded") or
              name.startswith("--src-layout-radius")):
            # Skip -var- layout tokens (they change per breakpoint)
            if name.startswith("--src-layout-") and "-var-" in name:
                continue
            if val_lower.endswith("px"):
                existing = radius_map.get(val_lower)
                # Prefer semantic (--src-border-rounded) over layout
                if not existing or name.startswith("--src-border-rounded"):
                    radius_map[val_lower] = name
                elif not existing:
                    radius_map[val_lower] = name

        # Height tokens
        elif (name.startswith("--src-height-") or
              name.startswith("--src-layout-height-")):
            # Skip -var- layout tokens (they change per breakpoint)
            if name.startswith("--src-layout-") and "-var-" in name:
                continue
            if val_lower.endswith("px"):
                existing = height_map.get(val_lower)
                # Prefer semantic (--src-height-) over layout
                if not existing or name.startswith("--src-height-"):
                    height_map[val_lower] = name
                elif not existing:
                    height_map[val_lower] = name

        # Gap tokens
        elif (name.startswith("--src-gap-") or
              name.startswith("--src-layout-gap-")):
            # Skip -var- layout tokens (they change per breakpoint)
            if name.startswith("--src-layout-") and "-var-" in name:
                continue
            if val_lower.endswith("px"):
                existing = gap_map.get(val_lower)
                if not existing:
                    gap_map[val_lower] = name

        # Padding tokens
        elif (name.startswith("--src-padding-") or
              name.startswith("--src-layout-padding-")):
            # Skip -var- layout tokens (they change per breakpoint)
            # Skip -table- tokens (dedicated for table cell height, not padding)
            if name.startswith("--src-layout-"):
                if "-var-" in name or "-table-" in name:
                    continue
            if val_lower.endswith("px"):
                existing = padding_map.get(val_lower)
                if not existing:
                    padding_map[val_lower] = name

        # Font weight tokens: --src-font-weight-*
        elif name.startswith("--src-font-weight-"):
            # Map both keyword and numeric forms
            weight_name = name.replace("--src-font-weight-", "")
            keyword_to_num = {
                "regular": "400", "medium": "500",
                "semibold": "600", "bold": "700",
            }
            num = keyword_to_num.get(weight_name.lower())
            if num:
                font_weight_map[num] = name
            # Also map CSS keyword equivalents
            if weight_name.lower() == "regular":
                font_weight_map["normal"] = name
            elif weight_name.lower() == "bold":
                font_weight_map["bold"] = name

        # Color tokens: normalize hex and store
        elif val_lower.startswith("#"):
            norm = normalize_hex(val_lower)
            # Prefer semantic tokens over primitives
            is_semantic = not name.startswith("--src-color-")
            if norm not in color_map or is_semantic:
                color_map[norm] = name

            # Build primitive-only color map (for fallback)
            if name.startswith("--src-color-") and norm not in color_primitive_map:
                color_primitive_map[norm] = name

            # Build property-scoped color maps (lists of candidates)
            if name.startswith("--src-text-"):
                color_text_map.setdefault(norm, []).append(name)
            elif name.startswith("--src-surface-") or name.startswith("--src-ui-"):
                color_surface_map.setdefault(norm, []).append(name)
            elif name.startswith("--src-border-") and "rounded" not in name:
                color_border_map.setdefault(norm, []).append(name)
            elif name.startswith("--src-icon-") or name.startswith("--src-graphics-"):
                color_icon_map.setdefault(norm, []).append(name)
            elif name.startswith("--src-shadow-") or name.startswith("--src-gradient-"):
                color_shadow_map.setdefault(norm, []).append(name)

    # Also add --src-light and --src-dark explicitly
    if "--src-light" in resolved:
        light_val = normalize_hex(resolved["--src-light"].lower())
        color_map[light_val] = "--src-light"
    if "--src-dark" in resolved:
        dark_val = normalize_hex(resolved["--src-dark"].lower())
        # Don't override --src-light if they resolve to the same hex
        if dark_val not in color_map:
            color_map[dark_val] = "--src-dark"

    reverse_maps = {
        "spacing": spacing_map,
        "font_size": font_size_map,
        "line_height": line_height_map,
        "letter_spacing": letter_spacing_map,
        "radius": radius_map,
        "height": height_map,
        "gap": gap_map,
        "padding": padding_map,
        "color": color_map,
        "font_weight": font_weight_map,
        "color_text": color_text_map,
        "color_surface": color_surface_map,
        "color_border": color_border_map,
        "color_icon": color_icon_map,
        "color_shadow": color_shadow_map,
        "color_primitive": color_primitive_map,
    }

    # Log stats
    total_mapped = sum(len(m) for m in reverse_maps.values())
    print(f"[info] Reverse maps built: {total_mapped} value->token entries", file=sys.stderr)
    for cat, m in reverse_maps.items():
        if m:
            print(f"  {cat}: {len(m)} entries", file=sys.stderr)

    return all_names, reverse_maps, resolved
