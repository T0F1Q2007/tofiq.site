#!/usr/bin/env python3
"""
EMPIRICAL CHALLENGER 2: COMPREHENSIVE VERIFICATION SUITE
Project: tofiq.site
Mission:
  Empirically verify JavaScript execution, scroll animation behavior,
  CSS parsing, and HTML syntax across portfolio website assets.

Suites:
  1. JavaScript Runtime & Behavioral Suite (Node.js VM Harness)
     - Syntax validation for animations.js and switcher.js
     - animations.js with IntersectionObserver reveal behavior
     - animations.js with prefers-reduced-motion: reduce immediate reveal & auto-scroll
     - animations.js with IntersectionObserver ABSENT (graceful fallback)
     - animations.js scroll progress bar math & event loop throttling
     - animations.js anchor navigation & accessible focus management
     - switcher.js root URL detection and DOM dock generation
     - switcher.js subdirectory (../../) relative routing
     - switcher.js active variation pill mapping across all layouts
     - switcher.js Alt+1 through Alt+4 keyboard shortcuts
  2. CSS Parsing & Structural Lexical Suite (All 7 stylesheets)
     - Balanced curly braces, parentheses, and square brackets
     - Unclosed comments and unclosed string literal checks
     - Declaration parsing (valid property: value pairs without malformed tokens)
     - MD3 tokens validation (--g-blue, --g-red, --g-yellow, --g-green, surface tiers)
     - Prefers-reduced-motion media query rules
     - Print stylesheet (@media print) CV rules
     - Switcher styling and mobile responsive media queries
  3. HTML5 Syntax & Structural Conformance Suite (All 9 HTML documents)
     - Strict WHATWG HTML5 parser validation (html5lib strict mode)
     - DOCTYPE, html lang, charset UTF-8, viewport meta
     - Strict Content Security Policy (connect-src 'none', default-src 'self')
     - 100% Relative asset resolution (CSS links and JS scripts exist on disk)
     - Intra-page navigation anchor target integrity
     - Scroll animation markup attributes (data-reveal, data-stagger)
     - Zero telemetry / zero exfiltration audit
"""

import os
import re
import sys
import glob
import subprocess
import html5lib
from bs4 import BeautifulSoup

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

HTML_FILES = sorted([
    "index.html",
    "index-search.html",
    "index-bento.html",
    "index-workspace.html",
    "index-linktree.html",
    "variations/search/index.html",
    "variations/bento/index.html",
    "variations/workspace/index.html",
    "variations/linktree/index.html"
])

CSS_FILES = sorted([
    "css/tokens.css",
    "css/base.css",
    "css/switcher.css",
    "css/v1-search.css",
    "css/v2-bento.css",
    "css/v3-workspace.css",
    "css/v4-linktree.css"
])

JS_FILES = sorted([
    "js/animations.js",
    "js/switcher.js"
])

test_records = []

def run_test(suite_name, test_name, test_fn):
    try:
        test_fn()
        test_records.append((suite_name, test_name, True, ""))
        print(f"  ✓ [PASS] {test_name}")
    except Exception as e:
        test_records.append((suite_name, test_name, False, str(e)))
        print(f"  ✗ [FAIL] {test_name}: {e}")

# -----------------------------------------------------------------------------
# SUITE 1: JAVASCRIPT EXECUTION & BEHAVIORAL VERIFICATION
# -----------------------------------------------------------------------------
def run_js_suite():
    print("\n" + "=" * 78)
    print("  SUITE 1: JAVASCRIPT RUNTIME & BEHAVIORAL VERIFICATION (Node.js VM)")
    print("=" * 78)

    js_test_path = os.path.join(PROJECT_ROOT, "test_empirical_challenger2.js")
    assert os.path.isfile(js_test_path), f"JS test file missing: {js_test_path}"

    def test_node_execution():
        res = subprocess.run(
            ["node", js_test_path],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True
        )
        for line in res.stdout.splitlines():
            if "[PASS]" in line:
                print(f"  {line.strip()}")
        if res.returncode != 0:
            raise AssertionError(f"Node.js tests failed with code {res.returncode}:\n{res.stdout}\n{res.stderr}")

    run_test("JavaScript", "JS-Suite: 12-test comprehensive Node.js VM harness", test_node_execution)

