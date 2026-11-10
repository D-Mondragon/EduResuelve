import { Home, SearchX, ShieldAlert } from 'lucide-react'
import { ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Feedback'

function NotFoundPage({ forbidden = false }: { forbidden?: boolean }) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        action={
          <ButtonLink icon={Home} to="/dashboard">
            Ir al inicio
          </ButtonLink>
        }
        description={
          forbidden
            ? 'Tu rol no tiene permiso para acceder a esta sección.'
            : 'La página que buscas no existe o fue movida.'
        }
        icon={forbidden ? ShieldAlert : SearchX}
        title={forbidden ? 'Acceso restringido' : 'Página no encontrada'}
      />
    </div>
  )
}

export default NotFoundPage
