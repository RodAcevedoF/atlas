export interface ClockPort {
  now(): Date;
}

export interface IdPort {
  generate(): string;
}
