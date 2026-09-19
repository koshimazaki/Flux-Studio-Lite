export type Generator = "video" | "upscale";
export type AspectRatio =
  "21:9" | "2:1" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16";
export type VideoResolution = "hd" | "fhd" | "qhd" | "uhd";
export type PresetId =
  | "orbit_l"
  | "orbit_r"
  | "orbit_360"
  | "dolly_in"
  | "dolly_out"
  | "crane_up"
  | "low"
  | "top";
export type JobStatus =
  | "submitting"
  | "Pending"
  | "Reasoning"
  | "Generating"
  | "copying"
  | "Ready"
  | "Error"
  | "expired"
  | "Request Moderated"
  | "Content Moderated";

export interface GenerateInput {
  generator: Generator;
  description: string;
  presetId: PresetId;
  cameraEnabled: boolean;
  cameraText?: string;
  duration: number;
  resolution: VideoResolution;
  aspectRatio: AspectRatio;
  draft: boolean;
  sourceId?: string;
  upscaleFactor: number;
  upscaleCreativity: 0 | 1;
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
  error?: string;
  progress?: number;
  keyMode: "server" | "byo";
}

export const terminalStatuses: readonly JobStatus[] = [
  "Ready",
  "Error",
  "expired",
  "Request Moderated",
  "Content Moderated",
];
export const isTerminal = (status: JobStatus) =>
  terminalStatuses.includes(status);
