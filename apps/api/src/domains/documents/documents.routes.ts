// Structured printable documents (mounted under /api).

import { Hono } from 'hono';

import { createMedicalDocumentInputSchema, updateMedicalDocumentInputSchema } from '@nexus-med/contracts';

import {
  createMedicalDocument,
  getMedicalDocument,
  listPatientDocuments,
  updateMedicalDocument,
} from './documents.service';
import { parseOrThrow, readJsonBody } from '../../shared/http/parse';

export const documentsRoutes = new Hono();

documentsRoutes.get('/patients/:patientId/documents', async (c) => {
  const documents = await listPatientDocuments(c.req.param('patientId'));
  return c.json(documents);
});

documentsRoutes.post('/patients/:patientId/documents', async (c) => {
  const input = parseOrThrow(createMedicalDocumentInputSchema, await readJsonBody(c));
  const document = await createMedicalDocument(c.req.param('patientId'), input);
  return c.json(document, 201);
});

documentsRoutes.get('/documents/:documentId', async (c) => {
  const document = await getMedicalDocument(c.req.param('documentId'));
  return c.json(document);
});

documentsRoutes.patch('/documents/:documentId', async (c) => {
  const input = parseOrThrow(updateMedicalDocumentInputSchema, await readJsonBody(c));
  const document = await updateMedicalDocument(c.req.param('documentId'), input);
  return c.json(document);
});
