import type { GeoRegion } from "../repositories/market-repository.ts";

export interface RegionShape {
  region: Exclude<GeoRegion, "global">;
  path: string;
  labelX: number;
  labelY: number;
}

export const VIEWBOX_WIDTH = 1000;
export const VIEWBOX_HEIGHT = 500;

export const REGION_SHAPES: RegionShape[] = [
  {
    region: "north-america",
    path: "M150,90 L240,80 L300,112 L288,150 L250,166 L256,200 L226,228 L204,200 L184,160 L150,150 L136,120 Z",
    labelX: 212,
    labelY: 140,
  },
  {
    region: "latin-america",
    path: "M250,236 L296,234 L306,276 L290,320 L276,360 L262,414 L250,360 L258,310 L240,276 Z",
    labelX: 274,
    labelY: 322,
  },
  {
    region: "europe",
    path: "M468,94 L542,88 L562,120 L536,142 L506,136 L480,152 L463,124 Z",
    labelX: 512,
    labelY: 118,
  },
  {
    region: "africa",
    path: "M470,206 L562,200 L592,236 L576,292 L546,346 L516,378 L496,346 L478,290 L464,246 Z",
    labelX: 526,
    labelY: 288,
  },
  {
    region: "middle-east",
    path: "M566,164 L640,170 L656,206 L626,236 L590,226 L570,196 Z",
    labelX: 608,
    labelY: 200,
  },
  {
    region: "asia",
    path: "M576,96 L760,84 L852,110 L842,162 L782,182 L702,176 L662,212 L642,176 L602,160 L582,130 Z",
    labelX: 718,
    labelY: 138,
  },
  {
    region: "oceania",
    path: "M800,310 L880,304 L916,340 L896,386 L840,396 L808,366 L800,336 Z",
    labelX: 856,
    labelY: 350,
  },
];
