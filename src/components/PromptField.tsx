import { useLayoutEffect, useRef } from "react";

export default function PromptField({
  id,
  label,
  labelClassName = "sr-only",
  value,
  onChange,
  maxLength,
  placeholder,
}: {
  id: string;
  label: string;
  labelClassName?: string;
  value: string;
  onChange: (text: string) => void;
  maxLength: number;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const field = ref.current!;
    const resize = () => {
      field.style.height = "auto";
      const height = field.scrollHeight;
      field.style.height = `${Math.min(height, 240)}px`;
      field.style.overflowY = height > 240 ? "auto" : "hidden";
    };
    resize();
    let width = field.clientWidth;
    const observer = new ResizeObserver(() => {
      if (field.clientWidth !== width) {
        width = field.clientWidth;
        resize();
      }
    });
    observer.observe(field);
    return () => observer.disconnect();
  }, [value]);
  return (
    <>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        value={value}
        rows={1}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </>
  );
}
