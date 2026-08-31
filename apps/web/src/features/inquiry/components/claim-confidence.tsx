import { formatPercent } from "@/shared/utils/index.ts";
import { isLowConfidenceClaim } from "@atlas/domain";
import { cn } from "@atlas/ui";
import type { InquiryClaimRecord } from "../repositories/inquiry-repository.ts";

interface ClaimConfidenceProps {
  claim: InquiryClaimRecord;
  className?: string;
}

export function ClaimConfidence({ claim, className }: ClaimConfidenceProps) {
  const isLowConfidence = isLowConfidenceClaim(claim);

  return (
    <span className={cn("shrink-0", isLowConfidence ? "text-conviction" : null, className)}>
      {isLowConfidence ? "low " : null}extraction confidence · {formatPercent(claim.confidence)}
    </span>
  );
}
