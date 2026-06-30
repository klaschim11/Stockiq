/* stockiq_ui_berichte.js -- Sektor-Analyse-Bericht Engine */
/* Extrahiert aus index.html | Sprint 53 | 27.06.2026 */
/* Dashboard v6.4.13 | ES5-only (iOS Safari + GitHub Pages) */

/* ============================================================
   SEKTOR-BERICHT ENGINE v5.9.51
   ============================================================ */

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ============================================================
   RPT-Registry (Sprint 57) -- erweiterbar fuer kuenftige Berichte
   Schema je Eintrag: key: { label, controls:fn, build:fn }
   Dispatcher: rptBuild() reagiert auf RPT_TYPE
   Type-Umschaltung: rptSetType(t) -> re-rendert Controls
   ============================================================ */
var RPT_TYPE = 'sector';
var RPT_REG = {
  sector: { label:'Sektor-Vergleich', controls:rptCtrlSector, build:rptBuildSector },
  dq:     { label:'Datenqualitaet',    controls:rptCtrlDQ,     build:rptDQ          }
};
function rptBuild(){ var r=RPT_REG[RPT_TYPE]; if(r&&r.build) r.build(); }
function rptSetType(t){ if(RPT_REG[t]){ RPT_TYPE=t; rptShowControls(); } }
/* Stubs -- gefuellt in nachfolgenden Briefen:
   rptCtrlSector  -> S57-4 (Extraktion aus rptShowControls)
   rptCtrlDQ      -> S57-5 (DQ-Controls: Schwellen-Toggle + Filter)
   rptDQ          -> S57-5 (DQ-Bericht-Body + CSV-Export)
*/
function rptCtrlSector(){
  var ctrl = document.getElementById('rpt-controls');
  ctrl.innerHTML += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">' +
    '<div><div style="font-family:monospace;font-size:9px;color:var(--mut);margin-bottom:3px">SEKTOR</div>' +
    '<select id="rpt-sector" onchange="rptFillStocks()" style="width:100%;box-sizing:border-box;background:#0a1628;border:1px solid #1a3050;border-radius:6px;padding:6px 8px;color:#dce8f5;font-size:11px;font-family:monospace"></select></div>' +
    '<div><div style="font-family:monospace;font-size:9px;color:var(--mut);margin-bottom:3px">AKTIE 1</div>' +
    '<select id="rpt-s1" style="width:100%;box-sizing:border-box;background:#0a1628;border:1px solid #1a3050;border-radius:6px;padding:6px 8px;color:#dce8f5;font-size:11px;font-family:monospace"></select></div>' +
    '<div><div style="font-family:monospace;font-size:9px;color:var(--mut);margin-bottom:3px">AKTIE 2</div>' +
    '<select id="rpt-s2" style="width:100%;box-sizing:border-box;background:#0a1628;border:1px solid #1a3050;border-radius:6px;padding:6px 8px;color:#dce8f5;font-size:11px;font-family:monospace"></select></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px">' +
    '<button onclick="rptBuild()" style="flex:1;background:#2d7dd2;border:none;color:#fff;font-size:12px;font-weight:700;padding:9px;border-radius:8px;cursor:pointer">&#9654; Bericht erstellen</button>' +
    '<button id="rpt-print-btn" onclick="rptPrint()" style="flex:1;background:#1a7a3a;border:none;color:#fff;font-size:12px;font-weight:700;padding:9px;border-radius:8px;cursor:pointer;display:none">&#128438; Als PDF drucken</button>' +
    '</div>';
  rptInitSectors();
}
function rptCtrlDQ(){
  var ctrl = document.getElementById('rpt-controls');
  /* Sektor-Liste aus _scoresIdx fuer Filter-Dropdown */
  var secs = {};
  for(var i=0; i<STOCKS.length; i++){
    var sd = _scoresIdx[STOCKS[i].t];
    if(sd && sd.sector) secs[sd.sector] = true;
  }
  var secList = [];
  for(var sk in secs) secList.push(sk);
  secList.sort();
  var secOpts = '<option value="">alle</option>';
  for(var si=0; si<secList.length; si++){
    secOpts += '<option value="' + escapeHtml(secList[si]) + '">' + escapeHtml(secList[si]) + '</option>';
  }
  var iSt = 'width:100%;box-sizing:border-box;background:#0a1628;border:1px solid #1a3050;border-radius:6px;padding:6px 8px;color:#dce8f5;font-size:11px;font-family:monospace';
  var lSt = 'font-family:monospace;font-size:9px;color:var(--mut);margin-bottom:3px';
  ctrl.innerHTML += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">' +
    '<div><div style="' + lSt + '">SCHWELLE (FEHLEND)</div>' +
    '<select id="dq-threshold" style="' + iSt + '">' +
    '<option value="1">&gt;=1</option>' +
    '<option value="2" selected>&gt;=2</option>' +
    '<option value="3">&gt;=3</option>' +
    '</select></div>' +
    '<div><div style="' + lSt + '">SIGNAL-FILTER</div>' +
    '<select id="dq-sigfilter" style="' + iSt + '">' +
    '<option value="all" selected>alle</option>' +
    '<optgroup label="BUY">' +
    '<option value="g:buy">BUY (alle)</option>' +
    '<option value="s:buy">- buy</option>' +
    '<option value="s:strong">- strong</option>' +
    '<option value="s:pb">- pb (PEG-Block)</option>' +
    '<option value="s:buy_rsi_warn">- buy_rsi_warn</option>' +
    '</optgroup>' +
    '<optgroup label="HOLD*">' +
    '<option value="g:holdstar">HOLD* (alle)</option>' +
    '<option value="s:hold_sf">- hold_sf</option>' +
    '<option value="s:hold_sf_div">- hold_sf_div</option>' +
    '<option value="s:hold_sf_both">- hold_sf_both</option>' +
    '<option value="s:hold_dvg">- hold_dvg</option>' +
    '</optgroup>' +
    '<optgroup label="HOLD">' +
    '<option value="s:hold">- hold</option>' +
    '</optgroup>' +
    '<optgroup label="SELL">' +
    '<option value="g:sell">SELL (alle)</option>' +
    '<option value="s:sell_zl">- sell_zl</option>' +
    '<option value="s:sell_ma">- sell_ma</option>' +
    '<option value="s:sell_hist">- sell_hist</option>' +
    '<option value="s:sell">- sell (generisch)</option>' +
    '</optgroup>' +
    '<optgroup label="WATCH / WEAK">' +
    '<option value="g:watch">WATCH/WEAK (alle)</option>' +
    '<option value="s:watch">- watch</option>' +
    '<option value="s:watch_rsi">- watch_rsi</option>' +
    '<option value="s:weak">- weak</option>' +
    '</optgroup>' +
    '</select></div>' +
    '<div><div style="' + lSt + '">SEKTOR-FILTER</div>' +
    '<select id="dq-sectorfilter" style="' + iSt + '">' + secOpts + '</select></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px">' +
    '<button onclick="rptBuild()" style="flex:1;background:#2d7dd2;border:none;color:#fff;font-size:12px;font-weight:700;padding:9px;border-radius:8px;cursor:pointer">&#9654; Bericht erstellen</button>' +
    '<button onclick="rptDqCsv()" style="flex:1;background:#5d2dd2;border:none;color:#fff;font-size:12px;font-weight:700;padding:9px;border-radius:8px;cursor:pointer">&#128190; CSV-Export</button>' +
    '<button id="rpt-print-btn" onclick="rptPrint()" style="flex:1;background:#1a7a3a;border:none;color:#fff;font-size:12px;font-weight:700;padding:9px;border-radius:8px;cursor:pointer;display:none">&#128438; Als PDF drucken</button>' +
    '</div>';
}
/* ===== DQ-Bericht-Kern (Sprint 57) =====
   rptDqCalc -- gemeinsame Datenstruktur fuer Tabelle und CSV
   rptDqCsv  -- CSV-Download (Forward-Compat fuer DQ-1-IC Q3 2026)
   rptDQ     -- Bericht-Body (11 Spalten + Footer-Stats)
   ======================================== */
function rptDqCalc(){
  var thrEl = document.getElementById('dq-threshold');
  var sfEl  = document.getElementById('dq-sigfilter');
  var secEl = document.getElementById('dq-sectorfilter');
  var thr = thrEl ? parseInt(thrEl.value, 10) : 2;
  var sf  = sfEl  ? sfEl.value  : 'all';
  var sec = secEl ? secEl.value : '';
  /* Signal-Filter Helper: 'all' | 'g:Gruppe' (aggregiert) | 's:exakt' (Sub-Signal) */
  function sigPass(sig, filt){
    if(filt === 'all') return true;
    if(filt.charAt(0) === 's' && filt.charAt(1) === ':'){
      return sig === filt.substring(2);
    }
    if(filt === 'g:buy')      return sig==='buy' || sig==='strong' || sig==='pb' || sig==='buy_rsi_warn';
    if(filt === 'g:holdstar') return isHoldSF(sig);
    if(filt === 'g:sell')     return isSell(sig);
    if(filt === 'g:watch')    return sig==='watch' || sig==='watch_rsi' || sig==='weak';
    return false;
  }
  var rows = [];
  for(var i=0; i<STOCKS.length; i++){
    var s = STOCKS[i];
    var sd = _scoresIdx[s.t];
    if(!sd) continue;
    var sig = mSig(s);
    var dr  = dqCheck(s.t, sig, true);   /* forceReturn=true -> Rohliste */
    if(!dr || dr.fields.length < thr) continue;
    /* Signal-Filter (hierarchisch: all / g:Gruppe / s:Sub) */
    if(!sigPass(sig, sf)) continue;
    /* Sektor-Filter */
    if(sec && sd.sector !== sec) continue;
    /* fSc-Bucket */
    var fs = (sd.fund_score !== null && sd.fund_score !== undefined) ? sd.fund_score : 0;
    var bucket = 'low';
    if(fs >= 85)      bucket = 'premium';
    else if(fs >= 70) bucket = 'good';
    else if(fs >= 50) bucket = 'mid';
    rows.push({
      t: s.t,
      n: s.n || s.t,
      sector: sd.sector || '',
      sig: sig,
      sigText: rptSigText(s),
      raw_sig: sd.signal || '',
      missing: dr.fields,
      n_missing: dr.fields.length,
      fund_score: fs,
      fsc_bucket: bucket,
      cSc: cSc(s),
      mom12m: (sd.mom12m_ret !== null && sd.mom12m_ret !== undefined) ? sd.mom12m_ret : null
    });
  }
  /* Sortierung: n_missing DESC, Signal-Prio, fund_score DESC */
  var prio = {strong:1, buy:2, buy_rsi_warn:2, pb:3, watch:4, watch_rsi:4,
              hold_sf:5, hold_sf_div:5, hold_sf_both:5, hold_dvg:5,
              hold:6, weak:7,
              sell:8, sell_zl:8, sell_ma:8, sell_hist:8};
  rows.sort(function(a, b){
    if(a.n_missing !== b.n_missing) return b.n_missing - a.n_missing;
    var pa = prio[a.sig] || 9;
    var pb = prio[b.sig] || 9;
    if(pa !== pb) return pa - pb;
    return b.fund_score - a.fund_score;
  });
  return rows;
}

