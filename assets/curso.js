// Curso de HTML · interacciones mínimas (todo es opcional, la página funciona sin JS)
(function () {
  // Configuración del sitio: escribe aquí tu código de GoatCounter para activar las estadísticas (sin cookies).
  var CONFIG = { goatcounter: '' };
  var root = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // Tema claro / oscuro
  var saved = store.get('tema');
  if (saved) root.setAttribute('data-theme', saved);
  var themeBtn = document.getElementById('tema');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var dark = root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    var next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('tema', next);
  });

  // Botones "Copiar" en los bloques de código
  document.querySelectorAll('.code').forEach(function (block) {
    var btn = block.querySelector('.copy');
    var code = block.querySelector('pre code');
    if (!btn || !code) return;
    btn.addEventListener('click', function () {
      var done = function () { btn.textContent = '¡Copiado!'; setTimeout(function () { btn.textContent = 'Copiar'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(code.innerText).then(done);
    });
  });

  // Índice lateral: resalta la sección visible
  var links = document.querySelectorAll('.toc a');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          links.forEach(function (l) { l.classList.remove('active'); });
          map[e.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  // Checklist con progreso guardado en el navegador
  var boxes = document.querySelectorAll('.checklist input');
  var bar = document.querySelector('.progress > div');
  var label = document.getElementById('progreso-texto');
  function update() {
    var done = 0;
    boxes.forEach(function (b) { if (b.checked) done++; });
    if (bar) bar.style.width = (boxes.length ? done / boxes.length * 100 : 0) + '%';
    if (label) label.textContent = done + ' de ' + boxes.length + ' pasos completados';
  }
  boxes.forEach(function (b) {
    var key = 'check:' + location.pathname + ':' + b.id;
    b.checked = store.get(key) === '1';
    b.addEventListener('change', function () { store.set(key, b.checked ? '1' : '0'); update(); });
  });
  update();

  // ---------- Animaciones y componentes (v2) ----------
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  // Barra de progreso de lectura
  if (document.querySelector('article')) {
    var rp = document.createElement('div');
    rp.className = 'read-progress';
    document.body.appendChild(rp);
    var onScroll = function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      rp.style.width = (h > 0 ? scrollY / h * 100 : 0) + '%';
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Aparición al hacer scroll
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll('article h2, article .callout, article .code, article .table-wrap, article .demo, article .apuntes, article .quiz, article .playground, article details, article .steps, .feature');
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el) { el.classList.add('reveal'); rio.observe(el); });
  }

  // Diagramas de anatomía: animación escalonada
  document.querySelectorAll('.anatomy').forEach(function (a) {
    a.querySelectorAll('.part').forEach(function (p, i) { p.style.setProperty('--i', i); });
    if ('IntersectionObserver' in window && !reduce) {
      var aio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { a.classList.add('in'); aio.disconnect(); } });
      }, { threshold: .4 });
      aio.observe(a);
    }
  });

  // ---------- Soporte de React (Babel y React se cargan solo cuando hacen falta) ----------
  var ASSETS = (document.currentScript && document.currentScript.src) ? new URL('.', document.currentScript.src).href : '';
  var babelP = null;
  var loadBabel = function () {
    if (window.Babel) return Promise.resolve(window.Babel);
    if (!babelP) babelP = new Promise(function (ok, ko) {
      var s = document.createElement('script'); s.src = ASSETS + 'vendor/babel.min.js';
      s.onload = function () { ok(window.Babel); }; s.onerror = function () { babelP = null; ko(new Error('No se pudo cargar el compilador de JSX. Revisa tu conexión.')); };
      document.head.appendChild(s);
    });
    return babelP;
  };
  var REACT_LIBS = function () { return '<script src="' + ASSETS + 'vendor/react.development.js"><\/script><script src="' + ASSETS + 'vendor/react-dom.development.js"><\/script>'; };
  var REACT_PRE = '<script>(function(){var R=window.React,D=window.ReactDOM;if(!R||!D){console.error("No se pudo cargar React.");return}' +
    '["useState","useEffect","useLayoutEffect","useRef","useMemo","useCallback","useReducer","useContext","useId","createContext","Fragment","memo","forwardRef","StrictMode","Children","cloneElement","createElement","isValidElement","useTransition","useDeferredValue"].forEach(function(k){if(R[k])window[k]=R[k]});window.createRoot=D.createRoot;' +
    'var fx=function(a){a=[].slice.call(a);if(typeof a[0]==="string"&&/%[sdoOif]/.test(a[0])){var i=1;a[0]=a[0].replace(/%[sdoOif]/g,function(t){return i<a.length?String(a[i++]):t});a=[a[0]]}if(typeof a[0]==="string")a[0]=a[0].split("\\n").filter(function(l){return !/^\\s+at /.test(l)}).join("\\n").trim();return a};' +
    'window.__warns=[];["error","warn"].forEach(function(m){var o=console[m];console[m]=function(){var a=fx(arguments);window.__warns.push(String(a[0]));o.apply(console,a)}});var oi=console.info;console.info=function(){if(/React DevTools/.test(arguments[0]))return;oi.apply(console,arguments)}})();<\/script>';
  var REACT_STYLE = '<style>body{font:16px/1.5 system-ui,sans-serif;padding:14px}button{font:inherit;cursor:pointer}input,select,textarea{font:inherit}</style>';
  // Convierte el código del alumno (JSX con imports opcionales) en JavaScript ejecutable
  var compileReact = function (B, code) {
    var src = code.replace(/^\s*import\s+[^;]*?\s+from\s+['"](?:react|react-dom|react-dom\/client)['"]\s*;?[ \t]*$/gm, '')
                  .replace(/^\s*import\s+['"][^'"]+\.css['"]\s*;?[ \t]*$/gm, '')
                  .replace(/^\s*export\s+default\s+function\s+/gm, 'function ')
                  .replace(/^\s*export\s+default\s+(\w+)\s*;?[ \t]*$/gm, '')
                  .replace(/^\s*export\s+(?=function|const|let)/gm, '');
    var out = B.transform(src, { presets: [['react', { runtime: 'classic' }]] }).code;
    if (!/createRoot\s*\(|\.render\s*\(/.test(out)) {
      out += '\n;(function(){if(typeof App==="function"){createRoot(document.getElementById("root")).render(React.createElement(App))}else{console.warn("Define un componente llamado App para verlo aquí.")}})();';
    }
    return out;
  };
  var babelMsg = function (e) {
    var m = String(e && e.message || e).split('\n')[0].replace(/^unknown: /, '');
    if (/Adjacent JSX elements/.test(m)) m += ' → Devuelve un solo elemento raíz: envuélvelos en <div>…</div> o en <>…</>.';
    else if (/Expected corresponding JSX closing tag|Unterminated JSX/.test(m)) m += ' → Falta cerrar una etiqueta (o está mal escrita).';
    else if (/Unexpected token|Unexpected reserved|Missing semicolon/.test(m)) m += ' → Revisa llaves { }, paréntesis ( ) y comas cerca de esa posición.';
    return m;
  };

  // Zona de práctica en vivo
  var BASE = '<meta charset="utf-8"><style>body{font:16px/1.6 system-ui,sans-serif;color:#1e2235;padding:12px;margin:0}img{max-width:100%;height:auto}table{border-collapse:collapse}</style>';
  document.querySelectorAll('.playground').forEach(function (pg) {
    var ta = pg.querySelector('.pg-code'), fr = pg.querySelector('.pg-out'), rs = pg.querySelector('[data-reset]');
    if (!ta || !fr) return;
    var original = ta.value, t;
    var render = function () { fr.srcdoc = BASE + ta.value; };
    ta.addEventListener('input', function () { clearTimeout(t); t = setTimeout(render, 150); });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        var s = ta.selectionStart;
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = s + 2;
        render();
      }
    });
    if (rs) rs.addEventListener('click', function () { ta.value = original; render(); });
    render();
  });

  // Autoevaluación
  document.querySelectorAll('.quiz').forEach(function (quiz) {
    var qs = quiz.querySelectorAll('.quiz-q'), score = quiz.querySelector('.quiz-score'), answered = 0, right = 0;
    qs.forEach(function (q) {
      var opts = q.querySelectorAll('.opt'), ex = q.querySelector('.explain');
      opts.forEach(function (o) {
        o.addEventListener('click', function () {
          opts.forEach(function (x) { x.disabled = true; if (x.hasAttribute('data-ok')) x.classList.add('ok'); });
          if (o.hasAttribute('data-ok')) right++; else o.classList.add('bad');
          if (ex) ex.hidden = false;
          answered++;
          if (score && answered === qs.length) score.textContent = 'Resultado: ' + right + ' de ' + qs.length + (right === qs.length ? ' · ¡Excelente!' : right >= qs.length / 2 ? ' · Muy bien, repasa lo que falló.' : ' · Vuelve a leer la lección y prueba de nuevo.');
        });
      });
    });
  });

  // Marcar lección completada
  document.querySelectorAll('[data-complete]').forEach(function (btn) {
    var key = 'leccion:' + btn.getAttribute('data-complete');
    var paint = function (on) { btn.classList.toggle('done', on); btn.textContent = on ? 'Lección completada' : 'Marcar como completada'; };
    paint(store.get(key) === '1');
    btn.addEventListener('click', function () { var on = store.get(key) !== '1'; store.set(key, on ? '1' : '0'); paint(on); });
  });
  var cards = document.querySelectorAll('[data-leccion]'), total = cards.length, done = 0;
  cards.forEach(function (c) {
    if (store.get('leccion:' + c.getAttribute('data-leccion')) === '1') {
      done++; c.classList.add('done');
      var tag = c.querySelector('.tag'); if (tag) { tag.textContent = '✓ Completada'; tag.className = 'tag done'; }
    }
  });
  var av = document.getElementById('avance');
  if (av && total) av.innerHTML = 'Tu avance: <strong>' + done + ' de ' + total + '</strong> lecciones completadas<div class="progress"><div style="width:' + (done / total * 100) + '%"></div></div>';

  // Hero: código que se escribe solo
  var typing = document.getElementById('typing'), out = document.getElementById('typing-out');
  if (typing && out) {
    var lines = JSON.parse(typing.getAttribute('data-lines'));
    var outs = typing.hasAttribute('data-outs') ? JSON.parse(typing.getAttribute('data-outs')) : null;
    var fin = function () { typing.classList.remove('caret'); };
    var logLine = function (t) { var d = document.createElement('div'); d.className = 'hero-log'; d.textContent = t; out.appendChild(d); };
    if (reduce) { typing.textContent = lines.join('\n'); if (outs) { out.innerHTML = ''; outs.forEach(function (t) { if (t) logLine(t); }); } else out.innerHTML = lines.join(''); }
    else {
      typing.textContent = ''; out.innerHTML = ''; typing.classList.add('caret');
      var li = 0, ci = 0;
      var step = function () {
        if (li >= lines.length) return fin();
        var ln = lines[li];
        if (ci < ln.length) { typing.textContent += ln[ci++]; setTimeout(step, 28); }
        else { if (outs) { if (outs[li]) logLine(outs[li]); } else out.insertAdjacentHTML('beforeend', ln); typing.textContent += '\n'; li++; ci = 0; setTimeout(step, 450); }
      };
      setTimeout(step, 600);
    }
  }

  // ---------- Comprobador de ejercicios ----------
  var cfgEl = document.getElementById('checks');
  if (cfgEl) {
    var cfg = JSON.parse(cfgEl.textContent);
    var cta = document.getElementById('chk-code'), clist = document.getElementById('chk-list'), csum = document.getElementById('chk-sum');
    var ckey = 'borrador:' + location.pathname;
    var saved2 = store.get(ckey); if (saved2) cta.value = saved2;
    cta.addEventListener('input', function () { store.set(ckey, cta.value); });

    var q = function (doc, sel) { try { return [].slice.call(doc.querySelectorAll(sel)); } catch (e) { return []; } };
    var special = {
      anclas: function (doc) {
        var l = q(doc, 'a[href^="#"]').filter(function (a) { return a.getAttribute('href').length > 1; });
        return l.length > 0 && l.every(function (a) { return doc.getElementById(a.getAttribute('href').slice(1)); });
      },
      labels: function (doc) {
        var l = q(doc, 'label[for]');
        return l.length > 0 && l.every(function (x) { var t = doc.getElementById(x.getAttribute('for')); return t && /^(input|select|textarea)$/i.test(t.tagName); });
      },
      names: function (doc) {
        var f = q(doc, 'input, select, textarea').filter(function (e) { return !/^(submit|reset|button)$/i.test(e.getAttribute('type') || ''); });
        return f.length > 0 && f.every(function (e) { return (e.getAttribute('name') || '').trim() !== ''; });
      },
      img: function (doc) {
        var l = q(doc, 'img');
        return l.length > 0 && l.every(function (i) { return i.getAttribute('src') && i.hasAttribute('alt') && (i.getAttribute('alt').trim() !== '' || i.getAttribute('alt') === '') ; }) && l.some(function (i) { return i.getAttribute('alt').trim() !== '' && i.getAttribute('width') && i.getAttribute('height'); });
      },
      secciones: function (doc) { return q(doc, 'table thead').length > 0 && q(doc, 'table tbody').length > 0 && q(doc, 'table tfoot').length > 0; },
      radios: function (doc) {
        return q(doc, 'fieldset').some(function (f) {
          var r = q(f, 'input[type="radio"]'); return f.querySelector('legend') && r.length >= 2 && r.every(function (x) { return x.getAttribute('name') === r[0].getAttribute('name') && r[0].getAttribute('name'); });
        });
      },
      botones: function (doc) { return q(doc, 'button[type="submit"]').length > 0 && q(doc, 'button[type="reset"]').length > 0; },
      nav: function (doc) { return q(doc, 'nav[aria-label]').some(function (n) { return n.querySelectorAll('a').length >= 3; }); },
      sections: function (doc) { var s = q(doc, 'main section').filter(function (x) { return x.querySelector('h2'); }); return s.length >= 2; },
      sections3: function (doc) { var s = q(doc, 'section').filter(function (x) { return x.querySelector('h2'); }); return s.length >= 3; },
      audiosrc: function (doc) { return q(doc, 'audio[src], audio source[src]').length > 0; },
      picture: function (doc) { return q(doc, 'picture').some(function (pc) { var i = pc.querySelector('img'); return pc.querySelector('source[media], source[type]') && i && (i.getAttribute('alt') || '').trim() !== ''; }); },
      saltar: function (doc) { var a = q(doc, 'a[href^="#"]')[0]; return !!a && /salt|ir al|contenido/i.test(a.textContent) && !!doc.getElementById(a.getAttribute('href').slice(1)); },
      imgalt: function (doc) { var l = q(doc, 'img'); return l.length > 0 && l.every(function (i) { return i.hasAttribute('alt') && !/^(imagen|foto|img|image|picture)\d*$/i.test((i.getAttribute('alt') || '').trim()); }) && l.some(function (i) { return (i.getAttribute('alt') || '').trim() !== ''; }); },
      niveles: function (doc) { var h = q(doc, 'h1,h2,h3,h4,h5,h6').map(function (x) { return +x.tagName[1]; }); if (!h.length || h.filter(function (n) { return n === 1; }).length !== 1) return false; for (var i = 1; i < h.length; i++) if (h[i] - h[i - 1] > 1) return false; return true; },
      sinclic: function (doc) { return q(doc, 'button').length > 0 && q(doc, '[onclick]').filter(function (e) { return !/^(button|a|input)$/i.test(e.tagName); }).length === 0; },
      enlaces: function (doc) { var l = q(doc, 'a[href]'); return l.length > 0 && l.every(function (a) { var t = a.textContent.trim().toLowerCase(); return t.length > 3 && !/^(clic|click|aquí|aqui|más|mas|ver|pulsa|leer más|haz clic aquí|haz click aquí|enlace)$/.test(t) && !/^(haz )?(clic|click|pulsa) aqu[ií]$/.test(t); }); },
      titlelen: function (doc) { var t = doc.querySelector('head title'); var n = t ? t.textContent.trim().length : 0; return n >= 30 && n <= 60; },
      desclen: function (doc) { var m = doc.querySelector('meta[name="description"]'); var n = m ? (m.getAttribute('content') || '').trim().length : 0; return n >= 70 && n <= 160; },
      ogtexto: function (doc) { return !!doc.querySelector('meta[property="og:title"][content]') && !!doc.querySelector('meta[property="og:description"][content]'); },
      ogimg: function (doc) { return !!doc.querySelector('meta[property="og:image"][content]') && !!doc.querySelector('meta[property="og:url"][content]'); },
      estructura: function (doc) { return q(doc, 'body > header, body header').length > 0 && q(doc, 'main').length > 0 && q(doc, 'footer').length > 0; }
    };
    var test = function (c, src, doc) {
      if (c.t && special[c.t]) return special[c.t](doc);
      if (c.raw) { var mm = src.match(new RegExp(c.raw, 'gim')); return !!mm && mm.length >= (c.n || 1); }
      var els = q(doc, c.sel);
      if (c.attr) els = els.filter(function (e) { var v = e.getAttribute(c.attr); return v !== null && v.trim() !== ''; });
      if (c.text) { var re = new RegExp(c.text); els = els.filter(function (e) { return re.test(e.textContent); }); }
      var min = c.min == null ? 1 : c.min;
      return els.length >= min && (c.max == null || els.length <= c.max);
    };
    var paint = function (items, hintOf) {
      var ok = 0;
      items.forEach(function (it, i) {
        if (it.ok) ok++;
        var li = document.createElement('li'); li.style.setProperty('--i', i);
        if (it.ok) li.className = 'ok';
        var d = document.createElement('span'); d.textContent = it.d;
        var h = document.createElement('span'); h.className = 'hint'; h.textContent = '💡 ' + (it.h || '');
        li.appendChild(d); li.appendChild(h); clist.appendChild(li);
      });
      var all = ok === items.length;
      csum.textContent = all ? '🎉 ¡Todo correcto! Cumples los ' + ok + ' puntos.' : ok + ' de ' + items.length + ' puntos cumplidos. Revisa las pistas en rojo.';
      if (all) csum.className = 'chk-sum all';
    };
    // Comprobación «en vivo»: ejecuta el código del alumno en un iframe aislado y prueba el resultado
    var runLive = function (src) {
      csum.textContent = 'Comprobando…';
      var id = 'ck' + Math.random().toString(36).slice(2);
      var fr = document.createElement('iframe');
      fr.setAttribute('sandbox', 'allow-scripts'); fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
      fr.style.cssText = 'position:absolute;left:-9999px;top:0;border:0;height:700px;width:' + (cfg.width || 800) + 'px';
      var safe = src.replace(/<\/(script|style)/gi, '<\\/$1');
      var tests = cfg.checks.map(function (c) { return c.t; });
      var shimCk = '<script>try{localStorage.getItem("x")}catch(e){var mk=function(){var s={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(s,k)?s[k]:null},setItem:function(k,v){s[k]=String(v)},removeItem:function(k){delete s[k]},clear:function(){s={}},key:function(i){return Object.keys(s)[i]||null},get length(){return Object.keys(s).length}}};Object.defineProperty(window,"localStorage",{value:mk(),configurable:true});Object.defineProperty(window,"sessionStorage",{value:mk(),configurable:true})};window.__logs=[];window.__err="";window.__src=' + JSON.stringify(src).replace(/</g, '\\u003c') + ';console.log=function(){window.__logs.push([].map.call(arguments,function(a){return typeof a==="string"?a:JSON.stringify(a)}).join(" "))};window.addEventListener("error",function(e){window.__err=e.message});<\/script>';
      var runner = '<script>(function(){var AF=Object.getPrototypeOf(async function(){}).constructor;var T=' + JSON.stringify(tests) + ';' +
        'var run=async function(){var res=[];for(var i=0;i<T.length;i++){var ok=false;try{ok=!!(await Promise.race([new AF(T[i])(),new Promise(function(r){setTimeout(function(){r(false)},1500)})]))}catch(e){ok=false}res.push(ok)}' +
        'parent.postMessage({ck:' + JSON.stringify(id) + ',res:res,err:window.__err},"*")};' +
        'setTimeout(run,' + (cfg.mode === 'react' ? 200 : 60) + ')})();<\/script>';
      var react = cfg.mode === 'react';
      var helpers = react ? '<script>window.tick=function(ms){return new Promise(function(r){setTimeout(r,ms||40)})};window.$=function(s){return document.querySelector(s)};window.$$=function(s){return [].slice.call(document.querySelectorAll(s))};window.boton=function(t){t=String(t).toLowerCase();return window.$$("button").filter(function(b){return (b.textContent+" "+(b.getAttribute("aria-label")||"")).toLowerCase().indexOf(t)>-1})[0]};window.texto=function(s){var e=document.querySelector(s||"#root");return e?e.textContent.trim():""};' +
        'window.click=async function(e){if(typeof e==="string")e=document.querySelector(e);e.click();await window.tick()};' +
        'window.escribir=async function(e,v){if(typeof e==="string")e=document.querySelector(e);var pr=Object.getPrototypeOf(e);var d=Object.getOwnPropertyDescriptor(pr,e.type==="checkbox"?"checked":"value");d.set.call(e,v);e.dispatchEvent(new Event(e.type==="checkbox"?"click":"input",{bubbles:true}));await window.tick()};' +
        'window.elegir=async function(e,v){if(typeof e==="string")e=document.querySelector(e);var d=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value");d.set.call(e,v);e.dispatchEvent(new Event("change",{bubbles:true}));await window.tick()};<\/script>' : '';
      var assemble = function (code) {
        return '<meta charset="utf-8">' + (cfg.mode === 'cssl' ? '<style>' + safe + '</style>' : '') + (cfg.scaffold || '') + shimCk +
          (react ? REACT_LIBS() + REACT_PRE + '<div id="root"></div>' + helpers + '<script>' + code.replace(/<\/(script)/gi, '<\\/$1') + '<\/script>' : '') +
          (cfg.mode === 'js' ? '<script>' + safe + '<\/script>' : '') + runner;
      };
      var done = false;
      var finish = function (res, err) {
        if (done) return; done = true; removeEventListener('message', onMsg); fr.remove();
        clist.innerHTML = ''; csum.className = 'chk-sum';
        paint(cfg.checks.map(function (c, i) { return { d: c.d, h: c.h, ok: !!res[i] }; }));
        if (err) { var e = document.createElement('li'); e.style.setProperty('--i', 0); var d = document.createElement('span'); d.textContent = 'Tu código produjo un error: ' + err; var h = document.createElement('span'); h.className = 'hint'; h.textContent = '💡 Corrige este error primero; suele ser una llave, comilla o paréntesis sin cerrar, o un nombre mal escrito.'; e.appendChild(d); e.appendChild(h); clist.insertBefore(e, clist.firstChild); }
      };
      var onMsg = function (e) { var d = e.data; if (d && d.ck === id && e.source === fr.contentWindow) finish(d.res, d.err); };
      addEventListener('message', onMsg);
      setTimeout(function () { finish([], 'el código tardó demasiado en responder (¿hay un bucle infinito?)'); }, 12000);
      if (!react) { fr.srcdoc = assemble(''); document.body.appendChild(fr); return; }
      loadBabel().then(function (B) {
        if (done) return;
        var js; try { js = compileReact(B, src); } catch (e) { finish([], 'Error de sintaxis: ' + babelMsg(e)); return; }
        fr.srcdoc = assemble(js); document.body.appendChild(fr);
      }, function (e) { finish([], e.message); });
    };
    var run = function () {
      var src = cta.value;
      clist.innerHTML = ''; csum.className = 'chk-sum';
      if (!src.trim()) { csum.textContent = 'Pega primero tu código en el cuadro de arriba.'; return; }
      if (cfg.mode === 'js' || cfg.mode === 'cssl' || cfg.mode === 'react') { runLive(src); return; }
      var doc = new DOMParser().parseFromString(src, 'text/html');
      var ok = 0;
      cfg.checks.forEach(function (c, i) {
        var pass = false; try { pass = !!test(c, src, doc); } catch (e) {}
        if (pass) ok++;
        var li = document.createElement('li'); li.style.setProperty('--i', i);
        if (pass) li.className = 'ok';
        var d = document.createElement('span'); d.textContent = c.d;
        var h = document.createElement('span'); h.className = 'hint'; h.textContent = '💡 ' + c.h;
        li.appendChild(d); li.appendChild(h); clist.appendChild(li);
      });
      var all = ok === cfg.checks.length;
      csum.textContent = all ? '🎉 ¡Todo correcto! Cumples los ' + ok + ' puntos.' : ok + ' de ' + cfg.checks.length + ' puntos cumplidos. Revisa las pistas en rojo.';
      if (all) csum.className = 'chk-sum all';
    };
    document.getElementById('chk-run').addEventListener('click', run);
    document.getElementById('chk-clear').addEventListener('click', function () { cta.value = ''; store.set(ckey, ''); clist.innerHTML = ''; csum.textContent = ''; csum.className = 'chk-sum'; });
    cta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); var st = cta.selectionStart; cta.value = cta.value.slice(0, st) + '  ' + cta.value.slice(cta.selectionEnd); cta.selectionStart = cta.selectionEnd = st + 2; }
    });
  }

  // ---------- Widget: comprobador de contraste ----------
  document.querySelectorAll('[data-widget="contrast"]').forEach(function (w) {
    var fg = w.querySelector('.c-fg'), bg = w.querySelector('.c-bg'), sample = w.querySelector('.c-sample');
    var ratioEl = w.querySelector('.c-ratio'), res = w.querySelector('.c-res');
    var lum = function (hex) {
      var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    var upd = function () {
      var a = lum(fg.value), b = lum(bg.value), r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      sample.style.color = fg.value; sample.style.background = bg.value;
      ratioEl.textContent = 'Contraste ' + r.toFixed(2) + ' : 1';
      var tests = [['Texto normal (AA, mínimo 4.5)', r >= 4.5], ['Texto grande (AA, mínimo 3)', r >= 3], ['Texto normal (AAA, mínimo 7)', r >= 7]];
      res.innerHTML = '';
      tests.forEach(function (t) { var li = document.createElement('li'); li.className = t[1] ? 'ok' : 'bad'; li.textContent = (t[1] ? '✓ ' : '✗ ') + t[0]; res.appendChild(li); });
    };
    fg.addEventListener('input', upd); bg.addEventListener('input', upd); upd();
  });

  // ---------- Widget: vista previa en buscadores ----------
  document.querySelectorAll('[data-widget="serp"]').forEach(function (w) {
    var t = w.querySelector('.s-title'), d = w.querySelector('.s-desc'), u = w.querySelector('.s-url');
    var pt = w.querySelector('.serp-title'), pd = w.querySelector('.serp-desc'), pu = w.querySelector('.serp-url');
    var ct = w.querySelector('.count-title'), cd = w.querySelector('.count-desc');
    var cut = function (str, n) { return str.length > n ? str.slice(0, n - 1).trim() + '…' : str; };
    var upd = function () {
      pt.textContent = cut(t.value || 'Título de tu página', 60);
      pd.textContent = cut(d.value || 'Aquí aparecerá la descripción de tu página.', 160);
      pu.textContent = u.value || 'https://tusitio.com';
      var lt = t.value.length, ld = d.value.length;
      ct.textContent = lt + ' caracteres · ideal entre 30 y 60'; ct.className = 'counter count-title ' + (lt >= 30 && lt <= 60 ? 'ok' : 'bad');
      cd.textContent = ld + ' caracteres · ideal entre 70 y 160'; cd.className = 'counter count-desc ' + (ld >= 70 && ld <= 160 ? 'ok' : 'bad');
    };
    [t, d, u].forEach(function (i) { i.addEventListener('input', upd); }); upd();
  });

  // Regiones con desplazamiento: accesibles con teclado solo cuando de verdad se desbordan
  var scrollers = document.querySelectorAll('.code pre, .table-wrap, .demo, .anatomy');
  var markScrollers = function () {
    scrollers.forEach(function (el) {
      var over = el.scrollWidth > el.clientWidth + 1;
      if (over) el.setAttribute('tabindex', '0');
      else if (el.getAttribute('tabindex') === '0') el.removeAttribute('tabindex');
    });
  };
  markScrollers();
  addEventListener('resize', markScrollers);
  addEventListener('load', markScrollers);

  // ---------- Estadísticas anónimas (opcional, GoatCounter) ----------
  if (CONFIG.goatcounter && location.protocol !== 'file:' && navigator.doNotTrack !== '1') {
    var gc = document.createElement('script');
    gc.async = true;
    gc.src = 'https://gc.zgo.at/count.js';
    gc.setAttribute('data-goatcounter', 'https://' + CONFIG.goatcounter + '.goatcounter.com/count');
    document.head.appendChild(gc);
  }

  // ---------- Animaciones GIF bajo demanda (accesibles: no se reproducen solas) ----------
  document.querySelectorAll('.gif-btn').forEach(function (btn) {
    var img = btn.querySelector('img'), label = btn.querySelector('.gif-play'), still = img.getAttribute('src'), playing = false;
    btn.addEventListener('click', function () {
      playing = !playing;
      img.src = playing ? btn.getAttribute('data-gif') + '?r=' + Date.now() : still;
      label.textContent = playing ? '⏸ Detener' : '▶ Ver animación';
      btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    });
  });

  // ---------- Editor con distintos anchos de pantalla ----------
  document.querySelectorAll('.playground[data-widths]').forEach(function (pg) {
    var ta = pg.querySelector('.pg-code'), fr = pg.querySelector('.pg-out'), lab = pg.querySelector('.pg-wlabel');
    pg.querySelectorAll('[data-w]').forEach(function (b) {
      b.addEventListener('click', function () {
        var w = b.getAttribute('data-w');
        fr.style.width = /%$/.test(w) ? w : w + 'px';
        lab.textContent = /%$/.test(w) ? 'completo' : w + ' px';
      });
    });
  });

  // ---------- Editor de JavaScript con consola ----------
  var shim = function (id) {
    return '<script>(function(){var id=' + JSON.stringify(id) + ';try{localStorage.getItem("x")}catch(e){var mk=function(){var s={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(s,k)?s[k]:null},setItem:function(k,v){s[k]=String(v)},removeItem:function(k){delete s[k]},clear:function(){s={}},key:function(i){return Object.keys(s)[i]||null},get length(){return Object.keys(s).length}}};Object.defineProperty(window,"localStorage",{value:mk(),configurable:true});Object.defineProperty(window,"sessionStorage",{value:mk(),configurable:true})};window.__logs=[];var fmt=function(a){try{if(typeof a==="string")return a;if(a instanceof Error)return a.name+": "+a.message;if(typeof a==="function")return a.toString();if(a===undefined)return "undefined";var rep=function(k,v){return typeof v==="function"?"[Función]":v===undefined?"undefined":v};var j=JSON.stringify(a,rep);return j&&j.length>70?JSON.stringify(a,rep,2):j}catch(e){return String(a)}};var send=function(l,args){var t=[].map.call(args,fmt).join(" ");window.__logs.push(t);parent.postMessage({pg:id,l:l,t:t},"*")};["log","info","warn","error","table"].forEach(function(m){console[m]=function(){send(m==="table"?"log":m,arguments)}});window.addEventListener("error",function(e){send("error",[e.message])});window.addEventListener("unhandledrejection",function(e){send("error",["Promesa rechazada: "+(e.reason&&e.reason.message||e.reason)])});})();<\/script>';
  };
  var jsPlaygrounds = [];
  document.querySelectorAll('.playground[data-js]').forEach(function (pg) {
    var ta = pg.querySelector('.pg-code'), host = pg.querySelector('.pg-frame'), log = pg.querySelector('.pg-log');
    var original = ta.value;
    var isReact = pg.hasAttribute('data-react');
    pg._run = function () {
      log.textContent = '';
      var id = 'pg' + Math.random().toString(36).slice(2);
      var fr = document.createElement('iframe');
      fr.className = 'pg-out'; fr.title = 'Resultado en vivo'; fr.setAttribute('sandbox', 'allow-scripts');
      pg._id = id; pg._frame = fr;
      if (!isReact) { fr.srcdoc = BASE + shim(id) + ta.value; host.innerHTML = ''; host.appendChild(fr); return; }
      var fail = function (m) { var l = document.createElement('div'); l.className = 'log-error'; l.textContent = m; log.appendChild(l); };
      loadBabel().then(function (B) {
        if (pg._id !== id) return;
        var js; try { js = compileReact(B, ta.value); } catch (e) { host.innerHTML = ''; fail('Error de sintaxis: ' + babelMsg(e)); return; }
        fr.srcdoc = BASE + REACT_STYLE + shim(id) + REACT_LIBS() + REACT_PRE + '<div id="root"></div><script>' + js.replace(/<\/(script)/gi, '<\\/$1') + '<\/script>';
        host.innerHTML = ''; host.appendChild(fr);
      }, function (e) { fail(e.message); });
    };
    pg.querySelector('[data-run]').addEventListener('click', pg._run);
    pg.querySelector('[data-reset]').addEventListener('click', function () { ta.value = original; pg._run(); });
    pg.querySelector('[data-clear]').addEventListener('click', function () { log.textContent = ''; });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); var st = ta.selectionStart; ta.value = ta.value.slice(0, st) + '  ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = st + 2; }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); pg._run(); }
    });
    jsPlaygrounds.push(pg);
  });
  addEventListener('message', function (e) {
    var d = e.data; if (!d || !d.pg) return;
    var pg = jsPlaygrounds.filter(function (p) { return p._id === d.pg && p._frame && p._frame.contentWindow === e.source; })[0];
    if (!pg) return;
    var line = document.createElement('div'); line.className = 'log-' + d.l; line.textContent = d.t;
    pg.querySelector('.pg-log').appendChild(line);
  });
  if (jsPlaygrounds.length && 'IntersectionObserver' in window) {
    var jio = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target._run(); jio.unobserve(en.target); } }); }, { rootMargin: '0px 0px -10% 0px' });
    jsPlaygrounds.forEach(function (pg) { jio.observe(pg); });
  } else { jsPlaygrounds.forEach(function (pg) { pg._run(); }); }

  // ---------- Progreso por curso (biblioteca) ----------
  document.querySelectorAll('[data-course]').forEach(function (c) {
    var keys = c.getAttribute('data-keys').split(','), pre = c.getAttribute('data-prefix') || '', done = 0;
    keys.forEach(function (k) { if (store.get('leccion:' + pre + k) === '1') done++; });
    var bar = c.querySelector('.progress > div'), txt = c.querySelector('.course-prog');
    if (bar) bar.style.width = (done / keys.length * 100) + '%';
    if (txt) txt.textContent = done === 0 ? 'Sin empezar' : done === keys.length ? '🎉 Curso completado' : done + ' de ' + keys.length + ' completadas';
    if (done) c.classList.add('started');
  });
})();


