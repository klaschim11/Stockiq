# StockIQ -- Allokationsmodul: Investitionstheorie
Version 1.1 | 08. Juni 2026 | Aenderung gegenueber v1.0: AH-1-Anpassung Ausgewogen-Rezession

---

## 1. Zielsetzung und Abgrenzung

Dieses Dokument beschreibt die theoretische Grundlage des Allokations-Tabs in StockIQ.
Das Modul beantwortet eine einzige Frage: Wie viel Prozent des Gesamtportfolios sollte
in welcher Assetklasse gehalten werden, gegeben das Anlegerprofil und die aktuelle Phase
des Konjunkturzyklus?

Das Allokationsmodul ist konzeptionell unabhaengig vom cSc-Score-System, das Einzelaktien
bewertet. Es ist kein Handelssignal und kein Output eines Walk-Forward-Tests. Es ist eine
orientierungsgebende Struktur auf Basis historisch belegter Muster, die dem Anleger hilft,
die Gesamtstruktur seines Portfolios auf den Konjunkturzyklus abzustimmen.

---

## 2. Assetklassen-Framework: S/E/A/G/R/C

Das Framework unterscheidet sechs Kategorien:

S -- Einzelaktien. Die aus dem StockIQ-Scoring-System abgeleiteten High-Conviction-Picks.
Diese Kategorie traegt das hoehere unternehmensspezifische Risiko, bietet aber den
groessten Alpha-Generierungs-Spielraum.

E -- ETFs. Breite Markt- und Sektorexposition ueber passive oder semi-passive Instrumente.
ETFs ermoeglichen effiziente Sektorrotation und reduzieren das Klumpenrisiko gegenueber S.

A -- Anleihen. Staatsanleihen und Investment-Grade-Bonds. Die Duration-Empfehlung innerhalb
dieser Kategorie wird durch das bestehende Bond-ETF-Duration-Sub-Modul im Allokations-Tab
bestimmt. Berkshires Praxis, T-Bills gegenueber Langlaeufer-Anleihen zu bevorzugen, gilt
als Referenz fuer das Kapitalerhalt-Rezessionsprofil: kurze Laufzeiten eliminieren das
Zinsaenderungsrisiko bei gleichzeitig attraktivem Yield in Hochzins-Phasen.

G -- Gold. Struktureller Portfolioanker mit zwei komplementaeren Funktionen: Inflations-
Hedge und Safe Haven in Stress-Szenarien. Gold wird explizit getrennt von Rohstoffen (R)
behandelt, da es sich in Rezessionen fundamental anders verhaelt.

R -- Rohstoffe. Klassisches Late-Cycle-Asset. Rohstoffe profitieren von Inflationsdruck
und steigender Nachfrage am Ende einer Expansion, schwaechen aber in Rezessionen deutlich
ab, wenn die Industrienachfrage einbricht.

C -- Cash und Geldmarktinstrumente. Primaer eine Optionalitaets-Reserve: kein eigener
Return-Beitrag, aber die Grundlage fuer opportunistische Neuinvestitionen wenn andere
Assetklassen unter Druck geraten.

### Zentrale Unterscheidung: Gold vs. Rohstoffe in der Rezession

Die explizite Trennung von G und R ist der kritischste Aspekt des Frameworks. Waehrend
Gold und Rohstoffe im allgemeinen Sprachgebrauch oft gemeinsam als "Sachwerte" behandelt
werden, zeigt die historische Analyse einen fundamentalen Unterschied: Im Kontext der
Finanzkrise 2007-2009 sank der Rohstoffindex S&P GSCI annualisiert um 32,7%, waehrend
Gold um 15,1% zulegte. Gold wird in Krisen als Wertspeicher und Waehrungsalternative
nachgefragt; Rohstoffe verlieren dagegen mit dem Einbruch der Industrieproduktion.

---

## 3. Zyklusabhaengige Allokation: Theoretische Grundlage

