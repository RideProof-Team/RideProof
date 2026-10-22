// ---------------------------------------------------------------------------
// All the Spanish text, put together from one file per part of the app
// (so several people can translate at once without editing the same file).
// ---------------------------------------------------------------------------
import { ES_COMPLAINTS } from './complaints';
import { ES_CORE } from './core';
import { ES_LETTERS } from './letters';
import { ES_LIB } from './lib';
import { ES_RIDE } from './ride';
import { ES_SETUP } from './setup';

/** Each part, by name (the i18n test checks they don't disagree). */
export const ES_PARTS: Record<string, Record<string, string>> = {
  core: ES_CORE,
  lib: ES_LIB,
  letters: ES_LETTERS,
  ride: ES_RIDE,
  complaints: ES_COMPLAINTS,
  setup: ES_SETUP,
};

export const ES: Record<string, string> = Object.assign({}, ...Object.values(ES_PARTS));