// ---------- UI v3 · efectos extra (todo opcional; si algo falla, el curso sigue igual) ----------
(function () {
  try {
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    var cs = document.currentScript;
    var BASE = cs && cs.src ? new URL('.', cs.src).href : '';
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

    // Aurora de fondo
    if (!reduce) {
      var au = document.createElement('div'); au.className = 'aurora'; au.setAttribute('aria-hidden', 'true');
      au.innerHTML = '<i></i><i></i><i></i>'; document.body.insertBefore(au, document.body.firstChild);
    }

    // Avisos
    var tbox = document.createElement('div'); tbox.className = 'toasts'; tbox.setAttribute('role', 'status'); tbox.setAttribute('aria-live', 'polite');
    document.body.appendChild(tbox);
    var toast = function (msg) {
      var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; tbox.appendChild(t);
      setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 320); }, 2400);
    };

    // Confeti (canvas ligero, sin librerías)
    var confetti = function (x, y) {
      if (reduce) return;
      var cv = document.createElement('canvas'); cv.className = 'confetti'; cv.width = innerWidth; cv.height = innerHeight; document.body.appendChild(cv);
      var g = cv.getContext('2d'), cols = ['#0b7a75', '#5eead4', '#ff8a3d', '#facc15', '#34d399', '#fb923c'], ps = [];
      for (var i = 0; i < 110; i++) {
        var a = Math.random() * Math.PI * 2, v = 5 + Math.random() * 9;
        ps.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, r: Math.random() * 6, w: 5 + Math.random() * 6, h: 3 + Math.random() * 5, c: cols[i % cols.length], l: 0 });
      }
      (function tick() {
        g.clearRect(0, 0, cv.width, cv.height); var alive = false;
        ps.forEach(function (p) {
          p.l++; p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += .2;
          if (p.y < cv.height + 20 && p.l < 160) { alive = true; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - p.l / 160); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); }
        });
        if (alive) requestAnimationFrame(tick); else cv.remove();
      })();
    };
    var burstAt = function (el) { var r = el.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2); };

    // Confeti al completar la lección, sacar todas en el quiz o aprobar el comprobador
    $$('[data-complete]').forEach(function (b) {
      b.addEventListener('click', function () { if (b.classList.contains('done')) { burstAt(b); toast('🎉 ¡Lección completada!'); } });
    });
    $$('.quiz-score').forEach(function (s) {
      new MutationObserver(function () { if (/Excelente/.test(s.textContent)) { burstAt(s); toast('⭐ ¡Puntaje perfecto!'); } }).observe(s, { childList: true, characterData: true, subtree: true });
    });
    var cs2 = document.getElementById('chk-sum');
    if (cs2) new MutationObserver(function () { if (cs2.classList.contains('all')) { burstAt(cs2); toast('✅ ¡Ejercicio completo!'); } }).observe(cs2, { attributes: true, attributeFilter: ['class'] });

    // Barra superior compacta + volver arriba con anillo
    var top = $('.topbar');
    var tt = document.createElement('button'); tt.type = 'button'; tt.className = 'to-top'; tt.setAttribute('aria-label', 'Volver arriba');
    tt.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="tt-bg" cx="22" cy="22" r="20"/><circle class="tt-fg" cx="22" cy="22" r="20"/></svg><span aria-hidden="true">↑</span>';
    document.body.appendChild(tt);
    var fg = $('.tt-fg', tt), tick = false;
    var onS = function () {
      var y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
      if (top) top.classList.toggle('compact', y > 40);
      tt.classList.toggle('show', y > 500);
      fg.style.strokeDashoffset = 126 - 126 * (h > 0 ? Math.min(1, y / h) : 0);
      tick = false;
    };
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onS); } }, { passive: true }); onS();
    tt.addEventListener('click', function () { scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

    // Tarjetas: brillo con el cursor e inclinación 3D (solo con ratón)
    if (fine) {
      $$('.lesson-card, .course-card, .feature, .route li.ok a, .pager a').forEach(function (c) {
        c.classList.add('fx-card');
        c.addEventListener('pointermove', function (e) {
          var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          c.style.setProperty('--mx', (x * 100) + '%'); c.style.setProperty('--my', (y * 100) + '%');
          if (!reduce) { c.style.setProperty('--ry', ((x - .5) * 9) + 'deg'); c.style.setProperty('--rx', ((.5 - y) * 9) + 'deg'); c.classList.add('tilting'); }
        });
        c.addEventListener('pointerleave', function () { c.classList.remove('tilting'); c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); });
      });
    }

    // Ondas en botones
    $$('.btn, .opt, .gif-btn').forEach(function (b) {
      if (b.classList.contains('opt') || b.classList.contains('gif-btn')) return;
      b.addEventListener('pointerdown', function (e) {
        if (reduce) return;
        var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) / 4, d = document.createElement('span'); d.className = 'ripple';
        d.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
        b.appendChild(d); setTimeout(function () { d.remove(); }, 650);
      });
    });

    // Enlace copiable en cada título de la lección
    $$('article h2[id], article h3[id]').forEach(function (h) {
      var a = document.createElement('button'); a.type = 'button'; a.className = 'h-anchor'; a.textContent = '#'; a.setAttribute('aria-label', 'Copiar enlace a esta sección');
      a.addEventListener('click', function () {
        var u = location.href.split('#')[0] + '#' + h.id;
        (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { toast('🔗 Enlace copiado'); }, function () { location.hash = h.id; });
      });
      h.appendChild(a);
    });

    // Copiar código: aviso
    $$('.copy').forEach(function (b) { b.addEventListener('click', function () { toast('📋 Código copiado'); }); });

    // Buscador de lecciones (Ctrl+K o /)
    var items = null, pal = null, input, list, sel = 0, shown = [];
    var strip = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
    var load = function () {
      if (items) return Promise.resolve(items);
      return fetch(BASE + 'indice.json').then(function (r) { return r.json(); }).then(function (j) { items = j; return j; }, function () { items = []; return items; });
    };
    var render = function () {
      var q = strip(input.value.trim()); var words = q.split(/\s+/).filter(Boolean);
      shown = items.filter(function (it) { var t = strip(it[1] + ' ' + it[2] + ' ' + it[0]); return words.every(function (w) { return t.indexOf(w) > -1; }); }).slice(0, 30);
      sel = 0;
      list.innerHTML = shown.length ? shown.map(function (it, i) { return '<li><a href="' + BASE + '../' + it[0] + '" class="' + (i ? '' : 'sel') + '"><span>' + it[1].replace(/</g, '&lt;') + '</span><small>' + it[2] + '</small></a></li>'; }).join('') : '<li class="pal-empty">Nada por aquí. Prueba con otra palabra.</li>';
    };
    var mark = function () { $$('a', list).forEach(function (a, i) { a.classList.toggle('sel', i === sel); if (i === sel) a.scrollIntoView({ block: 'nearest' }); }); };
    var open = function () {
      if (!pal) {
        pal = document.createElement('div'); pal.className = 'pal'; pal.setAttribute('role', 'dialog'); pal.setAttribute('aria-modal', 'true'); pal.setAttribute('aria-label', 'Buscar lecciones');
        pal.innerHTML = '<div class="pal-box"><input type="search" placeholder="Buscar lecciones: flexbox, formularios, useState…" aria-label="Buscar lecciones" autocomplete="off"><ul class="pal-list"></ul><div class="pal-foot"><span>↑↓ moverse</span><span>Enter abrir</span><span>Esc cerrar</span></div></div>';
        document.body.appendChild(pal); input = $('input', pal); list = $('.pal-list', pal);
        pal.addEventListener('mousedown', function (e) { if (e.target === pal) close(); });
        input.addEventListener('input', render);
        input.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); mark(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); }
          else if (e.key === 'Enter' && shown[sel]) { location.href = BASE + '../' + shown[sel][0]; }
        });
      }
      pal.classList.add('open'); input.value = ''; load().then(function () { render(); input.focus(); });
    };
    var close = function () { if (pal) pal.classList.remove('open'); };
    addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase(), typing = /^(input|textarea|select)$/.test(tag) || e.target.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); open(); }
      else if (e.key === '/' && !typing) { e.preventDefault(); open(); }
      else if (e.key === 'Escape') close();
    });
    var actions = $('.topbar-actions');
    if (actions) {
      var sb = document.createElement('button'); sb.type = 'button'; sb.className = 'icon-btn'; sb.setAttribute('aria-label', 'Buscar lecciones');
      sb.innerHTML = '🔍<span class="lbl"> Buscar</span> <span class="kbd-hint" aria-hidden="true">Ctrl K</span>'; sb.addEventListener('click', open);
      actions.insertBefore(sb, actions.firstChild);
    }
  } catch (err) { /* los efectos son opcionales */ }
})();

