# What to match first, and where we can beat them

Source: higgsfield-feature-map.md and taxonomy.json. Features are ranked by how much "feels like Higgsfield" each one buys per hour of build time, given our pipeline (Qwen-Image-Edit Multiple-Angles → LTX image-to-video + camera LoRAs → grade).

## Ranked: match these first

1. **Angles-style reshoot on a 96-pose grid.**
   - Rotation 0–315 in 8 steps of 45°, Tilt −30/0/30/60, Zoom 0/5/10, with a drag gizmo plus three snapping sliders.
   - Their grid is the same as the open Multiple-Angles LoRA's, so parity is nearly free and the evidence is strong (`/jobs/qwen-camera-control-v2`).
   - Add a "12 best angles" batch button that renders a contact sheet.
2. **A camera-movement picker with thumbnail cards.**
   - Show looping preview videos, allow several moves per shot in order, and insert them into the prompt with `#`.
   - Ship about 10 first: Static shot, Dolly in, Dolly out, Truck left, Truck right, Crane up, Crane down, Drone orbit/Arc, Handheld, Dolly zoom. Each maps to an LTX camera LoRA or a prompt plus LoRA combination. Expand toward their 33 later.
3. **The composer bar.**
   - Resolution 480p/720p/1080p; aspect ratios 1:1, 3:4, 9:16, 4:3, 16:9, 21:9; duration slider (LTX-feasible, e.g. 4–10 s); batch 1–4; live cost label.
   - It is cheap to build, and it is what makes the app *read* as Higgsfield at a glance.
4. **"Camera" Setup carousels.**
   - Body (Modern, 35mm Film, 8mm Film, DV Camcorder), Lens (Clean Sharp, Anamorphic, Vintage/Warm/Halation), Aperture (f/1.4, f/4, f/11). Every carousel defaults to Auto.
   - Implement these as prompt fragments plus post-processing: grain or gate weave for film, halation and bloom, anamorphic squeeze and flares, depth-of-field strength.
5. **Film setup: Genre, Era, Tempo.**
   - Genre: Epic, Drama, Noir, Comedy, Horror, Action. Era: 1960s–2020s. Tempo: Single shot, Calm, Dynamic, Chaotic.
   - These are pure prompt and grade presets, so they add perceived depth for almost no cost.
6. **Lighting presets plus a custom globe light.**
   - Presets: Auto, Silhouette, Practicals, Window, Overhead fall, Contre jour, Soft cross.
   - The custom light is a direction on a 45° globe, brightness 0–100, diffuse 0–100 and a colour. It reuses our three.js rig: one gizmo for both camera and light.
7. **Colour palettes / grades.** Ship about 8 of our own named looks as LUTs or post nodes, plus "New palette" from a reference image (colour transfer).
8. **Save and load rigs.** Their saved camera rig is a `{camera, lens, focal, aperture}` tuple. Ours can be the full shot spec as JSON.
9. **Start frame and optional end frame** (their 2.5 flow). LTX supports first- and last-frame conditioning.
10. **The Shots wizard.** One image becomes a 3×3 grid of angles, then you pick favourites and upscale. This is just Angles batch plus an upscale node.

Defer: References up to 50, Elements/cast, AI Director script-to-shots, Extend and Edit Video, 4K, and 30-second clips.

## Where an open version can beat them

- **True direct manipulation.**
  - Their angle control is a cube gizmo snapped to presets. Ours is a real 3D viewport with a frustum preview over a depth-projected proxy of the uploaded image.
  - It also shows the exact (azimuth, elevation, distance) values that are sent to the model.
- **One rig for angle, move and light.** Higgsfield splits these across Angles, Cinema Studio's Movement tab and Relight. We put camera path keyframes and light direction in one scene, and compile it into model parameters.
- **Transparent "compile" view.** Show the generated ComfyUI graph, LoRA weights and prompt fragments for every shot. Users can export the workflow JSON and run it locally. Higgsfield is a black box.
- **Continuous values where the model allows them.** Offer interpolated rotations between the 45° stops (blend LoRA prompts or do a two-step reshoot), plus custom focal length instead of three apertures.
- **Moves as editable curves.** Show the ordered move list ("several per shot; order matters") on a timeline with per-move duration and easing, instead of prompt tags.
- **Cost honesty.** Open weights mean no credits paywall for self-hosters, and we can show the real Comfy Cloud seconds per job.
- **Reproducibility.** Seed, workflow hash and a shareable shot-spec URL make any result re-renderable.
- **Extensible taxonomy.** taxonomy.json drives the UI. The community can add moves, lenses and grades with a pull request, with no redeploy of model code.
