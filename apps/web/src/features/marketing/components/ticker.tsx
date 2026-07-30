import { TICKER_ITEMS } from "../data/landing-content.ts";

// two labelled copies so the −50% translate loops seamlessly (no array-index keys)
const COPIES = ["a", "b"] as const;

/** Scrolling coverage/conviction ticker along the top of the masthead. */
export function Ticker() {
  return (
    <div className="flex h-8.5 items-center overflow-hidden border-b border-border">
      <div className="atlas2-ticker flex shrink-0 gap-11 whitespace-nowrap pl-5 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
        {COPIES.map((copy) =>
          TICKER_ITEMS.map((item) => (
            <span key={`${copy}-${item.label}`}>
              <span className="text-coverage">cov</span> {item.label}{" "}
              <span className="text-foreground">{item.coverage}</span> /{" "}
              <span className="text-conviction">con</span>{" "}
              <span className="text-foreground">{item.conviction}</span>
            </span>
          )),
        )}
      </div>
    </div>
  );
}
