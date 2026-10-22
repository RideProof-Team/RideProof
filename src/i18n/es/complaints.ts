// Spanish text for RideConnect: the "complaints" part. See src/lib/i18n.ts and src/i18n/GLOSSARY.md.
// Each line: 'English text (the key)': 'Spanish text'. Keep every {blank} exactly as in English.
export const ES_COMPLAINTS: Record<string, string> = {
  // ----- Shared words (same Spanish as the glossary) -----
  'Report': 'Informe',
  'Save': 'Guardar',
  'Delete': 'Eliminar',
  'Print': 'Imprimir',
  'Download PDF': 'Descargar PDF',
  'Time period': 'Período',
  'What happened?': '¿Qué pasó?',
  'Got an answer': 'Recibí respuesta',
  'Problem fixed': 'Problema resuelto',
  'Not fixed': 'No se resolvió',
  'PDF downloaded.': 'PDF descargado.',

  // ----- Report -----
  'Total rides': 'Total de viajes',
  'Late pickups': 'Recogidas tarde',
  'Missed appointments': 'Citas perdidas',
  'Stranded: ride home never came': 'Sin transporte para regresar: el viaje de regreso nunca llegó',
  'Calls to book that failed': 'Llamadas para reservar que no funcionaron',
  'How late: {list}': 'Cuánto tarde: {list}',
  '15 min ({n})': '15 min ({n})',
  '30 min ({n})': '30 min ({n})',
  '60+ min ({n})': '60+ min ({n})',
  'Rides by week': 'Viajes por semana',
  'Show as a table': 'Mostrar como tabla',
  'Rides by week table': 'Tabla de viajes por semana',
  'Week of': 'Semana del',
  'Why booking failed: {list}': 'Por qué no se pudo reservar: {list}',
  '{reason} ({n})': '{reason} ({n})',
  'Check in after each ride, and your report will appear here.':
    'Registre cada viaje cuando termine, y su informe aparecerá aquí.',
  'Making PDF…': 'Creando el PDF…',
  'Download PDF report': 'Descargar informe en PDF',
  'Share with my care team': 'Compartir con mi equipo de atención médica',
  'Create complaint letter': 'Crear carta de queja',
  'Complaints you sent': 'Quejas que envió',
  'After you send a complaint, record it here and RideConnect will remind you to follow up.':
    'Después de enviar una queja, anótela aquí y RideConnect le recordará darle seguimiento.',
  '{n} complaint recorded': '{n} queja anotada',
  '{n} complaints recorded': '{n} quejas anotadas',
  '{n} complaint recorded.': '{n} queja anotada.',
  '{n} complaints recorded.': '{n} quejas anotadas.',
  '{recorded}, {waiting} still waiting for an answer.': '{recorded}; sin respuesta todavía: {waiting}.',
  'Record a complaint I sent': 'Anotar una queja que envié',
  'See my complaints': 'Ver mis quejas',

  // ----- Complaint letter -----
  'Follow-up letter': 'Carta de seguimiento',
  'Complaint letter': 'Carta de queja',
  'Complaints': 'Quejas',
  'Leave without saving your edits?': '¿Salir sin guardar sus cambios?',
  'Your changes to the letter will be lost. Copy it or download it first if you want to keep them.':
    'Se perderán los cambios que hizo en la carta. Cópiela o descárguela antes si quiere conservarlos.',
  'Leave and lose edits': 'Salir y perder los cambios',
  "That complaint couldn't be found. It may have been deleted.":
    'No se encontró esa queja. Es posible que se haya eliminado.',
  'Complaint about Medicaid non-emergency medical transportation (NEMT)':
    'Queja sobre el transporte médico que no es de emergencia (NEMT) de Medicaid',
  'Follow-up: {subject} (sent {date})': 'Seguimiento: {subject} (enviada el {date})',
  'Letter copied. You can paste it into an email or a form.':
    'Carta copiada. Puede pegarla en un correo electrónico o en un formulario.',
  'Copying was blocked. The letter is selected, so you can copy it yourself.':
    'No se pudo copiar. La carta está seleccionada, así que puede copiarla usted.',
  'This letter follows up on the complaint you sent to {who} on {date}. It lists the ride problems logged since then.':
    'Esta carta da seguimiento a la queja que envió a {who} el {date}. Incluye los problemas con los viajes anotados desde entonces.',
  'Changing the time period rewrites the letter.': 'Si cambia el período, la carta se vuelve a escribir.',
  "No ride problems were logged in this time period, so there is nothing to complain about. That's good news!":
    'No se anotaron problemas con los viajes en este período, así que no hay nada de qué quejarse. ¡Qué buena noticia!',
  'Who to send it to': 'A quién enviarla',
  "Send it to {who} again. If they still don't answer, your state Medicaid office can help:":
    'Envíela otra vez a {who}. Si todavía no le responden, la oficina estatal de Medicaid puede ayudarle:',
  '{company} (your ride company): {phone}': '{company} (su compañía de transporte): {phone}',
  '{plan} (your health plan): call the member services number on your card.':
    '{plan} (su plan de salud): llame al número de servicios para miembros que aparece en su tarjeta.',
  'Your letter (you can change anything)': 'Su carta (puede cambiar lo que quiera)',
  'Fill in the part in [brackets] before sending.': 'Complete la parte entre [corchetes] antes de enviarla.',
  'Undo my changes': 'Deshacer mis cambios',
  'Copy letter': 'Copiar la carta',
  'Email letter': 'Enviar la carta por correo',
  'After you send it': 'Después de enviarla',
  "Tell RideConnect you sent it. In {days} days, if you haven't heard back, it will remind you to follow up.":
    'Avísele a RideConnect que la envió. En {days} días, si no le han respondido, le recordará darle seguimiento.',
  'I sent this follow-up': 'Envié esta carta de seguimiento',
  'I sent this complaint': 'Envié esta queja',

  // ----- Complaints you sent -----
  'Delete this complaint record?': '¿Eliminar el registro de esta queja?',
  'The record of your complaint to {name} on {date} will be removed. Your ride records stay.':
    'Se eliminará el registro de su queja a {name} del {date}. Sus registros de viajes se quedan.',
  'Complaint record deleted.': 'Registro de la queja eliminado.',
  "Keep track of each complaint after you send it. RideConnect reminds you to follow up if you haven't heard back in 14 days.":
    'Lleve el control de cada queja después de enviarla. RideConnect le recuerda darle seguimiento si no le han respondido en 14 días.',
  'Write a new complaint letter': 'Escribir una nueva carta de queja',
  'No complaints recorded yet. After you send a complaint letter, tap "I sent this complaint" so RideConnect can remind you to follow up.':
    'Todavía no hay quejas anotadas. Después de enviar una carta de queja, toque "Envié esta queja" para que RideConnect le recuerde darle seguimiento.',
  'Updated. See "What you can do next" below.': 'Actualizada. Vea "Lo que puede hacer ahora" más abajo.',
  'Complaint updated.': 'Queja actualizada.',
  'To {name}': 'A {name}',
  'Sent': 'Enviada',
  '{date} by {method}': '{date}, por {method}',
  'Reference number': 'Número de referencia',
  'Follow-up to': 'Seguimiento de',
  'Your complaint of {date}': 'Su queja del {date}',
  'Follow-up reminder': 'Recordatorio de seguimiento',
  'Now: it has been 14 days or more': 'Ahora: ya pasaron 14 días o más',
  'Updated': 'Actualizada',
  'For example: who you talked to, or what they promised.': 'Por ejemplo: con quién habló o qué le prometieron.',
  'Update status or notes': 'Actualizar el estado o las notas',
  'No answer yet? {link}.': '¿Todavía no le responden? {link}.',
  'Write a follow-up letter': 'Escribir una carta de seguimiento',
  'What you can do next': 'Lo que puede hacer ahora',
  'Send a follow-up letter.': 'Envíe una carta de seguimiento.',
  'It mentions your complaint of {date} (reference number {ref}) and lists the problems since then.':
    'Menciona su queja del {date} (número de referencia {ref}) e incluye los problemas desde entonces.',
  'It mentions your complaint of {date} and lists the problems since then.':
    'Menciona su queja del {date} e incluye los problemas desde entonces.',
  'Contact your state Medicaid office.': 'Comuníquese con la oficina estatal de Medicaid.',
  "They oversee the ride program and can step in when a complaint isn't fixed.":
    'Supervisan el programa de transporte y pueden intervenir cuando una queja no se resuelve.',

  // ----- I sent a complaint -----
  'What you entered about this complaint will be lost.': 'Se perderá lo que escribió sobre esta queja.',
  'I sent a complaint': 'Envié una queja',
  'I sent the follow-up': 'Envié la carta de seguimiento',
  "Saved. If you haven't heard back by {date}, RideConnect will remind you.":
    'Guardado. Si no le han respondido para el {date}, RideConnect se lo recordará.',
  'Saved. It has been 14 days already, so you can update what happened right away.':
    'Guardado. Ya pasaron 14 días, así que puede anotar ahora mismo lo que pasó.',
  "Write down when and where you sent it. {days} days later, if you're still waiting for an answer, RideConnect will remind you to follow up.":
    'Anote cuándo y adónde la envió. {days} días después, si todavía espera respuesta, RideConnect le recordará darle seguimiento.',
  'This is a follow-up to your complaint of {date} to {name}.': 'Esto da seguimiento a su queja del {date} a {name}.',
  'Date you sent it': 'Fecha en que la envió',
  'Who did you send it to?': '¿A quién se la envió?',
  'Someone else (type the name)': 'A otra persona u oficina (escriba el nombre)',
  'Name of the person or office': 'Nombre de la persona u oficina',
  'How did you send it?': '¿Cómo la envió?',
  'Reference or case number (optional)': 'Número de referencia o de caso (opcional)',
  'If they gave you one. A follow-up letter will mention it.': 'Si le dieron uno. La carta de seguimiento lo mencionará.',

  // ----- Complaint contacts -----
  "RideConnect doesn't have contacts for your state yet. Your state Medicaid website, or the member services number on your Medicaid card, can tell you where to send transportation complaints.":
    'RideConnect todavía no tiene contactos para su estado. El sitio web de Medicaid de su estado, o el número de servicios para miembros de su tarjeta de Medicaid, le puede decir adónde enviar las quejas sobre el transporte.',
  'These contacts are placeholders. Check your state Medicaid website for the right place to send complaints.':
    'Estos contactos son de ejemplo. Busque en el sitio web de Medicaid de su estado el lugar correcto para enviar quejas.',
  'Phone: {phone}': 'Teléfono: {phone}',
  'Email: {email}': 'Correo electrónico: {email}',
  'Website': 'Sitio web',

  // ----- "Did you hear back?" on Home -----
  '{body} Open RideConnect to update what happened.': '{body} Abra RideConnect para anotar lo que pasó.',
  'Complaint follow-up': 'Seguimiento de quejas',
  'OK. RideConnect will ask again in {days} days.': 'De acuerdo. RideConnect le volverá a preguntar en {days} días.',
  'Still waiting: remind me in {days} days': 'Sigo esperando: recordarme en {days} días',
  'Add notes or see details': 'Agregar notas o ver detalles',

  // ----- Care team summary -----
  "A short, friendly summary for {name}'s doctor, nurse, dialysis social worker, or case manager. It explains how ride problems are affecting care.":
    'Un resumen corto y amable para el médico, la enfermera, el trabajador social de diálisis o el administrador de casos de {name}. Explica cómo los problemas con los viajes están afectando la atención médica.',
  'Summary preview': 'Vista previa del resumen',
  'Fill in the part in [brackets] before sending, or after you paste it.':
    'Complete la parte entre [corchetes] antes de enviarlo o después de pegarlo.',
  'Summary copied. You can paste it into a message or a patient portal.':
    'Resumen copiado. Puede pegarlo en un mensaje o en un portal para pacientes.',
  'Copying was blocked. You can use Email or Download PDF instead.':
    'No se pudo copiar. Puede usar "Enviar por correo" o "Descargar PDF".',
  'Copy summary': 'Copiar el resumen',
  'Email summary': 'Enviar el resumen por correo',

  // ----- Call to book a ride -----
  'Call to book a ride': 'Llamar para reservar un viaje',
  "That appointment couldn't be found. It may have been deleted.":
    'No se encontró esa cita. Es posible que se haya eliminado.',
  'Script copied.': 'Guion copiado.',
  'Copying was blocked. You can read the script from the screen.': 'No se pudo copiar. Puede leer el guion en la pantalla.',
  'Ride marked as booked.': 'Viaje marcado como reservado.',
  'OK. The ride is still not booked, and the reminder stays on Home.':
    'De acuerdo. El viaje sigue sin reservar, y el recordatorio se queda en Inicio.',
  'Choose what happened.': 'Elija lo que pasó.',
  'Saved. This call will show in History and your report.': 'Guardado. Esta llamada aparecerá en el Historial y en su informe.',
  'Earlier call on {date}: {reason}': 'Llamada anterior el {date}: {reason}',
  'What to say': 'Qué decir',
  'Fill in anything in [brackets] when you talk to them.': 'Complete lo que esté entre [corchetes] cuando hable con ellos.',
  'Copy the script': 'Copiar el guion',
  'Change the times or add notes': 'Cambiar las horas o agregar notas',
  'Pickup time to ask for': 'Hora de recogida que va a pedir',
  'The pickup time you saved for this appointment.': 'La hora de recogida que guardó para esta cita.',
  'Suggested: 1 hour before the appointment.': 'Sugerida: 1 hora antes de la cita.',
  'No ride home needed': 'No necesito viaje de regreso',
  'Ride home time (optional)': 'Hora del viaje de regreso (opcional)',
  'When the appointment should be over.': 'Cuando la cita debería terminar.',
  'Anything else to tell them (optional)': 'Algo más que decirles (opcional)',
  'Mobility needs and home address come from {link}.': 'Las necesidades de movilidad y la dirección de su casa vienen de {link}.',
  'your information': 'su información',
  'After the call': 'Después de la llamada',
  'Did you get the ride booked?': '¿Pudo reservar el viaje?',
  'Yes, it’s booked': 'Sí, está reservado',
  'Not yet (I’ll call again)': 'Todavía no (volveré a llamar)',
  'I couldn’t book it': 'No pude reservarlo',
  'Pickup time they gave you (optional)': 'Hora de recogida que le dieron (opcional)',
  'The ride timer uses it on the day.': 'El cronómetro de espera la usa ese día.',
  'Mark the ride as booked': 'Marcar el viaje como reservado',
  'Done for now': 'Listo por ahora',
  'Details (optional)': 'Detalles (opcional)',
  'For example: “On hold 40 minutes, then the call dropped.”':
    'Por ejemplo: “En espera 40 minutos, y luego se cortó la llamada.”',
  'This is saved as evidence. The ride stays “not booked”.': 'Esto se guarda como prueba. El viaje sigue “sin reservar”.',
  'Save what happened': 'Guardar lo que pasó',
};
