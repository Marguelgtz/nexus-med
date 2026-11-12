'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { safeInternalReturnPath } from '../../lib/auth/return-path';

type AuthMode = 'login' | 'invitation' | 'reset-request' | 'reset' | 'verification';

interface AuthPanelProps {
  mode: AuthMode;
  returnTo?: string;
  notice?: string;
  invitationToken?: string;
  resetToken?: string;
  tokenError?: string;
}

interface ApiMessage {
  email?: string;
  message?: string;
  error?: string | { message?: string; code?: string };
  code?: string;
  url?: string;
}

function messageFrom(value: ApiMessage | null, fallback: string): string {
  if (!value) return fallback;
  const error = typeof value.error === 'string' ? value.error : value.error?.message;
  const code = typeof value.error === 'object' ? value.error.code : value.code;
  if (code === 'EMAIL_NOT_VERIFIED') return 'Confirma tu correo antes de iniciar sesión.';
  if (code === 'INVALID_EMAIL_OR_PASSWORD' || code === 'INVALID_PASSWORD') return 'El correo o la contraseña no coinciden.';
  if (code === 'invitation_required') return 'Se requiere una invitación vigente para crear la cuenta.';
  if (code === 'INVALID_TOKEN' || code === 'BAD_REQUEST') return error ?? 'El enlace venció o ya se utilizó. Solicita uno nuevo.';
  return error ?? value.message ?? fallback;
}

async function postAuth(path: string, data: Record<string, unknown>): Promise<ApiMessage> {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const body = await response.json().catch(() => null) as ApiMessage | null;
  if (!response.ok) throw new Error(messageFrom(body, 'No se pudo completar la solicitud.'));
  return body ?? {};
}

