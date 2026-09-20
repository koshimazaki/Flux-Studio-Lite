import type { CameraSelection, CameraEdits } from "./camera";
import type { PresetId } from "./legacy-camera";
export type Generator = "video" | "upscale";
export type AspectRatio =
  "21:9" | "2:1" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16";
export type VideoResolution = "hd" | "fhd" | "qhd" | "uhd";
export type { PresetId } from "./legacy-camera";
export type JobStatus =
  | "submitting"
  | "Pending"
  | "Reasoning"
  | "Generating"
  | "copying"
  | "Ready"
  | "Error"
  | "expired"
  | "stopped"
  | "Request Moderated"
  | "Content Moderated";

export interface GenerateInput {
  generator: Generator;
  description: string;
  /** Legacy job compatibility. New requests use camera. */
  presetId?: PresetId;
  camera?: CameraSelection;
  cameraEdits?: CameraEdits;
  cameraEnabled: boolean;
  cameraText?: string;
  duration: number;
  resolution: VideoResolution;
  aspectRatio: AspectRatio;
  draft: boolean;
  sourceId?: string;
  upscalePrompt?: string;
  upscaleFactor: number;
  upscaleCreativity: 0 | 1;
}

/**
 * The run that produced a catalogue clip, shipped with it so Recreate and
 * prompt reuse work on a library clip exactly as on a visitor's own job.
 */
export interface LibrarySetup extends GenerateInput {
  /** The composed prompt the provider received, recorded verbatim. */
  prompt: string;
  /** Provider-confirmed charge for the original run. */
  costUsd: number;
  generatedAt: string;
}

export interface Source {
  id: string;
  label: string;
  url: string;
  poster?: string;
  width: number;
  height: number;
  duration: number;
  origin: "sample" | "upload" | "generated";
  /** Present on catalogue clips only; uploads and generations have their own job. */
  setup?: LibrarySetup;
}

export interface Job extends GenerateInput {
  id: string;
  prompt: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  costEstimateUsd: number;
  costActualUsd?: number;
  resultUrl?: string;
  /** False when retention or quota kept the run record but removed its media. */
  mediaAvailable?: false;
  error?: string;
  progress?: number;
  keyMode: "server" | "byo";
}

export const terminalStatuses: readonly JobStatus[] = [
  "Ready",
  "Error",
  "expired",
  "stopped",
  "Request Moderated",
  "Content Moderated",
];
export const isTerminal = (status: JobStatus) =>
  terminalStatuses.includes(status);
