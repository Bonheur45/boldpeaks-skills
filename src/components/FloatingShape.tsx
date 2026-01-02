import { cn } from "@/lib/utils";

interface FloatingShapeProps {
  className?: string;
  variant?: "circle" | "blob" | "ring";
  size?: "sm" | "md" | "lg" | "xl";
}

const FloatingShape = ({ className, variant = "circle", size = "md" }: FloatingShapeProps) => {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-32 h-32",
    lg: "w-48 h-48",
    xl: "w-64 h-64",
  };

  const baseClasses = cn(
    "absolute rounded-full opacity-60 blur-xl",
    sizeClasses[size]
  );

  if (variant === "ring") {
    return (
      <div
        className={cn(
          "absolute rounded-full border-4 border-primary/20 opacity-40",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  if (variant === "blob") {
    return (
      <div
        className={cn(
          baseClasses,
          "bg-gradient-to-br from-primary/30 to-accent/20",
          className
        )}
        style={{
          borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        baseClasses,
        "bg-gradient-to-br from-primary/25 to-warm-coral/20",
        className
      )}
    />
  );
};

export default FloatingShape;
