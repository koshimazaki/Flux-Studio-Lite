import { useLayoutEffect, useState } from "react";
import Icon from "./Icon";
import SelectMenu from "./SelectMenu";

type Theme = "blackstone-lime" | "cyberpunk";
const themes = [
  {
    value: "blackstone-lime",
    label: "Blackstone / Lime",
    colors: ["--surface", "--lime-accent", "--lime-readout"],
  },
  {
    value: "cyberpunk",
    label: "Cyberpunk",
    colors: ["--surface", "--coral-accent", "--cyan-readout"],
  },
] as const;

export default function ThemePicker() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem("flux-studio-lite-theme") === "cyberpunk"
        ? "cyberpunk"
        : "blackstone-lime";
    } catch {
      return "blackstone-lime";
    }
  });
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("flux-studio-lite-theme", theme);
    } catch {
      /* Theme still works in memory. */
    }
  }, [theme]);
  return (
    <div className="theme-picker">
      <SelectMenu
        id="theme"
        label="Theme"
        value={theme}
        onChange={(value) => setTheme(value as Theme)}
        triggerIcon={<Icon name="palette" size={16} />}
        options={themes.map((item) => ({
          value: item.value,
          label: item.label,
          icon: (
            <span className="theme-swatch" aria-hidden="true">
              {item.colors.map((color) => (
                <i key={color} style={{ background: `var(${color})` }} />
              ))}
            </span>
          ),
        }))}
      />
    </div>
  );
}
