# Timeblends – overzicht van het spel

Dit document vat alles samen wat tot nu toe over Timeblends besloten en gebouwd is. Plak het aan het begin van een nieuwe chat om verder te werken aan één onderdeel: graphics, personages, verhaal, gameplay of iets anders. Muziek staat er bewust niet in.

---

## 1. In het kort

- **Naam van het spel:** Timeblends
- **Maker:** hárrypóttersmúrf (eigen logo, staat in `assets/logo-harrypottersmurf.png`)
- **Genre:** 2D side-scroller met platforms en zwaardgevechten, in de stijl van *Hollow Knight*: soepel en niet in pixel-art.
- **Hoofdpersoon:** de Time Blender, een levend glazen maatglas met gele vloeistof in zijn kop.
- **Wereld:** een verlaten koperfabriek met 15 hallen ("rooms").
- **Einddoel:** het spel uitbrengen op **Steam**. Eerder kan het ook als website of als zip.
- **Huidige vorm:** één HTML-bestand dat in de browser draait.

---

## 2. Hoofdpersoon: de Time Blender

### Uiterlijk (zoals nu in het spel)
- **Kop:** een grote glazen bol die een beetje naar voren hangt, gevuld met **gele vloeistof** die klotst en belletjes heeft. Er is geen hoed (die is bewust weggehaald). Hij heeft geen gezicht, maar wel een glimlichtje en een klein wit labeltje op het glas.
- **Lichaam:** klein en smal, met een paarse borst en romp en een lichte buikplaat.
- **Cape:** een lange bronzen/oranje cape **achter** het lichaam, met een puntige zoom en zonder strepen. Hij wappert bij het rennen.
- **Benen:** dunne donkerpaarse benen die onder de cape uitkomen, met donkere voetjes. Er zit geen ring rond de hiel.
- **Zwaard:** een **gouden zwaard** waarvan je alleen het **handvat** ziet; het lemmet zit aan de verre kant achter het lichaam.
  - **Aura:** kleine **geel-gouden gloeiende runen** (een schildje met twee hoekjes erin en twinkelende sterretjes). Ze tekenen zichzelf, zweven langzaam weg en vervagen. Ze moeten subtiel blijven.
- **Houding:** zoals de Knight uit Hollow Knight: een groot leunend hoofd op een klein lichaam.

### Animaties
- **Stilstaan:** licht ademen, de vloeistof klotst en de cape beweegt.
- **Rennen:** naar voren leunend met korte snelle passen, zonder op en neer te wippen.
- **Springen en vallen:** aparte houdingen. Bij een harde landing zakt hij even in.
- **Slaan:** het lichaam beweegt niet mee en hij remt niet af. Er verschijnt een **halvemaanvormige slash** (60% van een cirkel, smalle punten en breed in het midden) die aan de speler vastzit. De richting ligt vast op het moment dat je de toets indrukt.

### Kleuren (uit de code)
| Onderdeel | Kleuren |
|---|---|
| Cape | `#eb9556` → `#cf7a42` → `#a35a30`, donker `#7d4224` |
| Benen / voeten | `#2e1a36` / `#1c1226` |
| Omlijning (alles) | `#2a1830` |
| Koper (wereld) | `#b8613a`, licht `#d98348`, highlight `#f0a868`, donker `#6e3426` |
| Leisteen-blauw (wereld) | `#5b7aa0`, licht `#8aa6c4`, donker `#3c5272` |
| Paars (achtergrond) | `#2b1d33`, `#4a3050`, `#6a4a72` |
| Crème | `#f0e2a8`, `#fff3cf` |
| Gouden aura / runen | `rgba(255,232,120)` met gloed `rgba(255,200,50)` |

### Inspiratie
- **Concept art:** "Time Blender" uit *Almost a Hero* (Bee Square, 2016). Daarin staan een maatglas-hoofd, een paarse outfit, koperen platen, een staf en een rugtank.
- **Let op:** dat is werk van iemand anders. Het is alleen inspiratie; de figuur in het spel moet een eigen ontwerp blijven, zeker met het oog op Steam.

