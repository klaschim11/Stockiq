// test_dev_tab3.js -- DDB-4 Verify
var puppeteer = require('puppeteer');
var path = require('path');

(async function() {
  var browser = await puppeteer.launch();
  var page = await browser.newPage();
  var url = 'http://localhost:8080/dev/stockiq_dev.html';
  // Port anpassen falls abweichend -- pruefen mit:
  // netstat -ano | findstr :80

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Tab 3 aktivieren
  await page.evaluate(function() { showTab(2); });
  await new Promise(function(r) { setTimeout(r, 1500); }); // JSON-Fetch abwarten

  var results = await page.evaluate(function() {
    function nonEmpty(id) {
      var el = document.getElementById(id);
      if (!el) return 'FEHLT';
      var t = el.innerText.trim();
      if (!t || t === 'Wird geladen...') return 'LEER';
      return 'OK (' + t.substring(0, 40) + '...)';
    }
    return {
      sektorIC:    nonEmpty('sektor-ic-content'),
      annualIC:    nonEmpty('annual-ic-content'),
      fh3b:        nonEmpty('fh3b-readiness'),
      consoleErrs: window.__errors__ || []
    };
  });

  console.log('sektor-ic-content : ' + results.sektorIC);
  console.log('annual-ic-content : ' + results.annualIC);
  console.log('fh3b-readiness    : ' + results.fh3b);

  var ok = results.sektorIC.indexOf('OK') === 0
        && results.annualIC.indexOf('OK') === 0
        && results.fh3b.indexOf('OK') === 0;
  console.log(ok ? '\nALL OK' : '\nFEHLER -- mind. 1 Container leer');

  await browser.close();
  process.exit(ok ? 0 : 1);
})();
