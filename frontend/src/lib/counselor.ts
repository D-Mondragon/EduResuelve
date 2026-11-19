/*
 * Mensajes del consejero (mascota) para la pantalla de inicio de estudiantes y docentes.
 * Cada mes tiene un tema (inspirado en sus fechas conmemorativas) y el mensaje se elige al azar
 * dentro del mes, evitando repetir el último que se mostró.
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
 * - Línea 100 (MIMP, Programa Warmi Ñan): gratuita, 24 horas, también atiende a niñas, niños y adolescentes.
 */
export const HELP_LINES: Record<CounselorHelp, Record<CounselorAudience, { lead: string; line: string; detail: string }>> = {
  'salud-mental': {
    Estudiante: {
      lead: 'No tienes que pasarlo solo.',
      line: 'Llama al 113 y marca la opción 5',
      detail: 'Un psicólogo del Minsa te escuchará, sin costo y a cualquier hora.',
    },
    Docente: {
      lead: 'Puedes orientar al estudiante y a su familia:',
      line: 'Línea 113, opción 5 (Minsa)',
      detail: 'Psicólogos que escuchan y orientan, sin costo y las 24 horas.',
    },
  },
  violencia: {
    Estudiante: {
      lead: 'Si tú o alguien que conoces corre peligro,',
      line: 'llama a la Línea 100',
      detail: 'Te escuchan y te orientan sin costo, de día y de noche.',
    },
    Docente: {
      lead: 'Ante un caso de violencia, también puedes llamar a la',
      line: 'Línea 100 (MIMP)',
      detail: 'Orientación gratuita las 24 horas, también para niñas, niños y adolescentes.',
    },
  },
}

