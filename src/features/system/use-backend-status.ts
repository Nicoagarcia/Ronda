import { useQuery } from '@tanstack/react-query';

import { checkBackend } from '@/services/system';

export function useBackendStatus() {
  return useQuery({ queryKey: ['system', 'backend'], queryFn: checkBackend });
}
