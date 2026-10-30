"""Verificações básicas para a página estática, sem acesso à rede."""

import collections
from html.parser import HTMLParser
from pathlib import Path
import re
import shutil
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[1]


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.tabs = []
        self.canvases = set()
        self.scripts = []
        self.script_sources = []
        self.in_inline_script = False
        self.lang = None
        self.viewport = False
        self.has_doctype = False

    def handle_decl(self, decl):
        if decl.lower() == "doctype html":
            self.has_doctype = True

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "html":
            self.lang = attrs.get("lang")
        if tag == "meta" and attrs.get("name", "").lower() == "viewport":
            self.viewport = True
        if tag == "button" and "data-tab" in attrs:
            self.tabs.append(attrs["data-tab"])
        if tag == "canvas" and "id" in attrs:
            self.canvases.add(attrs["id"])
        if tag == "script" and "src" in attrs:
            self.script_sources.append(attrs["src"])
        if tag == "script" and "src" not in attrs:
            self.in_inline_script = True
            self.scripts.append("")

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_inline_script = False

    def handle_data(self, data):
        if self.in_inline_script:
            self.scripts[-1] += data


class SiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.page = PageParser()
        cls.page.feed((ROOT / "index.html").read_text(encoding="utf-8"))
        cls.page.close()

    def test_basic_document_metadata(self):
        self.assertTrue(self.page.has_doctype)
        self.assertEqual(self.page.lang, "pt-BR")
        self.assertTrue(self.page.viewport)

    def test_ids_are_unique(self):
        duplicates = [key for key, count in collections.Counter(self.page.ids).items() if count > 1]
        self.assertEqual(duplicates, [])

    def test_tabs_have_content(self):
        self.assertTrue(self.page.tabs, "Nenhuma aba encontrada")
        self.assertEqual(len(self.page.tabs), len(set(self.page.tabs)), "Abas duplicadas")
        for tab in self.page.tabs:
            with self.subTest(tab=tab):
                self.assertIn("tab-" + tab, self.page.ids)

    def test_chart_targets_exist(self):
        chart_targets = re.findall(
            r"createChart\s*\(\s*document\.getElementById\(\s*['\"]([^'\"]+)['\"]\s*\)",
            "\n".join(self.page.scripts),
        )
        self.assertTrue(chart_targets, "Nenhum gráfico encontrado")
        for target in chart_targets:
            with self.subTest(chart=target):
                self.assertIn(target, self.page.canvases)

    def test_chart_library_is_local_and_available(self):
        self.assertIn("assets/vendor/chart.umd.js", self.page.script_sources)
        for src in self.page.script_sources:
            self.assertFalse(src.startswith(("http:", "https:")), f"Script externo: {src}")
            self.assertTrue((ROOT / src).is_file(), f"Script ausente: {src}")

    def test_inline_javascript_syntax(self):
        self.assertTrue(self.page.scripts, "Nenhum script embutido encontrado")
        self.assertIsNotNone(shutil.which("node"), "Node.js é necessário para verificar a sintaxe")
        for index, script in enumerate(self.page.scripts):
            with self.subTest(script=index):
                result = subprocess.run(
                    ["node", "--check"], input=script, text=True, capture_output=True, check=False
                )
                self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
