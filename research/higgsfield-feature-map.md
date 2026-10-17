# Higgsfield feature map: Cinema Studio and Angles

Captured 2026-10-16 from **public, logged-out** higgsfield.ai pages only. We never logged in, never submitted a form, and never called a private API. Clicks only opened pickers and popovers. When a click hit the sign-up wall (References, Elements), we recorded it and stopped there.

This is a map of behaviour: controls, option labels, ranges and flow. We saved no source code, prompt text, media or brand assets to the repo. Raw captures stay in the session scratchpad, outside the repo.

**Confidence levels**
- **H (observed):** read from the rendered accessibility tree or DOM via REA.
- **M (static):** read from the shipped JS bundle via REA. The code exists, but it may not be live.
- **L (third-party):** from a review or guide, not verified by us.

**Evidence IDs.** These are REA Evidence IDs, shortened to their first 12 hex characters.

| Short | What |
|---|---|
| `ev_253e20dd352c` | `inspect-web-page` on /cinema-studio with script sources: 2,184 scripts from 2 origins |
| `ev_80a92aa98b3f` | `analyze-web-bundle` on the same page: 2,184 parsed, 0 parse failures, 352 routes, 46 endpoints |
| `ev_30897511c085` | `export-web-scripts`, from the capture to a local directory |
| `ev_e61d37cbe8a7` | `analyze-javascript-application` on an 86-chunk Cinema/Angles subset |
| `ev_fa82d5359027` | Scenario: Cinema Studio 4.0, opening every picker |
| `ev_0f82029c4715` | Scenario: Film setup, Era and Tempo carousels |
| genre partial | Scenario: genre carousel. Its cleanup timed out, so the steps were kept in `partial_observation` |
| `ev_45120e57f70b` / `ev_41cb20179deb` / `ev_f489667b93cb` | Scenarios: full lists for camera moves, lighting and palettes |
| out_m35 / m30 / m25 / image / misc | Scenarios: switching models (3.5, 3.0, 2.5), Image tab, sort menu, audio toggle |
| `ev_a9a1e6de39e7` | Scenario: /apps/angles, with accessibility and DOM |
| `ev_bc810c0d5cbc` / `ev_d415b9c0ccd4` / `ev_200aaa48e5f0` | Scenarios: /apps/shots, /apps/3d-rotation, /apps/relight |
| HC | higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-cinema-studio (public help page) |

---

## 1. Cinema Studio

### Information architecture
- `/cinema-studio` redirects to `/generate`. The page title is "Cinema Studio 4.0 — Direct Every Detail". **H** `ev_253e20dd352c`
- **Layout.** A left sidebar holds projects (Home, My elements, My favorites, Community, New project, search and sort). The centre shows a hero and a feed. A composer docks at the bottom. **H**
- The composer has an **Image | Video** tab switch. Video is selected by default. **H**
- The stack is TanStack Start plus Vite, with Clerk auth and PostHog analytics. Chunks are served from a separate assets CDN origin. **M** `ev_80a92aa98b3f`

### User flow in 4.0 Video mode, step by step
**H** `ev_fa82d5359027` unless noted otherwise.
1. **References (0/50).** Add images, videos or cast. This is gated behind the sign-up modal. HC confirms the limit is up to 50.
2. **Film setup [Auto].** A dialog with tabs Genre, Era and Tempo, plus "Reset all".
3. **Camera [Auto].** A dialog with tabs **Setup** and **Movement**:
   - Setup has three carousels: Camera, Lens and Aperture.
   - Movement is a grid of video-thumbnail cards. Each card has a "Put on prompt" action.
   - Helper text says moves are added to the prompt box (or by typing `#`), that several moves per shot are allowed, and that order matters.
4. **Color palette [Auto].** A searchable, sortable library of named looks, plus "New palette".
5. **Lighting [Auto].** Presets plus "New lighting preset", which opens a custom light editor.
6. **Prompt box.** It references characters and locations with `@`, and camera moves with `#`.
7. **Bottom bar.** In order: model picker, resolution, aspect ratio, duration, audio toggle, batch stepper, and GENERATE showing the credit cost.

### Controls in 4.0

