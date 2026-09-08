class StreamCapacityError extends Error {
  readonly statusCode = 429;

  constructor() {
    super("Too many inquiry streams are open. Try again shortly.");
  }
}

export class InquiryStreamCapacity {
  private active = 0;
  private readonly owners = new Map<string, number>();

  constructor(
    private readonly maximum = 256,
    private readonly perOwner = 64,
  ) {}

  async run<T>(owner: string, work: () => Promise<T>): Promise<T> {
    const owned = this.owners.get(owner) ?? 0;
    if (this.active >= this.maximum || owned >= this.perOwner) throw new StreamCapacityError();
    this.active += 1;
    this.owners.set(owner, owned + 1);
    try {
      return await work();
    } finally {
      this.active -= 1;
      const remaining = (this.owners.get(owner) ?? 1) - 1;
      if (remaining === 0) this.owners.delete(owner);
      else this.owners.set(owner, remaining);
    }
  }
}
