# Iris — project notes

Voice-first learning games. Players pick a world, pick a buddy, and play by speaking, signing, or drawing.

## Stack
- **Next.js 16** (App Router, React 19). It has breaking changes from older Next.js, so check `node_modules/next/dist/docs/` before assuming an API.
- **React Three Fiber + drei + postprocessing** for the 3D worlds
- **Zustand** for state: one store per game plus `hubStore`
- **ElevenLabs Conversational AI** (`@elevenlabs/react`) for the voice buddy and its client tools
- **Tailwind CSS v4** for styling, with design tokens and the `iris-*` UI classes in `app/globals.css`
- **FastAPI** backend in `backend/` for ASL recognition and video-to-questions
- TypeScript (strict)

## Routes
- `/`: home
- `/select-topic`: pick a world (Math, ASL, Explore, Feelings)
- `/select-character`: pick a buddy
- `/play/boss`: Boss Battle, the math game (grades K–8, 3 levels each, number pad or voice, special attacks, stars)
- `/play/adventure`: Sign Trail, reading + ASL on a forest path
- `/play/maze`: Star Maze, science questions in a maze
- `/play/garden`: Feelings Garden (name the feeling, pick a kind way to help)

## Shared contracts
- **`hubStore`** (`app/lib/hubStore.ts`) holds `selectedTopic` and `selectedCharacter`. Every game reads from it.
- **`Character3D`** (`app/components/shared/Character3D.tsx`) is the buddy avatar used in all games. It reads the character from `hubStore`.
- **`/api/signed-url`** mints ElevenLabs session URLs, so the API key never reaches the browser.

## Design
- Brand colors: `iris-*` (purple), `ink` (text), `paper` (background), `sun` (yellow accent).
- Fonts: Fredoka for headings (`font-display`), Nunito for body text.
- Use the UI classes `iris-btn`, `iris-btn-primary`, `iris-btn-soft`, `iris-card`, `iris-panel`, and `iris-pill`. Don't add one-off styles.
- Keep styling separate from game logic: HUD changes should only touch `className` and `style`.

## Patterns
- **One Zustand store per game** is the single source of truth. Components subscribe with selectors.
- **ElevenLabs client tools:** the agent calls `useConversationClientTool('toolName', handler)`. See `app/components/game/AgentBridge.tsx`.
- **R3F scene shape:** a `<Canvas>` parent, then lighting and `<Environment>`, then `<Suspense>` around models, with postprocessing last.
- Keep game flows deterministic, with the same input giving the same result every time.
- **Boss Battle: the game judges, the agent narrates.** `bossStore.submitAnswer` checks every answer (voice, number pad, or whiteboard) against `bossLevels.ts`, then sends the agent a `[GAME EVENT]` line to read out. The agent never decides hits, so voice and screen can't drift apart.
- **Boss questions** are generated in `app/lib/bossLevels.ts`: each level has a `make(rng)` template, and every fight builds a fresh 16-question deck from a seed (same seed, same deck). Answers must be whole numbers (set `negatives: true` on a level to show the pad's minus key), and the last step must state the answer.
- **Boss effects:** hit timings live in `app/lib/bossFx.ts` (`FX`, `LANDS`), so the 3D effects, damage numbers and sounds land together. `BossFx3D` draws every glow as one additive particle cloud plus pooled rings and the beam; never add or remove lights mid-fight (it recompiles shaders). `BossArena3D frameloop="never"` lets a test page step frames with `advance()`.

## Run
```bash
npm install
npm run dev          # http://localhost:3000
```

`.env.local`:
```
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_AGENT_ID=agent_...
GEMINI_API_KEY=...
```

Maze dev shortcut: append `?dev=1` to enable WASD, and press `R` to regenerate the maze.
