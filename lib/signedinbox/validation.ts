import { z } from 'zod';

export const CreateStampSchema = z.object({
  sender_id: z.string().uuid(),
  recipient_email: z.string().email().optional(),
  subject_hint: z.string().max(100).optional(),
  content_hash: z.string().length(64).regex(/^[0-9a-f]+$/).optional(),
  turnstile_token: z.string().min(1),
  client_type: z.enum(['web', 'chrome_extension', 'api']).optional().default('web'),
  is_mass_send: z.boolean().optional().default(false),
  declared_recipient_count: z.number().int().positive().optional(),
});

export const CreateSenderSchema = z.object({
  display_name: z.string().min(1).max(200),
  email: z.string().email(),
});

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(['stamp:create', 'stamp:validate', 'stamp:revoke'])).optional(),
});

export const VerifyEmailSchema = z.object({
  sender_id: z.string().uuid(),
  code: z.string().length(6).regex(/^\d{6}$/),
});

export type CreateStampInput = z.infer<typeof CreateStampSchema>;
export type CreateSenderInput = z.infer<typeof CreateSenderSchema>;
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