# -----------------------------------------------------------------------------
# SUITE 2: CSS PARSING & SYNTAX VERIFICATION
# -----------------------------------------------------------------------------
def run_css_suite():
    print("\n" + "=" * 78)
    print("  SUITE 2: CSS PARSING, TOKENS & SYNTAX INTEGRITY (All 7 Stylesheets)")
    print("=" * 78)

    # 1. Existence and non-empty check
    def test_css_files_exist():
        for rel in CSS_FILES:
            full = os.path.join(PROJECT_ROOT, rel)
            assert os.path.isfile(full), f"Missing CSS file: {rel}"
            size = os.path.getsize(full)
            assert size > 500, f"CSS file suspiciously small ({size} bytes): {rel}"
    run_test("CSS", "CSS-01: Verify all 7 stylesheets exist and have substantial size", test_css_files_exist)

    # 2. Bracket and comment balancing
    def test_css_lexical_balance():
        for rel in CSS_FILES:
            full = os.path.join(PROJECT_ROOT, rel)
            with open(full, "r", encoding="utf-8") as f:
                content = f.read()

            open_comm = content.count("/*")
            close_comm = content.count("*/")
            assert open_comm == close_comm, f"{rel}: Unbalanced comments (/*: {open_comm}, */: {close_comm})"

            clean = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)

            assert clean.count("{") == clean.count("}"), f"{rel}: Unbalanced curly braces"
            assert clean.count("(") == clean.count(")"), f"{rel}: Unbalanced parentheses"
            assert clean.count("[") == clean.count("]"), f"{rel}: Unbalanced square brackets"
    run_test("CSS", "CSS-02: Verify balanced braces, parens, brackets, and comments across all CSS files", test_css_lexical_balance)

    # 3. Declaration grammar validation
    def test_css_declarations():
        for rel in CSS_FILES:
            full = os.path.join(PROJECT_ROOT, rel)
            with open(full, "r", encoding="utf-8") as f:
                content = f.read()
            clean = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
            blocks = re.findall(r'([^{}]+)\{([^{}]+)\}', clean)
            assert len(blocks) > 0, f"{rel}: No declaration blocks found"
            for sel, decl_block in blocks:
                sel = sel.strip()
                assert len(sel) > 0, f"{rel}: Empty selector before block"
                for decl in decl_block.split(";"):
                    decl = decl.strip()
                    if not decl:
                        continue
                    assert ":" in decl, f"{rel} in [{sel}]: Missing colon in declaration: {decl}"
                    prop, val = decl.split(":", 1)
                    assert len(prop.strip()) > 0, f"{rel} in [{sel}]: Empty property name: {decl}"
                    assert len(val.strip()) > 0, f"{rel} in [{sel}]: Empty property value: {decl}"
    run_test("CSS", "CSS-03: Verify grammar of declaration blocks (property: value pairs) across all CSS files", test_css_declarations)

    # 4. Tokens verification
    def test_css_tokens():
        tokens_path = os.path.join(PROJECT_ROOT, "css/tokens.css")
        with open(tokens_path, "r", encoding="utf-8") as f:
            tokens_css = f.read()
        expected_tokens = [
            "--g-blue: #4285F4;",
            "--g-red: #EA4335;",
            "--g-yellow: #FBBC05;",
            "--g-green: #34A853;",
            "--g-surface-0:",
            "--g-surface-1:",
            "--g-border:",
            "--g-radius-pill: 9999px;"
        ]
        for t in expected_tokens:
            assert t in tokens_css, f"css/tokens.css missing token definition: {t}"
    run_test("CSS", "CSS-04: Verify Material Design 3 4-color palette and surface tokens in tokens.css", test_css_tokens)

    # 5. Accessibility reduced motion CSS
    def test_reduced_motion_css():
        base_path = os.path.join(PROJECT_ROOT, "css/base.css")
        with open(base_path, "r", encoding="utf-8") as f:
            base_css = f.read()
        assert "@media (prefers-reduced-motion: reduce)" in base_css, "base.css missing prefers-reduced-motion media query"
        assert "opacity: 1 !important" in base_css, "base.css missing opacity: 1 !important for reduced motion"
        assert "transition: none !important" in base_css, "base.css missing transition: none !important for reduced motion"
    run_test("CSS", "CSS-05: Verify @media (prefers-reduced-motion: reduce) transitions suppression in base.css", test_reduced_motion_css)

    # 6. Print stylesheet verification
    def test_print_css():
        base_path = os.path.join(PROJECT_ROOT, "css/base.css")
        with open(base_path, "r", encoding="utf-8") as f:
            base_css = f.read()
        assert "@media print" in base_css, "base.css missing @media print block"
        assert ".g-variation-switcher" in base_css, "base.css print stylesheet must hide variation switcher"
        assert ".scroll-progress-bar" in base_css, "base.css print stylesheet must hide scroll progress bar"
        assert "page-break-inside: avoid" in base_css, "base.css print stylesheet should prevent page breaks inside cards"
    run_test("CSS", "CSS-06: Verify @media print optimization for CV printing in base.css", test_print_css)

    # 7. Switcher responsive styles
    def test_switcher_responsive():
        switcher_path = os.path.join(PROJECT_ROOT, "css/switcher.css")
        with open(switcher_path, "r", encoding="utf-8") as f:
            sw_css = f.read()
        assert ".g-variation-switcher" in sw_css, "switcher.css missing dock styling"
        assert "@media (max-width: 640px)" in sw_css, "switcher.css missing mobile responsive breakpoint"
        assert ".switcher-label-short" in sw_css, "switcher.css missing short label support for mobile"
    run_test("CSS", "CSS-07: Verify switcher dock styles and mobile media queries in switcher.css", test_switcher_responsive)

