"""
Rule 3.4: Hardcoded border-radius.
Rule 3.17: Oversized files.
Rule 3.18: Deep nesting.
"""

from ..constants import RE_PX_VALUE, RE_RADIUS_PROP
from ..helpers import get_nesting_depth, is_in_var_fallback


def check_file(lines, rp, sn):
    """Rule 3.17: Check for oversized files (>150 lines).

    Returns list of findings.
    """
    findings = []
    if len(lines) > 150:
        findings.append({
            "rule": "3.17", "rule_name": "oversized_file", "severity": "info",
            "file": rp, "file_short": sn, "line": len(lines),
            "snippet": f"File has {len(lines)} lines",
            "suggestion": f"File exceeds 150 lines ({len(lines)}). Consider splitting.",
        })
    return findings


def check_radius(line, i, rp, sn, reverse_maps):
    """Rule 3.4: Check for hardcoded border-radius values.

    Returns (findings, value_records).
    """
    findings = []
    value_records = []

    if not RE_RADIUS_PROP.match(line):
        return findings, value_records

    for m in RE_PX_VALUE.finditer(line):
        val = m.group(1)
        if val == "0px":
            continue
        if is_in_var_fallback(line, m.start()):
            continue
        token = reverse_maps["radius"].get(val)
        findings.append({
            "rule": "3.4", "rule_name": "hardcoded_radius",
            "severity": "critical",
            "file": rp, "file_short": sn, "line": i, "snippet": line,
            "raw_value": val, "matched_token": token,
            "suggestion": (
                f"{val} -> var({token}, {val})" if token
                else f"Hardcoded radius {val} — no matching token"
            ),
        })
        value_records.append(("radius", val, rp, i))

    return findings, value_records


def check_nesting(line, i, lines, rp, sn):
    """Rule 3.18: Check for deep nesting (>3 levels).

    Returns list of findings.
    """
    findings = []
    depth = get_nesting_depth(lines, i - 1)
    if depth > 3 and "{" in line:
        findings.append({
            "rule": "3.18", "rule_name": "deep_nesting", "severity": "info",
            "file": rp, "file_short": sn, "line": i, "snippet": line,
            "depth": depth,
            "suggestion": f"Nesting depth {depth} — flatten with BEM naming.",
        })
    return findings
