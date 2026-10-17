const CANVA_VIEW =
  "https://www.canva.com/design/DAHV7SOkIgA/fBenAxNV01FOwQBYXFzTKA/view";
const CANVA_EMBED = `${CANVA_VIEW}?embed`;

export function CanvaPresentationEmbed({
  title,
  openLabel,
}: {
  title: string;
  openLabel: string;
}) {
  return (
    <div>
      <div className="aspect-video overflow-hidden border border-border bg-ink">
        <iframe
          className="h-full w-full"
          src={CANVA_EMBED}
          title={title}
          allow="fullscreen"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <a
        href={CANVA_VIEW}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-sm font-medium text-blue hover:underline"
      >
        {openLabel}
      </a>
    </div>
  );
}
