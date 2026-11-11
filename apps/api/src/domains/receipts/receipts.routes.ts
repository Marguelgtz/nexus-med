import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { RECEIPT_MAX_BODY_BYTES, createStudyReceiptSchema, receiptQuerySchema, reviewReceiptSchema } from '@nexus-med/contracts';
import { parseOrThrow, readJsonBody } from '../../shared/http/parse';
import { ValidationError } from '../../shared/http/errors';
import { createReceipt, getReceiptFile, listReceipts, reviewReceipt, receiptOptions } from './receipts.service';
export const receiptsRoutes = new Hono();
receiptsRoutes.get('/study-receipts', async c => c.json(await listReceipts(parseOrThrow(receiptQuerySchema, c.req.query()))));
receiptsRoutes.post('/patients/:patientId/study-receipts', bodyLimit({ maxSize: RECEIPT_MAX_BODY_BYTES, onError: c => c.json({ error: { code: 'VALIDATION_ERROR', message: 'El envío supera 25 MB.' } }, 413) }), async c => {
  let data: FormData;
  try { data = await c.req.raw.formData(); } catch { throw new ValidationError('Envía los datos y archivos como formulario.'); }
  if ([...data.keys()].some(key => key !== 'metadata' && key !== 'files')) throw new ValidationError('El formulario contiene campos desconocidos.');
  let metadata: unknown;
  try { metadata = JSON.parse(String(data.get('metadata'))); } catch { throw new ValidationError('Datos del estudio inválidos.'); }
  const input = parseOrThrow(createStudyReceiptSchema, metadata);
  const files = data.getAll('files');
  if (files.some(file => !(file instanceof File))) throw new ValidationError('Adjunta archivos válidos.');
  return c.json(await createReceipt(c.req.param('patientId'), input, files as File[]), 201);
});
receiptsRoutes.post('/study-receipts/:receiptId/review', async c => {
  const input = parseOrThrow(reviewReceiptSchema, await readJsonBody(c));
  return c.json(await reviewReceipt(c.req.param('receiptId'), input.reviewNote));
});
receiptsRoutes.get('/study-receipt-files/:fileId', async c => {
  const { file, bytes } = await getReceiptFile(c.req.param('fileId'));
  return c.body(bytes, 200, { 'Content-Type': file.mimeType, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': 'sandbox', 'Cache-Control': 'no-store' });
});

receiptsRoutes.get('/patients/:patientId/study-receipt-options', async c => c.json(await receiptOptions(c.req.param('patientId'))));
