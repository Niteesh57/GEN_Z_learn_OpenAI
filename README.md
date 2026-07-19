# The way Gen_Z learn's

The way Gen_Z learn's turns a learning prompt into an interactive lesson instead of a long static answer. Learners choose a mode from the sidebar, enter a topic, and receive a focused experience built from safe, structured data and React templates.

The current product has five learning modes:

| Mode | Best for | What the learner receives |
| --- | --- | --- |
| **Reels** | A guided overview of a topic | A vertical, short-form 30-step lesson with narration and animated visual cards. |
| **Gaming** | Recall, classification, order, and relationships | One of eight playable micro-games with feedback and level completion. |
| **Comics** | Stories, metaphors, and high-level flows | A selectable comic universe with paginated, narrated panels. |
| **Browser** | Configuration and click-through procedures | A macOS-inspired browser lab with a guided form workflow and animated dock. |
| **GIF Learning** | Visual memory cues for a topic | A guided story where Alex explains the topic and inserts relevant GIPHY GIFs as visual cues. |

## Product flow

1. Select a learning mode in the sidebar.
2. Start a new session and enter a concise topic, such as `How binary search works`.
3. The way Gen_Z learn's sends the topic, active mode, and (when applicable) selected game template to `POST /generate`.
4. The backend generates and validates a structured response.
5. The frontend selects a fixed renderer for that response. The model provides lesson data, never arbitrary CSS, JavaScript, or React markup.
6. Sessions are stored locally in the browser so learners can return to earlier lessons in the same browser.

## Reels

Reels is a focused, phone-sized vertical feed in the middle of the lesson canvas—not a full-screen black panel. It is designed to teach one connected idea at a time.

### 30-step lesson structure

Every generated Reel lesson has exactly **30 ordered steps**:

| Steps | Purpose |
| --- | --- |
| 1–5 | Motivation, context, and foundations |
| 6–20 | Core mechanics in a logical sequence |
| 21–26 | Edge cases, trade-offs, and practical use |
| 27–30 | Practice, recap, and a memorable conclusion |

Each step contains a `title`, `hook`, `body`, `takeaway`, and `voiceover`. The Reels agent checks that all 30 steps are present, numbering is contiguous, required text exists, and titles and narration are not duplicated. If the AI response is incomplete or malformed, it returns a structured 30-step fallback lesson instead of a broken feed.

### Templates and animation system

There are **30 CSS card templates**. Their order is shuffled per lesson so a topic does not always look the same. Each template has a distinct colour, pattern, ornament, or composition, and is paired with a text-motion treatment.

The current animation pool includes:

- Typewriter reveal
- Word-by-word blur-in
- Masked slide reveal
- Pop-up words
- Cinematic fade
- Ticker and terminal-slide movement
- Number counter
- Anagram-style spacing transition
- Letter burst
- Underline reveal
- Scramble/glitch reveal
- Jello wobble
- Shimmer text
- Hand-drawn annotation
- Liquid text and ambient orb movement

Effects replay when a Reel becomes active. `prefers-reduced-motion` disables the motion while keeping all lesson text visible.

### Narration

Reels uses the browser's Speech Synthesis API. There is no voice dropdown in Reels. A different installed Microsoft Natural voice is randomly assigned to each Reel from the approved names:

- Ava, Andrew, Emma, Brian, Jenny, Guy, Aria
- Leah, Luke
- William Multilingual, Natasha, William

The narrator’s short name is displayed on the Reel and in the player header. If one of those voices is not installed or available in the browser, the Reel remains usable and advances without substituting an unapproved voice.

## Gaming

The Gaming mode starts with an **Auto pick** option and a popup picker for these eight templates:

| Template | Learning interaction |
| --- | --- |
| `CATCH_DROP` | Catch correct facts while avoiding believable decoys. |
| `WORD_DECODE` | Infer a term from concise clues. |
| `MAZE_ESCAPE` | Select safe decisions and learn why routes are correct or wrong. |
| `MEMORY_FLIP` | Match terms with definitions. |
| `SEQUENCE_SORT` | Put a process into its correct order. |
| `BINARY_JUMP` | Answer unambiguous True/False statements. |
| `SPACE_SHOOTER` | Clear ordered learning targets. |
| `CIRCUIT_CONNECT` | Link related concepts through correct relationships. |

### Game quality safeguards

Game generation is deliberately template-aware. The backend validates every generated level before it is shown:

- Selected templates are honoured; Auto pick selects a fitting one.
- Level counts, label lengths, time limits, and score targets are bounded.
- Sequence games require contiguous unique orders.
- Matching games require unique pairs.
- True/False, path, and classification games require valid correct and incorrect choices.
- Circuit links cannot be self-links or duplicates.
- Invalid AI output receives one repair attempt, then a safe playable fallback is used.

The frontend normalizes and de-duplicates game data again before rendering. This second boundary protects each game component from malformed API responses, missing fields, repeated labels, out-of-range timers, and edge cases in old saved sessions.

## Comics, Browser, and GIF Learning

### Comics

Comics lets the learner select one of eight visual universes: DC Justice, Marvel Mashup, Disney Classic, Tom & Jerry, Kick Buttowski, Stranger Things, Ben 10, or Glitch Rider. The backend generates structured panel dialogue and selects from a local canvas library; the renderer loads the matching CSS bundle and can continue the story for up to four pages. Speech synthesis can narrate panel dialogue.

### Browser Lab

Browser lessons are safe, simulated configuration walkthroughs. The renderer presents generated screens and fields inside a macOS-style workspace with Safari, a dock, supporting app previews, and a genie-style minimize animation. It validates the relevant select/radio choices in the browser; it does not operate a real cloud account or submit information to an external service.

