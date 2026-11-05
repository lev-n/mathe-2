# Research summary: Mathe-Portal Klasse 2 ("Mathe 2")

| | |
|---|---|
| **Project** | Free, no-login maths practice portal for Klasse 2 (Grundschule, Germany, children aged 7–8). Sibling of the Klasse 4 portal. Static site, progress only in the browser. |
| **Research date** | 2026-11-03 |
| **Language** | English. German curriculum terms and all child-facing strings stay German. |
| **Status** | Basis for implementation. No expert in Fachdidaktik or law has reviewed it. Not legal advice. |
| **Relation to Klasse 4** | The Klasse 4 research [42] stays valid for general learning science, motivation, privacy and accessibility. IDs such as L8, M16, C3 or P13 mean the findings in [42] unless restated here. This document adds only what changes at age 7–8. |

Evidence labels: **N** normative (curriculum, law), **E** empirical, **D** didactic consensus or practitioner material, **H** our own heuristic. Inline numbers refer to section 9. Curriculum wording was read in the original texts; effect sizes come from the primary source unless the text says otherwise.

## 1. Key takeaways

1. **The number range is 0–100, in every Land checked** [2][4][5][6]. Addition and subtraction with crossing a ten are expected, although no curriculum text uses the word "Zehnerübergang" (only a Berlin-Brandenburg planning aid does [7]).
2. **The whole kleines Einmaleins is not expected as memorised facts by the end of Klasse 2.** Bayern, NRW, Baden-Württemberg and Berlin-Brandenburg all expect *Kernaufgaben* from memory and other facts *derived* from them [2][4][5][6]. NRW and Berlin-Brandenburg place full automatisation later [4][6]. A row-by-row trainer of all 100 facts would overreach.
3. **The Länder define Kernaufgaben differently.** Bayern includes square facts and · 0 [2]. Berlin-Brandenburg's planning aid names only · 1, · 2, · 5, · 10 [7]. So square facts are optional.
4. **Weight, volume, seconds, comma notation and schriftliche Verfahren are out of scope** at this level in all four Länder. Units are ct, €, cm, m, min, h, Tag, Woche, Monat, Jahr.
5. **Number-word inversion is the signature Klasse 2 error.** In a study of 96 German second graders, Zahlendreher made up 54.4 % of all errors on representation-change tasks, mostly from the spoken number word [16]. This needs a dedicated skill, audio and a bug hint.
6. **Counting is the main risk, not speed.** Children who stay with counting treat tasks in isolation [12][14]. The app should make structure visible (5/10 fields, related task sets), and hints should point to a relation, never to "count again".
7. **Reading is a barrier we can only reduce.** The NRW goal for the end of Klasse 2 is "lesen einfache Texte"; fluent reading is a Klasse 4 goal [4]. Short text, pictures that show the story, and read-aloud are needed. Exact limits in section 4 are mostly heuristics, and we found no verified German words-per-minute norm for Klasse 2.
8. **Recommended default round: 8 items** (Klasse 4: 10). This is a heuristic. No study we found tests round length at this age (section 7.3).
9. **Fair-design rules do not change.** No timers, currency, leaderboards or streaks. Section 7.2 ("Banned patterns") replaces Klasse 4 §6.4, and section 7.4 restates M15.

## 2. Curriculum comparison: what is expected by the end of Klasse 2

### 2.1 What the KMK standards mean for Klasse 2

The KMK Bildungsstandards 2022 describe **Regelstandards for the end of Jahrgangsstufe 4** ("Zahlen bis 1 000 000", "Grundaufgaben des Kopfrechnens … gedächtnismäßig") [1]. They set no Klasse-2 waypoint. For Mathe 2 they give only three things: the Leitideen as a frame, the process competences, and the Anforderungsbereiche. The KMK says work on all three Anforderungsbereiche is central "für alle Schülerinnen und Schüler – unabhängig vom mathematischen Leistungsvermögen" [1], which is why every Stufe keeps some harder items. All Klasse-2 scope below comes from Länder curricula.

Sources read: Bayern LehrplanPLUS 1/2 [2] and Jahrgangsstufenprofil 2 [3]; NRW Lehrplan 2021, "Ende der Schuleingangsphase" [4]; Baden-Württemberg Bildungsplan 2016, Klassen 1/2 [5]; Berlin-Brandenburg Rahmenlehrplan Teil C, Niveaustufe B [6] and LISUM Planungshilfe Jg. 2 [7].

**NRW reading rule:** competences not split into two columns must already be reached by the end of the Schuleingangsphase and are deepened in Klasse 3–4 [4, p. 85]. This matters for combinatorics and probability words.

### 2.2 Content by area

| Area | Bayern (Jgst. 1/2) [2][3] | NRW (end of Schuleingangsphase) [4] | BW [5] / BE-BB Niveau B [6][7] | Decision for Mathe 2 |
|---|---|---|---|---|
| **Number range** | "Zahlenraum bis Hundert"; flexible counting; Zahlenstrahl, Hundertertafel; Zwanziger- and Hunderterfeld; 34 → 3Z 4E; Einerwürfel/Zehnerstangen; gerade/ungerade, Nachbarzahlen; >, <, = | Count, name, write, order to 100; Bündelung, Stellenwertschreibweise; Vorgänger/Nachfolger, Hälfte/Doppelte | BW: bis 100; leerer Zahlenstrahl; gerade/ungerade; Hälfte/Doppelte. BB: bis 100; Nachbarzehner; gerade/ungerade; Zahlenstrahl and Zahlenstrich | 0–100. Nothing above 100. |
| **Plus/Minus, Zehnerübergang** | Einspluseins to 20 and Umkehrungen "automatisiert und flexibel", transferred to analogous tasks; Rechnen in Schritten, Umkehr-, Tausch-, Nachbaraufgaben in both ZR 20 and ZR 100; gleich-/gegensinnig; find and correct Rechenfehler | Einspluseins automatisiert; + and − to 100 "mündlich oder halbschriftlich"; Nachbarzahlen; ergänzen auf Stufenzahlen; verdoppeln, halbieren | BW: Zerlegungen to 10, Einspluseins from memory; ZR 20 "notwendige Voraussetzung" for ZR 100. BB: "schrittweises Rechnen … über 10 hinaus"; Aufgabenfamilien. LISUM: "Ohne und mit Überschreiten des Zehners", 35 + 8 via 35 + 5 + 3 | **Crossing a ten is in.** ZE ± E first, then ZE ± ZE, sum ≤ 100, no negative results. |
| **Einmaleins** | **Kernaufgaben = · 1, · 2, · 5, · 10 and Quadratsätze**, their Umkehrungen and · 0 automatised; other facts derived (9 · 8 = 10 · 8 − 8) | Kernaufgaben automatised, other facts derived. "Alle Zahlensätze … automatisiert" only at end of Klasse 4 | BW: Kernaufgaben from memory, kleines Einmaleins derived from them. BB: products "über auswendig gelernte Kernaufgaben"; automatised kleines 1×1 only at Niveau C (Jg. 3–4). LISUM: Kern = · 1, · 2, · 5, · 10 | Derivation of all facts is in. **Automatised recall is targeted only for Kernaufgaben.** Squares optional. |
| **Division** | Aufteilen and Verteilen, **"auch mit Rest"**; Umkehrungen of Kernaufgaben automatised | Aufteilen and Verteilen matched to tasks; Umkehrungen "sicher" only at end of Klasse 4; Rest not named at this level | BW: Aufteilen, Verteilen, **"auch mit Rest"**. BB: Aufteilen, Verteilen; Rest not named at Niveau B | Division without Rest is core, tied to Mal facts. Rest is optional. Never ÷ 0. |
| **Geld** | €, ct; coins and notes; order by value; wechseln; mixed notation "9 € 30 ct" | ct, €; compare; Stützpunkt 1 €; whole-number Maßzahlen only | BW: Euro and Cent, order, determine amounts. BB: Stückelung; "ohne Dezimalschreibweise"; LISUM: Rückgeld by Ergänzen | In. **No comma notation.** Mixed notation only. |
| **Länge** | m, cm; Lineal, Maßband; "2 m 15 cm"; Bezugsgrößen (Tafel 1 m); non-standard units | cm, m; Lineal, Zollstock; Stützpunkte 1 cm, 1 m; umwandeln | BW: cm, m; Handspanne etc. BB: m, cm; 5 cm = 5 · 1 cm | cm and m only. mm, dm, km out. |
| **Zeit** | h, min, Woche, Monat, Jahr; read clock; simple spans ("drei Stunden später") | Minute, Stunde, Tag, Woche, Monat, Jahr; **volle, halbe, Viertel-, Dreiviertelstunde on analog and digital clocks, also set them** | BW: min, h, Tag, Woche, Monat, Jahr; spans "halbe Stunde, volle Stunde". BB: Zeitpunkt vs Zeitspanne; read "Minute, volle Stunde, halbe Stunde, viertel Stunde" | Full, half, quarter are core. Five-minute reading is Stufe 3 only. Seconds out. |
| **Gewicht, Hohlmaße** | Not in 1/2 (g, kg, l, ml in 3/4, see [42] C8) | g, kg, t, ml, l only at end of Klasse 4 | BW: not in 1/2. BB: Niveau C | **Out.** |
| **Geometrie** | Lagebegriffe, Wege, Perspektiven; Dreieck, Kreis, Viereck, Quadrat, Rechteck; **all of Zylinder, Prisma, Quader, Würfel, Kegel, Pyramide, Kugel**; Ecke, Kante, Seite, Seitenfläche; Quadrat as special Rechteck; Achsensymmetrie incl. producing; Muster; **area by unit squares, perimeter comparison on a grid** | Rechteck, Quadrat, Dreieck, Kreis; **Würfel, Quader, Kugel only**; einfache Würfelgebäude, also from a plan; identify Achsensymmetrie; Muster; Legen, Zerlegen. Area, perimeter and producing mirror images: end of Klasse 4 | BW: Viereck, Dreieck, Kreis; **Würfel, Kugel only**; Würfelbauwerke, Ansichten; simple symmetry; Muster. BB: Kugel, Würfel, Quader; Dreieck, Viereck, Quadrat, Rechteck, Kreis; complete a figure to a symmetric one; Würfelbauten; rechte Winkel | Common core: figures, Würfel/Quader/Kugel, Lage, Symmetrie erkennen, Muster, Würfelgebäude. Other Körper: Stufe 3 (Bayern). Area/perimeter: optional. Rechter Winkel, Netze, Sechseck: out. |
| **Daten** | Strichlisten, einfache Schaubilder, Tabellen; Kalender; ask questions of data | Diagramme and Tabellen; read Kalender | BW: Strichlisten, Tabellen, einfache Diagramme; Säulen- und Balkendiagramme named under Kontexte. BB: Tabellen, Würfeltürme, vorgegebene Säulendiagramme; Strichlisten, Listen, Kalender. Balkendiagramm: Niveau C | Read and complete; never free-form charts. |
| **Zufall, Kombinatorik** | Säckchen experiments; sicher, möglich, unmöglich, plus wahrscheinlich, unwahrscheinlich "alltagssprachlich"; compare Säckchen with equal totals; 2 T-Shirts × 3 Hosen | "sicher, (un-)wahrscheinlich, (un-)möglich"; number of possibilities (unsplit, so already end of Kl. 2) | BW: Kugeln, Würfel, Glücksrad, Münze; combinatorics "handelnd". BB: sicher, möglich, unmöglich; "Probieren und Sortieren"; Gewinnchancen only at Niveau C | The three core words everywhere; comparing chances is optional. No numbers as probabilities. |
| **Sachaufgaben** | Information from Bildern, Erzählungen, einfachen Texten; Rechenoperation ↔ Situation; Plausibilität ("Eis 40 €?"); Fermi; systematisches Probieren | Rechengeschichten, Bildsachaufgaben; Zeichnungen, Skizzen; set questions | BW: einfache Sachaufgaben, Anzahl–Preis, Knobelaufgaben. BB: Situationen as Terme with **one** Rechenoperation; □ + 5 = 8 | One step is core. Two steps are Knobel only. |