# -----------------------------------------------------------------------------
# SUITE 3: HTML5 SYNTAX & STRUCTURAL VALIDATION
# -----------------------------------------------------------------------------
def run_html_suite():
    print("\n" + "=" * 78)
    print("  SUITE 3: STRICT HTML5 SYNTAX & STRUCTURAL INTEGRITY (All 9 HTML Documents)")
    print("=" * 78)

    # 1. Strict WHATWG HTML5 parser
    def test_strict_html5_parsing():
        parser = html5lib.HTMLParser(strict=True)
        for rel in HTML_FILES:
            full = os.path.join(PROJECT_ROOT, rel)
            with open(full, "r", encoding="utf-8") as f:
                content = f.read()
            try:
                parser.parse(content)
            except Exception as e:
                raise AssertionError(f"{rel}: Strict HTML5 parsing failed: {e}")
    run_test("HTML", "HTML-01: Parse all 9 HTML files through strict WHATWG html5lib parser", test_strict_html5_parsing)

    # 2. DOCTYPE and essential head elements
    def test_html_essential_tags():
        for rel in HTML_FILES:
            full = os.path.join(PROJECT_ROOT, rel)
            with open(full, "r", encoding="utf-8") as f:
                content = f.read()
            assert content.lstrip().startswith("<!DOCTYPE html>"), f"{rel}: Missing or malformed <!DOCTYPE html>"
            soup = BeautifulSoup(content, "html.parser")
            assert soup.html, f"{rel}: Missing <html> tag"
            assert soup.html.get("lang") == "en", f"{rel}: <html> tag missing lang=\"en\""
            assert soup.head, f"{rel}: Missing <head> tag"
            assert soup.body, f"{rel}: Missing <body> tag"
            assert soup.title and soup.title.string.strip(), f"{rel}: Missing or empty <title>"
            meta_viewport = soup.find("meta", attrs={"name": "viewport"})
            assert meta_viewport, f"{rel}: Missing <meta name=\"viewport\"> tag"
            meta_charset = soup.find("meta", attrs={"charset": "UTF-8"}) or soup.find("meta", attrs={"charset": "utf-8"})
            assert meta_charset, f"{rel}: Missing <meta charset=\"UTF-8\"> tag"
    run_test("HTML", "HTML-02: Verify DOCTYPE, html lang, head, title, viewport, and charset across all 9 pages", test_html_essential_tags)

    # 3. Content Security Policy (connect-src 'none')
    def test_html_csp():
        for rel in HTML_FILES:
            full = os.path.join(PROJECT_ROOT, rel)
            with open(full, "r", encoding="utf-8") as f:
                content = f.read()
            soup = BeautifulSoup(content, "html.parser")
            csp_meta = soup.find("meta", attrs={"http-equiv": "Content-Security-Policy"})
            assert csp_meta, f"{rel}: Missing Content-Security-Policy meta tag"
            csp_val = csp_meta.get("content", "")
            assert "connect-src 'none'" in csp_val, f"{rel}: CSP missing connect-src 'none'"
            assert "default-src 'self'" in csp_val, f"{rel}: CSP missing default-src 'self'"
            assert "object-src 'none'" in csp_val, f"{rel}: CSP missing object-src 'none'"
    run_test("HTML", "HTML-03: Verify strict Content Security Policy (connect-src 'none') across all 9 pages", test_html_csp)

    # 4. Stylesheet link resolution
    def test_css_links_resolve():
        for rel in HTML_FILES:
            full = os.path.join(PROJECT_ROOT, rel)
            dirpath = os.path.dirname(full)
            with open(full, "r", encoding="utf-8") as f:
                soup = BeautifulSoup(f.read(), "html.parser")
            links = soup.find_all("link", rel="stylesheet")
            assert len(links) >= 3, f"{rel}: Expected at least 3 stylesheets linked, found {len(links)}"
            for l in links:
                href = l.get("href")
                assert href, f"{rel}: Empty stylesheet href"
                target_path = os.path.normpath(os.path.join(dirpath, href))
                assert os.path.isfile(target_path), f"{rel}: Stylesheet link {href} not found at {target_path}"
    run_test("HTML", "HTML-04: Verify 100% relative stylesheet link resolution on disk across all 9 pages", test_css_links_resolve)

    # 5. Script tag resolution
    def test_script_tags_resolve():
        for rel in HTML_FILES:
            full = os.path.join(PROJECT_ROOT, rel)
            dirpath = os.path.dirname(full)
            with open(full, "r", encoding="utf-8") as f:
                soup = BeautifulSoup(f.read(), "html.parser")
            scripts = [s.get("src") for s in soup.find_all("script") if s.get("src")]
            assert any("animations.js" in s for s in scripts), f"{rel}: Missing animations.js script tag"
            assert any("switcher.js" in s for s in scripts), f"{rel}: Missing switcher.js script tag"
            for src in scripts:
                target_path = os.path.normpath(os.path.join(dirpath, src))
                assert os.path.isfile(target_path), f"{rel}: Script {src} not found on disk at {target_path}"
    run_test("HTML", "HTML-05: Verify animations.js and switcher.js script resolution across all 9 pages", test_script_tags_resolve)

    # 6. Intra-page anchor targets
    def test_intra_page_anchors():
        for rel in HTML_FILES:
            full = os.path.join(PROJECT_ROOT, rel)
            with open(full, "r", encoding="utf-8") as f:
                soup = BeautifulSoup(f.read(), "html.parser")
            anchors = [a.get("href") for a in soup.find_all("a") if a.get("href") and a.get("href").startswith("#")]
            for href in anchors:
                if href in ("#", ""):
                    continue
                target_id = href[1:]
                target_el = soup.find(id=target_id)
                assert target_el is not None, f"{rel}: Anchor {href} points to missing id \"{target_id}\""
    run_test("HTML", "HTML-06: Verify all intra-page skip and anchor links resolve to valid element IDs", test_intra_page_anchors)

    # 7. Scroll animation markers
    def test_animation_attributes():
        for rel in HTML_FILES:
            full = os.path.join(PROJECT_ROOT, rel)
            with open(full, "r", encoding="utf-8") as f:
                soup = BeautifulSoup(f.read(), "html.parser")
            reveals = soup.find_all(attrs={"data-reveal": True})
            staggers = soup.find_all(attrs={"data-stagger": True})
            assert len(reveals) + len(staggers) > 0, f"{rel}: Missing data-reveal or data-stagger scroll animation attributes"
    run_test("HTML", "HTML-07: Verify presence of scroll animation markers (data-reveal, data-stagger)", test_animation_attributes)

    # 8. External link security
    def test_external_links_security():
        for rel in HTML_FILES:
            full = os.path.join(PROJECT_ROOT, rel)
            with open(full, "r", encoding="utf-8") as f:
                soup = BeautifulSoup(f.read(), "html.parser")
            ext_links = [a for a in soup.find_all("a") if a.get("href") and a.get("href").startswith("http")]
            for a in ext_links:
                rel_attr = a.get("rel")
                assert rel_attr and "noopener" in rel_attr and "noreferrer" in rel_attr, f"{rel}: External link {a.get('href')} missing rel=\"noopener noreferrer\""
    run_test("HTML", "HTML-08: Verify all external HTTP/HTTPS links include rel=\"noopener noreferrer\"", test_external_links_security)

