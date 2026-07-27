#!/usr/bin/env python3
"""Dependency-free structural checks for THE PAN Browser Tools."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://tools.thepan.xyz/"
GTM_ID = "GTM-5W74796T"
REQUIRED = [
    "index.html", "styles.css", "app.js", "404.html", "robots.txt", "sitemap.xml",
    "about/index.html", "tools/index.html",
    "assets/css/tokens.css", "assets/css/base.css", "assets/css/components.css",
    "assets/js/analytics.js", "assets/js/consent.js", "assets/js/canvas-utils.js",
    "docs/DESIGN_SYSTEM.md", "docs/TOOL_TEMPLATE.md", "docs/ANALYTICS.md",
    "docs/RELEASE_CHECKLIST.md", ".github/workflows/pages.yml",
]
PAGES = {
    "index.html": BASE_URL,
    "tools/index.html": BASE_URL + "tools/",
    "about/index.html": BASE_URL + "about/",
}


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.canonical = None

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag in {"a", "link", "script"}:
            value = attributes.get("href") or attributes.get("src")
            if value:
                self.links.append(value)
        if tag == "link" and attributes.get("rel") == "canonical":
            self.canonical = attributes.get("href")


def internal_target(page_path, link):
    parsed = urlparse(link)
    if parsed.scheme or link.startswith(("#", "mailto:", "tel:")):
        return None
    clean = parsed.path
    if clean.startswith("/the-pan-browser-tools/"):
        clean = clean.removeprefix("/the-pan-browser-tools/")
        target = ROOT / clean
    elif clean.startswith("/"):
        return None
    else:
        target = (page_path.parent / clean).resolve()
    if str(link).endswith("/") or target.is_dir():
        target /= "index.html"
    return target


def main():
    errors = []
    for relative in REQUIRED:
        if not (ROOT / relative).is_file():
            errors.append(f"Missing required file: {relative}")

    if (ROOT / "test").exists():
        errors.append("Obsolete root test file exists")

    for relative, expected_canonical in PAGES.items():
        page = ROOT / relative
        if not page.is_file():
            continue
        text = page.read_text(encoding="utf-8")
        parser = PageParser()
        parser.feed(text)
        if parser.canonical != expected_canonical:
            errors.append(f"{relative}: canonical must be {expected_canonical}")
        if GTM_ID not in text:
            errors.append(f"{relative}: missing GTM container {GTM_ID}")
        if "googletagmanager.com/gtag/js" in text or "www.googletagmanager.com/gtag/js" in text:
            errors.append(f"{relative}: direct GA4 gtag.js is forbidden")
        for link in parser.links:
            target = internal_target(page, link)
            if target is not None and not target.exists():
                errors.append(f"{relative}: broken internal link {link}")

    sitemap = ROOT / "sitemap.xml"
    if sitemap.is_file():
        namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        try:
            urls = [node.text for node in ET.parse(sitemap).findall(".//sm:loc", namespace)]
        except ET.ParseError as error:
            errors.append(f"sitemap.xml: invalid XML ({error})")
            urls = []
        expected_urls = set(PAGES.values())
        if set(urls) != expected_urls:
            errors.append("sitemap.xml must contain exactly the real public pages")
        for url in urls:
            relative = url.removeprefix(BASE_URL).strip("/")
            target = ROOT / relative / "index.html" if relative else ROOT / "index.html"
            if not target.is_file():
                errors.append(f"sitemap.xml: page does not exist for {url}")

    if errors:
        print("Site checks failed:")
        for error in errors:
            print(f" - {error}")
        return 1
    print(f"Site checks passed: {len(REQUIRED)} required files, {len(PAGES)} public pages.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
