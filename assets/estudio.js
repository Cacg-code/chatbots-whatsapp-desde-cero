// Herramientas de estudio personal (todo se guarda en este navegador; la página funciona sin ellas).
// Mismo archivo en los dos cursos. Se carga desde curso.js.
(function () {
  var DIA = 86400000, PASOS = [1, 3, 7, 14];
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} },
    keys: function (pre) { var o = []; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(pre) === 0) o.push(k); } } catch (e) {} return o; }
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var json = function (s) { try { return JSON.parse(s); } catch (e) { return null; } };

  var css = document.createElement('style');
  css.textContent = [
    '.cuaderno{margin:2rem 0;padding:1.1rem 1.2rem;border:1px solid var(--border);border-radius:14px;background:var(--surface)}',
    '.cuaderno h2{margin-top:0}.cuaderno h3{margin:1.1rem 0 .3rem;font-size:1rem}',
    '.cuaderno label{display:block;font-weight:600;margin:.8rem 0 .3rem}',
    '.cuaderno textarea,.est-dlg textarea{width:100%;min-height:5.5rem;padding:.6rem .7rem;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font:inherit;resize:vertical;box-sizing:border-box}',
    '.cu-aviso,.cu-estado{color:var(--muted);font-size:.85rem}.cu-estado{display:block;margin-top:.5rem;min-height:1.1em}',
    '.est-card{margin:0 0 1.2rem;padding:1rem 1.1rem;border:1px dashed var(--accent);border-radius:14px;background:var(--surface)}',
    '.est-card h2{margin:0 0 .3rem;font-size:1.1rem}.est-card p{margin:.2rem 0 .7rem;color:var(--muted);font-size:.93rem}',
    '.est-acc{display:flex;flex-wrap:wrap;gap:.5rem}',
    '.est-dlg{max-width:min(640px,calc(100vw - 2rem));width:100%;max-height:85vh;overflow:auto;padding:1.2rem;border:1px solid var(--border);border-radius:16px;background:var(--surface);color:var(--text);box-sizing:border-box}',
    '.est-dlg::backdrop{background:rgba(0,0,0,.5)}',
    '.est-dlg h2{margin:0 0 .6rem;font-size:1.15rem}.est-dlg .opts{list-style:none;padding:0;margin:.6rem 0}.est-dlg .opts li{margin:.4rem 0}',
    '.est-dlg .opt{display:block;width:100%;text-align:left}',
    '.est-ent{margin:.8rem 0;padding:.7rem .9rem;border:1px solid var(--border);border-radius:10px}',
    '.est-ent h3{margin:0 0 .3rem;font-size:1rem}.est-ent pre{white-space:pre-wrap;margin:.2rem 0;font:inherit;color:var(--text)}.est-ent small{color:var(--muted)}',
    '.est-meta{color:var(--muted);font-size:.85rem}'
  ].join('');
  document.head.appendChild(css);

  // ---------- Lección: cuaderno + explícalo tú + registro de preguntas falladas ----------
  var btn = $('[data-complete]');
  var id = btn ? btn.getAttribute('data-complete') : null;
  var titulo = ($('article h1') || $('h1') || {}).textContent || document.title;

  function leerCuaderno(i) { return json(store.get('cuaderno:' + i)) || {}; }
  function guardarCuaderno(i, campo, valor) {
    var c = leerCuaderno(i); c[campo] = valor; c.t = titulo.trim(); c.u = location.pathname; c.ts = Date.now();
    if (!c.nota && !c.error && !c.explica) store.del('cuaderno:' + i); else store.set('cuaderno:' + i, JSON.stringify(c));
  }

  if (id) {
    var c = leerCuaderno(id);
    var sec = document.createElement('section');
    sec.className = 'cuaderno'; sec.setAttribute('aria-labelledby', 'cu-t');
    sec.innerHTML =
      '<h2 id="cu-t" style="counter-increment:none">📓 Mi cuaderno</h2>' +
      '<p class="cu-aviso">Solo tú lo ves: se guarda en este navegador. Escribir lo que entendiste es la mejor forma de estudiar.</p>' +
      '<label for="cu-nota">Lo que entendí y mis dudas</label><textarea id="cu-nota" data-k="nota" placeholder="Con tus palabras…"></textarea>' +
      '<label for="cu-error">Errores que cometí y cómo los resolví</label><textarea id="cu-error" data-k="error" placeholder="Ej.: olvidé cerrar la etiqueta y la página se veía rota…"></textarea>' +
      '<h3>🗣 Explícalo con tus palabras</h3>' +
      '<p class="cu-aviso">Sin mirar la lección, explica «' + esc(titulo.trim()) + '» como si se lo contaras a un amigo. Si te trabas, esa es la parte que debes repasar.</p>' +
      '<label for="cu-explica" class="sr-only" style="position:absolute;left:-9999px">Mi explicación</label><textarea id="cu-explica" data-k="explica" placeholder="Empieza con: «Esto sirve para…»"></textarea>' +
      '<span class="cu-estado" aria-live="polite"></span>';
    var anchor = $('.complete');
    anchor.parentNode.insertBefore(sec, anchor);
    var estado = $('.cu-estado', sec);
    $$('textarea', sec).forEach(function (ta) {
      var timer;
      ta.value = c[ta.getAttribute('data-k')] || '';
      ta.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { guardarCuaderno(id, ta.getAttribute('data-k'), ta.value.trim()); estado.textContent = 'Guardado ✓'; setTimeout(function () { estado.textContent = ''; }, 1500); }, 500);
      });
    });


    // Fuentes oficiales (lista opcional en fuentes.json, junto a este script)
    if (!/Para profundizar/.test(document.body.textContent)) {
      var base = (document.currentScript && document.currentScript.src) || ($$('script[src*="estudio.js"]')[0] || {}).src;
      if (base && window.fetch) {
        fetch(base.replace(/estudio\.js.*$/, 'fuentes.json')).then(function (r) { return r.ok ? r.json() : {}; }).then(function (d) {
          var l = d[id]; if (!l || !l.length) return;
          var box = document.createElement('div'); box.className = 'callout nota';
          box.innerHTML = '<p class="callout-title">📚 Para profundizar (fuentes oficiales)</p><ul>' + l.map(function (f) { return '<li><a href="' + esc(f[1]) + '" target="_blank" rel="noopener">' + esc(f[0]) + '</a></li>'; }).join('') + '</ul><p>Este material lo hace un estudiante con ayuda de IA: ante cualquier duda, manda la documentación oficial.</p>';
          sec.parentNode.insertBefore(box, sec);
        }).catch(function () {});
      }
    }

    // Quiz: guardar las preguntas falladas para repasarlas más adelante
    $$('.quiz-q').forEach(function (q, qi) {
      var opts = $$('.opt', q), key = 'repaso:' + id + ':' + qi;
      opts.forEach(function (o) {
        o.addEventListener('click', function () {
          var ok = o.hasAttribute('data-ok'), it = json(store.get(key));
          if (ok && !it) return;
          if (ok) { avanzar(key, it, true); return; }
          var ex = $('.explain', q), p = $('p', q);
          store.set(key, JSON.stringify({ q: p ? p.innerHTML : '', o: opts.map(function (x) { return x.innerHTML; }), a: opts.findIndex(function (x) { return x.hasAttribute('data-ok'); }), e: ex ? ex.innerHTML : '', n: 0, due: Date.now() + DIA, i: id, t: titulo.trim(), u: location.pathname }));
        });
      });
    });
  }

  function avanzar(key, it, acierto) {
    if (acierto) { it.n++; if (it.n >= PASOS.length) { store.del(key); return; } it.due = Date.now() + PASOS[it.n] * DIA; }
    else { it.n = 0; it.due = Date.now() + DIA; }
    store.set(key, JSON.stringify(it));
  }

  // ---------- Temario: tarjeta de repaso y cuaderno ----------
  var lessons = $('.lessons');
  if (lessons && $('[data-leccion]', lessons)) {
    var card = document.createElement('section');
    card.className = 'est-card'; card.setAttribute('aria-label', 'Repaso y cuaderno');
    lessons.parentNode.insertBefore(card, lessons);
    var pintar = function () {
      var rk = store.keys('repaso:'), hoy = rk.filter(function (k) { var it = json(store.get(k)); return it && it.due <= Date.now(); }), ck = store.keys('cuaderno:');
      card.innerHTML = '<h2>🔁 Repaso y cuaderno</h2>' +
        '<p>' + (rk.length ? 'Las preguntas que fallas en los quizzes vuelven a aparecer al día siguiente y luego a los 3, 7 y 14 días.' : 'Aquí aparecerán las preguntas que falles en los quizzes para repasarlas a los 1, 3, 7 y 14 días, y las notas de tu cuaderno.') + '</p>' +
        '<div class="est-acc">' +
        '<button type="button" class="btn" id="est-rep"' + (hoy.length ? '' : ' disabled') + '>' + (hoy.length ? 'Repasar hoy (' + hoy.length + ')' : 'Nada que repasar hoy') + '</button>' +
        '<button type="button" class="icon-btn" id="est-cua"' + (ck.length ? '' : ' disabled') + '>Mi cuaderno (' + ck.length + ')</button></div>';
      var r = $('#est-rep', card), cu = $('#est-cua', card);
      if (r && hoy.length) r.addEventListener('click', function () { repasar(hoy); });
      if (cu && ck.length) cu.addEventListener('click', verCuaderno);
    };
    pintar();

    var dialogo = function (html) {
      var d = document.createElement('dialog'); d.className = 'est-dlg'; d.innerHTML = html;
      document.body.appendChild(d);
      d.addEventListener('close', function () { d.remove(); pintar(); });
      if (d.showModal) d.showModal(); else d.setAttribute('open', '');
      return d;
    };

    var repasar = function (keys) {
      var cola = keys.slice(), hechas = 0, bien = 0, total = cola.length;
      var d = dialogo('<div></div>'), box = d.firstChild;
      var siguiente = function () {
        if (!cola.length) { box.innerHTML = '<h2>Repaso terminado</h2><p>Acertaste ' + bien + ' de ' + total + '.' + (bien === total ? ' ¡Excelente!' : ' Las falladas volverán mañana.') + '</p><button class="btn" type="button" id="est-x">Cerrar</button>'; $('#est-x', box).addEventListener('click', function () { d.close(); }); return; }
        var key = cola.shift(), it = json(store.get(key));
        if (!it) return siguiente();
        box.innerHTML = '<h2>Repaso ' + (++hechas) + ' de ' + total + '</h2><p class="est-meta">De la lección «' + esc(it.t) + '»</p><p>' + it.q + '</p><ul class="opts">' +
          it.o.map(function (o, i) { return '<li><button type="button" class="opt" data-i="' + i + '">' + o + '</button></li>'; }).join('') + '</ul><div class="est-ex"></div>';
        $$('.opt', box).forEach(function (b) {
          b.addEventListener('click', function () {
            var ok = +b.getAttribute('data-i') === it.a;
            $$('.opt', box).forEach(function (x) { x.disabled = true; if (+x.getAttribute('data-i') === it.a) x.classList.add('ok'); });
            if (!ok) b.classList.add('bad'); else bien++;
            avanzar(key, it, ok);
            $('.est-ex', box).innerHTML = '<p class="explain">' + it.e + '</p><div class="est-acc"><button type="button" class="btn" id="est-n">' + (cola.length ? 'Siguiente' : 'Terminar') + '</button> <a href="' + esc(it.u) + '">Ver lección</a></div>';
            $('#est-n', box).addEventListener('click', siguiente);
          });
        });
      };
      siguiente();
    };

    var verCuaderno = function () {
      var items = store.keys('cuaderno:').map(function (k) { return json(store.get(k)); }).filter(Boolean).sort(function (a, b) { return a.t < b.t ? -1 : 1; });
      var campos = [['nota', 'Lo que entendí y mis dudas'], ['error', 'Errores y cómo los resolví'], ['explica', 'Mi explicación']];
      var html = '<h2>📓 Mi cuaderno</h2><div class="est-acc"><button type="button" class="btn" id="est-md">Descargar .md</button><button type="button" class="icon-btn" id="est-x">Cerrar</button></div>';
      items.forEach(function (it) {
        html += '<div class="est-ent"><h3><a href="' + esc(it.u) + '">' + esc(it.t) + '</a></h3>' +
          campos.filter(function (f) { return it[f[0]]; }).map(function (f) { return '<small>' + f[1] + '</small><pre>' + esc(it[f[0]]) + '</pre>'; }).join('') + '</div>';
      });
      var d = dialogo(html);
      $('#est-x', d).addEventListener('click', function () { d.close(); });
      $('#est-md', d).addEventListener('click', function () {
        var md = '# Mi cuaderno\n\n' + items.map(function (it) {
          return '## ' + it.t + '\n\n' + campos.filter(function (f) { return it[f[0]]; }).map(function (f) { return '### ' + f[1] + '\n\n' + it[f[0]] + '\n'; }).join('\n');
        }).join('\n');
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); a.download = 'mi-cuaderno.md'; a.click(); URL.revokeObjectURL(a.href);
      });
    };
  }
})();
