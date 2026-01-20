import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useGuestStatus = () => {
  const { user } = useAuth();

  const { data: isGuest, isLoading } = useQuery({
    queryKey: ['guest-status', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_guest')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching guest status:', error);
        return false;
      }
      
      return data?.is_guest ?? false;
    },
    enabled: !!user,
  });

  return {
    isGuest: isGuest ?? false,
    isLoading,
  };
};
