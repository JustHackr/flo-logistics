type AvatarProps = {
  initials: string;
  size?: "md" | "lg";
};

export function Avatar({ initials, size = "lg" }: AvatarProps) {
  const dim = size === "lg" ? "h-20 w-20 text-xl" : "h-12 w-12 text-base";

  return (
    <div
      className={`flex ${dim} items-center justify-center rounded-sm bg-blue font-display font-bold text-white`}
      aria-hidden
    >
      {initials}
    </div>
  );
}
