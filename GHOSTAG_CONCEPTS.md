# Ghostag / Tagz — Concept- & overdrachtsdocument

> **Doel van dit document.** Dit is een zelfstandige samenvatting van álles wat voor
> het spel van belang is, zodat je in **aparte chatvensters** aan losse deelonderwerpen
> kunt werken (graphics, muziek, character development, verhaal, enz.) zonder dat de
> andere chat de hele geschiedenis kent.
>
> **Hoe te gebruiken:** open een nieuwe chat voor één deelonderwerp, plak de
> **"Startprompt"** uit §13 van dat onderwerp, en plak daar eventueel de secties uit dit
> document bij die relevant zijn. Houd dit bestand als "single source of truth" en werk
> het bij als er beslissingen vallen.
>
> _Laatste update: 2026-10-06. Status: hoofdspel live; White Diver = los prototype._

---

## 1. High concept (elevator pitch)

**Ghostag** (repo-naam **Tagz**) is een gratis browser-spel: een lichtgevend **spookje**
vlucht door een mistig bos voor een **Spook met een zwaard** dat je achtervolgt. Je
verzamelt orbs, ontwijkt bomen, gebruikt per personage een unieke **special ability** en
probeert zo lang mogelijk te overleven en hoog te scoren. Er zijn meerdere speelbare
spookjes (elk met eigen kracht), skins, mapthema's, moeilijkheidsgraden, een
**online multiplayer "Spook Tag"-modus**, en experimentele personages.

Daarnaast is er een **tweede, losstaand spelidee** in ontwikkeling: **White Diver**, een
onderwater endless-swimmer (zie §10). Dit is nu nog een los prototype (Artifact), nog
**niet** ingebouwd in het hoofdspel.

Toon/sfeer: schattig-spookachtig, kleurrijk, "arcade", mobiel-vriendelijk.

---

## 2. Twee producten in één project

| | **Hoofdspel (Ghostag)** | **White Diver (prototype)** |
|---|---|---|
| Wat | Top-down ghost-chase arcade | Side-scroll onderwater swimmer |
| Status | Live (web + Artifact) | Los prototype-Artifact |
| Techniek | Phaser 3.90 (meerdere files) | Eén standalone HTML + canvas |
| In het hoofdspel? | Ja | Nog niet (bewust uitgesteld) |

De White Diver is bedoeld om **later een personage/modus in het hoofdspel** te worden
zodra het prototype goed voelt.

---

## 3. Technische stack & architectuur (hoofdspel)

- **Engine:** Phaser **3.90.0**, **no-build** (geen bundler). `vendor/phaser.min.js` is
  gevendord; alle scripts via `<script>`-tags in `index.html` met **cache-busting
  `?v=NN`** (nu v72 — dit nummer bij elke release ophogen).
- **Backend:** **Supabase** (auth + Realtime). Client via `js/auth.js` (`Auth.client`,
  `@supabase/supabase-js@2`).
- **Opslag:** vooral **localStorage** (highscores, coins, skins, personage, difficulty,
  net-id/naam). Zie §15.
- **Hosting:**
  - GitHub Pages → **https://rkeizer2020.github.io/ghostag/** (vanaf `main`).
  - Claude Artifact (speelbare build): **https://claude.ai/artifact/A85NiVbMH8Sv1zYRt6k6v8**
- **Repo:** `rkeizer2020/Tagz`. Dev-branch: `claude/charming-ramanujan-q0om96`.
  Release-flow: feature-branch pushen + `git push origin HEAD:main` + Artifact
  opnieuw publiceren + `?v=NN` ophogen.

### Bestandsstructuur (js/)
- `config.js` — **alle constantes**: `GAME` (tuning), `Biomes`, `Storage`, `Settings`
  (difficulty, CHARACTERS, SKINS). Dé plek om balancing te doen.
