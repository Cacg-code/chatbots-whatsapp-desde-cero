#!/usr/bin/env python3
"""Revisión automática del sitio (solo biblioteca estándar de Python).

Comprueba:
  1. Que los enlaces y recursos locales (href/src) existan. Ignora los ejemplos dentro de <pre>/<code>.
  2. Que cada página tenga lang, title, description y un solo h1.
  3. Que todas las páginas estén en sitemap.xml.
  4. Que assets/indice.json (buscador) esté al día. Con --arreglar lo regenera.

Uso:  python scripts/revisar.py [--arreglar]
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ARREGLAR = "--arreglar" in sys.argv
sys.stdout.reconfigure(encoding="utf-8")
errores = []

paginas = sorted(p for p in RAIZ.rglob("*.html") if ".git" not in p.parts and "vendor" not in p.parts and "node_modules" not in p.parts)


def limpio(html):
    html = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    html = re.sub(r"data-lines='[^']*'", "", html)
    html = re.sub(r'<div class="hero-out"[^>]*>.*?</div>', "", html, flags=re.S)
    html = re.sub(r"<(pre|code|textarea|script|style)\b.*?</\1>", "", html, flags=re.S | re.I)
    return html


# 1 y 2 · enlaces y metadatos
for p in paginas:
    rel = p.relative_to(RAIZ).as_posix()
    crudo = p.read_text(encoding="utf8")
    html = limpio(crudo)
    if rel != "404.html":
        if 'lang="es"' not in crudo:
            errores.append(f"{rel}: falta lang=\"es\"")
        if "<title>" not in crudo:
            errores.append(f"{rel}: falta <title>")
        if 'name="description"' not in crudo:
            errores.append(f"{rel}: falta meta description")
        if len(re.findall(r"<h1[\s>]", html)) != 1:
            errores.append(f"{rel}: debe tener exactamente un <h1>")
    for m in re.finditer(r'<[a-z][^<>]*?\s(?:href|src)="([^"]+)"', html):
        u = m.group(1)
        if re.match(r"^(https?:|//|mailto:|tel:|data:|javascript:|#)", u) or u.startswith("/"):
            continue
        destino = (p.parent / u.split("#")[0].split("?")[0]).resolve()
        if u.split("#")[0] == "":
            continue
        if destino.is_dir():
            destino = destino / "index.html"
        if not destino.exists():
            errores.append(f"{rel}: enlace roto → {u}")

# 3 · sitemap
sitemap = (RAIZ / "sitemap.xml").read_text(encoding="utf8")
for p in paginas:
    rel = p.relative_to(RAIZ).as_posix()
    if rel == "404.html":
        continue
    ruta = rel[: -len("index.html")] if rel.endswith("index.html") else rel
    if f"/chatbots-whatsapp-desde-cero/{ruta}</loc>" not in sitemap:
        errores.append(f"sitemap.xml: falta {ruta or '/'}")

# 4 · índice del buscador
indice = []
for p in paginas:
    rel = p.relative_to(RAIZ).as_posix()
    if not rel.endswith("index.html") or rel == "index.html":
        continue
    m = re.search(r"<h1[^>]*>(.*?)</h1>", p.read_text(encoding="utf8"), re.S)
    titulo = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else rel
    curso = "Chatbots de WhatsApp"
    indice.append([rel[: -len("index.html")], titulo, curso])
destino = RAIZ / "assets" / "indice.json"
nuevo = json.dumps(indice, ensure_ascii=False, separators=(",", ":"))
if not destino.exists() or destino.read_text(encoding="utf8") != nuevo:
    if ARREGLAR:
        destino.write_text(nuevo, encoding="utf8")
        print("assets/indice.json regenerado")
    else:
        errores.append("assets/indice.json está desactualizado (ejecuta: python scripts/revisar.py --arreglar)")

if errores:
    print(f"✗ {len(errores)} problema(s):")
    for e in errores:
        print("  -", e)
    sys.exit(1)
print(f"✓ {len(paginas)} páginas revisadas, sin problemas")