### 3.1 Fidelity Asset Allocation Research Team (AART)

Das Fidelity-Business-Cycle-Framework bildet die Grundstruktur. Es unterscheidet vier
Phasen mit charakteristischen Assetklassen-Praeferenzen:

Early-Phase (Erholung): Konjunktursensitive Assetklassen haben ihre beste Zyklusperformance.
Monetaere Politik ist akkommodativ, Zinskurve steil. Aktien (S, E) sind klar bevorzugt,
insbesondere zinssensitive Sektoren (Financials, Real Estate) und zyklische Sektoren
(Technology, Industrials). Cash wird abgebaut zugunsten von Aktienexposition.

Mid-Phase (Expansion): Breitestes Wachstum, moderate Sektordifferenzierung. Aktien
bleiben favorisiert, aber der zyklische Vorsprung der Early-Phase schmilzt. Anleihen
werden unattraktiver (steigende Zinsen). Rohstoffe gewinnen moderat an Bedeutung.

Late-Phase (Ueberhitzung): Rohstoffe und Energie fuehren. Inflation steigt, Zentralbanken
straffen die Geldpolitik, Zinskurve verflacht oder invertiert. Aktien beginnen nachzulassen.
Gold gewinnt als Inflationsschutz. Cash wird aufgebaut als Puffer vor der Rezession.

Rezessionsphase: Staatsanleihen (Flucht in Qualitaet, Zinssenkungen) und Cash (Kapital-
erhalt, Optionalitaet) dominieren. Aktien und Rohstoffe stehen unter Druck. Gold bietet
Schutz als Safe Haven.

### 3.2 Rohstoffe als Late-Cycle-Asset (BCA Research 2024)

BCA Research hat in den vergangenen sechs US-Rezessionen nachgewiesen, dass Rohstoffe
ihren zyklischen Hoechstpunkt erst nach dem Aktienmarkt erreichen: Der S&P 500 peaked
durchschnittlich fuenf Monate vor Rezessionsbeginn, Rohstoffe erst zwei Monate danach.
Rohstoffe sind damit ein laufendes Nachweis-Signal fuer Late-Cycle-Konditionen, kein
fruehzeitiger Warnsensor.

### 3.3 Gold in der Rezession (Schroders 2023, WisdomTree 2026)

Schroders analysierte sieben US-Rezessionen seit 1973. Gold legte im Zeitraum von sechs
Monaten vor bis sechs Monate nach dem Rezessionsende durchschnittlich 28% zu und
uebertraf den S&P 500 um 37 Prozentpunkte. WisdomTree zeigt anhand von OECD Composite
Leading Indicators (1998-2025), dass Gold auch in starken Expansionsphasen positive
Durchschnittsrenditen erzielt. Gold ist damit kein opportunistisches Krisenasset, sondern
ein struktureller Portfolio-Anker, der ueber alle Phasen einen positiven Beitrag leistet,
mit dem staerksten Beitrag in der Rezessionsphase.

---

## 4. Berkshire Hathaway als Referenz fuer Kapitalerhalt-Rezession

### 4.1 Portfoliostand Q1 2026

Berkshires konsolidierte Bilanz per 31. Maerz 2026 (10-Q-Filing) zeigt einen Bestand von
$51,5 Mrd. Cash und $339,3 Mrd. kurzfristigen US-T-Bills, zusammen $390,7 Mrd. gegenueber
$17,7 Mrd. Anleihen und $288 Mrd. Aktien. Das entspricht circa 55% Cash/T-Bills, 2,5%
Anleihen und 43% Aktien am investierbaren Portfolio. Seit Ende 2024 ist Berkshire netto
Aktienverkaeufer (mehr als $174 Mrd. netto veraeussert in zehn Quartalen) und baut statt-
dessen die T-Bill-Position auf.

### 4.2 Drei strukturelle Lektionen

