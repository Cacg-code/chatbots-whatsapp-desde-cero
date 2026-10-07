// Ejecuta la solución de cada ejercicio contra sus comprobaciones (checks).
// Uso: node scripts/probar-ejercicios.mjs [contenido/NN-slug.ej.md ...]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "contenido";
const archivos = process.argv.length > 2 ? process.argv.slice(2) : readdirSync(dir).filter((f) => f.endsWith(".ej.md")).map((f) => join(dir, f));
let fallos = 0, total = 0;
for (const f of archivos) {
  const txt = readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  const chk = /^```checks[^\n]*\n([\s\S]*?)^```/m.exec(txt);
  if (!chk) { console.log(`- ${f}: sin checks (solo pasos)`); continue; }
  const sols = [...txt.matchAll(/^```solucion[^\n]*\n([\s\S]*?)^```/gm)].map((m) => m[1]).join("\n");
  if (!sols) { console.log(`✗ ${f}: tiene checks pero no solución`); fallos++; continue; }
  let checks = JSON.parse(chk[1]);
  if (!Array.isArray(checks)) checks = checks.checks;
  let ok = 0;
  for (const c of checks) {
    total++;
    let r;
    try { r = new Function(sols + "\n" + c.t)(); } catch (e) { r = "ERROR " + e.message; }
    if (r === true) ok++; else { fallos++; console.log(`  ✗ ${f}: «${c.d}» → ${r}`); }
  }
  console.log(`${ok === checks.length ? "✓" : "✗"} ${f}: ${ok}/${checks.length}`);
}
console.log(fallos ? `\n${fallos} comprobación(es) fallan` : `\nTodo en orden (${total} comprobaciones)`);
process.exit(fallos ? 1 : 0);
