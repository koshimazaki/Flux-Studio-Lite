import { useReducer, useRef } from "react";
import {
  defaultCamera,
  cameraClauses,
  type CameraSelection,
  type CameraEdits,
  type CameraTermId,
} from "../shared/camera";
import { presets } from "../shared/legacy-camera";
import type { GenerateInput, Job, Source } from "../shared/types";
import { featuredSource, librarySetupJob } from "./library";
export type ComposerState = Omit<GenerateInput, "presetId" | "cameraText"> & {
  camera: CameraSelection;
  cameraEdits: CameraEdits;
  sourceId: string;
  upscalePrompt: string;
};
/**
 * A composer with no run loaded. Only reached when the shipped catalogue has no
 * usable first clip, which `tests/composer.test.ts` fails on rather than letting
 * the studio open on an invented scene.
 */
const emptyComposer: ComposerState = {
  generator: "video",
  description: "",
  cameraEnabled: true,
  camera: defaultCamera,
  cameraEdits: {},
  draft: false,
  duration: 5,
  aspectRatio: "16:9",
  resolution: "hd",
  sourceId: "",
  upscalePrompt: "",
  upscaleFactor: 2,
  upscaleCreativity: 0,
};
/**
 * The composer state a catalogue clip's recorded run restores, through the same
 * reducer action Recreate uses. One path, so the opening screen cannot describe
 * a run differently from the way Recreate restores it.
 */
function composerFromLibrary(source: Source | undefined): ComposerState {
  const job = source ? librarySetupJob(source) : undefined;
  return job
    ? composerReducer(emptyComposer, { type: "restore", job })
    : emptyComposer;
}
/**
 * What the composer opens on: the run of the clip the main view features. The
 * clip, its scene text, its camera clauses and its generation settings are one
 * run — the one `public/media/gallery.json` records for it — rather than a clip
 * paired with a prompt that made something else.
 */
export const initialComposer: ComposerState =
  composerFromLibrary(featuredSource);
type Action =
  | { type: "update"; patch: Partial<ComposerState> }
  | { type: "restore" | "restore-prompt"; job: Job };
export function composerReducer(
  state: ComposerState,
  action: Action,
): ComposerState {
  // Camera dialogue edits arrive as an "update" patch; see CameraDialog onApply.
  if (action.type === "update") return { ...state, ...action.patch };
  const job = action.job;
  if (action.type === "restore-prompt" && job.generator === "upscale")
    return {
      ...state,
      generator: job.generator,
      upscalePrompt: job.upscalePrompt ?? "",
    };
  let camera = job.camera;
  let edits: CameraEdits = job.camera
    ? Object.fromEntries(
        cameraClauses(job.camera, job.cameraEdits).map(({ term, text }) => [
          term.id,
          text,
        ]),
      )
    : {};
  if (!camera) {
    // Translate old IDs once, preserving the exact historical prompt (including blank edits).
    const legacy = presets.find((p) => p.id === job.presetId);
    const id: CameraTermId =
      job.presetId === "low"
        ? "low-angle"
        : job.presetId === "top"
          ? "birds-eye"
          : job.presetId === "crane_up"
            ? "crane"
            : job.presetId?.startsWith("dolly")
              ? "dolly-in"
              : "orbit";
    camera = {
      "shot-sizes": null,
      angles: id === "low-angle" || id === "birds-eye" ? id : null,
      movements: id === "low-angle" || id === "birds-eye" ? null : id,
    } as CameraSelection;
    edits = { [id]: job.cameraText ?? legacy?.clause ?? "" };
  }
  const prompt = {
    description: job.description,
    cameraEnabled: job.cameraEnabled,
    camera,
    cameraEdits: { ...state.cameraEdits, ...edits },
  };
  if (action.type === "restore-prompt")
    return { ...state, generator: job.generator, ...prompt };
  return {
    generator: job.generator,
    ...prompt,
    draft: job.draft,
    duration: job.duration,
    aspectRatio: job.aspectRatio ?? "16:9",
    resolution: job.resolution,
    sourceId: job.sourceId ?? "",
    upscalePrompt: job.upscalePrompt ?? "",
    upscaleFactor: job.upscaleFactor,
    upscaleCreativity: job.upscaleCreativity ?? 0,
  };
}
export function composerInput(state: ComposerState): GenerateInput {
  return {
    ...state,
    cameraEdits: Object.fromEntries(
      cameraClauses(state.camera, state.cameraEdits).map(({ term, text }) => [
        term.id,
        text,
      ]),
    ),
    cameraEnabled: state.generator === "video" && state.cameraEnabled,
    draft: state.generator === "video" && state.draft,
    resolution:
      state.draft && state.generator === "video" ? "hd" : state.resolution,
    sourceId: state.generator === "upscale" ? state.sourceId : undefined,
  };
}

/** An explicit source wins; otherwise continue with the newest saved result. */
export function upscaleSource(
  selectedId: string,
  jobs: Job[],
  sources: Source[],
): Source | undefined {
  if (selectedId) return sources.find((source) => source.id === selectedId);
  const generated = new Map(
    sources
      .filter((source) => source.origin === "generated")
      .map((source) => [source.id, source]),
  );
  const latest = jobs
    .filter(
      (job) =>
        job.status === "Ready" &&
        job.mediaAvailable !== false &&
        generated.has(job.id),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  return latest ? generated.get(latest.id) : undefined;
}

export function useComposer() {
  const [state, dispatch] = useReducer(composerReducer, initialComposer);
  /**
   * True once the visitor has changed a control. The composer then holds their
   * edit, so an arriving or newly selected run is not restored over it; see the
   * restore effect in `src/App.tsx`.
   */
  const edited = useRef(false);
  const set = <K extends keyof ComposerState>(
    key: K,
    value: ComposerState[K],
  ) => {
    edited.current = true;
    dispatch({ type: "update", patch: { [key]: value } });
  };
  return { state, set, dispatch, edited };
}
