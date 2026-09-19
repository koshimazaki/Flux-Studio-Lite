import { useReducer } from "react";
import {
  defaultCamera,
  cameraClauses,
  type CameraSelection,
  type CameraEdits,
  type CameraTermId,
} from "../shared/camera";
import { presets } from "../shared/legacy-camera";
import type { GenerateInput, Job } from "../shared/types";
import { DEFAULT_PROMPT } from "./components/PromptInput";
export type ComposerState = Omit<GenerateInput, "presetId" | "cameraText"> & {
  camera: CameraSelection;
  cameraEdits: CameraEdits;
  sourceId: string;
  upscalePrompt: string;
};
export const initialComposer: ComposerState = {
  generator: "video",
  description: DEFAULT_PROMPT,
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
type Action =
  | { type: "update"; patch: Partial<ComposerState> }
  | { type: "edit-camera"; id: CameraTermId; text: string }
  | { type: "restore"; job: Job };
export function composerReducer(
  state: ComposerState,
  action: Action,
): ComposerState {
  if (action.type === "update") return { ...state, ...action.patch };
  if (action.type === "edit-camera")
    return {
      ...state,
      cameraEdits: { ...state.cameraEdits, [action.id]: action.text },
    };
  const job = action.job;
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
  return {
    generator: job.generator,
    description: job.description,
    cameraEnabled: job.cameraEnabled,
    camera,
    cameraEdits: { ...state.cameraEdits, ...edits },
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
export function useComposer() {
  const [state, dispatch] = useReducer(composerReducer, initialComposer);
  const set = <K extends keyof ComposerState>(
    key: K,
    value: ComposerState[K],
  ) => dispatch({ type: "update", patch: { [key]: value } });
  return { state, set, dispatch };
}
