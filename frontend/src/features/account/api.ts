import { apiRequest } from '../../lib/api/client';
import type { UserProfileResponse } from '../../lib/api/types';

export async function updateClassCode(classCode: string, signal?: AbortSignal): Promise<UserProfileResponse | null> {
  const result = await apiRequest<UserProfileResponse>('/users/me/class-code', {
    method: 'PUT', signal, body: JSON.stringify({ classCode }),
  });
  return result.success && result.data ? result.data : null;
}
