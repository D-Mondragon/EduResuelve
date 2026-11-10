import type {
  Closure,
  Evidence,
  FollowUp,
  Incident,
  IncidentCategory,
  IncidentPriority,
  IncidentStatus,
  Resolution,
} from '../types/incident'

export const mockResolutions: Array<Resolution & { incidentId: string }> = [
  {
    incidentId: 'ER-2026-0004',
    summary: 'Se completó el acompañamiento solicitado por la familia.',
    actionsTaken: 'Se realizaron entrevistas y se compartieron pautas de apoyo.',
    result: 'La familia cuenta con orientaciones para continuar el proceso.',
    observations: 'Se acordó mantener comunicación con el equipo escolar.',
    resolutionDate: '2026-09-21',
    registeredBy: 'Usuario de prueba',
  },
  {
    incidentId: 'ER-2026-0005',
    summary: 'Datos de matrícula actualizados.',
    actionsTaken: 'Se revisó la documentación y se actualizó el expediente.',
    result: 'La información quedó completa y verificada.',
    observations: 'La persona tutora confirmó los datos actualizados.',
    resolutionDate: '2026-09-17',
    registeredBy: 'Usuario de prueba',
  },
]

export const mockClosures: Array<Closure & { incidentId: string }> = [
  {
    incidentId: 'ER-2026-0004',
    closureObservations: 'La familia recibió las orientaciones acordadas.',
    closedAt: '2026-09-22T10:30:00Z',
    closedBy: 'Usuario de prueba',
  },
]

export const mockFollowUps: FollowUp[] = [
  {
    id: 1,
    incidentId: 'ER-2026-0001',
    status: 'Nuevo',
    date: '2026-09-24',
    time: '08:30',
    user: 'Usuario de prueba',
    observation: 'Incidencia registrada por el equipo educativo.',
  },
  {
    id: 2,
    incidentId: 'ER-2026-0001',
    status: 'En revisión',
    date: '2026-09-24',
    time: '10:15',
    user: 'María Torres',
    observation: 'La coordinación de convivencia inició la revisión.',
  },
  {
    id: 3,
    incidentId: 'ER-2026-0002',
    status: 'Nuevo',
    date: '2026-09-22',
    time: '09:00',
    user: 'Usuario de prueba',
    observation: 'Solicitud recibida por coordinación académica.',
  },
  {
    id: 4,
    incidentId: 'ER-2026-0002',
    status: 'En revisión',
    date: '2026-09-22',
    time: '13:30',
    user: 'Javier Rojas',
    observation: 'Se revisaron los antecedentes académicos disponibles.',
  },
  {
    id: 5,
    incidentId: 'ER-2026-0002',
    status: 'Asignado',
    responsibleUserId: 'USR-0003',
    date: '2026-09-23',
    time: '11:20',
    user: 'Javier Rojas',
    observation: 'Caso asignado a coordinación académica.',
  },
  {
    id: 6,
    incidentId: 'ER-2026-0003',
    status: 'Nuevo',
    date: '2026-09-20',
    time: '07:45',
    user: 'Usuario de prueba',
    observation: 'Reporte recibido antes del inicio de la jornada.',
  },
  {
    id: 7,
    incidentId: 'ER-2026-0003',
    status: 'En revisión',
    date: '2026-09-20',
    time: '08:20',
    user: 'Lucía Vega',
    observation: 'Se verificó la ubicación y el alcance reportado.',
  },
  {
    id: 8,
    incidentId: 'ER-2026-0003',
    status: 'Asignado',
    responsibleUserId: 'USR-0007',
    date: '2026-09-20',
    time: '09:05',
    user: 'Lucía Vega',
    observation: 'Revisión asignada a administración escolar.',
  },
  {
    id: 9,
    incidentId: 'ER-2026-0003',
    status: 'En atención',
    date: '2026-09-20',
    time: '12:10',
    user: 'Lucía Vega',
    observation: 'Mantenimiento coordina una inspección del espacio.',
  },
  {
    id: 10,
    incidentId: 'ER-2026-0004',
    status: 'Nuevo',
    date: '2026-09-18',
    time: '14:00',
    user: 'Usuario de prueba',
    observation: 'Solicitud registrada para revisión del equipo.',
  },
  {
    id: 11,
    incidentId: 'ER-2026-0004',
    status: 'En revisión',
    date: '2026-09-19',
    time: '09:15',
    user: 'Elena Cruz',
    observation: 'Se coordinaron entrevistas de orientación.',
  },
  {
    id: 12,
    incidentId: 'ER-2026-0004',
    status: 'Asignado',
    responsibleUserId: 'USR-0006',
    date: '2026-09-19',
    time: '11:00',
    user: 'Elena Cruz',
    observation: 'Caso asignado al equipo de orientación.',
  },
  {
    id: 13,
    incidentId: 'ER-2026-0004',
    status: 'En atención',
    date: '2026-09-20',
    time: '10:00',
    user: 'Elena Cruz',
    observation: 'Se inició el acompañamiento familiar.',
  },
  {
    id: 14,
    incidentId: 'ER-2026-0004',
    status: 'Resuelto',
    date: '2026-09-21',
    time: '15:10',
    user: 'Elena Cruz',
    observation: 'El equipo completó las acciones de orientación.',
  },
  {
    id: 15,
    incidentId: 'ER-2026-0004',
    status: 'Cerrado',
    date: '2026-09-22',
    time: '10:30',
    user: 'Usuario de prueba',
    observation: 'La incidencia se cerró tras confirmar la atención.',
  },
  {
    id: 16,
    incidentId: 'ER-2026-0005',
    status: 'Nuevo',
    date: '2026-09-16',
    time: '10:10',
    user: 'Usuario de prueba',
    observation: 'Solicitud recibida en secretaría escolar.',
  },
  {
    id: 17,
    incidentId: 'ER-2026-0005',
    status: 'En revisión',
    date: '2026-09-16',
    time: '11:25',
    user: 'Elena Cruz',
    observation: 'Se verificaron los datos entregados.',
  },
  {
    id: 18,
    incidentId: 'ER-2026-0005',
    status: 'Asignado',
    responsibleUserId: 'USR-0007',
    date: '2026-09-16',
    time: '13:00',
    user: 'Elena Cruz',
    observation: 'Solicitud asignada a secretaría escolar.',
  },
  {
    id: 19,
    incidentId: 'ER-2026-0005',
    status: 'En atención',
    date: '2026-09-17',
    time: '09:10',
    user: 'Elena Cruz',
    observation: 'Se realizó la actualización solicitada.',
  },
  {
    id: 20,
    incidentId: 'ER-2026-0005',
    status: 'Resuelto',
    date: '2026-09-17',
    time: '15:40',
    user: 'Elena Cruz',
    observation: 'La actualización quedó revisada por el equipo.',
  },
]

