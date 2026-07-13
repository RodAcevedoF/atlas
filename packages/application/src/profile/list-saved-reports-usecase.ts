import type { UserId } from "@atlas/domain";
import type { MarketStorePort } from "../ports/market-store.ts";
import type { UserStorePort } from "../ports/user-store.ts";
import type { WorldScanReportRecord } from "../world/world-scan.ts";
import type { ListSavedReports } from "./profile.ts";
import { UserNotFoundError } from "./profile.ts";

export class ListSavedReportsUseCase implements ListSavedReports {
  constructor(
    private readonly users: UserStorePort,
    private readonly store: MarketStorePort,
  ) {}

  async execute(userId: UserId): Promise<WorldScanReportRecord[]> {
    const user = await this.users.findUserById(userId);
    if (!user) throw new UserNotFoundError();
    if (user.profile.savedReportIds.length === 0) return [];
    return this.store.listWorldScanReportsByIds(user.profile.savedReportIds);
  }
}
