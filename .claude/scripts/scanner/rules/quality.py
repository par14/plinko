"""
Rule 3.8: BEM violations.
Rule 3.9: SCSS variables in property values.
Rule 3.10: Abbreviated class names.
Rule 3.11: :host styling.
Rule 3.12: host property in @Component.
Rule 3.14: @import usage.
"""

import re

from ..constants import (
    RE_ABBREV_CLASS,
    RE_BEM_ELEMENT,
    RE_HOST_SELECTOR,
    RE_IMPORT_STMT,
    RE_SCSS_VAR,
    SAFE_SCSS_VARS,
)
from ..helpers import rel_path, short_name


def check_line(line, i, rp, sn):
    """Check a single line for quality rules (3.8, 3.9, 3.10, 3.11, 3.14).

    Returns list of findings.
    """
    findings = []

    # Rule 3.14: @import
    if RE_IMPORT_STMT.match(line):
        findings.append({
            "rule": "3.14", "rule_name": "import_usage", "severity": "warning",
            "file": rp, "file_short": sn, "line": i, "snippet": line,
            "suggestion": "Replace @import with @use",
        })

    # Rule 3.11: :host styling
    if RE_HOST_SELECTOR.match(line):
        findings.append({
            "rule": "3.11", "rule_name": "host_styling", "severity": "warning",
            "file": rp, "file_short": sn, "line": i, "snippet": line,
            "suggestion": "Use a wrapper element inside the template instead of :host",
        })

    # Rule 3.8: BEM violations
    if RE_BEM_ELEMENT.search(line):
        findings.append({
            "rule": "3.8", "rule_name": "bem_violation", "severity": "warning",
            "file": rp, "file_short": sn, "line": i, "snippet": line,
            "suggestion": "BEM &__ concatenation forbidden. Write .block__element fully.",
        })

    # Rule 3.9: SCSS variables in values
    if ":" in line and not line.startswith("@") and not line.startswith("$"):
        prop_part = line.split(":")[0].strip()
        if not prop_part.startswith("$") and not prop_part.startswith("@"):
            for sv in RE_SCSS_VAR.findall(line):
                if sv not in SAFE_SCSS_VARS:
                    findings.append({
                        "rule": "3.9", "rule_name": "scss_variable",
                        "severity": "critical",
                        "file": rp, "file_short": sn, "line": i, "snippet": line,
                        "suggestion": f"SCSS variable {sv} in property value. Use var(--src-*, fallback).",
                    })

    # Rule 3.10: Abbreviated class names
    if RE_ABBREV_CLASS.search(line) and ".src-" not in line:
        findings.append({
            "rule": "3.10", "rule_name": "abbreviated_class", "severity": "info",
            "file": rp, "file_short": sn, "line": i, "snippet": line,
            "suggestion": "Abbreviated class name. Expand to full readable BEM name.",
        })

    return findings


def scan_ts_files(ts_files, root):
    """Rule 3.12: Check for host property in @Component decorator."""
    findings = []
    for fp in ts_files:
        try:
            with open(fp, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception:
            continue

        comp_match = re.search(
            r"@Component\s*\(\s*\{(.*?)\}\s*\)", content, re.DOTALL
        )
        if comp_match:
            decorator = comp_match.group(1)
            if re.search(r"\bhost\s*:", decorator):
                rp = rel_path(fp, root)
                sn = short_name(fp)
                findings.append({
                    "rule": "3.12", "rule_name": "host_property", "severity": "info",
                    "file": rp, "file_short": sn, "line": 0,
                    "snippet": "host: { ... } in @Component",
                    "suggestion": "Remove host property; use wrapper element in template.",
                })
    return findings
