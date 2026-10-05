import { ageOn, dayLabel, formatPlanWhen, fromArgentina, parseCalendarDate, todayInArgentina, toIsoDate } from '@/lib/dates';

describe('parseCalendarDate', () => {
  it('acepta fechas válidas', () => {
    expect(parseCalendarDate('10', '5', '2000')).toEqual({ year: 2000, month: 5, day: 10 });
  });

  it('rechaza fechas que no existen', () => {
    expect(parseCalendarDate('31', '2', '2000')).toBeNull();
    expect(parseCalendarDate('29', '2', '2001')).toBeNull();
    expect(parseCalendarDate('0', '1', '2000')).toBeNull();
    expect(parseCalendarDate('10', '13', '2000')).toBeNull();
  });

  it('exige el año con 4 dígitos', () => {
    expect(parseCalendarDate('10', '5', '00')).toBeNull();
  });
});

describe('ageOn (spec 01, AC-06 y AC-07)', () => {
  const today = { year: 2026, month: 10, day: 5 };

  it('cumple 18 justo hoy: tiene 18', () => {
    expect(ageOn({ year: 2008, month: 10, day: 5 }, today)).toBe(18);
  });

  it('17 años y 364 días: tiene 17', () => {
    expect(ageOn({ year: 2008, month: 10, day: 6 }, today)).toBe(17);
  });

  it('cumpleaños más adelante en el año', () => {
    expect(ageOn({ year: 2000, month: 12, day: 1 }, today)).toBe(25);
  });
});

describe('todayInArgentina', () => {
  it('usa el día de Argentina aunque en UTC ya sea mañana', () => {
    // 5/10 a las 23:30 en Argentina = 6/10 02:30 UTC.
    expect(todayInArgentina(new Date('2026-10-06T02:30:00Z'))).toEqual({ year: 2026, month: 10, day: 5 });
  });
});

describe('toIsoDate', () => {
  it('completa con ceros', () => {
    expect(toIsoDate({ year: 2000, month: 5, day: 3 })).toBe('2000-05-03');
  });
});

describe('formatPlanWhen', () => {
  // Domingo 5/10/2026, 12:00 en Argentina (15:00 UTC).
  const now = new Date('2026-10-05T15:00:00Z');

  it('hoy y mañana', () => {
    expect(formatPlanWhen('2026-10-05T21:00:00Z', now)).toBe('Hoy 18:00');
    expect(formatPlanWhen('2026-10-06T21:00:00Z', now)).toBe('Mañana 18:00');
  });

  it('usa el día de Argentina, no el de UTC', () => {
    // 23:30 del 5/10 en Argentina = 02:30 del 6/10 en UTC.
    expect(formatPlanWhen('2026-10-06T02:30:00Z', now)).toBe('Hoy 23:30');
  });

  it('esta semana muestra el día', () => {
    expect(formatPlanWhen('2026-10-10T21:00:00Z', now)).toBe('Sáb 18:00');
  });

  it('más adelante muestra la fecha', () => {
    expect(formatPlanWhen('2026-10-17T21:00:00Z', now)).toBe('Sáb 17/10 18:00');
  });
});

describe('fromArgentina', () => {
  it('interpreta la hora como hora de Argentina', () => {
    expect(fromArgentina({ year: 2026, month: 10, day: 10 }, '18:00').toISOString()).toBe('2026-10-10T21:00:00.000Z');
  });
});

describe('dayLabel', () => {
  const now = new Date('2026-10-05T15:00:00Z'); // domingo 5/10, 12:00 en Argentina

  it('hoy, ayer y días anteriores', () => {
    expect(dayLabel('2026-10-05T12:00:00Z', now)).toBe('Hoy');
    expect(dayLabel('2026-10-04T12:00:00Z', now)).toBe('Ayer');
    expect(dayLabel('2026-10-03T12:00:00Z', now)).toBe('Sáb 3/10');
  });

  it('un mensaje de las 23:30 de ayer en Argentina es "Ayer" aunque en UTC sea hoy', () => {
    expect(dayLabel('2026-10-05T02:30:00Z', now)).toBe('Ayer');
  });
});
