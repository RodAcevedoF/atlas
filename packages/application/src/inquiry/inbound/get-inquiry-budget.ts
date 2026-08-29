import type { UserId, UserRole } from "@atlas/domain";
import { hasAtLeastRole } from "@atlas/domain";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";

export interface InquiryBudget {
  used: number;
  cap: number | null;
  remaining: number | null;
}

export interface GetInquiryBudgetInput {
  ownerId: UserId;
  role: UserRole;
}

export interface GetInquiryBudget {
  execute(input: GetInquiryBudgetInput): Promise<InquiryBudget>;
}

function toDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export class GetInquiryBudgetUseCase implements GetInquiryBudget {
  constructor(
    private readonly store: InquiryRunStorePort,
    private readonly dailyCap: number,
  ) {}

  async execute(input: GetInquiryBudgetInput): Promise<InquiryBudget> {
    if (hasAtLeastRole(input.role, "admin")) {
      return { used: 0, cap: null, remaining: null };
    }

    const used = await this.store.countSucceededQuestionsForOwnerDay(
      input.ownerId,
      toDay(new Date()),
    );
    return {
      used,
      cap: this.dailyCap,
      remaining: Math.max(0, this.dailyCap - used),
    };
  }
}
