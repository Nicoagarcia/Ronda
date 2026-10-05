import type { MyProfile } from '@/services/profile';

export const ONBOARDING_STEPS = ['name', 'birthdate', 'photo', 'city', 'interests', 'terms'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

// El paso se deduce de lo que ya está cargado: así, si se cierra la app,
// al volver sigue donde quedó (spec 01, AC-10).
export function currentOnboardingStep(profile: Pick<MyProfile, 'name' | 'birthdate' | 'avatar_url' | 'city_id' | 'interest_ids'>): OnboardingStep {
  if (!profile.name) return 'name';
  if (!profile.birthdate) return 'birthdate';
  if (!profile.avatar_url) return 'photo';
  if (!profile.city_id) return 'city';
  if (profile.interest_ids.length < 3) return 'interests';
  return 'terms';
}

export type AccessState = 'signed-out' | 'loading' | 'suspended' | 'onboarding' | 'active';

export function accessState(
  hasSession: boolean,
  profile: Pick<MyProfile, 'onboarding_completed_at' | 'suspended_until'> | undefined,
  now: Date = new Date(),
): AccessState {
  if (!hasSession) return 'signed-out';
  if (!profile) return 'loading';
  if (profile.suspended_until && new Date(profile.suspended_until) > now) return 'suspended';
  if (!profile.onboarding_completed_at) return 'onboarding';
  return 'active';
}
