# RideConnect Spanish glossary

RideConnect's Spanish is for Medicaid members in the United States, many of them older adults, people with disabilities, or caregivers. Use the same words everywhere, so the app feels like one voice.

## Tone

- **Usted**, always ("Guarde", "Llame", "¿Llegó a tiempo?"). It is respectful, and most riders are older adults.
- Short sentences and everyday words, the way a helpful clinic receptionist would talk. No slang and no regional words.
- Avoid gendered words about the user. Write "Yo soy quien viaja", not "Soy el pasajero", and "persona que cuida", not "el cuidador". When a short label needs it, use "cuidador(a)".
- Headings capitalize only the first word ("Historial de viajes", not "Historial De Viajes").
- Use opening marks: ¿…? and ¡…!
- Weekdays and months are lowercase in Spanish. Use `capitalize()` from `lib/dates.ts` when a date starts a line or a title.
- Never write month names or times by hand. Use `formatLongDate`, `formatDateInSentence`, `formatShortDate`, `formatMonthYear` and `formatTime` from `lib/dates.ts`. They follow the app's language.
- Lists use "y" without a comma before it ("A, B y C").
- Keep every `{blank}` exactly as it is in the English key.

## Words

| English | Español |
|---|---|
| ride (a trip) | viaje |
| rides | viajes |
| medical rides / NEMT | transporte médico (que no es de emergencia, NEMT) |
| ride company | compañía de transporte |
| pickup | recogida |
| pickup time | hora de recogida |
| ride home / return ride | viaje de regreso |
| driver | conductor(a), or "el vehículo" when the sentence is about the ride arriving |
| on time | a tiempo |
| late | tarde (or "con retraso") |
| never came | nunca llegó (plural: nunca llegaron) |
| stranded | sin transporte para regresar |
| appointment | cita |
| dialysis / checkup / specialist / therapy / other | diálisis / chequeo / especialista / terapia / otra |
| clinic | clínica |
| check in (verb) / check-in (noun) | registrar el viaje / registro |
| Check in on today's ride | Registrar el viaje de hoy |
| book a ride | reservar un viaje |
| booked / not booked | reservado / sin reservar |
| booking reminder | recordatorio para reservar |
| business days | días hábiles |
| confirmation number | número de confirmación |
| Where's my ride? (timer) | ¿Dónde está mi transporte? |
| ride timer | cronómetro de espera |
| time spent waiting / time lost | tiempo de espera / tiempo perdido esperando |
| History | Historial |
| Report | Informe |
| Schedule (menu) | Agenda |
| Home (menu) | Inicio |
| Help | Ayuda |
| Settings | Configuración |
| complaint / complaint letter | queja / carta de queja |
| follow-up letter | carta de seguimiento |
| reference number | número de referencia |
| Waiting for an answer / Got an answer / Problem fixed / Not fixed | Esperando respuesta / Recibí respuesta / Problema resuelto / No se resolvió |
| health plan | plan de salud |
| state Medicaid office | oficina estatal de Medicaid |
| care team | equipo de atención médica |
| rider (the person who rides) | la persona que viaja (in a sentence); "Yo soy quien viaja" (setup choice) |
| caregiver | persona que cuida / cuidador(a) |
| walker / wheelchair | andador / silla de ruedas |
| mobility needs | necesidades de movilidad |
| backup (file) / restore | copia de seguridad / restaurar |
| notification | notificación |
| Demo / Exit demo / Demo mode — sample data. | Demo / Salir de la demo / Modo demo: datos de ejemplo. |
| sample (fictional) | de ejemplo |
| Save / Cancel / Undo / Delete / Edit | Guardar / Cancelar / Deshacer / Eliminar / Editar |
| Copy / Email / Download PDF / Print | Copiar / Enviar por correo / Descargar PDF / Imprimir |
| Call {name} | Llamar a {name} |
| Back | Volver |
| Loading… | Cargando… |
| optional | opcional |

## Letters

Letters to agencies are formal. Start with "A quien corresponda:" and end with "Atentamente,". Write NEMT as "transporte médico que no es de emergencia (NEMT)" the first time it appears.

## Never translate

User-entered text, clinic and company names, the demo story's notes and names, state contact names from `stateRules.json`, "RideConnect", "Medicaid", and internal names such as storage keys and the backup format name.
