// Tests for the documents RideConnect writes (letters, call script, care
// team summary, PDFs) in Spanish. Run with: npm test
import { afterEach, describe, expect, it } from 'vitest';
import { describeAttempt } from './bookingAttempts';
import { buildCallScript, suggestedPickup } from './callScript';
import { buildCareTeamSummary, summaryToText } from './careTeamSummary';
import { DEMO_TODAY } from './clock';
import { buildComplaintLetter, buildFollowUpLetter, dateRangePhrase, joinDates, joinWords, summarySentence } from './complaintLetter';
import { followUpReminderText } from './complaints';
import { DEMO_APPOINTMENTS, DEMO_BOOKING_ATTEMPTS, DEMO_COMPLAINTS, DEMO_PROFILE, DEMO_RIDE_LOGS } from './demoData';
import { applyLanguage, getLanguage, withLanguage } from './i18n';
import { buildCareTeamPdf, buildLetterPdf, buildReportPdf } from './pdfReport';
import { pdfSafe, type PdfWriter } from './pdfWriter';
import { computeStats, findPeriod, reportPeriods } from './reportStats';
import { getStateRule } from './stateRules';
import type { RideLog } from '../types';

afterEach(() => applyLanguage('en'));

const es = <T,>(build: () => T) => withLanguage('es', build);
const period = findPeriod(reportPeriods(DEMO_TODAY, DEMO_RIDE_LOGS), 'past-month');
const stats = computeStats(DEMO_RIDE_LOGS, period.from, period.to, DEMO_BOOKING_ATTEMPTS);
const letterInput = {
  profile: DEMO_PROFILE,
  logs: DEMO_RIDE_LOGS,
  period,
  today: DEMO_TODAY,
  stateRule: getStateRule('WA'),
  attempts: DEMO_BOOKING_ATTEMPTS,
};
const followUpInput = { profile: DEMO_PROFILE, logs: DEMO_RIDE_LOGS, complaint: DEMO_COMPLAINTS[0], today: DEMO_TODAY, attempts: DEMO_BOOKING_ATTEMPTS };
const careTeam = () => summaryToText(buildCareTeamSummary({ profile: DEMO_PROFILE, logs: DEMO_RIDE_LOGS, attempts: DEMO_BOOKING_ATTEMPTS, period, today: DEMO_TODAY }));