export const MONTH_THEMES: MonthTheme[] = [
  {
    tag: 'Vacaciones seguras',
    Estudiante: [
      { text: '¡Hola! En vacaciones pasamos más tiempo en redes. Si alguien te insulta, te amenaza o comparte fotos tuyas sin permiso, no le respondas: guarda una captura y cuéntaselo a un adulto de confianza. Pedir ayuda no te mete en problemas.', help: 'violencia' },
      { text: 'Oye, si una persona te pide guardar un secreto que te incomoda o te da miedo, eso no está bien. Tú no tienes la culpa. Cuéntaselo a alguien de tu familia o a tu tutor, ellos pueden protegerte.', help: 'violencia' },
    ],
    Docente: [
      { text: 'En vacaciones el ciberacoso suele aumentar, porque los chicos pasan más tiempo conectados. Cuando vuelvan, dedica unos minutos a preguntarles cómo les fue; si alguien te cuenta algo, regístralo para que no se pierda.' },
      { text: 'Antes del nuevo año escolar, vale la pena revisar los casos que quedaron abiertos. Un seguimiento a tiempo evita que un problema de diciembre se repita en marzo.' },
    ],
  },
  {
    tag: 'Internet segura',
    Estudiante: [
      { text: '¿Sabías que burlarse de alguien en un grupo de chat también es acoso? Antes de compartir una foto o un meme de otra persona, pregúntate si te gustaría que lo hicieran contigo. En internet también se respeta.' },
      { text: 'Si te molestan por internet, recuerda tres pasos: bloquea, guarda la evidencia y cuéntalo. Tu tutor o tu familia pueden ayudarte, y también puedes reportarlo aquí mismo.', help: 'violencia' },
    ],
    Docente: [
      { text: 'Aunque el ciberacoso ocurra fuera del horario escolar, si afecta la convivencia entre estudiantes, el colegio debe atenderlo. Regístralo con las capturas como evidencia: así el caso no depende de la memoria de nadie.' },
    ],
  },
  {
    tag: 'Un buen inicio de clases',
    Estudiante: [
      { text: '¡Empezamos un nuevo año! Si ves a un compañero nuevo solo en el recreo, invítalo a tu grupo. Un pequeño gesto puede cambiarle el día a alguien.' },
      { text: 'Si ves que molestan a alguien una y otra vez, no te quedes callado. Contárselo a un profesor no es "acusar": es ayudar. También puedes reportarlo en EduResuelve.' },
    ],
    Docente: [
      { text: 'Las primeras semanas son ideales para construir con tu sección los acuerdos de convivencia. Cuando los estudiantes participan en crearlos, los respetan mucho más.' },
      { text: 'Un hecho aislado hoy puede ser un patrón mañana. Registrar desde el primer caso permite ver a tiempo cuándo algo se repite y actuar antes de que crezca.' },
    ],
  },
  {
    tag: 'Tus derechos importan',
    Estudiante: [
      { text: 'Tienes derecho a sentirte seguro. Nadie puede golpearte, humillarte ni tocarte sin tu permiso, ni en el colegio ni fuera de él. Si te pasa algo así, cuéntalo: hay adultos que deben protegerte.', help: 'violencia' },
    ],
    Docente: [
      { text: 'El buen trato también se enseña con el ejemplo. Corregir sin gritos ni humillaciones es parte de proteger los derechos de tus estudiantes, y les muestra cómo resolver conflictos.' },
    ],
  },
  {
    tag: 'No al acoso escolar',
    Estudiante: [
      { text: 'El bullying no es un juego. Si se repite, duele y uno no puede defenderse, es acoso. Contarlo no es ser "soplón": es pedir ayuda para ti o para un compañero.', help: 'violencia' },
      { text: '¿Sabías que quien mira y se ríe también hace daño? Puedes ser la diferencia: acompaña a quien lo está pasando mal y avisa a un profesor o reporta lo que viste.' },
    ],
    Docente: [
      { text: 'Aislamiento, faltas frecuentes, útiles dañados o miedo a venir al colegio pueden ser señales de acoso. Si notas algo, conversa con el estudiante y registra lo que observes.' },
      { text: 'Ante un hecho de violencia escolar, regístralo y comunícalo a Dirección sin demora. El sistema te va guiando en cada paso del protocolo.' },
    ],
  },
  {
    tag: 'Estudiar es un derecho',
    Estudiante: [
      { text: 'Si por trabajar o cuidar a otras personas no puedes estudiar o descansar, conversa con tu tutor. No es tu culpa y hay maneras de ayudarte a seguir aprendiendo.' },
    ],
    Docente: [
      { text: 'El cansancio constante o las faltas frecuentes a veces esconden trabajo infantil o problemas en casa. Pregunta con cuidado, sin juzgar, y registra lo que conozcas para darle seguimiento.' },
    ],
  },
  {
    tag: 'Un Perú sin discriminación',
    Estudiante: [
      { text: 'Nadie debe ser molestado por su forma de hablar, su origen, su piel o su cuerpo. Nuestro país es diverso y eso es lo que lo hace grande. Respetar a todos también es querer al Perú.' },
    ],
    Docente: [
      { text: 'Los apodos por origen, lengua o apariencia no son bromas inocentes: son una forma de violencia escolar. Atiéndelos como tal y regístralos para hacerles seguimiento.' },
    ],
  },
  {
    tag: 'Tu voz importa',
    Estudiante: [
      { text: 'Si algo en el colegio no está bien, tienes derecho a decirlo y a que te escuchen. Puedes contárselo a tu tutor o registrarlo aquí; tu reporte se atiende con reserva.' },
      { text: 'Pedir ayuda es de valientes. Si algo te preocupa o te pone triste, busca a tu tutor, al psicólogo del colegio o a alguien de tu familia. Hablarlo ya es un gran paso.', help: 'salud-mental' },
    ],
    Docente: [
      { text: 'Cuando un estudiante se anima a contarte algo, agradécele, créele y registra el hecho sin juzgar. Que se sienta escuchado hace que vuelva a confiar en ti.' },
    ],
  },
  {
    tag: 'Prevención del suicidio: hablar ayuda',
    Estudiante: [
      { text: 'Hola, quiero que sepas algo: si a veces sientes que todo es demasiado o que ya no puedes más, no estás solo. Hablar con alguien de confianza hoy mismo puede hacer la diferencia. Lo que sientes importa.', help: 'salud-mental' },
      { text: 'Si un amigo dice que quiere desaparecer o que nada vale la pena, tómalo en serio. Escúchalo sin juzgar y cuéntaselo a un adulto, aunque te pida que no lo hagas: así lo estás cuidando.', help: 'salud-mental' },
    ],
    Docente: [
      { text: 'Si notas aislamiento, cambios bruscos de ánimo o frases de desesperanza, pregúntale con calma cómo se siente. Preguntar no pone ideas en su cabeza; al contrario, le muestra que alguien se preocupa.', help: 'salud-mental' },
      { text: 'Ante una señal de riesgo, no dejes solo al estudiante. Acompáñalo, avisa a Dirección y a su familia, y deriva al servicio de psicología. Luego registra la atención para darle seguimiento.', help: 'salud-mental' },
    ],
  },
  {
    tag: 'Cuidemos la salud mental',
    Estudiante: [
      { text: 'Sentirte triste, ansioso o estresado no te hace débil. Le pasa a mucha gente y se puede conversar. Busca a tu tutor, al psicólogo del colegio o a tu familia.', help: 'salud-mental' },
      { text: 'En época de exámenes es normal preocuparse. Pero si la preocupación no te deja dormir ni comer, es momento de contarlo. Descansar también es parte de estudiar.', help: 'salud-mental' },
    ],
    Docente: [
      { text: 'Tu bienestar también importa. Los casos difíciles pesan, así que compártelos con el equipo de convivencia: nadie debería cargarlos solo.' },
      { text: 'Una baja repentina en el rendimiento puede tener causas emocionales. Antes de sancionar, conversa con el estudiante: a veces lo que necesita es ser escuchado.', help: 'salud-mental' },
    ],
  },
  {
    tag: 'Por una escuela sin violencia',
    Estudiante: [
      { text: 'Si sufres o ves acoso, maltrato o cualquier tipo de abuso, repórtalo. Tu reporte lo atienden con reserva las personas encargadas de la convivencia en tu colegio, y su trabajo es protegerte.', help: 'violencia' },
      { text: 'Tienes derecho a aprender sin miedo. Si algo o alguien te hace daño, en el colegio hay adultos cuya tarea es protegerte. Cuéntaselo a uno de ellos.', help: 'violencia' },
    ],
    Docente: [
      { text: 'Empujones, burlas o dejar a alguien de lado una y otra vez no son "cosas de chicos". Son formas de violencia que deben registrarse y atenderse con el protocolo.' },
      { text: 'El acoso sexual, los comentarios sobre el cuerpo o el control en parejas adolescentes también son violencia. Si llegas a conocer un caso, regístralo y comunícalo a Dirección.', help: 'violencia' },
    ],
  },
  {
    tag: 'Cerramos el año en paz',
    Estudiante: [
      { text: 'Si este año alguien te hizo daño y no lo contaste, todavía puedes hacerlo. Nunca es tarde para pedir ayuda, y las vacaciones son un buen momento para empezar tranquilo.', help: 'violencia' },
    ],
    Docente: [
      { text: 'Antes de vacaciones, revisa tus incidencias abiertas y deja registrado el seguimiento acordado con las familias. Así, quien retome el caso en marzo sabrá exactamente dónde quedó.' },
    ],
  },
]

/**
 * Elige al azar un mensaje del mes para el rol. Si se indica `avoid` (el último mostrado) y hay
 * más de uno, no lo repite. `random` debe devolver un valor en [0, 1).
 */
export function pickCounselorMessage(
  audience: CounselorAudience,
  date: Date = new Date(),
  random: () => number = Math.random,
  avoid?: string,
): { tag: string; message: CounselorMessage } {
  const theme = MONTH_THEMES[date.getMonth()]
  const all = theme[audience]
  const pool = all.length > 1 && avoid ? all.filter((m) => m.text !== avoid) : all
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length))
  return { tag: theme.tag, message: pool[index] }
}

export function isCounselorAudience(role: string): role is CounselorAudience {
  return role === 'Estudiante' || role === 'Docente'
}
