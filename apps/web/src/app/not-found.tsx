import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="empty-state">
      <div className="empty-title">Página no encontrada</div>
      <p>El registro no existe o fue eliminado.</p>
      <Link href="/patients" className="btn btn-primary">
        Volver al listado
      </Link>
    </div>
  );
}
