import { describe, expect, it } from 'vitest';
import { app, registerPatient, uniqueName } from './helpers';
import { studyReceiptSchema } from '@nexus-med/contracts';
const headers = { 'content-type': 'application/json' };
function upload(patientId: string, metadata: object, content = '%PDF-1.7\nSynthetic demonstration only', type = 'application/pdf') {
  const body = new FormData();
  body.set('metadata', JSON.stringify(metadata));
  body.append('files', new File([content], 'fictional-study.pdf', { type }));
  return app.request(`/api/patients/${patientId}/study-receipts`, { method: 'POST', body });
}
describe('Received studies and local files', () => {
  it('persists an external receipt, retrieves bytes and separates receipt from review', async () => {
    const p = await registerPatient(uniqueName());
    const created = await upload(p.id, { title: 'Fictional demonstration' });
    expect(created.status).toBe(201);
    const row = studyReceiptSchema.parse(await created.json());
    expect(row.encounter).toBeNull();
    expect(row.requestId).toBeNull();
    expect(row.reviewedAt).toBeNull();
    const file = await app.request(`/api/study-receipt-files/${row.files[0]!.id}`);
    expect(file.status).toBe(200);
    expect(await file.text()).toBe('%PDF-1.7\nSynthetic demonstration only');
    expect(file.headers.get('cache-control')).toBe('no-store');
    const reviewed = await app.request(`/api/study-receipts/${row.id}/review`, { method: 'POST', headers, body: JSON.stringify({ reviewNote: 'Fictional physician note' }) });
    expect(reviewed.status).toBe(200);
    expect(studyReceiptSchema.parse(await reviewed.json()).reviewedAt).toBeTruthy();
    expect((await app.request(`/api/study-receipts/${row.id}/review`, { method: 'POST', headers, body: '{}' })).status).toBe(409);
    const admin = await app.request(`/api/study-receipts?patientId=${p.id}&view=administrative&review=all`);
    const items = await admin.json() as Record<string, unknown>[];
    expect(items[0]).not.toHaveProperty('reviewNote');
    const pending = await app.request(`/api/study-receipts?patientId=${p.id}`);
    expect(await pending.json()).toEqual([]);
  });
  it('rejects another patient consultation and spoofed file content', async () => {
    const p = await registerPatient(uniqueName());
    const other = await registerPatient(uniqueName());
    const encounter = await app.request(`/api/patients/${other.id}/encounters`, { method: 'POST', headers, body: JSON.stringify({ occurredAt: '2026-11-10T12:00:00Z' }) });
    const e = await encounter.json() as { id: string };
    expect((await upload(p.id, { title: 'Wrong patient', encounterId: e.id })).status).toBe(400);
    expect((await upload(p.id, { title: 'Spoofed file' }, '<html>not a PDF</html>')).status).toBe(400);
    expect((await upload(p.id, { title: 'Unsupported' }, '<svg/>', 'image/svg+xml')).status).toBe(400);
    expect((await upload('missing', { title: 'Missing patient' })).status).toBe(404);
    const list = await app.request(`/api/study-receipts?patientId=${p.id}&review=all`);
    expect(await list.json()).toEqual([]);
  });
  it('bounds files and rejects foreign browser origins', async () => {
    const p = await registerPatient(uniqueName());
    const body = new FormData();
    body.set('metadata', JSON.stringify({ title: 'Synthetic files' }));
    for (let i = 0; i < 6; i++) body.append('files', new File(['%PDF-1.7'], `synthetic-${i}.pdf`, { type: 'application/pdf' }));
    expect((await app.request(`/api/patients/${p.id}/study-receipts`, { method: 'POST', body })).status).toBe(400);
    const foreign = await app.request(`/api/patients/${p.id}/study-receipts`, { method: 'POST', headers: { Origin: 'https://untrusted.example' }, body });
    expect(foreign.status).toBe(403);
    const oversized = await app.request(`/api/patients/${p.id}/study-receipts`, { method: 'POST', headers: { 'content-length': String(26 * 1024 * 1024) }, body });
    expect(oversized.status).toBe(413);
    expect((await app.request('/api/study-receipt-files/missing')).status).toBe(404);
  });
  it('receives a requested study without changing the original order status', async () => {
    const p = await registerPatient(uniqueName());
    const order = await app.request(`/api/patients/${p.id}/studies`, { method: 'POST', headers, body: JSON.stringify({ studies: [{ category: 'laboratorio', name: 'Synthetic laboratory order' }] }) });
    expect(order.status).toBe(201);
    const orders = await order.json() as { id: string }[];
    const received = await upload(p.id, { title: 'Synthetic result', requestId: orders[0]!.id });
    expect(received.status).toBe(201);
    const original = await app.request(`/api/patients/${p.id}/studies`);
    expect((await original.json() as { status: string }[])[0]!.status).toBe('ordered');
  });

});
