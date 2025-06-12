import { Calendar } from "lucide-react";

interface PlaceholderImageProps {
  className?: string;
  title?: string;
}

export function PlaceholderImage({
  className = "",
  title = "Event",
}: PlaceholderImageProps) {
  return (
    <div
      className={`bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center ${className}`}
    >
      <div className="text-center">
        <Calendar className="w-12 h-12 text-primary/60 mx-auto mb-2" />
        <p className="text-sm text-primary/60 font-medium">{title}</p>
      </div>
    </div>
  );
}
