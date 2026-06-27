/* stockiq_ui_berichte.js -- Sektor-Analyse-Bericht Engine */
/* Extrahiert aus index.html | Sprint 53 | 27.06.2026 */
/* Dashboard v6.4.13 | ES5-only (iOS Safari + GitHub Pages) */

/* ============================================================
   SEKTOR-BERICHT ENGINE v5.9.51
   ============================================================ */

function rptOpen(){
  if(!STOCKS || STOCKS.length === 0){
    alert('Bitte zuerst fundamentals.json laden.');
    return;
  }
  rptInitSectors();
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
    var fd = FD[STOCKS[i].t];
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
    var fd = FD[STOCKS[i].t];
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
function rptBuild(){
  var sec  = document.getElementById('rpt-sector').value;
  var tk1  = document.getElementById('rpt-s1').value;
  var tk2  = document.getElementById('rpt-s2').value;
  var now  = new Date();
  var dateStr = now.toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'});

  /* Sektor-Statistiken berechnen */
  var secStocks = [];
  for(var i=0;i<STOCKS.length;i++){
    var fd0 = FD[STOCKS[i].t];
    var _si3 = _scoresIdx[STOCKS[i].t];
    var s0  = (fd0 && fd0.sector) ? fd0.sector
            : (_si3 && _si3.sector) ? _si3.sector
            : (STOCKS[i].sector || '');
    if(s0 === sec) secStocks.push(STOCKS[i]);
  }
  secStocks.sort(function(a,b){ return cSc(b)-cSc(a); });

  var stats = rptCalcStats(secStocks);

  var out = '';

  /* â”€â”€ Titel-Block â”€â”€ */
  out += '<div class="rpt-card" style="background:#060e1a;border:1px solid #1a3a5c;border-radius:10px;padding:16px;margin-bottom:14px">';
  out += '<div class="rpt-h1" style="font-size:18px;font-weight:800;color:#00c8f0;margin-bottom:4px">StockIQ Sektor-Analyse</div>';
  out += '<div class="rpt-h2" style="font-size:14px;font-weight:700;color:#dce8f5;margin-bottom:6px">&#128202; ' + sec + ' &mdash; ' + dateStr + '</div>';
  out += '<div class="rpt-mut" style="font-family:monospace;font-size:9px;color:#7a9bb5">';
  out += 'Universum: ' + secStocks.length + ' Titel &middot; Score-Architektur: Mom 25% + Trend 20% + Fund 35% + Risk 20% &middot; StockIQ v6.4.13</div>';
  out += '</div>';

  /* â”€â”€ 0. Sektor-Performance-Ranking (alle Sektoren) â”€â”€ */
  out += rptSectorRanking();

  /* â”€â”€ 1. Sektorvergleich: Statistik-Kacheln â”€â”€ */
  out += '<div class="rpt-card" style="background:#0c1420;border:1px solid #1a2a3a;border-radius:10px;padding:14px;margin-bottom:14px">';
  out += '<div class="rpt-h2" style="font-size:13px;font-weight:700;color:#00c8f0;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">1. Sektor&uuml;bersicht &mdash; ' + sec + '</div>';
  out += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">';
  var kpis = [
    {l:'Anz. Titel', v:secStocks.length, u:''},
    {l:'Ã˜ Score', v:stats.avgScore.toFixed(1), u:'/100'},
    {l:'Ã˜ FCF Yield', v:stats.avgFcf !== null ? stats.avgFcf.toFixed(1)+'%' : 'n/a', u:''},
    {l:'Ã˜ ROCE', v:stats.avgRoce !== null ? stats.avgRoce.toFixed(1)+'%' : 'n/a', u:''},
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
    var rfd = FD[rs.t] || {};
    var rsc = Math.round(cSc(rs));
    var rsig = rptSigText(rs);
    var sigC = rsig.indexOf('BUY')>=0 ? '#00e57a' : rsig.indexOf('SELL')>=0 ? '#ff5252' : '#ffab00';
    var rowBg = ri % 2 === 0 ? '#0a1628' : '#0c1a2e';
    var isSel = (rs.t === tk1 || rs.t === tk2) ? 'font-weight:700;' : '';
    out += '<tr style="background:' + rowBg + '">';
    out += '<td style="padding:5px 7px;' + isSel + 'color:' + (rs.t===tk1||rs.t===tk2?'#00c8f0':'#dce8f5') + '">' + rs.t + '</td>';
    out += '<td style="padding:5px 7px;color:#dce8f5;font-size:9px">' + (rs.n||'') + '</td>';
    out += '<td style="padding:5px 7px;text-align:center;color:#dce8f5;font-weight:700">' + rsc + '</td>';
    out += '<td style="padding:5px 7px;text-align:center;color:' + sigC + ';font-size:9px">' + rsig + '</td>';
    out += '<td style="padding:5px 7px;text-align:right;color:#dce8f5">' + (rfd.fcf!=null?rfd.fcf.toFixed(1)+'%':'â€”') + '</td>';
    out += '<td style="padding:5px 7px;text-align:right;color:#dce8f5">' + (rfd.roce!=null?rfd.roce.toFixed(1)+'%':'â€”') + '</td>';
    out += '<td style="padding:5px 7px;text-align:right;color:#dce8f5">' + (rfd.peg!=null?rfd.peg.toFixed(2):'â€”') + '</td>';
    out += '</tr>';
  }
  out += '</table>';
  if(secStocks.length > 10) out += '<div style="font-family:monospace;font-size:9px;color:#7a9bb5;margin-top:4px">+ ' + (secStocks.length-10) + ' weitere Titel im Sektor</div>';
  out += '</div>';

  /* â”€â”€ 2. Aktien-Detail â”€â”€ */
  out += '<div class="rpt-card" style="background:#0c1420;border:1px solid #1a2a3a;border-radius:10px;padding:14px;margin-bottom:14px">';
  out += '<div class="rpt-h2" style="font-size:13px;font-weight:700;color:#00c8f0;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">2. Aktien-Vergleich &amp; Analyse</div>';
  out += rptCompareBlock(tk1, tk2);
  out += '</div>';

  /* â”€â”€ 3. Detail-Karten â”€â”€ */
  out += rptDetailCard(tk1, '3a');
  out += rptDetailCard(tk2, '3b');

  /* â”€â”€ 4. Regelbasierte Textanalyse â”€â”€ */
  out += '<div class="rpt-card" style="background:#0c1420;border:1px solid #1a2a3a;border-radius:10px;padding:14px;margin-bottom:14px">';
  out += '<div class="rpt-h2" style="font-size:13px;font-weight:700;color:#00c8f0;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">4. Textliche Analyse</div>';
  out += rptTextAnalysis(tk1, stats);
  out += rptTextAnalysis(tk2, stats);
  out += '</div>';

  /* â”€â”€ 5. Glossar â”€â”€ */
  out += rptGlossar();

  /* â”€â”€ Disclaimer â”€â”€ */
  out += '<div class="rpt-card" style="background:#060e1a;border:1px solid #1a2a3a;border-radius:8px;padding:10px;margin-bottom:10px">';
  out += '<div style="font-family:monospace;font-size:8px;color:#7a9bb5;line-height:1.5">';
  out += '<strong style="color:#dce8f5">Disclaimer:</strong> Dieser Bericht wurde automatisch von StockIQ v6.4.13 generiert. ';
  out += 'Er dient ausschlie&szlig;lich zu Informationszwecken und stellt keine Anlageberatung dar. ';
  out += 'Alle Daten stammen aus yfinance (Yahoo Finance) und sind ohne Gew&auml;hr. ';
  out += 'Investitionsentscheidungen sollten immer auf Basis eigener Recherche und ggf. professioneller Beratung getroffen werden.';
  out += '</div></div>';

  document.getElementById('rpt-output').innerHTML = out;
  document.getElementById('rpt-print-btn').style.display = 'block';

  /* Controls einklappen â€” Bericht sichtbar machen */
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
  var fd1 = FD[tk1]||{}; var fd2 = FD[tk2]||{};
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
  function fmtN(v, suf){ return v!=null ? v.toFixed(1)+suf : 'â€”'; }

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
  out += row('PEG', fd1.peg!=null?fd1.peg.toFixed(2):'â€”', fd2.peg!=null?fd2.peg.toFixed(2):'â€”', false);
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
  var fd=FD[tk]||{};
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

/* â”€â”€ Sektor-Performance-Ranking (v5.9.55) â”€â”€ */
function rptSectorRanking(){
  /* Sektor-Statistiken berechnen */
  var secData = {};
  for(var i=0;i<STOCKS.length;i++){
    var fd0 = FD[STOCKS[i].t];
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
    var etfInfo = SECTOR_ETF_MAP[sec] || {etf:'â€”', name:''};
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
  out += 'Aktien-Ã˜: 12M-Momentum aller Sektortitel (aus FD[]) &middot; ETF-Return: Sektor-ETF (fund_juno v7.9.10)</div>';

  out += '<table class="rpt-tbl" style="width:100%;border-collapse:collapse;font-size:10px">';
  out += '<tr><th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:center">#</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:left">Sektor</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:center">ETF</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:right">Aktien-Ã˜ 12M</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:right">ETF 12M</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:center">Ã˜ Score</th>';
  out += '<th style="background:#1a3a5c;color:#dce8f5;padding:5px 7px;text-align:center">n</th></tr>';

  for(var ri=0;ri<rows.length;ri++){
    var r = rows[ri];
    var rowBg = ri % 2 === 0 ? '#0a1628' : '#0c1a2e';
    var momStr = r.avgMom !== null ? (r.avgMom >= 0 ? '+' : '') + r.avgMom.toFixed(1) + '%' : 'â€”';
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

/* â”€â”€ Regelbasierte Textanalyse signal-konform (v5.9.69) â”€â”€ */
function rptTextAnalysis(tk, secStats){
  var st = null;
  for(var i=0;i<STOCKS.length;i++){ if(STOCKS[i].t===tk){st=STOCKS[i];break;} }
  if(!st) return '';
  var fd = FD[tk] || {};
  var sc = Math.round(cSc(st));
  var sig = rptSigText(st);
  var rawSig = mSig(st);
  var name = st.n || tk;

  function nn(v){ return v !== null && v !== undefined && !isNaN(v); }
  function pct(v,d){ return (v>=0?'+':'')+v.toFixed(d||1)+'%'; }

  /* â”€â”€ Signal-Kategorie bestimmen â”€â”€ */
  var isBuySignal  = rawSig==='strong'||rawSig==='buy'||rawSig==='pb';
  var isSellSignal = isSell(rawSig);
  var isHoldSig    = isHoldSF(rawSig);
  var isWatchSig   = rawSig==='watch'||rawSig==='weak';

  /* â”€â”€ Persistenz aus Snapshots â”€â”€ */
  var persistCount = 0; var snapCount = 0;
  try {
    var snaps = JSON.parse(localStorage.getItem('stockiq_snapshots')||'[]');
    for(var si=0;si<snaps.length;si++){
      var snap = snaps[si];
      if(!snap||!snap.tickers||!snap.tickers[tk]) continue;
      snapCount++;
      /* Signal aus Snapshot-Daten rekonstruieren â€” vereinfacht via trend */
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

  /* â”€â”€ P1: Signal-Intro â€” direkt und konform â”€â”€ */
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
      p1 += 'Der Kurs hat die 200-Tage-Linie unterschritten â€” der Aufw&auml;rtstrend ist technisch gebrochen. ';
    else if(rawSig==='sell_zl')
      p1 += 'Der MACD hat die Nulllinie nach unten durchbrochen â€” ein Momentum-Umkehrsignal. ';
    else
      p1 += 'Mehrere technische Exit-Signale sind aktiv. ';
    if(persistText) p1 += persistText + ' ';
    p1 += '<strong>Handlungskonsequenz: Kein Neueinstieg empfohlen. Bestehende Positionen &uuml;berpr&uuml;fen.</strong>';
    p1 += scDiffTxt;

  } else if(rawSig==='hold_dvg'){
    p1 = name + ' zeigt ein <strong>Deep Value Divergence</strong>-Signal (Score ' + sc + '/100). ';
    p1 += 'Das technische Bild ist belastet (unter 200MA), aber Fundamentals (Fund ' +
          Math.round(fSc(st)) + '/100) und RSI im &uuml;berverkauften Bereich deuten auf nachlassenden Verkaufsdruck hin. ';
    p1 += '<strong>Handlungskonsequenz: Beobachten â€” Einstieg pr&uuml;fen wenn Kurs &uuml;ber 200MA zur&uuml;ckkehrt.</strong>';
    p1 += scDiffTxt;

  } else if(isHoldSig){
    p1 = name + ' wird durch den <strong>Score Filter als HOLD</strong> eingestuft (Score ' + sc + '/100). ';
    p1 += 'Das technische Exit-Signal wird durch die fundamentale St&auml;rke (Score &ge;55) neutralisiert. ';
    p1 += '<strong>Handlungskonsequenz: Qualit&auml;tsposition halten â€” kein Verkauf auf Basis des technischen Signals allein.</strong>';
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
    p1 += '<strong>Handlungskonsequenz: Beobachten â€” kein Handlungsbedarf.</strong>';
    p1 += scDiffTxt;
  }

  /* â”€â”€ P2: StÃ¤rken (nur relevante, signal-kontextuell) â”€â”€ */
  var strengths = [];
  if(nn(fd.roce)){
    if(fd.roce >= 30) strengths.push('ROCE ' + fd.roce.toFixed(1) + '% â€” starker wirtschaftlicher Burggraben.');
    else if(fd.roce >= 15) strengths.push('ROCE ' + fd.roce.toFixed(1) + '% â€” solide Kapitaleffizienz.');
  }
  if(nn(fd.owner_earnings_yield) && nn(fd.fcf)){
    var oeDiff = fd.owner_earnings_yield - fd.fcf;
    if(oeDiff > 5)
      strengths.push('OE Yield (' + fd.owner_earnings_yield.toFixed(1) + '%) vs. FCF (' + fd.fcf.toFixed(1) + '%): +' + oeDiff.toFixed(1) + 'pp Growth-Capex â€” Buffett-Indikator f&uuml;r Wachstumsinvestitionen.');
    else if(nn(fd.fcf) && fd.fcf >= 6)
      strengths.push('FCF Yield ' + fd.fcf.toFixed(1) + '% â€” starke Cashgenerierung.');
  } else if(nn(fd.fcf) && fd.fcf >= 6){
    strengths.push('FCF Yield ' + fd.fcf.toFixed(1) + '% â€” starke Cashgenerierung.');
  }
  if(fd.moat && fd.moat !== 'none')
    strengths.push('Morningstar Moat: ' + fd.moat.toUpperCase() + ' â€” strukturelle Wettbewerbsvorteile.');
  if(nn(fd.evar) && fd.evar >= 65)
    strengths.push('EVAR ' + Math.round(fd.evar) + ' â€” &uuml;berdurchschnittlich stabile Ertragsentwicklung.');
  if(nn(fd.peg) && fd.peg < 1.5)
    strengths.push('PEG ' + fd.peg.toFixed(2) + ' â€” attraktive Wachstumsbewertung.');
  if(nn(fd.beta) && fd.beta < 0.5)
    strengths.push('Beta ' + fd.beta.toFixed(2) + ' â€” defensives, marktunkorreliertes Profil.');

  var p2 = strengths.length > 0 ?
    '<strong>St&auml;rken:</strong> ' + strengths.join(' ') :
    '<strong>Fundamentales Bild:</strong> Keine herausragenden Einzelkennzahlen identifiziert.';

  /* â”€â”€ P3: Risiken â€” signal-priorisiert â”€â”€ */
  var risks = [];
  if(isSellSignal){
    var rsi3 = fd.rsi_val !== null && fd.rsi_val !== undefined ? Math.round(fd.rsi_val) : null;
    risks.push('<strong>Technischer Abw&auml;rtstrend aktiv</strong> (' + sig + '). ' +
      (persistText ? persistText + ' ' : '') +
      (rsi3 !== null ? 'RSI ' + rsi3 + (rsi3 < 35 ? ' â€” &uuml;berverkauft, Reversal-Potenzial m&ouml;glich.' : ' â€” kein extremer &Uuml;berverkauf.') : ''));
  }
  if(nn(fd.peg) && fd.peg > 3)
    risks.push('PEG ' + fd.peg.toFixed(2) + ' â€” ambitionierte Bewertung erfordert stabiles Gewinnwachstum.');
  if(nn(fd.fcf) && fd.fcf < 2 && (!nn(fd.owner_earnings_yield) || fd.owner_earnings_yield < 5))
    risks.push('FCF Yield ' + fd.fcf.toFixed(1) + '% â€” schwache laufende Cashgenerierung.');
  if(nn(fd.debt) && fd.debt > 80)
    risks.push('Debt/Equity ' + fd.debt.toFixed(0) + '% â€” erh&ouml;hte Verschuldung.');
  if(nn(fd.mom_skip) && fd.mom_skip < -20)
    risks.push('12M-Momentum ' + pct(fd.mom_skip) + ' â€” anhaltender KursrÃ¼ckgang.');
  if(nn(fd.evar) && fd.evar < 30)
    risks.push('EVAR ' + Math.round(fd.evar) + ' â€” hohe Ertragsschwankung (zyklisches Profil).');

  var p3 = risks.length > 0 ?
    '<strong>Risiken:</strong> ' + risks.join(' ') :
    '<strong>Risikoprofil:</strong> Keine kritischen Warnsignale identifiziert.';

  /* â”€â”€ P4: Technisches Bild + Signal-konformes Fazit â”€â”€ */
  var rsi4 = fd.rsi_val !== null && fd.rsi_val !== undefined ? Math.round(fd.rsi_val) : null;
  var p4 = '<strong>Technisches Bild:</strong> ';
  if(nn(rsi4)){
    if(rsi4 < 30) p4 += 'RSI ' + rsi4 + ' â€” &uuml;berverkauft. Statistisch erh&ouml;hte Reversalwahrscheinlichkeit. ';
    else if(rsi4 < 45) p4 += 'RSI ' + rsi4 + ' â€” schwaches Momentum. ';
    else if(rsi4 > 78) p4 += 'RSI ' + rsi4 + ' â€” &uuml;berhitzt. Konsolidierungsrisiko erh&ouml;ht. ';
    else if(rsi4 > 70) p4 += 'RSI ' + rsi4 + ' â€” erh&ouml;htes Niveau, aber noch nicht extrem. ';
    else p4 += 'RSI ' + rsi4 + ' â€” neutrales Niveau. ';
  }
  if(nn(fd.mom_skip)) p4 += '12M-Momentum: ' + pct(fd.mom_skip) + '. ';

  /* Signal-konformes Fazit â€” kein Widerspruch zum Signal */
  if(isSellSignal){
    p4 += '<strong>Fazit: Solange der Kurs unter der 200MA notiert, &uuml;berwiegen die technischen Risiken. ';
    p4 += nn(rsi4) && rsi4 < 35 ?
      'RSI im &uuml;berverkauften Bereich â€” Reversal beobachten, aber kein Einstieg vor Trendumkehr-Best&auml;tigung.</strong>' :
      'Kein Einstieg vor Trendumkehr-Best&auml;tigung (&Uuml;berschreiten der 200MA mit positivem MACD).</strong>';
  } else if(rawSig==='hold_dvg'){
    p4 += '<strong>Fazit: Turnaround-Kandidat â€” fundamentale St&auml;rke intakt, technische Best&auml;tigung steht aus.</strong>';
  } else if(isHoldSig){
    p4 += '<strong>Fazit: Qualit&auml;tsposition â€” technischer Druck vorhanden, aber Fundamentals rechtfertigen das Halten.</strong>';
  } else if(isBuySignal){
    p4 += '<strong>Fazit: Technisches und fundamentales Bild konvergieren positiv â€” Kaufgelegenheit unter Ber&uuml;cksichtigung der Positionsgr&ouml;&szlig;e.</strong>';
  } else {
    p4 += '<strong>Fazit: Kein klares Signal â€” Marktbeobachtung beibehalten.</strong>';
  }

  /* â”€â”€ Ausgabe â”€â”€ */
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

/* â”€â”€ Kompaktes Glossar (v5.9.55) â”€â”€ */
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
    {t:'MACD', d:'Moving Average Convergence Divergence. ZL = Nulllinie. Histogramm > 0 = AufwÃ¤rtsmomentum. SELL-Signal: Histogramm negativ + unter 200MA.'},
    {t:'RSI', d:'Relative Strength Index (14). &lt;30 = &uuml;berverkauft (Kaufgelegenheit m&ouml;glich), &gt;70 = &uuml;berkauft, 40&ndash;60 = neutral.'},
    {t:'Divergenz', d:'bull_regular: RSI steigt bei fallendem Kurs = nachlassender Verkaufsdruck, m&ouml;gliche Trendwende. bear_regular: Gegenst&uuml;ck (Kauf-Warnsignal).'},
    {t:'SELL MA', d:'Signal: Kurs hat die 200-Tage-Linie (SMA200) unterschritten &mdash; AufwÃ¤rtstrend gebrochen. Unabh&auml;ngig vom MACD-Signal.'},
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
  ctrl.innerHTML = '<div style="font-size:11px;font-weight:700;color:#dce8f5;margin-bottom:10px">Berichts-Parameter</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">' +
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
  document.getElementById('rpt-modal').scrollTop = 0;
}

/* Sektor-Statistiken berechnen */
function rptCalcStats(arr){
  var scores=[]; var fcfs=[]; var roces=[];
  for(var i=0;i<arr.length;i++){
    scores.push(cSc(arr[i]));
    var fd=FD[arr[i].t]||{};
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
