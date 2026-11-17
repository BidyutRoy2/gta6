# SOLMAR — Make GTA 6 (gta6-01)

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/BidyutRoy2/gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/BidyutRoy2/gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game in plain canvas 2D. No Rockstar assets, names,
or art — everything here is invented: the sun-soaked coastal city of Solmar,
courier driver Dana "Dash" Cole, Vega Transport, The Marlin Club, and the Solmar PD.

## The game

Dana Cole drives courier jobs for Vega Transport and gets pulled into The Marlin
Club's smuggling ring, ending in a heist against corp boss Harlan Vega. Eight
story missions with payouts, a wanted system with police chases, car stealing
and driving, on-foot combat, traffic and pedestrians, a minimap HUD, a garage
shop where cash buys repairs, ammo and a faster car, and a save system.

## How to play

- **WASD / arrows** — move on foot, drive when in a car
- **E** — enter / exit a car (walk up to a parked car and steal it)
- **Mouse click** — shoot (once you have a pistol, from Mission 3)
- **F** — punch
- **B** — garage shop (near the garage marker)
- **P / Esc** — pause, **M** — mute

Missions run in order from the start screen. Cash earned buys upgrades. Lose
the cops to drop your wanted level; get arrested or run out of health and the
mission restarts.

## Run it

```
node serve.ts
```

then open http://localhost:8080. No build step, no network, no libraries —
everything under `game/` is plain static files.

## Screenshots

`?shot=cover|street|mission|menu&seed=7` stages deterministic scenes of the
game for screenshots; `shots.json` lists the four shipped shots.

## License

MIT. See LICENSE.

---

<sub>Entered on [make.fun](https://make.fun/?ref=v36tdgxj&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