### 2.3 Länder differences that affect the app

- **Squares and · 0:** Bayern requires them; the others do not name them at this level. PIKAS (NRW) treats squares as easy facts children can memorise [8][9].
- **Division with Rest:** Bayern and BW only.
- **Körper:** Bayern seven, NRW and BE-BB three, BW two.
- **Area and perimeter:** Bayern at 1/2; NRW at Klasse 4; BW does not list it at 1/2; BE-BB has perimeter at Niveau C.
- **Producing mirror images:** Bayern and BE-BB at this level; NRW at Klasse 4.
- **"wahrscheinlich":** Bayern and NRW; BE-BB's Niveau B and BW do not name it.
- **Comparing chances:** Bayern only at this level.
- **Representations:** Hundertertafel is named in Bayern's plan and used in NRW practice through PIKAS [19], but not named in NRW's plan. The NRW plan names no Zahlenstrahl at this level either, though it requires changing between representations.
- **Verdoppeln, Halbieren:** named in NRW, BW and BE-BB; not named in Bayern's plan. **Gerade/ungerade:** named in Bayern, BW and BE-BB; not in NRW's.
- **Reduced range:** BE-BB's "[ggf. bis 20]" applies to the Förderschwerpunkt Lernen, not to the general plan [6].
- **Timing within the year:** double-year plans (Bayern 1/2, NRW Schuleingangsphase) do not fix a month. A child in Klasse 2 in October may not have met Malnehmen yet, so nothing is hard-locked.

### 2.4 Out of scope

Schriftliche Verfahren; numbers above 100; rounding rules (NRW asks only for the "ungefähre Größenordnung"; Rundungsregeln appear at BB Niveau C); Dezimalschreibweise; fractions in Größen beyond the words "halbe" and "Viertel" on the clock; g, kg, t, l, ml, mm, km, s; Fachbegriffe Summe, Differenz, Produkt, Quotient (NRW Klasse 4; Klasse 2 uses plus, minus, mal, geteilt [4]); Punkt vor Strich; Baumdiagramme; numeric probabilities; Binärzahlen.

## 3. Learning science and age-specific findings

General findings carry over from [42]: retrieval practice (L1), spacing (L2), interleaving (L3), elaborated feedback (L4), worked examples (L6), and praise and reward research (M1, M2, M6). Most of that evidence comes from older learners; the elementary estimate for quizzing is smaller and uncertain [49].

| ID | Finding | Evidence | Design consequence |
|---|---|---|---|
| F1 | **Counting.** "Einseitig zählende" strategies mark particular difficulty. Signs include counting in ones, not using tens, isolated tasks, and 3 + 9 = 11 from counting the first addend [12]. Children who count firmly see no relations between tasks [14]. Among 139 Austrian first graders, recall went with deriving, and deriving was rare in children who mostly counted (correlational) [12]. In a 13-session case study, a relation seen in one task did not transfer by itself to similar tasks [15]. | D, weak E | Use 5/10-structured fields. Build small sets of related items (17 − 7, then 17 − 8 [14]). Hints name a relation or the next ten. Never label a child as counting; we cannot observe it. |
| F2 | **Zehnerübergang.** BE-BB plans stepwise calculation first (35 + 5 + 3), with bundling shown on material, and the Rechenstrich for two-digit addends [6][7]. Hilfsaufgaben transfer badly to subtraction: 34 − 19 = 13 comes from 34 − 20 − 1 [12]. | N, D | Separate skills: ZE ± E before ZE ± ZE. Strategy scaffold through `multi` steps at Stufe 1. A dedicated bug for the Hilfsaufgabe direction. |
| F3 | **Inversion.** 96 German second graders: Zahlendreher in 3.7 % of tasks, 54.4 % of all errors; 80.2 % made none, 9.4 % made them in more than 10 % of tasks; the test had ceiling effects [16]. German writing errors in Grades 1–2 are largely inversion-related (170 German-speaking children) [17]. Inversion errors depended on language and not on working memory in Dutch- and French-speaking children [18]. PIKAS: 56 marked instead of 65; link spoken words and writing [10]. | E | Skill `zahlen.zahlwort` with audio. Swapped digits are a detected bug everywhere. A minority of children need most of this support, so it should not slow others. |
| F4 | **Representations differ.** The Hunderterfeld continues the Zwanzigerfeld and shows amounts [11]. The Hundertertafel shows relations by row and column [19]. The Zahlenstrahl starts with 0 and the Hunderterkette with 1, which is a source of confusion [20]. Some children do not distinguish "fünf Kugeln" from "die fünfte Kugel" [20]. Children should move between representations [4][21]. | N, D | One representation per item. Hints name which one. Matching items (`choice` with visuals) at Stufe 2. Off-by-one bug on the Zahlenstrahl. |
| F5 | **Malnehmen.** PIKAS calls early rote recitation of rows a misunderstanding: first understanding, then Kernaufgaben, then derivation by Tausch-, Verdopplungs-, Nachbaraufgaben, shown on the Punktefeld [8][9]. LISUM: · 1 and · 10 first, · 2 as doubling, · 5 as half of · 10; say "10 Achter" [7]. Sequential and simultaneous meanings both matter [2][22]. | D, N | Order the skills that way. Convention: the first factor counts groups (3 · 4 = 3-mal die 4 = 4 + 4 + 4 [22]). Rows are never drilled in sequence. Track 40 Kern facts (a ∈ {1, 2, 5, 10}, b ∈ 1–10), plus 6 extra squares where enabled. |
| F6 | **Equal sign.** Of 159 second and third graders screened, 112 solved none of 4 equivalence problems (3 + 7 = □ + 5 type) [34]. | E (one US sample) | Vary □ position from Stufe 2. A hint for the equal sign. Two-sided equalities are Stufe 3 only. |
| F7 | **Feedback and prior knowledge.** Children aged 7.2–9.8 (M 8.4, N = 108): immediate *verification* feedback helped those not taught a strategy and hurt those who had been taught one [34]. | E, one study, minimal feedback, not the app's hint type | Keep two-stage hints from L4. Once a skill is Sicher, reduce extra feedback text to a short confirmation. Do not add more feedback as a default. |
| F8 | **Anxiety and praise.** In US first and second graders (N = 154), about half of the highest achievers reported medium to high maths anxiety [44]. Time pressure generally acts as a stressor; the literature is sparse [45]. Expected tangible rewards undermine motivation more in children (d = −0.39) [43]. | E, figures via [42] | Same rules as Klasse 4. No Blitzrunde in v1 (7.1). |
| F9 | **Attention.** 57 children aged 5–12: rapid development from 5–6 to 8–9 years, then a plateau; performance poorer under high task load [35]. NRW sets homework for Klassen 1–2 to 30 minutes a day, Klassen 3–4 to 45 (schools without gebundenen Ganztag) [36]. Digital practice works best at about 30–75 minutes a week (L10 in [42]). | E (abstract only), N | Shorter rounds (7.3). One new demand at a time: new representation or larger numbers, not both. |
| F10 | **Reading goal.** End of Schuleingangsphase: "lesen einfache Texte", recognise familiar words at sight, Druckschrift as the starting script [4]. Weak readers at mean age 7.3 read about 25 syllables and words in 40 s on a list test [29]. Word-problem difficulty depends on word and sentence length, unfamiliar words and semantic structure; language and number difficulty interact [27]. | N, E | Section 4. The Müller figure describes low comprehenders on a list test, so it is not a norm. |
| F11 | **Read-aloud.** A meta-analysis reports +0.13 SD in maths and +0.56 SD in reading tests with read-aloud [31] (seen in a summary, with no separate primary-school figure). | E, small, indirect | Provide "Vorlesen" for all task text, but do not expect it to replace short wording. |
| F12 | **Pictures.** Systematic review, elementary school: representational pictures went with better performance on simple problems; decorative pictures were neutral; informative pictures had negative effects [28]. | E (abstract) | Pictures show the story and repeat text data. No decoration in the task area. NRW-required Bildsachaufgaben are a taught exception, with few objects. |
| F13 | **Type and layout.** For second graders, smaller font and longer lines lowered comprehension (100 children in grades 2 and 5); line spacing had no effect [32]. 7–9-year-olds read faster at larger x-height (via [42] P11) [33]. | E | Larger body text than Klasse 4 and shorter lines (7.1). |
| F14 | **Touch.** Children aged 7–10 missed more targets than older groups and had the most trouble with 0.25-inch targets; holdover touches were 3.93 % for ages 7–10 and 0.56 % for adults [37]. Inset targets were missed about twice as often as edge-flush ones [37]. Children aged 7–11 touched outside targets 46 % of the time, adults 32 % (N = 14) [38]. Fitts' law with nominal width predicted movement time for ages 5–10 (R² = 0.93) [39]. NN/g recommends at least 2 × 2 cm for young children and limited motor demands under 8 (practitioner) [40]. | E (small), D | Keys at least 72 px (about 14 mm by the [42] P8 estimate), hit areas extending into gaps and to screen edges. Keep the 400 ms holdover guard. Tap only; no drag. |
| F15 | **Geld.** 76 children followed from school entry to the end of Klasse 2 (interviews): tasks with one unit were clearly easier than Euro and Cent together; nearly a third could not value 10 €, 5 €, 2 €, 1 €, 10 ct, 10 ct, 5 ct, 1 ct; the most common wrong answer was 44 Euro, adding all printed numbers. 12 % named coins that do not exist [23]. Anzahl vs Wert is a learning goal in PIKAS [25]. | E (2008, small) | One unit first. Mixed units only at Stufe 3. Dedicated bugs. Wechseln as in [24]. |
| F16 | **Uhr.** 120 children aged 6–9: analog scores far below digital, setting harder than reading, with a wide range of misunderstandings [26] (1989 thesis, abstract). | Weak E | Analog and digital side by side at Stufe 1. Whole and half hours first. "Einstellen" as choosing the matching clock. |
| F17 | **Sense-making already fails early.** 76 of 97 first and second graders "solved" the captain problem using the numbers (Reusser, via [27]). "Mehr" often does not link to a difference; 9 is given as the difference (Überlagerungsfehler) [10]. | E (secondary), D | `sachaufgaben.frage-pruefen` and `sachaufgaben.vergleichen`, with a "Nicht lösbar" button only at Stufe 3. |
| F18 | **Daten at this age.** We verified no Klasse-2 empirical study on diagram reading or chance language. | N only | Scope rests on curricula. Tune in a pilot. |

