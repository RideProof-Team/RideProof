// ---------------------------------------------------------------------------
// LanguageSwitch.tsx — switching between English and Español.
//
//   - LanguageButton: one small button in the header. It always shows the
//     OTHER language's name in that language ("Español" / "English"), so a
//     Spanish speaker can find it without reading English.
//   - LanguageChoice: the English / Español choice in Settings.
// The lang="..." attributes tell screen readers which voice to use.
// ---------------------------------------------------------------------------
import { LANGUAGE_NAMES, LANGUAGES, setLanguage, t, useLanguage, type Language } from '../lib/i18n';

export function LanguageButton() {
  const language = useLanguage();
  const other: Language = language === 'en' ? 'es' : 'en';
  return (
    <button
      type="button"
      className="demo-button language-button"
      onClick={() => setLanguage(other)}
      lang={other}
      aria-label={other === 'es' ? 'Cambiar a español' : 'Switch to English'}
    >
      {LANGUAGE_NAMES[other]}
    </button>
  );
}

export function LanguageChoice() {
  const language = useLanguage();
  return (
    <fieldset className="choice-group">
      <legend>{t('Language')}</legend>
      <div className="chip-row">
        {LANGUAGES.map((value) => (
          <label key={value} className="chip" lang={value}>
            <input type="radio" name="language" checked={language === value} onChange={() => setLanguage(value)} />
            <span>{LANGUAGE_NAMES[value]}</span>
          </label>
        ))}
      </div>
      <p className="field-hint">{t('Letters, scripts, and summaries can still be written in English when you need to send them.')}</p>
    </fieldset>
  );
}

/**
 * "Write it in: English / Español" for a letter, script, summary, or PDF.
 * Starts in the app's language.
 */
export function DocumentLanguage({ id, value, onChange }: { id: string; value: Language; onChange(language: Language): void }) {
  return (
    <div className="field">
      <label htmlFor={id}>{t('Language of this document')}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as Language)}>
        {LANGUAGES.map((l) => (
          <option key={l} value={l} lang={l}>{LANGUAGE_NAMES[l]}</option>
        ))}
      </select>
    </div>
  );
}