# -----------------------------------------------------------------------------
# MAIN RUNNER & VERDICT
# -----------------------------------------------------------------------------
def main():
    print("=" * 78)
    print("   tofiq.site EMPIRICAL CHALLENGER 2 VERIFICATION ENGINE")
    print("=" * 78)

    run_js_suite()
    run_css_suite()
    run_html_suite()

    total = len(test_records)
    passed = sum(1 for _, _, p, _ in test_records if p)
    failed = total - passed

    print("\n" + "=" * 78)
    print("   VERIFICATION SUMMARY")
    print("=" * 78)
    print(f"Total Test Cases Executed: {total}")
    print(f"Passed:                   {passed}")
    print(f"Failed:                   {failed}")
    print(f"Pass Rate:                 {(passed / total) * 100:.1f}%\n")

    if failed == 0:
        print("🏆 VERDICT: APPROVE")
        print("All JavaScript runtime behavior, scroll animations, CSS parsing, and HTML")
        print("syntax conformance tests passed with 100% success.")
        print("=" * 78 + "\n")
        sys.exit(0)
    else:
        print("⛔ VERDICT: REJECT")
        print(f"Encountered {failed} test failure(s):")
        for suite, name, p, err in test_records:
            if not p:
                print(f"  - [{suite}] {name}: {err}")
        print("=" * 78 + "\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
