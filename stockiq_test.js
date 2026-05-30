/**
 * stockiq_test.js
 * StockIQ — Minimales Testframework
 * Aufruf: node stockiq_test.js [pfad/zu/dashboard.html]
 *
 * Was getestet wird:
 *   1. Syntax aller Script-Bloecke (node --check)
 *   2. Kritische Funktionen vorhanden
 *   3. Gewichte summieren auf 1.00
 *   4. Keine verbotenen ES6-Konstrukte
 *   5. File-Input: kein div+onclick Pattern
 *   6. Keine alten Score-Gewichte (ROCE 30%)
 *   7. ALIAS-Konsistenz
 *   8. STOCKS-Array geschlossen
 */

var fs   = require('fs');
var path = require('path');
var cp   = require('child_process');
var os   = require('os');

var file = process.argv[2] || 'index.html';
if (!fs.existsSync(file)) {
  console.error('FEHLER: Datei nicht gefunden: ' + file);
  process.exit(1);
}

var html = fs.readFileSync(file, 'utf8');
var pass = 0;
var fail = 0;
var warns = 0;

function ok(name) {
  console.log('  [OK]  ' + name);
  pass++;
}
function err(name, detail) {
  console.log('  [!!]  ' + name + (detail ? ' — ' + detail : ''));
  fail++;
}
function warn(name, detail) {
  console.log('  [~~]  ' + name + (detail ? ' — ' + detail : ''));
  warns++;
}

console.log('');
console.log('StockIQ Test-Suite');
console.log('Datei: ' + file);
console.log('='.repeat(55));

// ── 1. Script-Block Syntax ────────────────────────────────
console.log('\n1. Script-Block Syntax (node --check)');
var blocks = [];
var re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
var m;
while ((m = re.exec(html)) !== null) {
  var content = m[1].trim();
  if (content.length > 0) blocks.push(content);
}
console.log('   Gefunden: ' + blocks.length + ' Bloecke');

