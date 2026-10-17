#!/usr/bin/env node
// Validate ComfyUI API-format workflows against a dumped /object_info schema.
// No dependencies. Usage:
//   node scripts/validate-workflows.mjs [workflow.api.json ...]
//     --schema <path>   object_info.json (default workflows/schema/object_info.json)
//     --live <url>      fetch /object_info from a running ComfyUI instead (e.g. http://127.0.0.1:8188)
//     --strict          treat warnings as errors
// With no files, validates every workflows/*.api.json and workflows/manifest.json.
// Exit code 1 if any errors.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WF_DIR = join(ROOT, "workflows");

const args = process.argv.slice(2);
let schemaPath = join(WF_DIR, "schema", "object_info.json");
let liveUrl = null;
let strict = false;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--schema") schemaPath = args[++i];
  else if (args[i] === "--live") liveUrl = args[++i];
  else if (args[i] === "--strict") strict = true;
  else files.push(resolve(args[i]));
}

const objectInfo = liveUrl
  ? await (await fetch(liveUrl.replace(/\/$/, "") + "/object_info")).json()
  : JSON.parse(readFileSync(schemaPath, "utf8"));

const MODEL_EXT = /\.(safetensors|sft|ckpt|pt|pth|bin|gguf|onnx)$/i;
const WILDCARD = (t) => t === "*" || (typeof t === "string" && t.startsWith("COMFY_MATCHTYPE"));

// ---- schema helpers -------------------------------------------------------

// Normalise an input spec ([type, opts]) to { type, options|null, opts }.
function normSpec(spec) {
  const [t, opts = {}] = spec;
  if (Array.isArray(t)) return { type: "COMBO", options: t, opts };
  if (t === "COMBO") return { type: "COMBO", options: opts.options ?? [], opts };
  return { type: t, options: null, opts };
}

function isModelCombo(value, spec) {
  if (typeof value === "string" && MODEL_EXT.test(value)) return true;
  if (spec.opts.image_upload || spec.opts.video_upload || spec.opts.audio_upload) return true;
  if (spec.options.length === 0) return true; // folder-backed list, empty without weights
  return spec.options.some((o) => typeof o === "string" && MODEL_EXT.test(o));
}

// Expand a node's schema into a flat map of "inputName" -> {spec, required},
// resolving dynamic combos (choice-dependent) and autogrow groups from the actual inputs.
function expandInputs(group, inputs, prefix, out, errors, where) {
  for (const required of [true, false]) {
    const sect = required ? group.required : group.optional;
    if (!sect) continue;
    for (const [name, raw] of Object.entries(sect)) {
      const full = prefix + name;
      const [t, opts = {}] = raw;
      if (t === "COMFY_DYNAMICCOMBO_V3") {
        out[full] = { spec: { type: "COMBO", options: opts.options.map((o) => o.key), opts }, required };
        const chosen = inputs[full];
        const opt = opts.options.find((o) => o.key === chosen);
        if (opt?.inputs) expandInputs(opt.inputs, inputs, full + ".", out, errors, where);
      } else if (t === "COMFY_AUTOGROW_V3") {
        const tpl = opts.template;
        const names = tpl.names ?? [];
        const present = Object.keys(inputs).filter((k) => k.startsWith(full + "."));
        const sub = Object.entries(tpl.input.required ?? {})[0] ?? Object.entries(tpl.input.optional ?? {})[0];
        for (const k of present) {
          const leaf = k.slice(full.length + 1);
          if (names.length && !names.includes(leaf)) errors.push(`${where}: autogrow input "${k}" not in allowed names`);
          out[k] = { spec: normSpec(sub[1]), required: false };
        }
        const min = tpl.min ?? 0;
        if (required && present.length < min) errors.push(`${where}: "${full}" needs at least ${min} entr${min === 1 ? "y" : "ies"}`);
        out.__autogrow = (out.__autogrow ?? []).concat(full);
      } else {
        out[full] = { spec: normSpec(raw), required };
      }
    }
  }
  return out;
}

