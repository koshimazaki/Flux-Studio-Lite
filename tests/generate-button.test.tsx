import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GenerateButton from "../src/components/GenerateButton";
import type { Job } from "../shared/types";
const render = (
  job?: Partial<Job>,
  hasKey = true,
  submitting = false,
  disabled = false,
) =>
  renderToStaticMarkup(
    <GenerateButton
      generator="video"
      activeJob={job as Job}
      hasKey={hasKey}
      submitting={submitting}
      disabled={disabled}
      onSubmit={() => {}}
      onResume={() => {}}
    />,
  );
describe("generation button lifecycle", () => {
  it("stays busy after submission until the paid job reaches a terminal state", () => {
    expect(render(undefined, true, true)).toContain('aria-busy="true"');
    for (const status of [
      "Pending",
      "Reasoning",
      "Generating",
      "copying",
    ] as const) {
      const html = render({ status, keyMode: "byo" });
      expect(html).toContain('disabled=""');
      expect(html).toContain("generation-indicator");
    }
    for (const status of [
      "Ready",
      "Error",
      "expired",
      "Request Moderated",
      "Content Moderated",
    ] as const) {
      const html = render({ status, keyMode: "byo" });
      expect(html).not.toContain('disabled=""');
      expect(html).not.toContain("generation-indicator");
    }
  });
  it("offers enabled credential resume instead of a new submission when a pending BYO job loses its key", () => {
    const html = render(
      { status: "Generating", keyMode: "byo" },
      false,
      false,
      true,
    );
    expect(html).toContain("Resume");
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("generation-indicator");
    expect(
      render({ status: "Generating", keyMode: "server" }, false),
    ).toContain('disabled=""');
  });
});