// ---------- UI v4 · símbolos, cursor luminoso, cinta, XP y racha ----------
(function () {
  try {
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    var $ = function (s) { return document.querySelector(s); };
    var store = {
      get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    };

    // Símbolos flotantes en el hero
    var hero = $('.hero-grid') || $('section.hero');
    if (hero && !reduce) {
      var fs = document.createElement('div'); fs.className = 'float-syms'; fs.setAttribute('aria-hidden', 'true');
      var syms = ['💬', '{ }', '=>', '()', 'JSON', '200 OK', 'POST', '[ ]', 'async', 'webhook'];
      fs.innerHTML = syms.map(function (t, i) {
        return '<span style="--x:' + (4 + (i * 37) % 90) + '%;--y:' + (6 + (i * 53) % 80) + '%;--s:' + (1.1 + (i % 4) * .5) + 'rem;--d:' + (7 + (i % 5) * 2) + 's;--dl:-' + (i * 1.3) + 's">' + t.replace(/</g, '&lt;') + '</span>';
      }).join('');
      hero.appendChild(fs);
    }

    // Cinta de tecnologías (en portadas con hero)
    var feat = $('.features');
    if (feat && hero) {
      var words = ['Webhook', 'Cloud API', 'Plantillas', 'Opt-in', 'Ventana de 24 h', 'JSON', 'Cloudflare', 'Recordatorios', 'Flows', 'Costos', 'Privacidad', 'Pedidos'];
      var row = words.map(function (w) { return '<span>' + w + '</span>'; }).join('');
      var tk = document.createElement('div'); tk.className = 'ticker'; tk.setAttribute('aria-hidden', 'true');
      tk.innerHTML = '<div class="ticker-track">' + row + row + '</div>';
      feat.parentNode.insertBefore(tk, feat);
    }

    // Luz que sigue al cursor y botones magnéticos (solo con ratón)
    if (fine && !reduce) {
      var gl = document.createElement('div'); gl.className = 'cursor-glow'; gl.setAttribute('aria-hidden', 'true'); document.body.appendChild(gl);
      var gx = 0, gy = 0, pend = false;
      addEventListener('pointermove', function (e) {
        gx = e.clientX; gy = e.clientY; gl.classList.add('on');
        if (!pend) { pend = true; requestAnimationFrame(function () { gl.style.transform = 'translate(' + gx + 'px,' + gy + 'px)'; pend = false; }); }
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', function () { gl.classList.remove('on'); });
      document.querySelectorAll('.hero .btn, .complete .btn').forEach(function (b) {
        b.classList.add('mag');
        b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .18) + 'px,' + ((e.clientY - r.top - r.height / 2) * .28 - 2) + 'px)'; });
        b.addEventListener('pointerleave', function () { b.style.transform = ''; });
      });
    }

    // XP, nivel y racha (se calcula con las lecciones que ya guardas en tu navegador)
    var count = function () { var n = 0; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf('leccion:') === 0 && localStorage.getItem(k) === '1') n++; } } catch (e) {} return n; };
    var streakInfo = function () { try { return JSON.parse(store.get('racha') || '{}'); } catch (e) { return {}; } };
    var bar = $('.topbar-actions');
    if (bar) {
      var chip = document.createElement('div'); chip.className = 'xp'; bar.insertBefore(chip, bar.firstChild);
      var paint = function (bump) {
        var xp = count() * 100, lvl = Math.floor(xp / 300) + 1, into = (xp % 300) / 300, s = streakInfo(), days = s.n || 0;
        var today = new Date().toDateString(), y = new Date(Date.now() - 864e5).toDateString();
        if (s.d && s.d !== today && s.d !== y) days = 0;
        chip.title = 'Nivel ' + lvl + ' · ' + xp + ' XP · cada lección completada suma 100 XP';
        chip.innerHTML = '⚡ Nv <b>' + lvl + '</b><span class="xp-bar"><i style="width:' + Math.round(into * 100) + '%"></i></span><span class="xp-streak">🔥 ' + days + '</span>';
        if (bump) { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }
        return lvl;
      };
      var lvl0 = paint(false);
      document.querySelectorAll('[data-complete]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.classList.contains('done')) {
            var s = streakInfo(), today = new Date().toDateString(), y = new Date(Date.now() - 864e5).toDateString();
            if (s.d !== today) { store.set('racha', JSON.stringify({ d: today, n: s.d === y ? (s.n || 0) + 1 : 1 })); }
          }
          var l = paint(true);
          if (l > lvl0) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = '🚀 ¡Subiste al nivel ' + l + '!'; var box = document.querySelector('.toasts'); if (box) box.appendChild(t); setTimeout(function () { t.remove(); }, 2800); }
          lvl0 = l;
        });
      });
    }
  } catch (err) { /* opcional */ }
})();

