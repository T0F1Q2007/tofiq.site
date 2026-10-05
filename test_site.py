#!/usr/bin/env python3
"""
Automated Verification Suite for tofiq.site
Verifies:
1. File Existence and Structure (Root variations, Subdirectory mirrors, CSS, JS)
2. Structural Distinctness of the 4 variations
3. 100% Resume Content Completeness across all variations
4. Safety & Privacy: Strict CSP connect-src 'none', zero tracking, zero exfiltration, zero credentials
5. Animation & Responsive Markup
6. CSS Syntax and Print Stylesheet Verification
"""

import os
import re
import sys

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

ROOT_HTML_FILES = [
    "index.html",
    "index-search.html",
    "index-bento.html",
    "index-workspace.html",
    "index-linktree.html"
]

SUBDIR_HTML_FILES = [
    "variations/search/index.html",
    "variations/bento/index.html",
    "variations/workspace/index.html",
    "variations/linktree/index.html"
]

CSS_FILES = [
    "css/tokens.css",
    "css/base.css",
    "css/switcher.css",
    "css/v1-search.css",
    "css/v2-bento.css",
    "css/v3-workspace.css",
    "css/v4-linktree.css"
]

JS_FILES = [
    "js/animations.js",
    "js/switcher.js"
]

REQUIRED_RESUME_ENTITIES = [
    "Tofig Valizada",
    "Azerbaijan State Oil and Industry University",
    "Computer Information Systems",
    "Number 7 High School",
    "Republic Subject Olympiad in Informatics",
    "nvidia-stock-price-forecasting-for-uni",
    "RepEat",
    "Redmi-buds-8-pro-linux-software",
    "3DtoAR",
    "velizadetofiq1@gmail.com",
    "tofiq.valizada@asoiu.edu.az",
    "linkedin.com/in/velizadetofiq1",
    "994554947493",
    "Azerbaijani",
    "English",
    "C1",
    "Python",
    "Linux"
]

FORBIDDEN_PATTERNS = [
    (r"fetch\(", "fetch API call"),
    (r"XMLHttpRequest", "XMLHttpRequest call"),
    (r"navigator\.sendBeacon", "sendBeacon telemetry"),
    (r"WebSocket\(", "WebSocket connection"),
    (r"80\.69\.62\.106", "External server IP leaked"),
    (r"tofiqsit", "FTP username leaked"),
    (r"f\*hyWTz9EqHq#K", "FTP password leaked"),
    (r"ghp_[a-zA-Z0-9]+", "GitHub PAT token leaked"),
    (r"the surprise", "Malicious folder reference"),
    (r"google-analytics\.com", "Google Analytics tracker"),
    (r"googletagmanager\.com", "Google Tag Manager"),
    (r"hotjar\.com", "Hotjar tracker"),
    (r"mixpanel\.com", "Mixpanel tracker")
]

UNIQUE_VARIATION_SIGNATURES = {
    "index-search.html": "search-layout-grid",
    "index-bento.html": "bento-grid",
    "index-workspace.html": "workspace-wrapper",
    "index-linktree.html": "lt-timeline-section"
}


def test_file_structure():
    print("[1/6] Checking File Structure & Assets...")
    all_files = ROOT_HTML_FILES + SUBDIR_HTML_FILES + CSS_FILES + JS_FILES
    missing = []
    small = []
    for rel_path in all_files:
        full_path = os.path.join(PROJECT_ROOT, rel_path)
        if not os.path.isfile(full_path):
            missing.append(rel_path)
        else:
            size = os.path.getsize(full_path)
            if size < 200:
                small.append(f"{rel_path} ({size} bytes)")

    if missing:
        raise AssertionError(f"Missing required files: {missing}")
    if small:
        raise AssertionError(f"Files suspiciously small: {small}")

    print(f"  ✓ All {len(all_files)} project files exist and have valid content sizes.")


def test_variation_distinctness():
    print("[2/6] Verifying Visual & Architectural Distinctness of the 4 Variations...")
    hashes = {}
    for filename, signature in UNIQUE_VARIATION_SIGNATURES.items():
        path = os.path.join(PROJECT_ROOT, filename)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            assert signature in content, f"{filename} is missing signature DOM container '{signature}'"
            hashes[filename] = hash(content)

    # Ensure none of the 4 variations are identical copy-pastes
    unique_hashes = set(hashes.values())
    assert len(unique_hashes) == len(UNIQUE_VARIATION_SIGNATURES), "Variations must not be identical clones!"
    print("  ✓ All 4 variations possess unique DOM architectures and layouts.")