### GIF Learning

GIF Learning is one connected explanation led by the default guide, Alex. The backend searches GIPHY Sticker Search with the learner’s topic and its meaningful keywords, then the lesson generator places each cue between Alex's introduction and follow-up explanation. Generic trending content is never used as a fallback, so the visual cues remain topic-specific. The UI shows a vertical story, not a GIF gallery: no GIF counter, creator metadata, or separate card grid is shown. A valid `GIPHY_API_KEY` is required in `backend/.env`.

## Architecture

```mermaid
flowchart LR
    U["Learner prompt"] --> FE["React + TypeScript UI"]
    FE --> API["FastAPI /generate"]
    API --> Direct{"Active mode"}
    Direct -->|"REELS"| RA["Reels agent"]
    Direct -->|"COMIC"| CA["Comic agent"]
    Direct -->|"GIF_LEARNING"| GFA["GIPHY agent"]
    Direct -->|"GAME / BROWSER"| Graph["LangGraph router"]
    Graph --> GA["Game agent"]
    Graph --> BA["Browser agent"]
    RA --> Contract["Structured content contract"]
    CA --> Contract
    GFA --> Contract
    GA --> Contract
    BA --> Contract
    Contract --> FE
```

### Backend

- **FastAPI** exposes generation and comic continuation endpoints.
- **LangGraph** routes Game and Browser requests to their specialized agents. Reels, Comics, and GIF Learning have direct mode-specific paths so their contracts stay clear.
- **LangChain Groq** supplies the LLM through `app/config.py`.
- Startup preloads the local comic canvas store. GIFs are fetched only when GIF Learning is requested.
- When `frontend/dist` exists, FastAPI serves the production React build and its assets from the same application.

### Frontend

- **React + TypeScript + Vite** provides the application shell and typed experience contracts.
- **Framer Motion** powers card, dialog, dock, and game transitions.
- **CSS templates** provide the visual variation; the model never returns executable UI code.
- **Local storage** persists sessions under `kf_sessions` on the current browser only.

## Reliability, scalability, and maintainability

### Reliable generation boundaries

The most important reliability rule is separation of content from rendering. Agents return JSON data and renderers own the UI. A malformed title cannot become arbitrary HTML or a broken stylesheet.

- Reels validates count, sequence, required fields, and uniqueness before use.
- Games validate their template-specific constraints, retry once, and fall back safely.
- Game renderers normalize data a second time at the client boundary.
- Comic generation sanitizes and partially parses structured JSON, then falls back to a simple panel when needed.
- Browser Lab is a client-side simulation, so it never executes shell commands or changes external cloud resources.

### Scalable composition

Each mode has an isolated backend agent and frontend renderer. This makes it possible to add one mode without rewriting the other modes. Data contracts live in `frontend/src/types/chat.ts`; supported game IDs are shared conceptually by the game agent, renderer, picker, and normalizer.

The approach scales vertically as well: a lesson can add more Reel templates, comic universes, game templates, or browser field types without allowing AI output to control application code.

### Maintainable extension points

To add a new **Reel visual template**:

1. Add or update its CSS selector in `frontend/src/index.css`.
2. Keep the `TEMPLATE_IDS` count aligned with the number of templates.
3. Add a reusable entry to `TEXT_EFFECTS` only when a new motion pattern is needed.
4. Preserve the reduced-motion rule.

To add a new **game template**:

1. Add its ID to `GameTemplate` in `frontend/src/types/chat.ts`.
2. Add it to `GAME_TEMPLATES`, the generation prompt, validation logic, and fallback data in `backend/app/agents/game_agent.py`.
3. Add normalization in `frontend/src/components/renderers/games/gameData.ts`.
4. Add the interactive component and route it from `GameRenderer.tsx`.
5. Add it to the picker in `App.tsx` and provide a visually distinct theme in `index.css`.

This checklist keeps the backend contract, defensive validation, and visual renderer in sync.

## API contracts

### `POST /generate`

Request:

```json
{
  "concept": "How binary search works",
  "active_folder": "REELS",
  "medium": "REELS",
  "template": null
}
```

Response fields:

```json
{
  "medium": "REELS",
  "template": "REELS_FEED",
  "title": "Binary Search: 30-step Reel Guide",
  "description": "A 30-step vertical Reel lesson about binary search.",
  "content": {}
}
```

Additional endpoints:

- `POST /generate-comic-page` — creates the next page in a selected comic universe.
- `GET /comic-clusters` — returns available comic cluster metadata.

## Run locally

### Prerequisites

- Python 3.10+
- Node.js 20+
- A Groq API key

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key
GIPHY_API_KEY=your_giphy_api_key
```

Start the backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

For frontend development in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

For a single-server production-style run, build the frontend first, then start FastAPI:

```bash
cd frontend
npm run build

cd ../backend
uvicorn main:app --port 8000
```

Open `http://localhost:8000` after the production build, or use the Vite URL during frontend development.

## Verification commands

```bash
cd frontend
npm run build
npm run lint

cd ../backend
python -m py_compile main.py app/agents/reels_agent.py app/agents/game_agent.py
```

## Repository layout

```text
backend/
  main.py                         FastAPI endpoints and static hosting
  app/agents/                     One generator per learning mode
  app/graph/                      LangGraph routing workflow and state
  app/db/                         Local comic canvas data store
frontend/
  src/components/renderers/       Mode renderers and individual game components
  src/components/layout/          Sidebar and shell components
  src/types/chat.ts               Shared UI data contracts
  src/index.css                   Global themes, game styles, and Reel templates
```