Erste Lektion: T-Bills, nicht Langlaeufer. Buffett bevorzugt explizit kurzfristige
Staatsanleihen gegenueber Langlaeufer-Bonds. Bei hohen Zinsen erzielen T-Bills einen
Grossteil der verfuegbaren Rendite ohne das Duration-Risiko. Diese Praxis bestaetigt,
dass die A-Allokation in der Rezession mit kurzer Duration umgesetzt werden sollte -- das
bestehende Bond-ETF-Duration-Sub-Modul in StockIQ traegt diesem Punkt Rechnung.

Zweite Lektion: Aktienquote geht nie auf null. Berkshire haelt auch bei 55-59% Cash noch
43% in Aktien -- ausschliesslich qualitative Kernanlagen (Apple, American Express, Coca-
Cola). Null-Aktienquote in der Rezession ist kein Buffett-Modell.

Dritte Lektion: Kein Gold, keine Rohstoffe. Das ist eine institutionelle Entscheidung.
Berkshire ist ein Versicherungskonzern mit stabilen operativen Cashflows, die das Portfolio
unabhaengig von Goldpreisen stabilisieren. Fuer einen privaten Anleger ohne diese
strukturellen Einnahmen bleiben Gold (G) und ggf. Rohstoffe (R) als eigenstaendige Klassen
berechtigt.

### 4.3 Konsequenz fuer StockIQ

Das Kapitalerhalt-Rezessionsprofil uebernimmt Berkshires Prinzipien in modifizierter Form:
C=45% (geringfuegig moderater als Berkshires 55%, da kein Versicherungs-CF), A=12% mit
Schwerpunkt kurze Laufzeiten, S=20% Qualitaets-Equities, G=18% als Inflationsschutz
und Safe Haven (Ersatz fuer Berkshires institutionelle Optionalitaet), R=0% (Rohstoffe
in Rezession kontraindiziert).

---

## 5. Empirische Phasenbestimmung

### 5.1 Wissenschaftliche Grundlage

Hansen, A.L. (2021, publiziert im International Journal of Forecasting, Band 40, Heft 1,
2024, Seiten 409-422): VIX-Index und Yield-Curve-Spread bewegen sich in gegenlaeufeigen
Zyklen, die dem Konjunkturzyklus entsprechen. Der kombinierte Indikator uebertrifft die
Zinskurve allein in der Rezessionsprognose fuer den Zeitraum 1950-2022 sowohl in-sample
als auch out-of-sample. Das Muster hat sich in jedem Konjunkturzyklus wiederholt, fuer
den VIX-Daten verfuegbar sind. Es kann daher als robust eingestuft werden.

### 5.2 Vier-Quadranten-Schema

Das VIX-Yield-Curve-Framework bildet vier Quadranten, die den vier Zyklusphase entsprechen:

Early-Phase: VIX niedrig (unter 20), Zinskurve steil (ueber 100 Basispunkte). Akkommodative
Geldpolitik nach dem Rezessionstiefpunkt, steile Kurve als Erholungssignal.

Mid-Phase: VIX niedrig bis moderat (unter 18), Zinskurve moderat positiv (30-100 bps).
Breite Expansion ohne ausgepraegten Inflationsdruck.

Late-Phase: VIX moderat bis erhoehen (18-28), Zinskurve flach oder invertierend (unter
50 bps). Zentralbank straffe Geldpolitik, Inflationsdruck, Nachlassen des Kreditwachstums.

Rezession: SPY unter dem 200-Tage-Durchschnitt UND VIX ueber 25. Kreditklemme,
Nachfrageeinbruch, Kapitalerhalt-Modus.

### 5.3 Verfuegbare Daten in StockIQ

VIX ist bereits in __macro__ des scores.json vorhanden. SPY above_200ma ist ebenfalls
bereits verfuegbar. Die einzige fehlende Groesse ist der Level des Yield-Curve-Spread,
der als neue Variable curve_slope_bps (TNX minus IRX in Basispunkten) in fund_juno
ergaenzt wird. Diese Ergaenzung ist eine einzeilige Aenderung im Makro-Block und
stellt keinen Breaking Change dar.

