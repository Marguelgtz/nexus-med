import Link from 'next/link';

export default function CalendarNotFound() {
  return (
    <div className="empty-state">
      <div className="empty-title">Fecha no válida</div>
      <p>La fecha del calendario debe ser una fecha real en formato AAAA-MM-DD.</p>
      <Link href="/calendar" className="btn btn-primary">
        Volver a hoy
      </Link>
    </div>
  );
}