- `auth.js` — Supabase auth / account.
- `net.js` — online multiplayer over Supabase Realtime (lobby's + Spook Tag).
- `audio.js` — geluid.
- `textures.js` — **alle graphics worden met code (Phaser Graphics) getekend** als
  textures (geen externe sprite-assets). Belangrijk voor de graphics-chat.
- `joystick.js` — touch-joystick (mobiel).
- `ui.js` — UI/overlays (o.a. online-panel/lobby).
- `cutscenes.js` — anime-achtige cutscenes (o.a. Super Cat ultimates).
- `hack.js` — de 5 hacking-mini-games (Hacker Ghost).
- `scenes/` — `BootScene`, `MenuScene`, `SettingsScene`, `CharactersScene`,
  `SkinsScene`, `LeaderboardScene`, `MapRollScene`, `GameScene`, `GameOverScene`,
  `OnlineGameScene`.

### Belangrijke Phaser-valkuilen (al ondervonden)
- Scene-data **merged** over `scene.start()` heen en wordt nooit gewist → stale data.
  Geef altijd expliciete data mee (bijv. `{online:false}`).
- `this.time.now` in `create()` is **niet** gelijk aan de `time`-arg in `update()`.
- Phaser luistert op **window-niveau** naar pointer-events; een DOM-overlay blokkeert
  kliks dus niet vanzelf → `game.input.enabled=false` gebruiken.
- `.panel{display:flex}` overschrijft `hidden` tenzij je `[hidden]{display:none!important}`
  zet.

---

## 4. Personages (hoofdspel) — belangrijk voor "character development"

18 spookjes + 1 admin-personage. Elk heeft een **ability**, een **unlock-score**, en
losse tuning in `config.js`. Unlock = je beste score ooit ≥ drempel (founder-perk
unlockt alles; admin-Cat alleen founder-accounts).

| Key | Naam | Ability (kort) | Unlock |
|---|---|---|---|
| blue | Blue Ghost | Log: vertraagt Spook 5s | 0 (start) |
| red | Red Ghost | Smash: slash, stun 3s | 100 |
| green | Green Ghost | Shield 1s, blokkeert hit +100 | 200 |
| purple | Purple Ghost | Phase door bomen 7.5s, 2 levens | 500 |
| yellow | Yellow Ghost | Dash/teleport, snelste | 900 |
| lucky | Lucky Ghost | Gamble: 6 random effecten | 1200 |
| brown | Brown Ghost | Path: rij orbs, orbs dubbel | 1500 |
| pink | Pink Ghost | Heart Arrow: Spook vlucht 2s | 2000 |
| hacker | Hacker Ghost | Hack mini-game → stun 5s +1500 | 3000 |
| black | Black Ghost | Shotgun: 2 pellets, stun 3s | 3500 |
| spider | Spider Ghost | Web (root 2s) / Zipline | 4000 |
| ninja | Ninja Ghost | Decoy / Dash-slice | 4500 |
| magma | Magma Ghost | Mud-trap / Fire-slide | 5000 |
| chrono | Chrono Ghost | Rewind 2s / Slow-Mo | 5500 |
| void | Void Ghost | Black Hole / Bolt (Spook = boss, 100HP, +25000) | 6000 |
| forest | Forest Ghost | Chop boom / Grow boom | 6500 |
| volt | Volt Ghost | Sprint 3x / Taser stun | 10000 |
| alien | Alien Ghost | UFO (onkwetsbaar) / stuiterende Laser | 12000 |
| cat | Shadow Cat → **Super Cat** | admin-only, zie hieronder | — |

**Dual-abilities** (magma/forest/volt/alien/ninja/chrono/void/spider): **Shift** wisselt
tussen de twee modes.

**Shadow Cat / Super Cat (admin-only):** zwarte kat met gouden ogen. Keys 1/2/3 =
Claw (stun 3s) / Moon Leap / Ultra Instinct (3s onkwetsbaar). Bij **1004+ punten → key 4
= SUPER CAT** (gouden "Goku"-haar): upgrades Comet Paw, Thunder Rush, Ultra Instinct 0.2 —
elk met eigen **anime-cutscene**. Als Super Cat is de score **gecapt op 4444**. Alleen
voor founder-accounts (`merlinos24`, `azarios88`).

---

## 5. Skins / cosmetics

Puur cosmetisch (geen gameplay-effect), gekocht met **coins** (verdiend met orbs).
`classic` is altijd in bezit. Voorbeelden: Ember, Frost, Toxic, Pumpkin, Skull, Royal
(kroon), Witch, Rainbow, Galaxy, Neon, Angel, Devil, Diamond, Blue Gnome, Sorcerer.
**Exclusief:** `wizgnome` (Wizard Gnome, alleen founders), `owner` (Rich/goud, alleen
owner-account). Elke skin heeft een `trail`-kleur; sommige een `hat`-overlay; `rainbow`
cyclet de tint. Alle skin-looks worden in `textures.js` getekend.

---

## 6. Maps / biomes

Elke run kiest een random **biome** (zelfde gameplay, andere look): **Forest 🌲**,
**Graveyard 🪦**, **Snow ❄️** (met sneeuwval), **City 🏙️** (met vending machine: koop soda,
spuit hem als wapen). Vóór de run speelt een **map-roll** (roulette) die op het gekozen
biome landt. Zelfde map-roll wordt gebruikt vóór online matches.

---

## 7. Difficulty & scoring (hoofdspel)

- **Difficulty:** Easy (0.78x speed), Normal (1.0x), Hard (1.28x, 1.6x accel). Aparte
  highscore per difficulty.
- **Score:** 2 pt/sec overleven + 10 pt/orb (Brown: dubbel) + ability-bonussen.
- **Coins:** 2 per orb, bewaard tussen runs, voor skins.
- Spook versnelt met de tijd (`ENEMY_START_SPEED` 90 → `ENEMY_MAX_SPEED` 320). Gepakt op
  `CATCH_DISTANCE` 34; zwaard trilt vanaf `WARN_DISTANCE` 200.

---

## 8. Online multiplayer — "Spook Tag"

- **Serverloos & host-authoritative** via Supabase Realtime (channels + Presence +
  broadcast). Een lobby = channel `lobby:<CODE>`.
- **Lobby's:** maak een lobby (random 5-letter code, zonder verwarrende 0/O/1/I), join
  met code, host kan **locken**, max 8 spelers. Host bepaalt start + map (shared seed/biome).
- **Spook Tag-modus:** 1 speler begint als Spook; **60s hot-potato timer**; tag een ander
  → die wordt de Spook met de resterende tijd; timer op 0 → de huidige Spook valt af
  (spectate). Laatste over wint. **Alle stuns gecapt op 1s**, abilities **~0.8x generfd**.
- **Netcode:** host bezit timer/tags/eliminaties, broadcast ~10Hz; clients sturen positie
  ~15Hz; remote spelers geïnterpoleerd met ~120ms render-delay; `broadcast {self:false,
  ack:false}`.
- **Host-left-detectie** via Presence `leave`-event + `_sawHost` (geen false-positives).
- Degradeert netjes: zonder Supabase-client (bijv. in de Artifact-preview) is
  `Net.available()` false en legt de UI uit dat online de website nodig heeft.

---

## 10. White Diver — onderwater prototype (los Artifact)

**Artifact:** https://claude.ai/artifact/2JVmpH8ymwNZnRaVnjE7ZD (privé; nu **v19**).
Eén standalone HTML-bestand met `<canvas>` (geen Phaser). Bronbestand in de werkmap:
`scratchpad/runner-preview.html`.

**Concept:** een **White Diver** — een wit spookje met **duikbril + snorkel** — zwemt
onder water, achtervolgd door een grote **Spook**. Originele character; de achtergrond is
**een door de gebruiker geschilderde afbeelding** (`2.webp`, als data-URI ingebed).

**Huidige mechanics (v19):**
- **Vrije besturing** (geen auto-run meer): **← achteruit / → vooruit / niets = stilstaan**.
  Zwemsnelheid **240 px/s**. De wereld scrollt mee met je beweging (parallax).
- **Springen:** variabele hoogte — korte tik = laag, **↑ vasthouden = hoger**, **hard gecapt
  op het midden van het scherm** (ceiling op `H*0.5`). Launch schaalt met schermhoogte.
- **Pauze:** glazen **bubble-knop** rechtsboven (met bubbel-geluid). Pauze = het beeld
  **bevriest** (geen overlay/tekst). Ook Esc/P. "Run again" heeft hetzelfde bubbel-geluid.
- **Obstakels = draaiend zeewier** (uit de referentievideo van de gebruiker, als originele
  onderwater-versies):
  1. **Twee-fronds zeewier** (`spin2`): draait rond een hub.
  2. **Drie-fronds zeewier** (`spin3`): draait **én** beweegt links↔rechts (sway). Draait
     nu het traagst (~0,3–0,5 rad/s).
  - De hub **zweeft in het midden van het scherm**; fronds reiken tot in de zwembaan.
  - Fronds die onder de zeebodem duiken worden achter het zand verborgen (teken-volgorde).
- **Botsing** kost "lead"; de Spook **lunges** dichterbij; bij lead=0 → game over.
- **Score:** afstand telt alleen vooruit; punten ≈ afstand × 3 (ster-teller in HUD).
- **Achtergrond** beweegt **heel traag** (parallax-factor 0.5) t.o.v. de zeebodem.
- **Visuals:** geschilderde backdrop + god rays + stijgende belletjes + zeebodem;
  de diver is ~0,66x geschaald (body + masker samen).
- **Mobiel:** knoppen ◀ BACK / ▲ JUMP / FWD ▶; canvas-tap: boven=spring, links=terug,
  rechts=vooruit.

**Nog open voor White Diver:** definitieve besturing (beweegt de sprite zelf of vooral de
wereld?), moeilijkheid/afstand-balans, meer obstakeltypes, muziek/SFX, en uiteindelijk
**inbouwen als personage/modus in het hoofdspel**.

---

## 11. Graphics / art direction

- **Alle art wordt met code getekend** (Phaser Graphics → textures in `textures.js`; in de
  White Diver met canvas 2D). Geen externe sprite-sheets. Wil je echte art-assets, dan is
  dat een nieuwe pijplijn-beslissing.
- Stijl: schattig, afgeronde vormen, glow-effecten, kleur per personage (zie
  `COLORS`/`charColor` in `config.js`).
- Spook: donkerblauw zodat hij in de mist/diepte "verdwijnt"; geel zwaard.
- White Diver-palet: diepe blauwtinten, groen (`#3bf38b`) zeewier, wit spookje.

---

## 12. Audio / muziek

- **Huidige staat:** minimale **SFX** (korte oscillator-"blips"; in de White Diver o.a. een
  bubbel-"bloop"). Er is **nog geen muziek/soundtrack**.
- Nog te ontwikkelen: achtergrondmuziek per biome/sfeer, betere SFX, mute/volume-instelling
  (er is een SettingsScene). Let op: no-build + Artifact → audio bij voorkeur klein/ingebed
  of gegenereerd (WebAudio), geen zware externe files.

---

## 13. Deelonderwerpen + kant-en-klare startprompts

Plak één van deze in een **nieuwe chat** om aan dat onderwerp te werken. Plak er de
relevante secties van dit document bij.

**A. Graphics / art direction**
> "Ik werk aan het browser-spel Ghostag (Phaser 3.90 no-build; alle graphics worden met
> code getekend in `js/textures.js`, geen externe assets). Ik wil de art-stijl verbeteren/
> uitbreiden. Hier is het conceptdocument [plak §3, §4, §11]. Help me met [bijv. een
> consistente stijlgids / nieuwe personage-sprites in dezelfde getekende stijl / effecten]."

