import type { UserId } from "@atlas/domain";
import type { UserStorePort } from "../../auth/outbound/user-store.ts";
import type { WorldScanReportRecord } from "../../world/inbound/world-scan.ts";
import type { WorldScanReportStorePort } from "../../world/outbound/world-scan-report-store.ts";
import type { ListSavedReports } from "./profile.ts";
import { UserNotFoundError } from "./profile.ts";

export class ListSavedReportsUseCase implements ListSavedReports {
  constructor(
    private readonly users: UserStorePort,
    private readonly store: WorldScanReportStorePort,
  ) {}

  async execute(userId: UserId): Promise<WorldScanReportRecord[]> {
    const user = await this.users.findUserById(userId);
    if (!user) throw new UserNotFoundError();
    if (user.profile.savedReportIds.length === 0) return [];
    return this.store.listWorldScanReportsByIds(user.profile.savedReportIds);
  }
}
