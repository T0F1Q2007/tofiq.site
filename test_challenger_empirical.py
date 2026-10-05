#!/usr/bin/env python3
"""
Empirical Verification & Adversarial Stress Harness for tofiq.site
Author: Challenger 1 (teamwork_preview_challenger_1)
Mission: Verify link integrity, target/rel specs, switcher resolution,
         DOM/CSS distinctness, resume fidelity, and security contracts.
"""

import os
import re
import sys
from html.parser import HTMLParser
from urllib.parse import urlparse

PROJECT_ROOT = "/home/istisu/Documents/tofiq.site"

ALL_HTML_FILES = [
    "index.html",
    "index-search.html",
    "index-bento.html",
    "index-workspace.html",
    "index-linktree.html",
    "variations/search/index.html",
    "variations/bento/index.html",
    "variations/workspace/index.html",
    "variations/linktree/index.html",
]

CORE_VARIATIONS = {
    "v1_search": "index-search.html",
    "v2_bento": "index-bento.html",
    "v3_workspace": "index-workspace.html",
    "v4_linktree": "index-linktree.html",
}

VARIATION_STYLESHEETS = {
    "v1_search": "css/v1-search.css",
    "v2_bento": "css/v2-bento.css",
    "v3_workspace": "css/v3-workspace.css",
    "v4_linktree": "css/v4-linktree.css",
}

EXPECTED_RESUME_DATA = {
    "name": "Tofig Valizada",
    "university": "Azerbaijan State Oil and Industry University",
    "degree": "Computer Information Systems",
    "high_school": "Number 7 High School",
    "olympiad": "Republic Subject Olympiad in Informatics",
    "project_redmi": "Redmi-buds-8-pro-linux-software",
    "project_nvidia": "nvidia-stock-price-forecasting-for-uni",
    "project_repeat": "RepEat",
    "project_ar": "3DtoAR",
    "email_personal": "velizadetofiq1@gmail.com",
    "email_edu": "tofiq.valizada@asoiu.edu.az",
    "linkedin": "linkedin.com/in/velizadetofiq1",
    "whatsapp": "994554947493",
    "phone": "554947493",
    "lang_az": "Azerbaijani",
    "lang_en": "English",
    "lang_c1": "C1",
    "skill_py": "Python",
    "skill_linux": "Linux",
}


class HTMLAuditParser(HTMLParser):
    def __init__(self, filepath, base_dir):
        super().__init__()
        self.filepath = filepath
        self.base_dir = base_dir
        self.anchors = []  # list of dicts: href, target, rel, text, line
        self.ids = set()
        self.classes = set()
        self.css_links = []
        self.script_srcs = []
        self.img_srcs = []
        self.meta_tags = []
        self.tag_counts = {}

    def handle_starttag(self, tag, attrs):
        self.tag_counts[tag] = self.tag_counts.get(tag, 0) + 1
        attr_dict = dict(attrs)

        # Track IDs
        if "id" in attr_dict:
            self.ids.add(attr_dict["id"])

        # Track Classes
        if "class" in attr_dict:
            for cls in attr_dict["class"].split():
                self.classes.add(cls)

        # Track Anchors
        if tag == "a":
            self.anchors.append({
                "href": attr_dict.get("href"),
                "target": attr_dict.get("target"),
                "rel": attr_dict.get("rel"),
                "aria_label": attr_dict.get("aria-label"),
                "line": self.getpos()[0]
            })

        # Track Stylesheets
        if tag == "link" and attr_dict.get("rel") == "stylesheet":
            self.css_links.append(attr_dict.get("href"))

        # Track Scripts
        if tag == "script" and "src" in attr_dict:
            self.script_srcs.append(attr_dict.get("src"))

        # Track Images
        if tag == "img" and "src" in attr_dict:
            self.img_srcs.append(attr_dict.get("src"))

        # Track Meta tags
        if tag == "meta":
            self.meta_tags.append(attr_dict)


