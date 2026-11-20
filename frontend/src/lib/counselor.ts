/*
 * Mensajes del consejero (mascota) para la pantalla de inicio de estudiantes y docentes.
 * Cada mes tiene un tema (inspirado en sus fechas conmemorativas) y el mensaje se elige al azar
 * dentro del mes, evitando repetir el último que se mostró: así cambia cada vez que se entra.
 * Tono: al estudiante se le habla con cercanía ("si tú sufres", "si eres víctima"); al docente,
 * desde su responsabilidad ("como docente, tu labor es…").
 * Los mensajes sobre salud mental siguen las pautas de comunicación responsable: sin detalles de
 * métodos, con mensajes de esperanza y siempre con una vía de ayuda.
 */

export type CounselorAudience = 'Estudiante' | 'Docente'
export type CounselorHelp = 'salud-mental' | 'violencia'

export interface CounselorMessage {
  text: string
  help?: CounselorHelp
}

interface MonthTheme {
  /** Tema del mes, visible sobre el mensaje. */
  tag: string
  Estudiante: CounselorMessage[]
  Docente: CounselorMessage[]
}

/*
 * Líneas de ayuda verificadas en notas oficiales (gob.pe, nov. 2026):
 * - Línea 113, opción 5 (Minsa): orientación y apoyo psicológico gratuito, las 24 horas.
 * - Línea 100 (MIMP, Programa Warmi Ñan): gratuita, 24 horas, orientación legal y psicológica;
 *   también atiende a niñas, niños y adolescentes.
 * Se muestran como: {lead} **{line}**. {detail}
 */
export const HELP_LINES: Record<CounselorHelp, Record<CounselorAudience, { lead: string; line: string; detail: string }>> = {
  'salud-mental': {
    Estudiante: {
      lead: 'Hablar con alguien puede aliviar mucho:',
      line: 'llama al 113 y marca la opción 5',
      detail:
        'Un psicólogo del Minsa te escuchará con respeto y te ayudará a dar el siguiente paso. Está ahí para ti a cualquier hora, y la llamada es gratuita.',
    },
    Docente: {
      lead: 'No tienes que manejarlo solo: orienta al estudiante y a su familia hacia la',
      line: 'Línea 113, opción 5 (Minsa)',
      detail:
        'Sus psicólogos acompañan a quien lo necesita en cualquier momento y sin costo. Recomendarla a tiempo puede ser el primer paso de su recuperación.',
    },
  },
  violencia: {
    Estudiante: {
      lead: 'Si tú o alguien que conoces está en peligro, no estás solo:',
      line: 'llama a la Línea 100',
      detail:
        'Hay personas preparadas para escucharte, protegerte y ayudarte a encontrar una salida, a cualquier hora y de forma gratuita.',
    },
    Docente: {
      lead: 'Tu llamada puede activar la protección que el estudiante necesita:',
      line: 'Línea 100 (MIMP)',
      detail:
        'Brinda orientación legal y psicológica especializada, también en casos de niñas, niños y adolescentes, en cualquier momento del día.',
    },
  },
}

/*
 * Mensajes que entran en el sorteo de todos los meses. El del estudiante recuerda que puede reportar
 * sin usar el celular en clase (Ley 32385 y D.S. 018-2026-MINEDU restringen su uso en actividades educativas).
 */
export const GENERAL_MESSAGES: Record<CounselorAudience, CounselorMessage> = {
  Estudiante: {
    text: '¿Sabías que no necesitas tu celular para reportar? Puedes hacerlo desde la sala de cómputo, desde tu casa o contándoselo a tu tutor o a un docente, que lo registrará por ti. Lo importante es que no te quedes callado.',
  },
  Docente: {
    text: 'Como docente, muchas veces serás la primera persona a la que un estudiante le cuente lo que le pasa, sobre todo ahora que el celular se restringe en clase. Registra tú el caso respetando sus palabras: así su relato queda en el expediente y el protocolo se activa a tiempo.',
  },
}