function rptDqCsv(){
  var rows = rptDqCalc();
  if(rows.length === 0){
    alert('Keine Ticker zum Exportieren mit den aktuellen Filtern.');
    return;
  }
  var today = new Date().toISOString().substring(0, 10);
  var lines = ['ticker;name;sector;signal_post;signal_raw;missing_fields;n_missing;fund_score;fsc_bucket;cSc;mom12m_ret;snapshot_date'];
  for(var i=0; i<rows.length; i++){
    var r = rows[i];
    var nm = '"' + String(r.n).replace(/"/g, '""') + '"';
    var line = [
      r.t, nm, r.sector, r.sig, r.raw_sig,
      r.missing.join('|'),
      r.n_missing,
      r.fund_score.toFixed(1),
      r.fsc_bucket,
      (r.cSc !== null && r.cSc !== undefined) ? r.cSc.toFixed(1) : '',
      (r.mom12m !== null) ? r.mom12m.toFixed(4) : '',
      today
    ].join(';');
    lines.push(line);
  }
  var csv = lines.join('\n');
  var blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'stockiq_dq_snapshot_' + today + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function rptDQ(){
  var rows = rptDqCalc();
  var out = document.getElementById('rpt-output');
  var today = new Date().toISOString().substring(0, 10);
  /* Header */
  var html = '<div style="background:#0a1628;border:1px solid #1a3050;border-radius:12px;padding:20px;margin-bottom:20px">';
  html += '<h2 style="color:#2d7dd2;font-size:22px;margin:0 0 8px 0">Datenqualitaets-Bericht</h2>';
  html += '<div style="font-size:11px;color:#a0b0c0">Stand: ' + today + ' &mdash; ' + rows.length + ' Ticker</div>';
  html += '</div>';
  if(rows.length === 0){
    html += '<div style="background:#0a1628;border:1px solid #1a3050;border-radius:12px;padding:20px;text-align:center;color:#a0b0c0">Keine Ticker mit den aktuellen Filtern.</div>';
    out.innerHTML = html;
    return;
  }
  /* Tabelle */
  html += '<div style="background:#0a1628;border:1px solid #1a3050;border-radius:12px;padding:20px;overflow-x:auto;margin-bottom:20px">';
  html += '<table style="width:100%;border-collapse:collapse;font-size:11px;font-family:monospace">';
  html += '<thead><tr style="border-bottom:2px solid #1a3050;color:#dce8f5;text-align:left">';
  var hdrs = ['Ticker', 'Name', 'Sektor', 'Signal', 'Raw', 'Fehlend', '#', 'fSc', 'Bucket', 'cSc', '12M'];
  for(var h=0; h<hdrs.length; h++) html += '<th style="padding:6px 8px">' + hdrs[h] + '</th>';
  html += '</tr></thead><tbody>';
  for(var i=0; i<rows.length; i++){
    var r = rows[i];
    html += '<tr style="border-bottom:1px solid #11203a">';
    html += '<td style="padding:6px 8px"><a href="javascript:rptDetailCard(\'' + r.t + '\')" style="color:#2d7dd2;text-decoration:none;font-weight:700">' + escapeHtml(r.t) + '</a></td>';
    html += '<td style="padding:6px 8px;color:#dce8f5">' + escapeHtml(r.n) + '</td>';
    html += '<td style="padding:6px 8px;color:#a0b0c0">' + escapeHtml(r.sector) + '</td>';
    html += '<td style="padding:6px 8px;color:#dce8f5">' + escapeHtml(r.sigText) + '</td>';
    html += '<td style="padding:6px 8px;color:#a0b0c0">' + escapeHtml(r.raw_sig) + '</td>';
    html += '<td style="padding:6px 8px;color:#ffb000">' + escapeHtml(r.missing.join(', ')) + '</td>';
    html += '<td style="padding:6px 8px;color:#dce8f5;font-weight:700">' + r.n_missing + '</td>';
    html += '<td style="padding:6px 8px;color:#dce8f5">' + r.fund_score.toFixed(0) + '</td>';
    html += '<td style="padding:6px 8px;color:#a0b0c0">' + r.fsc_bucket + '</td>';
    var csVal = (r.cSc !== null && r.cSc !== undefined) ? r.cSc.toFixed(0) : '-';
    html += '<td style="padding:6px 8px;color:#a0b0c0">' + csVal + '</td>';
    var mVal = (r.mom12m !== null) ? (r.mom12m * 100).toFixed(1) + '%' : '-';
    html += '<td style="padding:6px 8px;color:#a0b0c0">' + mVal + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  /* Footer-Stats */
  var bySig = {}, bySec = {}, fsSum = 0, fsCnt = 0;
  for(var j=0; j<rows.length; j++){
    var rj = rows[j];
    bySig[rj.sigText] = (bySig[rj.sigText] || 0) + 1;
    bySec[rj.sector || '(ohne)'] = (bySec[rj.sector || '(ohne)'] || 0) + 1;
    fsSum += rj.fund_score; fsCnt++;
  }
  html += '<div style="background:#0a1628;border:1px solid #1a3050;border-radius:12px;padding:20px;font-size:11px;color:#dce8f5">';
  html += '<h3 style="color:#2d7dd2;font-size:14px;margin:0 0 12px 0">Verteilungen</h3>';
  var sigArr = [];
  for(var sk in bySig) sigArr.push(sk + ': ' + bySig[sk]);
  sigArr.sort();
  html += '<div style="margin-bottom:8px"><b>Nach Signal:</b> ' + sigArr.join(' | ') + '</div>';
  var secArr = [];
  for(var sk2 in bySec) secArr.push(sk2 + ': ' + bySec[sk2]);
  secArr.sort();
  html += '<div style="margin-bottom:8px"><b>Nach Sektor:</b> ' + secArr.join(' | ') + '</div>';
  if(fsCnt > 0){
    html += '<div style="margin-bottom:12px"><b>&Oslash; fund_score (DQ-Gruppe):</b> ' + (fsSum / fsCnt).toFixed(1) + '</div>';
  }
  html += '<div style="margin-top:8px;padding:10px;background:#11203a;border-left:3px solid #2d7dd2;border-radius:4px;color:#a0b0c0;font-size:10px">Datenbasis fuer DQ-1-Validierung Q3 2026 (n=' + rows.length + '). CSV-Export liefert alle Spalten plus fSc-Bucket fuer spaeteren IC-Analysis-Join.</div>';
  html += '</div>';
  out.innerHTML = html;
  /* Print-Button sichtbar machen */
  var pb = document.getElementById('rpt-print-btn');
  if(pb) pb.style.display = '';
}


/* ----------------------------------------------------------------
   rptGetFd(t) -- Unified FD/scores Merger v1.1
   Prioritaet: FD[t] (manuell geladen) > _scoresIdx[t] (scores.json)
   Dauerhaft leer (kein scores.json-Feld): shareholder_return
   shareholder_return: berechnet aus div_yield + sc_yoy
   ---------------------------------------------------------------- */
function rptGetFd(t){
  var base = FD[t] ? FD[t] : {};
  var si   = _scoresIdx[t] ? _scoresIdx[t] : {};
  return {
    sector:               base.sector               !== undefined ? base.sector               : si.sector,
    industry:             base.industry,
    moat:                 base.moat                 !== undefined ? base.moat                 : si.moat,
    fcf:                  base.fcf                  !== undefined ? base.fcf                  : si.fcf_yield,
    owner_earnings_yield: base.owner_earnings_yield !== undefined ? base.owner_earnings_yield : si.owner_earnings,
    roce:                 base.roce                 !== undefined ? base.roce                 : si.roce,
    peg:                  base.peg                  !== undefined ? base.peg                  : si.peg,
    ev_ebitda:            base.ev_ebitda            !== undefined ? base.ev_ebitda            : si.ev_ebitda,
    ev_ebit:              base.ev_ebit              !== undefined ? base.ev_ebit              : si.ev_ebit,
    fcf_debt_cover:       base.fcf_debt_cover !== undefined
                          ? base.fcf_debt_cover : (si.fcf_debt_cover || null),
    rsi_val:              base.rsi_val              !== undefined ? base.rsi_val              : si.rsi,
    mom_skip:             base.mom_skip             !== undefined ? base.mom_skip             : si.mom_skip,
    mom12m:               base.mom12m               !== undefined ? base.mom12m               : si.mom12m_ret,
    beta:                 base.beta                 !== undefined ? base.beta                 : si.beta,
    shares_change_yoy:    base.shares_change_yoy    !== undefined ? base.shares_change_yoy    : si.sc_yoy,
    debt:                 base.debt                 !== undefined ? base.debt                 : si.debt_eq,
    evar:                 base.evar                 !== undefined ? base.evar                 : si.evar,
    div_yield:            base.div_yield            !== undefined ? base.div_yield            : si.div_yield,
    shareholder_return:   base.shareholder_return   !== undefined ? base.shareholder_return
                          : (si.div_yield || 0) + (si.sc_yoy || 0)
  };
}

function rptOpen(){
  if(!STOCKS || STOCKS.length === 0){
    alert('Bitte zuerst fundamentals.json laden.');
    return;
  }
  rptShowControls();
  document.getElementById('rpt-modal').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function rptClose(){
  document.getElementById('rpt-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function rptPrint(){
  window.print();
}

/* Sektoren aus geladenen Daten befuellen */
function rptInitSectors(){
  var sectors = {};
  for(var i=0;i<STOCKS.length;i++){
    var fd = rptGetFd(STOCKS[i].t);
    var _si = _scoresIdx[STOCKS[i].t];
    var sec = (fd && fd.sector) ? fd.sector
            : (_si && _si.sector) ? _si.sector
            : (STOCKS[i].sector || '');
    if(sec) sectors[sec] = (sectors[sec]||0)+1;
  }
  var sel = document.getElementById('rpt-sector');
  if(!sel) return;  /* Guard v5.9.69 */
  sel.innerHTML = '';
  var secArr = Object.keys(sectors).sort();
  for(var j=0;j<secArr.length;j++){
    var opt = document.createElement('option');
    opt.value = secArr[j]; opt.textContent = secArr[j] + ' (' + sectors[secArr[j]] + ')';
    if(secArr[j] === 'Healthcare') opt.selected = true;
    sel.appendChild(opt);
  }
  rptFillStocks();
}

/* Aktien-Dropdowns fuer gewaehlten Sektor befuellen */
function rptFillStocks(){
  var secEl = document.getElementById('rpt-sector');
  if(!secEl) return;
  var sec = secEl.value;
  var s1El = document.getElementById('rpt-s1');
  var s2El = document.getElementById('rpt-s2');
  if(!s1El || !s2El) return;

  var inSec = [];
  for(var i=0;i<STOCKS.length;i++){
    var fd = rptGetFd(STOCKS[i].t);
    var _si2 = _scoresIdx[STOCKS[i].t];
    var s = (fd && fd.sector) ? fd.sector
          : (_si2 && _si2.sector) ? _si2.sector
          : (STOCKS[i].sector || '');
    if(s === sec) inSec.push(STOCKS[i]);
  }
  inSec.sort(function(a,b){ return cSc(b) - cSc(a); });

  function fillSel(elId, defaultTk){
    var sel = document.getElementById(elId);
    if(!sel) return;
    sel.innerHTML = '';
    for(var k=0;k<inSec.length;k++){
      var opt = document.createElement('option');
      opt.value = inSec[k].t;
      opt.textContent = inSec[k].t + ' \u2013 ' + (inSec[k].n || '') + ' (' + Math.round(cSc(inSec[k])) + ')';
      if(inSec[k].t === defaultTk) opt.selected = true;
      sel.appendChild(opt);
    }
  }
  fillSel('rpt-s1', 'LLY');
  fillSel('rpt-s2', 'NVO');
}

/* Hauptfunktion: Bericht aufbauen */
function rptBuildSector(){
  var sec  = document.getElementById('rpt-sector').value;
  var tk1  = document.getElementById('rpt-s1').value;
  var tk2  = document.getElementById('rpt-s2').value;
  var now  = new Date();
  var dateStr = now.toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'});

  /* Sektor-Statistiken berechnen */
  var secStocks = [];
  for(var i=0;i<STOCKS.length;i++){
    var fd0 = rptGetFd(STOCKS[i].t);
    var _si3 = _scoresIdx[STOCKS[i].t];
    var s0  = (fd0 && fd0.sector) ? fd0.sector
            : (_si3 && _si3.sector) ? _si3.sector
            : (STOCKS[i].sector || '');
    if(s0 === sec) secStocks.push(STOCKS[i]);
  }
  secStocks.sort(function(a,b){ return cSc(b)-cSc(a); });

  var stats = rptCalcStats(secStocks);

  var out = '';

  /* -- Titel-Block -- */
  out += '<div class="rpt-card" style="background:#060e1a;border:1px solid #1a3a5c;border-radius:10px;padding:16px;margin-bottom:14px">';
  out += '<div class="rpt-h1" style="font-size:18px;font-weight:800;color:#00c8f0;margin-bottom:4px">StockIQ Sektor-Analyse</div>';
  out += '<div class="rpt-h2" style="font-size:14px;font-weight:700;color:#dce8f5;margin-bottom:6px">&#128202; ' + sec + ' &mdash; ' + dateStr + '</div>';
  out += '<div class="rpt-mut" style="font-family:monospace;font-size:9px;color:#7a9bb5">';
  out += 'Universum: ' + secStocks.length + ' Titel &middot; Score-Architektur: Mom 25% + Trend 20% + Fund 35% + Risk 20% &middot; StockIQ v6.4.13</div>';
  out += '</div>';

  /* -- 0. Sektor-Performance-Ranking (alle Sektoren) -- */
  out += rptSectorRanking();

  /* -- 1. Sektorvergleich: Statistik-Kacheln -- */
  out += '<div class="rpt-card" style="background:#0c1420;border:1px solid #1a2a3a;border-radius:10px;padding:14px;margin-bottom:14px">';
  out += '<div class="rpt-h2" style="font-size:13px;font-weight:700;color:#00c8f0;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">1. Sektor&uuml;bersicht &mdash; ' + sec + '</div>';
  out += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">';
  var kpis = [
    {l:'Anz. Titel', v:secStocks.length, u:''},
    {l:'\u00d8 Score', v:stats.avgScore.toFixed(1), u:'/100'},
    {l:'\u00d8 FCF Yield', v:stats.avgFcf !== null ? stats.avgFcf.toFixed(1)+'%' : 'n/a', u:''},
    {l:'\u00d8 ROCE', v:stats.avgRoce !== null ? stats.avgRoce.toFixed(1)+'%' : 'n/a', u:''},
  ];
  for(var ki=0;ki<kpis.length;ki++){
    out += '<div style="text-align:center;padding:10px 6px;background:#0a1628;border:1px solid #1a3050;border-radius:8px">';
    out += '<div class="rpt-label" style="font-family:monospace;font-size:8px;color:#7a9bb5">' + kpis[ki].l + '</div>';
    out += '<div class="rpt-val" style="font-size:16px;font-weight:800;color:#dce8f5">' + kpis[ki].v + '</div>';
    if(kpis[ki].u) out += '<div class="rpt-mut" style="font-family:monospace;font-size:8px;color:#7a9bb5">' + kpis[ki].u + '</div>';
    out += '</div>';
  }
  out += '</div>';

  /* Sektor-Tabelle: Top 10 nach Score */
  out += '<div style="font-family:monospace;font-size:9px;font-weight:700;color:#7a9bb5;margin-bottom:6px">TOP-TITEL IM SEKTOR (nach Score):</div>';
  out += '<table class="rpt-tbl" style="width:100%;border-collapse:collapse;font-size:10px">';
  out += '<tr><th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:left">Ticker</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:left">Name</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:center">Score</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:center">Signal</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:right">FCF%</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:right">ROCE%</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:right">PEG</th></tr>';

  var top = secStocks.slice(0, 10);
  for(var ri=0;ri<top.length;ri++){
    var rs  = top[ri];
    var rfd = rptGetFd(rs.t) || {};
    var rsc = Math.round(cSc(rs));
    var rsig = rptSigText(rs);
    var sigC = rsig.indexOf('BUY')>=0 ? '#00e57a' : rsig.indexOf('SELL')>=0 ? '#ff5252' : '#ffab00';
    var rowBg = ri % 2 === 0 ? '#0a1628' : '#0c1a2e';
    var isSel = (rs.t === tk1 || rs.t === tk2) ? 'font-weight:700;' : '';
    out += '<tr style="background:' + rowBg + '">';
    out += '<td style="padding:5px 7px;' + isSel + 'color:' + (rs.t===tk1||rs.t===tk2?'#00c8f0':'#dce8f5') + '">' + escapeHtml(rs.t) + '</td>';
    out += '<td style="padding:5px 7px;color:#dce8f5;font-size:9px">' + escapeHtml(rs.n||'') + '</td>';
    out += '<td style="padding:5px 7px;text-align:center;color:#dce8f5;font-weight:700">' + rsc + '</td>';
    out += '<td style="padding:5px 7px;text-align:center;color:' + sigC + ';font-size:9px">' + escapeHtml(rsig) + '</td>';
    out += '<td style="padding:5px 7px;text-align:right;color:#dce8f5">' + (rfd.fcf!=null?rfd.fcf.toFixed(1)+'%':'\u2014') + '</td>';
    out += '<td style="padding:5px 7px;text-align:right;color:#dce8f5">' + (rfd.roce!=null?rfd.roce.toFixed(1)+'%':'\u2014') + '</td>';
    out += '<td style="padding:5px 7px;text-align:right;color:#dce8f5">' + (rfd.peg!=null?rfd.peg.toFixed(2):'\u2014') + '</td>';
    out += '</tr>';
  }
  out += '</table>';
  if(secStocks.length > 10) out += '<div style="font-family:monospace;font-size:9px;color:#7a9bb5;margin-top:4px">+ ' + (secStocks.length-10) + ' weitere Titel im Sektor</div>';
  out += '</div>';

  /* -- 2. Aktien-Detail -- */
  out += '<div class="rpt-card" style="background:#0c1420;border:1px solid #1a2a3a;border-radius:10px;padding:14px;margin-bottom:14px">';
  out += '<div class="rpt-h2" style="font-size:13px;font-weight:700;color:#00c8f0;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">2. Aktien-Vergleich &amp; Analyse</div>';
  out += rptCompareBlock(tk1, tk2);
  out += '</div>';

  /* -- 3. Detail-Karten -- */
  out += rptDetailCard(tk1, '3a');
  out += rptDetailCard(tk2, '3b');

  /* -- 4. Regelbasierte Textanalyse -- */
  out += '<div class="rpt-card" style="background:#0c1420;border:1px solid #1a2a3a;border-radius:10px;padding:14px;margin-bottom:14px">';
  out += '<div class="rpt-h2" style="font-size:13px;font-weight:700;color:#00c8f0;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">4. Textliche Analyse</div>';
  out += rptTextAnalysis(tk1, stats);
  out += rptTextAnalysis(tk2, stats);
  out += '</div>';

  /* -- 5. Glossar -- */
  out += rptGlossar();

  /* -- Disclaimer -- */
  out += '<div class="rpt-card" style="background:#060e1a;border:1px solid #1a2a3a;border-radius:8px;padding:10px;margin-bottom:10px">';
  out += '<div style="font-family:monospace;font-size:8px;color:#7a9bb5;line-height:1.5">';
  out += '<strong style="color:#dce8f5">Disclaimer:</strong> Dieser Bericht wurde automatisch von StockIQ v6.4.13 generiert. ';
  out += 'Er dient ausschlie&szlig;lich zu Informationszwecken und stellt keine Anlageberatung dar. ';
  out += 'Alle Daten stammen aus yfinance (Yahoo Finance) und sind ohne Gew&auml;hr. ';
  out += 'Investitionsentscheidungen sollten immer auf Basis eigener Recherche und ggf. professioneller Beratung getroffen werden.';
  out += '</div></div>';

  document.getElementById('rpt-output').innerHTML = out;
  document.getElementById('rpt-print-btn').style.display = 'block';

  /* Controls einklappen -- Bericht sichtbar machen */
  var ctrl = document.getElementById('rpt-controls');
  ctrl.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
    '<div style="font-family:monospace;font-size:10px;color:#00e57a">&#10003; Bericht erstellt: ' +
    sec + ' &middot; ' + tk1 + ' vs. ' + tk2 + '</div>' +
    '<div style="display:flex;gap:8px">' +
    '<button onclick="rptPrint()" style="background:#1a7a3a;border:none;color:#fff;font-size:11px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer">&#128438; Als PDF drucken</button>' +
    '<button onclick="rptShowControls()" style="background:rgba(255,255,255,.1);border:none;color:#dce8f5;font-size:10px;padding:6px 10px;border-radius:8px;cursor:pointer">&#9881; &Auml;ndern</button>' +
    '</div></div>';

  /* Scroll: Modal-Content-Div nach oben, dann zu Output */
  var modal = document.getElementById('rpt-modal');
  var content = document.getElementById('rpt-content');
  modal.scrollTop = 0;
  setTimeout(function(){
    var outputTop = document.getElementById('rpt-output').offsetTop;
    modal.scrollTop = outputTop - 20;
  }, 100);
}

/* Vergleichs-Tabelle zweier Aktien */
function rptCompareBlock(tk1, tk2){
  var s1 = null; var s2 = null;
  for(var i=0;i<STOCKS.length;i++){
    if(STOCKS[i].t===tk1) s1=STOCKS[i];
    if(STOCKS[i].t===tk2) s2=STOCKS[i];
  }
  if(!s1||!s2) return '<div style="color:#ff5252">Ticker nicht in STOCKS gefunden.</div>';
  var fd1 = rptGetFd(tk1)||{}; var fd2 = rptGetFd(tk2)||{};
  var sc1 = Math.round(cSc(s1)); var sc2 = Math.round(cSc(s2));

  function row(lbl, v1, v2, higherIsBetter){
    var c1='#dce8f5'; var c2='#dce8f5';
    var n1=parseFloat(v1); var n2=parseFloat(v2);
    if(!isNaN(n1)&&!isNaN(n2)&&n1!==n2){
      var better = higherIsBetter ? (n1>n2) : (n1<n2);
      c1 = better ? '#00e57a' : '#ff7043';
      c2 = better ? '#ff7043' : '#00e57a';
    }
    return '<tr><td style="padding:5px 8px;color:#7a9bb5;font-size:9px">' + lbl + '</td>' +
      '<td style="padding:5px 8px;text-align:center;color:'+c1+';font-weight:700">' + v1 + '</td>' +
      '<td style="padding:5px 8px;text-align:center;color:'+c2+';font-weight:700">' + v2 + '</td></tr>';
  }
  function fmtN(v, suf){ return v!=null ? v.toFixed(1)+suf : '\u2014'; }

  var out='';
  out += '<table class="rpt-tbl" style="width:100%;border-collapse:collapse;font-size:11px">';
  out += '<tr><th style="background:#1a3a5c;color:#dce8f5;padding:7px;text-align:left;width:35%">Kennzahl</th>';
  out += '<th style="background:#1a3a5c;color:#00c8f0;padding:7px;text-align:center">' + tk1 + '<br><span style="font-size:9px;font-weight:400">' + (s1.n||'') + '</span></th>';
  out += '<th style="background:#1a3a5c;color:#00c8f0;padding:7px;text-align:center">' + tk2 + '<br><span style="font-size:9px;font-weight:400">' + (s2.n||'') + '</span></th></tr>';
  out += row('Gesamt-Score /100', sc1, sc2, true);
  out += row('Signal', rptSigText(s1), rptSigText(s2), false);
  out += row('Momentum', Math.round(momSc(s1)), Math.round(momSc(s2)), true);
  out += row('Fundamentals', Math.round(fSc(s1)), Math.round(fSc(s2)), true);
  out += row('FCF Yield %', fmtN(fd1.fcf,'%'), fmtN(fd2.fcf,'%'), true);
  out += row('ROCE %', fmtN(fd1.roce,'%'), fmtN(fd2.roce,'%'), true);
  out += row('OE Yield %', fmtN(fd1.owner_earnings_yield,'%'), fmtN(fd2.owner_earnings_yield,'%'), true);
  out += row('PEG', fd1.peg!=null?fd1.peg.toFixed(2):'\u2014', fd2.peg!=null?fd2.peg.toFixed(2):'\u2014', false);
  out += row('EV/EBITDA', fmtN(fd1.ev_ebitda,'x'), fmtN(fd2.ev_ebitda,'x'), false);
  out += row('Beta', fmtN(fd1.beta,''), fmtN(fd2.beta,''), false);
  out += row('Debt/Equity %', fmtN(fd1.debt,'%'), fmtN(fd2.debt,'%'), false);
  out += row('EVAR (rel.)', fmtN(fd1.evar,''), fmtN(fd2.evar,''), true);
  out += row('12M-Momentum', fmtN(fd1.mom_skip!=null?fd1.mom_skip:fd1.mom12m,'%'), fmtN(fd2.mom_skip!=null?fd2.mom_skip:fd2.mom12m,'%'), true);
  out += '</table>';
  return out;
}

/* Detail-Karte fuer eine Aktie */
function rptDetailCard(tk, num){
  var st=null;
  for(var i=0;i<STOCKS.length;i++){ if(STOCKS[i].t===tk){st=STOCKS[i];break;} }
  if(!st) return '';
  var fd=rptGetFd(tk)||{};
  var sc=Math.round(cSc(st));
  var sig=rptSigText(st);
  var sigC=sig.indexOf('BUY')>=0?'#00e57a':sig.indexOf('SELL')>=0?'#ff5252':'#ffab00';

  var out='';
  out += '<div class="rpt-card" style="background:#0c1420;border:1px solid #1a2a3a;border-radius:10px;padding:14px;margin-bottom:14px">';
  out += '<div class="rpt-h2" style="font-size:13px;font-weight:700;color:#00c8f0;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">'+num+'. Detailanalyse: ' + tk + '</div>';
  out += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">';
  out += '<div><div style="font-size:20px;font-weight:800;color:#dce8f5">' + (st.n||tk) + '</div>';
  out += '<div style="font-family:monospace;font-size:9px;color:#7a9bb5">' + (fd.sector||'') + (fd.industry?' &middot; '+fd.industry:'') + '</div>';
  if(fd.moat&&fd.moat!=='none') out += '<div style="font-family:monospace;font-size:9px;color:#ffab00;margin-top:2px">MOAT: ' + fd.moat.toUpperCase() + '</div>';
  out += '</div>';
  out += '<div style="text-align:right">';
  out += '<div style="font-size:36px;font-weight:900;color:'+sigC+'">' + sc + '</div>';
  out += '<div style="font-family:monospace;font-size:10px;color:'+sigC+';font-weight:700">' + sig + '</div>';
  out += '</div></div>';

  /* Score-Komponenten */
  out += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:12px">';
  var riskV=Math.round(rptRisk(st));
  var riskColV=riskV>65?'#00e57a':riskV>40?'#ffab00':'#ff5252';
  var comps = [
    {l:'Momentum', v:Math.round(momSc(st)), c:'#00c8f0'},
    {l:'Trend', v:Math.round(st.trend||0), c:'#7a9bb5'},
    {l:'Fund', v:Math.round(fSc(st)), c:'#00e57a'},
    {l:'Risk', v:riskV, c:riskColV},
  ];
  for(var ci=0;ci<comps.length;ci++){
    out += '<div style="text-align:center;padding:8px 4px;background:#0a1628;border:1px solid #1a3050;border-radius:6px">';
    out += '<div style="font-family:monospace;font-size:8px;color:#7a9bb5">' + comps[ci].l + '</div>';
    out += '<div style="font-size:18px;font-weight:800;color:' + comps[ci].c + '">' + comps[ci].v + '</div>';
    out += '</div>';
  }
  out += '</div>';

  /* Fundamentals-Grid (v5.9.80: EVAR rel fix + ev_ebit + fcf_debt_cover) */
  var evarRelV=evarRelSc(tk);
  var evarDispV=evarRelV!=null?Math.round(evarRelV):(fd.evar!=null?Math.round(fd.evar):'n/a');
  var evarColV=typeof evarDispV==='number'?(evarDispV>=60?'#00e57a':evarDispV>=30?'#ffab00':'#ff5252'):'#7a9bb5';
  out += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px">';
  var fkpis = [
    {l:'FCF Yield', v:fd.fcf!=null?fd.fcf.toFixed(1)+'%':'n/a', c:fd.fcf>5?'#00e57a':fd.fcf>2?'#ffab00':'#ff5252'},
    {l:'OE Yield', v:fd.owner_earnings_yield!=null?fd.owner_earnings_yield.toFixed(1)+'%':'n/a', c:'#dce8f5'},
    {l:'ROCE', v:fd.roce!=null?fd.roce.toFixed(1)+'%':'n/a', c:fd.roce>15?'#00e57a':fd.roce>8?'#ffab00':'#dce8f5'},
    {l:'PEG', v:fd.peg!=null?fd.peg.toFixed(2):'n/a', c:fd.peg<2?'#00e57a':fd.peg<3?'#ffab00':'#ff5252'},
    {l:'EV/EBITDA', v:fd.ev_ebitda!=null?fd.ev_ebitda.toFixed(1)+'x':'n/a', c:fd.ev_ebitda<15?'#00e57a':fd.ev_ebitda<25?'#ffab00':'#ff5252'},
    {l:'EVAR (rel.)', v:evarDispV, c:evarColV},
  ];
  for(var fi2=0;fi2<fkpis.length;fi2++){
    out += '<div style="padding:7px 8px;background:#0a1628;border:1px solid #1a3050;border-radius:6px">';
    out += '<div style="font-family:monospace;font-size:8px;color:#7a9bb5">' + fkpis[fi2].l + '</div>';
    out += '<div style="font-size:14px;font-weight:700;color:' + fkpis[fi2].c + '">' + fkpis[fi2].v + '</div>';
    out += '</div>';
  }
  out += '</div>';
  /* EV/EBIT + FCF/Debt Cover (v5.9.80) */
  var eveitR=fd.ev_ebit!=null?fd.ev_ebit.toFixed(1)+'x':'n/a';
  var eveitC=fd.ev_ebit!=null?(fd.ev_ebit<15?'#00e57a':fd.ev_ebit<25?'#ffab00':'#ff5252'):'#7a9bb5';
  var fdcR=fd.fcf_debt_cover!=null?(fd.fcf_debt_cover>=10?'&gt;10x':fd.fcf_debt_cover.toFixed(2)+'x'):'n/a';
  var fdcC=fd.fcf_debt_cover!=null?(fd.fcf_debt_cover>=0.20?'#00e57a':fd.fcf_debt_cover>=0.05?'#ffab00':'#ff5252'):'#7a9bb5';
  out += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">';
  out += '<div style="padding:7px 8px;background:#0a1628;border:1px solid #1a3050;border-radius:6px"><div style="font-family:monospace;font-size:8px;color:#7a9bb5">EV/EBIT</div><div style="font-size:14px;font-weight:700;color:'+eveitC+'">'+eveitR+'</div></div>';
  out += '<div style="padding:7px 8px;background:#0a1628;border:1px solid #1a3050;border-radius:6px"><div style="font-family:monospace;font-size:8px;color:#7a9bb5">FCF/DEBT</div><div style="font-size:14px;font-weight:700;color:'+fdcC+'">'+fdcR+'</div></div>';
  out += '</div>';

  /* Jahres-Trend wenn vorhanden */
  var annTrend = '';
  if(window.ANNUAL_DATA && ANNUAL_DATA.length > 0){
    var roce_hist = []; var fcf_hist = [];
    for(var ai=0;ai<ANNUAL_DATA.length;ai++){
      var ae = ANNUAL_DATA[ai];
      if(ae.tickers && ae.tickers[tk]){
        var afd = ae.tickers[tk];
        if(afd.roce!=null) roce_hist.push(ae.year+': '+afd.roce.toFixed(1)+'%');
        if(afd.fcf!=null)  fcf_hist.push(ae.year+': '+afd.fcf.toFixed(1)+'%');
      }
    }
    if(roce_hist.length>0){
      annTrend += '<div style="padding:8px 10px;background:rgba(0,200,240,.05);border:1px solid rgba(0,200,240,.15);border-radius:6px;font-family:monospace;font-size:9px;margin-top:8px">';
      annTrend += '<div style="color:#00c8f0;margin-bottom:3px;font-weight:700">JAHRES-TREND</div>';
      annTrend += '<div style="color:#7a9bb5">ROCE: ' + roce_hist.join(' &middot; ') + '</div>';
      if(fcf_hist.length>0) annTrend += '<div style="color:#7a9bb5;margin-top:2px">FCF: ' + fcf_hist.join(' &middot; ') + '</div>';
      annTrend += '</div>';
    }
  }
  out += annTrend;

  /* Technisch */
  out += '<div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:6px;font-family:monospace;font-size:10px">';
  out += '<div style="color:#7a9bb5">RSI: <span style="color:#dce8f5">' + (fd.rsi_val!=null?Math.round(fd.rsi_val):'n/a') + '</span></div>';
  out += '<div style="color:#7a9bb5">12M-Mom: <span style="color:#dce8f5">' + (fd.mom_skip!=null?fd.mom_skip.toFixed(1)+'%':fd.mom12m!=null?fd.mom12m.toFixed(1)+'%':'n/a') + '</span></div>';
  out += '<div style="color:#7a9bb5">Beta: <span style="color:#dce8f5">' + (fd.beta!=null?fd.beta.toFixed(2):'n/a') + '</span></div>';
  out += '<div style="color:#7a9bb5">Div+Buyback: <span style="color:#dce8f5">' + (fd.shareholder_return!=null?fd.shareholder_return.toFixed(1)+'%':'n/a') + '</span></div>';
  out += '</div>';
  /* Shares YoY: Buyback-Signal v5.9.80 (O'Shaughnessy Shareholder Yield) */
  var scyRpt=fd.shares_change_yoy!==null&&fd.shares_change_yoy!==undefined?fd.shares_change_yoy:null;
  if(scyRpt!==null){
    var scyRptCol=scyRpt<-3?'#00e57a':scyRpt<0?'#00c8f0':scyRpt<2?'#7a9bb5':'#ff5252';
    var scyRptLbl=scyRpt<-3?'Buyback++':scyRpt<0?'Buyback':scyRpt<2?'Stabil':'Dilution';
    var scyRptSign=scyRpt<0?'':'+';
    out += '<div style="margin-top:8px;padding:6px 8px;background:rgba(255,255,255,.03);border:1px solid #1a3050;border-radius:6px;display:flex;justify-content:space-between;font-family:monospace;font-size:10px">';
    out += '<span style="color:#7a9bb5">Shares YoY (Buyback)</span>';
    out += '<span style="color:'+scyRptCol+';font-weight:700">'+scyRptLbl+' ('+scyRptSign+scyRpt.toFixed(1)+'%)</span>';
    out += '</div>';
  }
  out += '</div>';
  return out;
}

/* ============================================================
   SEKTOR-ETF MAPPING v5.9.55
   ============================================================ */
var SECTOR_ETF_MAP = {
  'Healthcare':              {etf:'XLV', name:'Health Care Select SPDR'},
  'Technology':              {etf:'XLK', name:'Technology Select SPDR'},
  'Financial Services':      {etf:'XLF', name:'Financial Select SPDR'},
  'Financials':              {etf:'XLF', name:'Financial Select SPDR'},
  'Energy':                  {etf:'XLE', name:'Energy Select SPDR'},
  'Consumer Staples':        {etf:'XLP', name:'Consumer Staples SPDR'},
  'Consumer Defensive':      {etf:'XLP', name:'Consumer Staples SPDR'},
  'Consumer Cyclical':       {etf:'XLY', name:'Consumer Discret. SPDR'},
  'Consumer Discretionary':  {etf:'XLY', name:'Consumer Discret. SPDR'},
  'Industrials':             {etf:'XLI', name:'Industrial Select SPDR'},
  'Basic Materials':         {etf:'XLB', name:'Materials Select SPDR'},
  'Materials':               {etf:'XLB', name:'Materials Select SPDR'},
  'Real Estate':             {etf:'XLRE', name:'Real Estate Select SPDR'},
  'Utilities':               {etf:'XLU', name:'Utilities Select SPDR'},
  'Communication Services':  {etf:'XLC', name:'Communication Serv. SPDR'},
  'Technology':              {etf:'XLK', name:'Technology Select SPDR'},
};

/* -- Sektor-Performance-Ranking (v5.9.55) -- */
function rptSectorRanking(){
  /* Sektor-Statistiken berechnen */
  var secData = {};
  for(var i=0;i<STOCKS.length;i++){
    var fd0 = rptGetFd(STOCKS[i].t);
    var _siR = _scoresIdx[STOCKS[i].t];
    var sec0 = (fd0&&fd0.sector) ? fd0.sector
             : (_siR&&_siR.sector) ? _siR.sector : '';
    if(!sec0) continue;
    if(!secData[sec0]) secData[sec0] = {moms:[], scores:[], n:0};
    var mom = fd0.mom_skip !== null && fd0.mom_skip !== undefined ? fd0.mom_skip :
              (fd0.mom12m !== null && fd0.mom12m !== undefined ? fd0.mom12m : null);
    if(mom !== null && !isNaN(mom) && mom > -100 && mom < 500) secData[sec0].moms.push(mom);
    secData[sec0].scores.push(cSc(STOCKS[i]));
    secData[sec0].n++;
  }
  /* ETF-Daten aus __macro__ wenn vorhanden (fund_juno v7.9.10) */
  var etfData = {};
  if(window.FD && FD['__macro__'] && FD['__macro__'].sector_etfs){
    etfData = FD['__macro__'].sector_etfs;
  }
  /* Ranking aufbauen */
  var rows = [];
  var secs = Object.keys(secData);
  for(var j=0;j<secs.length;j++){
    var sec = secs[j];
    var d = secData[sec];
    var avgMom = null;
    if(d.moms.length > 0){
      var s2=0; for(var k=0;k<d.moms.length;k++) s2+=d.moms[k];
      avgMom = s2/d.moms.length;
    }
    var avgSc = 0; for(var k2=0;k2<d.scores.length;k2++) avgSc+=d.scores[k2];
    avgSc = avgSc/d.scores.length;
    var etfInfo = SECTOR_ETF_MAP[sec] || {etf:'\u2014', name:''};
    var etfMom = (etfData[etfInfo.etf] && etfData[etfInfo.etf].mom12m !== null) ?
      etfData[etfInfo.etf].mom12m : null;
    rows.push({sec:sec, etf:etfInfo.etf, etfName:etfInfo.name,
               avgMom:avgMom, etfMom:etfMom, avgSc:avgSc, n:d.n,
               mCount:d.moms.length});
  }
  /* Sortierung nach Aktien-Durchschnitt (ETF-Daten wenn verfuegbar als Tiebreaker) */
  rows.sort(function(a,b){
    var ma = a.avgMom !== null ? a.avgMom : -9999;
    var mb = b.avgMom !== null ? b.avgMom : -9999;
    return mb - ma;
  });

  var out = '';
  out += '<div class="rpt-card" style="background:#0c1420;border:1px solid #1a2a3a;border-radius:10px;padding:14px;margin-bottom:14px">';
  out += '<div class="rpt-h2" style="font-size:13px;font-weight:700;color:#00c8f0;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">&#128202; Sektor-Performance-Ranking (12M)</div>';
  out += '<div style="font-family:monospace;font-size:9px;color:#7a9bb5;margin-bottom:10px">';
  out += 'Aktien-\u00d8: 12M-Momentum aller Sektortitel (aus FD[]) &middot; ETF-Return: Sektor-ETF (fund_juno v7.9.10)</div>';

  out += '<table class="rpt-tbl" style="width:100%;border-collapse:collapse;font-size:10px">';
  out += '<tr><th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:center">#</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:left">Sektor</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:center">ETF</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:right">Aktien-\u00d8 12M</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:right">ETF 12M</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:center">\u00d8 Score</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:center">n</th></tr>';

  for(var ri=0;ri<rows.length;ri++){
    var r = rows[ri];
    var rowBg = ri % 2 === 0 ? '#0a1628' : '#0c1a2e';
    var momStr = r.avgMom !== null ? (r.avgMom >= 0 ? '+' : '') + r.avgMom.toFixed(1) + '%' : '\u2014';
    var momC = r.avgMom === null ? '#7a9bb5' : r.avgMom > 10 ? '#00e57a' : r.avgMom > 0 ? '#a5d6a7' : '#ff7043';
    var etfStr = r.etfMom !== null ? (r.etfMom >= 0 ? '+' : '') + r.etfMom.toFixed(1) + '%' : 'n/a*';
    var etfC = r.etfMom === null ? '#7a9bb5' : r.etfMom > 10 ? '#00e57a' : r.etfMom > 0 ? '#a5d6a7' : '#ff7043';
    var medal = ri === 0 ? '&#127947;' : ri === 1 ? '&#129352;' : ri === 2 ? '&#129353;' : (ri+1)+'';
    out += '<tr style="background:' + rowBg + '">';
    out += '<td style="padding:5px 7px;text-align:center;color:#dce8f5">' + medal + '</td>';
    out += '<td style="padding:5px 7px;color:#dce8f5">' + r.sec + '</td>';
    out += '<td style="padding:5px 7px;text-align:center;color:#7a9bb5;font-family:monospace">' + r.etf + '</td>';
    out += '<td style="padding:5px 7px;text-align:right;color:' + momC + ';font-weight:700">' + momStr + '</td>';
    out += '<td style="padding:5px 7px;text-align:right;color:' + etfC + '">' + etfStr + '</td>';
    out += '<td style="padding:5px 7px;text-align:center;color:#dce8f5">' + Math.round(r.avgSc) + '</td>';
    out += '<td style="padding:5px 7px;text-align:center;color:#7a9bb5">' + r.n + '</td>';
    out += '</tr>';
  }
  out += '</table>';
  out += '<div style="font-family:monospace;font-size:8px;color:#7a9bb5;margin-top:6px">';
  out += '* ETF-Returns n/a: fund_juno v7.9.10 erforderlich (sector_etfs im __macro__-Block)</div>';
  out += '</div>';
  return out;
}

/* -- Regelbasierte Textanalyse signal-konform (v5.9.69) -- */
function rptTextAnalysis(tk, secStats){
  var st = null;
  for(var i=0;i<STOCKS.length;i++){ if(STOCKS[i].t===tk){st=STOCKS[i];break;} }
  if(!st) return '';
  var fd = rptGetFd(tk) || {};
  var sc = Math.round(cSc(st));
  var sig = rptSigText(st);
  var rawSig = mSig(st);
  var name = st.n || tk;

  function nn(v){ return v !== null && v !== undefined && !isNaN(v); }
  function pct(v,d){ return (v>=0?'+':'')+v.toFixed(d||1)+'%'; }

  /* -- Signal-Kategorie bestimmen -- */
  var isBuySignal  = rawSig==='strong'||rawSig==='buy'||rawSig==='pb';
  var isSellSignal = isSell(rawSig);
  var isHoldSig    = isHoldSF(rawSig);
  var isWatchSig   = rawSig==='watch'||rawSig==='weak';

  /* -- Persistenz aus Snapshots -- */
  var persistCount = 0; var snapCount = 0;
  try {
    var snaps = JSON.parse(localStorage.getItem('stockiq_snapshots')||'[]');
    for(var si=0;si<snaps.length;si++){
      var snap = snaps[si];
      if(!snap||!snap.tickers||!snap.tickers[tk]) continue;
      snapCount++;
      /* Signal aus Snapshot-Daten rekonstruieren -- vereinfacht via trend */
      var snapTk = snap.tickers[tk];
      if(snapTk.trend !== null && snapTk.trend !== undefined && snapTk.trend < 0) persistCount++;
    }
  } catch(e){}
  var persistText = '';
  if(snapCount >= 3){
    if(persistCount >= snapCount * 0.7)
      persistText = 'Signal persistiert &uuml;ber ~' + snapCount + ' Snapshots (' + persistCount + '&times; unter 200MA).';
    else if(persistCount === 0)
      persistText = 'Kurs durchgehend &uuml;ber 200MA in ' + snapCount + ' Snapshots.';
  }

  /* -- P1: Signal-Intro -- direkt und konform -- */
  var p1 = '';
  var scDiff = secStats && nn(secStats.avgScore) ? Math.round(sc - secStats.avgScore) : null;
  var scDiffTxt = scDiff !== null ?
    ' Im Sektorvergleich liegt ' + name + ' ' +
    (scDiff >= 0 ? scDiff + ' Punkte &uuml;ber' : Math.abs(scDiff) + ' Punkte unter') +
    ' dem Sektor-Durchschnitt (' + Math.round(secStats.avgScore) + ' Punkte).' : '';

  if(isSellSignal){
    p1 = '<strong>' + name + ' wird aktuell als <span style="color:#ff5252">' + sig +
         '</span> eingestuft</strong> (Score ' + sc + '/100). ';
    if(rawSig==='sell_ma')
      p1 += 'Der Kurs hat die 200-Tage-Linie unterschritten \u2014 der Aufw&auml;rtstrend ist technisch gebrochen. ';
    else if(rawSig==='sell_zl')
      p1 += 'Der MACD hat die Nulllinie nach unten durchbrochen \u2014 ein Momentum-Umkehrsignal. ';
    else
      p1 += 'Mehrere technische Exit-Signale sind aktiv. ';
    if(persistText) p1 += persistText + ' ';
    p1 += '<strong>Handlungskonsequenz: Kein Neueinstieg empfohlen. Bestehende Positionen &uuml;berpr&uuml;fen.</strong>';
    p1 += scDiffTxt;

  } else if(rawSig==='hold_dvg'){
    p1 = name + ' zeigt ein <strong>Deep Value Divergence</strong>-Signal (Score ' + sc + '/100). ';
    p1 += 'Das technische Bild ist belastet (unter 200MA), aber Fundamentals (Fund ' +
          Math.round(fSc(st)) + '/100) und RSI im &uuml;berverkauften Bereich deuten auf nachlassenden Verkaufsdruck hin. ';
    p1 += '<strong>Handlungskonsequenz: Beobachten \u2014 Einstieg pr&uuml;fen wenn Kurs &uuml;ber 200MA zur&uuml;ckkehrt.</strong>';
    p1 += scDiffTxt;

  } else if(isHoldSig){
    p1 = name + ' wird durch den <strong>Score Filter als HOLD</strong> eingestuft (Score ' + sc + '/100). ';
    p1 += 'Das technische Exit-Signal wird durch die fundamentale St&auml;rke (Score &ge;55) neutralisiert. ';
    p1 += '<strong>Handlungskonsequenz: Qualit&auml;tsposition halten \u2014 kein Verkauf auf Basis des technischen Signals allein.</strong>';
    p1 += scDiffTxt;

  } else if(rawSig==='strong'){
    p1 = name + ' erreicht ein <strong style="color:#ff9f1c">BUY STRONG</strong>-Signal (Score ' + sc + '/100). ';
    p1 += 'Alle Kernbedingungen sind erf&uuml;llt: MACD positiv, &uuml;ber 200MA, Bullish Divergenz. ';
    p1 += '<strong>Handlungskonsequenz: Klare Kaufempfehlung mit g&uuml;nstigem Chance/Risiko-Verh&auml;ltnis.</strong>';
    p1 += scDiffTxt;

  } else if(rawSig==='buy'||rawSig==='pb'){
    p1 = name + ' zeigt ein <strong style="color:#00e57a">BUY</strong>-Signal (Score ' + sc + '/100). ';
    p1 += 'Technische und fundamentale Signale sind &uuml;berwiegend positiv. ';
    p1 += '<strong>Handlungskonsequenz: Kauf unter Ber&uuml;cksichtigung des aktuellen Marktregimes (VIX/V2X).</strong>';
    p1 += scDiffTxt;

  } else {
    p1 = name + ' zeigt kein klares Kauf- oder Verkaufssignal (Score ' + sc + '/100, ' + sig + '). ';
    p1 += '<strong>Handlungskonsequenz: Beobachten \u2014 kein Handlungsbedarf.</strong>';
    p1 += scDiffTxt;
  }

  /* -- P2: Staerken (nur relevante, signal-kontextuell) -- */
  var strengths = [];
  if(nn(fd.roce)){
    if(fd.roce >= 30) strengths.push('ROCE ' + fd.roce.toFixed(1) + '% \u2014 starker wirtschaftlicher Burggraben.');
    else if(fd.roce >= 15) strengths.push('ROCE ' + fd.roce.toFixed(1) + '% \u2014 solide Kapitaleffizienz.');
  }
  if(nn(fd.owner_earnings_yield) && nn(fd.fcf)){
    var oeDiff = fd.owner_earnings_yield - fd.fcf;
    if(oeDiff > 5)
      strengths.push('OE Yield (' + fd.owner_earnings_yield.toFixed(1) + '%) vs. FCF (' + fd.fcf.toFixed(1) + '%): +' + oeDiff.toFixed(1) + 'pp Growth-Capex \u2014 Buffett-Indikator f&uuml;r Wachstumsinvestitionen.');
    else if(nn(fd.fcf) && fd.fcf >= 6)
      strengths.push('FCF Yield ' + fd.fcf.toFixed(1) + '% \u2014 starke Cashgenerierung.');
  } else if(nn(fd.fcf) && fd.fcf >= 6){
    strengths.push('FCF Yield ' + fd.fcf.toFixed(1) + '% \u2014 starke Cashgenerierung.');
  }
  if(fd.moat && fd.moat !== 'none')
    strengths.push('Morningstar Moat: ' + fd.moat.toUpperCase() + ' \u2014 strukturelle Wettbewerbsvorteile.');
  if(nn(fd.evar) && fd.evar >= 65)
    strengths.push('EVAR ' + Math.round(fd.evar) + ' \u2014 &uuml;berdurchschnittlich stabile Ertragsentwicklung.');
  if(nn(fd.peg) && fd.peg < 1.5)
    strengths.push('PEG ' + fd.peg.toFixed(2) + ' \u2014 attraktive Wachstumsbewertung.');
  if(nn(fd.beta) && fd.beta < 0.5)
    strengths.push('Beta ' + fd.beta.toFixed(2) + ' \u2014 defensives, marktunkorreliertes Profil.');

  var p2 = strengths.length > 0 ?
    '<strong>St&auml;rken:</strong> ' + strengths.join(' ') :
    '<strong>Fundamentales Bild:</strong> Keine herausragenden Einzelkennzahlen identifiziert.';

  /* -- P3: Risiken -- signal-priorisiert -- */
  var risks = [];
  if(isSellSignal){
    var rsi3 = fd.rsi_val !== null && fd.rsi_val !== undefined ? Math.round(fd.rsi_val) : null;
    risks.push('<strong>Technischer Abw&auml;rtstrend aktiv</strong> (' + sig + '). ' +
      (persistText ? persistText + ' ' : '') +
      (rsi3 !== null ? 'RSI ' + rsi3 + (rsi3 < 35 ? ' \u2014 &uuml;berverkauft, Reversal-Potenzial m&ouml;glich.' : ' \u2014 kein extremer &Uuml;berverkauf.') : ''));
  }
  if(nn(fd.peg) && fd.peg > 3)
    risks.push('PEG ' + fd.peg.toFixed(2) + ' \u2014 ambitionierte Bewertung erfordert stabiles Gewinnwachstum.');
  if(nn(fd.fcf) && fd.fcf < 2 && (!nn(fd.owner_earnings_yield) || fd.owner_earnings_yield < 5))
    risks.push('FCF Yield ' + fd.fcf.toFixed(1) + '% \u2014 schwache laufende Cashgenerierung.');
  if(nn(fd.debt) && fd.debt > 80)
    risks.push('Debt/Equity ' + fd.debt.toFixed(0) + '% \u2014 erh&ouml;hte Verschuldung.');
  if(nn(fd.mom_skip) && fd.mom_skip < -20)
    risks.push('12M-Momentum ' + pct(fd.mom_skip) + ' \u2014 anhaltender Kursr\u00fcckgang.');
  if(nn(fd.evar) && fd.evar < 30)
    risks.push('EVAR ' + Math.round(fd.evar) + ' \u2014 hohe Ertragsschwankung (zyklisches Profil).');

  var p3 = risks.length > 0 ?
    '<strong>Risiken:</strong> ' + risks.join(' ') :
    '<strong>Risikoprofil:</strong> Keine kritischen Warnsignale identifiziert.';

  /* -- P4: Technisches Bild + Signal-konformes Fazit -- */
  var rsi4 = fd.rsi_val !== null && fd.rsi_val !== undefined ? Math.round(fd.rsi_val) : null;
  var p4 = '<strong>Technisches Bild:</strong> ';
  if(nn(rsi4)){
    if(rsi4 < 30) p4 += 'RSI ' + rsi4 + ' \u2014 &uuml;berverkauft. Statistisch erh&ouml;hte Reversalwahrscheinlichkeit. ';
    else if(rsi4 < 45) p4 += 'RSI ' + rsi4 + ' \u2014 schwaches Momentum. ';
    else if(rsi4 > 78) p4 += 'RSI ' + rsi4 + ' \u2014 &uuml;berhitzt. Konsolidierungsrisiko erh&ouml;ht. ';
    else if(rsi4 > 70) p4 += 'RSI ' + rsi4 + ' \u2014 erh&ouml;htes Niveau, aber noch nicht extrem. ';
    else p4 += 'RSI ' + rsi4 + ' \u2014 neutrales Niveau. ';
  }
  if(nn(fd.mom_skip)) p4 += '12M-Momentum: ' + pct(fd.mom_skip) + '. ';

  /* Signal-konformes Fazit -- kein Widerspruch zum Signal */
  if(isSellSignal){
    p4 += '<strong>Fazit: Solange der Kurs unter der 200MA notiert, &uuml;berwiegen die technischen Risiken. ';
    p4 += nn(rsi4) && rsi4 < 35 ?
      'RSI im &uuml;berverkauften Bereich \u2014 Reversal beobachten, aber kein Einstieg vor Trendumkehr-Best&auml;tigung.</strong>' :
      'Kein Einstieg vor Trendumkehr-Best&auml;tigung (&Uuml;berschreiten der 200MA mit positivem MACD).</strong>';
  } else if(rawSig==='hold_dvg'){
    p4 += '<strong>Fazit: Turnaround-Kandidat \u2014 fundamentale St&auml;rke intakt, technische Best&auml;tigung steht aus.</strong>';
  } else if(isHoldSig){
    p4 += '<strong>Fazit: Qualit&auml;tsposition \u2014 technischer Druck vorhanden, aber Fundamentals rechtfertigen das Halten.</strong>';
  } else if(isBuySignal){
    p4 += '<strong>Fazit: Technisches und fundamentales Bild konvergieren positiv \u2014 Kaufgelegenheit unter Ber&uuml;cksichtigung der Positionsgr&ouml;&szlig;e.</strong>';
  } else {
    p4 += '<strong>Fazit: Kein klares Signal \u2014 Marktbeobachtung beibehalten.</strong>';
  }

  /* -- Ausgabe -- */
  var out = '';
  out += '<div style="background:#060e1a;border:1px solid #1a3050;border-radius:10px;padding:14px;margin-bottom:14px">';
  out += '<div style="font-size:12px;font-weight:700;color:#00c8f0;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">&#129302; Analyse: ' + name + ' (' + tk + ')</div>';
  var paras = [p1, p2, p3, p4];
  for(var pi=0;pi<paras.length;pi++){
    out += '<p style="font-size:10px;color:#dce8f5;line-height:1.65;margin:0 0 10px 0">' + paras[pi] + '</p>';
  }
  out += '</div>';
  return out;
}

/* -- Kompaktes Glossar (v5.9.55) -- */
function rptGlossar(){
  var terms = [
    {t:'Score /100', d:'Gewichteter Gesamt-Score: Momentum 25% + Trend 20% + Fundamentals 35% + Risk 20%. Schwellen: &ge;65 = BUY-Bereich, &lt;45 = SELL-Bereich.'},
    {t:'Momentum (momSc)', d:'12M Skip-Month-Momentum (Jegadeesh/Titman 1993) + MACD-Overlay + VIX/V2X-D&auml;mpfung (&times;1.0/0.6/0.2). EU-Ticker nutzen V2X statt VIX.'},
    {t:'Trend', d:'Abstand des Kurses von der 200-Tage-Linie (SMA200) als Score 0&ndash;100. Negativ = Kurs unter 200MA = technisches SELL-Signal.'},
    {t:'Fund (fSc)', d:'Fundamentals-Score: Bewertung (20%) + FCF Yield (30%) + ROCE (30%) + Schuldenqualit&auml;t (15%) + Konsistenz (5%).'},
    {t:'FCF Yield', d:'Free Cashflow / Marktkapitalisierung &times; 100. Zeigt die laufende Cashgenerierung. &gt;6% stark, &lt;2% schwach.'},
    {t:'Owner Earnings Yield', d:'(Nettogewinn + Abschreibungen &minus; Capex) / Marktkapitalisierung. Buffetts Konzept (1986): zeigt den echten Ertrag nach Erhaltungsinvestitionen. H&ouml;her als FCF bei Growth-Capex-Unternehmen.'},
    {t:'ROCE', d:'Return on Capital Employed = EBIT / (Eigenkapital + langfr. Schulden). Misst Kapitaleffizienz. &gt;20% = starker Moat, &lt;8% = schwach.'},
    {t:'PEG-Ratio', d:'Kurs-Gewinn-Verh&auml;ltnis / Gewinnwachstum. PEG &lt;2 = attraktiv, &gt;4 = teuer. Sektor-relativ normiert (pegRelSc).'},
    {t:'EV/EBITDA', d:'Enterprise Value / EBITDA. Bewertungsm&uuml;ltipel: &lt;12x = g&uuml;nstig, &gt;25x = teuer. Buffett bevorzugt EV/EBIT (ohne D&A).'},
    {t:'EVAR', d:'Earnings Variability Score 0&ndash;100. Misst Stabilit&auml;t der Ertr&auml;ge &uuml;ber Zeit. Sektor-relativ normiert. &gt;60 = stabil, &lt;30 = zyklisch.'},
    {t:'Beta', d:'Marktsensitivit&auml;t. &lt;0.5 = defensiv, 1.0 = Markt, &gt;1.5 = aggressiv. Negatives Beta = Gegenkorrelation zum Markt.'},
    {t:'Konsistenz (consScore)', d:'IQR-gefilterte Standardabweichung der ROCE-Historie (aus annual.json). Geringe Std-Abw = hohe Konsistenz = Buffett-Qualit&auml;tsmerkmal.'},
    {t:'MACD', d:'Moving Average Convergence Divergence. ZL = Nulllinie. Histogramm > 0 = Aufw\u00e4rtsmomentum. SELL-Signal: Histogramm negativ + unter 200MA.'},
    {t:'RSI', d:'Relative Strength Index (14). &lt;30 = &uuml;berverkauft (Kaufgelegenheit m&ouml;glich), &gt;70 = &uuml;berkauft, 40&ndash;60 = neutral.'},
    {t:'Divergenz', d:'bull_regular: RSI steigt bei fallendem Kurs = nachlassender Verkaufsdruck, m&ouml;gliche Trendwende. bear_regular: Gegenst&uuml;ck (Kauf-Warnsignal).'},
    {t:'SELL MA', d:'Signal: Kurs hat die 200-Tage-Linie (SMA200) unterschritten &mdash; Aufw\u00e4rtstrend gebrochen. Unabh&auml;ngig vom MACD-Signal.'},
    {t:'HOLD DVG', d:'Deep Value Divergence: Technisches SELL-Signal unterdrueckt weil Fund &ge;80 + RSI &lt;35 + Bullish Divergenz gleichzeitig. Zeigt: gutes Unternehmen in technischer Schwaechephase. Beobachten auf 200MA-Rueckkehr. (v5.9.69)'},
    {t:'Moat', d:'Wirtschaftlicher Burggraben nach Morningstar: Wide (sehr stark), Narrow (moderat), None (kein struktureller Vorteil). Wichtig f&uuml;r langfristige Haltestrategien.'},
  ];

  var out = '';
  out += '<div class="rpt-card" style="background:#060e1a;border:1px solid #1a2a3a;border-radius:10px;padding:14px;margin-bottom:14px">';
  out += '<div style="font-size:13px;font-weight:700;color:#00c8f0;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">&#128218; Glossar &mdash; StockIQ Indikatoren</div>';
  out += '<table style="width:100%;border-collapse:collapse;font-size:9px">';
  for(var gi=0;gi<terms.length;gi++){
    var rowBg = gi % 2 === 0 ? '#0a1628' : '#0c1a2e';
    out += '<tr style="background:' + rowBg + '">';
    out += '<td style="padding:5px 8px;color:#00c8f0;font-weight:700;font-family:monospace;white-space:nowrap;vertical-align:top;width:22%">' + terms[gi].t + '</td>';
    out += '<td style="padding:5px 8px;color:#dce8f5;line-height:1.5">' + terms[gi].d + '</td>';
    out += '</tr>';
  }
  out += '</table>';
  out += '<div style="font-family:monospace;font-size:8px;color:#7a9bb5;margin-top:8px">Quellen: Buffett 1986/2024, Jegadeesh/Titman 1993, Piotroski 2000, MSCI Multi-Factor 2024, Loughran/Wellman 2011, Barroso/Santa-Clara 2015</div>';
  out += '</div>';
  return out;
}

/* Sicherer Risk-Score Wrapper (rSc ist kein globales Symbol) */
function rptRisk(s){
  /* Risk = (cSc - mom*0.25 - trend*0.20 - fund*0.35) / 0.20 */
  try {
    var fd = FD[s.t] || {};
    var mo = momSc(s) || 0;
    var tr = (s.trend || 0);
    var fu = fSc(s) || 0;
    var cs = cSc(s) || 0;
    var risk = (cs - mo * 0.25 - tr * 0.20 - fu * 0.35) / 0.20;
    return Math.max(0, Math.min(100, risk));
  } catch(e){ return 50; }
}

/* Controls wiederherstellen nach Einklappen */
function rptShowControls(){
  var ctrl = document.getElementById('rpt-controls');
  /* S57-4c: alten Bericht-Output entfernen (Type-Switch / Reopen) */
  var out = document.getElementById('rpt-output');
  if(out) out.innerHTML = '';
  /* Header + Type-Dropdown (iteriert RPT_REG) */
  var html = '<div style="font-size:11px;font-weight:700;color:#dce8f5;margin-bottom:10px">Berichts-Parameter</div>';
  html += '<div style="margin-bottom:10px"><div style="font-family:monospace;font-size:9px;color:var(--mut);margin-bottom:3px">BERICHTS-TYP</div>';
  html += '<select onchange="rptSetType(this.value)" style="width:100%;box-sizing:border-box;background:#0a1628;border:1px solid #1a3050;border-radius:6px;padding:6px 8px;color:#dce8f5;font-size:11px;font-family:monospace">';
  for(var k in RPT_REG){
    var sel = (k===RPT_TYPE) ? ' selected' : '';
    html += '<option value="'+k+'"'+sel+'>'+escapeHtml(RPT_REG[k].label)+'</option>';
  }
  html += '</select></div>';
  ctrl.innerHTML = html;
  /* Typ-spezifische Controls + Build-Button (kommt aus RPT_REG-Eintrag) */
  if(RPT_REG[RPT_TYPE] && RPT_REG[RPT_TYPE].controls){
    RPT_REG[RPT_TYPE].controls();
  }
  /* BG-2: FD[]-Backfill aus _scoresIdx fuer rpt*-Kennzahlen */
  for(var _t in _scoresIdx) {
    if(!FD[_t]) FD[_t] = {};
    var _si = _scoresIdx[_t];
    FD[_t].sector    = FD[_t].sector    || _si.sector;
    FD[_t].industry      = FD[_t].industry      || _si.industry;
    FD[_t].fcf_debt_cover = FD[_t].fcf_debt_cover || _si.fcf_debt_cover;
    FD[_t].fcf           = FD[_t].fcf           || _si.fcf_yield;
    FD[_t].roce      = FD[_t].roce      || _si.roce;
    FD[_t].peg       = FD[_t].peg       || _si.peg;
    FD[_t].rsi_val   = FD[_t].rsi_val   || _si.rsi;
    FD[_t].evar      = FD[_t].evar      || _si.evar;
    FD[_t].ev_ebitda = FD[_t].ev_ebitda || _si.ev_ebitda;
    FD[_t].ev_ebit   = FD[_t].ev_ebit   || _si.ev_ebit;
    FD[_t].beta      = FD[_t].beta      || _si.beta;
    FD[_t].debt      = FD[_t].debt      || _si.debt_eq;
    FD[_t].mom_skip  = FD[_t].mom_skip  || _si.mom_skip;
    FD[_t].mom12m    = FD[_t].mom12m    || _si.mom12m_ret;
    FD[_t].moat      = FD[_t].moat      || _si.moat;
    FD[_t].owner_earnings_yield = FD[_t].owner_earnings_yield || _si.owner_earnings;
    FD[_t].shares_change_yoy    = FD[_t].shares_change_yoy    || _si.sc_yoy;
    FD[_t].div_yield = FD[_t].div_yield || _si.div_yield;
  }
  /* fd.shareholder_return: computed (div_yield + sc_yoy) */
  document.getElementById('rpt-modal').scrollTop = 0;
}

/* Sektor-Statistiken berechnen */
function rptCalcStats(arr){
  var scores=[]; var fcfs=[]; var roces=[];
  for(var i=0;i<arr.length;i++){
    scores.push(cSc(arr[i]));
    var fd=rptGetFd(arr[i].t)||{};
    if(fd.fcf!=null&&!isNaN(fd.fcf)&&Math.abs(fd.fcf)<100) fcfs.push(fd.fcf);
    if(fd.roce!=null&&!isNaN(fd.roce)&&fd.roce<200) roces.push(fd.roce);
  }
  function avg(a){ if(!a.length) return null; var s=0; for(var i=0;i<a.length;i++) s+=a[i]; return s/a.length; }
  return { avgScore:avg(scores)||0, avgFcf:avg(fcfs), avgRoce:avg(roces) };
}

/* Signal-Text fuer Report: nutzt mSig() + sellLabel() aus Dashboard (identisch mit WL) */
function rptSigText(s){
  var sig = mSig(s);
  if(!sig || sig === 'watch') return 'WATCH';
  if(sig === 'weak')          return 'WEAK';
  if(sig === 'buy')           return 'BUY';
  if(sig === 'strong')        return 'BUY STRONG';
  if(sig === 'pb')            return 'BUY PB';
  if(isSell(sig))             return sellLabel(sig);
  if(isHoldSF(sig))           return holdSFLabel(sig);
  return 'HOLD';
}
