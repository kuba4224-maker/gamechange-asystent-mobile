// ═══════════════════════════════════════════════════════════════════
// REJESTRACJA HOOKA — PLAN-D 18.08.2026
// ═══════════════════════════════════════════════════════════════════
//
// Jedyne zadanie: podpiąć `tests/ts-loader.mjs` do Node, zanim ruszy strażnik.
// ⛔ Osobny plik, bo `--import` przyjmuje moduł, a `register()` musi wykonać się
// PRZED pierwszym importem sprawdzanego pliku.

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(new URL('./ts-loader.mjs', import.meta.url).href, pathToFileURL(`${process.cwd()}/`).href);
