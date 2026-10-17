# Open Higgsfield — ComfyUI workflows

API-format graphs that the web app submits (via the Comfy SDK) to Comfy Cloud or a local ComfyUI.
`manifest.json` is the contract: it maps friendly input names (`image`, `prompt`, `seed`, …) to
`{node, field}` in each graph, names the output node, and lists every weight with its download URL,
size and license. `ui/*.json` are the same graphs in ComfyUI's editor format, for people who want to
open them in ComfyUI.

All graphs use **core ComfyUI nodes only** (checked against ComfyUI 0.41.0, frontend 1.55.17). There
are no custom node packs and no partner/API nodes. Each graph is based on an official Comfy-Org
`workflow_templates` graph, flattened from its subgraph, with the inputs exposed.

| Stage | File | Based on template | Model |
|---|---|---|---|
| Angle | `angle.api.json` | `template_qwen_multiangle.app` | Qwen-Image-Edit-2511 + Multiple-Angles LoRA + Lightning 4-step LoRA |
| Move | `move.api.json` | `video_ltx2_i2v` (camera-LoRA variant) | LTX-2 19B dev fp8 + official camera-control LoRAs, 2-pass |
| Move, LTX-2.5 (optional) | `move_ltx25.api.json` | `video_ltx2_5_i2v` | LTX-2.5 22B distilled, prompt-only camera moves |
| Reshoot (stretch) | `reshoot.api.json` | `video_ltx2_3_ic_lora` | LTX-2.3 22B distilled fp8 + CrossView-Prompt IC-LoRA |

## Angle: new still from a new camera position

`LoadImage → FluxKontextImageScale → TextEncodeQwenImageEditPlus (+ reference latents) → KSampler → SaveImage`.
The model chain is UNET → Multiple-Angles LoRA → ModelSamplingAuraFlow(3.1) → CFGNorm → Lightning LoRA,
the same order the official template uses.

The prompt is built only from the LoRA's fixed vocabulary
([model card](https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA)):

```
<sks> {azimuth} {elevation} {distance}
e.g. <sks> front-right quarter view eye-level shot medium shot
```

- 8 azimuths: front, front-right quarter, right side, back-right quarter, back, back-left quarter, left side, front-left quarter (every 45°)
- 4 elevations: low-angle (−30°), eye-level (0°), elevated (30°), high-angle (60°)
- 3 distances: close-up (×0.6), medium shot (×1.0), wide shot (×1.8)

That gives 96 combinations. `manifest.angleGrammar` has the tokens and the snapping rule. The snapping
rule matches the buckets in ComfyUI's core `CameraAngle` node (`comfy_extras/nodes_camera_angle.py`).
The web rig sends the prompt string directly, so the graph doesn't need that node. The official template
leaves out `<sks>`. The model card uses it, so we keep it.

- **Speed (default):** Lightning strength 1, 4 steps, cfg 1.
- **Quality:** `lightningStrength` 0, 40 steps, cfg 4.

## Move: image to video with a camera move

LTX-2 is used because it is the only LTX generation with **official camera-control LoRAs**. They are
trained for LTX-2 19B and are not compatible with the 22B LTX-2.3 or LTX-2.5.

- **Stage 1:** dev model + camera LoRA at half resolution, 20 steps, cfg 4.
- **Stage 2:** 2× latent upscale, then a 3-step refine with the distilled LoRA. The start frame is re-applied in both stages.
- **Audio:** on. LTX-2 is an audio+video model, so the soundtrack is generated with the video and muxed into the mp4.
- **Sizes:** `frames` must be 8n+1. Width and height should be multiples of 64. The start image is center-cropped to that size.

To use the `cameraLora` slot (`node 11`), set `lora_name` to a file from `cameraMoves[].lora`. For prompt-only
moves (`lora: null`), leave the default file and set `cameraLoraStrength` 0. Lightricks recommends
describing where the move *ends* ("…ending on a close-up").

Official camera LoRAs (Lightricks, LTX-2 Community License):

| Move | HF repo | File | Size |
|---|---|---|---|
| Dolly in | `Lightricks/LTX-2-19b-LoRA-Camera-Control-Dolly-In` | `ltx-2-19b-lora-camera-control-dolly-in.safetensors` | 0.33 GB |
| Dolly out | `…-Dolly-Out` | `ltx-2-19b-lora-camera-control-dolly-out.safetensors` | 0.33 GB |
| Dolly left | `…-Dolly-Left` | `ltx-2-19b-lora-camera-control-dolly-left.safetensors` | 0.33 GB |
| Dolly right | `…-Dolly-Right` | `ltx-2-19b-lora-camera-control-dolly-right.safetensors` | 0.33 GB |
| Jib up | `…-Jib-Up` | `ltx-2-19b-lora-camera-control-jib-up.safetensors` | 2.21 GB |
| Jib down | `…-Jib-Down` | `ltx-2-19b-lora-camera-control-jib-down.safetensors` | 2.21 GB |
| Static | `…-Static` | `ltx-2-19b-lora-camera-control-static.safetensors` | 2.21 GB |

Orbit, pan, tilt and handheld have no official LoRA, so they are prompt-only.

`move_ltx25.api.json` is an optional higher-quality path on the newest open-weights LTX (2.5, distilled,
2-pass). It has no camera LoRA slot because none exist for 2.5. It takes `duration` in seconds instead of
`frames`. The official template's Gemma-4 prompt enhancer was removed.

## Reshoot (stretch): re-shoot an existing clip from a new angle

