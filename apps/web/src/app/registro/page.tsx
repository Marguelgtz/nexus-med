import Link from 'next/link';

export default function RegistrationInfoPage() {
  return (
    <main className="auth-status-page">
      <section className="auth-card">
        <Link className="auth-brand" href="/login"><span className="auth-brand-mark" aria-hidden="true">N</span><span>Nexus Med</span></Link>
        <p className="eyebrow">Acceso privado</p>
        <h1>Registro con invitación</h1>
        <p>Para crear una cuenta necesitas un enlace vigente enviado por el consultorio. La invitación queda asociada a tu correo.</p>
        <div className="auth-actions"><Link className="btn btn-primary" href="/login">Ir a iniciar sesión</Link></div>
      </section>
    </main>
  );
}