function typesCompatible(outType, inSpec) {
  if (WILDCARD(outType)) return true;
  if (inSpec.type === "COMBO") return outType === "COMBO" || outType === "STRING" || Array.isArray(outType);
  if (WILDCARD(inSpec.type)) return true;
  const ins = String(inSpec.type).split(",");
  const outs = String(outType).split(",");
  return outs.some((o) => ins.includes(o));
}

// ---- workflow validation --------------------------------------------------

function validateWorkflow(file) {
  const errors = [];
  const warnings = [];
  let wf;
  try {
    wf = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    return { errors: [`cannot parse: ${e.message}`], warnings, wf: null };
  }
  if (wf.nodes && wf.links) errors.push("this looks like a UI-format workflow, not API format");
  let hasOutput = false;

  for (const [id, node] of Object.entries(wf)) {
    const where = `node ${id} (${node.class_type})`;
    const info = objectInfo[node.class_type];
    if (!info) {
      errors.push(`node ${id}: unknown class_type "${node.class_type}"`);
      continue;
    }
    if (info.output_node) hasOutput = true;
    const inputs = node.inputs ?? {};
    const flat = expandInputs(info.input ?? {}, inputs, "", {}, errors, where);
    const autogrow = flat.__autogrow ?? [];
    delete flat.__autogrow;
    const hidden = new Set(Object.keys(info.input?.hidden ?? {}));

    for (const [name, { spec, required }] of Object.entries(flat)) {
      if (required && !(name in inputs)) {
        // widgets with a default are filled in by ComfyUI; links are not
        const isLinkType = !["INT", "FLOAT", "STRING", "BOOLEAN", "COMBO"].includes(spec.type);
        if (isLinkType || spec.opts.default === undefined) errors.push(`${where}: missing required input "${name}"`);
        else warnings.push(`${where}: required input "${name}" omitted (default ${JSON.stringify(spec.opts.default)} will be used)`);
      }
    }

    for (const [name, val] of Object.entries(inputs)) {
      const entry = flat[name];
      if (!entry) {
        if (!hidden.has(name) && !autogrow.some((g) => name.startsWith(g + "."))) warnings.push(`${where}: unknown input "${name}"`);
        continue;
      }
      const { spec } = entry;
      if (Array.isArray(val)) {
        // link: [sourceId, outputIndex]
        const [src, idx] = val;
        const srcNode = wf[String(src)];
        if (!srcNode) { errors.push(`${where}.${name}: links to missing node "${src}"`); continue; }
        const srcInfo = objectInfo[srcNode.class_type];
        if (!srcInfo) continue; // already reported
        if (!Number.isInteger(idx) || idx < 0 || idx >= srcInfo.output.length) {
          errors.push(`${where}.${name}: output index ${idx} out of range for node ${src} (${srcNode.class_type}, ${srcInfo.output.length} outputs)`);
          continue;
        }
        const outType = srcInfo.output[idx];
        if (!typesCompatible(outType, spec)) errors.push(`${where}.${name}: type mismatch — expects ${spec.type}, node ${src} output ${idx} is ${outType}`);
        continue;
      }
      // literal widget value
      const o = spec.opts;
      switch (spec.type) {
        case "INT":
        case "FLOAT":
          if (typeof val !== "number" || Number.isNaN(val)) { errors.push(`${where}.${name}: expected number, got ${JSON.stringify(val)}`); break; }
          if (spec.type === "INT" && !Number.isInteger(val)) errors.push(`${where}.${name}: expected integer, got ${val}`);
          if (o.min !== undefined && val < o.min) errors.push(`${where}.${name}: ${val} < min ${o.min}`);
          if (o.max !== undefined && val > o.max) errors.push(`${where}.${name}: ${val} > max ${o.max}`);
          break;
        case "BOOLEAN":
          if (typeof val !== "boolean") errors.push(`${where}.${name}: expected boolean, got ${JSON.stringify(val)}`);
          break;
        case "STRING":
          if (typeof val !== "string") errors.push(`${where}.${name}: expected string, got ${JSON.stringify(val)}`);
          break;
        case "COMBO":
          if (!spec.options.includes(val)) {
            if (isModelCombo(val, spec)) warnings.push(`${where}.${name}: "${val}" not installed locally (model/upload list)`);
            else errors.push(`${where}.${name}: "${val}" not one of [${spec.options.slice(0, 12).join(", ")}${spec.options.length > 12 ? ", …" : ""}]`);
          }
          break;
        default:
          if (WILDCARD(spec.type)) break; // match-type / any inputs accept literals
          errors.push(`${where}.${name}: ${spec.type} input must be a link, got literal ${JSON.stringify(val)}`);
      }
    }
  }
  if (!hasOutput) errors.push("workflow has no output node");
  return { errors, warnings, wf };
}

