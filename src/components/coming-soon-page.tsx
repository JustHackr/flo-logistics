import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Construction className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
      </div>
      <Card className="w-full">
        <CardContent className="py-6 text-sm text-muted-foreground">
          Coming soon
        </CardContent>
      </Card>
    </div>
  );
}
