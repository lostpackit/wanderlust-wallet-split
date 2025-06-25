
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const useUserSearch = (searchTerm: string) => {
  const {
    data: users = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['user-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: searchTerm.length >= 2,
  });

  return {
    users,
    isLoading,
    error,
  };
};
