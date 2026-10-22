// Spanish text for RideConnect: the "lib" part. See src/lib/i18n.ts and src/i18n/GLOSSARY.md.
// Each line: 'English text (the key)': 'Spanish text'. Keep every {blank} exactly as in English.
export const ES_LIB: Record<string, string> = {
  // ----- labels.ts: appointment types -----
  'Dialysis': 'Diálisis',
  'Checkup': 'Chequeo',
  'Specialist': 'Especialista',
  'Therapy': 'Terapia',
  'Other': 'Otra',

  // ----- labels.ts: weekdays (lowercase in Spanish; capitalize() at the start of a line) -----
  'Sunday': 'domingo',
  'Monday': 'lunes',
  'Tuesday': 'martes',
  'Wednesday': 'miércoles',
  'Thursday': 'jueves',
  'Friday': 'viernes',
  'Saturday': 'sábado',
  'Sun': 'dom',
  'Mon': 'lun',
  'Tue': 'mar',
  'Wed': 'mié',
  'Thu': 'jue',
  'Fri': 'vie',
  'Sat': 'sáb',

  // ----- labels.ts: ride log answers -----
  'On time': 'A tiempo',
  'Late': 'Tarde',
  'Never came': 'Nunca llegó',
  'About 15 minutes': 'Unos 15 minutos',
  'About 30 minutes': 'Unos 30 minutos',
  'An hour or more': 'Una hora o más',
  '15 min': '15 min',
  '30 min': '30 min',
  '60+ min': '60+ min',
  'Made it on time': 'Llegó a tiempo',
  'Arrived late': 'Llegó tarde',
  'Missed the appointment': 'Perdió la cita',
  'Not needed': 'No hizo falta',

  // ----- rideStatus.ts -----
  'Problem': 'Problema',
  'Ride never came': 'El viaje nunca llegó',
  'Missed appointment': 'Perdió la cita',
  'Ride home never came': 'El viaje de regreso nunca llegó',
  'Late pickup': 'Recogida con retraso',
  'Ride home was late': 'El viaje de regreso llegó tarde',
  'All rides': 'Todos los viajes',
  'Problems only': 'Solo problemas',

  // ----- reportStats.ts -----
  'Past month ({from} – {to})': 'Último mes ({from} – {to})',
  'No rides logged in this period.': 'No hay viajes registrados en este período.',
  '{n} was late': '{n} llegó tarde',
  '{n} were late': '{n} llegaron tarde',
  '1 never came': '1 nunca llegó',
  '{n} never came': '{n} nunca llegaron',
  'All {n} ride picked up on time.': 'Se registró {n} viaje y llegó a tiempo.',
  'All {n} rides picked up on time.': 'Los {n} viajes llegaron a tiempo.',
  '{first}, and {second}': '{first} y {second}',
  '1 of 1 ride had a problem: {details}.': '1 de 1 viaje tuvo un problema: {details}.',
  '1 of {total} rides had a problem: {details}.': '1 de {total} viajes tuvo un problema: {details}.',
  '{problems} of {total} rides had a problem: {details}.': '{problems} de {total} viajes tuvieron un problema: {details}.',

  // ----- timeLost.ts -----
  '{n} hour': '{n} hora',
  '{n} hours': '{n} horas',
  '{n} minute': '{n} minuto',
  '{n} minutes': '{n} minutos',
  '{hours} {minutes}': '{hours} y {minutes}',
  'at least {duration}': 'al menos {duration}',
  'about {duration}': 'aproximadamente {duration}',
  '{duration} spent waiting': '{duration} de espera',
  '{n} time a ride never came': '{n} vez en que un viaje nunca llegó',
  '{n} times a ride never came': '{n} veces en que un viaje nunca llegó',
  '{n} late ride home with no time recorded': '{n} viaje de regreso con retraso sin tiempo anotado',
  '{n} late rides home with no time recorded': '{n} viajes de regreso con retraso sin tiempo anotado',
  '{first} and {second}': '{first} y {second}',
  'Not counted: {items} (no wait time was recorded).': 'Sin contar: {items} (no se anotó el tiempo de espera).',
  'Not counted: {items}.': 'Sin contar: {items}.',
  'In total, I spent {duration} waiting for late rides.': 'En total, pasé {duration} esperando viajes que llegaron tarde.',
  'In total, I spent {duration} waiting for late rides, not counting the time a ride never came at all.':
    'En total, pasé {duration} esperando viajes que llegaron tarde, sin contar la vez en que un viaje nunca llegó.',
  'In total, I spent {duration} waiting for late rides, not counting the {n} times a ride never came at all.':
    'En total, pasé {duration} esperando viajes que llegaron tarde, sin contar las {n} veces en que un viaje nunca llegó.',

  // ----- reminders.ts -----
  "{name}'s other appointment": 'la cita de {name}',
  'your other appointment': 'su cita',
  "{name}'s {type} appointment": 'la cita de {type} de {name}',
  'your {type} appointment': 'su cita de {type}',
  // The time isn't last, so "a. m." never runs into the period at the end of a sentence.
  'at {clinic} on {date} at {time}': 'el {date} a las {time}, en {clinic}',
  'Book the ride for {appointment} now': 'Reserve ahora el viaje para {appointment}',
  'Book the ride for {appointment} today': 'Reserve hoy el viaje para {appointment}',
  'Book the ride for {appointment}': 'Reserve el viaje para {appointment}',
  'The appointment is {when}. The booking deadline was {deadline}. Call {company} now — they may still be able to help.':
    'La cita es {when}. La fecha límite para reservar era el {deadline}. Llame ahora a {company}; es posible que todavía puedan ayudarle.',
  'The appointment is {when}. Today is the last day to book the ride.':
    'La cita es {when}. Hoy es el último día para reservar el viaje.',
  'The appointment is {when}. Book the ride by {deadline}.': 'La cita es {when}. Reserve el viaje a más tardar el {deadline}.',

  // ----- recurrence.ts -----
  '{date} at {time}': '{date} a las {time}',
  'Every {days} at {time}': 'Cada {days} a las {time}',

  // ----- waitTimer.ts -----
  "You've waited {minutes} minutes for your ride home": 'Lleva {minutes} minutos esperando su viaje de regreso',
  'Your ride is {minutes} minutes late': 'Su transporte lleva {minutes} minutos de retraso',
  'Call {company} now. If the ride doesn\'t come, you can tap "My ride never came" to record it.':
    'Llame ahora a {company}. Si el transporte no llega, puede tocar "Mi transporte nunca llegó" para anotarlo.',
  'You may want to call {company} and ask where the driver is. Write down who you talk to.':
    'Puede llamar a {company} y preguntar dónde está el vehículo. Anote con quién habla.',

  // ----- bookingWindow.ts -----
  '{n} business day': '{n} día hábil',
  '{n} business days': '{n} días hábiles',

  // ----- validateProfile.ts and validateAppointment.ts -----
  'Please enter a first name.': 'Por favor, escriba un nombre.',
  'Please choose a state.': 'Por favor, elija un estado.',
  'Please enter the ride company name.': 'Por favor, escriba el nombre de la compañía de transporte.',
  'Please enter the full phone number.': 'Por favor, escriba el número de teléfono completo.',
  'Please choose a date.': 'Por favor, elija una fecha.',
  'Please choose a time.': 'Por favor, elija una hora.',
  'Please enter the clinic name.': 'Por favor, escriba el nombre de la clínica.',
  'Please choose at least one day of the week.': 'Por favor, elija al menos un día de la semana.',

  // ----- backup.ts (shown to the user when a backup can't be made or loaded) -----
  'There is no data to back up yet.': 'Todavía no hay datos para guardar en una copia de seguridad.',
  'The rider information in this file is missing or damaged.':
    'En este archivo falta la información de la persona que viaja, o está dañada.',
  'The booking reminder setting in this file is damaged. It must be a number of business days from 1 to 14, or "Not sure".':
    'La configuración del recordatorio para reservar en este archivo está dañada. Debe ser un número de días hábiles del 1 al 14, o "No sé".',
  'The mobility needs setting in this file is damaged. It must be none, walker, wheelchair, or needs help.':
    'La configuración de necesidades de movilidad en este archivo está dañada. Debe ser ninguna, andador, silla de ruedas o necesita ayuda.',
  'The home address in this file is damaged.': 'La dirección de la casa en este archivo está dañada.',
  'An appointment in this file is damaged.': 'Una cita en este archivo está dañada.',
  'The pickup time for the appointment at {clinic} is damaged. It must look like 08:15.':
    'La hora de recogida de la cita en {clinic} está dañada. Debe escribirse así: 08:15.',
  'a clinic': 'una clínica',
  'A ride record in this file is damaged.': 'Un registro de viaje en este archivo está dañado.',
  'The ride record for {date} has a damaged "how late was the ride home" answer.':
    'En el registro del viaje del {date}, la respuesta a "¿qué tan tarde llegó el viaje de regreso?" está dañada.',
  'The ride record for {date} has a damaged wait time. It must be a whole number of minutes.':
    'En el registro del viaje del {date}, el tiempo de espera está dañado. Debe ser un número entero de minutos.',
  'A complaint record in this file is damaged.': 'Un registro de queja en este archivo está dañado.',
  'The complaint sent on {date} is missing who it was sent to.': 'En la queja enviada el {date} falta a quién se envió.',
  'The complaint sent on {date} has a damaged "how it was sent" answer. It must be email, mail, phone call, or online form.':
    'En la queja enviada el {date}, la respuesta a "cómo se envió" está dañada. Debe ser correo electrónico, correo postal, llamada telefónica o formulario en línea.',
  'The complaint sent on {date} has a damaged status. It must be Waiting, Got an answer, Problem fixed, or Not fixed.':
    'En la queja enviada el {date}, el estado está dañado. Debe ser Esperando respuesta, Recibí respuesta, Problema resuelto o No se resolvió.',
  'The complaint sent on {date} has a damaged date.': 'En la queja enviada el {date}, una fecha está dañada.',
  'A record of a booking call in this file is damaged.': 'Un registro de una llamada para reservar en este archivo está dañado.',
  'The booking call on {date} has a damaged reason. It must be "couldn\'t get through", "no rides available", "too late to book", or "something else".':
    'En la llamada para reservar del {date}, el motivo está dañado. Debe ser "no pude comunicarme", "no había viajes disponibles", "era demasiado tarde para reservar" u "otra cosa".',
  'This file is not a RideConnect backup.': 'Este archivo no es una copia de seguridad de RideConnect.',
  'This backup was made by a newer version of RideConnect. Update the app and try again.':
    'Esta copia de seguridad se hizo con una versión más nueva de RideConnect. Actualice la aplicación e inténtelo de nuevo.',
  'This backup file is damaged.': 'Este archivo de copia de seguridad está dañado.',
  'The complaints in this backup file are damaged.': 'Las quejas de este archivo de copia de seguridad están dañadas.',
  'The booking calls in this backup file are damaged.': 'Las llamadas para reservar de este archivo de copia de seguridad están dañadas.',
  'Backups can only be restored outside demo mode.': 'Las copias de seguridad solo se pueden restaurar fuera del modo demo.',
};