**Privacy (no change).** Art. 8 DSGVO applies only where processing rests on consent for a service offered directly to a child; below 16 a parent must give or authorise it, and member states may lower the age to 13 [47]. Germany has not lowered it [48]. Mathe 2 keeps the Klasse-4 approach (P1, P2): no accounts, no personal data, no third-party requests, storage only after opt-in. Younger users make one point more delicate; see section 8.

## 4. Text rules for 7–8-year-olds

**What is known.** The evidence shows *which factors* make text harder (F10–F13). It does not give numerical limits for German 7–8-year-olds. All numbers below are therefore heuristics (H), chosen to be checkable by a unit test. Words are whitespace tokens; the symbols + − · : = □ do not count.

| # | Rule | Basis |
|---|---|---|
| T1 | Non-story tasks: at most 12 words. | H |
| T2 | Sachaufgaben: at most 20 words on Stufe 1, 25 on Stufe 2, 30 on Stufe 3. | H |
| T3 | At most 3 sentences, including the question. | H |
| T4 | At most 10 words per sentence (12 on Stufe 3). | H; sentence length [27] |
| T5 | No subordinate clauses: ban `weil, wenn, dass, obwohl, nachdem, während, damit, sodass` and relative clauses. | H; structure [27] |
| T6 | Present tense, active voice. Ban `wird/werden/wurde` + participle, `würde, hätte, wäre`, and the Genitiv where possible. | H |
| T7 | One question, always last. One idea per sentence, at most two numbers per sentence. | H |
| T8 | Everyday words only. Long words are the main risk: outside an allowlist (Zehnerstange, Hunderterfeld, Zahlenstrahl …) use words of at most 12 letters. | H; unfamiliar words [27] |
| T9 | No idioms and no double negatives. Repeat the noun instead of `sie`, `er`, `es` across sentences. | H |
| T10 | Digits for quantities, except in `zahlen.zahlwort`. Units written as in class: "3 € 40 ct", "2 m 15 cm". | N [2] |
| T11 | Fachwörter only from the Klasse-2 lists: plus, minus, mal, geteilt; Einer, Zehner; Ecke, Seite, Kante, Fläche; sicher, möglich, unmöglich. Not Summand, Differenz, Produkt, Quotient. | N [2][4] |
| T12 | Short names with regular spelling (Tom, Mia, Ali, Lea, Ben, Ida). Same few contexts: Schule, Pause, Spielplatz, Tiere, Einkaufen, Geburtstag. No brands or sensitive topics. | H; C13 in [42] |
| T13 | Do not let a keyword predict the operation: "mehr" also appears in subtraction stories. | E [27], F17 |
| T14 | Pictures show the story and repeat its numbers. No decoration in the task area. Answer-critical data appears only in a picture just in `sachaufgaben.bildaufgabe` and in diagrams. | E [28] |
| T15 | Hints: at most 12 words and 2 short sentences. Praise: at most 8 words. Worked steps: one line each, at most 3 steps on Stufe 1. | H |
| T16 | "Vorlesen" reads the whole task and hint. Number words must sound right ("vierunddreißig"); check this for each skill. | E small [31]; P12 in [42] |
| T17 | Print-style letters, no italics, no capitals-only words, no automatic hyphenation. | N for Druckschrift [4]; H otherwise |

**Heuristic checks to automate:** a test that runs T1–T5 on sampled generator output, and a word allowlist report for reading review with real children. LIX was considered and not used: we found no verified German norms for this age.

## 5. Typical misconceptions and bug hints

Basis: [n] means the pattern is documented in that source. **H** means it is a plausible pattern from our own didactic reasoning, with no source opened; check these in the pilot. A bug is matched only when the wrong answer computes exactly from the pattern; otherwise a generic step hint is used.

