// Ambient backdrop: a faint dot grid that fades out from the top centre. Pure
// CSS, nothing animated, so it costs one paint.
export default function Backdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden
      style={{
        backgroundImage: 'radial-gradient(rgba(244, 245, 244, 0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 75%)',
      }}
    />
  );
}
