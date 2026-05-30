import type { PredictionEvent } from '@atlas/domain';

export interface ListEventsInput {
	limit?: number;
}

export type ListEventsOutput = PredictionEvent[];

export interface ListEvents {
	execute(input?: ListEventsInput): Promise<ListEventsOutput>;
}
