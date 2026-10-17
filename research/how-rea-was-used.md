# How we used REA

REA is [morluto/rea](https://github.com/morluto/rea) (npm `rea-agents`, v6.5.0). We used it on public, logged-out higgsfield.ai pages only.

**Scope**
- Raw captures and exported scripts stayed in a session scratch directory, outside this repo. Nothing proprietary was committed.
- We used a throwaway browser profile and kept the debugging port on loopback.
- We did not log in, submit a form or call a private API.
- A Cloudflare passive script loaded on the page. We did not interact with it, and no CAPTCHA appeared.

## Commands, in order

| # | Command (paths shortened) | What it revealed |
|---|---|---|
| 1 | `npx -y rea-agents@latest --help` | Installed REA 6.5.0 and listed the browser commands. |
| 2 | Launched Chrome: `--headless=new --remote-debugging-port=9333 --user-data-dir=<scratch>/profile https://higgsfield.ai/cinema-studio` | A disposable CDP target for REA's passive tools. |
| 3 | `rea list-browser-targets http://127.0.0.1:9333 --format json` | One page target. /cinema-studio redirects to `/generate`, titled "Cinema Studio 4.0 — Direct Every Detail". |
| 4 | `rea inspect-web-page … --include-accessibility-text --include-script-sources` | The first pass captured only 23 scripts. 2,182 were excluded as `disallowed_origin`, which told us the app ships from a separate assets CDN. The accessibility tree showed the whole 4.0 composer: Film setup, Camera, Color palette, Lighting, Camera movement, 1080p, 16:9, 5s, audio, 1/4, cost. |
| 5 | Same as #4 with `--allowed-origins https://higgsfield.ai --allowed-origins https://assets.higgsfield.ai` (`ev_253e20dd352c`) | 2,184 scripts captured. |
| 6 | `rea export-web-scripts capture.json <scratch>/cinema-scripts` (`ev_30897511c085`) | Wrote the retained scripts plus a verified manifest to a fresh directory. |
| 7 | `rea analyze-web-bundle … --allowed-origins …` (`ev_80a92aa98b3f`) | All 2,184 scripts parsed with 0 failures (4.7 M AST nodes). It found 352 route candidates, 46 endpoint candidates and fingerprinted Vite. Routes include `/apps/angles`, `/apps/shots`, `/3d-jutsu`, `/apps/relight`, `/apps/zooms`. |
| 8 | `rea analyze-javascript-application <scratch>/cinema-scripts/files` | Stopped with `resource_constraint` at 1,711 of 2,184 files because the whole app was too large for one graph. This is a useful limit to know. |
| 9 | `rea analyze-javascript-application <scratch>/cinema-subset` on 86 chunks filtered by Cinema/Angles keywords (`ev_e61d37cbe8a7`) | Built an application graph of 3,944 nodes and 6,962 edges, plus a semantic graph with 13 request sites. From it we read: <br>• the `creative-controls` catalog types (genre, era, pacing, light, camera_model/lens/aperture, camera_movement) <br>• `/camera-movements` paging <br>• lighting and colour preset APIs <br>• the saved camera-rig tuple <br>• job types (`cinematic_studio_2_5/3_0/video_3_5/video_v2/image/image_grid`) <br>• **`/jobs/qwen-camera-control-v2` (+ `/batch`)** and the `/apps/qwen-camera-control` → `/apps/angles` redirect, which shows Angles runs on Qwen-Image-Edit camera control |
| 10 | `rea capture-browser-scenario cs_video_b.json` (`ev_fa82d5359027`) | A Playwright scenario that opens each picker and presses Escape, capturing the accessibility tree after every step. It recovered: <br>• all Camera Setup carousels (body, lens, aperture) <br>• the first page of Camera Movement <br>• Film setup genres <br>• Color palette and Lighting presets <br>• 480/720/1080p, 6 aspect ratios and the model list |
| 11 | Scenarios `genre`, `era` (`ev_0f82029c4715`) | Clicked "Next genre/era/tempo" to enumerate each carousel in full. |
| 12 | Scenarios `movelist`, `lightlist`, `palettelist` | Pressed End to load lazy pages. This gave 33 camera moves, 7 lighting presets and ≥50 palettes. |
| 13 | Scenarios `m35`, `m30`, `m25`, `image`, `misc` | Switched models to see the 3.5/3.0/2.5 composers (start/end frame, speed ramp, Director Panel), the Image tab (Soul Cinema plus the same optics) and the sort menu. Confirmed References and Elements are behind sign-up. |
| 14 | Scenario `angles` with `at_end: [dom]` (`ev_a9a1e6de39e7`) | **Angles 2.0 ranges from the DOM:** Rotation 0–315/45, Tilt −30..60/30, Zoom 0–10/5, plus the "12 best angles" batch. |
| 15 | Scenarios `shots`, `rot3d`, `relight` | Shots (9 angles → upscale 4K), 3D Rotation (360° video) and Relight (globe light, soft/hard, brightness, colour). |

A small helper script diffed the accessibility snapshots so each picker's contents could be read on their own. It lived in the scratch directory, not in this repo.

## What did not work, for honesty in the write-up
- **The cookie banner.** Clicking "Reject Non-Essential Cookies" timed out twice, so we ran the scenarios without dismissing it. The pickers still opened.
- **Genre scenario cleanup.** REA reported `cleanup_incomplete` but kept every step in `partial_observation`. We killed the orphaned browser by hand.
- **Whole-app graph.** It exceeds REA's result capacity. Filter to the feature chunks first.

## Paragraph for the demo video
> We started by pointing REA, an open-source reverse-engineering agent toolkit, at Higgsfield's public web app. REA captured the page's 2,000+ JavaScript chunks and statically mapped 352 routes and the API surface. Then it drove a headless browser to open every picker in Cinema Studio and Angles, reading the accessibility tree to get the exact feature surface: 33 camera moves, camera bodies, lenses and apertures, genre, era and tempo, lighting rigs, aspect ratios, and a 4-to-30-second duration range. It also found that Angles is a grid of 8 rotations × 4 tilts × 3 zooms, and that it is built on Qwen-Image-Edit camera control. We copied no code, prompts or assets. We took that behaviour map and rebuilt it open-source on ComfyUI, using open-weight models: Qwen-Image-Edit with the Multiple-Angles LoRA for the reshoot, and LTX with camera LoRAs for the move. The result is a direct-manipulation 3D camera rig that anyone can run, inspect and extend.
