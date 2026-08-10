import { describe, expect, test } from "bun:test";
import {
  classifySentimentFromText,
  deriveRegionsFromText,
  deriveTopicFromText,
} from "./geography.ts";
import type { Topic } from "./signal.ts";

describe("keyword matching is whole-word, not substring", () => {
  const topicCases = [
    { text: "Ukraine peace talks resume in Geneva", bled: "technology", inside: "ai in ukrAIne" },
    { text: "Heavy rain forecast across the plains", bled: "technology", inside: "ai in rAIn" },
    { text: "The party won a narrow majority", bled: "society-culture", inside: "art in pARTy" },
    {
      text: "Quarterly report beats expectations",
      bled: "society-culture",
      inside: "art in quARTerly",
    },
    {
      text: "Apartment prices fall in major cities",
      bled: "society-culture",
      inside: "art in apARTment",
    },
    { text: "Warm weather expected this weekend", bled: "conflict", inside: "war in WARm" },
    { text: "Equipo local gana el partido", bled: "business-finance", inside: "ipo in equIPO" },
  ];

  for (const { text, bled, inside } of topicCases) {
    test(`classifies "${text}" as other, not ${bled} (${inside})`, () => {
      expect(deriveTopicFromText([text])).toBe("other");
    });
  }

  test("does not place Indiana in asia (india in INDIAna)", () => {
    expect(deriveRegionsFromText(["Indiana passes new budget"])).toEqual(["global"]);
  });

  test("does not place a French lawn in the middle east (gaz in GAZon)", () => {
    expect(deriveRegionsFromText(["Le gazon du jardin"])).toEqual(["global"]);
  });

  const sentimentBleed = [
    { text: "Talks held against the proposal", inside: "gain in aGAINst" },
    { text: "Showing strong results", inside: "win in shoWINg" },
    { text: "Warm start to the year", inside: "war in WARm" },
  ];

  for (const { text, inside } of sentimentBleed) {
    test(`scores "${text}" neutral (${inside})`, () => {
      expect(classifySentimentFromText([text])).toBe(0);
    });
  }
});

describe("genuine keyword hits still classify", () => {
  const cases: Array<{ text: string; topic: Topic }> = [
    { text: "Russian missile strike hits Kyiv", topic: "conflict" },
    { text: "Presidential election campaign begins in France", topic: "politics" },
    { text: "Inflation slows as the central bank holds rates", topic: "economy" },
    { text: "Artificial intelligence chip demand surges", topic: "technology" },
    { text: "World cup match ends in a draw", topic: "sports" },
    { text: "Wildfire and drought grip southern Europe", topic: "climate-environment" },
  ];

  for (const { text, topic } of cases) {
    test(`classifies "${text}" as ${topic}`, () => {
      expect(deriveTopicFromText([text])).toBe(topic);
    });
  }

  test("matches regions and topics on the same headline", () => {
    const text = "Gaza ceasefire agreement reached";
    expect(deriveTopicFromText([text])).toBe("conflict");
    expect(deriveRegionsFromText([text])).toContain("middle-east");
  });

  test("keeps multi-word keywords working across punctuation", () => {
    expect(deriveTopicFromText(["Report: interest rate decision due"])).toBe("economy");
  });

  const pluralCases: Array<{ text: string; topic: Topic }> = [
    { text: "Kazakhstan reroutes oil exports after Ukrainian strikes", topic: "conflict" },
    { text: "New sanctions announced overnight", topic: "politics" },
    { text: "Floods displace thousands", topic: "climate-environment" },
    { text: "Central banks hold interest rates", topic: "economy" },
  ];

  for (const { text, topic } of pluralCases) {
    test(`matches plural keywords: "${text}" -> ${topic}`, () => {
      expect(deriveTopicFromText([text])).toBe(topic);
    });
  }

  const derivedFormCases: Array<{ text: string; topic: Topic }> = [
    { text: "Cryptocurrency exchange halts withdrawals", topic: "business-finance" },
    { text: "Stock market opens lower", topic: "business-finance" },
    { text: "Technology firms cut spending", topic: "technology" },
    { text: "Voting closes in the capital", topic: "politics" },
    { text: "Border post attacked overnight", topic: "conflict" },
  ];

  for (const { text, topic } of derivedFormCases) {
    test(`matches derived word forms: "${text}" -> ${topic}`, () => {
      expect(deriveTopicFromText([text])).toBe(topic);
    });
  }

  test("scores derived positive and negative forms", () => {
    expect(classifySentimentFromText(["The incumbent won the runoff"])).toBeGreaterThan(0);
    expect(classifySentimentFromText(["A single layoff was announced"])).toBeLessThan(0);
  });

  test("falls back to global and other with no text", () => {
    expect(deriveRegionsFromText([])).toEqual(["global"]);
    expect(deriveTopicFromText([])).toBe("other");
    expect(classifySentimentFromText([])).toBe(0);
  });
});