**B. Muziek & SFX**
> "Ghostag (browser, Phaser no-build + Supabase, ook als Claude Artifact). Er is nu alleen
> minimale WebAudio-SFX en geen muziek. Ik wil een geluidsconcept + lichte, ingebedde
> muziek per biome (forest/graveyard/snow/city) en betere SFX. [plak §6, §12]."

**C. Character development**
> "Ghostag heeft 18 spookjes + admin Super Cat, elk met een ability (zie lijst). Ik wil
> [nieuw personage / herbalanceren / nieuwe ability]. Alle tuning staat in `js/config.js`
> (GAME + Settings.CHARACTERS). [plak §4, §7]."

**D. Background story / lore**
> "Ghostag is een ghost-chase arcade; er is nog geen verhaal. Ik wil een lichte lore:
> wie is het spookje, wat is de Spook, waarom de achtervolging, en hoe passen biomes +
> White Diver (onderwater) daarin. [plak §1, §2, §10]."

**E. White Diver (onderwater swimmer)**
> "White Diver is mijn onderwater side-scroll prototype (standalone HTML canvas, Artifact).
> Huidige mechanics in §10. Ik wil [obstakels/balans/besturing/omzetten naar personage in
> het hoofdspel]. [plak §10]."

**F. Online multiplayer**
> "Ghostag heeft host-authoritative online Spook Tag via Supabase Realtime (§8). Ik wil
> [nieuwe modus / netcode verbeteren / lobby-opties]. [plak §8, §3]."

