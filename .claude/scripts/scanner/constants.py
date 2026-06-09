"""
Compiled regex patterns, category maps, and other constants used across
the scanner package.
"""

import re

# ─────────────────────────────────────────────────────────────────────
# Defaults
# ─────────────────────────────────────────────────────────────────────

DEFAULT_TOKENS_URL = (
    "https://preview.3dsource.com/front-libraries/develop/docs/design-tokens.json"
)

DEFAULT_TOKENS_FILE = (
    "node_modules/@3dsource/source-ui-native/docs/design-tokens.json"
)

# ─────────────────────────────────────────────────────────────────────
# Compiled regex patterns
# ─────────────────────────────────────────────────────────────────────

RE_SPACING_PROP = re.compile(
    r"^\s*(padding|margin|gap|top|right|bottom|left|inset"
    r"|padding-top|padding-right|padding-bottom|padding-left"
    r"|margin-top|margin-right|margin-bottom|margin-left"
    r"|row-gap|column-gap)\s*:", re.I
)
RE_COLOR_PROP = re.compile(
    r"^\s*(color|background|background-color|border-color|border"
    r"|box-shadow|outline-color|fill|stroke)\s*:", re.I
)
RE_FONT_PROP = re.compile(
    r"^\s*(font-size|line-height|letter-spacing|font-weight)\s*:", re.I
)
RE_FONT_WEIGHT_VALUE = re.compile(
    r"(?<![a-zA-Z0-9_-])"
    r"(\d{3}|normal|bold|bolder|lighter)"
    r"(?![a-zA-Z0-9_-])"
)
RE_RADIUS_PROP = re.compile(
    r"^\s*(border-radius|border-top-left-radius|border-top-right-radius"
    r"|border-bottom-left-radius|border-bottom-right-radius)\s*:", re.I
)

RE_PX_VALUE = re.compile(r"(?<![a-zA-Z0-9_-])(\d+(?:\.\d+)?px)(?![a-zA-Z])")
RE_TYPO_VALUE = re.compile(
    r"(?<![a-zA-Z0-9_-])"
    r"(\d+(?:\.\d+)?(?:px|em|rem|%)?)"  # number with optional unit (unitless = line-height)
    r"(?![a-zA-Z0-9_-])"
)
RE_HEX_COLOR = re.compile(r"#[0-9a-fA-F]{3,8}\b")
RE_RGB_COLOR = re.compile(r"rgba?\([^)]+\)")
RE_HSL_COLOR = re.compile(r"hsla?\([^)]+\)")
RE_VAR_NO_FALLBACK = re.compile(r"var\((--[a-zA-Z0-9_-]+)\s*\)")
RE_SRC_TOKEN = re.compile(r"var\((--src-[a-zA-Z0-9_-]+)")
RE_BEM_ELEMENT = re.compile(r"&__")
RE_SCSS_VAR = re.compile(r"\$[a-zA-Z_][a-zA-Z0-9_-]*")
RE_HOST_SELECTOR = re.compile(r"^\s*:host\b(?!-context)")
RE_IMPORT_STMT = re.compile(r"^\s*@import\b")
RE_PRIMITIVE_COLOR = re.compile(
    r"var\((--src-color-(?:red|green|blue|grey|yellow|primary|secondary|tertiary|neutral)-\d+)"
)
RE_ABBREV_CLASS = re.compile(
    r"\.(btn|env-|app-|nav-|hdr-|ftr-|desc|info|msg)\b"
)
RE_TRANSLATE = re.compile(r"translate[XY]?\s*\(")

SAFE_SCSS_VARS = {
    "$breakpoint", "$breakpoint-md", "$breakpoint-lg",
    "$breakpoint-xl", "$breakpoint-xxl",
}

# ─────────────────────────────────────────────────────────────────────
# Category -> rule mapping for --category flag
# ─────────────────────────────────────────────────────────────────────

CATEGORY_RULES = {
    "spacing":    {"3.1"},
    "colors":     {"3.2", "3.13"},
    "typography": {"3.3"},
    "layout":     {"3.4", "3.17", "3.18"},
    "tokens":     {"3.6", "3.7"},
    "quality":    {"3.8", "3.9", "3.10", "3.11", "3.12", "3.14"},
    "cross-file": set(),  # handled separately in main()
}

ALL_PER_FILE_RULES = set()
for _rules in CATEGORY_RULES.values():
    ALL_PER_FILE_RULES |= _rules
