export function RouteMotif({
  className = "",
  tone = "blue",
}: {
  className?: string;
  tone?: "blue" | "yellow" | "ink";
}) {
  const stroke =
    tone === "yellow" ? "#FFCF37" : tone === "ink" ? "#0C1726" : "#0B52FF";
  const accent = tone === "blue" ? "#FFCF37" : "#0B52FF";

  return (
    <svg
      className={className}
      viewBox="0 0 480 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M72 360C140 280 168 248 220 220C272 192 318 176 408 120"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M96 400C170 304 210 268 268 236C326 204 360 176 420 148"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="6 8"
      />
      <circle cx="72" cy="360" r="8" fill={stroke} />
      <circle
        cx="408"
        cy="120"
        r="8"
        fill={accent}
        stroke="#0C1726"
        strokeWidth="2"
      />
      <circle cx="220" cy="220" r="5" fill="#0C1726" />
      <circle cx="318" cy="176" r="4" fill={stroke} />
    </svg>
  );
}
