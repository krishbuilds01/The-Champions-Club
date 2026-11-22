import React from "react";

interface ClubLogoProps {
  className?: string;
  showText?: boolean;
  size?: number;
  variant?: "dark" | "light" | "badge";
}

/**
 * Text-only wordmark logo for The Champions Club.
 * All SVG crests, medallions, and graphic badges have been completely removed
 * per design requirements — only the typographic name is rendered.
 */
export default function ClubLogo({
  className = "",
  showText = true,
}: ClubLogoProps) {
  if (!showText) return null;
  return (
    <span
      className={`font-display font-bold uppercase tracking-wide text-inherit ${className}`}
      style={{ letterSpacing: "0.05em" }}
    >
      The Champions Club
    </span>
  );
}