export const MONTH_THEMES: MonthTheme[] = [
  {
    tag: 'Vacaciones seguras',
    Estudiante: [
      { text: '¡Hola! En vacaciones pasamos más tiempo en redes. Si alguien te insulta, te amenaza o comparte fotos tuyas sin permiso, no le respondas: guarda una captura y cuéntaselo a un adulto de confianza. Pedir ayuda no te mete en problemas.', help: 'violencia' },
      { text: 'Oye, si una persona te pide guardar un secreto que te incomoda o te da miedo, eso no está bien. Tú no tienes la culpa. Cuéntaselo a alguien de tu familia o a tu tutor: ellos pueden protegerte.', help: 'violencia' },
      { text: 'Si eres víctima de algo que te hace daño durante las vacaciones, no esperes a que vuelvan las clases para contarlo. Tu familia puede ayudarte desde hoy, y no tienes que enfrentarlo solo.', help: 'violencia' },
    ],
    Docente: [
      { text: 'Como docente, tu labor no termina con el año escolar. Al volver, pregunta a tus estudiantes cómo pasaron las vacaciones: muchas situaciones de ciberacoso empiezan fuera del aula y llegan contigo el primer día de clases.' },
      { text: 'Antes del nuevo año escolar, revisa los casos que quedaron abiertos. Un seguimiento a tiempo evita que un problema de diciembre se repita en marzo; tu constancia es lo que da continuidad a la protección.' },
      { text: 'Planifica desde ya cómo presentarás las normas de convivencia a tu nueva sección. Lo que hagas en la primera semana marcará el clima de tu aula durante todo el año.' },
    ],
  },
  {
    tag: 'Internet segura',
    Estudiante: [
      { text: '¿Sabías que burlarse de alguien en un grupo de chat también es acoso? Antes de compartir una foto o un meme de otra persona, pregúntate si te gustaría que lo hicieran contigo. En internet también se respeta.' },
      { text: 'Si te molestan por internet, recuerda tres pasos: bloquea, guarda la evidencia y cuéntalo. Tu tutor o tu familia pueden ayudarte, y también puedes reportarlo aquí mismo.', help: 'violencia' },
      { text: 'Si alguien te pide fotos íntimas o te presiona por internet, no es tu culpa y no tienes que hacerlo. Corta la conversación, guarda las pruebas y cuéntaselo a un adulto de confianza.', help: 'violencia' },
    ],
    Docente: [
      { text: 'Aunque el ciberacoso ocurra fuera del horario escolar, si afecta la convivencia es tu responsabilidad atenderlo. Regístralo con las capturas como evidencia: así el caso no depende de la memoria de nadie.' },
      { text: 'Tus estudiantes aprenden a convivir en internet observando a los adultos. Hablar en clase sobre privacidad, respeto y consentimiento digital es parte de tu labor formativa, no un tema aparte.' },
      { text: 'Recuerda que no puedes revisar el contenido del celular de un estudiante. Si te muestra mensajes de acoso, pídele que te los entregue voluntariamente en capturas y regístralas como evidencia.' },
    ],
  },
  {
    tag: 'Un buen inicio de clases',
    Estudiante: [
      { text: '¡Empezamos un nuevo año! Si ves a un compañero nuevo solo en el recreo, invítalo a tu grupo. Un pequeño gesto puede cambiarle el día a alguien.' },
      { text: 'Si ves que molestan a alguien una y otra vez, no te quedes callado. Contárselo a un profesor no es "acusar": es ayudar. También puedes reportarlo en EduResuelve.' },
      { text: 'Este año tienes derecho a aprender en un ambiente seguro. Si algo te incomoda desde el primer día, no esperes a que empeore: cuéntaselo a tu tutor, que está para acompañarte.' },
    ],
    Docente: [
      { text: 'Como tutor o docente, tu labor en estas primeras semanas es construir con tu sección los acuerdos de convivencia. Cuando los estudiantes participan en crearlos, los respetan mucho más.' },
      { text: 'Un hecho aislado hoy puede ser un patrón mañana. Registrar desde el primer caso te permite ver a tiempo cuándo algo se repite y actuar antes de que crezca.' },
      { text: 'Lo que hagas en tu aula decide si un estudiante puede estar tranquilo en ella. Aprender sus nombres, observar cómo se relacionan y mostrarte disponible desde el primer día marca la diferencia.' },
    ],
  },
  {
    tag: 'Tus derechos importan',
    Estudiante: [
      { text: 'Tienes derecho a sentirte seguro. Nadie puede golpearte, humillarte ni tocarte sin tu permiso, ni en el colegio ni fuera de él. Si te pasa algo así, cuéntalo: hay adultos que deben protegerte.', help: 'violencia' },
      { text: 'Tu opinión cuenta. Tienes derecho a expresarte, a que te traten con respeto y a que los adultos te escuchen cuando algo no está bien. Si alguien no te escucha, busca a otro adulto de confianza.' },
      { text: 'Si en casa o en el colegio alguien te grita, te golpea o te humilla de forma constante, eso no es normal ni es tu culpa. Mereces estar a salvo, y pedir ayuda es tu derecho.', help: 'violencia' },
    ],
    Docente: [
      { text: 'El buen trato también se enseña con el ejemplo. Corregir sin gritos ni humillaciones es parte de tu labor como garante de los derechos de tus estudiantes, y les muestra cómo resolver conflictos.' },
      { text: 'Si sospechas que un estudiante sufre violencia en casa, tu deber es registrarlo y comunicarlo a Dirección. No investigues por tu cuenta ni lo confrontes con su familia: protegerlo empieza por seguir el protocolo.', help: 'violencia' },
      { text: 'Escuchar a un estudiante sin interrumpirlo, sin juzgarlo y creyéndole es una de las formas más poderosas de proteger sus derechos. Tu actitud puede hacer que vuelva a confiar en los adultos.' },
    ],
  },
  {
    tag: 'No al acoso escolar',
    Estudiante: [
      { text: 'El bullying no es un juego. Si tú sufres burlas, golpes o exclusión que se repiten y no puedes defenderte, es acoso. Contarlo no es ser "soplón": es pedir ayuda para ti o para un compañero.', help: 'violencia' },
      { text: '¿Sabías que quien mira y se ríe también hace daño? Puedes ser la diferencia: acompaña a quien lo está pasando mal y avisa a un profesor o reporta lo que viste.' },
      { text: 'Si eres víctima de acoso, recuerda: no hiciste nada para merecerlo. Contarlo es el primer paso para que se detenga, y en tu colegio hay personas encargadas de protegerte.', help: 'violencia' },
    ],
    Docente: [
      { text: 'Aislamiento, faltas frecuentes, útiles dañados o miedo a venir al colegio pueden ser señales de acoso. Como docente, tu labor es notarlo, conversar con el estudiante y registrar lo que observes.' },
      { text: 'Ante un hecho de violencia escolar, regístralo y comunícalo a Dirección sin demora. El sistema te guía en cada paso del protocolo, pero la decisión de actuar a tiempo es tuya.' },
      { text: 'Cuando un estudiante te cuenta que lo molestan, tu respuesta define si volverá a pedir ayuda. Nunca minimices lo que te dice: actúa, registra y haz seguimiento.' },
    ],
  },
  {
    tag: 'Estudiar es un derecho',
    Estudiante: [
      { text: 'Si por trabajar o cuidar a otras personas no puedes estudiar o descansar, conversa con tu tutor. No es tu culpa y hay maneras de ayudarte a seguir aprendiendo.' },
      { text: 'Si alguna situación en casa te impide concentrarte o venir al colegio, no tienes que guardarlo solo. Tu tutor puede ayudarte a encontrar apoyo sin que pierdas tus estudios.' },
      { text: 'Aprender es tu derecho y nadie puede quitártelo. Si alguien te dice que no sirves para estudiar, no le creas: cada persona aprende a su ritmo, y pedir ayuda también es aprender.' },
    ],
    Docente: [
      { text: 'El cansancio constante o las faltas frecuentes a veces esconden trabajo infantil o problemas en casa. Pregunta con cuidado, sin juzgar, y registra lo que conozcas para darle seguimiento.' },
      { text: 'Como docente eres, muchas veces, el primer adulto en notar que algo pasa. Las inasistencias repetidas merecen una conversación con la familia y un registro, no solo una falta en la lista.' },
      { text: 'Un estudiante que trabaja o cuida a otros necesita comprensión, no sanciones. Coordina con Dirección y tutoría para buscarle apoyo: tus acciones pueden evitar que abandone sus estudios.' },
    ],
  },
  {
    tag: 'Un Perú sin discriminación',
    Estudiante: [
      { text: 'Nadie debe ser molestado por su forma de hablar, su origen, su piel o su cuerpo. Nuestro país es diverso y eso es lo que lo hace grande. Respetar a todos también es querer al Perú.' },
      { text: 'Si te ponen apodos por cómo hablas, de dónde vienes o cómo te ves, eso es discriminación y no tienes por qué aguantarlo. Cuéntaselo a tu tutor o repórtalo aquí.' },
      { text: 'Defender a un compañero al que discriminan también es valentía. A veces basta con no reírte, acompañarlo y avisar a un adulto.' },
    ],
    Docente: [
      { text: 'Los apodos por origen, lengua o apariencia no son bromas inocentes: son una forma de violencia escolar. Como docente, tu labor es atenderlos como tal y registrarlos para hacerles seguimiento.' },
      { text: 'Tu labor es garantizar que todos se sientan parte del aula. Revisa también tus propios ejemplos y bromas: los estudiantes copian lo que ven en los adultos.' },
      { text: 'La discriminación por origen, lengua, discapacidad o apariencia afecta el aprendizaje y la salud emocional. Tus decisiones y acciones deciden si un estudiante se siente bienvenido o excluido.' },
    ],
  },
  {
    tag: 'Tu voz importa',
    Estudiante: [
      { text: 'Si algo en el colegio no está bien, tienes derecho a decirlo y a que te escuchen. Puedes contárselo a tu tutor o registrarlo aquí; tu reporte se atiende con reserva.' },
      { text: 'Pedir ayuda es de valientes. Si algo te preocupa o te pone triste, busca a tu tutor, al psicólogo del colegio o a alguien de tu familia. Hablarlo ya es un gran paso.', help: 'salud-mental' },
      { text: 'Si eres delegado o representante de tu aula, tu papel también es cuidar a tus compañeros: escucha, acompaña y anímalos a contarle a un adulto lo que les pasa.' },
    ],
    Docente: [
      { text: 'Cuando un estudiante se anima a contarte algo, agradécele, créele y registra el hecho sin juzgar. Que se sienta escuchado hace que vuelva a confiar en ti.' },
      { text: 'Tus estudiantes necesitan saber que pueden acudir a ti. Diles con claridad cómo y dónde pueden contarte algo en reserva: esa sola información puede hacer que un caso salga a la luz.' },
      { text: 'Promover la participación de los estudiantes en las normas de convivencia es parte de tu labor. Cuando sienten que su voz cuenta, se convierten en aliados para prevenir la violencia.' },
    ],
  },
  {
    tag: 'Prevención del suicidio: hablar ayuda',
    Estudiante: [
      { text: 'Hola, quiero que sepas algo: si a veces sientes que todo es demasiado o que ya no puedes más, no estás solo. Hablar con alguien de confianza hoy mismo puede hacer la diferencia. Lo que sientes importa.', help: 'salud-mental' },
      { text: 'Si un amigo dice que quiere desaparecer o que nada vale la pena, tómalo en serio. Escúchalo sin juzgar y cuéntaselo a un adulto, aunque te pida que no lo hagas: así lo estás cuidando.', help: 'salud-mental' },
      { text: 'Los momentos difíciles no duran para siempre, aunque ahora parezca que sí. Hay personas que quieren ayudarte a encontrar una salida, y dar el primer paso para hablar con alguien es un acto de valentía.', help: 'salud-mental' },
    ],
    Docente: [
      { text: 'Si notas aislamiento, cambios bruscos de ánimo o frases de desesperanza, pregúntale con calma cómo se siente. Preguntar no pone ideas en su cabeza; al contrario, le muestra que alguien se preocupa.', help: 'salud-mental' },
      { text: 'Ante una señal de riesgo, tu deber es no dejar solo al estudiante. Acompáñalo, avisa a Dirección y a su familia, y deriva al servicio de psicología. Luego registra la atención para darle seguimiento.', help: 'salud-mental' },
      { text: 'Como docente, tus palabras pueden ser un refugio. Un saludo, una pregunta sincera o notar una ausencia le muestran a un estudiante que importa. Nunca subestimes ese gesto.', help: 'salud-mental' },
    ],
  },
  {
    tag: 'Cuidemos la salud mental',
    Estudiante: [
      { text: 'Sentirte triste, ansioso o estresado no te hace débil. Le pasa a mucha gente y se puede conversar. Busca a tu tutor, al psicólogo del colegio o a tu familia.', help: 'salud-mental' },
      { text: 'En época de exámenes es normal preocuparse. Pero si la preocupación no te deja dormir ni comer, es momento de contarlo. Descansar también es parte de estudiar.', help: 'salud-mental' },
      { text: 'Cuidar tu mente es tan importante como cuidar tu cuerpo. Dormir bien, moverte, compartir con tus amigos y hablar de lo que sientes te ayuda a estar mejor cada día.', help: 'salud-mental' },
    ],
    Docente: [
      { text: 'Tu bienestar también importa. Los casos difíciles pesan, así que compártelos con el equipo de convivencia: nadie debería cargarlos solo.' },
      { text: 'Una baja repentina en el rendimiento puede tener causas emocionales. Antes de sancionar, conversa con el estudiante: a veces lo que necesita es ser escuchado.', help: 'salud-mental' },
      { text: 'Como docente puedes ser la primera persona en notar que un estudiante no está bien. Tu labor no es diagnosticar, sino escuchar, acompañar y derivar a tiempo al servicio de psicología.', help: 'salud-mental' },
    ],
  },
  {
    tag: 'Por una escuela sin violencia',
    Estudiante: [
      { text: 'Si sufres o ves acoso, maltrato o cualquier tipo de abuso, repórtalo. Tu reporte lo atienden con reserva las personas encargadas de la convivencia en tu colegio, y su trabajo es protegerte.', help: 'violencia' },
      { text: 'Tienes derecho a aprender sin miedo. Si algo o alguien te hace daño, en el colegio hay adultos cuya tarea es protegerte. Cuéntaselo a uno de ellos.', help: 'violencia' },
      { text: 'Si eres víctima de cualquier tipo de abuso, aunque venga de alguien mayor o de alguien que conoces, no es tu culpa. Mereces que te crean y te protejan: cuéntaselo a un adulto de confianza.', help: 'violencia' },
    ],
    Docente: [
      { text: 'Empujones, burlas o dejar a alguien de lado una y otra vez no son "cosas de chicos". Son formas de violencia que, como docente, debes registrar y atender con el protocolo.' },
      { text: 'El acoso sexual, los comentarios sobre el cuerpo o el control en parejas adolescentes también son violencia. Si llegas a conocer un caso, tu deber es registrarlo y comunicarlo a Dirección.', help: 'violencia' },
      { text: 'Tus decisiones y acciones deciden si un estudiante puede estar tranquilo. Actuar con rapidez, registrar los hechos y seguir el protocolo convierte tu preocupación en protección real.' },
    ],
  },
  {
    tag: 'Cerramos el año en paz',
    Estudiante: [
      { text: 'Si este año alguien te hizo daño y no lo contaste, todavía puedes hacerlo. Nunca es tarde para pedir ayuda, y las vacaciones son un buen momento para empezar tranquilo.', help: 'violencia' },
      { text: '¡Felicitaciones por terminar el año! Si alguien te ayudó cuando lo necesitabas, agradéceselo; y si alguien necesita ayuda ahora, puedes ser tú quien le tienda la mano.' },
      { text: 'En vacaciones también cuídate en redes y en la calle. Si algo te pasa, cuéntaselo a tu familia: aunque no haya clases, siempre hay adultos dispuestos a protegerte.', help: 'violencia' },
    ],
    Docente: [
      { text: 'Antes de vacaciones, revisa tus incidencias abiertas y deja registrado el seguimiento acordado con las familias. Así, quien retome el caso en marzo sabrá exactamente dónde quedó.' },
      { text: 'Como docente, tu labor de este año dejó huella. Antes de despedirte, recuerda a tus estudiantes a quién pueden acudir durante las vacaciones si algo les pasa.' },
      { text: 'Reflexiona sobre los casos que atendiste: ¿qué funcionó y qué mejorarías? Compartirlo con el equipo de convivencia fortalece la protección de tus estudiantes el próximo año.' },
    ],
  },
]

