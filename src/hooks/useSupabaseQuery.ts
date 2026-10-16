import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { PostgrestError } from '@supabase/supabase-js';

type PromiseType<T> = T extends PromiseLike<infer U> ? U : T;

export function useSupabaseQuery<T extends PromiseLike<any>>(
  queryKey: unknown[],
  queryFn: () => T,
  options?: Omit<UseQueryOptions<PromiseType<T>['data'], PostgrestError>, 'queryKey' | 'queryFn'>
): UseQueryResult<PromiseType<T>['data'], PostgrestError> {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn();
      if (error) {
        throw error;
      }
      return data;
    },
    ...options,
  });
}