/** The text drawn in a PDF (the same way the other PDF tests read it). */
function pdfText(pdf: PdfWriter): string {
  return [...pdf.doc.output().matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map((m) => m[1].replace(/\\([()\\])/g, '$1')).join(' ');
}

/**
 * Checks that no English slipped into Spanish text. User-entered notes are
 * in "quotes" and the state's contact names are data, so they're left out.
 */
function expectNoEnglish(text: string) {
  const ours = text.replace(/"[^"]*"/g, '').replace(/^Para: .*$/m, '');
  for (const word of [' the ', ' and ', ' of ', 'rides', 'ride ', 'October', 'September', 'Sincerely', 'appointment', ' AM', ' PM']) {
    expect(ours, `found "${word}"`).not.toContain(word);
  }
}

let n = 0;
function log(rideDate: string, overrides: Partial<RideLog> = {}): RideLog {
  return {
    id: `l${n++}`, appointmentId: 'a', clinicName: 'Clinic', appointmentType: 'dialysis', rideDate,
    pickupStatus: 'on_time', minutesLate: null, appointmentOutcome: 'made_it', returnRideStatus: 'on_time',
    notes: '', recordedAt: `${rideDate}T15:00:00.000Z`, ...overrides,
  };
}

describe('Spanish grammar helpers', () => {
  it('joins words and dates the Spanish way', () => {
    es(() => {
      expect(joinWords(['A', 'B'])).toBe('A y B');
      expect(joinWords(['A', 'B', 'C'])).toBe('A, B y C');
      expect(joinDates(['2026-10-14'])).toBe('14 de octubre de 2026');
      expect(joinDates(['2026-10-14', '2026-10-21'])).toBe('14 y 21 de octubre de 2026');
      expect(joinDates(['2026-09-30', '2026-10-14'])).toBe('30 de septiembre y 14 de octubre de 2026');
      expect(joinDates(['2026-12-30', '2027-01-04'])).toBe('30 de diciembre de 2026 y 4 de enero de 2027');
    });
  });

  it('describes date ranges', () => {
    es(() => {
      expect(dateRangePhrase('2026-09-30', '2026-10-28')).toBe('Entre el 30 de septiembre y el 28 de octubre de 2026,');
      expect(dateRangePhrase('2026-12-15', '2027-01-10')).toBe('Entre el 15 de diciembre de 2026 y el 10 de enero de 2027,');
      expect(dateRangePhrase('2026-10-14', '2026-10-14')).toBe('El 14 de octubre de 2026,');
    });
  });

  it('writes the summary sentence, with "1 vez" and "2 veces"', () => {
    es(() => {
      expect(summarySentence([log('2026-10-02', { pickupStatus: 'late', minutesLate: 15 })])).toBe(
        'El 2 de octubre de 2026, los viajes que tenía programados llegaron tarde 1 vez.',
      );
      expect(
        summarySentence([
          log('2026-10-14', { pickupStatus: 'never_came', appointmentOutcome: 'missed' }),
          log('2026-10-21', { pickupStatus: 'never_came', appointmentOutcome: 'missed' }),
        ]),
      ).toBe(
        'Entre el 14 de octubre y el 21 de octubre de 2026, los viajes que tenía programados no llegaron 2 veces, ' +
          'por lo que perdí mis citas de diálisis los días 14 y 21 de octubre de 2026.',
      );
      expect(summarySentence([log('2026-10-14', { appointmentOutcome: 'missed', appointmentType: 'therapy' })])).toBe(
        'Perdí mi cita de terapia el 14 de octubre de 2026.',
      );
    });
  });
});

describe('the complaint letter in Spanish', () => {
  const letter = es(() => buildComplaintLetter(letterInput));

  it('is formal, natural Spanish', () => {
    expect(letter.split('\n')[0]).toBe('Viernes, 30 de octubre de 2026');
    expect(letter).toContain('Asunto: Queja sobre el transporte médico que no es de emergencia (NEMT) de Medicaid');
    expect(letter).toContain('A quien corresponda:');
    expect(letter).toContain(
      'Me llamo Rosa. Soy miembro de Medicaid con el plan de salud Sample Health Plan y dependo de Sample Ride Co. para los viajes a mis citas médicas.',
    );
    expect(letter).toContain(
      'Entre el 30 de septiembre y el 28 de octubre de 2026, los viajes que tenía programados llegaron tarde 5 veces ' +
        'y no llegaron 2 veces, por lo que perdí mi cita de diálisis el 14 de octubre de 2026.',
    );
    expect(letter).toContain('En una de estas ocasiones, el vehículo llegó con una hora o más de retraso.');
    expect(letter).toContain('Mi viaje de regreso también llegó tarde 1 vez.');
    expect(letter).toContain('También llamé 1 vez para reservar un viaje y no logré reservarlo (el 29 de octubre de 2026).');
    expect(letter).toContain('- Miércoles, 14 de octubre de 2026: El viaje nunca llegó. Perdí mi cita de diálisis. Nota: "Called the ride company twice.');
    expect(letter).toContain('- Jueves, 29 de octubre de 2026: Cuando llamé para reservar mi viaje del martes, 3 de noviembre de 2026: no pude comunicarme.');
    expect(letter).toContain('La diálisis es un tratamiento que me mantiene con vida.');
    expect(letter).toContain('Atentamente,');
    expect(letter).toContain('[Su nombre completo, número de Medicaid y número de teléfono]');
    expect(letter).toContain('Esta carta se preparó con la ayuda de la persona que me cuida, Maria.');
  });

  it('uses the same numbers as computeStats', () => {
    const problemRides = stats.problemRides;
    expect(letter).toContain(`En total, registré ${stats.totalRides} viajes durante este tiempo y ${problemRides} viajes tuvieron algún problema.`);
  });

  it('has no English left (except the rider\'s own notes)', () => {
    expectNoEnglish(letter);
  });

  it('keeps the rider\'s notes as written', () => {
    expect(letter).toContain('Nota: "Waited 2 hours for ride home. A neighbor finally gave a ride."');
  });
});

describe('the follow-up letter in Spanish', () => {
  const letter = es(() => buildFollowUpLetter(followUpInput));

  it('points back to the first complaint', () => {
    expect(letter).toContain('Para: Sample Health Plan');
    expect(letter).toContain(
      'Asunto: Seguimiento de mi queja del 16 de octubre de 2026 (número de referencia DEMO-C-1016) sobre el transporte médico que no es de emergencia (NEMT) de Medicaid',
    );
    expect(letter).toContain(
      'El 16 de octubre de 2026, envié una queja a Sample Health Plan por correo electrónico sobre los problemas repetidos con estos viajes. ' +
        'El número de referencia es DEMO-C-1016. Hoy, 14 días después, todavía no he recibido ninguna respuesta.',
    );
    expect(letter).toContain('Desde que envié mi queja, los problemas han continuado.');
    expect(letter).toContain('1. Responda por escrito a mi queja del 16 de octubre de 2026 (número de referencia DEMO-C-1016).');
    expect(letter).toContain('3. Me diga qué se hará para que mis viajes lleguen a tiempo.');
    expect(letter).toContain('pienso comunicarme con la oficina estatal de Medicaid');
  });

  it('counts the new rides with computeStats', () => {
    const since = computeStats(DEMO_RIDE_LOGS, '2026-10-17', DEMO_TODAY, DEMO_BOOKING_ATTEMPTS);
    expect(letter).toContain(
      `Desde el 16 de octubre de 2026, registré ${since.totalRides} viajes y ${since.problemRides} viajes tuvieron algún problema.`,
    );
  });

  it('says "1 día" for one day', () => {
    const oneDay = es(() => buildFollowUpLetter({ ...followUpInput, today: '2026-10-17' }));
    expect(oneDay).toContain('Hoy, 1 día después, todavía no he recibido ninguna respuesta.');
    expect(oneDay).toContain('No he registrado ningún viaje desde el 16 de octubre de 2026');
  });

  it('has no English left (except the rider\'s own notes)', () => {
    expectNoEnglish(letter);
  });
});

describe('the call script in Spanish', () => {
  const cardiology = DEMO_APPOINTMENTS[1];

  it('reads naturally, with "a las" and "a la"', () => {
    const script = es(() =>
      buildCallScript({
        profile: DEMO_PROFILE, appointment: cardiology, tripDate: '2026-11-03',
        pickupTime: suggestedPickup(cardiology), returnTime: '13:15', noReturnRide: false, notes: '',
      }),
    );
    expect(script.split('\n')).toEqual([
      'Hola, me llamo Maria. Llamo para reservar un viaje de Medicaid para Rosa.',
      'El número de Medicaid de Rosa es [número de Medicaid].',
      'La cita con el especialista es el martes, 3 de noviembre de 2026 a las 10:30 a. m.',
      'Es en Sample Heart Clinic (cardiology), 200 Example Avenue, Sampletown.',
      'Por favor, recoja a Rosa en 300 Sample Lane, Sampletown a las 9:30 a. m.',
      'Rosa también necesitará un viaje de regreso a la 1:15 p. m.',
      'Rosa usa andador.',
      '¿Me puede repetir la hora de recogida y darme un número de confirmación?',
    ]);
  });

  it('puts Spanish [blanks] for what is not known', () => {
    const script = es(() =>
      buildCallScript({
        profile: { ...DEMO_PROFILE, caregiverName: '', homeAddress: '', mobilityNeeds: undefined },
        appointment: { ...cardiology, clinicAddress: '' }, tripDate: '2026-11-03',
        pickupTime: '', returnTime: '', noReturnRide: false, notes: '',
      }),
    );
    expect(script).toContain('Hola, me llamo [su nombre].');
    expect(script).toContain('[dirección de la clínica]');
    expect(script).toContain('Por favor, recoja a Rosa en [dirección de la casa] a [hora de recogida].');
    expect(script).toContain('Rosa también necesitará un viaje de regreso a [hora a la que podrá salir].');
    expect(script).toContain('[Necesidades de movilidad, como andador o silla de ruedas]');
  });
});

describe('the care team summary in Spanish', () => {
  const text = es(careTeam);

  it('uses the same numbers as computeStats', () => {
    expect(text).toContain(
      `- ${stats.totalRides} viajes registrados. En ${stats.latePickups + stats.noShows} de las recogidas, el vehículo llegó tarde o nunca llegó, ` +
        `y otros ${stats.problemRides - stats.latePickups - stats.noShows} viajes tuvieron un problema después (como el viaje de regreso).`,
    );
    expect(text).toContain(
      `- ${stats.latePickups} recogidas con retraso, ${stats.noShows} viajes que nunca llegaron, 1 viaje de regreso que nunca llegó y 1 viaje de regreso con retraso.`,
    );
    expect(text).toContain(`- Citas perdidas: ${stats.missedAppointments} (diálisis el 14 de octubre de 2026).`);
    expect(text).toContain('- 1 llamada para reservar un viaje no dio resultado.');
  });

  it('has the title, period, worst problems, and how to help', () => {
    expect(text.split('\n')[0]).toBe('Resumen de viajes para el equipo de atención médica de Rosa');
    expect(text).toContain('Del 30 de septiembre de 2026 al 30 de octubre de 2026 (preparado el 30 de octubre de 2026)');
    expect(text).toContain('Cada viaje fue registrado el mismo día por Maria.');
    expect(text).toContain('LOS 3 PROBLEMAS MÁS GRAVES');
    expect(text).toContain('- Miércoles, 14 de octubre de 2026: El viaje nunca llegó y Rosa perdió su sesión de diálisis.');
    expect(text).toContain('CÓMO PUEDE AYUDAR');
    expect(text).toContain('¿Tiene preguntas? Comuníquese con Maria o Rosa. [Agregue su número de teléfono]');
  });

  it('uses the singular for one ride', () => {
    const one = es(() =>
      summaryToText(
        buildCareTeamSummary({ profile: DEMO_PROFILE, logs: [DEMO_RIDE_LOGS[6]], period, today: DEMO_TODAY }),
      ),
    );
    expect(one).toContain('- 1 viaje registrado. En 1 de las recogidas, el vehículo llegó tarde o nunca llegó.');
    expect(one).toContain('- 1 viaje que nunca llegó.');
    expect(one).toContain('EL PROBLEMA MÁS GRAVE');
  });

  it('has no English left (except the rider\'s own notes)', () => {
    expectNoEnglish(text);
  });
});

describe('other Spanish text', () => {
  it('describes failed booking calls and complaint reminders', () => {
    es(() => {
      expect(describeAttempt(DEMO_BOOKING_ATTEMPTS[0])).toBe(
        'Cuando llamé para reservar mi viaje del martes, 3 de noviembre de 2026: no pude comunicarme. Nota: "On hold for 25 minutes, then the call dropped."',
      );
      expect(followUpReminderText(DEMO_COMPLAINTS[0], DEMO_TODAY)).toEqual({
        title: '¿Recibió respuesta de Sample Health Plan?',
        body: 'Usted envió una queja el 16 de octubre de 2026 (hace 14 días), número de referencia DEMO-C-1016.',
      });
      expect(followUpReminderText(DEMO_COMPLAINTS[0], '2026-10-17').body).toContain('(hace 1 día)');
    });
  });
});

describe('Spanish PDFs', () => {
  it('keeps Spanish accents and marks safe', () => {
    expect(pdfSafe('¿Qué pasó? ¡Sí! Año, pingüino, sesión, día, también, número')).toBe(
      '¿Qué pasó? ¡Sí! Año, pingüino, sesión, día, también, número',
    );
  });

  it('writes the care team PDF in Spanish, with a Spanish footer', () => {
    const pdf = es(() => buildCareTeamPdf(buildCareTeamSummary({ profile: DEMO_PROFILE, logs: DEMO_RIDE_LOGS, attempts: DEMO_BOOKING_ATTEMPTS, period, today: DEMO_TODAY })));
    expect(pdf.doc.getNumberOfPages()).toBe(1);
    const text = pdfText(pdf);
    expect(text).toContain('Resumen de viajes para el equipo de atención médica de Rosa');
    expect(text).toContain('Cómo puede ayudar');
    expect(text).toContain('Creado con RideConnect.');
    expect(text).toContain('Página 1 de 1');
  });

  it('writes the report PDF in Spanish', () => {
    const pdf = es(() => buildReportPdf({ profile: DEMO_PROFILE, logs: DEMO_RIDE_LOGS, period, today: DEMO_TODAY, chartImage: null, attempts: DEMO_BOOKING_ATTEMPTS }));
    const text = pdfText(pdf);
    expect(text).toContain('Informe de viajes de RideConnect');
    expect(text).toContain('Total de viajes registrados');
    expect(text).toContain('Llamadas fallidas para reservar un viaje');
    expect(text).toContain('Llamadas para reservar un viaje que no dieron resultado');
    expect(text).toContain('no pude comunicarme');
    expect(text).toContain('Mié, 14 de octubre');
    expect(text).toContain('Página 1 de');
    expect(text).not.toContain('Page 1 of');
  });

  it('writes the letter PDF footer in Spanish', () => {
    const letter = es(() => buildComplaintLetter(letterInput));
    const text = pdfText(es(() => buildLetterPdf(letter)));
    expect(text).toContain('A quien corresponda:');
    expect(text).toContain('RideConnect no está afiliado a ningún estado');
  });
});

describe('English is unchanged', () => {
  it('gives the same English before and after a Spanish document', () => {
    const before = [buildComplaintLetter(letterInput), buildFollowUpLetter(followUpInput), careTeam()];
    es(() => [buildComplaintLetter(letterInput), buildFollowUpLetter(followUpInput), careTeam()]);
    expect(getLanguage()).toBe('en');
    expect([buildComplaintLetter(letterInput), buildFollowUpLetter(followUpInput), careTeam()]).toEqual(before);
    expect(before[0]).toContain('To whom it may concern:');
    expect(before[0]).toContain(
      'Between September 30 and October 28, 2026, my scheduled rides were late 5 times and did not arrive 2 times, ' +
        'causing me to miss my dialysis appointment on October 14, 2026.',
    );
    expect(pdfText(buildCareTeamPdf(buildCareTeamSummary({ profile: DEMO_PROFILE, logs: DEMO_RIDE_LOGS, period, today: DEMO_TODAY })))).toContain('Page 1 of 1');
  });

  it('can write an English letter while the app is in Spanish', () => {
    applyLanguage('es');
    const english = withLanguage('en', () => buildComplaintLetter(letterInput));
    expect(english).toContain('To whom it may concern:');
    expect(english).toContain('Sincerely,');
    expect(buildComplaintLetter(letterInput)).toContain('A quien corresponda:');
  });
});
