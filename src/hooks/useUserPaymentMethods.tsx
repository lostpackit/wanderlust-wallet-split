import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserPaymentMethods = (participantId: string) => {
  return useQuery({
    queryKey: ['payment-methods', participantId],
    queryFn: async () => {
      // First get the user_id from the participants table
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('user_id')
        .eq('id', participantId)
        .maybeSingle();

      if (participantError) throw participantError;
      if (!participant?.user_id) return null;

      // Then get the payment methods from the profiles table using the user_id
      const { data, error } = await supabase
        .from('profiles')
        .select('venmo_username, paypal_email, zelle_number, cashapp_tag, iban, other_payment_info, full_name, email')
        .eq('id', participant.user_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!participantId,
  });
};