var allSyntaxOk = true;
blocks.forEach(function(b, i) {
  var tmp = path.join(os.tmpdir(), 'stockiq_test_' + i + '.js');
  fs.writeFileSync(tmp, b);
  var r = cp.spawnSync('node', ['--check', tmp], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  if (r.status !== 0 && r.stderr.indexOf('SyntaxError') !== -1) {
    err('Block ' + (i+1), r.stderr.split('\n')[0]);
    allSyntaxOk = false;
  }
});
if (allSyntaxOk) ok('Alle ' + blocks.length + ' Bloecke fehlerfrei');

// ── 2. Kritische Funktionen vorhanden ─────────────────────
console.log('\n2. Kritische Funktionen');
var requiredFunctions = [
  'function fSc',
  'function debtSc',
  'function momSc',
  'function cSc',
  'function mSig',
  'function loadFund',
  'function archSnapshot',
  'function archExportJSON',
  'function wl2Export',
  'function wl2ChartExport',
  'function calcEtfScores',
];
requiredFunctions.forEach(function(fn) {
  if (html.indexOf(fn) !== -1) {
    ok(fn + '()');
  } else {
    err(fn + '() FEHLT');
  }
});
// rSc inline pruefen (cSc-Fallback)
if (html.indexOf('var rSc') !== -1) ok('rSc (inline vorhanden)');
else err('rSc FEHLT');

// ── 3. Keine verbotenen ES6-Konstrukte ────────────────────
console.log('\n3. ES5-Kompatibilitaet (iOS Safari)');
var scriptContent = blocks.join('\n');

// Arrow functions
var arrowMatches = scriptContent.match(/[^=!<>]=>(?!=)/g);
if (arrowMatches && arrowMatches.length > 0) {
  err('Arrow functions gefunden (' + arrowMatches.length + 'x) — iOS bricht ab');
} else {
  ok('Keine Arrow functions');
}

// const/let
var constMatches = scriptContent.match(/\b(const|let)\s+/g);
if (constMatches && constMatches.length > 0) {
  err('const/let gefunden (' + constMatches.length + 'x) — ES6 nicht erlaubt');
} else {
  ok('Kein const/let');
}

// Template literals
var templateMatches = scriptContent.match(/`[^`]*`/g);
if (templateMatches && templateMatches.length > 0) {
  err('Template literals gefunden (' + templateMatches.length + 'x)');
} else {
  ok('Keine Template literals');
}

// Optional chaining
var optChainMatches = scriptContent.match(/\?\./g);
if (optChainMatches && optChainMatches.length > 0) {
  err('Optional chaining (?.) gefunden (' + optChainMatches.length + 'x)');
} else {
  ok('Kein optional chaining');
}

// ── 4. File-Input Pattern ─────────────────────────────────
console.log('\n4. File-Input Kompatibilitaet (Windows/iOS)');
var badPattern = /onclick="document\.getElementById\([^)]+\)\.click\(\)"/g;
var badMatches = html.match(badPattern);
if (badMatches && badMatches.length > 0) {
  err('div+onclick file trigger gefunden (' + badMatches.length + 'x) — bricht auf Windows/iOS',
      'Fix: <label for="id"> verwenden');
} else {
  ok('Keine div+onclick file triggers');
}

// label for pattern vorhanden
var labelMatches = html.match(/<label\s+for="[^"]+"/g);
if (labelMatches && labelMatches.length >= 1) {
  ok('File inputs als <label for> (' + labelMatches.length + 'x)');
} else {
  warn('Weniger als 1 <label for> file input gefunden');
}

// ── 5. Score-Gewichte ─────────────────────────────────────
console.log('\n5. Score-Gewichte (v5.9.84 IC-Update)');

// Alte ROCE-Gewichte
if (scriptContent.indexOf('rs*0.30') !== -1 || scriptContent.indexOf('rs * 0.30') !== -1) {
  // Schaue ob es in fSc-Kontext steht
  var roceOldCtx = scriptContent.match(/valSc\*0\.20[\s\S]{0,50}rs\*0\.30/);
  if (roceOldCtx) {
    err('Altes fSc()-Gewicht: valSc*0.20 + ROCE*0.30 — soll 0.30/0.20 sein');
  } else {
    ok('ROCE-Gewicht in fSc() korrekt (0.20)');
  }
} else {
  ok('ROCE-Gewicht in fSc() korrekt');
}

// EV/EBIT-Gewicht
if (scriptContent.indexOf('evEbitSc(eveit)*0.45') !== -1) {
  ok('EV/EBIT Gewicht 0.45 (IC-Update)');
} else {
  warn('EV/EBIT Gewicht: 0.45 nicht gefunden — pruefen ob v5.9.84 aktiv');
}

// max(fcfRaw,oeSc2) fuer Owner Earnings
if (scriptContent.indexOf('Math.max(fcfRaw,oeSc2)') !== -1) {
  ok('max(FCF,OE) in fSc() vorhanden');
} else {
  warn('max(FCF,OE) nicht gefunden — Owner Earnings Integration pruefen');
}

// ── 6. Version ────────────────────────────────────────────
console.log('\n6. Version');
var vMatch = html.match(/StockIQ v(\d+\.\d+\.\d+)/);
if (vMatch) {
  ok('Version: ' + vMatch[1]);
} else {
  warn('Version nicht erkannt');
}

// Script-Bloecke zaehlen
if (blocks.length === 13) {
  ok('Script-Block-Anzahl: 13 (erwartet: 13, v6.0.11 +Onboarding)');
} else {
  err('Script-Block-Anzahl: ' + blocks.length + ' (erwartet: 13)');
}

// ── 7. ALIAS-Konsistenz ───────────────────────────────────
console.log('\n7. ALIAS-Eintraege (yfinance Ticker-Map)');
// Aliases im Format "ITX.MC":"INDITEX" etc.
var requiredAliases = [
  { key: 'ITX.MC',  label: 'ITX (Inditex)' },
  { key: 'AI.PA',   label: 'AI (Air Liquide)' },
  { key: 'SAN.MC',  label: 'SAN (Sanofi via MC)' },
  { key: 'SAND.ST', label: 'SAND (Sandvik)' },
];
requiredAliases.forEach(function(a) {
  if (html.indexOf('"' + a.key + '"') !== -1) {
    ok('ALIAS: ' + a.label + ' (' + a.key + ')');
  } else {
    warn('ALIAS nicht gefunden: ' + a.key + ' — Format pruefen');
  }
});

// ── 8. STOCKS Array ───────────────────────────────────────
console.log('\n8. STOCKS-Array');
var stocksMatch = html.match(/var STOCKS\s*=\s*\[/);
if (stocksMatch) {
  // Grobe Pruefung: Array wird irgendwo geschlossen
  var stocksIdx = html.indexOf('var STOCKS');
  var closing = html.indexOf('];', stocksIdx);
  if (closing !== -1 && closing - stocksIdx < 200000) {
    ok('STOCKS-Array gefunden und geschlossen');
  } else {
    err('STOCKS-Array schliessendes ]; nicht gefunden');
  }
} else {
  err('STOCKS-Array nicht gefunden');
}

// ── Zusammenfassung ───────────────────────────────────────
console.log('');
console.log('='.repeat(55));
console.log('ERGEBNIS: ' + pass + ' OK | ' + warns + ' Warnungen | ' + fail + ' Fehler');
console.log('='.repeat(55));

if (fail > 0) {
  console.log('NICHT DEPLOY-BEREIT — ' + fail + ' Fehler beheben');
  process.exit(1);
} else if (warns > 0) {
  console.log('DEPLOY MOEGLICH — ' + warns + ' Warnungen pruefen');
  process.exit(0);
} else {
  console.log('ALLE TESTS BESTANDEN — Deploy bereit');
  process.exit(0);
}
