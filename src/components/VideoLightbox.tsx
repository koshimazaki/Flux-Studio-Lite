import { useEffect, useRef } from "react";
import Icon from "./Icon";
export interface ViewingClip {
  url: string;
  label: string;
}
export default function VideoLightbox({
  clip,
  onClose,
}: {
  clip: ViewingClip | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!clip) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.querySelectorAll("video").forEach((item) => item.pause());
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
    void video.current?.play().catch(() => {});
    return () => {
      video.current?.pause();
      dialog.current?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [clip]);
  if (!clip) return null;
  return (
    <dialog
      ref={dialog}
      className="video-lightbox"
      aria-label={clip.label}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lightbox-content">
        <header>
          <span>{clip.label}</span>
          <button
            className="icon-button"
            aria-label="Close video"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>
        <video
          ref={video}
          src={clip.url}
          controls
          muted
          playsInline
          aria-label={clip.label}
        />
      </div>
    </dialog>
  );
}
