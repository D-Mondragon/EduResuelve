/*
 * Mensajes del consejero (mascota) para la pantalla de inicio de estudiantes y docentes.
 * Cada mes tiene su tema (fechas conmemorativas reales); el mensaje se elige al azar dentro del mes.
 * Los mensajes sobre salud mental siguen las pautas de comunicación segura: sin detalles de
 * métodos, con mensajes de esperanza y siempre con una vía de ayuda.
 */

export type CounselorAudience = 'Estudiante' | 'Docente'
export type CounselorHelp = 'salud-mental' | 'violencia'

export interface CounselorMessage {
  title: string
  text: string
  help?: CounselorHelp
}

interface MonthTheme {
  /** Fecha o tema del mes, visible como etiqueta. */
  tag: string
  Estudiante: CounselorMessage[]
  Docente: CounselorMessage[]
}

export const HELP_LINES: Record<CounselorHelp, string> = {
  'salud-mental': 'Línea 113, opción 5 (Minsa): orientación en salud mental, gratuita y las 24 horas.',
  violencia: 'Línea 100 (MIMP): atención gratuita ante violencia, las 24 horas.',
}

export const MONTH_THEMES: MonthTheme[] = [
  {
    tag: 'Vacaciones seguras',
    Estudiante: [
      { title: 'Cuídate también en redes', text: 'Si alguien te insulta, te amenaza o comparte fotos tuyas sin permiso, no respondas: guarda la captura y cuéntaselo a un adulto de confianza.', help: 'violencia' },
      { title: 'Nadie debe pedirte secretos', text: 'Si una persona te pide guardar un secreto que te incomoda o te da miedo, eso no está bien. Cuéntalo; no es tu culpa.', help: 'violencia' },
    ],
    Docente: [
      { title: 'Prepara el retorno', text: 'Los casos de ciberacoso suelen aumentar en vacaciones. Al regreso, pregunta cómo les fue y registra lo que te cuenten.' },
    ],
  },
  {
    tag: 'Día de Internet Segura (2.° martes de febrero)',
    Estudiante: [
      { title: 'Lo que publicas se queda', text: 'Antes de compartir algo de otra persona, pregúntate si te gustaría que lo hicieran contigo. Burlarse en grupos también es acoso.' },
      { title: 'Bloquea, guarda y cuenta', text: 'Si te molestan por internet: bloquea, guarda la evidencia y avisa a tu tutor o a tu familia. Puedes reportarlo aquí.', help: 'violencia' },
    ],
    Docente: [
      { title: 'El ciberacoso también es escolar', text: 'Aunque ocurra fuera del aula, si afecta la convivencia entre estudiantes debe registrarse y atenderse.' },
    ],
  },
  {
    tag: 'Inicio del año escolar',
    Estudiante: [
      { title: 'Un aula donde todos caben', text: 'Saluda al compañero nuevo, invítalo a tu grupo. Nadie debería pasar el recreo solo.' },
      { title: 'Si ves algo, dilo', text: 'Si ves que molestan a alguien una y otra vez, no te quedes callado: cuéntaselo a un docente o regístralo en EduResuelve.' },
    ],
    Docente: [
      { title: 'Acuerdos de convivencia', text: 'Construye con tu sección las normas del aula en las primeras semanas: los acuerdos propios se cumplen mejor.' },
      { title: 'Registra desde el primer caso', text: 'Un hecho aislado hoy puede ser un patrón mañana. El registro temprano permite actuar a tiempo.' },
    ],
  },
  {
    tag: 'Día del Niño Peruano (2.° domingo de abril)',
    Estudiante: [
      { title: 'Tienes derecho a sentirte seguro', text: 'Nadie puede golpearte, humillarte ni tocarte sin tu permiso, ni en el colegio ni fuera de él. Si te pasa, cuéntalo.', help: 'violencia' },
    ],
    Docente: [
      { title: 'El buen trato se enseña tratando bien', text: 'Corregir sin gritos ni humillaciones también es parte de proteger los derechos de tus estudiantes.' },
    ],
  },
  {
    tag: 'Día contra el acoso escolar (2 de mayo)',
    Estudiante: [
      { title: 'El bullying no es un juego', text: 'Si se repite, duele y uno no puede defenderse, es acoso. Contarlo no es "acusar": es pedir ayuda.', help: 'violencia' },
      { title: 'Tú puedes ser la diferencia', text: 'Quien mira y se ríe también hace daño. Acompaña a quien lo pasa mal y avisa a un adulto.' },
    ],
    Docente: [
      { title: 'Señales que no hay que pasar por alto', text: 'Aislamiento, ausencias frecuentes, útiles dañados o miedo a ir al colegio pueden indicar acoso. Regístralo y comunícalo.' },
      { title: 'Actúa dentro de las 24 horas', text: 'Ante un caso de violencia escolar, registra el hecho y comunícalo a Dirección sin demora; el sistema te guía en el protocolo.' },
    ],
  },
  {
    tag: 'Día mundial contra el trabajo infantil (12 de junio)',
    Estudiante: [
      { title: 'Estudiar es tu derecho', text: 'Si por trabajar o cuidar a otros no puedes estudiar o descansar, habla con tu tutor: hay maneras de ayudarte.' },
    ],
    Docente: [
      { title: 'Las inasistencias cuentan una historia', text: 'El cansancio o las faltas frecuentes pueden deberse a trabajo infantil o a problemas en casa. Pregunta con cuidado y registra.' },
    ],
  },
  {
    tag: 'Fiestas Patrias',
    Estudiante: [
      { title: 'Un Perú sin burlas', text: 'Nadie debe ser molestado por su forma de hablar, su origen, su piel o su cuerpo. Respetar también es querer al país.' },
    ],
    Docente: [
      { title: 'La discriminación también es violencia', text: 'Los apodos por origen, lengua o apariencia son una forma de violencia escolar y deben atenderse como tal.' },
    ],
  },
  {
    tag: 'Día internacional de la juventud (12 de agosto)',
    Estudiante: [
      { title: 'Tu voz importa', text: 'Si algo en el colegio no está bien, tienes derecho a decirlo y a que te escuchen. Puedes registrarlo aquí.' },
      { title: 'Pedir ayuda es de valientes', text: 'Si algo te preocupa o te pone triste, conversa con tu tutor o con el psicólogo del colegio.', help: 'salud-mental' },
    ],
    Docente: [
      { title: 'Escuchar es intervenir', text: 'Cuando un estudiante se anima a contar algo, agradécele, créele y registra el hecho sin juzgar.' },
    ],
  },
  {
    tag: 'Mes de la prevención del suicidio (10 de setiembre)',
    Estudiante: [
      { title: 'No estás solo', text: 'Si sientes que todo es demasiado o que no puedes más, habla hoy con alguien de confianza. Hay personas preparadas para escucharte.', help: 'salud-mental' },
      { title: 'Cuida a tus amigos', text: 'Si un amigo dice que quiere desaparecer o que nada vale la pena, tómalo en serio y cuéntaselo a un adulto, aunque te pida no hacerlo.', help: 'salud-mental' },
    ],
    Docente: [
      { title: 'Preguntar no hace daño', text: 'Si notas aislamiento, cambios bruscos o frases de desesperanza, pregunta con calma cómo se siente y deriva al servicio de psicología.', help: 'salud-mental' },
      { title: 'Nunca lo dejes solo', text: 'Ante un riesgo, acompaña al estudiante, avisa a Dirección y a la familia, y registra la atención en el sistema.', help: 'salud-mental' },
    ],
  },
  {
    tag: 'Día mundial de la salud mental (10 de octubre)',
    Estudiante: [
      { title: 'Sentirte mal no te hace débil', text: 'La tristeza, la ansiedad o el estrés se pueden conversar. Busca a tu tutor, al psicólogo o a tu familia.', help: 'salud-mental' },
      { title: 'Respira y pide apoyo', text: 'En épocas de exámenes es normal preocuparse. Si la preocupación no te deja dormir o comer, cuéntalo.', help: 'salud-mental' },
    ],
    Docente: [
      { title: 'Cuídate para cuidar', text: 'Tu bienestar también importa. Comparte la carga de los casos difíciles con el equipo de convivencia.' },
      { title: 'Detecta a tiempo', text: 'El bajo rendimiento repentino puede tener causas emocionales. Conversa antes de sancionar.', help: 'salud-mental' },
    ],
  },
  {
    tag: 'Noviembre: por una escuela sin violencia',
    Estudiante: [
      { title: 'Reportar protege (1.er jueves de noviembre)', text: 'Es el Día internacional contra la violencia y el acoso en la escuela. Si sufres o ves acoso, maltrato o cualquier abuso, repórtalo. Tu reporte se atiende con reserva.', help: 'violencia' },
      { title: 'Tus derechos (20 de noviembre)', text: 'Tienes derecho a aprender sin miedo. Si algo te hace daño, en el colegio hay adultos que deben protegerte.', help: 'violencia' },
    ],
    Docente: [
      { title: 'Día contra el acoso en la escuela (1.er jueves)', text: 'Empujones, burlas o exclusión repetida no son "cosas de chicos". Regístralos y activa el protocolo.' },
      { title: 'Violencia de género (25 de noviembre)', text: 'El acoso sexual, los comentarios sobre el cuerpo y el control en parejas adolescentes también deben registrarse.', help: 'violencia' },
    ],
  },
  {
    tag: 'Día de los Derechos Humanos (10 de diciembre)',
    Estudiante: [
      { title: 'Cierra el año en paz', text: 'Si este año alguien te hizo daño y no lo contaste, todavía puedes hacerlo. Nunca es tarde para pedir ayuda.', help: 'violencia' },
    ],
    Docente: [
      { title: 'Cierra los casos pendientes', text: 'Antes de vacaciones, revisa tus incidencias abiertas y deja registrado el seguimiento acordado con las familias.' },
    ],
  },
]

/** Elige un mensaje del mes para el rol. `random` debe devolver un valor en [0, 1). */
export function pickCounselorMessage(
  audience: CounselorAudience,
  date: Date = new Date(),
  random: () => number = Math.random,
): { tag: string; message: CounselorMessage; index: number } {
  const theme = MONTH_THEMES[date.getMonth()]
  const pool = theme[audience]
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length))
  return { tag: theme.tag, message: pool[index], index }
}

export function isCounselorAudience(role: string): role is CounselorAudience {
  return role === 'Estudiante' || role === 'Docente'
}