export const mockEvidences: Evidence[] = [
  {
    id: 1,
    incidentId: 'ER-2026-0001',
    fileName: 'acta-de-reunion.pdf',
    fileType: 'application/pdf',
    fileSize: 184320,
    evidenceType: 'Documento',
    description: 'Acta inicial de conversación con el equipo educativo.',
    registeredAt: '2026-09-24T11:00:00Z',
    registeredBy: 'María Torres',
  },
  {
    id: 2,
    incidentId: 'ER-2026-0002',
    fileName: 'observaciones-academicas.docx',
    fileType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 97280,
    evidenceType: 'Informe',
    description: 'Observaciones académicas compartidas por la docente.',
    registeredAt: '2026-09-22T14:30:00Z',
    registeredBy: 'Javier Rojas',
  },
  {
    id: 3,
    incidentId: 'ER-2026-0003',
    fileName: 'filtracion-aula-4.jpg',
    fileType: 'image/jpeg',
    fileSize: 524288,
    evidenceType: 'Imagen',
    description: 'Registro visual del área afectada en el aula.',
    registeredAt: '2026-09-20T08:10:00Z',
    registeredBy: 'Lucía Vega',
  },
  {
    id: 4,
    incidentId: 'ER-2026-0004',
    fileName: 'solicitud-orientacion.pdf',
    fileType: 'application/pdf',
    fileSize: 110592,
    evidenceType: 'Documento',
    description: 'Solicitud inicial de orientación presentada por la familia.',
    registeredAt: '2026-09-18T14:15:00Z',
    registeredBy: 'Usuario de prueba',
  },
  {
    id: 5,
    incidentId: 'ER-2026-0005',
    fileName: 'datos-matricula.pdf',
    fileType: 'application/pdf',
    fileSize: 139264,
    evidenceType: 'Documento',
    description: 'Documento de referencia para la actualización de matrícula.',
    registeredAt: '2026-09-16T10:45:00Z',
    registeredBy: 'Elena Cruz',
  },
]

export const mockResolutionsByIncident: Record<string, Resolution> =
  Object.fromEntries(
    mockResolutions.map(({ incidentId, ...resolution }) => [incidentId, resolution]),
  )

export const mockClosuresByIncident: Record<string, Closure> = Object.fromEntries(
  mockClosures.map(({ incidentId, ...closure }) => [incidentId, closure]),
)

