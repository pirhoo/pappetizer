import { LabeledDateExtractor } from './LabeledDateExtractor.js';
import { IsoDateExtractor } from './IsoDateExtractor.js';
import { SlashDateExtractor } from './SlashDateExtractor.js';
import { MonthNameDateExtractor } from './MonthNameDateExtractor.js';
import { GermanDateExtractor } from './GermanDateExtractor.js';

export {
  LabeledDateExtractor,
  IsoDateExtractor,
  SlashDateExtractor,
  MonthNameDateExtractor,
  GermanDateExtractor,
};

/**
 * Default date extractors in priority order
 */
export function getDefaultDateExtractors() {
  return [
    new LabeledDateExtractor(),
    new IsoDateExtractor(),
    new SlashDateExtractor(),
    new MonthNameDateExtractor(),
    new GermanDateExtractor(),
  ];
}
