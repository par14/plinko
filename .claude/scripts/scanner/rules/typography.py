"""
Rule 3.3: Hardcoded font sizes, line-height, letter-spacing, and font-weight.
"""

import re

from ..constants import RE_FONT_PROP, RE_FONT_WEIGHT_VALUE, RE_TYPO_VALUE
from ..helpers import is_in_var_fallback


def check_line(line, i, rp, sn, reverse_maps):
    """Check a single line for Rule 3.3 violations.

    Returns (findings, value_records).
    """
    findings = []
    value_records = []

    if not RE_FONT_PROP.match(line):
        return findings, value_records

    prop_name = line.split(":")[0].strip().lower()

    # Non-font-weight typography values (font-size, line-height, letter-spacing)
    for m in RE_TYPO_VALUE.finditer(line):
        val = m.group(1)
        # Skip zero values (0, 0px, 0em, 0%)
        if re.match(r'^0(?:px|em|rem|%)?$', val):
            continue
        # Skip line-height: 1 (standard CSS reset, means 1x font-size)
        if prop_name == 'line-height' and val == '1':
            continue
        if is_in_var_fallback(line, m.start()):
            continue
        token = None
        if prop_name == "font-size":
            token = reverse_maps["font_size"].get(val)
        elif prop_name == "line-height":
            token = reverse_maps["line_height"].get(val)
        elif prop_name == "letter-spacing":
            token = reverse_maps["letter_spacing"].get(val)
        elif prop_name == "font-weight":
            # font-weight uses its own regex, skip the typo regex
            continue
        findings.append({
            "rule": "3.3", "rule_name": "hardcoded_typography",
            "severity": "critical",
            "file": rp, "file_short": sn, "line": i, "snippet": line,
            "raw_value": val, "property": prop_name, "matched_token": token,
            "suggestion": (
                f"{val} -> var({token}, {val})" if token
                else f"Hardcoded {prop_name}: {val} — no matching typography token"
            ),
        })
        value_records.append(("typography", val, rp, i))

    # font-weight: use dedicated regex + map
    if prop_name == "font-weight":
        for m in RE_FONT_WEIGHT_VALUE.finditer(line):
            val = m.group(1)
            if is_in_var_fallback(line, m.start()):
                continue
            # Skip inherit/initial/unset
            if val in ("inherit", "initial", "unset"):
                continue
            token = reverse_maps["font_weight"].get(val)
            findings.append({
                "rule": "3.3", "rule_name": "hardcoded_typography",
                "severity": "critical",
                "file": rp, "file_short": sn, "line": i, "snippet": line,
                "raw_value": val, "property": prop_name, "matched_token": token,
                "suggestion": (
                    f"{val} -> var({token}, {val})" if token
                    else f"Hardcoded {prop_name}: {val} — no matching typography token"
                ),
            })
            value_records.append(("typography", val, rp, i))

    return findings, value_records
