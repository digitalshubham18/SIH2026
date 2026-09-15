export default function AshokaEmblem({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="#FFFFFF" stroke="#114B32" strokeWidth="3" />
      <circle cx="50" cy="50" r="6" fill="#1E3A8A" />
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 15 * Math.PI) / 180;
        const x1 = 50 + Math.cos(angle) * 10;
        const y1 = 50 + Math.sin(angle) * 10;
        const x2 = 50 + Math.cos(angle) * 40;
        const y2 = 50 + Math.sin(angle) * 40;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1E3A8A" strokeWidth="1.5" />;
      })}
      <circle cx="50" cy="50" r="40" fill="none" stroke="#1E3A8A" strokeWidth="1.5" />
    </svg>
  );
}
