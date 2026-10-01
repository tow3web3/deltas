// Ambient backdrop: a faint dot grid that fades out from the top. The light
// itself (the blue glow top-left, the violet bottom-right) is painted by the
// body in globals.css, so it stays fixed while the page scrolls.
export default function Backdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden
      style={{
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 20%, #000 0%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 20%, #000 0%, transparent 75%)',
      }}
    />
  );
}
