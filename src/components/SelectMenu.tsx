import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Icon from "./Icon";

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  disabled?: boolean;
  compact?: boolean;
  triggerIcon?: ReactNode;
}

export default function SelectMenu({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
  compact = false,
  triggerIcon,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const optionButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.find((option) => option.value === value);
  const labelId = `${id}-label`;
  const listId = `${id}-options`;

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }
  function show() {
    if (disabled || !options.length) return;
    setActive(
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    );
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    close(true);
  }
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    const next =
      event.key === "ArrowDown"
        ? (active + 1) % options.length
        : event.key === "ArrowUp"
          ? (active + options.length - 1) % options.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? options.length - 1
              : null;
    if (next !== null) {
      event.preventDefault();
      setActive(next);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
    }
  }

  useEffect(() => {
    if (!open) return;
    optionButtons.current[active]?.focus();
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target)
      ) {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div
      ref={root}
      className={`instrument-field select-menu${compact ? " select-menu--compact" : ""}`}
      data-disabled={disabled || undefined}
      onKeyDown={navigate}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          close();
      }}
    >
      <label htmlFor={id} id={labelId} className="instrument-label">
        {label}
      </label>
      <button
        ref={trigger}
        id={id}
        type="button"
        className="instrument-trigger select-menu__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open && !disabled}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${id}-value`}
        onClick={() => (open ? close(true) : show())}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            event.stopPropagation();
            show();
          }
        }}
      >
        {triggerIcon ?? selected?.icon}
        <span id={`${id}-value`} className="select-menu__value">
          {selected?.label ?? value}
        </span>
        <Icon name="chevron" size={11} />
      </button>
      {open && !disabled && (
        <div
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          className="instrument-popover select-menu__options"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => {
                optionButtons.current[index] = element;
              }}
              type="button"
              role="option"
              aria-selected={option.value === value}
              tabIndex={-1}
              className="select-menu__option"
              onFocus={() => setActive(index)}
              onClick={() => choose(index)}
            >
              {option.icon}
              <span>{option.label}</span>
              <span className="select-menu__check">
                {option.value === value && <Icon name="check" size={12} />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
