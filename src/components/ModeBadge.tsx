import type { Generator } from "../../shared/types";
import Icon from "./Icon";
import { generators } from "../generators";

/**
 * The name of the generator the composer is in, above the prompt.
 *
 * It reads `src/generators.ts`, like the model menu and the composer foot, so
 * the three cannot name the same endpoint differently.
 */
export default function ModeBadge({ generator }: { generator: Generator }) {
  return (
    <div className="mode-badge" aria-live="polite">
      <Icon name={generators[generator].icon} size={17} />
      <span>{generators[generator].label}</span>
    </div>
  );
}
