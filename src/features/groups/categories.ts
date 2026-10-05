import { useInterests } from '@/features/profile/hooks';

// Colores de fondo para la portada de grupos sin imagen (spec 02, AC-04).
const COVER_COLORS = ['#ffe4d8', '#dbeafe', '#dcfce7', '#fef9c3', '#f3e8ff', '#ffe4e6', '#cffafe', '#e7e5e4'];

export function coverColor(categoryId: number): string {
  return COVER_COLORS[categoryId % COVER_COLORS.length];
}

export function useCategory(categoryId: number | null | undefined) {
  const { data } = useInterests();
  return data?.find((i) => i.id === categoryId) ?? null;
}