---

## 3. Achtergrondverhaal (eerste versie, goedgekeurd: "het zit goed in elkaar")

> Er staat nog **geen verhaaltekst in het spel**. De maker zei: "doe nog niks met de story".

**In één zin:** een levend glazen maatglas loopt door een verlaten fabriek die al eeuwen dezelfde nachtploeg draait, op weg naar de smederij waar de zon opkomt.

- **Herkomst:**
  - In de koperfabriek werd **tijd gemaakt**. De machines distilleerden uren tot een gele vloeistof en vulden daar glazen bollen mee.
  - De Time Blender was het **eerste maatglas**, het prototype waarmee de meester tijd mat. Niemand had verwacht dat hij zou gaan lopen.
- **De kop:** de vloeistof in zijn kop is zijn "uur". Zolang hij vol is, leeft hij. Elke klap laat een deel lekken; dat zijn de hoofdjes in de gezondheidsbalk.
  - Is hij leeg, dan trekt de vloeistof zich terug en komt hij weer bij ("Refilling your head...").
- **De cape:** gemaakt van het allereerste brons dat de fabriek goot. Hij is te lang, omdat hij eigenlijk voor een groter maatglas bedoeld was.
- **Het zwaard:** een gouden zwaard waarvan het lemmet in zijn schaduw zit. De gele energie is dezelfde tijdvloeistof.
- **De wereld:** de mensen zijn al lang weg. De fabriek draait door voor niemand, in één eindeloze nachtploeg. Bovenaan ligt de smederij waar het altijd net zonsopgang lijkt.
- **Wat hij wil:** de smederij bereiken en zijn vloeistof in de grote klok gieten, zodat de dag eindelijk begint.
- **Stem:** hij praat niet. Je hoort alleen de vloeistof klotsen.
- **Vijanden:** het zijn geen kwaadaardige wezens, maar machines die hun oude taak nog uitvoeren (zie hoofdstuk 5).
- **De baas, The Last Guard:** een **geest** die vroeger bewaker van de fabriek was. Hij viel in een van de machines en stierf daardoor. Sindsdien **haat hij elk mechanisme**. Hij verstopt zich in een grote robot en bezit kleine robotjes.

