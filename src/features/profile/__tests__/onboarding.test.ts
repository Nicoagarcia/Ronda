import { accessState, currentOnboardingStep } from '@/features/profile/onboarding';

const empty = { name: null, birthdate: null, avatar_url: null, city_id: null, interest_ids: [] as number[] };

describe('currentOnboardingStep (spec 01, AC-10)', () => {
  it('arranca por el nombre', () => {
    expect(currentOnboardingStep(empty)).toBe('name');
  });

  it('si viene de Google con nombre y foto, salta esos pasos cuando corresponde', () => {
    expect(currentOnboardingStep({ ...empty, name: 'Nico', avatar_url: 'https://foto' })).toBe('birthdate');
    expect(currentOnboardingStep({ ...empty, name: 'Nico', avatar_url: 'https://foto', birthdate: '2000-01-01' })).toBe('city');
  });

  it('retoma en el paso donde quedó', () => {
    const upToPhoto = { ...empty, name: 'Ana', birthdate: '2000-01-01', avatar_url: 'https://foto' };
    expect(currentOnboardingStep(upToPhoto)).toBe('city');
    expect(currentOnboardingStep({ ...upToPhoto, city_id: 1, interest_ids: [1, 2] })).toBe('interests');
    expect(currentOnboardingStep({ ...upToPhoto, city_id: 1, interest_ids: [1, 2, 3] })).toBe('terms');
  });
});

describe('accessState', () => {
  const now = new Date('2026-10-05T12:00:00Z');
  const complete = { onboarding_completed_at: '2026-10-01T00:00:00Z', suspended_until: null };

  it('sin sesión va al login', () => {
    expect(accessState(false, undefined, now)).toBe('signed-out');
  });

  it('con sesión pero perfil cargando, espera', () => {
    expect(accessState(true, undefined, now)).toBe('loading');
  });

  it('perfil incompleto va al onboarding', () => {
    expect(accessState(true, { onboarding_completed_at: null, suspended_until: null }, now)).toBe('onboarding');
  });

  it('suspensión vigente gana sobre todo', () => {
    expect(accessState(true, { ...complete, suspended_until: '2026-10-10T00:00:00Z' }, now)).toBe('suspended');
  });

  it('suspensión vencida vuelve a la normalidad', () => {
    expect(accessState(true, { ...complete, suspended_until: '2026-10-01T00:00:00Z' }, now)).toBe('active');
  });
});
