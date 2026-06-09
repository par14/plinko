"""
Rule 3.2: Hardcoded colors (hex, rgb, hsl).
Rule 3.13: Primitive color tokens used in UI context.
"""

from ..constants import (
    RE_COLOR_PROP,
    RE_HEX_COLOR,
    RE_HSL_COLOR,
    RE_PRIMITIVE_COLOR,
    RE_RGB_COLOR,
)
from ..helpers import is_in_var_fallback, normalize_hex, rgb_to_hex, hsl_to_hex


def color_prop_category(prop):
    """Map CSS property to color token category."""
    if prop == "color":
        return "text"
    if prop in ("background", "background-color"):
        return "surface"
    if prop in ("border-color", "border"):
        return "border"
    if prop in ("fill", "stroke"):
        return "icon"
    if prop == "box-shadow":
        return "shadow"
    if prop == "outline-color":
        return "border"
    return ""  # unknown


def resolve_color_token(norm_hex, prop, reverse_maps):
    """Resolve best token + candidates from scoped color maps.

    Returns (token, candidates).
    """
    cat = color_prop_category(prop)
    scoped_map_key = f"color_{cat}" if cat else None
    candidates = []
    token = None
    # Try scoped map first
    if scoped_map_key and scoped_map_key in reverse_maps:
        candidates = reverse_maps[scoped_map_key].get(norm_hex, [])
    if candidates:
        token = candidates[0]
    else:
        # Fallback to flat color_map, but only accept
        # primitive (--src-color-*) or general tokens
        # to avoid suggesting wrong-category semantics
        fallback = reverse_maps["color"].get(norm_hex)
        if fallback and (
            fallback.startswith("--src-color-")
            or fallback in ("--src-light", "--src-dark")
        ):
            token = fallback
        else:
            # Final fallback: check primitive-only map (--src-color-*)
            # This catches cases where the flat map stored a semantic
            # token from a different scope, hiding the primitive.
            primitive = reverse_maps.get("color_primitive", {}).get(norm_hex)
            if primitive:
                token = primitive
    return token, candidates


def check_line(line, i, rp, sn, reverse_maps):
    """Check a single line for Rule 3.2 violations.

    Returns (findings, value_records).
    """
    findings = []
    value_records = []

    if not RE_COLOR_PROP.match(line):
        return findings, value_records

    color_prop_name = line.split(":")[0].strip().lower()
    color_cat = color_prop_category(color_prop_name)

    # Hex colors
    for m in RE_HEX_COLOR.finditer(line):
        hex_val = m.group(0).lower()
        if is_in_var_fallback(line, m.start()):
            continue
        norm = normalize_hex(hex_val)
        token, candidates = resolve_color_token(norm, color_prop_name, reverse_maps)
        finding = {
            "rule": "3.2", "rule_name": "hardcoded_color",
            "severity": "critical",
            "file": rp, "file_short": sn, "line": i, "snippet": line,
            "raw_value": hex_val, "matched_token": token,
            "css_property": color_prop_name,
            "color_category": color_cat,
            "suggestion": (
                f"{hex_val} -> var({token}, {hex_val})" if token
                else f"Hardcoded color {hex_val} — no exact token match"
            ),
        }
        if len(candidates) > 1:
            finding["candidates"] = candidates
        findings.append(finding)
        value_records.append(("color", hex_val, rp, i))

    # RGB colors
    for m in RE_RGB_COLOR.finditer(line):
        rgb_val = m.group(0)
        if is_in_var_fallback(line, m.start()):
            continue
        if "transparent" in rgb_val:
            continue
        token = None
        candidates = []
        hex_equiv = rgb_to_hex(rgb_val)
        if hex_equiv:
            token, candidates = resolve_color_token(hex_equiv, color_prop_name, reverse_maps)
        finding = {
            "rule": "3.2", "rule_name": "hardcoded_color",
            "severity": "critical",
            "file": rp, "file_short": sn, "line": i, "snippet": line,
            "raw_value": rgb_val, "matched_token": token,
            "css_property": color_prop_name,
            "color_category": color_cat,
            "suggestion": (
                f"{rgb_val} -> var({token}, {rgb_val})" if token
                else f"Hardcoded {rgb_val} — replace with SRC token"
            ),
        }
        if len(candidates) > 1:
            finding["candidates"] = candidates
        findings.append(finding)
        value_records.append(("color", rgb_val, rp, i))

    # HSL colors
    for m in RE_HSL_COLOR.finditer(line):
        hsl_val = m.group(0)
        if is_in_var_fallback(line, m.start()):
            continue
        token = None
        candidates = []
        hex_equiv = hsl_to_hex(hsl_val)
        if hex_equiv:
            token, candidates = resolve_color_token(hex_equiv, color_prop_name, reverse_maps)
        finding = {
            "rule": "3.2", "rule_name": "hardcoded_color",
            "severity": "critical",
            "file": rp, "file_short": sn, "line": i, "snippet": line,
            "raw_value": hsl_val, "matched_token": token,
            "css_property": color_prop_name,
            "color_category": color_cat,
            "suggestion": (
                f"{hsl_val} -> var({token}, {hsl_val})" if token
                else f"Hardcoded {hsl_val} — replace with SRC token"
            ),
        }
        if len(candidates) > 1:
            finding["candidates"] = candidates
        findings.append(finding)
        value_records.append(("color", hsl_val, rp, i))

    return findings, value_records


def check_primitive(line, i, rp, sn):
    """Check a single line for Rule 3.13 (primitive color tokens in UI).

    Returns list of findings.
    """
    findings = []
    for m in RE_PRIMITIVE_COLOR.finditer(line):
        findings.append({
            "rule": "3.13", "rule_name": "primitive_color_token",
            "severity": "warning",
            "file": rp, "file_short": sn, "line": i, "snippet": line,
            "token_used": m.group(1),
            "suggestion": f"Primitive color token {m.group(1)}. Prefer semantic token.",
        })
    return findings