| Area | Bug | Wrong pattern | Hint | Basis |
|---|---|---|---|---|
| Zahlen | `zahlendreher` | Hears "vierunddreißig", gives 43 | Hör genau hin: Der Zehner steht vorne, der Einer hinten. | [10][16][17] |
| Zahlen | `zahlwort-ziffern` | "zweiundvierzig" as 402 or 240 | Eine Zahl bis 99 hat nur zwei Ziffern: Zehner, Einer. | [13] |
| Zahlen | `z-e-reihenfolge` | 7 E 3 Z gives 73 | Schau auf die Buchstaben: Z sind Zehner, E sind Einer. | H |
| Zahlen | `buendeln` | 2 Z 14 E gives 214 | 10 Einer sind 1 Zehner. Bündle zuerst. | H |
| Zahlen | `zaehlen-zehner` | After 39 says 30; before 40 says 49 | Nach 39 ist der Zehner voll. Es geht mit 40 weiter. | [10] |
| Zahlen | `strahl-null` | Off by one step, counting ticks from 1 | Der Zahlenstrahl beginnt bei 0. Zähle die Sprünge, nicht die Striche. | H, cf. [20] |
| Zahlen | `tafel-zeile` | One row down taken as +1 | Eine Zeile tiefer sind es 10 mehr. | H, cf. [19] |
| Zahlen | `vergleich-einer` | 29 > 31, comparing ones first | Schau zuerst auf die Zehner. | H |
| Zahlen | `vergleich-zeichen` | Swaps < and > | Die offene Seite zeigt zur größeren Zahl. | H |
| Plus und Minus | `zaehlen-eins-daneben` | 3 + 9 = 11, one too few | Fast! Rechne erst zur 10: 3 + 7, dann noch 2. | [12] |
| Plus und Minus | `zehner-vergessen` | 35 + 8 = 33; 38 + 27 = 55 | 5 + 8 ist mehr als 10. Der Zehner wird größer. | H, cf. [7] |
| Plus und Minus | `kleiner-von-groesser` | 43 − 7 = 44; 62 − 27 = 45 | 3 − 7 geht nicht. Rechne erst 43 − 3, dann weiter. | H, cf. L13 in [42] |
| Plus und Minus | `hilfsaufgabe-richtung` | 34 − 19 = 13 | 20 ist 1 zu viel. Gib die 1 wieder dazu. | [12] |
| Plus und Minus | `stelle-verwechselt` | 34 + 20 = 36; 64 + 3 = 94 | 3 sind Einer. Der Zehner bleibt gleich. | H, cf. [7] |
| Plus und Minus | `plus-minus-getauscht` | Adds instead of subtracting | Schau noch einmal auf das Rechenzeichen. | L13 in [42] |
| Plus und Minus | `platzhalter-summe` | 8 + □ = 15 gives 23 | Die ganze Seite ergibt 15. Wie viel fehlt bis 15? | H, cf. [34] |
| Plus und Minus | `gleichheit` | 3 + 7 = □ + 5 gives 10 or 15 | Beide Seiten sind gleich viel. Rechne links zuerst. | [34] |
| Plus und Minus | `halbieren-zehner` | Half of 30 gives 10 or 20 | 30 sind 20 und 10. Halbiere beide: 10 und 5. | H, cf. [7] |
| Einmaleins | `mal-als-plus` | 3 · 4 = 7 | 3 · 4 heißt 3-mal die 4: 4 + 4 + 4. | H, meaning [22] |
| Einmaleins | `ungleiche-gruppen` | Chooses Malaufgabe for unequal groups | Mal geht nur bei gleich großen Gruppen. | H |
| Einmaleins | `mal-zehn` | 7 · 10 = 17 or 710 | 7-mal die 10 sind 7 Zehner. | H |
| Einmaleins | `mal-null` | 5 · 0 = 5 | 5-mal gar nichts bleibt nichts. | H (Bayern scope) |
| Einmaleins | `nachbar-vergessen` | 6 · 4 = 20 | 5 · 4 sind 20. Bei 6 · 4 kommt noch eine 4. | H, derivation [9] |
| Einmaleins | `teilen-als-minus` | 20 : 5 = 15 | Teilen heißt: 20 in gleich große Gruppen legen. | H |
| Einmaleins | `rest-zu-gross` | 17 : 5 = 2 R 7 | Der Rest muss kleiner als 5 sein. | C6 in [42] |
| Einmaleins | `rest-vergessen` | 17 : 5 = 3 with no Rest | Prüfe: 3 · 5 sind 15. Bis 17 fehlen noch 2. | H |
| Größen | `muenzen-anzahl` | Counts coins, not value | Zähle nicht die Münzen. Zähle, was draufsteht. | [23][25] |
| Größen | `einheiten-gemischt` | Sum of all printed numbers, "44 Euro" | Zähle Euro und Cent getrennt: erst Euro, dann Cent. | [23] |
| Größen | `cent-euro-vergleich` | 50 ct taken as more than 5 € | 100 Cent sind 1 Euro. | H, cf. [23] |
| Größen | `rueckgeld-preis` | Paid 10 €, price 7 €, gives 7 | Wie viel fehlt von 7 € bis 10 €? | H, cf. [7] |
| Größen | `lineal-anfang` | Measures from the end of the ruler or from 1 | Lege den Anfang auf die 0, nicht auf die 1. | H |
| Größen | `lineal-ende` | Object from 3 to 9, gives 9 | Der Stift beginnt bei 3. Wie viele Zentimeter bis 9? | H |
| Größen | `m-cm` | 2 m = 20 cm; 2 m 5 cm = 25 cm | 2 m sind 200 cm. Dazu kommen 5 cm. | H |
| Größen | `halb-uhr` | "halb vier" as 4:30 | Halb vier heißt: noch eine halbe Stunde bis vier. | H; meaning [16] |
| Größen | `zeiger-getauscht` | Reads hour and minute hands swapped | Der kurze Zeiger zeigt die Stunde, der lange die Minuten. | H, cf. [26] |
| Größen | `viertel-richtung` | Viertel vor and nach swapped | Viertel nach 3 ist nach 3 Uhr. Viertel vor 3 ist davor. | H |
| Größen | `stunde-100` | 8:45 to 9:15 gives 70 min | Eine Stunde hat 60 Minuten, nicht 100. | H, cf. [13] (Zeit not decimal) |
| Größen | `zeitpunkt-spanne` | Gives 9 Uhr instead of 2 Stunden | Gefragt ist: Wie lange? Nicht: Wann? | H, cf. [6] |
| Geometrie | `lage-der-figur` | Rotated square not named Quadrat | Dreh das Bild im Kopf: Alle Seiten sind gleich lang. | H, cf. [5] |
| Geometrie | `quadrat-rechteck` | "Ein Quadrat ist kein Rechteck" | Ein Quadrat hat auch vier rechte Ecken. Es ist auch ein Rechteck. | H, cf. [2] |
| Geometrie | `kanten-verdeckt` | Counts only visible edges | Denk auch an die Kanten, die du nicht siehst. | H |
| Geometrie | `wuerfel-verdeckt` | Skips hidden cubes | Unter einem oberen Würfel steht noch einer. | H |
| Geometrie | `verschoben-statt-gespiegelt` | Copies instead of mirroring | Das Bild klappt um. Was links ist, kommt nach rechts. | H |
| Daten und Zufall | `strich-buendel` | Counts a five-bundle as 4 or 1 | Vier Striche und ein Querstrich sind zusammen 5. | H |
| Daten und Zufall | `achse-schritt` | Reads column height as count, step 2 | Schau an der Achse, wie viel ein Kästchen zählt. | H |
| Daten und Zufall | `bild-legende` | Counts pictures when 1 picture = 2 | Schau in die Legende: Ein Bild steht für 2 Kinder. | H |
| Daten und Zufall | `mehr-unterschied` | Gives the larger value for "wie viel mehr" | Gefragt ist der Unterschied: Wie viele sind es mehr? | [10] |
| Daten und Zufall | `kombi-addiert` | 2 T-Shirts, 3 Hosen gives 5 | Jedes T-Shirt passt zu jeder Hose. Geh alle Paare durch. | H, task [2] |
| Daten und Zufall | `sicher-haeufig` | "sicher" because most balls are red | Sicher heißt: Es kommt immer so. Gibt es auch andere Kugeln? | H |
| Sachaufgaben | `alle-zahlen` | Computes with all numbers regardless of the question | Schau: Passt diese Frage zu den Zahlen im Text? | [27] |
| Sachaufgaben | `signalwort` | "mehr", so adds | Stell dir die Geschichte vor. Wird es mehr oder weniger? | H, cf. [27] |
| Sachaufgaben | `unsinnig-gross` | Accepts an impossible result | Kann das stimmen? Denk an einen echten Einkauf. | H, cf. [2] |
| Sachaufgaben | `rest-sache` | 17 Kinder, 5 per car, gives 3 cars | Alle Kinder sollen mitfahren. Reichen 3 Autos? | L15 in [42] |

## 6. Skill catalogue

**Format.** S1, S2, S3 are Stufen; each cell is the content of that Stufe, and AB varies the demand inside it; each cell is at most 12 words. Numbers stay ≤ 100, except the centimetres in `groessen.meter-zentimeter` (2 m 15 cm = 215 cm) and cent sums in worked steps of `groessen.geld-betrag`. Answer types and visuals use the existing app vocabulary; **NEW** marks a visual from the list at the end of this section. **Basis** cites the Bayern Lernbereich (BY) and the NRW Lehrplan strand; "NRW not named" means the plan's text does not mention it at this level. **Status** is `core` or `opt` (optional = not required in all Länder checked). Skills appear in teaching order. Subsections are deliberately unnumbered: this section has no §6.4 (see 7.2).

### `zahlen` (Zahlen bis 100)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `zahlen.zaehlen` | Zählen | Du zählst vorwärts und rückwärts, auch in Schritten. | Count ±1 from start ≤ 89, crossing a ten | Steps of 2, 5, 10 from a multiple, ≤ 100 | Steps of 2, 5, 10, any start; find the step | multi | numberLine | BY 1.1; NRW Zahlverständnis | core |
| `zahlen.anzahl-erkennen` | Anzahlen erkennen | Du siehst Fünfer und Zehner und weißt, wie viele es sind. | ≤ 20 dots on Zwanzigerfeld | 21–100 dots on Hunderterfeld, full rows first | Split or rotated field; how many until 100 | number | field NEW | BY 1.1; NRW Zahlverständnis | core |
| `zahlen.zehner-einer` | Zehner und Einer | Du bündelst zu Zehnern und schreibst die Zahl. | Z/E table or sticks to number, 11–99 | Unordered 7 E 3 Z; numbers like 40 and 7 | Bundling: 2 Z 14 E = 34; split 32 = 30 + 2 | multi, number | placeValue, baseTen NEW | BY 1.1; NRW Zahlverständnis | core |
| `zahlen.zahlwort` | Zahlen lesen und hören | Du hörst oder liest ein Zahlwort und findest die Zahl. | Word to number 21–59, no look-alike options | Word to number ≤ 99, swapped digits among options | Number to word; Paschzahlen; spot the Zahlendreher | choice, number | placeValue | BY 1.1; NRW Zahlverständnis | core |
| `zahlen.vergleichen` | Größer oder kleiner | Du vergleichst Zahlen mit <, > und =. | Two numbers with different tens | Same tens; swapped pairs like 34 and 43 | Order 4–5 numbers; which number lies between | choice, order | placeValue | BY 1.1; NRW Zahlverständnis | core |
| `zahlen.nachbarn` | Nachbarzahlen | Du findest die Zahl davor und danach und die Nachbarzehner. | Vorgänger, Nachfolger within a ten | Across a ten (39, 40); Nachbarzehner of 47 | Number riddles from two neighbour clues | multi | numberLine | BY 1.1; NRW Zahlverständnis | core |
| `zahlen.zahlenstrahl` | Zahlenstrahl | Du liest und zeigst Zahlen am Zahlenstrahl. | Read arrow on 0–100, ticks every 10 | Place a number, ticks every 5, labels every 10 | Section 30–40 or empty 0–100 line, estimate | numberline | numberLine | BY 1.1; NRW representations, tool not named | core |
| `zahlen.hundertertafel` | Hundertertafel | Du findest dich auf der Hundertertafel zurecht. | Find a number; left and right neighbours | One row up or down, ±10; fill gaps | Cut-out pieces; find the wrong number in a piece | number, multi | hundredChart NEW | BY 1.1; NRW not named (PIKAS uses it) | opt |
| `zahlen.gerade-ungerade` | Gerade und ungerade | Du erkennst gerade und ungerade Zahlen. | Numbers ≤ 20 as dot pairs | Numbers ≤ 100 by looking at the ones | Stimmt das? Sums of two odd numbers ≤ 20 | choice | dotArray | BY 1.1; NRW not named | opt |