/** Mensajes que entran en el sorteo del mes para el rol: los del tema más el general. */
export function counselorPool(audience: CounselorAudience, month: number): CounselorMessage[] {
  return [...MONTH_THEMES[month][audience], GENERAL_MESSAGES[audience]]
}

/**
 * Elige al azar un mensaje del mes para el rol, sin repetir el último mostrado (`avoid`).
 * `random` debe devolver un valor en [0, 1).
 */
export function pickCounselorMessage(
  audience: CounselorAudience,
  date: Date = new Date(),
  random: () => number = Math.random,
  avoid?: string,
): { tag: string; message: CounselorMessage; mood: CounselorMood } {
  const all = counselorPool(audience, date.getMonth())
  const pool = avoid ? all.filter((m) => m.text !== avoid) : all
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length))
  const message = pool[index]
  return { tag: MONTH_THEMES[date.getMonth()].tag, message, mood: counselorMood(date, message) }
}

/** Setiembre (prevención del suicidio), octubre (salud mental) y todo mensaje de salud mental usan la variante empática. */
export type CounselorMood = 'consejero' | 'empatico'

export function counselorMood(date: Date, message: CounselorMessage): CounselorMood {
  return [8, 9].includes(date.getMonth()) || message.help === 'salud-mental' ? 'empatico' : 'consejero'
}

export function isCounselorAudience(role: string): role is CounselorAudience {
  return role === 'Estudiante' || role === 'Docente'
}
