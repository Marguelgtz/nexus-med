import type { QueuedEmailKind } from './outbox';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

const copy: Record<Exclude<QueuedEmailKind, 'appointment'>, { subject: string; action: string; context: string }> = {
  verify_email: {
    subject: 'Confirma tu correo de Nexus Med',
    action: 'Confirmar correo',
    context: 'Confirma que puedes recibir mensajes en esta dirección para activar el acceso.',
  },
  reset_password: {
    subject: 'Restablece tu contraseña de Nexus Med',
    action: 'Crear nueva contraseña',
    context: 'Usa este enlace para elegir una contraseña nueva. Si no solicitaste el cambio, puedes ignorar este mensaje.',
  },
  invitation: {
    subject: 'Invitación para acceder a Nexus Med',
    action: 'Aceptar invitación',
    context: 'Se te invitó a colaborar en el consultorio. La invitación caduca en 72 horas.',
  },
};

export function authEmailTemplate(kind: Exclude<QueuedEmailKind, 'appointment'>, name: string, url: string) {
  const message = copy[kind];
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(url);
  return {
    subject: message.subject,
    payload: {
      text: `Hola ${name},\n\n${message.context}\n\n${message.action}: ${url}\n\nNexus Med`,
      html: `<!doctype html><html lang="es"><body style="margin:0;background:#f2f0e9;color:#202720;font-family:Georgia,serif"><main style="max-width:560px;margin:36px auto;padding:36px;background:#fffdf8;border:1px solid #ddd9cd"><p style="margin:0;color:#57725b;font:600 12px system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase">Nexus Med</p><h1 style="font-size:28px;font-weight:500">${message.subject}</h1><p>Hola ${safeName},</p><p style="font:16px/1.6 system-ui,sans-serif">${message.context}</p><p style="margin:32px 0"><a href="${safeUrl}" style="display:inline-block;padding:13px 18px;background:#315c49;color:white;text-decoration:none;font:600 14px system-ui,sans-serif">${message.action}</a></p><p style="font:13px/1.5 system-ui,sans-serif;color:#62675f">Si el botón no abre, copia este enlace en tu navegador:</p><p style="overflow-wrap:anywhere;font:12px/1.5 system-ui,sans-serif;color:#315c49">${safeUrl}</p></main></body></html>`,
    },
  };
}
