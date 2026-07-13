import type { Signal } from "@atlas/domain";

export interface SignalSourceFilter {
  query?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export interface SignalSourcePort {
  fetchSignals(filter?: SignalSourceFilter): Promise<Signal[]>;
}
