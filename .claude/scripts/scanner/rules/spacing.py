"""
Rule 3.1: Hardcoded spacing values (padding, margin, gap, inset, etc.).
"""

from ..constants import (
    RE_PX_VALUE,
    RE_SPACING_PROP,
    RE_TRANSLATE,
)
from ..helpers import is_in_calc, is_in_var_fallback


def lookup_spacing(val, prop, maps):
    """Look up a px value using the map most relevant to the CSS property.

    Returns (primary_token, alt_tokens) where:
      - primary_token: the best match for the given CSS property context
      - alt_tokens: list of other valid tokens for the same value

    Property mapping:
      padding* -> padding map first, then spacing
      gap/row-gap/column-gap -> gap map first, then spacing
      margin*/top/right/bottom/left/inset -> spacing map first
    """
    PADDING_PROPS = {
        "padding", "padding-top", "padding-right",
        "padding-bottom", "padding-left",
    }
    GAP_PROPS = {"gap", "row-gap", "column-gap"}

    if prop in PADDING_PROPS:
        order = ["padding", "spacing", "gap"]
    elif prop in GAP_PROPS:
        order = ["gap", "spacing", "padding"]
    else:
        order = ["spacing", "padding", "gap"]

    primary = None
    alts = []
    for map_name in order:
        token = maps.get(map_name, {}).get(val)
        if token:
            if primary is None:
                primary = token
            elif token != primary:
                alts.append(token)
    return primary, alts


def check_line(line, i, rp, sn, reverse_maps):
    """Check a single line for Rule 3.1 violations.

    Returns (findings, value_records).
    """
    findings = []
    value_records = []

    spacing_match = RE_SPACING_PROP.match(line)
    if not spacing_match:
        return findings, value_records

    prop_name = spacing_match.group(1).lower()
    for m in RE_PX_VALUE.finditer(line):
        val = m.group(1)
        if val == "0px":
            continue
        if is_in_var_fallback(line, m.start()):
            continue
        if is_in_calc(line, m.start()):
            continue
        if RE_TRANSLATE.search(line):
            continue
        if val == "1px" and "border" in line.split(":")[0].lower():
            continue
        token, alts = lookup_spacing(val, prop_name, reverse_maps)
        finding = {
            "rule": "3.1", "rule_name": "hardcoded_spacing",
            "severity": "critical",
            "file": rp, "file_short": sn, "line": i, "snippet": line,
            "raw_value": val, "matched_token": token,
            "css_property": prop_name,
            "suggestion": (
                f"{val} -> var({token}, {val})" if token
                else f"Hardcoded {val} — no matching SRC spacing token"
            ),
        }
        if alts:
            finding["alt_tokens"] = alts
        findings.append(finding)
        value_records.append(("spacing", val, rp, i))

    return findings, value_records