### `plusminus` (Plus und Minus)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `plusminus.zehner-voll` | Zehner voll machen | Du zerlegst Zahlen und ergänzt bis zum nächsten Zehner. | Number pairs to 10; complete to 20 | Complete to next ten: 37 + □ = 40 | Complete to 100 from a two-digit number | number | field NEW | BY 1.1; NRW Kopfrechnen | core |
| `plusminus.einspluseins` | Plus und Minus bis 20 | Du rechnest bis 20 und findest die Aufgaben im Kopf. | ≤ 20 without crossing 10; doubles | ≤ 20 crossing 10: 8 + 5, 13 − 6 | Missing number: □ + 7 = 15; choose matching easy task | number | field NEW | BY 1.2; NRW Kopfrechnen | core |
| `plusminus.grosse-aufgabe` | Kleine und große Aufgabe | Du nutzt 4 + 3, um 64 + 3 zu rechnen. | ZE ± E without crossing: 64 + 3 | Tens: 40 + 30, 90 − 50, 34 + 20 | Choose the matching small task; continue a pattern | number, choice | baseTen NEW | BY 1.2; NRW Zahlenrechnen | core |
| `plusminus.ueber-den-zehner` | Über den Zehner | Du rechnest erst zum Zehner und dann weiter. | ZE + E crossing, with steps: 35 + 5 + 3 | ZE − E crossing: 43 − 7 | Missing number: 35 + □ = 42; two steps in order | multi, number | numberLine | BY 1.2; NRW Zahlenrechnen; BB Niveau B | core |
| `plusminus.plus-bis-100` | Plus bis 100 | Du addierst zweistellige Zahlen. | ZE + ZE without crossing, sum ≤ 99 | ZE + ZE crossing, sum ≤ 100 | Missing number; Zahlenmauer with top ≤ 100 | number, multi | numberLine | BY 1.2; NRW Zahlenrechnen | core |
| `plusminus.minus-bis-100` | Minus bis 100 | Du subtrahierst zweistellige Zahlen. | ZE − ZE without crossing | ZE − ZE crossing: 62 − 27 | Missing number; Fehlerdetektiv with a planted error | number, choice | numberLine | BY 1.2; NRW Zahlenrechnen | core |
| `plusminus.geschickt` | Geschickt rechnen | Du nimmst eine Nachbarzahl und rechnest leichter. | + 9, + 11, − 9 via tens | + 19, + 29, − 19 via tens | Choose the easier way; gleichsinnig: 39 + 24 = 40 + 23 | number, choice | numberLine | BY 1.2; NRW Zahlenrechnen | core |
| `plusminus.aufgabenfamilie` | Aufgabenfamilien | Drei Zahlen, vier Aufgaben: Du prüfst mit der Umkehraufgabe. | Family ≤ 20: 5 + 3 = 8, 8 − 3 = □ | Family with numbers ≤ 100 | Check with Umkehraufgabe; 3 + 7 = □ + 5 | multi, choice | field NEW | BY 1.2; NRW Operationsverständnis; BB Niveau B | core |
| `plusminus.verdoppeln-halbieren` | Verdoppeln und Halbieren | Du rechnest das Doppelte und die Hälfte. | Double to 10; half of even numbers ≤ 20 | Double to 50; half of even numbers ≤ 100 | Half of 30, 50, 70, 90; double plus one | number | dotArray | NRW Kopfrechnen; BW 3.1.1.1; BY not named | core |

### `einmaleins` (Einmaleins: Malnehmen und Teilen)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `einmaleins.mal-verstehen` | Malaufgaben verstehen | Du siehst gleich große Gruppen und schreibst eine Malaufgabe. | Equal groups, factors ≤ 5: 3 · 4 = 4 + 4 + 4 | Dot array to Malaufgabe, factors ≤ 10 | Which picture does not fit; story to Malaufgabe | choice, number | dotArray | BY 1.2; NRW Operationsverständnis | core |
| `einmaleins.tausch` | Tauschaufgaben | Du tauschst die Zahlen und das Ergebnis bleibt gleich. | Turned array: 3 · 5 = 5 · 3, factors ≤ 5 | □ · 4 = 4 · 7, factors ≤ 10 | Stimmt das? Compare swaps for mal and minus | number, choice | dotArray | BY 1.2; NRW Operationsverständnis | core |
| `einmaleins.mal-1-2-10` | Mal 1, 2 und 10 | Du merkst dir die Aufgaben mit 1, 2 und 10. | · 10 and · 1, factors 1–10 | · 2 as doubling, factors 1–10 | Missing factor: □ · 2 = 14; · 0 (Bayern) | number | dotArray | BY 1.2; NRW Kopfrechnen | core |
| `einmaleins.mal-5` | Mal 5 | Du rechnest mal 5 als Hälfte von mal 10. | 1–5 · 5 | 6–10 · 5 via half of · 10 | Missing factor: □ · 5 = 35 | number | dotArray | BY 1.2; NRW Kopfrechnen | core |
| `einmaleins.einmaleins` | Kernaufgaben üben | Du übst die Aufgaben mit 1, 2, 5 und 10. | Malaufgaben with the 40 Kern facts, picked by the fact trainer (7.1), never row by row | Missing factor in a Kern fact: □ · 2 = 14 | Geteiltaufgabe from a Kern fact; which Malaufgabe has this result | number, choice | dotArray | BY 1.2; NRW Kopfrechnen; F5, 7.1 | core |
| `einmaleins.quadrate` | Quadrataufgaben | Du merkst dir Aufgaben mit zwei gleichen Zahlen. | Squares to 5 · 5 | Squares to 10 · 10 | Neighbour of a square: 6 · 7 from 6 · 6 | number | dotArray | BY 1.2; NRW not named (PIKAS uses them) | opt |
| `einmaleins.ableiten` | Aufgaben ableiten | Du nutzt eine leichte Aufgabe für eine schwere. | One more or less: 6 · 4 from 5 · 4 | From · 10: 9 · 8; doubling: 4 · 7 from 2 · 7 | Split: 7 · 6 = 5 · 6 + 2 · 6; choose route | multi, number | dotArray | BY 1.2; NRW Kopfrechnen | core |
| `einmaleins.teilen-verstehen` | Teilen verstehen | Du teilst gerecht auf und verteilst an Gruppen. | Dividend ≤ 20, exact, with picture | Dividend ≤ 50 by 2, 5, 10; both meanings | Story to Geteiltaufgabe; which picture fits | number, choice | dotArray | BY 1.2; NRW Operationsverständnis | core |
| `einmaleins.umkehren` | Mal und Geteilt | Du findest zur Malaufgabe die Geteiltaufgabe. | 2 · 7 = 14, so 14 : 2 = □ | Divisors 1, 2, 5, 10, dividend ≤ 100 | Family of four; divisor from a square (Bayern) | number, multi | dotArray | BY 1.2; NRW Operationsverständnis | core |
| `einmaleins.teilen-rest` | Teilen mit Rest | Du teilst und schaust, was übrig bleibt. | Dividend ≤ 20, divisor 2–5, with picture | Dividend ≤ 50, divisors 2, 5, 10 | Story: what does the Rest mean | multi | dotArray | BY 1.2; BW 3.1.1.2; NRW not named | opt |

### `groessen` (Geld, Längen, Zeit)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `groessen.geld-kennen` | Münzen und Scheine | Du kennst unser Geld und ordnest es nach dem Wert. | Name and order coins 1 ct to 2 € | Notes 5–100 €; coins and notes mixed | More coins, more money? Compare two small collections | choice, order | money | BY 3.1, 3.2; NRW Größen | core |
| `groessen.geld-betrag` | Wie viel Geld? | Du zählst den Wert von Münzen und Scheinen. | Only ct or only €, ≤ 20, sorted | One unit, ≤ 100, unsorted | Euro and Cent mixed: 3 € 40 ct | number, multi | money | BY 3.1; NRW Größen | core |
| `groessen.geld-wechseln` | Geld wechseln | Du legst denselben Betrag mit anderen Münzen. | 10 ct as two equal coins; 1 € as two coins | Fewest coins or notes for ≤ 20 € | Find all ways for a small amount | choice, multi | money | BY 3.2; NRW Größen | core |
| `groessen.einkaufen` | Einkaufen und Rückgeld | Du rechnest Preise zusammen und findest das Rückgeld. | Add two whole-euro prices, sum ≤ 20 € | Rückgeld from 10 € or 20 € | Cent prices ≤ 100 ct; enough money for three items? | number, choice | money | BY 3.3; NRW Größen | core |
| `groessen.lineal` | Mit dem Lineal messen | Du misst Längen in Zentimetern. | Object starts at 0, whole cm ≤ 15 | Object starts at other mark, whole cm ≤ 20 | Compare two measured lengths; broken ruler | number | ruler | BY 3.1; NRW Größen | core |
| `groessen.meter-zentimeter` | Meter und Zentimeter | Du weißt, wie lang 1 cm und 1 m sind. | Choose cm or m for known objects | 1 m = 100 cm; 2 m 15 cm = 215 cm | Order mixed lengths; plausible height for a door | choice, number, order | ruler | BY 3.1, 3.2; NRW Größen | core |
| `groessen.uhr` | Uhrzeiten lesen | Du liest die Uhr bei vollen und halben Stunden. | Full and half hours, analog beside digital | Viertel nach, Viertel vor, analog only | Five-minute steps; pick the clock for a time | choice, multi | clock | BY 3.1; NRW Größen | core |
| `groessen.zeitspannen` | Wie lange dauert das? | Du rechnest aus, wie viel Zeit vergeht. | Whole hours: drei Stunden später | Half and quarter hours; 1 h = 60 min | Span across a full hour, ≤ 60 min; backwards | number, multi | clock | BY 3.1; NRW Größen | core |
| `groessen.kalender` | Tage, Wochen, Monate | Du kennst den Kalender und findest Tage darin. | Weekday order; 7 days in a week | Month order; read a month sheet | Spans in days within one month | choice, number | table | BY 3.1, 4.1; NRW Größen, Daten | core |