**G. Levels / biomes / maps**
> "Ghostag kiest per run een biome (forest/graveyard/snow/city). Ik wil [nieuw biome /
> map-objecten / map-roll]. [plak §6, §3]."

**H. Monetisatie / progressie / cosmetics**
> "Ghostag heeft coins, skins en score-gebaseerde unlocks (§5, §7). Ik wil de progressie/
> cosmetics uitbreiden. [plak §5, §7, §15]."

---

## 14. Besturing (samenvatting)
- **Hoofdspel:** bewegen (WASD/pijlen/joystick op mobiel), ability op **Space**, dual-mode
  wisselen met **Shift**; Cat op **1/2/3** + **4** (transform).
- **White Diver:** **←/→** zwemmen, **Space/↑/W** springen (vasthouden = hoger), **Esc/P**
  pauze; mobiel: ◀ ▲ ▶ knoppen + canvas-tap.

---

## 15. Data / opslag (localStorage keys, hoofdspel)
`tagz.hs.<difficulty>` (highscores), `tagz.coins`, `tagz.skins`, `tagz.skin`,
`tagz.character`, `tagz.difficulty`, `tagz.unlockall` (founder-perk), `tagz.founder`,
`tagz.owner`, `tagz.netid`, `tagz.netname`, `tagz.resetId`/`tagz.normalResetId` (board-
wipes). White Diver: `ghostrun.best`.

