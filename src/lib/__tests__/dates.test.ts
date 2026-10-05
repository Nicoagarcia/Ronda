import { ageOn, parseCalendarDate, todayInArgentina, toIsoDate } from '@/lib/dates';

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