### 5.4 Hybrid-Architektur

Die Phasenbestimmung erfolgt als Hybridmechanismus: Das System berechnet beim JSON-Load
automatisch eine Phase (algorithmic baseline) und zeigt diese als Badge mit den
zugrundeliegenden Indikatoren an. Der Nutzer kann die Phase per Dropdown manuell
ueberschreiben. Der Override wird in localStorage unter dem Schluessel
'stockiq_cycle_phase' gespeichert. Bei einem automatisch erkannten Phasenwechsel --
d.h. wenn das Algorithmusergebnis von der gespeicherten Phase abweicht -- erscheint ein
Hinweisbanner im Allokations-Tab.

---

## 6. Zyklusabhaengige Ziel-Allokationsmatrix

Die vollstaendige Matrix fuer alle drei Profile und alle vier Phasen. Alle Zeilen
summieren auf 100 Prozent.

### Kapitalerhalt (Berkshire-adjustiert, gedaempfte Zyklustilts)

```
Phase          S     E     A     G     R     C   Summe
Early         28    10    20    10     5    27    100
Mid           28    10    17     8     7    30    100
Late          20     8    13    15     9    35    100
Rezession     20     5    12    18     0    45    100
```

Charakteristik: Strukturell hoehere C- und A-Allokation als Ausgewogen. Berkshire-
Rezessionsprofil: C=45% T-Bills, S=20% Qualitaetsaktien, G=18% Safe Haven, R=0%.
Aktienquote geht nie auf null (Buffett-Prinzip). Rohstoffe in Rezession auf null
(Nachfrageeinbruch). Zyklustilts gedaempft (der Anleger will Kapital erhalten, nicht
den Zyklus ausreizen).

### Ausgewogen (akademisch kalibriert)

```
Phase          S     E     A     G     R     C   Summe
Early         50    15    15     8     7     5    100
Mid           50    15    12     5     8    10    100
Late          35    15    10    12    13    15    100
Rezession     20    10    18    21     5    26    100
```

Charakteristik: Balanced-Ausgangsportfolio (Default-Profil). Hohe Aktienexposition in
Early/Mid, klassische Anleihen-Aufstockung in der Rezession. Rohstoffe sind in der Late-
Phase mit 13% vertreten als Inflations-Hedge, fallen in der Rezession auf 5%.

Hinweis Rezession-Allokation (AH-1, Juni 2026): Die Bond-Allokation in der Rezession
wurde von A=30 auf A=18 reduziert, Gold von G=15 auf G=21 und Cash von C=20 auf C=26
angehoben. Grund: Im aktuellen Fiskaldominanz-Regime zeigt die rolling SPY/TLT-Korrelation
einen strukturellen Vorzeichenwechsel von negativ zu positiv seit 2022. Anleihen erfuellen
damit ihre klassische Hedge-Funktion nicht mehr. Die Anpassung ist eine beobachtungs-
gestuetzte Vorsichtsmassnahme; der Rueckgaengigmachungsplan bei Falsifikation ist in
Hypothese AH-1 dokumentiert (Rueckkehr zu A=30 wenn rolling 12M Korr(SPY,TLT) < 0 im
naechsten Rezessionsfenster bestaetigt wird). Diese Allokation ist in ALLOC_TARGETS
des Dashboard v6.4.0 implementiert (keys: bonds=18, gold=21, cash=26).

### Rendite-Max (verstaerkte Zyklustilts, equity-lastig)

```
Phase          S     E     A     G     R     C   Summe
Early         58    20     5     4     8     5    100
Mid           58    20     5     4     8     5    100
Late          42    20     5    10    15     8    100
Rezession     30    10    25    15     5    15    100
```