| Control | Type | Options / range | Conf / source |
|---|---|---|---|
| Mode | tabs | Image, Video | H |
| References | picker | 0–50 | H count, HC limit |
| Elements | picker | characters, locations, props (sign-up gated) | H gated, HC contents |
| Genre | carousel | Auto (shown as "General"), Epic, Drama, Noir, Comedy, Horror, Action | H genre partial |
| Era | carousel | Auto, 1960s, 1980s, 1990s, 2000s, 2020s | H `ev_0f82029c4715` |
| Tempo | carousel / listbox | Auto, Single shot, Calm, Dynamic, Chaotic | H |
| Camera (body) | carousel | Auto, Modern, 35mm Film, 8mm Film, DV Camcorder | H |
| Lens | carousel | Auto, Clean Sharp, Anamorphic, Vintage Anamorphic, Warm Vintage, Halation Vintage | H |
| Aperture | carousel | Auto, f/1.4 Wide Open, f/4 Moderate, f/11 Deep Focus | H |
| Camera movement | multi-select grid, ordered, inserted into prompt | 33 moves (taxonomy.json). Sort by Default or Name (A–Z), plus search | H `ev_45120e57f70b` |
| Color palette | library plus user-created looks | ≥50 named looks, New palette, pin/sort/search | H `ev_f489667b93cb`; `/color-presets/*` M |
| Lighting | presets plus custom | Auto, Silhouette, Practicals, Window, Overhead fall, Contre jour, Soft cross | H `ev_41cb20179deb` |
| Custom light | globe gizmo, multiple lights | pitch −90..90 and azimuth −180..180, snapped to 45° (26 named directions); brightness 0–100 (default 50); diffuse 0–100 (default 50); colour hex (default #FFFFFF) | M (light model chunk) |
| Model | menu | Cinema Studio 4.0 / 3.5 / 3.0 / 2.5, plus about 20 third-party video models | H |
| Resolution | menu | 480p, 720p, 1080p (default 1080p) | H |
| Aspect ratio | menu | 1:1, 3:4, 9:16, 4:3, 16:9, 21:9 (default 16:9) | H |
| Duration | slider | 4–30 s (default 5) | H (DOM aria-valuemin=4, aria-valuemax=30) |
| Audio | toggle | On / Off | H (label flips On→Off; we infer it controls audio) |
| Batch | stepper | 1–4 | H |
| Cost | label | "GENERATE 80" at the defaults | H |
| Character emotion slider | slider | not seen while logged out | L HC |
| Video modes | — | References, Forward/Backward Extend, Edit Video | L HC |

**Data model (M, `ev_e61d37cbe8a7`).**
- The creative controls come from one server catalog: `/cinema-studio-4-0/creative-controls?type=…`.
- Its types are `genre`, `era`, `pacing`, `light`, `camera_model`, `camera_lens`, `camera_aperture` and `camera_movement`.
- Each item has `value`, `display`, `thumbnail` and `is_auto`. Auto is the default (the `is_auto` flag), otherwise the first item.
- Camera moves are paged from `/camera-movements` (21 per page).
- Lighting presets live at `/lighting-presets/*` (with-presets, pinned, CRUD) and colour presets at `/color-presets/*`.
- Saved camera rigs are POSTed to `/camera-settings` as a `{camera, lens, focal_length, aperture}` id tuple. `/camera-settings/recommended` suggests a rig.

**Analytics events (M).** These confirm the UX steps:
- `cinematic_studio_camera_select`, `_lens_select`, `_focal_length_select`, `_aperture_select`
- `_camera_movement_select`, `_mode_toggle`, `_batch_select`
- `_preset_save_click`, `_preset_load`, `_preset_explore_click`
- `_image_3d_recomposition`, `_image_grid`

### Older versions, selectable in the model menu (H)

| Version | Tagline in the menu | Composer differences observed |
|---|---|---|
| 3.5 | "Camera selection, style presets, and AI director" | "Style: Auto" and "Camera: Auto" chips; aspect Auto; duration 8 s; cost 104 |
| 3.0 | "Enhanced camera and speed ramp control" | "Director's Panel"; aspect Auto; 8 s; a "Smart" toggle; cost 104 |
| 2.5 | "Camera movements with start frame" | "Director Panel" (characters, speed, genres, scene flow); **Start Frame** plus optional **End Frame**; speed ramp (Auto); duration slider (default 4 s); genre chip; "Single shot"; cost 8 |

- **3.0 speed ramps (L HC):** Auto, Linear, Flash In, Flash Out, Slow-mo, Bullet Time, Impact, Ramp Up. 3.0 also takes up to 9 references and generates audio in the same pass.
- **3.5 (L HC plus third parties):**
  - Per-shot optics: camera, lens, focal length and aperture. Third parties list focal lengths of 8/14/35/50/75 mm and bodies RED V-Raptor, Sony Venice, ARRI Alexa, IMAX and Panavision DXL2. Unverified.
  - Global look: 8 palettes, 6 lighting presets and 10 "MoveSet" styles.
  - An LLM "AI Director" splits a script into shots.

**Job routing (M).** The bundle posts to:
- `/jobs/v2/cinematic_studio_2_5`, `…_3_0`, `…_video_3_5`, `…_video_v2`
- `…_image`, `…_image_grid`
- `soul_location`

### Image mode (H)
- Default model: "Higgsfield Soul Cinema". The menu also lists AI Cast, Cinematic Locations and about 20 third-party image models.
- Resolution 2k, batch stepper, "Color transfer (New)", Character slot, "Camera Lens · Auto", cost 0.125.
- The "Camera Lens" dialog ("Camera settings") has the same Camera, Lens and Aperture carousels as video mode.
- Events hint at image 3D recomposition and a grid output (M).

### Which models it routes to (evidenced only)
- **H:** The model menu lists Cinema Studio 4.0/3.5/3.0/2.5 as "Cinematic models". Third-party models sit beside them in the same composer, including Seedance 2.5/2.0, Kling 3.0, Wan 3.0, MiniMax, FLUX.3 Video, Gemini Omni Flash, Grok Imagine and Veo.
- **H:** The promo banner pushes "Unlimited Seedance 2.5".
- We found **no evidence** of which base model sits under "Cinema Studio 4.0". Treat it as unknown.

---

## 2. Angles, Shots and related apps

### Angles 2.0 (`/apps/angles`)
- **H** `ev_a9a1e6de39e7`. Heading "Angles", subtitle "Generate new camera angles from a single photo". The breadcrumb reads "Apps / Angles 2.0".
- **Flow:**
  1. Upload media (a single image).
  2. A 3D camera gizmo around a cube appears ("Hold and drag to change camera angle"), with 4 icon buttons. We infer these are nudge or step controls.
  3. Optionally tick **"Generate from 12 best angles"**.
  4. Or set three sliders: **Rotation** 0–315° (step 45, so 8 values), **Tilt** −30..60° (step 30, so 4 values), **Zoom** 0–10 (step 5, so 3 values). These come from the DOM `<input type=range>` attributes. **H**
  5. Press "Generate". The button shows 0.2.
- **Pose space:** 8 × 4 × 3 = **96 discrete poses**. This matches the azimuth, elevation and distance grid of the open *Qwen-Image-Edit Multiple-Angles* camera LoRA.
- **Model routing (M, strong):**
  - The bundle redirects `/apps/qwen-camera-control` permanently to `/apps/angles`.
  - It rewrites `/angles` to the app slug `qwen-camera-control`.
  - Jobs are POSTed to **`/jobs/qwen-camera-control-v2`** (single) and **`/jobs/qwen-camera-control-v2/batch`** (12 best angles).
  - So Angles is a Qwen-Image-Edit camera-control product.
- **Output:** images in a job feed (job sets). We could not see output resolution without logging in.

### Shots (`/apps/shots`)
- **H** `ev_bc810c0d5cbc`. A three-step wizard: **1 Upload, 2 Grid, 3 Upscale**.
- "Upload one image, get 9 cinematic angles. Select your favorites and upscale to 4K."
- Bundle meta says it turns a single reference photo into storyboard shots from essential cinematic angles (M).

### 3D Rotation (`/apps/3d-rotation`)
- **H** `ev_d415b9c0ccd4`. Upload a PNG or JPG. Pick a generation type (2 icon radios). "Generate Video", cost 15.
- The output is a 360° spin video of the subject.

### Relight (`/apps/relight`)
- **H** `ev_200aaa48e5f0`. Upload. Quick select Top, Front, Right, Left, Back or Bottom. Drag a globe to set light direction.
- Light settings: soft or hard; Brightness % (default 50); colour hex (default #FFFFFF). Generate, cost 2.
- This is the same light model as the Cinema Studio custom light.

### Other related surfaces seen in the route table (M `ev_80a92aa98b3f`)
`/3d-jutsu` (3D scene builder, labelled "New" in the nav), `/apps/zooms`, `/apps/transitions`, `/katana`, `/ai/video/reframe`, `/ai/video/motion`.

---

## 3. Gaps in this capture
- We did not see logged-in-only surfaces: References and Elements pickers, the AI Director chat, Extend and Edit Video modes, the emotion slider, output files and the actual credit pricing.
- The palette and move lists are what loaded after six End-key scrolls. The palette library may be longer.
- We observed no 3.5 focal-length list directly. That row is L confidence.
