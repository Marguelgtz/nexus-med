import { z } from 'zod';
import { idSchema } from './common';

export const accountRoleSchema = z.enum(['doctor', 'secretary', 'demo']);
export type AccountRole = z.infer<typeof accountRoleSchema>;

export const demoViewSchema = z.enum(['doctor', 'secretary']);
export type DemoView = z.infer<typeof demoViewSchema>;

export const authSessionSchema = z.object({
  user: z.object({ id: idSchema, name: z.string(), role: accountRoleSchema }),
  activeView: demoViewSchema.nullable(),
  canManagePatients: z.boolean(),
  canReadClinical: z.boolean(),
  canReceiveStudies: z.boolean(),
  canReviewStudies: z.boolean(),
  canManageAccess: z.boolean(),
});
export type AuthSession = z.infer<typeof authSessionSchema>;

export const updateDemoViewSchema = z.object({ view: demoViewSchema }).strict();
export type UpdateDemoView = z.infer<typeof updateDemoViewSchema>;

export const createInvitationSchema = z.object({ email: z.string().trim().email().max(255) }).strict();
export type CreateInvitation = z.infer<typeof createInvitationSchema>;

export const invitationSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
});
export type Invitation = z.infer<typeof invitationSchema>;

export const authMemberSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['doctor', 'secretary']),
  emailVerified: z.boolean(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
});
export type AuthMember = z.infer<typeof authMemberSchema>;