Charakteristik: Maximale Aktienexposition in Early/Mid, minimale Absicherung (5% A als
Rebalancing-Reserve). Rohstoffe in der Late-Phase mit 15% als staerksten Zyklusbeitrag.
In der Rezession deutliche Allokationsanpassung (S von 58% auf 30%), aber weiterhin
hoehere Aktienquote als Kapitalerhalt-Profil.

---

## 7. Implementierungshinweise

Die Allokationsmatrix wird im Dashboard als JavaScript-Objekt ALLOC_TARGETS implementiert.
Der Datenzugriff erfolgt mit ALLOC_TARGETS[profil][phase], wobei profil aus localStorage
'stockiq_profile' (Onboarding-Ergebnis) und phase aus localStorage 'stockiq_cycle_phase'
(empirische Bestimmung oder manueller Override) gelesen wird.

Die Eingabefelder im Allokations-Tab werden auf die neuen Kategorien S/E/A/G/R/C
umgestellt. Die Ist-Werte (manuelle Eingabe durch den Nutzer) werden mit den Soll-Werten
(aus ALLOC_TARGETS) verglichen. Abweichungen ueber +/- 7 Prozentpunkte werden als
Rebalancing-Alert markiert (unveraenderte Logik aus v5.9.20).

Das bestehende Bond-ETF-Duration-Sub-Modul bleibt unveraendert erhalten und behandelt
die Duration-Entscheidung innerhalb der A-Kategorie. Das GSR-Modul (Gold-Silber-Ratio)
bleibt ebenfalls unveraendert und behandelt die Frage der Edelmetall-Gewichtung innerhalb
der G-Kategorie.

---

## 8. Quellen

BCA Research (2024): Commodities as a Late-Cycle Investment.
  Commodity prices typically rally toward the end of the business cycle;
  S&P 500 peaked before commodities in past six recessions.

Bekaert, G. & Engstrom, E. (2010): Asset Return Dynamics Under Bad Environment --
  Good Environment Fundamentals. NBER Working Paper 15370.
  Zeigt, dass Aktien-Anleihen-Korrelation in Hochunsicherheits-Regimen positiv wird
  (Fiskaldominanz-Effekt). Empirische Grundlage fuer AH-1 Hypothese.

Berkshire Hathaway (2026): Form 10-Q, Quarter ending March 31, 2026.
  Cash + T-Bills $390.7bn (~55% of investable portfolio).

Fidelity AART (2025): The Business Cycle Approach to Asset Allocation and Sector Investing.
  Foundational four-phase framework for asset class and sector rotation.

Hansen, A.L. (2024): Predicting Recessions Using VIX-Yield Curve Cycles.
  International Journal of Forecasting, 40(1), 409-422.
  VIX and yield curve slope co-move in counterclockwise cycles aligned with business cycle.

Proactive Advisor Magazine (2025): The Dynamics of Gold Performance Across Market Scenarios.
  GFC 2007-2009: Gold +15.1% annualized, Commodities -32.7%.

Schroders (2023): What Could a US Recession Mean for Gold and Gold Equities?
  Gold +28% average over six months around seven US recessions since 1973.

Shiller, R.J. (2025): US Stock Market Data (1871--2025). Yale Economics Department.
  Historische Aktien-Anleihen-Korrelation: negativ 1998-2021, strukturell positiv
  seit 2022. Datenquelle fuer AH-1 Regime-Diagnose.

WGC -- World Gold Council (2025): Annual Report.
  Structural gold allocation 5-10% optimal; positive stock-bond correlation reduces bond hedge.

WisdomTree (2026): The Role of Gold in a Portfolio.
  Gold performs positively in both deep recessions and strong expansions (OECD CLI 1998-2025).

---

*StockIQ Allokationsmodul Investitionstheorie | v1.1 | 08. Juni 2026*
*v1.0 erstellt im Rahmen UI/UX-Review Sprint 10; v1.1 AH-1-Anpassung Sprint 28*
*Kein OOS-Test: Orientierungsrahmen, keine Handelsstrategie*