export function AuthPanel({ mode, returnTo = '/', notice, invitationToken, resetToken, tokenError }: AuthPanelProps) {
  const router = useRouter();
  const destination = safeInternalReturnPath(returnTo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteReady, setInviteReady] = useState(mode !== 'invitation');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [localEmailCapture, setLocalEmailCapture] = useState(false);
  const tokenErrorMessage = tokenError
    ? 'El enlace venció o ya se utilizó. Solicita una nueva recuperación.'
    : mode === 'invitation' && !invitationToken
      ? 'El enlace de invitación no contiene un token. Solicita una nueva invitación.'
      : '';

  useEffect(() => {
    let active = true;
    fetch('/api/options', { cache: 'no-store' })
      .then(response => response.json())
      .then((value: { googleEnabled?: boolean; localEmailCapture?: boolean }) => {
        if (active) {
          setGoogleEnabled(value.googleEnabled === true);
          setLocalEmailCapture(value.localEmailCapture === true);
        }
      })
      .catch(() => { if (active) setGoogleEnabled(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (mode !== 'invitation') return;
    if (!invitationToken) return;
    let active = true;
    postAuth('prepare-invitation', { token: invitationToken })
      .then((value) => {
        if (!active) return;
        setInviteEmail(typeof value.email === 'string' ? value.email : '');
        setInviteReady(true);
        window.history.replaceState(null, '', '/aceptar-invitacion');
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'La invitación venció o ya se utilizó.');
      });
    return () => { active = false; };
  }, [invitationToken, mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    const absoluteDestination = new URL(destination, window.location.origin).toString();

    try {
      if (mode === 'login') {
        await postAuth('sign-in/email', { email, password, callbackURL: absoluteDestination });
        router.replace(destination);
        router.refresh();
      } else if (mode === 'invitation') {
        if (!inviteReady || !inviteEmail) throw new Error('Primero valida el enlace de invitación.');
        if (email !== inviteEmail.toLowerCase()) throw new Error('Usa el correo al que se envió la invitación.');
        const confirmation = String(form.get('passwordConfirmation') ?? '');
        if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
        await postAuth('sign-up/email', {
          name: String(form.get('name') ?? '').trim(),
          email,
          password,
          callbackURL: new URL('/login?verified=1', window.location.origin).toString(),
        });
        setSuccess('La cuenta quedó creada. Revisa tu correo para verificarla antes de iniciar sesión.');
      } else if (mode === 'reset-request') {
        await postAuth('request-password-reset', {
          email,
          redirectTo: new URL('/restablecer-contrasena', window.location.origin).toString(),
        });
        setSuccess('Si existe una cuenta con ese correo, enviaremos instrucciones para restablecer la contraseña.');
      } else if (mode === 'reset') {
        if (!resetToken) throw new Error('Falta el token de recuperación. Solicita un enlace nuevo.');
        const confirmation = String(form.get('passwordConfirmation') ?? '');
        if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
        await postAuth('reset-password', { token: resetToken, newPassword: password });
        router.replace('/login?reset=1');
      } else {
        await postAuth('send-verification-email', { email, callbackURL: new URL('/login?verified=1', window.location.origin).toString() });
        setSuccess('Si la cuenta está pendiente de verificación, enviaremos un nuevo enlace.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo completar la solicitud.');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setError('');
    try {
      if (mode === 'invitation' && (!inviteReady || !inviteEmail)) throw new Error('Primero valida el enlace de invitación.');
      const result = await postAuth('sign-in/social', {
        provider: 'google',
        callbackURL: new URL(destination, window.location.origin).toString(),
        errorCallbackURL: new URL('/login?error=google', window.location.origin).toString(),
        requestSignUp: mode === 'invitation',
      });
      if (!result.url) throw new Error('Google no devolvió la dirección de acceso.');
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesión con Google.');
      setBusy(false);
    }
  }

  async function enterDemo() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/demo/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null) as ApiMessage | null;
      if (!response.ok) throw new Error(messageFrom(body, 'No se pudo abrir la demostración.'));
      window.location.assign('/recepcion');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo abrir la demostración.');
      setBusy(false);
    }
  }

  const heading = mode === 'login' ? 'Iniciar sesión'
    : mode === 'invitation' ? 'Crear cuenta'
    : mode === 'reset-request' ? 'Recuperar contraseña'
    : mode === 'reset' ? 'Elegir contraseña nueva'
    : 'Verificar correo';

  return (
    <section className="auth-card">
      <Link className="auth-brand" href="/login" aria-label="Nexus Med, inicio">
        <span className="auth-brand-mark" aria-hidden="true">N</span><span>Nexus Med</span>
      </Link>
      <p className="eyebrow">Acceso a la aplicación</p>
      <h1>{heading}</h1>
      {notice ? <p className="auth-message auth-success" role="status">{notice}</p> : null}
      {mode === 'login' ? <p>Entra a tu espacio de trabajo clínico.</p> : null}
      {mode === 'invitation' ? <p>El acceso se crea con una invitación del consultorio.</p> : null}
      {mode === 'reset-request' ? <p>Te enviaremos un enlace si el correo corresponde a una cuenta.</p> : null}
      {mode === 'reset' ? <p>La contraseña debe tener entre 12 y 128 caracteres.</p> : null}
      {mode === 'verification' ? <p>Vuelve a solicitar la verificación para una cuenta pendiente.</p> : null}

      {mode === 'login' && googleEnabled ? <button className="btn btn-secondary auth-google" type="button" disabled={busy} onClick={signInWithGoogle}>Continuar con Google</button> : null}
      {mode === 'invitation' && googleEnabled ? <button className="btn btn-secondary auth-google" type="button" disabled={busy || !inviteReady} onClick={signInWithGoogle}>Crear cuenta con Google</button> : null}
      {mode === 'login' && googleEnabled ? <div className="auth-divider"><span>o usa tu correo</span></div> : null}
      {mode === 'invitation' && googleEnabled ? <div className="auth-divider"><span>o crea una contraseña</span></div> : null}
      {mode === 'login' ? (
        <div className="auth-demo">
          <p>Explora con datos ficticios. Los cambios de la demo son compartidos y permanecen guardados.</p>
          <button className="btn btn-secondary auth-submit" type="button" disabled={busy} onClick={enterDemo}>Probar demo</button>
        </div>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'invitation' ? (
          <label>Nombre completo<input name="name" type="text" autoComplete="name" required minLength={2} maxLength={100} disabled={!inviteReady || busy} /></label>
        ) : null}
        {mode === 'reset' ? <input type="hidden" name="token" value={resetToken ?? ''} /> : null}
        {mode !== 'reset' ? (
          <label>Correo electrónico<input name="email" type="email" autoComplete="email" required maxLength={255} value={mode === 'invitation' ? inviteEmail : undefined} readOnly={mode === 'invitation'} disabled={mode === 'invitation' && !inviteReady} /></label>
        ) : null}
        {mode === 'login' || mode === 'invitation' || mode === 'reset' ? (
          <label>{mode === 'login' ? 'Contraseña' : 'Contraseña nueva'}
            <input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : mode === 'invitation' ? 'new-password' : 'new-password'} required minLength={12} maxLength={128} disabled={busy || (mode === 'invitation' && !inviteReady)} />
          </label>
        ) : null}
        {mode === 'invitation' || mode === 'reset' ? (
          <label>Confirmar contraseña<input name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} disabled={busy || (mode === 'invitation' && !inviteReady)} /></label>
        ) : null}
        {error || tokenErrorMessage ? <p className="auth-message auth-error" role="alert">{error || tokenErrorMessage}</p> : null}
        {success ? <p className="auth-message auth-success" role="status">{success}</p> : null}
        <button className="btn btn-primary auth-submit" type="submit" disabled={busy || (mode === 'invitation' && !inviteReady) || (mode === 'reset' && !resetToken)}>
          {busy ? 'Procesando…' : mode === 'login' ? 'Entrar'
            : mode === 'invitation' ? 'Crear cuenta'
            : mode === 'reset-request' ? 'Enviar instrucciones'
            : mode === 'reset' ? 'Guardar contraseña'
            : 'Enviar verificación'}
        </button>
      </form>

      <nav className="auth-links" aria-label="Opciones de cuenta">
        {mode === 'login' && localEmailCapture ? <Link href="/dev/correo">Correo de desarrollo</Link> : null}
        {mode === 'login' ? <><Link href="/olvide-contrasena">Olvidé mi contraseña</Link><Link href="/verificar-correo">Verificar correo</Link><Link href="/registro">¿Necesitas acceso? Consulta cómo registrarte</Link></> : null}
        {mode === 'invitation' ? <Link href="/login">Ya tengo cuenta</Link> : null}
        {mode === 'reset-request' || mode === 'reset' || mode === 'verification' ? <Link href="/login">Volver a iniciar sesión</Link> : null}
      </nav>
    </section>
  );
}