interface IncidentSeed {
  id: string
  code: string
  title: string
  description: string
  category: IncidentCategory
  priority: IncidentPriority
  status: IncidentStatus
  incidentDate: string
  location: string
  involvedPeople: string
  registeredAt: string
  updatedAt: string
  responsible: string
  responsibleUserId?: string
  observations: string
}

const incidentSeeds: IncidentSeed[] = [
  {
    id: 'ER-2026-0001',
    code: 'ER-2026-0001',
    title: 'Conflicto durante el recreo',
    description:
      'Se reportó un desacuerdo entre estudiantes durante el recreo. El equipo escolar está revisando lo ocurrido y recopilando antecedentes.',
    category: 'Convivencia',
    priority: 'Alta',
    status: 'En revisión',
    incidentDate: '2026-09-24',
    location: 'Patio central',
    involvedPeople: 'Estudiantes del grupo 2B',
    registeredAt: '2026-09-24T08:30:00Z',
    updatedAt: '2026-09-24T10:15:00Z',
    responsible: 'Pendiente de asignación',
    observations: 'Pendiente de conversar con las personas involucradas.',
  },
  {
    id: 'ER-2026-0002',
    code: 'ER-2026-0002',
    title: 'Dificultad de aprendizaje en matemáticas',
    description:
      'Se solicita acompañamiento por dificultades persistentes en la comprensión de contenidos matemáticos.',
    category: 'Académica',
    priority: 'Media',
    status: 'Asignado',
    incidentDate: '2026-09-22',
    location: 'Aula 5',
    involvedPeople: 'Estudiante y docente de matemáticas',
    registeredAt: '2026-09-22T09:00:00Z',
    updatedAt: '2026-09-23T11:20:00Z',
    responsible: 'Camila Ficticia, Docente',
    responsibleUserId: 'USR-0003',
    observations: 'Se revisarán los apoyos pedagógicos disponibles.',
  },
  {
    id: 'ER-2026-0003',
    code: 'ER-2026-0003',
    title: 'Filtración de agua en el aula 4',
    description:
      'Se observa filtración de agua cerca de una ventana del aula, lo que requiere revisión para mantener el espacio en condiciones adecuadas.',
    category: 'Infraestructura',
    priority: 'Crítica',
    status: 'En atención',
    incidentDate: '2026-09-20',
    location: 'Aula 4, edificio principal',
    involvedPeople: 'Personal docente del aula 4',
    registeredAt: '2026-09-20T07:45:00Z',
    updatedAt: '2026-09-20T12:10:00Z',
    responsible: 'Greta Demostración, Administrador',
    responsibleUserId: 'USR-0007',
    observations: 'Se notificó al equipo de mantenimiento para una inspección.',
  },
  {
    id: 'ER-2026-0004',
    code: 'ER-2026-0004',
    title: 'Solicitud de orientación familiar',
    description:
      'La familia solicitó orientación para acompañar el proceso de adaptación escolar del estudiante.',
    category: 'Orientación',
    priority: 'Baja',
    status: 'Cerrado',
    incidentDate: '2026-09-18',
    location: 'Oficina de orientación',
    involvedPeople: 'Familia y estudiante',
    registeredAt: '2026-09-18T14:00:00Z',
    updatedAt: '2026-09-22T10:30:00Z',
    responsible: 'Fabián Imaginario, Orientador',
    responsibleUserId: 'USR-0006',
    observations: 'La familia recibió las orientaciones acordadas.',
  },
  {
    id: 'ER-2026-0005',
    code: 'ER-2026-0005',
    title: 'Actualización de datos de matrícula',
    description:
      'Se solicitó actualizar información de matrícula para mantener el expediente escolar al día.',
    category: 'Administrativa',
    priority: 'Media',
    status: 'Resuelto',
    incidentDate: '2026-09-16',
    location: 'Secretaría escolar',
    involvedPeople: 'Persona tutora del estudiante',
    registeredAt: '2026-09-16T10:10:00Z',
    updatedAt: '2026-09-17T15:40:00Z',
    responsible: 'Greta Demostración, Administrador',
    responsibleUserId: 'USR-0007',
    observations: 'La información de matrícula fue revisada y actualizada.',
  },
]

export const mockIncidents: Incident[] = incidentSeeds.map((incident) => {
  const resolution = mockResolutionsByIncident[incident.id]
  const closure = mockClosuresByIncident[incident.id]

  return {
    ...incident,
    ...(resolution ? { resolution } : {}),
    ...(closure ? { closure } : {}),
  }
})