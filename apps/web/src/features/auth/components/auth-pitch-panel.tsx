import {
  ATLAS_STATS,
  type LivePulse,
  WaveMeter,
  buildWave,
  useReducedMotion,
} from "@/shared/brand";
import { useMemo } from "react";

type Mode = "login" | "register";

interface PitchCopy {
  lead: string;
  accent: string;
  body: string;
}

const PITCH: Record<Mode, PitchCopy> = {
  login: {
    lead: "The scan never stopped while you were away —",
    accent: `${ATLAS_STATS.signalsReadToday.toLocaleString()} signals since midnight.`,
    body: "Two gaps widened overnight: Sudan corridor talks and the EU chip subsidy vote.",
  },
  register: {
    lead: "The world is read twice. Once in the press,",
    accent: "once in the odds.",
    body: "Follow the topics you cover and Atlas writes you a dated, sourced read every morning.",
  },
};

const STAT_ROW = "font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint";

interface AuthPitchPanelProps {
  mode: Mode;
  pulse: LivePulse;
}

export function AuthPitchPanel({ mode, pulse }: AuthPitchPanelProps) {
  const reducedMotion = useReducedMotion();
  const copy = PITCH[mode];
  const coverageBars = useMemo(
    () => buildWave({ seed: 0.41, phase: 0, count: 26, motionless: reducedMotion }),
    [reducedMotion],
  );
  const convictionBars = useMemo(
    () => buildWave({ seed: 0.33, phase: 2.2, count: 26, motionless: reducedMotion }),
    [reducedMotion],
  );

  return (
    <div className="relative hidden overflow-hidden border-r border-border p-10 md:block">
      <div className="atlas4-auth-glow absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="atlas4-scan atlas4-scan-line absolute left-0 top-0 h-px w-[34%]" />
      </div>

      <div className="relative flex h-full flex-col justify-between gap-10">
        <div>
          <div className="inline-flex items-center gap-2.25 rounded-full border border-border bg-coverage/6 px-3.5 py-1.75 font-mono text-[11px] uppercase tracking-widest text-foreground/78">
            <span className="h-1.25 w-1.25 rounded-full bg-conviction" />
            Coverage × Conviction
          </div>
          <div className="mt-6 max-w-[17ch] text-balance text-[34px] font-medium leading-[1.04] tracking-[-0.042em]">
            {copy.lead} <span className="text-conviction">{copy.accent}</span>
          </div>
          <p className="mt-4 max-w-[34ch] text-pretty text-[14.5px] leading-[1.6] text-foreground/55">
            {copy.body}
          </p>
        </div>

        <div>
          <WaveMeter
            variant="coverage"
            label="Coverage"
            value={pulse.coverage}
            bars={coverageBars}
            trackClassName="h-13.5"
          />
          <div className="mt-4">
            <WaveMeter
              variant="conviction"
              label="Conviction"
              value={pulse.conviction}
              bars={convictionBars}
              trackClassName="h-13.5"
            />
          </div>
          <div className={`mt-5 flex justify-between border-t border-border pt-4 ${STAT_ROW}`}>
            <span>{ATLAS_STATS.regions} regions</span>
            <span>{ATLAS_STATS.topics} topics</span>
            <span>{ATLAS_STATS.sources.toLocaleString()} sources</span>
          </div>
        </div>
      </div>
    </div>
  );
}
