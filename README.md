# SOLMAR — Make GTA 6 (gta6-01)

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/BidyutRoy2/gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/BidyutRoy2/gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

SOLMAR is a top-down open-world crime game drawn entirely on a plain 2D
canvas. Nothing in it comes from Rockstar — no assets, no names, no artwork.
The city of Solmar, its people and its story are all invented here: a bright
coastal town where courier driver Dana "Dash" Cole works for Vega Transport,
crosses paths with The Marlin Club, and ends up on the wrong side of the
Solmar PD.

## The game

Dana starts out running ordinary courier jobs, then gets drawn into the
Marlin Club's smuggling operation, and the story builds toward a heist
against corporate boss Harlan Vega. There are twelve story missions, each
paying cash on completion — ending in a two-mission finale (M11 The Marlin
Run, M12 Vega's Last Stand) that settles the score with Harlan Vega himself
— plus a wanted system that sends police after you, cars you can steal and
drive, hand-to-hand combat on foot, busy traffic and pedestrians on the
streets, a minimap HUD, a garage shop where earned cash buys repairs, ammo
and a faster car, and a save system that keeps your progress. Between
missions you can earn extra cash driving taxi fares (press T in a Solmar
Taxi), hunting ten hidden packages worth $100 each, and racing the white
ring on the north road for up to $1,450 a win in the Vega Phantom, the
fastest car in the city.

## How to play

- **WASD / arrows** — walk on foot; drive once you are in a car
- **E** — get in or out of a car (step up to a parked car to steal it)
- **Mouse click** — fire your weapon (you get a pistol from Mission 3)
- **F** — punch
- **T** — taxi fares (drive a Solmar Taxi to pick up a waiting fare)
- **B** — open the garage shop (stand near the garage marker)
- **P / Esc** — pause, **M** — mute

You take the missions in order from the start screen. The cash you earn can
be spent on upgrades. Shake off the police to bring your wanted level back
down — if you are arrested or your health runs out, the mission starts over.

## Run it

```
node serve.ts
```

then open http://localhost:8080. There is no build step, no network access and
no libraries — everything under `game/` is plain static files.

## Screenshots

`?shot=cover|race|mission|menu&seed=7` sets up repeatable scenes of the
game for taking screenshots; `shots.json` lists the four shots that ship
with the repo.

## License

MIT. See LICENSE.

---

<sub>Entered on [make.fun](https://make.fun/?ref=v36tdgxj&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