### `geometrie`

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `geometrie.lage` | Wo ist was? | Du sagst, was links, rechts, oben oder unten ist. | Single position words in a 3 × 3 grid | Relative: links von, zwischen; two clues | Follow a 3-step path; view from the other side | choice | grid | BY 2.1; NRW Raumorientierung | core |
| `geometrie.formen` | Flächenformen | Du erkennst Quadrat, Rechteck, Dreieck und Kreis. | Name four shapes in usual position | Rotated or thin shapes; count Ecken and Seiten | Quadrat is also a Rechteck; odd one out | choice, number | shape | BY 2.2; NRW Ebene Figuren | core |
| `geometrie.koerper` | Körper | Du erkennst Würfel, Quader und Kugel. | Würfel, Kugel, Quader; rolls or tips | Ecken, Kanten, Flächen of Würfel and Quader | Zylinder, Kegel, Pyramide, Prisma (Bayern only) | choice, number | solid | BY 2.2; NRW Körper | core |
| `geometrie.symmetrie` | Spiegeln und Falten | Du prüfst, ob beide Hälften beim Falten gleich sind. | Vertical axis: symmetric, yes or no | Where is the axis; horizontal axis too | Complete a mirror image on a 4 × 6 grid | choice, cells | shape, grid | BY 2.3; NRW Symmetrie | core |
| `geometrie.muster` | Muster fortsetzen | Du findest die Regel und setzt das Muster fort. | Repeat AB or ABC with shapes | Two features change, such as shape and colour | Find the wrong piece; continue a growing pattern | choice, cells | shape, grid | BY 2.4; NRW Ebene Figuren | core |
| `geometrie.wuerfelgebaeude` | Würfel bauen | Du zählst Würfel und baust nach Plan. | Count cubes, ≤ 6, none hidden | ≤ 10 with hidden cubes; building to Bauplan | Match view from front or side | number, choice | cubeBuilding | BY 2.1, 2.4; NRW Körper | core |
| `geometrie.flaechen` | Flächen vergleichen | Du legst mit Kästchen aus und vergleichst. | Count Kästchen of a rectangle, ≤ 12 | Which figure is larger, ≤ 20 Kästchen | Compare perimeter on the grid (Bayern) | number, choice | grid | BY 2.5; NRW Kl. 4 only | opt |

### `daten` (Daten und Zufall)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `daten.strichliste` | Strichlisten | Du liest Strichlisten und machst selbst Striche. | Read tally ≤ 20, five-bundles | Count a picture into tally, ≤ 30 | Compare rows; totals ≤ 50; find a miscounted row | number, multi | tally | BY 4.1; NRW Daten | core |
| `daten.tabelle` | Tabellen | Du findest Zahlen in einer Tabelle. | One value, 3 rows, ≤ 20 | Compare or subtract, 4–5 rows, ≤ 50 | Which question can the table not answer? | number, choice | table | BY 4.1; NRW Daten | core |
| `daten.bilddiagramm` | Bilddiagramme | Du liest ab, was die Bilder zeigen. | 1 picture = 1, values ≤ 10 | Most, fewest, difference, values ≤ 10 | 1 picture = 2, values ≤ 20 (Knobel) | number, choice | pictogram | BY 4.1; NRW Daten | core |
| `daten.saeulen` | Säulendiagramme | Du liest Säulen ab und vergleichst sie. | Read value, axis step 1, ≤ 10 | Difference, total, highest, ≤ 20 | Axis step 2 or 5, ≤ 50; table to chart | number, choice | barChart | BY 4.1; NRW Daten; BB Niveau B | core |
| `daten.kombinieren` | Wie viele Möglichkeiten? | Du findest alle Möglichkeiten und zählst sie. | 2 × 2 pairs with pictures | 2 × 3 pairs: T-Shirts and Hosen | 3 × 3 pairs; orders of 3 things | number, choice | table | BY 1.3; NRW Wahrscheinlichkeiten | core |
| `daten.sicher-moeglich` | Sicher, möglich, unmöglich | Du sagst, ob etwas sicher, möglich oder unmöglich ist. | Bag with 1 or 2 colours | Würfel, Münze, Glücksrad | Choose the fitting bag; wahrscheinlich, unwahrscheinlich (BY, NRW) | choice | bag, spinner, dice | BY 4.2; NRW Wahrscheinlichkeiten | core |
| `daten.chancen` | Wo sind die Chancen größer? | Du vergleichst zwei Säckchen oder Glücksräder. | Same total, more red in which bag | Spinners with equal sectors, compare by count | Add balls so red becomes sicher or unmöglich | choice | bag, spinner | BY 4.2; NRW not named | opt |

### `sachaufgaben`

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `sachaufgaben.bildaufgabe` | Bildaufgaben | Du schaust das Bild an und beantwortest die Frage. | Picture, one question, plus or minus ≤ 20 | One sentence and picture, ≤ 100 | Picture with something not needed | number | pictogram, money | BY 1.3; NRW Sachsituationen | core |
| `sachaufgaben.rechnung-finden` | Welche Rechnung passt? | Du findest die Rechnung oder Frage zur Geschichte. | Dazu oder weg, ≤ 20, two options | Vereinigen and Ergänzen, ≤ 100, keyword varied | All four operations; which question fits the story | choice | none | BY 1.2, 1.3; NRW Operationsverständnis | core |
| `sachaufgaben.plus-minus` | Geschichten: Plus und Minus | Du löst Geschichten mit einer Rechnung. | Result unknown, ≤ 20 | Result unknown, ≤ 100, crossing a ten | Start or change unknown, ≤ 100 | number | numberLine | BY 1.3; NRW Sachsituationen | core |
| `sachaufgaben.vergleichen` | Wie viel mehr? | Du findest den Unterschied zwischen zwei Zahlen. | Difference with picture, ≤ 20 | "7 mehr als", ≤ 100 | Reverse: Tom has 12, 5 more than Mia | number | pictogram | BY 1.2; NRW Operationsverständnis | core |
| `sachaufgaben.mal-teilen` | Geschichten: Mal und Geteilt | Du löst Geschichten mit gleich großen Gruppen. | Equal groups with Kernaufgaben, ≤ 50, picture | Aufteilen and Verteilen, Kern divisors, ≤ 100 | Which operation; Rest meaning only where enabled | number, choice | dotArray | BY 1.3; NRW Sachsituationen | core |
| `sachaufgaben.mit-groessen` | Geschichten: Geld, Länge, Zeit | Du rechnest mit Euro, Metern oder Stunden. | Whole euros, ≤ 20 € | cm or m, ≤ 100; Rückgeld from 20 € | Whole hours and days; one mixed-unit step | number | money, ruler, clock | BY 3.3; NRW Größen | core |
| `sachaufgaben.frage-pruefen` | Passt das? | Du prüfst, ob die Antwort oder die Frage Sinn ergibt. | Is the price or length plausible? | One number in the story is not needed | Missing information: Nicht lösbar; Kapitänsaufgabe | choice, number | none | BY 3.3; NRW Sachsituationen | core |
| `sachaufgaben.zwei-schritte` | Zwei Schritte | Du rechnest zwei Schritte nacheinander. | Two additions, ≤ 20 (Knobel) | Plus then minus, ≤ 100 (Knobel) | Buy two items, then Rückgeld (Knobel) | multi, number | money | Beyond "einfach"; BW Knobelaufgaben | opt |

### New visuals needed

| Visual | Purpose | Sources |
|---|---|---|
| `field` | Zwanzigerfeld and Hunderterfeld: 5/10 structure, filled dots, optional split | [2][11] |
| `baseTen` | Zehnerstangen and Einerwürfel | [2][11][21] |
| `hundredChart` | Hundertertafel with masked cells, highlighted row or column, cut-out pieces | [2][19] |

Two extensions of existing visuals: `numberLine` needs **jump arcs** (Rechenstrich-style steps, for hints and worked solutions) [6][7], and `dotArray` needs **repeated splits or groups** (3 groups of 4, or a split for derivation) [9]. The existing `tree` and `net` visuals are not needed in Klasse 2.

## 7. Design consequences compared with the Klasse 4 portal

### 7.1 What stays and what changes

| Area | Klasse 4 | Klasse 2 | Why |
|---|---|---|---|
| Core loop, hints | §6.1 in [42]: answer, hint, second try, worked steps, Zwillingsaufgabe | Stays. Worked steps at most 3 lines on Stufe 1. | L4, L6, F7 |
| Timers | None by default; optional Blitzrunde | None. **No Blitzrunde in v1.** The curriculum asks automatisation of a small set, and we found no reason to add pressure. | F8; [8] itself warns against extra pressure in its timed check |
| Silent response time | About 3 s keeps a fact in review | **Do not use at launch**, or raise to 5 s after a pilot; keypad use and reading are slower. | H |
| Stufen | 3, default suggestion Stufe 2 | 3, **default suggestion Stufe 1** for a new skill, as content may be new this school year. | H; 2.3 |
| Mastery | Geübt, Sicher (≥ 8 of last 10 first try), Gemeistert | Stays, including the spaced check. | L8 (heuristic) |
| Default input | Free numeric; Ziffernblock on touch | **Keypad first on every device**, physical keyboard still works. Keys 0–9, ⌫, Prüfen; **no comma key**. | F14; 2.4 |
| Touch | 64 px primary, 48 px others | **72 px keypad and answers**, 56 px others, hit areas to gaps and screen edges. | F14; H for the numbers |
| Choice items | Up to 8 options | At most 4 on Stufe 1–2, 6 on Stufe 3. `order` at most 5 items; `multi` at most 3 fields. | H |
| Order and drag | Tap and keyboard alternatives | Tap to swap or place only. | F14; P17 |
| Text | Sachaufgaben 3–4 lines | Section 4. **Antwortsatz via `before`/`after`** text around a number field; no word chips. | F10; H |
| Font | 20 px body, 60ch | **22–24 px body, at most 45ch**, task expression at least 2.5rem. | F13; H for the numbers |
| Read-aloud | Optional button, local voices only | **Button visible in every task** when a local German voice exists, never autoplay, hidden otherwise. | F11; P12 |
| Warm-up | 3–5 items, 8 reviews per day | 3 items, **5 reviews per day**. | H; F9 |
| Break prompt | After 20 min | After **15 min**. | H; F9 |
| Fehlerdetektiv | Stufe 3 or after Sicher | Stays, for example in `plusminus.minus-bis-100` and `daten.strichliste`. | L6; curricula [2][5] |
| Einmaleins | All 100 facts | 40 Kern facts tracked, 6 optional squares. Other facts appear only as derivation tasks. | 2.2 |
| Länder options | NRW extras | Optional skills are marked "Extra" and never count toward topic progress. Default visible. The adult page explains Länder differences. | 2.3 |
| Worksheets, adult page, phrase rotation, badges | Per [42] | Stay, with Klasse-2 wording. | M7, M14 |
| Privacy, security, performance | P1–P6, P14–P15 | No change. Storage key `mathe2.v1`. | Section 3 |