// ---------- UI v5 · progreso (nivel, XP, racha, logros, metas), ruta y temario animados ----------
(function () {
  try {
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cs = document.currentScript;
    var BASE = cs && cs.src ? new URL('.', cs.src).href : '';
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
    var store = {
      get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
      keys: function () { var o = []; try { for (var i = 0; i < localStorage.length; i++) o.push(localStorage.key(i)); } catch (e) {} return o; }
    };
    var json = function (k, d) { try { return JSON.parse(store.get(k)) || d; } catch (e) { return d; } };
    var say = function (m) { var box = $('.toasts'); if (!box) return; var t = document.createElement('div'); t.className = 'toast'; t.textContent = m; box.appendChild(t); setTimeout(function () { t.remove(); }, 3200); };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

    // ----- Cursos y lecciones (se leen de assets/indice.json) -----
    var COURSES = [
      { tot: 29, id: 'bot', pre: 'bot-', name: 'Chatbots de WhatsApp', dir: '', home: '', emoji: '💬' }
    ];
    var DIRS = {};
    var data = null; // { courses: [{...c, lessons:[{path,title,key}]}] }
    var load = function () {
      return fetch(BASE + 'indice.json').then(function (r) { return r.json(); }).then(function (idx) {
        var cs2 = COURSES.map(function (c) { var o = {}; for (var k in c) o[k] = c[k]; o.lessons = []; return o; });
        idx.forEach(function (it) {
          var p = it[0], m = /^(\d\d)-/.exec(p), pj = /^proyecto/.exec(p);
          if (!m && !pj) return;
          var dir = '', c = cs2.filter(function (x) { return x.dir === dir; })[0];
          if (c) c.lessons.push({ path: p, title: it[1], key: c.pre + (m ? m[1] : 'P') });
        });
        data = cs2.filter(function (c) { return c.lessons.length; });
        return data;
      }, function () { data = []; return data; });
    };
    var isDone = function (key) { return store.get('leccion:' + key) === '1'; };

    // ----- Estado de progreso -----
    var ymd = function (d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
    var addDays = function (n) { var d = new Date(); d.setDate(d.getDate() + n); return d; };
    var activity = function () { return json('actividad', {}); };
    var dayOn = function (k) { return !!(activity()[k] || store.get('diario:' + k) === '1' || store.get('escudo:' + k) === '1'); };
    var streaks = function () {
      var a = activity(), cur = 0, d = 0;
      if (!dayOn(ymd(addDays(0)))) d = -1; // si hoy aún no estudias, la racha de ayer sigue viva
      while (dayOn(ymd(addDays(d)))) { cur++; d--; }
      var days = store.keys().map(function (k) { var m = /^(?:diario|escudo):(\d{4}-\d\d-\d\d)$/.exec(k); return m ? m[1] : null; }).concat(Object.keys(a)).filter(function (k) { return k && dayOn(k); }).sort(), best = 0, run = 0, prev = null;
      days.forEach(function (k) {
        var t = new Date(k + 'T00:00:00');
        run = prev && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1; prev = t; if (run > best) best = run;
      });
      return { cur: cur, best: Math.max(best, cur), todayDone: dayOn(ymd()) };
    };
    var dailyWon = function () { return store.keys().filter(function (k) { return k.indexOf('diario:') === 0 && store.get(k) === '1'; }).length; };
    var lessonsDone = function () { return store.keys().filter(function (k) { return k.indexOf('leccion:') === 0 && store.get(k) === '1'; }).length; };
    var perfectQuizzes = function () { return store.keys().filter(function (k) { return k.indexOf('logro:quiz:') === 0; }).length; };
    var courseStats = function (c) { var n = 0; c.lessons.forEach(function (l) { if (isDone(l.key)) n++; }); var t = Math.max(c.tot || 0, c.lessons.length); return { done: n, total: t, pct: t ? n / t : 0 }; };
    var coursesFinished = function () { return data ? data.filter(function (c) { return courseStats(c).done === courseStats(c).total; }) : []; };
    var xpNow = function () { return lessonsDone() * 100 + perfectQuizzes() * 50 + coursesFinished().length * 300 + dailyWon() * 25; };
    var levelOf = function (xp) { return Math.floor(Math.sqrt(xp / 100)) + 1; };
    var TITLES = ['Curioso', 'Aprendiz', 'Explorador', 'Constructor', 'Dev junior', 'Dev', 'Maestro', 'Leyenda'];
    var AVATARS = ['🌱', '🔰', '🧭', '🛠️', '💻', '🚀', '🧙', '👑'];
    // ----- Temas por nivel, avatares, escudos, reto diario, insignia -----
    var SKINS = [{ id: 'base', n: 'Menta', lv: 1, c: '#0b7a75' }, { id: 'oceano', n: 'Océano', lv: 2, c: '#0891b2' }, { id: 'atardecer', n: 'Atardecer', lv: 3, c: '#ea580c' }, { id: 'bosque', n: 'Bosque', lv: 5, c: '#15803d' }, { id: 'neon', n: 'Neón', lv: 7, c: '#c026d3' }];
    var applySkin = function () {
      var id = store.get('skin') || 'base', lv = levelOf(xpNow()), sk = SKINS.filter(function (x) { return x.id === id; })[0];
      if (!sk || sk.lv > lv) id = 'base';
      if (id === 'base') document.documentElement.removeAttribute('data-skin'); else document.documentElement.setAttribute('data-skin', id);
    };
    var shieldsAvail = function () { return Math.max(0, Math.floor(levelOf(xpNow()) / 3) - (+store.get('escudos_usados') || 0)); };
    var checkShield = function () {
      var y = ymd(addDays(-1)), yy = ymd(addDays(-2));
      if (!dayOn(y) && dayOn(yy) && shieldsAvail() > 0) { store.set('escudo:' + y, '1'); store.set('escudos_usados', String((+store.get('escudos_usados') || 0) + 1)); say('🛡️ Tu escudo salvó tu racha de ayer'); }
    };
    var DAILY = [
      ['¿Qué etiqueta HTML define el contenido principal de la página?', ['<main>', '<top>', '<body2>'], 0],
      ['¿Qué atributo del <img> ayuda a la accesibilidad?', ['src', 'alt', 'width'], 1],
      ['¿Qué propiedad CSS cambia el color del texto?', ['color', 'font-color', 'text-style'], 0],
      ['¿Qué valor de display activa Flexbox?', ['block', 'flex', 'inline'], 1],
      ['En CSS, ¿qué selector apunta a una clase?', ['#caja', '.caja', 'caja*'], 1],
      ['¿Cómo se declara una constante en JavaScript?', ['let', 'var', 'const'], 2],
      ['¿Qué devuelve typeof "hola"?', ['"string"', '"text"', '"char"'], 0],
      ['¿Qué método añade un elemento al final de un array?', ['push()', 'pop()', 'shift()'], 0],
      ['¿Qué operador compara valor y tipo en JavaScript?', ['==', '===', '='], 1],
      ['¿Qué hook de React guarda estado en un componente?', ['useEffect', 'useState', 'useRef'], 1],
      ['En React, ¿cómo se llama lo que recibe un componente desde fuera?', ['props', 'refs', 'hooks'], 0],
      ['¿Qué comando de Git guarda tus cambios en el historial?', ['git push', 'git commit', 'git clone'], 1],
      ['¿Qué comando de Git sube tus commits a GitHub?', ['git push', 'git add', 'git init'], 0],
      ['¿Qué etiqueta crea un enlace?', ['<link>', '<a>', '<href>'], 1],
      ['¿Qué meta es clave para que la página sea responsiva?', ['viewport', 'author', 'robots'], 0],
      ['¿Qué método convierte un string JSON en objeto?', ['JSON.parse()', 'JSON.stringify()', 'JSON.map()'], 0],
      ['¿Qué método de array crea un array nuevo transformando cada elemento?', ['forEach', 'map', 'find'], 1],
      ['En SQL, ¿qué cláusula filtra filas?', ['ORDER BY', 'WHERE', 'LIMIT'], 1],
      ['¿Qué comando de npm instala las dependencias del package.json?', ['npm install', 'npm run', 'npm init'], 0],
      ['¿Qué código de estado HTTP significa «no encontrado»?', ['200', '404', '500'], 1],
      ['¿Qué unidad CSS es relativa al tamaño de fuente raíz?', ['px', 'rem', 'pt'], 1],
      ['¿Qué etiqueta es la más importante para SEO como título de la página?', ['<h1>', '<small>', '<br>'], 0]
    ];
    var dailyQ = function () { var n = Math.floor(new Date(ymd() + 'T00:00:00') / 864e5); return DAILY[n % DAILY.length]; };
    var CHULETAS = BASE + '../chuletas/';
    var titleIdx = function (lvl) { var av = store.get('avatar'); return av !== null && +av <= lvl - 1 ? +av : Math.min(lvl - 1, TITLES.length - 1); };
    var shareImage = function () {
      var xp = xpNow(), lvl = levelOf(xp), ti = titleIdx(lvl), s = streaks(), c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
      var g = c.getContext('2d'), ac = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0b7a75';
      if (ac.charAt(0) !== '#' || ac.length !== 7) ac = '#0b7a75';
      var gr = g.createLinearGradient(0, 0, 1080, 1080); gr.addColorStop(0, '#08191c'); gr.addColorStop(1, '#143037'); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1080);
      var rg = g.createRadialGradient(840, 220, 0, 840, 220, 600); rg.addColorStop(0, ac + '88'); rg.addColorStop(1, ac + '00'); g.fillStyle = rg; g.fillRect(0, 0, 1080, 1080);
      g.fillStyle = '#fff'; g.textAlign = 'center';
      g.font = '200px serif'; g.fillText(AVATARS[ti], 540, 330);
      g.font = '800 64px system-ui, sans-serif'; g.fillText('Nivel ' + lvl + ' · ' + TITLES[ti], 540, 450);
      g.font = '500 38px system-ui, sans-serif'; g.fillStyle = '#c9cdee'; g.fillText(xp + ' XP', 540, 515);
      [[lessonsDone(), 'lecciones'], [s.best, 'mejor racha'], [unlocked().length, 'logros']].forEach(function (x, i) {
        var cx = 240 + i * 300; g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); if (g.roundRect) g.roundRect(cx - 120, 600, 240, 190, 28); else g.rect(cx - 120, 600, 240, 190); g.fill();
        g.fillStyle = '#fff'; g.font = '800 84px system-ui, sans-serif'; g.fillText(x[0], cx, 700); g.fillStyle = '#9aa1c4'; g.font = '500 30px system-ui, sans-serif'; g.fillText(x[1], cx, 755);
      });
      g.fillStyle = '#fff'; g.font = '800 46px system-ui, sans-serif'; g.fillText('Chatbots de WhatsApp desde cero', 540, 920);
      g.fillStyle = ac; g.font = '600 34px system-ui, sans-serif'; g.fillText('cacg-code.github.io/chatbots-whatsapp-desde-cero', 540, 980);
      return c;
    };
    var weekCount = function () { var a = activity(), n = 0; for (var i = 0; i < 7; i++) n += a[ymd(addDays(-i))] || 0; return n; };

    var LOGROS = [
      { id: 'primero', ico: '🌱', t: 'Primer paso', d: 'Completa tu primera lección', ok: function () { return lessonsDone() >= 1; } },
      { id: 'cinco', ico: '📚', t: 'Constante', d: 'Completa 5 lecciones', ok: function () { return lessonsDone() >= 5; } },
      { id: 'diez', ico: '🏃', t: 'En marcha', d: 'Completa 10 lecciones', ok: function () { return lessonsDone() >= 10; } },
      { id: 'veinte', ico: '🏆', t: 'Imparable', d: 'Completa 25 lecciones', ok: function () { return lessonsDone() >= 25; } },
      { id: 'racha3', ico: '🔥', t: 'Calentando', d: 'Racha de 3 días', ok: function () { return streaks().best >= 3; } },
      { id: 'racha7', ico: '⚡', t: 'Semana perfecta', d: 'Racha de 7 días', ok: function () { return streaks().best >= 7; } },
      { id: 'quiz1', ico: '🎯', t: 'Puntería', d: 'Un quiz con todas correctas', ok: function () { return perfectQuizzes() >= 1; } },
      { id: 'quiz5', ico: '🧠', t: 'Mente brillante', d: '5 quizzes perfectos', ok: function () { return perfectQuizzes() >= 5; } },
      { id: 'curso', ico: '🥇', t: 'Curso completo', d: 'Termina un curso entero', ok: function () { return coursesFinished().length >= 1; } },
      { id: 'meta', ico: '🎖️', t: 'Meta cumplida', d: 'Alcanza tu meta semanal', ok: function () { return weekCount() >= (+store.get('meta') || 3); } }
    ];
    var unlocked = function () { return LOGROS.filter(function (l) { return l.ok(); }).map(function (l) { return l.id; }); };
    var checkLogros = function () {
      var now = unlocked(), prev = store.get('logros');
      if (prev === null) { store.set('logros', JSON.stringify(now)); return; }
      var old = json('logros', []);
      LOGROS.forEach(function (l) {
        if (now.indexOf(l.id) > -1 && old.indexOf(l.id) < 0) { say(l.ico + ' Logro: ' + l.t); }
      });
      store.set('logros', JSON.stringify(now));
    };

    // ----- Insignia de la barra superior -----
    var bar = $('.topbar-actions'), chip = null;
    var paintChip = function (bump) {
      if (!chip) return;
      var xp = xpNow(), lvl = levelOf(xp), base = Math.pow(lvl - 1, 2) * 100, nxt = Math.pow(lvl, 2) * 100, s = streaks();
      chip.title = 'Nivel ' + lvl + ' · ' + xp + ' XP · abre tu panel de progreso';
      chip.innerHTML = '<span aria-hidden="true">⚡</span> Nv <b>' + lvl + '</b><span class="xp-bar"><i style="width:' + Math.round((xp - base) / (nxt - base) * 100) + '%"></i></span><span class="xp-streak" aria-hidden="true">🔥 ' + s.cur + '</span><span class="sr-only">Abrir mi progreso</span>';
      if (bump) { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }
    };
    var old = $('.xp'); if (old) old.remove();
    if (bar) {
      chip = document.createElement('button'); chip.type = 'button'; chip.className = 'xp'; chip.setAttribute('aria-haspopup', 'dialog');
      bar.insertBefore(chip, bar.firstChild); paintChip(false);
      chip.addEventListener('click', function () { openPanel(); });
    }

    // ----- Registrar actividad al completar lecciones y quizzes perfectos -----
    var record = function () { var a = activity(), k = ymd(); a[k] = (a[k] || 0) + 1; store.set('actividad', JSON.stringify(a)); };
    $$('[data-complete]').forEach(function (b) {
      b.addEventListener('click', function () {
        var lv0 = levelOf(xpNow());
        if (b.classList.contains('done')) record();
        setTimeout(function () {
          paintChip(true); checkLogros();
          var lv1 = levelOf(xpNow());
          if (lv1 > lv0) say('🚀 ¡Nivel ' + lv1 + ' · ' + TITLES[Math.min(lv1 - 1, TITLES.length - 1)] + '!');
        }, 0);
      });
    });
    $$('.quiz-score').forEach(function (s) {
      new MutationObserver(function () {
        if (/Excelente/.test(s.textContent) && store.get('logro:quiz:' + location.pathname) !== '1') { store.set('logro:quiz:' + location.pathname, '1'); paintChip(true); checkLogros(); }
      }).observe(s, { childList: true, characterData: true, subtree: true });
    });

    // ----- Panel «Mi progreso» -----
    var panel = null;
    var countUp = function (el, to) {
      if (reduce) { el.textContent = to; return; }
      var t0 = performance.now();
      (function f(t) { var p = Math.min(1, (t - t0) / 800); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
    };
    var nextLesson = function () {
      if (!data) return null;
      for (var i = 0; i < data.length; i++) for (var j = 0; j < data[i].lessons.length; j++) if (!isDone(data[i].lessons[j].key)) return { c: data[i], l: data[i].lessons[j] };
      return null;
    };
    var openPanel = function () {
      load().then(function () {
        if (!panel) {
          panel = document.createElement('div'); panel.className = 'pal prog-pal'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Mi progreso');
          document.body.appendChild(panel);
          panel.addEventListener('mousedown', function (e) { if (e.target === panel) closePanel(); });
          addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
        }
        renderPanel(); panel.classList.add('open'); var cb = $('.pp-close', panel); if (cb) cb.focus();
      });
    };
    var closePanel = function () { if (panel) panel.classList.remove('open'); if (chip) paintChip(false); };
    var dailyHtml = function () {
      if (window.__comunidad && window.__comunidad.enabled) return '<div id="pp-com"></div>';
      var q = dailyQ(), st = store.get('diario:' + ymd());
      var h = '<div class="pp-daily"><p><b>' + esc(q[0]) + '</b></p><div class="pp-dopts">';
      q[1].forEach(function (o, i) { h += '<button type="button" class="chip' + (st && i === q[2] ? ' on' : '') + '" data-d="' + i + '"' + (st ? ' disabled' : '') + '>' + esc(o) + '</button>'; });
      return h + '</div>' + (st === '1' ? '<p class="pp-small">✅ ¡Correcto! Vuelve mañana por otro.</p>' : st ? '<p class="pp-small">❌ La respuesta era «' + esc(q[1][q[2]]) + '». Mañana hay otro reto.</p>' : '') + '</div>';
    };
    var renderPanel = function () {
      var xp = xpNow(), lvl = levelOf(xp), base = Math.pow(lvl - 1, 2) * 100, nxt = Math.pow(lvl, 2) * 100, ti = titleIdx(lvl), s = streaks(), un = unlocked();
      var meta = +store.get('meta') || 3, wk = weekCount(), a = activity(), nl = nextLesson();
      var week = '';
      for (var i = 6; i >= 0; i--) { var d = addDays(-i), n = a[ymd(d)] || 0; week += '<div class="pp-day' + (n ? ' on' : '') + (i === 0 ? ' today' : '') + '" title="' + n + ' lección(es)"><i style="height:' + Math.min(100, 18 + n * 28) + '%"></i><span>' + 'DLMMJVS'.charAt(d.getDay()) + '</span></div>'; }
      var courses = (data || []).map(function (c) {
        var st = courseStats(c), done = st.done === st.total;
        return '<a class="pp-course" href="' + BASE + '../' + c.home + '"><span>' + c.emoji + ' ' + esc(c.name) + '</span><div class="progress"><div style="width:' + Math.round(st.pct * 100) + '%"></div></div><small>' + (done ? '🎉 Completo' : st.done + ' / ' + st.total) + '</small></a>';
      }).join('');
      var logros = LOGROS.map(function (l, i) { var on = un.indexOf(l.id) > -1; return '<li class="pp-logro' + (on ? ' on' : '') + '" style="--i:' + i + '" title="' + esc(l.d) + '"><span class="ico">' + (on ? l.ico : '🔒') + '</span><b>' + esc(l.t) + '</b><small>' + esc(l.d) + '</small></li>'; }).join('');
      panel.innerHTML = '<div class="pal-box pp-box"><button type="button" class="pp-close icon-btn" aria-label="Cerrar">✕</button>' +
        '<div class="pp-head"><div class="pp-av" aria-hidden="true">' + AVATARS[ti] + '</div><div><p class="pp-kicker">Nivel <span id="pp-lvl">0</span> · ' + TITLES[ti] + '</p><h2>Mi progreso</h2>' +
        '<div class="progress"><div style="width:0" id="pp-xpbar"></div></div><p class="pp-small"><span id="pp-xp">0</span> XP · faltan ' + (nxt - xp) + ' para el nivel ' + (lvl + 1) + '</p></div></div>' +
        '<div class="pp-stats"><div><b id="pp-s1">0</b><span>lecciones</span></div><div><b>🔥 <span id="pp-s2">0</span></b><span>racha (días)</span></div><div><b id="pp-s3">0</b><span>mejor racha</span></div><div><b id="pp-s4">0</b><span>quizzes perfectos</span></div></div>' +
        (nl ? '<a class="btn pp-cta" href="' + BASE + '../' + nl.l.path + '">▶ Continuar: ' + esc(nl.l.title) + ' <small>(' + esc(nl.c.name) + ')</small></a>' : '<p class="pp-small">🎉 ¡Completaste todo lo disponible!</p>') +
        '<h3>' + (window.__comunidad && window.__comunidad.enabled ? 'Mi comunidad <small>reto del día · ranking · perfil</small>' : 'Reto del día <small>+25 XP · mantiene tu racha</small>') + '</h3>' + dailyHtml() +
        '<h3>Apariencia <small>se desbloquea con el nivel</small></h3><div class="pp-skins">' + SKINS.map(function (k) { var ok = k.lv <= lvl; return '<button type="button" class="pp-skin' + ((store.get('skin') || 'base') === k.id && ok ? ' on' : '') + '" data-skin="' + k.id + '"' + (ok ? '' : ' disabled') + ' title="' + (ok ? k.n : 'Nivel ' + k.lv) + '"><i style="background:' + k.c + '"></i>' + (ok ? k.n : '🔒 Nv ' + k.lv) + '</button>'; }).join('') + '</div>' +
        '<div class="pp-avs">' + AVATARS.map(function (e, i) { var ok = i <= lvl - 1; return '<button type="button" class="pp-avb' + (i === ti ? ' on' : '') + '" data-av="' + i + '"' + (ok ? '' : ' disabled') + ' title="' + (ok ? TITLES[i] : 'Nivel ' + (i + 1)) + '">' + (ok ? e : '🔒') + '</button>'; }).join('') + '</div>' +
        '<h3>Meta de la semana</h3><div class="pp-goal"><div class="pp-week">' + week + '</div><div><p><b>' + Math.min(wk, 99) + '</b> de <b>' + meta + '</b> lecciones en los últimos 7 días' + (wk >= meta ? ' ✅' : '') + '</p><label>Mi meta: <select id="pp-meta">' + [1, 2, 3, 5, 7, 10].map(function (n) { return '<option' + (n === meta ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select> lecciones por semana</label>' + (s.todayDone ? '<p class="pp-small">✔ Hoy ya estudiaste. ¡Racha a salvo!</p>' : '<p class="pp-small">' + (s.cur ? '⚠ Completa una lección hoy para mantener tu racha de ' + s.cur + '.' : 'Completa una lección hoy para empezar tu racha.') + '</p>') + '</div></div>' +
        '<p class="pp-small">🛡️ Escudos de racha: <b>' + shieldsAvail() + '</b> · ganas uno cada 3 niveles y se usa solo si fallas un día.</p>' +
        '<h3>Mis cursos</h3><div class="pp-courses">' + courses + '</div>' +
        '<h3>Logros <small>' + un.length + ' / ' + LOGROS.length + '</small></h3><ul class="pp-logros">' + logros + '</ul>' +
        '<h3>Chuletas y compartir</h3><div class="pp-actions pp-act0"><a class="icon-btn" href="' + CHULETAS + '">📄 Chuletas por curso</a><button type="button" class="icon-btn" id="pp-share">📤 Compartir mi insignia</button></div>' +
        '<details class="pp-backup"><summary>Respaldar o pasar mi progreso a otro dispositivo</summary><p class="pp-small">Tu progreso vive solo en este navegador. Copia el código y pégalo en el otro dispositivo (o guárdalo como respaldo).</p><textarea id="pp-code" rows="3" readonly aria-label="Código de mi progreso"></textarea><div class="pp-actions"><button type="button" class="icon-btn" id="pp-copy">Copiar código</button><button type="button" class="icon-btn" id="pp-restore">Restaurar desde el código pegado</button></div></details></div>';
      requestAnimationFrame(function () {
        countUp($('#pp-lvl', panel), lvl); countUp($('#pp-xp', panel), xp); countUp($('#pp-s1', panel), lessonsDone()); countUp($('#pp-s2', panel), s.cur); countUp($('#pp-s3', panel), s.best); countUp($('#pp-s4', panel), perfectQuizzes());
        setTimeout(function () { var b = $('#pp-xpbar', panel); if (b) b.style.width = Math.round((xp - base) / (nxt - base) * 100) + '%'; $$('.pp-course .progress > div', panel).forEach(function (x) { x.style.transition = 'width 1s'; }); }, 60);
      });
      $('.pp-close', panel).addEventListener('click', closePanel);
      var com = $('#pp-com', panel);
      if (com && window.__comunidad) {
        var dn = Math.floor(new Date(ymd() + 'T00:00:00') / 864e5);
        window.__comunidad.render(com, { q: dailyQ(), dia: dn % DAILY.length, avatar: +(store.get('avatar') || 0), avatars: AVATARS, say: say,
          onReto: function (ok) { store.set('diario:' + ymd(), ok ? '1' : 'x'); if (ok) say('🎯 +25 XP · reto del día'); paintChip(ok); checkLogros(); } });
      }
      $$('.pp-dopts .chip', panel).forEach(function (b) { b.addEventListener('click', function () {
        var ok = +b.getAttribute('data-d') === dailyQ()[2]; store.set('diario:' + ymd(), ok ? '1' : 'x');
        if (ok) say('🎯 +25 XP · reto del día'); paintChip(ok); checkLogros(); renderPanel();
      }); });
      $$('.pp-skin', panel).forEach(function (b) { b.addEventListener('click', function () { store.set('skin', b.getAttribute('data-skin')); applySkin(); renderPanel(); }); });
      $$('.pp-avb', panel).forEach(function (b) { b.addEventListener('click', function () { store.set('avatar', b.getAttribute('data-av')); renderPanel(); paintChip(false); }); });
      $('#pp-share', panel).addEventListener('click', function () {
        shareImage().toBlob(function (bl) {
          var f = new File([bl], 'mi-progreso.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], text: 'Mi progreso en Desarrollo web desde cero' }).catch(function () {});
          else { var a2 = document.createElement('a'); a2.href = URL.createObjectURL(bl); a2.download = 'mi-progreso.png'; a2.click(); say('🖼️ Insignia descargada'); }
        });
      });
      $('#pp-meta', panel).addEventListener('change', function (e) { store.set('meta', e.target.value); renderPanel(); checkLogros(); });
      var code = $('#pp-code', panel), snapshot = function () {
        var o = {}; store.keys().forEach(function (k) { if (/^(leccion:|logro:|actividad|meta|logros|racha|tema|check:|cuaderno:|repaso:)/.test(k)) o[k] = store.get(k); });
        return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
      };
      code.value = snapshot();
      $('#pp-copy', panel).addEventListener('click', function () { (navigator.clipboard ? navigator.clipboard.writeText(code.value) : Promise.reject()).then(function () { say('📋 Código copiado'); }, function () { code.select(); }); });
      $('#pp-restore', panel).addEventListener('click', function () {
        code.removeAttribute('readonly'); code.value = ''; code.placeholder = 'Pega aquí tu código y vuelve a pulsar «Restaurar»'; code.focus();
        $('#pp-restore', panel).onclick = function () {
          try {
            var o = JSON.parse(decodeURIComponent(escape(atob(code.value.trim()))));
            Object.keys(o).forEach(function (k) { if (/^(leccion:|logro:|actividad|meta|logros|racha|tema|check:|cuaderno:|repaso:)/.test(k)) store.set(k, o[k]); });
            say('✅ Progreso restaurado'); location.reload();
          } catch (e) { say('⚠ El código no es válido'); }
        };
      });
    };

    // ----- Temario animado: filtros, anillo de avance y "sigue aquí" -----
    var lessons = $('.lessons');
    if (lessons && $$('[data-leccion]', lessons).length) {
      var cards = $$('li', lessons), total = cards.filter(function (li) { return $('a[data-leccion]', li); }).length;
      var doneN = cards.filter(function (li) { var a = $('a[data-leccion]', li); return a && isDone(a.getAttribute('data-leccion')); }).length;
      var tb = document.createElement('div'); tb.className = 'tema-bar';
      var C = 2 * Math.PI * 22;
      tb.innerHTML = '<div class="ring" role="img" aria-label="' + doneN + ' de ' + total + ' lecciones"><svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="22" class="r-bg"/><circle cx="26" cy="26" r="22" class="r-fg" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '"/></svg><b>' + Math.round(total ? doneN / total * 100 : 0) + '%</b></div>' +
        '<div class="tema-txt"><strong>' + doneN + ' de ' + total + ' lecciones</strong><span>' + (doneN === total && total ? '🎉 ¡Curso completado!' : doneN ? 'Sigue así, vas ' + (doneN / total > .5 ? 'muy bien' : 'avanzando') + '.' : 'Aún no empiezas. ¡Anímate con la primera!') + '</span></div>' +
        '<div class="chips" role="group" aria-label="Filtrar lecciones"><button type="button" class="chip on" data-f="all">Todas</button><button type="button" class="chip" data-f="todo">Pendientes</button><button type="button" class="chip" data-f="done">Completadas</button></div>';
      lessons.parentNode.insertBefore(tb, lessons);
      setTimeout(function () { var fg = $('.r-fg', tb); if (fg) fg.style.strokeDashoffset = (C * (1 - (total ? doneN / total : 0))).toFixed(1); }, 200);
      var first = null;
      cards.forEach(function (li) { var a = $('a[data-leccion]', li); if (a && !first && !isDone(a.getAttribute('data-leccion'))) { first = a; } });
      if (first) { first.classList.add('here'); var hb = document.createElement('span'); hb.className = 'here-badge'; hb.textContent = '👉 Sigue aquí'; first.appendChild(hb); }
      $$('.chip', tb).forEach(function (ch) {
        ch.addEventListener('click', function () {
          $$('.chip', tb).forEach(function (x) { x.classList.toggle('on', x === ch); });
          var f = ch.getAttribute('data-f'), n = 0;
          cards.forEach(function (li) {
            if (li.classList.contains('mod-head')) { return; }
            var a = $('a[data-leccion]', li), d = a && isDone(a.getAttribute('data-leccion')), show = f === 'all' || (f === 'done' ? d : !d);
            li.hidden = !show; if (show) { li.style.animation = 'none'; void li.offsetWidth; li.style.animation = 'rise .4s ease both'; li.style.animationDelay = (n++ * 40) + 'ms'; }
          });
          syncMods();
        });
      });
      // Módulos: progreso propio y ocultar encabezados sin tarjetas visibles
      var syncMods = function () {
        var head = null, vis = 0, dn = 0, tot = 0;
        var close = function () { if (head) { head.hidden = !vis; var pr = $('.mod-prog', head); if (pr) { var T = +pr.getAttribute('data-total') || tot; pr.querySelector('b').textContent = dn + ' / ' + T; pr.querySelector('i').style.setProperty('--p', (T ? dn / T * 100 : 0) + '%'); head.classList.toggle('ok', T && dn === T); } } };
        cards.forEach(function (li) {
          if (li.classList.contains('mod-head')) { close(); head = li; vis = 0; dn = 0; tot = 0; return; }
          var a = $('a[data-leccion]', li); tot++;
          if (!li.hidden) vis++;
          if (a && isDone(a.getAttribute('data-leccion'))) dn++;
        });
        close();
      };
      syncMods();
      if ('IntersectionObserver' in window && !reduce) {
        var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } }); }, { threshold: .3 });
        cards.forEach(function (li) { io.observe(li); });
      }
    }

    // ----- Ruta animada: pista con hitos, progreso por paso y "estás aquí" -----
    var route = $('.route');
    if (route) {
      load().then(function () {
        var items = $$('li', route), steps = [], track = document.createElement('div');
        items.forEach(function (li) {
          var a = $('a', li), href = a ? a.getAttribute('href') : '', c = null;
          (data || []).forEach(function (x) { if (href === x.home || (x.id === 'html' && /^11-git/.test(href))) c = x; });
          var st = { li: li, c: c, pct: 0, label: '', done: false };
          if (/^11-git/.test(href)) { st.pct = isDone('11') ? 1 : 0; st.label = st.pct ? 'Completada' : 'Lección 11 de HTML'; st.done = !!st.pct; }
          else if (c) { var cstat = courseStats(c); st.pct = cstat.pct; st.done = cstat.done === cstat.total; st.label = st.done ? '🎉 Completo' : cstat.done + ' de ' + cstat.total; }
          else if (li.classList.contains('soon')) st.label = 'Próximamente';
          steps.push(st);
        });
        var cur = -1; steps.forEach(function (s, i) { if (cur < 0 && !s.done && !s.li.classList.contains('soon')) cur = i; });
        var reached = cur < 0 ? steps.length : cur;
        track.className = 'route-track'; track.setAttribute('aria-hidden', 'true');
        track.innerHTML = '<div class="rt-line"><i style="--w:' + (steps.length > 1 ? Math.min(100, (reached) / (steps.length - 1) * 100) : 0) + '%"></i></div>' + steps.map(function (s, i) { return '<span class="rt-dot' + (s.done ? ' done' : '') + (i === cur ? ' cur' : '') + (s.li.classList.contains('soon') ? ' soon' : '') + '" style="--i:' + i + '">' + (s.done ? '✓' : i + 1) + '</span>'; }).join('');
        route.parentNode.insertBefore(track, route);
        steps.forEach(function (s, i) {
          var s2 = $('.route-s', s.li); if (s2 && s.label) s2.textContent = s.label;
          if (s.pct > 0 || (s.c && !s.li.classList.contains('soon'))) { var pb = document.createElement('span'); pb.className = 'route-bar'; pb.innerHTML = '<i style="width:' + Math.round(s.pct * 100) + '%"></i>'; (s.li.querySelector('a') || s.li).appendChild(pb); }
          if (s.done) s.li.classList.add('finished');
          if (i === cur) { s.li.classList.add('current'); var tg = document.createElement('span'); tg.className = 'here-badge'; tg.textContent = '📍 Estás aquí'; (s.li.querySelector('a') || s.li).appendChild(tg); }
          s.li.style.setProperty('--i', i);
        });
        if ('IntersectionObserver' in window && !reduce) {
          route.classList.add('pre');
          var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { route.classList.remove('pre'); track.classList.add('go'); io2.disconnect(); } }); }, { threshold: .2 });
          io2.observe(route);
        } else track.classList.add('go');
        var nl = nextLesson();
        if (nl) {
          var cta = document.createElement('a'); cta.className = 'btn route-cta'; cta.href = BASE + '../' + nl.l.path;
          cta.innerHTML = (isDone(nl.c.pre + '01') || lessonsDone() ? '▶ Continuar: ' : '▶ Empezar: ') + esc(nl.l.title);
          route.parentNode.insertBefore(cta, track);
        }
      });
    }

    applySkin();
    load().then(function () { checkShield(); applySkin(); paintChip(false); checkLogros(); });
    window.__progreso = { open: openPanel };
  } catch (err) { /* opcional */ }
})();

// ---------- PWA: registrar el service worker (uso sin conexión) ----------
(function () {
  try {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    var base = new URL('../', document.currentScript.src).href;
    addEventListener('load', function () { navigator.serviceWorker.register(base + 'sw.js', { scope: base }).catch(function () {}); });
  } catch (err) { /* opcional */ }
})();

// Herramientas de estudio personal (cuaderno, repaso espaciado)
(function () { var cs = document.currentScript; if (!cs || !cs.src) return; var s = document.createElement('script'); s.src = cs.src.replace(/curso\.js(\?.*)?$/, 'estudio.js'); s.defer = true; document.head.appendChild(s); })();
