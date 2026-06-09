"""
Rule 3.6: Missing var() fallbacks.
Rule 3.7: Non-existent token names.
"""

import difflib

from ..constants import RE_SRC_TOKEN, RE_VAR_NO_FALLBACK


def check_missing_fallback(line, i, rp, sn, all_token_names, resolved_tokens):
    """Rule 3.6: Check for var() calls with no fallback value.

    Returns list of findings.
    """
    findings = []
    for m in RE_VAR_NO_FALLBACK.finditer(line):
        token_name = m.group(1)
        if token_name in all_token_names:
            # Token exists but missing fallback
            fb = resolved_tokens.get(token_name, "?")
            findings.append({
                "rule": "3.6", "rule_name": "missing_fallback",
                "severity": "warning",
                "file": rp, "file_short": sn, "line": i, "snippet": line,
                "token_used": token_name, "token_value": fb,
                "suggestion": f"Add fallback: var({token_name}, {fb})",
            })
        elif token_name.startswith("--src-"):
            findings.append({
                "rule": "3.6", "rule_name": "missing_fallback",
                "severity": "warning",
                "file": rp, "file_short": sn, "line": i, "snippet": line,
                "token_used": token_name,
                "suggestion": f"Missing fallback and token {token_name} not in registry.",
            })
    return findings


def check_nonexistent(line, i, rp, sn, all_token_names):
    """Rule 3.7: Check for non-existent token names in var() calls.

    Returns list of findings.
    """
    findings = []
    for m in RE_SRC_TOKEN.finditer(line):
        token_name = m.group(1)
        if token_name not in all_token_names:
            candidates = difflib.get_close_matches(
                token_name, list(all_token_names), n=3, cutoff=0.6
            )
            finding = {
                "rule": "3.7", "rule_name": "nonexistent_token",
                "severity": "critical",
                "file": rp, "file_short": sn, "line": i, "snippet": line,
                "token_used": token_name,
                "suggestion": f"Token {token_name} does not exist in design-tokens.json.",
            }
            if candidates:
                finding["candidates"] = candidates
                finding["suggestion"] += f" Did you mean: {', '.join(candidates)}?"
            findings.append(finding)
    return findings