### 7.2 Banned patterns (equivalent of Klasse 4 §6.4)

**This section is what code, tests and reviews mean when they cite "docs/research.md §6.4".** It is part of code review. The list is copied from [42] §6.4; Radesky et al. [46] show why it is needed.

- Praise for traits or speed, and superlatives (see M15 in 7.4).
- "Falsch!", "Leider falsch.", "Schon wieder falsch.", "Das war doch einfach!", "Konzentrier dich!", "Alle anderen schaffen das."
- A red X, a buzzer, alarm red for errors, or feedback shown by colour alone.
- Timers or countdowns by default, and "Zu langsam!" or "Schneller!".
- Leaderboards, rankings, percentiles or participation badges.
- Currency, a shop, loot or mystery boxes, random bonus stars, or rewards announced before a task.
- Consecutive-day streaks, and messages about losing anything ("Serie verloren", "0 Tage").
- Push notifications, reminders or e-mail.
- A mascot that guilt-trips on exit, a hidden or delayed exit button, autoplay into the next round, or pop-ups during a round.
- Any third-party request: fonts, CDNs, analytics, embeds or external images.
- Storage writes before opt-in, and cookies.
- Free-text inputs and fields for personal data.
- `type="number"` inputs, and drag-only interactions.

Added for Klasse 2: reciting rows as a task format; a "count again" hint. Accessibility targets stay at WCAG 2.2 AA plus the Klasse-4 AAA criteria [41].

### 7.3 Round length: recommendation

**Default 8 items (target about 8–10 minutes), a heuristic.** Reasoning: Klasse 4 uses 10 items for about 10–15 minutes; attention and tolerance for load are still developing at this age [35]; reading and keypad are slower; a 30-minute homework frame [36] should not be filled by one tool; about three short sessions reach the lower end of the 30–75 minutes a week linked to better results (L10). We found no experiment on round length for 7–8-year-olds, and the time estimate is our own. Measure it in the pilot.

The Klasse-4 AB rule scales to 8 items: **Stufe 1: 5/2/1, Stufe 2: 3/3/2, Stufe 3: 2/4/2** (AB I/II/III). "At least one harder item per round" stays [1]. The 3-item Einstiegs-Check counts inside the round.

### 7.4 M15 phrase bank (Klasse 2 wording)

Same rules as M15 in [42], which code and tests cite as "M15". Use short forms and name the action.

| Situation | Use (rotate) | Never use |
|---|---|---|
| Correct | "Richtig! Du bist erst zum Zehner gegangen." · "Stimmt! Du hast die Zehner zuerst angeschaut." · "Richtig! Du hast die Münzen sortiert." | "Du bist so schlau!" · "Du bist ein Mathe-Genie!" · "Du bist ein Naturtalent!" · "Du warst so schnell!" · "PERFEKT!" · "Unglaublich!" · "Fantastisch!" · "Weltklasse!" |
| 1st wrong attempt | "Noch nicht ganz. Probier es noch einmal." · "Fast! Schau noch einmal auf die Zehner." | "Falsch!" · "Leider falsch." · "Konzentrier dich!" |
| 2nd wrong attempt | "Schauen wir es zusammen an." · "So kannst du rechnen: …" | "Schon wieder falsch." · "Das war doch einfach!" · "Alle anderen schaffen das." |
| Normalising (at most once per session) | "Fehler helfen beim Lernen." · "Das lernst du gerade." | "Dein Gehirn wächst bei jedem Fehler." |
| Round summary | "6 von 8 geschafft. 2 Aufgaben waren noch knifflig." | "2 Fehler!" · "Nicht bestanden" |
| Improvement (M16) | "Über den Zehner, Stufe 1: Am Anfang 3 von 10 auf Anhieb, jetzt 8 von 10." Words-only variant: "Das hat vor ein paar Tagen noch nicht geklappt. Heute schon." | "Endlich!" · "Na also!" · "Viel besser!" · "Besser als die anderen" · "Jetzt machst du keine Fehler mehr" |
| Speed | (nothing) | "Zu langsam!" · "Schneller!" |
| Leaving or a break | "Schön, dass du geübt hast. Bis bald!" · "Gute Idee, eine Pause zu machen!" | "Willst du wirklich aufhören?" · "Dein Freund ist traurig, wenn du gehst." |
| Status labels | "Geübt" → "Sicher" → "Gemeistert" (1–3 stars with a legend) | "Serie verloren" · "Deine Serie ist in Gefahr!" · "0 Tage" |

## 8. Limitations and open questions

**Could not be verified**

- **No verified words-per-minute norm for the end of Klasse 2.** Numbers found (60–85) came from parent-advice and unrelated sites, so we did not use them. Rosebrock and Nix's guide value of about 100 words per minute is general and seen only in a summary [30]. Published test norms (e.g. ELFE, SLRT) were not opened.
- **Sources not opened**, so not relied on: Zuber et al. 2009 (only via [17][18]); Burny, Valcke & Desoete on clock reading (search summaries only); Berends & van Lieshout 2009 and the follow-up with 7–9-year-olds on illustrations (publisher blocked); Schutte et al. 2015 on distributed fact practice (publisher blocked); a Bamberg study on strategy use across Klasse 2 and a Bamberg text on the ruler zero point (repository restricted to the university network); ISB Bayern newsletter 2017/03 on the Einmaleins (404).
- **Bugs marked H have no source showing them as Klasse-2 errors.** That includes the ruler errors, clock errors and 3 · 4 = 7. Their frequency is unknown.
- **Carried-over figures** ([33][43][44][45][46][48][49]): URLs re-checked on 2026-11-03; the figures rely on the fact-check in [42]. Bayern 3/4 scope is also taken from [42].

**Weak spots in the evidence**

- Nearly all feedback and retrieval evidence comes from older learners. F7 used verification feedback and one concept. Whether two-stage hints help 7–8-year-olds in this form is untested.
- F3, F15 and F16 rest on single, small or old studies. F9's attention finding is from an abstract and does not translate into a number of items.
- All numeric limits in section 4 and all thresholds in 7.1 and 7.3 are heuristics. A pilot with a few children should check: time per item, reading trouble by word, use of Vorlesen, whether 8 items feel long, and keypad error rate at 72 px.

**Curriculum questions**

- Only four Länder were read. Others may differ.
- BE-BB's plan was read in a copy hosted by a school [6]; the official LISUM file was not opened. BW's Bildungsplan pages [5] were open, but a BW document on current plan reform could not be opened, so we do not know if a new plan is coming. The BW sample curricula at schule-bw.de returned a shutdown notice.
- The NRW combinatorics and probability expectations are read as Klasse 2 only through the unsplit-column rule [4, p. 85]. A teacher should confirm this.
- Square facts are `opt` under our rule, though PIKAS and Bayern treat them as useful. Teachers may prefer them as core.
- The order of topics within a school year varies with the textbook. There are no locks, but a suggestion may frustrate a child who has not met a topic. Consider a topic note: "Noch nicht in der Schule? Das ist okay."

**Legal question**

The Klasse-4 storage opt-in addresses the child (P1). A 7-year-old may not understand the question. Consider adding "Frag einen Erwachsenen" to the prompt, with read-aloud support. This does not change the analysis that no personal data is collected, but it should be part of the legal review before launch.

**Code note**

Source comments in this repository cite IDs such as L8, M16 or P13. These live in [42]; only §6.4 and M15 are restated here (7.2, 7.4).

## 9. Sources

All accessed 2026-11-03. Sources were opened unless marked. *Abstract* or *summary* means only that part was seen. *Carried over* means checked in [42]; here only the URL was re-checked.

