#!/usr/bin/env python3
"""Genera el sitio del curso a partir de contenido/*.md.

Uso:  python scripts/construir.py            (requiere: pip install markdown)

Entradas:
  contenido/curso.json        módulos y orden de lecciones
  contenido/NN-slug.md        lección
  contenido/NN-slug.ej.md     ejercicio de la lección (opcional)
  contenido/proyecto-*.md     proyecto final (con su .ej.md opcional)
Salidas: NN-slug/index.html, NN-slug/ejercicio.html, index.html, sitemap.xml
Formato de los .md: ver contenido/FORMATO.md
"""
import html
import json
import re
import sys
import unicodedata
from pathlib import Path

import markdown

RAIZ = Path(__file__).resolve().parent.parent
sys.stdout.reconfigure(encoding="utf-8")
CUR = json.loads((RAIZ / "contenido" / "curso.json").read_text(encoding="utf8"))
SITE = CUR["sitio"]            # nombre corto del curso
BASE = CUR["url"].rstrip("/") + "/"
REPO = CUR["repo"]             # Usuario/repo
PREF = "bot-"                  # prefijo de claves de progreso (comparten origen con otros cursos)
ICON = {"nota": "📌 Nota", "importante": "⚠️ Importante", "consejo": "💡", "ejemplo": "🧪 Ejemplo"}


def esc(s):
    return html.escape(s, quote=True)