This uses [Cseti/LTX2.3-22B_IC-LoRA-CrossView-Prompt](https://huggingface.co/Cseti/LTX2.3-22B_IC-LoRA-CrossView-Prompt)
(Apache-2.0, v0.9 proof of concept) on the official LTX-2.3 IC-LoRA graph. The source clip is the IC-LoRA
reference guide (`LTXVAddGuide` + `GetICLoRAParameters`) and the prompt picks the new viewpoint:

```
crossview. new camera angle: {azimuth}, {elevation}, {distance}.
azimuth:   far to the left | to the left | slightly to the left | same angle | slightly to the right | to the right | far to the right
elevation: lower | same height | higher
distance:  closer | same distance | further          (63 trained combinations)
```

- **LoRA strength:** 1.3. The LoRA was trained on the dev model; the card suggests 1.2–1.5 on distilled.
- **Pass and size:** single pass at 960×544.
- **Audio:** the source clip's audio is kept.
- **Big moves:** chain small steps.

The author's own workflow needs six custom node packs. This version needs none. The sibling **CrossView-Warp**
LoRA gives more precise angles but needs the `ComfyUI-CrossViewWarp` custom node, so it is skipped.

## Models and licenses

| Weight | Folder | Size | License | Open weights? |
|---|---|---|---|---|
| qwen_image_edit_2511_int8_convrot | diffusion_models | 20.50 GB | Apache-2.0 | yes |
| qwen-image-edit-2511-multiple-angles-lora (fal) | loras | 0.30 GB | Apache-2.0 | yes |
| Qwen-Image-Edit-2511-Lightning-4steps (lightx2v) | loras | 0.85 GB | Apache-2.0 | yes |
| qwen_2.5_vl_7b_fp8_scaled | text_encoders | 9.38 GB | Apache-2.0 | yes |
| qwen_image_vae | vae | 0.25 GB | Apache-2.0 | yes |
| ltx-2-19b-dev-fp8 | checkpoints | 27.08 GB | LTX-2 Community License | yes, with conditions ¹ |
| ltx-2-19b-distilled-lora-384 | loras | 7.67 GB | LTX-2 Community License | yes, with conditions ¹ |
| ltx-2-spatial-upscaler-x2-1.0 | latent_upscale_models | 1.00 GB | LTX-2 Community License | yes, with conditions ¹ |
| 7 × LTX-2 camera-control LoRAs | loras | 0.33–2.21 GB each (8.0 GB total) | LTX-2 Community License | yes, with conditions ¹ |
| gemma_3_12B_it_fp4_mixed (LTX-2/2.3 text encoder) | text_encoders | 9.45 GB | Gemma Terms of Use | yes, with conditions ² |
| ltx-2.5 transformer / gemma4 TE / VAEs / upscaler | various | 39.70 GB | LTX-2.x Community License, **gated on HF** | yes, with conditions ¹ |
| ltx-2.3-22b-distilled-fp8 | checkpoints | 29.53 GB | LTX-2 Community License | yes, with conditions ¹ |
| CrossView-Prompt IC-LoRA (Cseti) | loras | 0.10 GB | Apache-2.0 | yes |

¹ The weights are public and downloadable. They are free for entities under $10M annual revenue; a paid
commercial license is needed above that. They are not OSI-open.
² Gemma weights are public, but the Gemma Terms of Use and prohibited-use policy apply. They are not OSI-open.

Nothing here is closed or API-only, so every stage qualifies as open weights. If the "Open Weights"
judges require permissive licenses only, the angle stage is fully Apache-2.0. Every LTX path carries
the LTX community license, and LTX-2/2.3 also carry Gemma terms.

## Download sizes (`scripts/fetch-models.sh --list <stage>`)

| Stage | Size |
|---|---|
| angle | **31.3 GB** |
| move | 53.2 GB (45.5 GB with one camera LoRA, via `CAMERA_LORAS=dolly-in`) |
| moveLtx25 | 39.7 GB (gated: needs `HF_TOKEN`) |
| reshoot | 39.1 GB (the Gemma-3 text encoder is shared with move) |

## Tooling

- `node scripts/validate-workflows.mjs` validates every `*.api.json` and `manifest.json` against
  `schema/object_info.json`. The `schema/object_info.json` file is a dump of `GET /object_info`.
  Pass `--live http://127.0.0.1:8188` to validate against a running server instead.
  - **Errors:** unknown nodes, missing required inputs, dangling links, wrong output index or type, and out-of-range or invalid combo values.
  - **Warnings:** model filenames and upload filenames that aren't installed.
- `scripts/fetch-models.sh [angle|move|moveLtx25|reshoot]` downloads the weights into `~/ComfyUI-openhiggs/models`.
- `scripts/local-stack.sh start` starts ComfyUI on :8188 and comfy-api-proxy on :8189.
  Set `COMFY_BASE_URL=http://127.0.0.1:8189` to point the SDK at the local install.

## Known gaps

- **No real generations yet.** No weights were downloaded. All graphs passed ComfyUI's own `/prompt`
  validation using zero-byte placeholder weights, and failed only at weight loading, as expected.
- **Cloud availability is unconfirmed.** Filenames match the official templates, so they are the most
  likely to be preinstalled on Comfy Cloud. That still needs checking on Cloud.
- **Apple Silicon:** int8_convrot and fp8/fp4 weights are untested on MPS. If they fail locally on an
  M-series Mac, use `qwen_image_edit_2511_bf16.safetensors` (40.9 GB) for the angle stage. LTX 19B/22B
  video on a Mac is impractical, so run move and reshoot on Comfy Cloud.