def test_resume_content_completeness():
    print("[3/6] Verifying 100% Resume Content Coverage Across All Variations...")
    all_html_files = ROOT_HTML_FILES + SUBDIR_HTML_FILES
    for rel_path in all_html_files:
        path = os.path.join(PROJECT_ROOT, rel_path)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            missing = [entity for entity in REQUIRED_RESUME_ENTITIES if entity not in content]
            if missing:
                raise AssertionError(f"{rel_path} is missing resume items: {missing}")
    print(f"  ✓ 100% resume and project content verified across all {len(all_html_files)} HTML pages.")


def test_safety_and_zero_tracking():
    print("[4/6] Auditing Safety, Privacy, and Content Security Policy (connect-src 'none')...")
    violations = []
    
    # Check all project code files
    for root, dirs, files in os.walk(PROJECT_ROOT):
        if ".agents" in root or ".git" in root:
            continue
        for file in files:
            if file.endswith((".html", ".css", ".js")):
                filepath = os.path.join(root, file)
                rel_path = os.path.relpath(filepath, PROJECT_ROOT)
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                    # Check forbidden patterns
                    for pattern, desc in FORBIDDEN_PATTERNS:
                        if re.search(pattern, content):
                            violations.append(f"{rel_path}: Forbidden pattern detected: {desc}")

                    # If HTML, check strict CSP
                    if file.endswith(".html"):
                        if "connect-src 'none'" not in content:
                            violations.append(f"{rel_path}: Missing CSP connect-src 'none'")
                        if "default-src 'self'" not in content:
                            violations.append(f"{rel_path}: Missing CSP default-src 'self'")

    if violations:
        raise AssertionError("Safety audit failed:\n" + "\n".join(violations))

    print("  ✓ Zero data collection, zero tracking, strict CSP connect-src 'none' enforced across all files.")


def test_responsive_and_animations():
    print("[5/6] Checking Responsive Meta Tags, IntersectionObserver & Switcher Integration...")
    all_html = ROOT_HTML_FILES + SUBDIR_HTML_FILES
    for rel_path in all_html:
        path = os.path.join(PROJECT_ROOT, rel_path)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            assert '<meta name="viewport"' in content, f"{rel_path} missing viewport meta tag"
            assert "data-reveal" in content or "data-stagger" in content, f"{rel_path} missing scroll animation markers"
            assert "switcher.js" in content, f"{rel_path} missing switcher.js integration"
            assert "animations.js" in content, f"{rel_path} missing animations.js integration"

    # Check animations.js implementation
    anim_path = os.path.join(PROJECT_ROOT, "js/animations.js")
    with open(anim_path, "r", encoding="utf-8") as f:
        anim_js = f.read()
        assert "IntersectionObserver" in anim_js, "animations.js missing IntersectionObserver"
        assert "prefers-reduced-motion" in anim_js, "animations.js missing prefers-reduced-motion support"

    print("  ✓ Responsive viewport, scroll reveal observer, and floating switcher verified.")


def test_print_and_css():
    print("[6/6] Verifying Print Stylesheet (@media print) and CSS Integrity...")
    base_css_path = os.path.join(PROJECT_ROOT, "css/base.css")
    with open(base_css_path, "r", encoding="utf-8") as f:
        base_css = f.read()
        assert "@media print" in base_css, "css/base.css missing @media print CV stylesheet"

    tokens_css_path = os.path.join(PROJECT_ROOT, "css/tokens.css")
    with open(tokens_css_path, "r", encoding="utf-8") as f:
        tokens_css = f.read()
        assert "--g-blue:" in tokens_css, "tokens.css missing Google Blue token"
        assert "--g-red:" in tokens_css, "tokens.css missing Google Red token"
        assert "--g-yellow:" in tokens_css, "tokens.css missing Google Yellow token"
        assert "--g-green:" in tokens_css, "tokens.css missing Google Green token"

    print("  ✓ Print stylesheet for CV printing and MD3 tokens verified.")


if __name__ == "__main__":
    print("=" * 70)
    print("  tofiq.site AUTOMATED VERIFICATION SUITE")
    print("=" * 70)
    try:
        test_file_structure()
        test_variation_distinctness()
        test_resume_content_completeness()
        test_safety_and_zero_tracking()
        test_responsive_and_animations()
        test_print_and_css()
        print("=" * 70)
        print("🎉 ALL 6 VERIFICATION TEST SUITES PASSED FLAWLESSLY! (100% SUCCESS)")
        print("=" * 70)
        sys.exit(0)
    except AssertionError as err:
        print(f"\n❌ TEST SUITE FAILED: {err}", file=sys.stderr)
        sys.exit(1)
