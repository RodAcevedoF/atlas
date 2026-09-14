import type { DatasetTable } from "@atlas/domain";

const LOCATIONS = [
  ["Valencia", "Spain"],
  ["Porto", "Portugal"],
  ["Lyon", "France"],
  ["Turin", "Italy"],
  ["Bremen", "Germany"],
  ["Utrecht", "Netherlands"],
  ["Ghent", "Belgium"],
  ["Graz", "Austria"],
  ["Kraków", "Poland"],
  ["Brno", "Czechia"],
  ["Aarhus", "Denmark"],
  ["Malmö", "Sweden"],
  ["Tampere", "Finland"],
  ["Bergen", "Norway"],
  ["Cork", "Ireland"],
  ["Bristol", "United Kingdom"],
  ["Thessaloniki", "Greece"],
  ["Cluj-Napoca", "Romania"],
  ["Split", "Croatia"],
  ["Tartu", "Estonia"],
] as const;
const CATEGORIES = [
  "Solar energy",
  "Water reuse",
  "Electric transit",
  "Flood protection",
  "Building retrofit",
  "District heating",
];

export function infrastructureProjects(): DatasetTable {
  return {
    columns: [
      "project_id",
      "project",
      "city",
      "country",
      "category",
      "status",
      "investment_eur",
      "research_question",
      "data_origin",
    ],
    rows: LOCATIONS.flatMap((location, locationIndex) =>
      CATEGORIES.map((category, categoryIndex) => {
        const city = location[0];
        const country = location[1];
        const number = locationIndex * CATEGORIES.length + categoryIndex + 1;
        return [
          `DEMO-${String(number).padStart(3, "0")}`,
          `Fictional ${category.toLowerCase()} project ${number}`,
          city,
          country,
          category,
          number % 2 === 0 ? "Proposed" : "Feasibility study",
          String((categoryIndex + 1) * 1500000 + locationIndex * 100000),
          `What local constraints could affect a hypothetical ${category.toLowerCase()} project in ${city}, ${country}?`,
          "Synthetic teaching data; not evidence of a real project",
        ];
      }),
    ),
  };
}