def slug(s):
    s = unicodedata.normalize("NFD", re.sub(r"<[^>]+>", "", s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40] or "sec"


def inline(s):
    t = markdown.markdown(s.strip(), extensions=["sane_lists"])
    t = re.sub(r"^<p>(.*)</p>$", r"\1", t, flags=re.S)
    return t


def md_html(s):
    return markdown.markdown(s, extensions=["tables", "sane_lists"])


def front(texto):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", texto.replace("\r\n", "\n"), re.S)
    if not m:
        raise SystemExit("Falta el bloque --- de metadatos")
    meta, cur = {}, None
    for ln in m.group(1).split("\n"):
        if ln.startswith("- ") and cur:
            meta[cur].append(ln[2:].strip())
        elif ":" in ln:
            k, v = ln.split(":", 1)
            cur = k.strip()
            meta[cur] = v.strip() if v.strip() else []
    return meta, m.group(2)


def bloque_codigo(info, codigo):
    partes = info.split(None, 1)
    lang = partes[0] if partes else ""
    arg = partes[1].strip() if len(partes) > 1 else ""
    if lang in ("bash", "sh", "powershell", "cmd", "terminal"):
        cab = arg or "Terminal"
    elif lang == "salida":
        cab = "Salida esperada"
    else:
        cab = arg or {"js": "JavaScript", "json": "JSON", "toml": "wrangler.toml", "html": "HTML", "text": "Texto"}.get(lang, lang or "Código")
    boton = "" if lang == "salida" else '<button class="copy" type="button">Copiar</button>'
    return (f'<div class="code">\n  <div class="code-head"><span>{esc(cab)}</span>{boton}</div>\n'
            f'<pre><code>{esc(codigo.rstrip(chr(10)))}</code></pre>\n</div>')


def quiz_html(txt):
    preguntas = []
    for bloque in re.split(r"\n(?=\? )", txt.strip()):
        q = {"p": "", "o": [], "e": ""}
        for ln in bloque.split("\n"):
            if ln.startswith("? "):
                q["p"] = ln[2:]
            elif ln.startswith("+ "):
                q["o"].append((ln[2:], True))
            elif ln.startswith("- "):
                q["o"].append((ln[2:], False))
            elif ln.startswith("= "):
                q["e"] = ln[2:]
        if not q["p"] or sum(1 for _, ok in q["o"] if ok) != 1:
            raise SystemExit(f"Pregunta mal formada (necesita exactamente una opción +): {bloque[:60]}")
        preguntas.append(q)
    out = ['<section class="quiz" id="quiz" aria-labelledby="t-quiz">', '<h2 id="t-quiz">🧠 Comprueba lo aprendido</h2>',
           "<p>Elige una respuesta en cada pregunta. Verás al instante si acertaste y por qué.</p>"]
    for q in preguntas:
        ops = "".join(f'<li><button type="button" class="opt"{" data-ok" if ok else ""}>{inline(t)}</button></li>' for t, ok in q["o"])
        out.append(f'<div class="quiz-q"><p>{inline(q["p"])}</p><ul class="opts">{ops}</ul><p class="explain" hidden>{inline(q["e"])}</p></div>')
    out += ['<p class="quiz-score" aria-live="polite"></p>', "</section>"]
    return "\n".join(out)


def flujo_html(txt):
    partes = []
    for ln in txt.strip().split("\n"):
        ln = ln.strip()
        if ln.startswith("->"):
            partes.append(f'<div class="arrow">→<code>{esc(ln[2:].strip())}</code></div>' if ln[2:].strip() else '<div class="arrow">→</div>')
        elif ln:
            t, _, s = ln.partition("|")
            partes.append(f'<div class="node"><strong>{esc(t.strip())}</strong>' + (f"<span>{esc(s.strip())}</span>" if s else "") + "</div>")
    return '<div class="flow">' + "".join(partes) + "</div>"


def procesar(cuerpo):
    """Markdown con extensiones → HTML. Devuelve (html, secciones)."""
    guardados = []

    def guardar(h):
        guardados.append(h)
        return f"\n\nBLOQUE{len(guardados) - 1}FIN\n\n"

    # bloques con vallas (código, quiz, flujo)
    def valla(m):
        info, cod = m.group(1).strip(), m.group(2)
        lang = info.split(None, 1)[0] if info else ""
        if lang == "quiz":
            return guardar(quiz_html(cod))
        if lang == "flujo":
            return guardar(flujo_html(cod))
        return guardar(bloque_codigo(info, cod))

    cuerpo = re.sub(r"^```([^\n]*)\n(.*?)^```[ \t]*$", valla, cuerpo, flags=re.S | re.M)

    # callouts: > [!tipo] Título  + líneas con >
    def callout(m):
        tipo, titulo, resto = m.group(1), m.group(2).strip(), m.group(3)
        resto = "\n".join(re.sub(r"^>\s?", "", ln) for ln in resto.split("\n"))
        pref = ICON[tipo]
        tit = f"{pref} · {titulo}" if titulo and tipo != "consejo" else (f"{pref} {titulo}".strip())
        return guardar(f'<div class="callout {tipo}">\n<p class="callout-title">{esc(tit)}</p>\n{md_html(resto)}</div>')

    cuerpo = re.sub(r"^> \[!(nota|importante|consejo|ejemplo)\][ \t]*([^\n]*)\n((?:>.*\n?)*)", callout, cuerpo, flags=re.M)

    h = md_html(cuerpo)
    for i, g in enumerate(guardados):
        h = re.sub(rf"<p>BLOQUE{i}FIN</p>|BLOQUE{i}FIN", lambda _m, g=g: g, h)

    # h2 numerados con id, tablas con envoltorio
    secciones, n = [], [0]
    usados = set()

    def h2(m):
        t = m.group(1)
        if "t-quiz" in m.group(0):
            return m.group(0)
        n[0] += 1
        i = slug(t)
        while i in usados:
            i += "-2"
        usados.add(i)
        secciones.append((i, re.sub(r"<[^>]+>", "", t)))
        return f'<h2 id="{i}"><span class="n">{n[0]}.</span>{t}</h2>'

    h = re.sub(r"<h2>(.*?)</h2>", h2, h)
    h = re.sub(r"<table>.*?</table>", lambda m: f'<div class="table-wrap">{m.group(0)}</div>', h, flags=re.S)
    if 'id="quiz"' in h:
        secciones.append(("quiz", "Comprueba lo aprendido"))
    return h, secciones


# ---------------------------------------------------------------- plantillas
def cabecera(titulo, desc, ruta, prof, brand_href):
    url = BASE + ruta
    return f'''<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(titulo)}</title>
  <meta name="description" content="{esc(desc)}">
  <link rel="canonical" href="{url}">
  <link rel="icon" href="{prof}assets/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="{prof}manifest.webmanifest">
  <meta name="theme-color" content="#0b7a75">
  <meta name="color-scheme" content="light dark">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="{esc(SITE)}">
  <meta property="og:locale" content="es_LA">
  <meta property="og:title" content="{esc(titulo)}">
  <meta property="og:description" content="{esc(desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="https://cacg-code.github.io/chatbots-whatsapp-desde-cero/assets/compartir.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="{prof}assets/estilos.css">
</head>
<body>
  <a class="saltar" href="#contenido">Saltar al contenido</a>
  <header class="topbar">
    <a class="brand" href="{brand_href}"><span class="brand-logo"><img src="{prof}assets/favicon.svg" alt="" width="34" height="34"></span> {esc(SITE)}</a>
    <div class="topbar-actions">
      @@ACCIONES@@
      <button class="icon-btn" id="tema" type="button" aria-label="Cambiar entre tema claro y oscuro">◐ Tema</button>
    </div>
  </header>
'''


def pie(texto, ruta, prof, titulo):
    t = esc(titulo).replace(" ", "%20")
    return (f'  <footer class="site-footer">{esc(SITE)} · {texto} · Material elaborado con ayuda de inteligencia artificial.'
            f'<span class="foot-links"><a href="https://github.com/{REPO}/issues/new?title=%5BError%5D%20{t}&amp;pagina={BASE}{ruta}" target="_blank" rel="noopener">Reportar un error en esta página</a> · '
            f'<a href="https://github.com/{REPO}/issues/new" target="_blank" rel="noopener">Sugerencias y dudas</a> · '
            f'<a href="https://github.com/{REPO}/blob/main/LICENSE" target="_blank" rel="noopener">Licencia</a></span></footer>\n'
            f'  <script src="{prof}assets/curso.js"></script>\n</body>\n</html>\n')


# ---------------------------------------------------------------- orden del curso
ITEMS = []  # [(slug, modulo_idx, etiqueta)]
for mi, mod in enumerate(CUR["modulos"]):
    for s in mod["lecciones"]:
        ITEMS.append((s, mi))
if CUR.get("proyecto"):
    ITEMS.append((CUR["proyecto"], None))
INFO = {}
for s, _mi in ITEMS:
    ruta = RAIZ / "contenido" / f"{s}.md"
    if not ruta.exists():
        continue
    meta, _ = front(ruta.read_text(encoding="utf8"))
    INFO[s] = meta
ORDEN = [s for s, _ in ITEMS if s in INFO]


def etiqueta(s):
    return "PROYECTO FINAL" if s.startswith("proyecto") else f"LECCIÓN {s[:2]}"


def clave(s):
    return PREF + ("P" if s.startswith("proyecto") else s[:2])


def num(s):
    return "Proyecto final" if s.startswith("proyecto") else f"Lección {int(s[:2])}"


def vecinos(s):
    i = ORDEN.index(s)
    return (ORDEN[i - 1] if i else None), (ORDEN[i + 1] if i + 1 < len(ORDEN) else None)


# ---------------------------------------------------------------- lección
def construir_leccion(s):
    meta, cuerpo = front((RAIZ / "contenido" / f"{s}.md").read_text(encoding="utf8"))
    tiene_ej = (RAIZ / "contenido" / f"{s}.ej.md").exists()
    cuerpo_h, secs = procesar(cuerpo)
    titulo = meta["titulo"]
    ruta = f"{s}/"
    ant, sig = vecinos(s)
    h = cabecera(f"{titulo} · {SITE}", meta["resumen"], ruta, "../", "../")
    acc = '<a class="icon-btn nav-cursos" href="../#temario" style="text-decoration:none">Temario</a>'
    if tiene_ej:
        acc += '\n      <a class="icon-btn" href="ejercicio.html" style="text-decoration:none">Ir al ejercicio →</a>'
    h = h.replace("@@ACCIONES@@", acc)
    toc = "".join(f'<li><a href="#{i}">{esc(t)}</a></li>' for i, t in secs)
    obj = "".join(f"<li>{inline(o)}</li>" for o in meta.get("objetivos", []))
    meta_li = f'<li>⏱ {meta["minutos"]} minutos</li><li>📶 Nivel: {esc(meta["nivel"])}</li>' + ("<li>🧩 Incluye ejercicio</li>" if tiene_ej else "")
    h += f'''
  <main class="wrap lesson-layout" id="contenido">
    <nav class="toc" aria-label="Índice de la lección">
      <h4>En esta lección</h4>
      <ol>{toc}</ol>
    </nav>

    <article>
      <header class="lesson-head">
        <div class="breadcrumb"><a href="../">{esc(SITE)}</a> › {num(s)}</div>
        <h1>{esc(titulo)}</h1>
        <ul class="meta">{meta_li}</ul>
      </header>
<div class="callout consejo">
<p class="callout-title">💡 🎯 Al terminar esta lección podrás…</p>
<ul>{obj}</ul>
</div>

{cuerpo_h}

<div class="complete"><button class="btn" type="button" data-complete="{clave(s)}">Marcar como completada</button><p>Tu progreso se guarda en este navegador y se refleja en el índice del curso.</p></div>
'''
    if tiene_ej:
        h += '''
<div class="callout consejo">
<p class="callout-title">💡 🚀 ¡Ahora te toca!</p>
<p>La práctica fija lo aprendido. Pasa al ejercicio de esta lección.</p>
<p><a class="btn" href="ejercicio.html">Ir al ejercicio</a></p></div>
'''
    izq = f'<a href="../{ant}/"><small>← Anterior</small>{esc(INFO[ant]["titulo"])}</a>' if ant else '<a href="../"><small>← Inicio</small>Temario del curso</a>'
    if tiene_ej:
        der = '<a class="next" href="ejercicio.html"><small>Siguiente →</small>Ejercicio de esta lección</a>'
    elif sig:
        der = f'<a class="next" href="../{sig}/"><small>Siguiente →</small>{esc(INFO[sig]["titulo"])}</a>'
    else:
        der = '<a class="next" href="../"><small>Fin →</small>Volver al temario</a>'
    h += f'''
      <nav class="pager" aria-label="Navegación entre lecciones">
        {izq}
        {der}
      </nav>
    </article>
  </main>

'''
    h += pie(num(s), ruta, "../", f"{num(s)}: {titulo}")
    (RAIZ / s).mkdir(exist_ok=True)
    (RAIZ / s / "index.html").write_text(h, encoding="utf8")


# ---------------------------------------------------------------- ejercicio
def bloques_especiales(cuerpo):
    """Extrae ```pasos, ```pista, ```checks, ```solucion del cuerpo del ejercicio."""
    esp = {"pasos": "", "pistas": [], "checks": "", "solucion": []}

    def v(m):
        info, cod = m.group(1).strip(), m.group(2)
        lang, _, arg = info.partition(" ")
        if lang == "pasos":
            esp["pasos"] = cod
        elif lang == "pista":
            esp["pistas"].append((arg.strip(), cod))
        elif lang == "checks":
            esp["checks"] = cod
        elif lang == "solucion":
            esp["solucion"].append((arg.strip() or "solucion.js", cod))
        else:
            return m.group(0)
        return ""

    return re.sub(r"^```([^\n]*)\n(.*?)^```[ \t]*$", v, cuerpo, flags=re.S | re.M), esp


def construir_ejercicio(s):
    meta, cuerpo = front((RAIZ / "contenido" / f"{s}.ej.md").read_text(encoding="utf8"))
    lmeta = INFO[s]
    cuerpo, esp = bloques_especiales(cuerpo)
    cuerpo_h, _ = procesar(cuerpo)
    cuerpo_h = re.sub(r'<h2 id="[^"]*"><span class="n">\d+\.</span>(.*?)</h2>', r"<h2>\1</h2>", cuerpo_h)
    ruta = f"{s}/ejercicio.html"
    titulo = f"Ejercicio: {lmeta['titulo']}"
    ant, sig = vecinos(s)
    h = cabecera(f"Ejercicio · {lmeta['titulo']} · {SITE}", f"Ejercicio práctico de: {lmeta['titulo']}.", ruta, "../", "../")
    h = h.replace("@@ACCIONES@@", '<a class="icon-btn nav-cursos" href="../#temario" style="text-decoration:none">Temario</a>')
    h += f'''
  <main class="wrap" id="contenido" style="max-width:820px;padding-top:2rem;padding-bottom:3rem">
    <article>
      <header class="lesson-head">
        <div class="breadcrumb"><a href="../">{esc(SITE)}</a> › <a href="./">{num(s)}</a> › Ejercicio</div>
        <h1>{esc(titulo)}</h1>
        <ul class="meta"><li>⏱ {meta.get("minutos", lmeta["minutos"])} minutos</li><li>📶 Nivel: {esc(meta.get("nivel", lmeta["nivel"]))}</li></ul>
      </header>

{cuerpo_h}
'''
    checks = json.loads(esp["checks"]) if esp["checks"].strip() else None
    if checks:
        h += '''
<div class="playground js" data-js>
  <div class="pg-head"><span>▶ Prueba tu código aquí (opcional)</span><span class="pg-actions"><button type="button" data-run>Ejecutar</button><button type="button" data-reset>Restablecer</button></span></div>
  <div class="pg-body">
    <div><label>Código (edítalo y pulsa Ejecutar)</label><textarea class="pg-code" spellcheck="false" aria-label="Editor de JavaScript" style="height:300px">&lt;script&gt;
// Escribe aquí tus funciones y pruébalas con console.log
&lt;/script&gt;</textarea></div>
    <div><label>Página (resultado)</label><div class="pg-frame"></div></div>
  </div>
  <div class="pg-console"><div class="pg-console-head"><span>Consola</span><button type="button" data-clear>Limpiar</button></div><div class="pg-log" role="log" aria-live="polite"></div></div>
</div>
'''
    pasos = [ln.strip() for ln in esp["pasos"].split("\n") if ln.strip()]
    if pasos:
        li = "".join(f'<li><label><input type="checkbox" id="p{i}"><span>{inline(p)}</span></label></li>' for i, p in enumerate(pasos, 1))
        h += f'''
      <h2>Pasos</h2>
      <p>Marca cada paso a medida que lo completes. Tu avance se guarda en este navegador.</p>
      <div class="progress" aria-hidden="true"><div></div></div>
      <p id="progreso-texto" style="color:var(--muted);font-size:.9rem" aria-live="polite"></p>
      <ul class="checklist">{li}</ul>
'''
    for i, (t, c) in enumerate(esp["pistas"], 1):
        h += f"      <details><summary>💡 Pista {i}: {esc(t)}</summary>{md_html(c)}</details>\n"
    if checks:
        if isinstance(checks, list):
            checks = {"mode": "js", "scaffold": "", "width": 800, "checks": checks}
        datos = json.dumps(checks, ensure_ascii=False).replace("</", "<\\/")
        h += f'''
      <section class="checker" id="comprobador" aria-labelledby="t-chk">
        <h2 id="t-chk">🔎 Comprueba tu trabajo</h2>
        <p>Pega tu código y pulsa <strong>Comprobar</strong>. La revisión ocurre en tu navegador; nada se envía a ningún sitio. Cada punto en rojo incluye una pista. Pega solo el JavaScript, <strong>sin</strong> las etiquetas <code>&lt;script&gt;</code>.</p>
        <label for="chk-code">Tu código de JavaScript</label>
        <textarea id="chk-code" rows="10" spellcheck="false" placeholder="Pega aquí tus funciones"></textarea>
        <div class="chk-actions"><button class="btn" type="button" id="chk-run">Comprobar</button><button class="icon-btn" type="button" id="chk-clear">Limpiar</button></div>
        <p class="chk-sum" id="chk-sum" aria-live="polite"></p>
        <ul class="chk-list" id="chk-list"></ul>
        <script type="application/json" id="checks">{datos}</script>
      </section>
'''
    if esp["solucion"]:
        bl = "\n".join(bloque_codigo("js " + n, c) for n, c in esp["solucion"])
        h += f'''      <details>
        <summary>✅ Ver una solución posible</summary>
        <p>Intenta resolverlo antes de mirar. Tu versión puede ser distinta y también correcta.</p>
        {bl}
      </details>
'''
    if sig:
        der = f'<a class="next" href="../{sig}/"><small>Siguiente →</small>{esc(INFO[sig]["titulo"])}</a>'
    else:
        der = '<a class="next" href="../"><small>Fin →</small>Volver al temario</a>'
    h += f'''
      <nav class="pager" aria-label="Navegación entre lecciones">
        <a href="./"><small>← Anterior</small>Volver a {num(s).lower()}</a>
        {der}
      </nav>
    </article>
  </main>

'''
    h += pie(f"Ejercicio de {num(s).lower()}", ruta, "../", titulo)
    (RAIZ / s / "ejercicio.html").write_text(h, encoding="utf8")


# ---------------------------------------------------------------- portada
def construir_portada():
    P = CUR["portada"]
    h = cabecera(f"{P['titulo']} · {SITE}", P["descripcion"], "", "", "./")
    h = h.replace("@@ACCIONES@@", '<a class="icon-btn nav-cursos" href="simulador/" style="text-decoration:none">Simulador</a><a class="icon-btn nav-cursos" href="#temario" style="text-decoration:none">Temario</a>')
    total_min = sum(int(INFO[s]["minutos"]) for s in ORDEN)
    horas = round(total_min / 60)
    lineas = json.dumps(P["demo_lineas"], ensure_ascii=False)
    outs = json.dumps(P["demo_salidas"], ensure_ascii=False)
    feats = "".join(f'<div class="feature"><div class="emoji">{e}</div><h2>{esc(t)}</h2><p>{esc(d)}</p></div>' for e, t, d in P["rasgos"])
    antes = "".join(f"<li>{inline(x)}</li>" for x in P["antes"])
    haras = "".join(f"<li>{inline(x)}</li>" for x in P["construiras"])
    primera = ORDEN[0]
    h += f'''
  <main class="wrap" id="contenido">
    <div class="hero-grid">
      <div class="hero">
        <span class="eyebrow">Gratis · En español · {len([s for s in ORDEN if not s.startswith("proyecto")])} lecciones</span>
        <h1>{esc(P["titulo"])}</h1>
        <p>{esc(P["descripcion"])}</p>
        <a class="btn" href="{primera}/">Empezar la lección 1</a>
        <a class="btn secondary" href="#temario">Ver el temario</a>
        <div class="avance" id="avance"></div>
      </div>
      <div class="hero-visual">
       <div class="hero-demo" role="group" aria-label="Demostración: un bot que responde en consola">
        <div class="win-bar"><i></i><i></i><i></i></div>
        <pre id="typing" data-lines='{esc(lineas)}' data-outs='{esc(outs)}'></pre>
        <div class="hero-out" id="typing-out"></div>
       </div>
       <div class="chat-float" aria-hidden="true">
        <div class="bub in bub-1">Hola, ¿tienen mesa para hoy?</div>
        <div class="bub out bub-2">¡Claro! Soy el bot <span class="dots"><i></i><i></i><i></i></span></div>
        <div class="bub warm bub-3">Reservado ✅</div>
       </div>
      </div>
    </div>

    <section class="features" aria-label="Qué incluye el curso">{feats}</section>

    <div class="two-col">
      <section><h2 class="section-title" style="margin-top:0">Antes de empezar</h2><ul class="checks-list">{antes}</ul></section>
      <section><h2 class="section-title" style="margin-top:0">Lo que construirás</h2><ul class="checks-list">{haras}</ul></section>
    </div>

    <h2 class="section-title" id="temario">Temario · ≈ {horas} {"hora" if horas == 1 else "horas"}</h2>
'''
    h += '    <ul class="lessons">\n'
    for mi, mod in enumerate(CUR["modulos"]):
        ls = [s for s in mod["lecciones"] if s in INFO]
        if not ls:
            continue
        h += (f'      <li class="mod-head" style="grid-column:1/-1;margin-top:1.2rem"><h3 style="margin:0">Módulo {mi + 1} · {esc(mod["nombre"])}</h3>'
              f'<p style="color:var(--muted);margin:.2rem 0 0">{esc(mod["descripcion"])}</p></li>\n')
        for s in ls:
            h += tarjeta(s)
    if CUR.get("proyecto") and CUR["proyecto"] in INFO:
        h += '      <li class="mod-head" style="grid-column:1/-1;margin-top:1.2rem"><h3 style="margin:0">Cierre del curso</h3></li>\n' + tarjeta(CUR["proyecto"])
    h += "    </ul>\n"
    h += "  </main>\n\n" + pie("Temario", "", "", SITE)
    (RAIZ / "index.html").write_text(h, encoding="utf8")


def tarjeta(s):
    m = INFO[s]
    return (f'      <li><a class="lesson-card" href="{s}/" data-leccion="{clave(s)}">\n'
            f'        <span class="lesson-num">{etiqueta(s)}</span><h3>{esc(m["titulo"])}</h3>\n'
            f'        <p>{esc(m["resumen"])}</p><span class="tag open">Disponible</span></a></li>\n')


def construir_extras():
    urls = [BASE, f"{BASE}simulador/"] + [f"{BASE}{s}/" for s in ORDEN] + [f"{BASE}{s}/ejercicio.html" for s in ORDEN if (RAIZ / "contenido" / f"{s}.ej.md").exists()]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n"
    (RAIZ / "sitemap.xml").write_text(sm, encoding="utf8")
    (RAIZ / "manifest.webmanifest").write_text(json.dumps({
        "name": SITE, "short_name": "Bots WhatsApp", "description": CUR["portada"]["descripcion"], "lang": "es",
        "start_url": "./", "scope": "./", "display": "standalone", "background_color": "#08191c", "theme_color": "#0b7a75",
        "icons": [{"src": "assets/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
                  {"src": "assets/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]}, ensure_ascii=False, indent=2), encoding="utf8")
    (RAIZ / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n", encoding="utf8")


for s in ORDEN:
    construir_leccion(s)
    if (RAIZ / "contenido" / f"{s}.ej.md").exists():
        construir_ejercicio(s)
construir_portada()
construir_extras()
print(f"✓ {len(ORDEN)} lecciones generadas")