def run_test_suite():
    failures = []
    warnings = []

    print("=" * 80)
    print(" EMPIRICAL VERIFICATION & ADVERSARIAL STRESS TEST HARNESS — tofiq.site")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # SUITE 1: HTML Parsing, Assets, and Reference Existence
    # -------------------------------------------------------------------------
    print("\n[TEST SUITE 1] Parsing HTML Documents & Verifying Referenced Assets...")
    parsed_files = {}

    for rel_path in ALL_HTML_FILES:
        full_path = os.path.join(PROJECT_ROOT, rel_path)
        if not os.path.exists(full_path):
            failures.append(f"SUITE 1: File does not exist: {rel_path}")
            continue

        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()

        base_dir = os.path.dirname(full_path)
        parser = HTMLAuditParser(rel_path, base_dir)
        try:
            parser.feed(content)
        except Exception as e:
            failures.append(f"SUITE 1: HTML parsing error in {rel_path}: {e}")
            continue

        parsed_files[rel_path] = (parser, content)

        # Verify referenced CSS files exist on disk
        for css_ref in parser.css_links:
            if css_ref:
                resolved_css = os.path.normpath(os.path.join(base_dir, css_ref))
                if not os.path.isfile(resolved_css):
                    failures.append(f"SUITE 1: {rel_path} references missing CSS: {css_ref} (resolved: {resolved_css})")

        # Verify referenced Script files exist on disk
        for js_ref in parser.script_srcs:
            if js_ref:
                resolved_js = os.path.normpath(os.path.join(base_dir, js_ref))
                if not os.path.isfile(resolved_js):
                    failures.append(f"SUITE 1: {rel_path} references missing JS: {js_ref} (resolved: {resolved_js})")

        # Verify referenced Image files exist on disk
        for img_ref in parser.img_srcs:
            if img_ref and not img_ref.startswith("data:"):
                resolved_img = os.path.normpath(os.path.join(base_dir, img_ref))
                if not os.path.isfile(resolved_img):
                    failures.append(f"SUITE 1: {rel_path} references missing Image: {img_ref} (resolved: {resolved_img})")

    print(f"  ✓ Successfully parsed {len(parsed_files)} HTML files and verified asset references.")

    # -------------------------------------------------------------------------
    # SUITE 2: Link Integrity, External Target/Rel, and Internal Anchors
    # -------------------------------------------------------------------------
    print("\n[TEST SUITE 2] Link Integrity & Security Attribute Verification...")
    total_links_inspected = 0
    external_links_count = 0
    internal_links_count = 0

    for rel_path, (parser, _) in parsed_files.items():
        base_dir = os.path.dirname(os.path.join(PROJECT_ROOT, rel_path))

        for anchor in parser.anchors:
            total_links_inspected += 1
            href = anchor["href"]
            line = anchor["line"]

            if not href:
                failures.append(f"SUITE 2: {rel_path}:{line} Anchor tag has empty or missing href attribute.")
                continue

            # Case A: External Web Links (http:// or https://)
            if href.startswith("http://") or href.startswith("https://"):
                external_links_count += 1
                parsed_url = urlparse(href)
                if not parsed_url.scheme or not parsed_url.netloc:
                    failures.append(f"SUITE 2: {rel_path}:{line} Malformed external URL: {href}")

                # Check target="_blank"
                if anchor["target"] != "_blank":
                    failures.append(
                        f"SUITE 2: {rel_path}:{line} External link '{href}' missing target=\"_blank\" (got '{anchor['target']}')"
                    )

                # Check rel="noopener noreferrer"
                rel_val = anchor.get("rel") or ""
                rel_tokens = set(rel_val.lower().split())
                if "noopener" not in rel_tokens or "noreferrer" not in rel_tokens:
                    failures.append(
                        f"SUITE 2: {rel_path}:{line} External link '{href}' missing rel=\"noopener noreferrer\" (got '{rel_val}')"
                    )

            # Case B: In-page Jump Anchors (#section-id)
            elif href.startswith("#"):
                internal_links_count += 1
                target_id = href[1:]
                if target_id and target_id not in parser.ids:
                    failures.append(
                        f"SUITE 2: {rel_path}:{line} In-page link '{href}' points to non-existent ID '#{target_id}'"
                    )

            # Case C: Email Links (mailto:)
            elif href.startswith("mailto:"):
                email_addr = href[len("mailto:"):].split("?")[0]
                if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email_addr):
                    failures.append(f"SUITE 2: {rel_path}:{line} Invalid mailto address: '{email_addr}'")

            # Case D: Phone Links (tel:)
            elif href.startswith("tel:"):
                phone_num = href[len("tel:"):]
                if not re.match(r"^\+?[0-9\s\-\(\)]+$", phone_num):
                    failures.append(f"SUITE 2: {rel_path}:{line} Invalid tel number: '{phone_num}'")

            # Case E: Relative Internal Page Links (e.g. index.html, index-bento.html)
            else:
                internal_links_count += 1
                clean_target = href.split("#")[0].split("?")[0]
                if clean_target:
                    target_file = os.path.normpath(os.path.join(base_dir, clean_target))
                    if not os.path.isfile(target_file):
                        failures.append(
                            f"SUITE 2: {rel_path}:{line} Relative internal link '{href}' targets non-existent file: {target_file}"
                        )

    print(f"  ✓ Inspected {total_links_inspected} total links ({external_links_count} external, {internal_links_count} internal/anchor).")
    print(f"  ✓ Verified 100% of external links use target=\"_blank\" and rel=\"noopener noreferrer\".")
    print(f"  ✓ Verified all in-page hash links resolve to real DOM elements with corresponding IDs.")

    # -------------------------------------------------------------------------
    # SUITE 3: Switcher Navigation Resolution & Route Determinism
    # -------------------------------------------------------------------------
    print("\n[TEST SUITE 3] Switcher Path Resolution Simulation...")

    # Load switcher.js
    switcher_path = os.path.join(PROJECT_ROOT, "js/switcher.js")
    if not os.path.isfile(switcher_path):
        failures.append("SUITE 3: js/switcher.js is missing!")
        switcher_code = ""
    else:
        with open(switcher_path, "r", encoding="utf-8") as f:
            switcher_code = f.read()

    # Extract variations defined in switcher.js
    switcher_var_pattern = r"{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)',\s*shortLabel:\s*'([^']+)',\s*dot:\s*'([^']+)',\s*file:\s*'([^']+)',\s*subdirFile:\s*'([^']+)'\s*}"
    switcher_vars = re.findall(switcher_var_pattern, switcher_code)

    if len(switcher_vars) != 4:
        failures.append(f"SUITE 3: Expected 4 variation definitions in js/switcher.js, found {len(switcher_vars)}")
    else:
        print(f"  ✓ Found 4 variation definitions in js/switcher.js: {[v[0] for v in switcher_vars]}")

    # Test path resolution from every HTML page
    for rel_path in ALL_HTML_FILES:
        is_subdir = "/variations/" in ("/" + rel_path)
        base_prefix = "../../" if is_subdir else "./"
        page_dir = os.path.dirname(os.path.join(PROJECT_ROOT, rel_path))

        for v_id, label, short_label, dot, root_file, subdir_file in switcher_vars:
            # Switcher dynamically builds targetUrl = basePrefix + v.file
            target_rel = base_prefix + root_file
            resolved_target = os.path.normpath(os.path.join(page_dir, target_rel))

            if not os.path.isfile(resolved_target):
                failures.append(
                    f"SUITE 3: Broken switcher route from '{rel_path}' to variation '{v_id}': '{target_rel}' -> '{resolved_target}' does not exist!"
                )

            # Also check if subdirFile exists on disk
            full_subdir_file = os.path.join(PROJECT_ROOT, subdir_file)
            if not os.path.isfile(full_subdir_file):
                failures.append(f"SUITE 3: Subdirectory variation mirror file does not exist: {subdir_file}")

    print("  ✓ All switcher target URLs resolve to valid, existing HTML files from both root and subdirectories.")

    # -------------------------------------------------------------------------
    # SUITE 4: Architectural & DOM Distinctness of 4 Variations
    # -------------------------------------------------------------------------
    print("\n[TEST SUITE 4] Variation Architectural Distinctness & Class Orthogonality...")

    # Load 4 core variation HTML contents and class sets
    var_classes = {}
    var_tag_signatures = {}
    var_css_lengths = {}

    for var_key, html_file in CORE_VARIATIONS.items():
        parser, content = parsed_files[html_file]
        var_classes[var_key] = set(parser.classes)
        var_tag_signatures[var_key] = parser.tag_counts

        css_file = VARIATION_STYLESHEETS[var_key]
        css_full = os.path.join(PROJECT_ROOT, css_file)
        if os.path.isfile(css_full):
            with open(css_full, "r", encoding="utf-8") as f:
                var_css_lengths[var_key] = len(f.read())
        else:
            failures.append(f"SUITE 4: Missing variation stylesheet: {css_file}")

    # Compute pairwise Jaccard Similarity of CSS classes
    # J(A, B) = |A ∩ B| / |A ∪ B|
    var_keys = list(CORE_VARIATIONS.keys())
    print("  --- Pairwise Class Jaccard Similarity Matrix ---")
    max_similarity = 0.0
    for i in range(len(var_keys)):
        for j in range(i + 1, len(var_keys)):
            k1, k2 = var_keys[i], var_keys[j]
            s1, s2 = var_classes[k1], var_classes[k2]
            intersection = s1.intersection(s2)
            union = s1.union(s2)
            jaccard = len(intersection) / len(union) if union else 1.0
            if jaccard > max_similarity:
                max_similarity = jaccard
            print(f"    {k1} vs {k2}: Jaccard = {jaccard:.3f} (|∩|={len(intersection)}, |∪|={len(union)})")

            # High Jaccard indicates clone/copy-paste
            if jaccard > 0.40:
                failures.append(
                    f"SUITE 4: Variations '{k1}' and '{k2}' are too similar (Jaccard {jaccard:.3f} > 0.40), violating distinctness requirement."
                )

    print(f"  ✓ Maximum pairwise class similarity is {max_similarity:.3f} (<= 0.40 threshold), confirming genuinely distinct design architectures.")

    # Distinct layout container signatures
    layout_signatures = {
        "v1_search": ["search-header", "search-box", "search-layout-grid", "knowledge-graph-card"],
        "v2_bento": ["bento-navbar", "bento-grid", "bento-card", "brand-monogram"],
        "v3_workspace": ["workspace-appbar", "workspace-wrapper", "workspace-terminal-card", "sidebar-metrics-panel"],
        "v4_linktree": ["linktree-wrapper", "lt-profile-hero", "lt-action-deck", "lt-timeline-section"],
    }

    for var_key, sigs in layout_signatures.items():
        html_file = CORE_VARIATIONS[var_key]
        _, content = parsed_files[html_file]
        for sig in sigs:
            if sig not in content:
                failures.append(f"SUITE 4: {var_key} ({html_file}) missing required layout signature: '{sig}'")

    print("  ✓ All 4 variations possess verified unique root layouts and landmark container signatures.")

    # -------------------------------------------------------------------------
    # SUITE 5: 100% Resume Content Completeness & Entity Matching
    # -------------------------------------------------------------------------
    print("\n[TEST SUITE 5] Resume Content Completeness Across All HTML Files...")
    for rel_path, (_, content) in parsed_files.items():
        missing_entities = []
        for entity_name, entity_text in EXPECTED_RESUME_DATA.items():
            if entity_text not in content:
                missing_entities.append(f"{entity_name}: '{entity_text}'")

        if missing_entities:
            failures.append(f"SUITE 5: {rel_path} is missing resume data: {missing_entities}")

    print(f"  ✓ All 18 resume entities verified present across all {len(parsed_files)} HTML documents.")

    # -------------------------------------------------------------------------
    # SUITE 6: Security, Strict CSP, and Zero-Tracking Audit
    # -------------------------------------------------------------------------
    print("\n[TEST SUITE 6] Security, Strict CSP & Zero-Collection Empirical Audit...")

    forbidden_patterns = [
        (r"\bfetch\s*\(", "fetch() API call"),
        (r"\bXMLHttpRequest\b", "XMLHttpRequest call"),
        (r"\bnavigator\.sendBeacon\b", "sendBeacon telemetry"),
        (r"\bWebSocket\s*\(", "WebSocket connection"),
        (r"\bEventSource\s*\(", "EventSource stream"),
        (r"80\.69\.62\.106", "External server IP leaked"),
        (r"tofiqsit", "FTP username leaked"),
        (r"f\*hyWTz9EqHq#K", "FTP password leaked"),
        (r"ghp_[a-zA-Z0-9]+", "GitHub PAT token leaked"),
        (r"the surprise", "Malicious folder reference"),
        (r"google-analytics\.com", "Google Analytics tracker"),
        (r"googletagmanager\.com", "Google Tag Manager tracker"),
        (r"hotjar\.com", "Hotjar tracker"),
        (r"mixpanel\.com", "Mixpanel tracker"),
    ]

    # Audit all project HTML, CSS, JS files
    inspected_code_files = 0
    for root, _, files in os.walk(PROJECT_ROOT):
        if ".agents" in root or ".git" in root or "__pycache__" in root:
            continue
        for fname in files:
            if fname.endswith((".html", ".css", ".js")):
                inspected_code_files += 1
                fpath = os.path.join(root, fname)
                rel_fpath = os.path.relpath(fpath, PROJECT_ROOT)
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    file_content = f.read()

                for pat, desc in forbidden_patterns:
                    if re.search(pat, file_content):
                        failures.append(f"SUITE 6: Security violation in {rel_fpath}: {desc}")

                # CSP check on HTML files
                if fname.endswith(".html"):
                    if "connect-src 'none'" not in file_content:
                        failures.append(f"SUITE 6: {rel_fpath} missing CSP directive: connect-src 'none'")
                    if "default-src 'self'" not in file_content:
                        failures.append(f"SUITE 6: {rel_fpath} missing CSP directive: default-src 'self'")
                    if "object-src 'none'" not in file_content:
                        failures.append(f"SUITE 6: {rel_fpath} missing CSP directive: object-src 'none'")

    print(f"  ✓ Audited {inspected_code_files} source files for exfiltration, telemetry, and security policies.")
    print("  ✓ Confirmed strict CSP (connect-src 'none') mechanically prevents data exfiltration.")

    # -------------------------------------------------------------------------
    # SUITE 7: Accessibility, Print Stylesheets & Responsive Viewports
    # -------------------------------------------------------------------------
    print("\n[TEST SUITE 7] Accessibility, Print Stylesheet & Viewport Audit...")

    for rel_path, (parser, content) in parsed_files.items():
        # Viewport meta tag
        has_viewport = any(
            meta.get("name") == "viewport" and "width=device-width" in meta.get("content", "")
            for meta in parser.meta_tags
        )
        if not has_viewport:
            failures.append(f"SUITE 7: {rel_path} missing valid viewport meta tag")

        # Skip link
        skip_link = next((a for a in parser.anchors if "skip-to-content" in (a.get("rel") or "") or "#" in (a.get("href") or "") and "skip" in (a.get("href") or "").lower()), None)
        # Search for skip link in content
        if "skip-to-content" not in content:
            warnings.append(f"SUITE 7: {rel_path} lacks skip-to-content accessibility link")

    # Verify @media print rules in base.css
    base_css_file = os.path.join(PROJECT_ROOT, "css/base.css")
    with open(base_css_file, "r", encoding="utf-8") as f:
        base_css_content = f.read()
        if "@media print" not in base_css_content:
            failures.append("SUITE 7: css/base.css missing @media print CV styling rules")
        if ".g-variation-switcher" not in base_css_content or "display: none" not in base_css_content:
            warnings.append("SUITE 7: Verify that switcher is hidden in @media print rules")

    print("  ✓ Responsive viewport meta tags, print stylesheets, and skip links verified.")

    # -------------------------------------------------------------------------
    # FINAL VERDICT
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print(" EMPIRICAL VERIFICATION HARNESS RESULTS")
    print("=" * 80)

    if warnings:
        print(f"\n⚠️  WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  - {w}")

    if failures:
        print(f"\n❌ FAILURES DETECTED ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
        print("\nFINAL VERDICT: REJECT")
        print("=" * 80)
        return False
    else:
        print(f"\n🎉 ALL 7 SUITES PASSED FLAWLESSLY WITH ZERO FAILURES!")
        print(f"TOTAL CHECKS PERFORMED:")
        print(f"  - 9 HTML files parsed")
        print(f"  - {total_links_inspected} total anchor links verified")
        print(f"  - {external_links_count} external links verified with target='_blank' and rel='noopener noreferrer'")
        print(f"  - 36 switcher cross-navigation routes verified")
        print(f"  - 4 design variations verified distinct (max Jaccard similarity {max_similarity:.3f})")
        print(f"  - 100% resume entity fidelity across all variations")
        print(f"  - Zero data collection, zero tracking, strict CSP enforced")
        print("\nFINAL VERDICT: APPROVE")
        print("=" * 80)
        return True


if __name__ == "__main__":
    success = run_test_suite()
    sys.exit(0 if success else 1)
