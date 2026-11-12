'use client';

import { useCallback, useEffect, useState } from 'react';

interface CapturedEmail {
  id: string;
  kind: string;
  recipient: string;
  subject: string;
  status: string;
  createdAt: string;
  text: string;
  html: string;
}

export function LocalEmailCapture() {
  const [messages, setMessages] = useState<CapturedEmail[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/dev/emails', { cache: 'no-store' })
      .then(async response => {
        const body = await response.json().catch(() => null) as { messages?: CapturedEmail[]; error?: { message?: string } } | null;
        if (!response.ok || !Array.isArray(body?.messages)) throw new Error(body?.error?.message ?? 'Esta página solo está disponible en desarrollo local.');
        if (active) setMessages(body.messages);
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los correos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/dev/emails', { cache: 'no-store' });
      const body = await response.json().catch(() => null) as { messages?: CapturedEmail[]; error?: { message?: string } } | null;
      if (!response.ok || !Array.isArray(body?.messages)) throw new Error(body?.error?.message ?? 'Esta página solo está disponible en desarrollo local.');
      setMessages(body.messages);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los correos.');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <main className="mail-capture-page">
      <div className="mail-capture-header">
        <div><p className="eyebrow">Solo desarrollo local</p><h1>Correo capturado</h1><p>Estos mensajes permanecen en la cola local. No se envían a ningún destinatario.</p></div>
        <button className="btn btn-secondary" type="button" onClick={() => void refresh()} disabled={loading}>Actualizar</button>
      </div>
      {error ? <p className="auth-message auth-error" role="alert">{error}</p> : null}
      {loading ? <p className="muted">Cargando mensajes…</p> : null}
      {!loading && !error && messages.length === 0 ? <section className="empty-state"><h2>No hay correos capturados</h2><p>Las invitaciones y solicitudes de verificación aparecerán aquí.</p></section> : null}
      <div className="mail-capture-list">
        {messages.map(message => {
          const link = extractAppLink(message.text);
          return (
            <article className="mail-capture-item" key={message.id}>
              <div className="mail-capture-meta"><span>{message.kind}</span><span>{message.status}</span><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</time></div>
              <h2>{message.subject}</h2>
              <p>Para: {message.recipient}</p>
              <pre>{message.text}</pre>
              {link ? <a className="btn btn-primary" href={link} referrerPolicy="no-referrer">Abrir enlace de prueba</a> : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}

function extractAppLink(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  if (!match?.[0]) return null;
  try {
    const url = new URL(match[0]);
    if (!['/api/auth/verify-email', '/api/auth/reset-password', '/aceptar-invitacion'].includes(url.pathname)) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

