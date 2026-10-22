// Spanish text for RideConnect: the "setup" part. See src/lib/i18n.ts and src/i18n/GLOSSARY.md.
// Each line: 'English text (the key)': 'Spanish text'. Keep every {blank} exactly as in English.
export const ES_SETUP: Record<string, string> = {
  // ----- Welcome / Your information (Welcome.tsx) -----
  'Your changes to your information will be lost.': 'Se perderán los cambios en su información.',
  'Your information': 'Su información',
  'Welcome to RideConnect': 'Le damos la bienvenida a RideConnect',
  'Settings': 'Configuración',
  'Keep track of your medical rides, and prove it when rides go wrong.':
    'Lleve el control de sus viajes de transporte médico y demuestre lo que pasó cuando algo sale mal.',
  'Who is using RideConnect?': '¿Quién usa RideConnect?',
  'I am the rider': 'Yo soy quien viaja',
  'I ride to my own appointments.': 'Voy a mis propias citas.',
  'I help a rider': 'Ayudo a alguien que viaja',
  'I am a family member or caregiver.': 'Soy familiar o cuidador(a).',
  "Rider's first name": 'Nombre de la persona que viaja',
  'Your first name': 'Su nombre',
  'Your first name (optional)': 'Su nombre (opcional)',
  'Used to sign letters, like “prepared with help from Maria.”':
    'Se usa para firmar las cartas, por ejemplo: “preparada con la ayuda de Maria”.',
  'State': 'Estado',
  'Choose a state': 'Elija un estado',
  'Booking reminders (optional)': 'Recordatorios para reservar (opcional)',
  'You can skip this and set it later in Settings.': 'Puede saltar este paso y configurarlo más tarde en Configuración.',
  'Ride company name': 'Nombre de la compañía de transporte',
  'The company that schedules your Medicaid rides.': 'La compañía que programa sus viajes de Medicaid.',
  'Ride company phone number': 'Teléfono de la compañía de transporte',
  'Health plan name (optional)': 'Nombre del plan de salud (opcional)',
  'For booking calls (optional)': 'Para las llamadas de reserva (opcional)',
  'RideConnect uses these in the “What to say” script when you call to book. Leave them blank to fill in during the call.':
    'RideConnect usa estos datos en el guion “Qué decir” cuando llama para reservar. Puede dejarlos en blanco y completarlos durante la llamada.',
  "The rider's mobility needs": 'Necesidades de movilidad de la persona que viaja',
  'Your mobility needs': 'Sus necesidades de movilidad',
  'Not sure / skip': 'No sé / saltar',
  'Pickup address (optional)': 'Dirección de recogida (opcional)',
  'Usually home. Saved only on this device.': 'Por lo general, su casa. Solo se guarda en este dispositivo.',
  'Your information stays on this device. RideConnect never sends it anywhere.':
    'Su información se queda en este dispositivo. RideConnect nunca la envía a ninguna parte.',
  'Saving…': 'Guardando…',
  'Save changes': 'Guardar cambios',
  'Save and continue': 'Guardar y continuar',
  'Moving from another phone?': '¿Viene de otro teléfono?',
  'Restore a RideConnect backup': 'Restaurar una copia de seguridad de RideConnect',

  // ----- Settings (Settings.tsx) -----
  'On. Reminders are also sent as notifications when RideConnect is open.':
    'Activadas. Los recordatorios también llegan como notificaciones cuando RideConnect está abierto.',
  'Blocked. To turn them on, allow notifications for RideConnect in your phone or browser settings.':
    'Bloqueadas. Para activarlas, permita las notificaciones de RideConnect en la configuración del teléfono o del navegador.',
  'Off. Reminders still show on the Home screen.': 'Desactivadas. Los recordatorios siguen apareciendo en la pantalla Inicio.',
  'This browser does not support notifications. Reminders still show on the Home screen.':
    'Este navegador no admite notificaciones. Los recordatorios siguen apareciendo en la pantalla Inicio.',
  'Delete all your data?': '¿Eliminar todos sus datos?',
  'This erases your information, appointments, and ride history from this device. It cannot be undone. Save a backup first if you might want it later.':
    'Esto borra su información, sus citas y su historial de viajes de este dispositivo. No se puede deshacer. Si cree que los va a necesitar, guarde antes una copia de seguridad.',
  'Yes, delete everything': 'Sí, eliminar todo',
  'Keep my data': 'Conservar mis datos',
  'Booking reminder setting saved.': 'Se guardó la configuración del recordatorio para reservar.',
  'Help': 'Ayuda',
  'Rider (you help them)': 'Persona que viaja (usted le ayuda)',
  'Rider': 'Persona que viaja',
  'Health plan': 'Plan de salud',
  'Edit your information': 'Editar su información',
  'Booking reminders': 'Recordatorios para reservar',
  'In demo mode this changes the sample data only.': 'En el modo demo, esto solo cambia los datos de ejemplo.',
  'Appearance': 'Apariencia',
  'Light or dark colors': 'Colores claros u oscuros',
  'Match my phone': 'Igual que mi teléfono',
  'Light': 'Claro',
  'Dark': 'Oscuro',
  'Animations': 'Animaciones',
  'On': 'Sí',
  'Off': 'No',
  'Your phone is set to reduce motion, so animations are already off.':
    'Su teléfono está configurado para reducir el movimiento, así que las animaciones ya están desactivadas.',
  'Turn animations off if moving things on screen are distracting or make you feel dizzy.':
    'Desactive las animaciones si el movimiento en la pantalla le distrae o le marea.',
  'Reminder notifications': 'Notificaciones de recordatorios',
  'Turn on notifications': 'Activar notificaciones',
  'On iPhone, notifications only work after you add RideConnect to your Home Screen (see Help).':
    'En iPhone, las notificaciones solo funcionan después de agregar RideConnect a la pantalla de inicio (vea Ayuda).',
  'Back up your records': 'Haga una copia de seguridad de sus registros',
  'Backups are turned off in demo mode. Exit demo mode to back up your own data.':
    'Las copias de seguridad están desactivadas en el modo demo. Salga del modo demo para guardar una copia de sus propios datos.',
  'Your records are saved only on this phone. Save a backup file and keep it somewhere safe (for example, email it to yourself). If you get a new phone, you can restore it there.':
    'Sus registros se guardan solo en este teléfono. Guarde un archivo de copia de seguridad en un lugar seguro (por ejemplo, envíelo a su propio correo). Si cambia de teléfono, puede restaurarlo allí.',
  '✓ This browser has agreed to keep RideConnect’s data until you delete it.':
    '✓ Este navegador aceptó conservar los datos de RideConnect hasta que usted los elimine.',
  'This browser may clear saved data if the phone runs low on space. Add RideConnect to your Home Screen and keep a backup to be safe.':
    'Este navegador podría borrar los datos guardados si el teléfono se queda sin espacio. Por seguridad, agregue RideConnect a la pantalla de inicio y guarde una copia de seguridad.',
  'Delete all my data': 'Eliminar todos mis datos',
  'You are in demo mode, which only uses sample data. Exit demo mode to delete your own data.':
    'Está en el modo demo, que solo usa datos de ejemplo. Salga del modo demo para eliminar sus propios datos.',
  'Exit demo': 'Salir de la demo',
  'Erase everything RideConnect has saved on this device: your information, appointments, and ride history. If you want to keep a copy, download a PDF report first.':
    'Borre todo lo que RideConnect guardó en este dispositivo: su información, sus citas y su historial de viajes. Si quiere conservar una copia, descargue antes un informe en PDF.',
  'Deleting…': 'Eliminando…',
  'About RideConnect': 'Acerca de RideConnect',
  'Version {version}. Made for the Congressional App Challenge.': 'Versión {version}. Hecha para el Congressional App Challenge.',
  'Your privacy:': 'Su privacidad:',
  "RideConnect has no accounts and no server. Everything you enter stays on this device and is never sent anywhere. Clearing your browser's data for this site will also erase it.":
    'RideConnect no tiene cuentas ni servidor. Todo lo que escribe se queda en este dispositivo y nunca se envía a ninguna parte. Si borra los datos del navegador para este sitio, también se borrará.',
  'About your records:': 'Sobre sus registros:',
  'Ride details are entered by you. They are your own record, not independent proof, but a dated record made at the time is strong evidence when you file a complaint.':
    'Usted escribe los detalles de cada viaje. Son su propio registro, no una prueba independiente, pero un registro con fecha hecho en el momento es una prueba sólida cuando presenta una queja.',

  // ----- Help (Help.tsx) -----
  'In a medical emergency, call 911.': 'En una emergencia médica, llame al 911.',
  "If your ride doesn't come": 'Si su transporte no llega',
  'Call the ride company right away.': 'Llame de inmediato a la compañía de transporte.',
  'Ask where the driver is and when they will arrive. Write down the name of the person you talk to and any reference number.':
    'Pregunte dónde está el vehículo y cuándo va a llegar. Anote el nombre de la persona con quien habla y cualquier número de referencia.',
  'Call your clinic.': 'Llame a su clínica.',
  'Tell them you will be late. Some clinics can hold your time.':
    'Avise que va a llegar tarde. Algunas clínicas pueden guardarle la cita.',
  "{start} with \"Check in on today's ride\", even if the ride shows up late. Each record helps prove a pattern.":
    '{start} con “Registrar el viaje de hoy”, aunque el transporte llegue tarde. Cada registro ayuda a demostrar un patrón.',
  'Log it in RideConnect': 'Anótelo en RideConnect',
  '{start} open the Report screen and create a complaint letter.': '{start} abra la pantalla Informe y prepare una carta de queja.',
  'If it keeps happening,': 'Si sigue pasando,',
  "If your ride home doesn't come": 'Si su viaje de regreso no llega',
  'Call the ride company and ask when the driver will come.':
    'Llame a la compañía de transporte y pregunte cuándo va a llegar el vehículo.',
  "Ask the clinic staff for help. Don't wait outside alone if it isn't safe.":
    'Pida ayuda al personal de la clínica. No espere afuera a solas si no es seguro.',
  'Log it in RideConnect, and write how long you waited in the notes.':
    'Anótelo en RideConnect y escriba en las notas cuánto tiempo esperó.',
  '{state} rules': 'Reglas de {state}',
  'These rules are placeholders. Check your state Medicaid website for the real rules.':
    'Estas reglas son provisionales. Consulte las reglas reales en el sitio web de Medicaid de su estado.',
  "{label} Book rides at least {days} before the appointment. Weekends and federal holidays don't count. RideConnect reminds you on the Home screen.":
    '{label} Reserve los viajes con al menos {days} de anticipación. Los fines de semana y los días feriados federales no cuentan. RideConnect se lo recuerda en la pantalla Inicio.',
  'Booking:': 'Reservas:',
  'You told RideConnect your ride company needs {days}, so reminders use your number instead. You can change it in {settings}.':
    'Usted indicó que su compañía de transporte pide {days}, así que los recordatorios usan ese número. Puede cambiarlo en {settings}.',
  'Where to complain:': 'Dónde presentar una queja:',
  "RideConnect doesn't have {state}'s rules yet. Check your state Medicaid website or ask your ride company how far ahead rides must be booked.":
    'RideConnect todavía no tiene las reglas de {state}. Consulte el sitio web de Medicaid de su estado o pregunte a su compañía de transporte con cuánta anticipación hay que reservar.',
  'You told RideConnect your ride company needs {days}, so booking reminders are on. You can change it in {settings}.':
    'Usted indicó que su compañía de transporte pide {days}, así que los recordatorios para reservar están activados. Puede cambiarlo en {settings}.',
  "{label} in {settings}, enter how many business days ahead your ride company requires you to book (for example, 2 business days). Weekends and federal holidays won't be counted.":
    '{label} en {settings}, escriba con cuántos días hábiles de anticipación pide reservar su compañía de transporte (por ejemplo, 2 días hábiles). No se contarán los fines de semana ni los días feriados federales.',
  'You can still get booking reminders:': 'Aun así puede recibir recordatorios para reservar:',
  'Tips': 'Consejos',
  "For regular appointments like dialysis, ask the ride company for a {term}, so you don't have to book every ride.":
    'Para citas frecuentes, como la diálisis, pida a la compañía de transporte una {term}, así no tiene que reservar cada viaje.',
  'standing order': 'reserva permanente',
  'Save the confirmation number every time you book. Add it to the appointment in RideConnect.':
    'Guarde el número de confirmación cada vez que reserve. Agréguelo a la cita en RideConnect.',
  'Check in after every ride, including the good ones. A full record is more convincing.':
    'Registre cada viaje, también los que salen bien. Un registro completo convence más.',
  'Put RideConnect on your home screen': 'Ponga RideConnect en la pantalla de inicio',
  'In Safari, tap the Share button, then "Add to Home Screen".':
    'En Safari, toque el botón Compartir y luego “Agregar a inicio” (en inglés: “Add to Home Screen”).',
  'In Chrome, tap the ⋮ menu, then "Add to Home screen" or "Install app".':
    'En Chrome, toque el menú ⋮ y luego “Agregar a la pantalla principal” o “Instalar aplicación”.',
  'After that, RideConnect opens like a regular app and works without internet.':
    'Después, RideConnect se abre como cualquier aplicación y funciona sin internet.',
  'Settings and delete data': 'Configuración y eliminar datos',

  // ----- Landing and sign-in pages (PublicPages.tsx) -----
  'Sign in': 'Entrar',
  'Keep a record. Have a voice.': 'Lleve un registro. Haga oír su voz.',
  'For people who count on medical rides': 'Para quienes dependen del transporte médico',
  'Your care matters.{br}So does the ride{br}{end}': 'Su salud importa.{br}Y también el viaje{br}{end}',
  'that gets you there.': 'que le lleva a su cita.',
  'A late pickup. A missed appointment. Another call to explain what happened. Keep the details together, so you don’t have to start from scratch.':
    'Una recogida tarde. Una cita perdida. Otra llamada para explicar lo que pasó. Guarde todos los detalles juntos para no tener que empezar de cero.',
  'Start your ride record': 'Empezar mi registro de viajes',
  'Try RideConnect': 'Pruebe RideConnect',
  'Watch the auto-demo': 'Ver la demo automática',
  'Take a guided tour': 'Hacer un recorrido guiado',
  'About two minutes. Sample rides only, no setup needed. Watch it run or go at your own pace.':
    'Unos dos minutos. Solo viajes de ejemplo, sin configurar nada. Mire cómo avanza solo o vaya a su propio ritmo.',
  'Example ride record': 'Ejemplo de registro de viaje',
  'YOUR RIDE RECORD': 'SU REGISTRO DE VIAJE',
  'EXAMPLE': 'EJEMPLO',
  'One trip.{br}The whole story.': 'Un viaje.{br}Toda la historia.',
  'Dialysis appointment': 'Cita de diálisis',
  'Pickup scheduled': 'Recogida programada',
  'Confirmation {number}': 'Confirmación {number}',
  'Still waiting': 'Todavía esperando',
  'Called the ride company': 'Llamó a la compañía de transporte',
  'Driver arrived': 'Llegó el vehículo',
  '{n} minutes after pickup time': '{n} minutos después de la hora de recogida',
  'RIDER’S NOTE': 'NOTA DE LA PERSONA QUE VIAJA',
  '“I called the clinic to let them know I’d be late.”': '“Llamé a la clínica para avisar que llegaría tarde.”',
  'Details remembered. Ready to share.': 'Los detalles, guardados. Listos para compartir.',
  'An illustrative record. Your reports use the details you enter.':
    'Un registro de ejemplo. Sus informes usan los detalles que usted escribe.',
  'Before, during, and after the ride': 'Antes, durante y después del viaje',
  'A little less to keep in your head.': 'Un poco menos que recordar.',
  'BEFORE YOU GO': 'ANTES DE SALIR',
  'Keep the plan handy.': 'Tenga el plan a mano.',
  'Save appointments, booking details, and your ride company’s number. See what’s coming up in one place.':
    'Guarde sus citas, los datos de cada reserva y el número de su compañía de transporte. Vea lo que viene en un solo lugar.',
  'WHEN IT HAPPENS': 'CUANDO PASA',
  'Write it down once.': 'Anótelo una sola vez.',
  'Record a late pickup, a no-show, or a trip home that never came. Add the details while they’re fresh.':
    'Registre una recogida tarde, un transporte que nunca llegó o un viaje de regreso que no apareció. Agregue los detalles mientras los recuerda bien.',
  'WHEN YOU NEED HELP': 'CUANDO NECESITA AYUDA',
  'Bring the full picture.': 'Muestre todo lo que pasó.',
  'Turn your history into a report and an editable complaint letter to share with the right person.':
    'Convierta su historial en un informe y en una carta de queja que puede editar y compartir con la persona indicada.',
  'For you. Or someone you care for.': 'Para usted. O para alguien a quien cuida.',
  'You can be the rider.{br}You can be their backup.': 'Puede ser quien viaja.{br}O quien le da apoyo.',
  'Helping a parent keep track of dialysis rides? Managing your own appointments? RideConnect gives you one place for the schedule, the calls, and what actually happened.':
    '¿Ayuda a su mamá o a su papá con los viajes a diálisis? ¿Organiza sus propias citas? RideConnect le da un solo lugar para la agenda, las llamadas y lo que de verdad pasó.',
  'Set up your ride record': 'Crear su registro de viajes',
  'A few things to know.': 'Algunas cosas que debe saber.',
  'Does RideConnect book or send a ride?': '¿RideConnect reserva o envía el transporte?',
  'No. You still book through your transportation provider. RideConnect helps you organize the booking details and record the outcome.':
    'No. Usted sigue reservando con su compañía de transporte. RideConnect le ayuda a organizar los datos de la reserva y a registrar lo que pasó.',
  'Where does my information go?': '¿Adónde va mi información?',
  'This version saves your records in this browser on this device. There is no online account or automatic syncing. Use the backup tools in Settings to save a copy.':
    'Esta versión guarda sus registros en este navegador, en este dispositivo. No hay cuenta en línea ni sincronización automática. Use las herramientas de copia de seguridad en Configuración para guardar una copia.',
  'Can I try it before setting anything up?': '¿Puedo probarlo antes de configurar algo?',
  'Yes. The sample dashboard has fictional rides you can explore. Sample records stay separate from your own records.':
    'Sí. El panel de ejemplo tiene viajes ficticios que puede explorar. Los registros de ejemplo se guardan aparte de los suyos.',
  'Open the guided tour →': 'Abrir el recorrido guiado →',
  'A record of your rides. A clearer way to speak up.': 'Un registro de sus viajes. Una forma más clara de hacerse oír.',
  'Independent of Medicaid and transportation providers.': 'Independiente de Medicaid y de las compañías de transporte.',
  'Your next ride starts here': 'Su próximo viaje empieza aquí',
  'Less remembering.{br}More getting{br}{end}': 'Menos que recordar.{br}Más facilidad para llegar{br}{end}',
  'where you need to go.': 'adonde necesita ir.',
  'Appointments, ride details, and your history. Together in one place.':
    'Citas, datos de los viajes y su historial. Todo junto en un solo lugar.',
  'From the first booking to the ride home.': 'Desde la primera reserva hasta el viaje de regreso.',
  'Back to {label}': 'Volver a {label}',
  'Device access': 'Acceso',
  'Welcome back.': 'Qué bueno verle de nuevo.',
  'Open your ride record on this device.': 'Abra su registro de viajes en este dispositivo.',
  'No password needed for this version.': 'Esta versión no necesita contraseña.',
  'Your records live in this browser. This opens your local profile; it does not sign you into an online account or lock your records.':
    'Sus registros están en este navegador. Esto abre su perfil guardado aquí; no entra a una cuenta en línea ni protege sus registros con clave.',
  'Try again': 'Intentar de nuevo',
  'Looking for your saved profile…': 'Buscando su perfil guardado…',
  '{name}’s ride record': 'Registro de viajes de {name}',
  'Saved on this device': 'Guardado en este dispositivo',
  'Continue to my dashboard →': 'Continuar a mi panel →',
  'There isn’t a saved profile in this browser yet. Set one up to start keeping your ride record.':
    'Todavía no hay un perfil guardado en este navegador. Cree uno para empezar su registro de viajes.',
  'Set up my ride record →': 'Crear mi registro de viajes →',
  'Just taking a look?': '¿Solo quiere echar un vistazo?',
  'Try the sample dashboard ↗': 'Probar el panel de ejemplo ↗',
  'Using a different device? You can restore an exported backup during setup.':
    '¿Usa otro dispositivo? Puede restaurar una copia de seguridad durante la configuración.',
  'Your records stay here until you choose to export them.': 'Sus registros se quedan aquí hasta que usted decida exportarlos.',

  // ----- App shell (App.tsx, Header, BottomNav, Screen, FormFields, Brand, Disclaimer) -----
  'We couldn’t open your records on this device. Check that browser storage is allowed, then try again.':
    'No pudimos abrir sus registros en este dispositivo. Revise que el navegador permita guardar datos y vuelva a intentarlo.',
  'Your records couldn’t be opened': 'No se pudieron abrir sus registros',
  'Skip to main content': 'Ir al contenido principal',
  'Restart tour': 'Repetir el recorrido',
  'Demo': 'Demo',
  'Demo mode — sample data.': 'Modo demo: datos de ejemplo.',
  'Controls ▾': 'Controles ▾',
  'History': 'Historial',
  'Main menu': 'Menú principal',
  'Please fix these:': 'Corrija lo siguiente:',
  'RideConnect is not affiliated with any state, health plan, or ride company. Confirm rules with your state Medicaid office.':
    'RideConnect no está afiliado a ningún estado, plan de salud ni compañía de transporte. Confirme las reglas con la oficina estatal de Medicaid.',
  'RideConnect home': 'Inicio de RideConnect',

  // ----- Install and update (PwaPrompts.tsx) -----
  'A new version of RideConnect is ready.': 'Hay una nueva versión de RideConnect lista.',
  'Update now': 'Actualizar ahora',
  'It opens like a regular app and works without internet.': 'Se abre como cualquier aplicación y funciona sin internet.',
  'Install RideConnect': 'Instalar RideConnect',
  'Not now': 'Ahora no',
  'Install RideConnect now': 'Instalar RideConnect ahora',

  // ----- Backups (BackupControls.tsx) -----
  'Backup file saved. Keep it somewhere safe, like your email or cloud storage.':
    'Se guardó la copia de seguridad. Guárdela en un lugar seguro, como su correo o su almacenamiento en la nube.',
  'Sorry, the backup could not be made.': 'Lo sentimos, no se pudo hacer la copia de seguridad.',
  'Last backup: {date}.': 'Última copia de seguridad: {date}.',
  'You have not made a backup yet.': 'Todavía no ha hecho una copia de seguridad.',
  'Save a backup file': 'Guardar una copia de seguridad',
  'Restore this backup?': '¿Restaurar esta copia de seguridad?',
  'It has {appointments} and {records}, saved on {date}. It will REPLACE the RideConnect data on this device.':
    'Tiene {appointments} y {records}, guardados el {date}. REEMPLAZARÁ los datos de RideConnect en este dispositivo.',
  'It has {appointments} and {records}. It will REPLACE the RideConnect data on this device.':
    'Tiene {appointments} y {records}. REEMPLAZARÁ los datos de RideConnect en este dispositivo.',
  'Restore backup': 'Restaurar la copia',
  'Backup restored.': 'Se restauró la copia de seguridad.',
  'Sorry, that file could not be read.': 'Lo sentimos, no se pudo leer ese archivo.',
  'Restore from a backup file': 'Restaurar desde una copia de seguridad',
  '{n} appointment': '{n} cita',
  '{n} appointments': '{n} citas',
  '{n} ride record': '{n} registro de viaje',
  '{n} ride records': '{n} registros de viajes',

  // ----- Booking window (BookingWindowPicker.tsx) -----
  "{state}'s rule (a placeholder — check your state Medicaid website): book at least {days} ahead.":
    'Regla de {state} (provisional; consulte el sitio web de Medicaid de su estado): reserve con al menos {days} de anticipación.',
  "{state}'s rule: book at least {days} ahead.": 'Regla de {state}: reserve con al menos {days} de anticipación.',
  'Use my own number instead (optional)': 'Usar mi propio número (opcional)',
  'How many business days ahead does your ride company require you to book?':
    '¿Con cuántos días hábiles de anticipación pide reservar su compañía de transporte?',
  "Use {state}'s rule ({days})": 'Usar la regla de {state} ({days})',
  'Not sure': 'No sé',
  "RideConnect will use your number ({days}) instead of {state}'s rule.":
    'RideConnect usará su número ({days}) en lugar de la regla de {state}.',
  'RideConnect will remind you to book {days} before each appointment.':
    'RideConnect le recordará reservar {days} antes de cada cita.',
  "Booking reminders use {state}'s rule.": 'Los recordatorios para reservar usan la regla de {state}.',
  "RideConnect doesn't have {state}'s rules yet, so booking reminders are off until you choose a number. Your ride company or member handbook can tell you.":
    'RideConnect todavía no tiene las reglas de {state}, así que los recordatorios para reservar están desactivados hasta que elija un número. Su compañía de transporte o el manual para miembros se lo pueden decir.',
  "RideConnect doesn't have your state's rules yet, so booking reminders are off until you choose a number. Your ride company or member handbook can tell you.":
    'RideConnect todavía no tiene las reglas de su estado, así que los recordatorios para reservar están desactivados hasta que elija un número. Su compañía de transporte o el manual para miembros se lo pueden decir.',

  // ----- Demo controls (DemoControls.tsx) -----
  'Ride timer': 'Cronómetro de espera',
  'Booking call script': 'Guion para reservar',
  'Care team summary': 'Resumen para el equipo de atención médica',
  'Complaint preview': 'Vista previa de la queja',
  'Complaints sent': 'Quejas enviadas',
  'No booking reminders right now': 'No hay recordatorios para reservar en este momento',
  'Tap "Reset demo" to bring the sample reminder back.': 'Toque “Reiniciar la demo” para que vuelva el recordatorio de ejemplo.',
  'Demo clock moved ahead 15 minutes.': 'El reloj de la demo se adelantó 15 minutos.',
  'Demo controls': 'Controles de la demo',
  'Changes here only affect the sample data, never your own.':
    'Estos cambios solo afectan los datos de ejemplo, nunca los suyos.',
  'Go to': 'Ir a',
  'Actions': 'Acciones',
  'Simulate reminder': 'Simular un recordatorio',
  'Ride timer: jump ahead 15 minutes': 'Cronómetro: adelantar 15 minutos',
  'Reset demo': 'Reiniciar la demo',

  // ----- Guided demo tour (DemoTour.tsx) -----
  'Start with the ride that matters now': 'Empiece por el viaje que importa ahora',
  'Rosa’s sample dashboard puts the next clinic visit, its ride status, and the most useful next action in one calm view. Tuesday’s cardiology ride still isn’t booked: Maria’s call on Thursday didn’t get through.':
    'El panel de ejemplo de Rosa muestra la próxima visita a la clínica, el estado de su transporte y el siguiente paso más útil, todo en una vista tranquila. El viaje del martes a cardiología todavía no está reservado: la llamada de Maria del jueves no se pudo completar.',
  '“Call Sample Ride Co. to book” opens a “What to say” script built from the appointment, then asks whether the ride got booked.':
    '“Llamar a Sample Ride Co. para reservar” abre un guion “Qué decir” hecho a partir de la cita y luego pregunta si se reservó el viaje.',
  'Keep appointments and rides together': 'Citas y viajes, siempre juntos',
  'Upcoming and repeat visits stay beside their transportation details, so a ride is less likely to become a last-minute problem.':
    'Las próximas visitas y las que se repiten están junto a los datos de su transporte, así es menos probable que un viaje se vuelva un problema de último momento.',
  'Open an appointment if you want to inspect it. The tour pauses before it can move you away.':
    'Abra una cita si quiere revisarla. El recorrido se detiene antes de llevarle a otra pantalla.',
  'Measure the wait while it happens': 'Mida la espera mientras sucede',
  'Rosa is done with dialysis and waiting for her ride home. The timer keeps counting even if the phone locks, and suggests calling the ride company at 15 and 30 minutes.':
    'Rosa terminó su diálisis y espera su viaje de regreso. El cronómetro sigue contando aunque el teléfono se bloquee, y sugiere llamar a la compañía de transporte a los 15 y a los 30 minutos.',
  'This sample timer runs on a simulated clock. Demo controls can jump it ahead 15 minutes.':
    'Este cronómetro de ejemplo usa un reloj simulado. Con los controles de la demo puede adelantarlo 15 minutos.',
  'Check-in': 'Registro',
  'Turn a difficult ride into a clear record': 'Convierta un viaje difícil en un registro claro',
  'A few short questions capture pickup, appointment arrival, and the return trip. Late and missing rides become dated evidence.':
    'Unas pocas preguntas cortas registran la recogida, la llegada a la cita y el viaje de regreso. Los transportes que llegan tarde o no llegan quedan como pruebas con fecha.',
  'This walkthrough never answers or saves the check-in for you. You remain in control of the sample form.':
    'Este recorrido nunca responde ni guarda el registro por usted. Usted tiene el control del formulario de ejemplo.',
  'Find the ride instead of reconstructing it': 'Encuentre el viaje en lugar de reconstruirlo',
  'Searchable ride history keeps each trip’s outcome and timing in one place, including missed pickups, delayed returns, and booking calls that didn’t work.':
    'El historial de viajes, con búsqueda, guarda el resultado y los horarios de cada viaje en un solo lugar, incluso las recogidas que no ocurrieron, los regresos con retraso y las llamadas de reserva que no funcionaron.',
  'Try the filters or open a record. Any interaction with the page pauses autoplay.':
    'Pruebe los filtros o abra un registro. Cualquier acción en la página detiene el avance automático.',
  'See whether one bad ride is becoming a pattern': 'Vea si un mal viaje se está volviendo un patrón',
  'Counts, the total time spent waiting, failed booking calls, a weekly chart, and an accessible data table summarize what the saved sample rides show over time. “Share with my care team” turns it into a friendly one-page summary for Rosa’s doctors.':
    'Los totales, el tiempo de espera total, las llamadas de reserva que fallaron, una gráfica semanal y una tabla de datos accesible resumen lo que muestran con el tiempo los viajes de ejemplo guardados. “Compartir con mi equipo de atención médica” lo convierte en un resumen sencillo de una página para los médicos de Rosa.',
  'Exports only happen when you choose them. The automatic tour does not download anything.':
    'Solo se exporta algo cuando usted lo elige. El recorrido automático no descarga nada.',
  'Complaint': 'Queja',
  'Prepare the facts before asking for help': 'Prepare los hechos antes de pedir ayuda',
  'RideConnect organizes the sample ride records into a draft letter that can be reviewed, corrected, and completed before sharing.':
    'RideConnect organiza los registros de viajes de ejemplo en un borrador de carta que se puede revisar, corregir y completar antes de compartirlo.',
  'Nothing is sent automatically. A draft remains a draft until the person using RideConnect decides otherwise.':
    'No se envía nada automáticamente. Un borrador sigue siendo un borrador hasta que la persona que usa RideConnect decida otra cosa.',
  'Follow-up': 'Seguimiento',
  'Keep track after the complaint is sent': 'Dé seguimiento después de enviar la queja',
  'Maria emailed a complaint to Rosa’s health plan on October 16. Two weeks later there is still no answer, so RideConnect asks “Did you hear back?” and offers a follow-up letter that mentions the reference number and every problem since.':
    'Maria envió por correo una queja al plan de salud de Rosa el 16 de octubre. Dos semanas después todavía no hay respuesta, así que RideConnect pregunta “¿Recibió respuesta?” y ofrece una carta de seguimiento que menciona el número de referencia y todos los problemas desde entonces.',
  'Try “Update status or notes” and choose Not fixed to see the next steps. Reset demo puts the complaint back.':
    'Pruebe “Actualizar el estado o las notas” y elija “No se resolvió” para ver los siguientes pasos. “Reiniciar la demo” deja la queja como estaba.',
  'Know what to do when a ride does not arrive': 'Sepa qué hacer cuando el transporte no llega',
  'Plain-language steps, service information, and install guidance keep the next move close at hand during a stressful moment.':
    'Pasos en palabras sencillas, información del servicio e instrucciones para instalar la aplicación le ayudan a saber qué hacer en un momento de estrés.',
  'The walkthrough never opens a phone link or places a call.': 'El recorrido nunca abre un enlace de teléfono ni hace una llamada.',
  'Keep control of the record': 'Mantenga el control de su registro',
  'Profile, booking reminder, display, and backup tools keep the record working for each rider. If a state’s booking rule isn’t built in yet, the rider can enter their ride company’s own rule here.':
    'Las herramientas de perfil, recordatorio para reservar, apariencia y copia de seguridad hacen que el registro funcione para cada persona que viaja. Si la regla de reserva de un estado todavía no está incluida, aquí se puede escribir la regla de la compañía de transporte.',
  'Nothing has been sent or changed. Finish the tour to keep exploring Rosa’s sample data.':
    'No se ha enviado ni cambiado nada. Termine el recorrido para seguir explorando los datos de ejemplo de Rosa.',
  'Automatic demo': 'Demo automática',
  'Manual tour': 'Recorrido manual',
  'Final stop': 'Última parada',
  'Guided demo': 'Demo guiada',
  'Stop {n} of {total}': 'Parada {n} de {total}',
  'Tour paused': 'Recorrido en pausa',
  'Sample data only': 'Solo datos de ejemplo',
  'Tour progress: stop {n} of {total}': 'Avance del recorrido: parada {n} de {total}',
  'Demo chapters': 'Partes de la demo',
  'You stepped off the tour path': 'Salió de la ruta del recorrido',
  'Take your time on this screen': 'Tómese su tiempo en esta pantalla',
  'The guide is holding your place at {chapter}. Explore here, then return when you are ready.':
    'La guía le guarda el lugar en {chapter}. Explore aquí y vuelva cuando quiera.',
  'Autoplay is paused, so this screen will not change underneath you.':
    'El avance automático está en pausa, así que esta pantalla no va a cambiar mientras la usa.',
  'Back': 'Volver',
  'Finish tour': 'Terminar el recorrido',
  'Next': 'Siguiente',
  'Return to {chapter}': 'Volver a {chapter}',
  'Pause': 'Pausa',
  'Resume': 'Continuar',
  'Explore sample on my own': 'Explorar el ejemplo por mi cuenta',
  '{n} seconds remaining': 'Segundos restantes: {n}',
  'Motion preference respected. Start the automatic tour when you are ready.':
    'Se respetó su preferencia de movimiento. Inicie el recorrido automático cuando quiera.',
  'Next stop in {n} second': 'Siguiente parada en {n} segundo',
  'Next stop in {n} seconds': 'Siguiente parada en {n} segundos',
  'Paused with {n} second left': 'En pausa; queda {n} segundo',
  'Paused with {n} seconds left': 'En pausa; quedan {n} segundos',

  // ----- Confirm dialog and messages (FeedbackHost.tsx) -----
  'Dismiss message': 'Cerrar el mensaje',
};
