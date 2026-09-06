type AvatarProps = {
  initials: string;
  gradient: string;
  size?: "md" | "lg";
};

export function Avatar({ initials, gradient, size = "lg" }: AvatarProps) {
  const dim = size === "lg" ? "h-24 w-24 text-2xl" : "h-14 w-14 text-lg";

  return (
    <div
      className={`flex ${dim} items-center justify-center rounded-full font-[family-name:var(--font-display)] font-semibold text-white shadow-lg ring-2 ring-white/10`}
      style={{ background: gradient }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