1. KMK (2022). Bildungsstandards für das Fach Mathematik Primarbereich (Beschluss vom 15.10.2004, i. d. F. vom 23.06.2022). https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2022/2022_06_23-Bista-Primarbereich-Mathe.pdf
2. ISB Bayern. LehrplanPLUS Grundschule, Mathematik 1/2, Fachlehrplan. https://www.lehrplanplus.bayern.de/fachlehrplan/grundschule/1/mathematik
3. ISB Bayern. LehrplanPLUS, Jahrgangsstufenprofil Grundschule, Jgst. 2. https://www.lehrplanplus.bayern.de/jahrgangsstufenprofil/grundschule/2
4. MSB NRW (2021). Lehrpläne für die Primarstufe (Sammelband; Mathematik from p. 72, Deutsch "Lesen" pp. 23–24). https://lehrplannavigator.nrw.de/system/files/media/document/file/ps_lp_sammelband_2021_08_02.pdf
5. Baden-Württemberg (2016). Bildungsplan Grundschule, Mathematik, Klassen 1/2, sections 3.1.1.1–3.1.4.2. https://www.bildungsplaene-bw.de/,Lde/BP2016BW_ALLG_GS_M_IK_1-2_01_01 (same pattern for `_01_02`, `_01_03`, `_02_01`, `_02_02`, `_02_03`, `_03_01`, `_03_02`, `_04_01`, `_04_02`)
6. LISUM (2023). Rahmenlehrplan Berlin-Brandenburg, Teil C Mathematik, Jg. 1–10 (copy hosted by a school). https://hcg-berlin.de/wp-content/uploads/rahmenlehrplan-teil-c_mathe-1-10.pdf
7. LISUM (2023). Planungshilfe für einen kompetenzorientierten Mathematikunterricht, Jahrgangsstufe 2. https://bildungsserver.berlin-brandenburg.de/fileadmin/bbb/unterricht/faecher/naturwissenschaften/mathematik/Planungshilfen_kompetenzorientierter_Unterricht/Grundschule/Jahrgangsstufe_2_Planungshilfe_fuer_den_MU.pdf
8. PIKAS (2021). Handreichung zur Standortbestimmung: Schnelles Kopfrechnen, Sicher im 1·1 (2./3. Schuljahr). https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/diagnose_und_foerderung/klasse2/handreichung_jg2_schnelles_kopfrechnen_1x1.pdf
9. PIKAS (2010). 1·1 richtig üben, Basisinfos. https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/Haus_3_-_Umgang_mit_Rechenschwierigkeiten/UM/1x1_richtig_ueben/Basisinfos/basisinfos_1x1_ueben.pdf
10. PIKAS. Handreichung zur Standortbestimmung Schuljahresanfang Klasse 2. https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/diagnose_und_foerderung/klasse2/dif_zr100_schuljahresanfang_hr.pdf
11. PIKAS (2021). Handreichung zur Standortbestimmung: Zahlen darstellen (2. Schuljahr). https://pikas.dzlm.de/pikasfiles/uploads/handreichung_jg2_zahlen_darstellen_21.05.2021.pdf
12. DZLM (2022). Ablösung vom verfestigten zählenden Rechnen, Fortbildungsmaterial (includes the Gaidoschik 2010 strategy-type data, N = 139). https://maco.dzlm.de/sites/maco/files/material-lul/dzlm_maco_prim_ablzaehlendrechnen_221109.pdf
13. DZLM (2022). Stellenwertverständnis, Fortbildungsmaterial. https://maco.dzlm.de/sites/maco/files/material-lul/dzlm_maco_prim_stellenwert_220712.pdf
14. Häsel-Weide, U. (2012). Ablösung vom zählenden Rechnen: Struktur-fokussierende Deutungen. Beiträge zum Mathematikunterricht. https://wwwold.mathematik.tu-dortmund.de/ieem/bzmu2012/files/BzMU12_0084_Haesel-Weide.pdf
15. Rechtsteiner, C., & Scheffknecht, M. (2023). Die Schulung des Zahlenblicks bei der Ablösung vom Zählen. *mathematica didactica, 46*. https://journals.ub.uni-koeln.de/index.php/mathematica_didactica/article/download/1674/1722/4773
16. Rottmann, T., & Ransiek, M. L. (2025). Zum Stellenwertverständnis deutscher und dänischer Zweitklässler*innen. Beiträge zum Mathematikunterricht 2025. https://eldorado.tu-dortmund.de/bitstreams/fd86b194-54dd-4170-a1e2-9a70af1e102e/download
17. Steiner, A. F., Finke, S., Clayton, F. J., Banfi, C., Kemény, F., Göbel, S. M., & Landerl, K. (2021). Language effects in early development of number writing and reading. *Journal of Numerical Cognition.* *Abstract.* https://jnc.psychopen.eu/index.php/jnc/article/view/6929
18. Imbo, I., Vanden Bulcke, C., De Brauwer, J., & Fias, W. (2014). Sixty-four or four-and-sixty? *Frontiers in Psychology, 5*, 313. https://www.frontiersin.org/articles/10.3389/fpsyg.2014.00313/pdf
19. PIKAS kompakt (2021). Zahlraumerweiterung: Hundertertafel. https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/unterricht_neu/zahlen_und_operationen/zr_100/zahlen_ordnen/unterricht_zr100_zahlenordnen_hundertertafel.pdf
20. DZLM, Mathe sicher können. N2 A: Zahlen am Zahlenstrahl lesen und darstellen, didaktischer Hintergrund. https://mathe-sicher-koennen.dzlm.de/mskfiles/uploads/Dokumente/mskgs_n2a_1_hru_n2_a_131009.pdf
21. da Costa Silva, N., Geldermann, L., & Rolka, K. (2023). Stellenwerte üben: Darstellungen vernetzen (Zahlen bis 100). https://maco.dzlm.de/sites/maco/files/material-lul/dzlm_difprim_stellenwert_darstellungsvernetzung_um_100_240412.pdf
22. PIKAS (2021). Operationsverständnis Multiplikation, Klasse 2 (Lernen auf Distanz). https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/lernen-auf-distanz/lad-mathematische-themen-klasse-2-multiplikation.pdf
23. Grassmann, M., Klunter, M., Köhler, E., Mirwald, E., Raudies, M., & Thiel, O. (2008). Kinder wissen viel – auch über die Größe Geld? Teil 3. Potsdamer Studien zur Grundschulforschung 34. https://publishup.uni-potsdam.de/files/1523/psgsf34.pdf
24. PIKAS, Mathe inklusiv (2016). Lege anders. https://pikas-mi.dzlm.de/pikasmifiles/uploads/Dokumente/Download%20Text%20Aufgabenstellung%20kompakt%20Lege%20anders.pdf
25. PIKAS, Mathe inklusiv. Größenvorstellungen im Bereich Geldwerte, Hintergrund. https://pikas-mi.dzlm.de/download/file/fid/3533
26. Rothera, S. A. (1989). An examination of how children read the time. Masters thesis, Durham University. *Abstract.* https://etheses.durham.ac.uk/id/eprint/6561
27. Daroczy, G., Wolska, M., Meurers, W. D., & Nuerk, H.-C. (2015). Word problems: a review of linguistic and numerical factors contributing to their difficulty. *Frontiers in Psychology, 6*, 348. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.00348/pdf
28. Vessonen, T., Hellstrand, H., Aunio, P., & Laine, A. (2026). Pictures in mathematical word problems: A systematic review on the role of task and student characteristics. *Educational Psychology Review, 38*(1). *Abstract.* https://research.abo.fi/en/publications/pictures-in-mathematical-word-problems-a-systematic-review-on-the/
29. Müller, B., Križan, A., Hecht, T., Richter, T., & Ennemoser, M. (2013). Leseflüssigkeit im Grundschulalter. *Lernen und Lernstörungen* (accepted manuscript). https://www.psychologie.uni-wuerzburg.de/fileadmin/06020400/user_upload/Richter/Mueller_et_al_2013.pdf
30. Lautleseprotokoll (description of Rosebrock, Nix, Rieckmann & Gold, *Leseflüssigkeit fördern*). *Summary.* https://sprachelesen.vobs.at/fileadmin/material/leseroute/diagnose/Lautleseprotokoll.pdf
31. Buzick, H., & Stone, E. (2014). A meta-analysis of research on the read aloud accommodation. *Educational Measurement: Issues and Practice, 33*(3), 17–30. *Summary* (ASHA Evidence Maps). https://apps.asha.org/EvidenceMaps/Articles/ArticleSummary/527e5ed2-1fd9-4abb-97fe-a9e7f93978d9
32. Katzir, T., Hershko, S., & Halamish, V. (2013). The effect of font size on reading comprehension on second and fifth grade children. *PLoS ONE, 8*(9), e74061. *Abstract.* https://pmc.ncbi.nlm.nih.gov/articles/PMC3777945/
33. Wilkins, A., Cleave, R., Grayson, N., & Wilson, L. (2009). Typography for children may be inappropriately designed. *Journal of Research in Reading, 32*(4). *Carried over.* https://repository.essex.ac.uk/1476/
34. Fyfe, E. R., & Rittle-Johnson, B. (2015). Feedback both helps and hinders learning: The causal role of prior knowledge. *Journal of Educational Psychology.* https://news.vanderbilt.edu/files/FyfeRittleJohnson2015_JEP.pdf
35. Betts, J., McKay, J., Maruff, P., & Anderson, V. (2006). The development of sustained attention in children. *Child Neuropsychology, 12*, 205–221. *Abstract.* https://www.cogstate.com/publication/the-development-of-sustained-attention-in-children-the-effect-of-age-and-task-load/
36. Ministerium für Schule und Bildung NRW. Hausaufgaben. https://www.schulministerium.nrw/hausaufgaben
37. Anthony, L., Brown, Q., Tate, B., Nias, J., Brewer, R., & Irwin, G. (2013). Designing smarter touch-based interfaces for educational contexts. *Personal and Ubiquitous Computing* (preprint). https://lisa-anthony.com/wp-content/uploads/2013/04/anthony-et-al-jpuc2013.pdf
38. Brown, Q., & Anthony, L. (2012). Toward comparing the touchscreen interaction patterns of kids and adults. CHI EIST 2012. https://lisa-anthony.com/wp-content/uploads/2012/03/brown-and-anthony-chi2012eist.pdf
39. Woodward, J., Cato, J., Smith, J., Wang, I., Benda, B., Anthony, L., & Ruiz, J. Examining Fitts' and FFitts' law models for children's pointing tasks on touchscreens. *Abstract.* https://par.nsf.gov/biblio/10175145
40. Liu, F. (2018). Design for kids based on their stage of physical development. Nielsen Norman Group. https://www.nngroup.com/articles/children-ux-physical-development/
41. W3C. Web Content Accessibility Guidelines (WCAG) 2.2. *Carried over.* https://www.w3.org/TR/WCAG22/
42. Mathe 4 (2026). Research summary: Mathe-Portal Klasse 4. https://github.com/lev-n/mathe-4/blob/main/docs/research.md
43. Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin, 125*(6). *Carried over.* https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf
44. Ramirez, G., Gunderson, E. A., Levine, S. C., & Beilock, S. L. (2013). Math anxiety, working memory, and math achievement in early elementary school (University of Chicago news release). *Carried over.* https://news.uchicago.edu/story/math-anxiety-causes-trouble-students-early-first-grade
45. Caviola, S., Carey, E., Mammarella, I. C., & Szucs, D. (2017). Stress, time pressure, strategy selection and math anxiety in mathematics. *Frontiers in Psychology, 8*, 1488. *Carried over.* https://pmc.ncbi.nlm.nih.gov/articles/PMC5585192
46. Radesky, J., et al. (2022). Prevalence and characteristics of manipulative design in mobile applications used by children. *JAMA Network Open, 5*(6). *Carried over.* https://pmc.ncbi.nlm.nih.gov/articles/PMC9206186/
47. Art. 8 DSGVO. https://dsgvo-gesetz.de/art-8-dsgvo/
48. Wissenschaftliche Dienste des Deutschen Bundestages (2023). WD 10 – 019/23. *Carried over.* https://www.bundestag.de/resource/blob/959324/WD-10-019-23-pdf.pdf
49. Yang, C., Luo, L., Vadillo, M. A., Yu, R., & Shanks, D. R. (2021). Testing (quizzing) boosts classroom learning. *Psychological Bulletin, 147*(4). *Carried over.* https://gwern.net/docs/spacedrepetition/2021-yang.pdf
