// Genera simulador/bot.bundle.js (IIFE, global `Bot`) a partir del motor de codigo/src.
// Uso: node scripts/empaquetar-simulador.mjs
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const entrada = join(raiz, 'scripts', 'simulador-entrada.js');
const salida = join(raiz, 'simulador', 'bot.bundle.js');
const args = [entrada, '--bundle', '--format=iife', '--global-name=Bot', '--target=es2020', `--outfile=${salida}`, '--log-level=warning'];

const local = join(raiz, 'codigo', 'node_modules', 'esbuild', 'bin', 'esbuild');
const r = existsSync(local)
  ? spawnSync(process.execPath, [local, ...args], { stdio: 'inherit' })
  : spawnSync('npx', ['--yes', 'esbuild', ...args], { stdio: 'inherit', shell: true });
if (r.status !== 0) { console.error('Falló el empaquetado'); process.exit(1); }
console.log('Listo:', salida);