---

## 16. Belangrijke regels & constraints (NIET vergeten)
- **Geen wachtwoorden van derden** opslaan/gebruiken; voor admin alleen **usernames** op
  lijsten zetten. Admin-Cat alleen founder-accounts (`merlinos24`, `azarios88`).
- **E-mail van de gebruiker** alleen voor identiteit/attributie, nooit naar externe
  services sturen.
- **Geen model-identifier** (Claude/Opus enz.) in repo-artefacten (commits, code,
  PR-teksten). Alleen in chat.
- **Commit-trailers** vereist bij commits/PR's (Co-Authored-By + sessie-link).
- **Originaliteit:** White Diver is een origineel personage; de onderwater-achtergrond is de
  **eigen afbeelding** van de gebruiker. Geen gekopieerde/merk-gebonden characters of art.
- **No-build respecteren:** alles via `<script>`-tags + `?v=NN` cache-busting ophogen bij
  release.

---

## 17. Open vragen voor jou (vul aan wanneer je wilt)
1. **Verhaal/lore:** is er al een richting (wie/wat is het spookje en de Spook, waarom de
   jacht)? Nu is er geen canon.
2. **Muziek:** welke sfeer/genre wil je (chiptune, ambient, spannend)? Mag het per biome
   verschillen?
3. **White Diver:** moet de sprite zélf over het scherm bewegen, of vooral de wereld
   (camera)? En moet dit uiteindelijk een personage of een aparte modus in het hoofdspel
   worden?
4. **Art:** blijven we alles met code tekenen, of wil je op termijn echte art-assets?
5. **Doelplatform/publiek:** vooral mobiel of desktop? Leeftijd/doelgroep?
6. **Prioriteit:** welk deelonderwerp pak je eerst op?