// ---- manifest validation --------------------------------------------------

function validateManifest(manifestPath, loaded) {
  const errors = [];
  const warnings = [];
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const [stage, def] of Object.entries(m)) {
    if (!def || typeof def !== "object" || !def.file) continue;
    const wfPath = join(dirname(manifestPath), def.file);
    if (!existsSync(wfPath)) { errors.push(`${stage}: file ${def.file} missing`); continue; }
    const wf = loaded[wfPath] ?? JSON.parse(readFileSync(wfPath, "utf8"));
    for (const [key, ref] of Object.entries(def.inputs ?? {})) {
      const node = wf[ref.node];
      if (!node) { errors.push(`${stage}.inputs.${key}: node ${ref.node} not in ${def.file}`); continue; }
      if (!(ref.field in node.inputs)) errors.push(`${stage}.inputs.${key}: node ${ref.node} has no input "${ref.field}"`);
      else if (Array.isArray(node.inputs[ref.field])) errors.push(`${stage}.inputs.${key}: ${ref.node}.${ref.field} is a link, not a settable widget`);
    }
    for (const [key, id] of Object.entries(def.outputs ?? {})) {
      const node = wf[id];
      if (!node) errors.push(`${stage}.outputs.${key}: node ${id} not in ${def.file}`);
      else if (!objectInfo[node.class_type]?.output_node) errors.push(`${stage}.outputs.${key}: node ${id} (${node.class_type}) is not an output node`);
    }
    // every model referenced in the workflow should be listed in models[]
    const listed = new Set((def.models ?? []).map((x) => x.file));
    for (const [id, node] of Object.entries(wf)) {
      for (const [name, val] of Object.entries(node.inputs ?? {})) {
        if (typeof val === "string" && MODEL_EXT.test(val) && !listed.has(val)) errors.push(`${stage}: node ${id}.${name} uses "${val}" which is not in models[]`);
      }
    }
    for (const x of def.models ?? []) if (!x.url?.startsWith("https://")) errors.push(`${stage}.models: ${x.file} has no https url`);
  }
  for (const mv of m.cameraMoves ?? []) {
    if (mv.lora && !m.move?.models?.some((x) => x.file === mv.lora)) errors.push(`cameraMoves.${mv.id}: lora ${mv.lora} not in move.models`);
  }
  return { errors, warnings };
}

// ---- main -----------------------------------------------------------------

const targets = files.length
  ? files
  : readdirSync(WF_DIR).filter((f) => f.endsWith(".api.json")).map((f) => join(WF_DIR, f));

let totalErr = 0;
let totalWarn = 0;
const loaded = {};
const report = (label, { errors, warnings }) => {
  totalErr += errors.length;
  totalWarn += warnings.length;
  const status = errors.length ? "FAIL" : "ok";
  console.log(`\n${status}  ${label}  (${errors.length} errors, ${warnings.length} warnings)`);
  for (const e of errors) console.log(`  ERROR  ${e}`);
  for (const w of warnings) console.log(`  warn   ${w}`);
};

console.log(`schema: ${liveUrl ?? schemaPath} (${Object.keys(objectInfo).length} node classes)`);
for (const f of targets) {
  const r = validateWorkflow(f);
  if (r.wf) loaded[f] = r.wf;
  report(basename(f), r);
}
const manifestPath = join(WF_DIR, "manifest.json");
if (!files.length && existsSync(manifestPath)) report("manifest.json", validateManifest(manifestPath, loaded));

console.log(`\n${totalErr} error(s), ${totalWarn} warning(s)`);
process.exit(totalErr || (strict && totalWarn) ? 1 : 0);
