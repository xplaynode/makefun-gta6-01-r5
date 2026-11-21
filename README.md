[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/xplaynode/makefun-gta6-01-r5/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/xplaynode/makefun-gta6-01-r5/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# CALDERA BAY: VICE TIDE — 12 story missions, CBPD dispatch with roadblocks, RAM/PIT units and the CONDOR spotlight helicopter, 5-weapon wheel, garage upgrades, district respect ranks, 3 street races, 3-station procedural radio, localStorage saves

An original 2D top-down open-world crime game on canvas, set in the invented sun-soaked
coastal city of **Caldera Bay** at golden hour, with pseudo-height buildings, cast shadows
and a slow day cycle. Nothing here comes from any commercial game: the city, characters,
story, art and music are all original.

You play **Rook Salazar**, a wheelman fresh off the ferry, working for fixer **Nadia
Ferrer** and a crew of three — **Pico** (driver), **Sable** (hacker) and **Toro**
(muscle) — each with a usable ability. The Caldera Bay Police Department (**CBPD
dispatch**) answers with patrol pursuit, roadblocks at 3+ stars, RAM/PIT units at 4+
stars and the **CONDOR** spotlight helicopter at 5 stars.

## Features

- Nine named districts, road grid, signed buildings, palms, lamps, market stalls, beach and sea
- Dense traffic AI and pedestrians who stroll, chat and flee; steal any car with **E**
- Wanted 0–5 stars; busted when held slow and close; hiding decays heat
- 12 staged story missions in a chain, gated by district respect ranks, with briefings and payouts; free roam after the chain
- Five-weapon wheel (Fists, Pistol, SMG, Shotgun, Rifle) with mouse aim, muzzle flash, hit sparks; cover crates and walls block shots; damaged cars smoke, burn, explode and chain
- Economy: cash, GARAGE (Armour / Engine / Nitro, nitro on Shift), SHOP (vest / ammo / health), SAFEHOUSE (pay to clear heat)
- Three repeatable street races against 2 AI racers, best times saved
- HUD: cash, health/armour, weapon + ammo, wanted stars, mission tracker, crew ability icons, canvas minimap (districts, traffic, police incl. helicopter, mission markers)
- Start screen, pause, busted/wasted respawn; WebAudio SFX and in-game RADIO (R cycles 3 original procedural loops); saves in localStorage

## Controls

- **WASD / arrows** — move / drive · **E** — enter/steal car, interact · **Mouse** — aim · **Click / Space** — shoot
- **Q / Tab** — cycle weapon wheel · **Shift** — nitro (in a car with the nitro upgrade)
- **Z** Pico boost · **X** Sable police jam · **C** Toro adrenaline · **R** radio station · **P / Esc** — pause · **Enter** — start / confirm

## The 12 missions

1. First Tide — learn the bay, deliver Nadia's package to the marina.
2. Market Muscle — shake down the stalls of Mercado Alto.
3. Glass Palms — lift a coupe from the Palmera Heights valet row.
4. Night Ferry — move contraband before the last ferry leaves Port Azul.
5. Siren Test — survive a staged 3-star CBPD response.
6. Coral Run — street-race the Coral Strip for respect.
7. Vault of Salt — crack the Banco del Mar depot with Sable.
8. Roadblock Waltz — run a 4-star roadblock line to the safehouse.
9. Condor Season — outdrive the CONDOR spotlight across the causeway.
10. Toro's Debt — clear the yard crew holding Toro's marker.
11. Golden Hour Kings — take the hilltop relay above Bahia Norte.
12. Vice Tide — the final score: three legs, one bay, dawn deadline.

## Run it

```sh
node serve.ts   # serves game/ at http://localhost:8080
```

Or serve `game/` with any static file server and open `index.html`. No build step, no
network loads: every script lives under `game/`.

Hand it in with:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
