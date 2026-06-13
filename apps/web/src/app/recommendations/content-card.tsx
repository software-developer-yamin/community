import { Clock, Tag } from "lucide-react";
import Image from "next/image";

interface ContentCardProps {
  cefrLevel: string;
  description: string;
  duration?: number | null;
  reason?: string;
  score?: number;
  tags: string[];
  thumbnailUrl?: string | null;
  title: string;
  type: string;
}

export function ContentCard({
  title,
  description,
  type,
  cefrLevel,
  thumbnailUrl,
  duration,
  tags,
  reason,
  score,
}: ContentCardProps) {
  const typeEmoji = {
    video: "▶️",
    article: "📄",
    exercise: "✏️",
    dialogue: "💬",
  } as Record<string, string>;

  const cefrColor = {
    A1: "bg-green-100 text-green-800",
    A2: "bg-green-200 text-green-800",
    B1: "bg-yellow-100 text-yellow-800",
    B2: "bg-yellow-200 text-yellow-800",
    C1: "bg-orange-100 text-orange-800",
    C2: "bg-red-100 text-red-800",
  } as Record<string, string>;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      {/* Thumbnail */}
      <div className="relative h-40 bg-muted">
        {thumbnailUrl ? (
          <Image
            alt={title}
            className="h-full w-full object-cover"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            src={thumbnailUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">
            {typeEmoji[type] ?? "📚"}
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex gap-2">
          <span
            className={`rounded-full px-2 py-0.5 font-medium text-xs ${cefrColor[cefrLevel] ?? "bg-gray-100 text-gray-800"}`}
          >
            {cefrLevel}
          </span>
          <span className="rounded-full bg-black/60 px-2 py-0.5 text-white text-xs">
            {typeEmoji[type] ?? "📚"} {type}
          </span>
        </div>
        {duration && (
          <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-white text-xs">
            <Clock className="h-3 w-3" />
            {formatDuration(duration)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 font-semibold leading-tight">{title}</h3>
        <p className="mb-3 line-clamp-2 text-muted-foreground text-sm">
          {description}
        </p>

        {reason && <p className="mb-2 text-primary text-xs">{reason}</p>}

        {score != null && score > 0 && (
          <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(score * 100)}%` }}
            />
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
                key={tag}
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
