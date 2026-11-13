import { z } from 'zod';
import { idSchema } from './common';

export const accountRoleSchema = z.enum(['pending', 'doctor', 'secretary', 'administrator', 'demo']);
export type AccountRole = z.infer<typeof accountRoleSchema>;
export const membershipRoleSchema = z.enum(['doctor', 'secretary', 'administrator']);
export const invitationRoleSchema = z.enum(['doctor', 'secretary']);
export const demoViewSchema = z.enum(['doctor', 'secretary']);
export type DemoView = z.infer<typeof demoViewSchema>;

export const authSessionSchema = z.object({
  user: z.object({ id: idSchema, name: z.string(), role: accountRoleSchema }),
  activeView: demoViewSchema.nullable(),
  onboardingRequired: z.boolean(),
  clinic: z.object({ id: idSchema, name: z.string(), timezone: z.string() }).nullable(),
  canManagePatients: z.boolean(),
  canReadClinical: z.boolean(),
  canReceiveStudies: z.boolean(),
  canReviewStudies: z.boolean(),
  canManageAccess: z.boolean(),
});
export type AuthSession = z.infer<typeof authSessionSchema>;

export const updateDemoViewSchema = z.object({ view: demoViewSchema }).strict();
export type UpdateDemoView = z.infer<typeof updateDemoViewSchema>;

export const createClinicSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: z.literal('America/Mexico_City').default('America/Mexico_City'),
}).strict();
export type CreateClinic = z.infer<typeof createClinicSchema>;
export const acceptInvitationSchema = z.object({ token: z.string().min(32).max(128) }).strict();

export const createInvitationSchema = z.object({
  email: z.string().trim().email().max(255),
  role: invitationRoleSchema.default('secretary'),
}).strict();
export type CreateInvitation = z.infer<typeof createInvitationSchema>;

export const invitationSchema = z.object({
  id: idSchema,
  clinicId: idSchema,
  email: z.string().email(),
  role: invitationRoleSchema,
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
});
export type Invitation = z.infer<typeof invitationSchema>;

export const authMemberSchema = z.object({
  id: idSchema,
  membershipId: idSchema,
  name: z.string(),
  email: z.string().email(),
  role: membershipRoleSchema,
  isAdmin: z.boolean(),
  emailVerified: z.boolean(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
});
export type AuthMember = z.infer<typeof authMemberSchema>;