### Open vragen voor het verhaal
1. **Toon:** ernstig en droevig, of lief en grappig?
2. **Naam:** blijft het "Time Blender", of komt er een eigen naam?
3. **Bazen:** komen er meer, bijvoorbeeld per gebied?
4. **Herinneringen:** vindt hij onderweg stukjes van zijn geheugen terug?
5. **Einde:** wordt het dag, of moet het nacht blijven?
6. **Het harnas:** wat zijn de "geheimzinnige krachten" (zie hoofdstuk 7)?
7. **Vertellen:** hoe komt het verhaal in het spel (tekst, borden, NPC's, tussenfilmpjes)?

---

## 4. De wereld: 15 hallen

Alle hallen zijn **fabrieksruimtes** in koper, leisteen-blauw en paars, met draaiende tandwielen, buizen, lampen en stoom. Het beeld heeft diepte door lagen die met verschillende snelheid meeschuiven (parallax). Bovenin zit een plafond met tandwielen en onderin een vloer met gele waarschuwingsstrepen.

| # | Naam | Bijzonder |
|---|---|---|
| 1 | Copper factory | Startkamer. Links staat een **dichte muur**; je kunt niet terug. |
| 2 | Gear wall | |
| 3 | Conveyor line | Lopende band |
| 4 | Piston hall | |
| 5 | Boiler room | |
| 6 | Clock tower | |
| 7 | Chimney dusk | Avondlucht met zon |
| 8 | Gantry crane | |
| 9 | Furnace | Oven met gloed |
| 10 | Pipe maze | |
| 11 | Assembly arms | |
| 12 | Elevator shaft | |
| 13 | Cog tower | |
| 14 | **Night shift** | **Baasgevecht: The Last Guard** |
| 15 | **Sunrise forge** | Zonsopgang. **Geen vijanden.** Aan het einde staat de **forge**, met daarachter een dichte muur. |

- **Indeling per kamer:** elke keer dat je een kamer binnenkomt, worden er nieuwe platforms (3 hoogtes), kuilen en vijanden gemaakt. Kamer 14 en 15 hebben een vaste indeling.
- **Volgorde:** je loopt aan de rechterkant uit beeld naar de volgende kamer. De kamers lopen **niet** rond, dus van kamer 1 kom je niet in kamer 15.
- **Pixel-art:** eerder in het project zijn ook pixel-art achtergronden gemaakt, zowel onderwater als fabriek. Ze staan in `assets/pixelart-*.png/gif`, maar worden in het huidige spel niet gebruikt.
- **Plannen:** de maker wil **nieuwe gebieden** gaan maken ("ik ga snel een nieuwe area maken").

---

## 5. Vijanden (robots)

| Vijand | Levens | Gedrag |
|---|---|---|
| **Zaagbot** (saw) | 3 | Een rollend tandwiel met één rood oog. Patrouilleert snel heen en weer, op de grond of op een platform. |
| **Veerbot** (spring) | 4 | Een koperen blok op een veer. Springt ver naar je toe en springt na een landing meteen terug als je voorbij bent. |
| **Drone** | 2 | Een zwevende robot met propeller. Blijft op zijn plek en schiet **om de 4 seconden** een rode bliksemkogel, met een oplaad-animatie vooraf. |
| **Bezeten robotje** (imp) | 2 | Komt alleen voor in het baasgevecht. Een klein robotje met een spookje erin en blauwe ogen. Loopt en springt naar je toe en valt na 11 seconden vanzelf uit elkaar. |

- **Bij een klap:** de vijand wordt teruggeduwd en flitst wit. Boven de vijand staan bolletjes die zijn levens laten zien.
- **Bij jou:** contact met een vijand kost 1 hartje, met terugduw en korte onkwetsbaarheid.
- **Onderdelen:** een verslagen vijand laat met **5% kans** een onderdeel vallen.

---

## 6. Baas: The Last Guard (kamer 14)

- **Uiterlijk:** een blauw-witte geest in een bewakersuniform (knopen, riem, bewakerspet) met een **lantaarn** en boze holle ogen. Hij wordt **rood** vlak voor en tijdens een dash.
- **Levens:** 30, met een balk onderin beeld met de naam "THE LAST GUARD". Onder de helft van zijn leven gaat hij sneller en wordt de gloed om hem heen oranje.
- **Intro (alleen de eerste keer):**
  1. Het scherm komt op uit zwart, met filmbalken boven en onder. Je staat **verdoofd** in het midden, met sterretjes boven je hoofd.
  2. Er staat een **grote robot** met **donkere ogen zonder pupil**. Die schreeuwt: **zwarte rookringen**, het scherm wordt donker en trilt.
  3. Het luik op het hoofd van de robot gaat open en **The Last Guard klimt eruit**. De robot zakt in elkaar en zijn ogen gaan uit.
  4. De geest **schreeuwt nog een keer** en rechtsonder verschijnt "THE LAST GUARD", zoals de bazen in Hollow Knight.
  5. Het gevecht begint.
- **Bij een volgende poging** (na doodgaan): geen intro. De robot staat al leeg en de baas zweeft meteen binnen.
- **Aanvallen:**
  1. **Dash:** hij trilt en wordt rood, en stormt dan dwars door je heen. **Alleen dan** doet zijn lichaam schade; in het blauw kun je door hem heen springen.
  2. **Wail:** een ring blauwe geestkogels.
  3. **Spiraal** (alleen in de tweede helft): twee draaiende stromen kogels.
  4. **Bezetting:** hij stuurt 3 kleine geestjes uit (4 in de tweede helft). Elk geestje kruipt in een klein robotje.
- **Raken:** de hitbox van de baas is groot, zodat hij goed te raken is. Kogels kun je kapotslaan met je zwaard.
- **Opsluiten:** zolang hij leeft kun je de kamer niet uit.
- **Na zijn dood:** hij komt nooit meer terug. De lege robot blijft liggen.

---

## 7. Spelsystemen

### Gezondheid
- Je hebt **5 hoofdjes**: glazen bolletjes met gele vloeistof, in een koperen paneel linksboven. Met upgrades worden het er maximaal **10**.
- Elke klap kost 1 hoofdje. Bij 0 hoofdjes ben je "Knocked out".
- **Doodgaan:** je komt terug aan het **begin van de vorige kamer**, met volle hartjes. Je onderdelen en upgrades houd je.

### Liquid battery (de gele balk)
- De balk staat onder de hoofdjes en heeft 6 vakjes.
- Elke **3 rake klappen** vullen **1/6**; met de upgrade is dat **2/6**.
- **Genezen:** houd **X 1,5 seconde** ingedrukt. Dat kost 2/6 van de balk en geeft 1 hoofdje terug. Je ziet dan een ring om je hoofd die volloopt. Met minder dan 2/6 kun je niet genezen.

### Onderdelen (parts / scraps)
- Je herkent ze als **koperen tandwieltjes**. Ze vallen met 5% kans uit verslagen vijanden en vliegen naar je toe als je dichtbij komt.
- De teller staat onder de gele balk.
- Je houdt ze als je doodgaat.

### Forge (kamer 15)
Loop naar de forge en druk op **Z** of **E**. Er zijn vier kaarten:

| Upgrade | Effect | Prijs | Maximum |
|---|---|---|---|
| **Sharpened Edge** | +0,5 zwaardschade | 10 → 20 → 40 → 80 | 4 keer, dus 3 schade |
| **Extra Heart** | +1 hartje, en je wordt meteen helemaal genezen | 10 → 20 → 40 → 80 → 160 | 5 keer, dus 10 hartjes |
| **Liquid Battery** | 2/6 per 3 klappen in plaats van 1/6 | 10 | 1 keer |
| **Harness** | "Holds mysterious powers..." | 100 | 1 keer |

- **Het harnas** doet **nog niets**. De krachten bedenkt de maker later.
  - **Forge-icoon:** een paars gasmasker met koperen ooglenzen en gouden runen.
  - **Op de speler:** een paars gasmasker met een koperen filter, een tank op de rug met een draaiende blauwe opwindsleutel, een slang naar het masker, een koperen schouderstuk en een flesje met geel spul aan de heup. Ook het harnas is geïnspireerd op de Time Blender uit Almost a Hero.

### Pauze en opslaan
- Rechtsboven zit een **tandwielknop**. Je opent hem met een klik, **Tab** of **Esc**.
- Het pauzemenu heeft twee keuzes:
  - **CONTINUE:** verder spelen.
  - **GO BACK TO MENU:** in het hoofdmenu staat dan "CONTINUE". Daarmee begin je aan het begin van de kamer waar je was, met volle hartjes en alles wat je had.
- Je voortgang blijft alleen bewaard zolang de pagina open is. Er is nog **geen echte save**.

---

## 8. Besturing

| Actie | Toets |
|---|---|
| Lopen | ← → of A D |
| Springen (langer vasthouden = hoger) | Spatie, ↑ of W |
| Zwaard | **Z** of **Shift** |
| Genezen | **X** 1,5 s vasthouden |
| Door een platform zakken | S of ↓ |
| Forge openen | Z of E (bij de forge) |
| Pauze | Tab, Esc of de tandwielknop |
| Menu | ↑ ↓ en Enter. **Z klikt** op wat onder de muis staat. |
| Alleen voor ontwikkeling | H = schade, J = genezen, [ ] = andere kamer |

Op een touchscreen zijn er knoppen onder het spel: ◀ ▶ Hit Jump.

---

## 9. Schermen en interface

- **Intro:** zwart scherm. Het logo van de maker komt langzaam in beeld met "**by hárrypóttersmúrf**" eronder en vervaagt weer. Een toets of klik slaat de intro over.
- **Hoofdmenu** (in Hollow Knight-stijl):
  - **Titel:** "TIMEBLENDS" groot en lichtgevend in een serif-lettertype (Cinzel), met een sierlijk ornament erboven.
  - **Knoppen:** START GAME (of CONTINUE) en OPTIONS (geluid aan/uit, back).
  - **Achtergrond:** een groot raam met bewegende lichtbundels, draaiende tandwielen bovenin en donkere tandwielen onderin waar maar een klein stuk licht op valt. Er zweeft goudstof.
  - **Logo:** het logo van de maker staat rechtsboven.
  - **Bewust weggelaten:** trofeeën, extra's, tekens linksonder en een ornament onder de titel.
- **HUD:** het hoofdjespaneel in koper-fabrieksstijl, de gele balk, de onderdelen-teller (en het harnas-icoon als je het hebt), de baasbalk onderin en de pauzeknop rechtsboven.
- **Lettertypen:**
  - Cinzel en Cormorant Garamond voor het menu en de titels.
  - Press Start 2P en Space Mono voor de pagina eromheen.
  - Ze komen van Google Fonts, dus zonder internet zie je een gewoon lettertype.

---

## 10. Geluid (geluidseffecten, zonder muziek)

- **Effecten:** voetstappen, landen, zwaardslag, inslag, rollen (zaagbot), laser (drone), drone-gezoem en schreeuwen (gemaakt met code).
- **Volume:** de effecten staan **zacht en op de achtergrond**.
- **Bewust weggelaten:** het **spronggeluid**. Het landingsgeluid is gebleven.
- De originele bestanden staan in `assets/sounds/`.

---

## 11. Techniek

- **Bestand:** het hele spel is **één HTML-bestand**, `demo/time-blender-demo.html`. Alles is met code getekend op een canvas van 960×540, met 60 stappen per seconde. Geluiden zitten erin als mp3 (base64).
- **Online versie:** https://claude.ai/artifact/CvBotvpfNgd3W6McotBX47 (privé, alleen voor de maker).
- **Repository:** `rkeizer2020/Tagz` (verhuisd naar `rkeizer2020/ghostag`), branch `claude/magical-maxwell-x32h6g`.
- **Dev-modus:** bovenin de code staat `const DEV=true;`. Zet je die op `false` (voor een website, zip of Steam), dan verdwijnen:
  - de kamerkiezer;
  - de knoppen Take damage, Heal en Unlock everything;
  - de animatievoorbeelden;
  - de toetsen H, J, [ en ].
- **Unlock everything** (alleen in dev-modus): geeft je alle upgrades in één keer.
- **Steam:** daarvoor is later iets als Electron of Tauri nodig om het HTML-spel als desktop-app te verpakken. Daar is nog niets aan gedaan.

---

## 12. Werkafspraken en voorkeuren van de maker

- De maker spreekt **Nederlands**. De teksten in het spel zijn **Engels**.
- **Elke wijziging:** testen, publiceren op dezelfde artifact-link, committen en pushen.
- **Verhaal:** **nog geen verhaaltekst** in het spel tot de maker dat zegt.
- **Voorbeeldplaatjes:** de maker stuurt vaak plaatjes als voorbeeld. Die worden **niet zelf in het spel gebruikt**; het spel tekent een eigen versie in dezelfde stijl.
- **Stijl:** liever subtiel dan druk. Een aura mag niet te dominant zijn, en geluiden blijven zacht.

---

## 13. Openstaand / ideeën voor later

- [ ] Krachten van het **harnas** bepalen en bouwen.
- [ ] **Nieuwe gebieden** (areas) na de fabriek.
- [ ] Een echte **save** (blijft bewaard na afsluiten).
- [ ] **Verhaal** in het spel verwerken (zie de open vragen in hoofdstuk 3).
- [ ] Meer bazen of eindbazen per gebied?
- [ ] Een **release-build** (DEV uit) voor website, zip en later Steam.
- [ ] Eigen ontwerp voor de hoofdpersoon en het harnas, los van de Almost a Hero-concepten, met het oog op auteursrecht bij een Steam-release.
