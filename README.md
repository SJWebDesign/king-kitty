# King Kitty

A 2D multiplayer alley race by Samantha and her crew. Run automatically, jump over obstacles, and grab moving mice and birds for small speed boosts. Birds require a jump followed by a grab in the air. Obstacles slow you down; they never eliminate you. First to the finish wins.

## Play

https://king-kitty-alley-race.nielsensamantha2005.chatgpt.site

- **Tutorial:** four short, interactive lessons: jump, mouse, bird, finish.
- **Your racer:** enter your nickname once on this browser and choose Tuxedo (default), Ginger, Silver tabby, or Calico. Player 2 gets their own saved name and cat for local play. Names appear on the race, winner screen, and all-time leaderboard. You can edit your nickname here later without losing records; old queued races cannot undo a newer name.
- **Start game:** solo practice.
- **Host game / Join game:** 2–8 players using a six-character room code. Everyone taps Ready; the host starts a shared countdown.
- **Local co-op:** two players share one keyboard and race in split screen.
- **Jump:** Space, W, or Up. **Grab:** E, G, or Right. Touch buttons are also available.
- Local two-player controls: Player 1 W/E; Player 2 Up/Right.
- **Obstacle collisions:** tight sprite crops and shape-aware hitboxes ignore empty corners and forgive grazing paws. Existing races and queued results keep their original physics.
- **Leaderboard scene:** live names, cats, times, wins, and race counts appear inside the illustrated sign, with scrolling and a phone layout.
- **Longer alley:** 24,000 units, about 80–100 seconds depending on jumps and boosts. Five obstacle sizes mix short, wide objects with taller ones. Time your jump so your paws stay above the entire obstacle.
- **All-time leaderboard:** online, solo, and local races all contribute. Fastest times rank first; race counts and competitive wins are also shown. Records begin with v0.3 and stay in the hosted database across updates. Earlier v0.2 races did not store a permanent history and cannot be recovered.
- **Loading scenes:** an animated selected cat and paw trail appear while art, rooms, and scores load. Short minimum durations keep transitions smooth.

The scrolling course, animated characters, moving pickups, scenery props, and interface are separate assets. Each menu has its own illustrated alley scene. Every button uses one transparent green-and-gold frame with a gentle float. Reduced Motion disables decorative animation.

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_special_charles_xavier.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_nasty_maria_hill.sql
npm start
```

Apply each SQL file only once to a fresh local database; skip files you already applied. The start command prints the local URL. Use the same server from two browser sessions to test room-code multiplayer.

## Checks

```sh
npx tsc --noEmit --incremental false
node --test tests/*.test.mjs
node tests/leaderboard-smoke.mjs
node tests/api-smoke.mjs
```

The smoke tests require a running local server on port 5173, or set `TEST_URL` to another localhost URL. They intentionally refuse production URLs so test scores do not enter the public all-time leaderboard. The race test creates two test racers, completes a full race, verifies results and stored records, rematches, and leaves the test room.

## Race records and privacy

Nicknames, selected cats, best finish times, wins, and race counts are public. Use a nickname, not personal contact details. A random browser-held key identifies each local player; the database stores only its hash. Keeping this browser's site data preserves the same racer identity. Clearing site data or switching devices creates a new identity, while old records stay published. No email, birthday, or login is requested.

Online results come from server physics. Solo/local results replay the actual jump and grab inputs on the server; the server calculates the finish times. Retries do not count a race twice. This validates plausible gameplay, but is not a comprehensive competitive anti-cheat system. Offline solo/local results queue on the device and upload when connected. Records do not have a scheduled expiry; continued availability depends on keeping the hosting project and database active.

## Hosting

This repository contains the full source and artwork. The playable URL is hosted separately on Sites with a Cloudflare Worker and D1 database. GitHub Pages alone cannot run the authoritative multiplayer API. A separate Cloudflare account can host this code on its free tier within that plan's limits; configuring a GitHub-to-Cloudflare deployment requires that account and its database binding. No paid hosting plan is enabled by this repository.

`.openai/hosting.json` identifies the existing Sites deployment. Keep that identity when updating it through the Sites workflow. Runtime credentials, local database state, dependencies, and generated deployment archives are excluded from Git.

## Artwork

The original 16 interface images and four backgrounds supplied by Samantha are retained in `public/assets`. New artwork was made to match them. The shared transparent button frame replaces opaque JPEG button backgrounds in the live interface.

- `kitty-sheet.png`: ginger character animations.
- `kitty-tuxedo.png`, `kitty-silver.png`, `kitty-calico.png`: matching 12-frame skins.
- `scene-cats.png`: character selection scene.
- `boosts-sheet.png`: four mouse run frames and four bird flight frames.
- `props-sheet.png`: separate obstacles and alley props.
- `scenes-social.png`: four menu scenes, displayed as separate CSS viewports.
- `scenes-learn.png`: tutorial, rules, settings, and results scenes.
- `scene-pause.png`: pause-menu scene.
- `scenes-records.png`: separate leaderboard and loading scenes.
- `button-frame.png`: the shared transparent frame used by every button.

Generation briefs are recorded in `ASSET-PROMPTS.txt`, `SCENE-PROMPTS.txt`, and `ADDITIONAL-ASSET-PROMPTS.txt`. Artwork remains separate from live text, controls, and game state.
