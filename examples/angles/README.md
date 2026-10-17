# Angle stage — real outputs

Rendered locally on an Apple M1 Max (64 GB) with `angle.gguf.api.json` (Qwen-Image-Edit-2511 Q8_0 GGUF +
Multiple-Angles LoRA + Lightning 4-step LoRA), submitted by the web app through `@comfyorg/sdk` →
comfy-api-proxy → ComfyUI 0.41. Seed 1234 (UI take: random seed). About 5.1–5.4 minutes per still on the M1 Max.

| File | Prompt |
|---|---|
| `_source.jpg` | Input. *Marble bust of a youth*, The Metropolitan Museum of Art, Open Access (CC0). |
| `front-left_eye_medium.png` | `<sks> front-left quarter view eye-level shot medium shot` |
| `right_low_wide.png` | `<sks> right side view low-angle shot wide shot` |
| `front_high_close.png` | `<sks> front view high-angle shot close-up` |
| `back-left_elevated_medium.png` | `<sks> back-left quarter view elevated shot medium shot` (rolled from the UI) |

Unedited outputs. Views the source never shows (the back) are invented by the model.
