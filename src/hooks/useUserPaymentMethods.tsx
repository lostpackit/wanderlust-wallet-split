import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserPaymentMethods = (userId: string) => {
  return useQuery({
    queryKey: ['payment-methods', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('venmo_username, paypal_email, zelle_number, cashapp_tag, iban, other_payment_info, full_name, email')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};