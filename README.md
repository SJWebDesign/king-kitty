# King Kitty

A 2D multiplayer alley race by Samantha and her crew. Run automatically, jump over obstacles, and grab moving mice and birds for small speed boosts. Birds require a jump followed by a grab in the air. Obstacles slow you down; they never eliminate you. First to the finish wins.

## Play

https://king-kitty-alley-race.nielsensamantha2005.chatgpt.site

- **Tutorial:** four short, interactive lessons: jump, mouse, bird, finish.
- **Choose cat:** Tuxedo (default), Ginger, Silver tabby, or Calico. Choose Player 2 separately for local play. Your selected cat also appears on the winner screen and remains selected for rematches.
- **Start game:** solo practice.
- **Host game / Join game:** 2–8 players using a six-character room code. Everyone taps Ready; the host starts a shared countdown.
- **Local co-op:** two players share one keyboard and race in split screen.
- **Jump:** Space, W, or Up. **Grab:** E, G, or Right. Touch buttons are also available.
- Local two-player controls: Player 1 W/E; Player 2 Up/Right.

The scrolling course, animated characters, moving pickups, scenery props, and interface are separate assets. Each menu has its own illustrated alley scene. Every button uses one transparent green-and-gold frame with a gentle float. Reduced Motion disables decorative animation.

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run build
npx wrangler d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to .wrangler/state
npm start
```

The start command prints the local URL. Use the same server from two browser sessions to test room-code multiplayer.

## Checks

```sh
npx tsc --noEmit --incremental false
node --test tests/game.test.mjs tests/tutorial.test.mjs
node tests/api-smoke.mjs
```

The API smoke test requires a running local server on port 5173, or set `TEST_URL` to its URL. It creates two test racers, completes a full race, verifies results, rematches, and leaves the test room.

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
- `button-frame.png`: the shared transparent frame used by every button.

Generation briefs are recorded in `ASSET-PROMPTS.txt`, `SCENE-PROMPTS.txt`, and `ADDITIONAL-ASSET-PROMPTS.txt`. Artwork remains separate from live text, controls, and game state.
