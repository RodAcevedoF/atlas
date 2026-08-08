import type { ReactNode } from "react";
import { AtlasHeader } from "./atlas-header.tsx";
import { MarqueeBackdrop } from "./marquee-backdrop.tsx";
import { SourceStrip } from "./source-strip.tsx";

interface PublicPageProps {
  backdropWords: string[];
  headerActions: ReactNode;
  sourceStripTrailing?: string;
  children: ReactNode;
}

/**
 * Frame for the unauthenticated routes — marquee backdrop, brand header, source strip. The centre
 * is left to the caller so each page keeps its own landmark element and vertical rhythm.
 */
export function PublicPage({
  backdropWords,
  headerActions,
  sourceStripTrailing,
  children,
}: PublicPageProps) {
  return (
    <div className="atlas4-page relative flex min-h-screen flex-col overflow-hidden text-foreground">
      <MarqueeBackdrop words={backdropWords} />
      <AtlasHeader actions={headerActions} />
      {children}
      <SourceStrip trailing={sourceStripTrailing} className="relative z-3 px-8.5 pb-7.5" />
    </div>
  );
}
