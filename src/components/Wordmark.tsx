/**
 * The studio's own name, in the header.
 *
 * The anchor, the three skewed bars and the name are one thing, so the header
 * says the same words as the document title: `tests/wordmark.test.tsx` reads
 * both, and a rename that only reaches one of them fails there. The mode tag
 * beside it names the part of the studio in view, not a second brand.
 */
export default function Wordmark() {
  return (
    <a href="/" className="wordmark" aria-label="FLUX Studio Lite home">
      <span className="brand-mark">
        <i />
        <i />
        <i />
      </span>
      FLUX Studio Lite
      <span className="brand-beta">FLUX 3 · Camera control</span>
    </a>
  );
}
