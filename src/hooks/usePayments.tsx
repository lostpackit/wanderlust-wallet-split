
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Payment {
  id: string;
  from_user_id: string;
  to_user_id: string;
  trip_id: string;
  amount: number;
  description?: string;
  status: 'pending' | 'confirmed' | 'settled';
  initiated_by: 'payer' | 'payee';
  payment_date?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

export const usePayments = (tripId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: payments = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['payments', tripId, user?.id],
    queryFn: async () => {
      if (!user || !tripId) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!user && !!tripId,
  });

  // Helper function to get user ID from participant ID
  const getParticipantUserId = async (participantId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('participants')
      .select('user_id')
      .eq('id', participantId)
      .single();

    if (error || !data?.user_id) {
      return null;
    }
    return data.user_id;
  };

  const createPaymentMutation = useMutation({
    mutationFn: async ({
      toParticipantId,
      amount,
      description,
      initiatedBy,
    }: {
      toParticipantId: string;
      amount: number;
      description?: string;
      initiatedBy: 'payer' | 'payee';
    }) => {
      if (!user || !tripId) throw new Error('Please sign in to record payments.');

      // Get the user ID for the target participant (may be null for unlinked participants)
      const otherUserId = await getParticipantUserId(toParticipantId);
      
      // For "I Paid" (payer initiated): recipient needs a linked account to receive notification
      // For "I Received" (payee initiated): the payer doesn't need an account - we just record it
      if (initiatedBy === 'payer' && !otherUserId) {
        throw new Error(`${description?.includes('to') ? description.split('to ')[1] : 'This person'} hasn't joined the app yet. Ask them to sign up with the same email used in this trip, then you can send them payments.`);
      }

      const paymentData = {
        // For "I Paid": from = me, to = recipient (requires their account)
        // For "I Received": from = payer (may not have account), to = me
        from_user_id: initiatedBy === 'payer' ? user.id : (otherUserId || user.id),
        to_user_id: initiatedBy === 'payer' ? otherUserId : user.id,
        trip_id: tripId,
        amount,
        description,
        initiated_by: initiatedBy,
        status: initiatedBy === 'payee' ? 'settled' : 'pending',
        payment_date: new Date().toISOString(),
        confirmed_at: initiatedBy === 'payee' ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['detailed-balances'] });
      
      if (variables.initiatedBy === 'payer') {
        toast({
          title: "Payment recorded",
          description: "The recipient will be notified to confirm.",
        });
      } else {
        toast({
          title: "Payment received!",
          description: "This has been recorded and your balance is updated.",
        });
      }
    },
    onError: (error) => {
      console.error('Payment creation error:', error);
      toast({
        title: "Couldn't record payment",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { data, error } = await supabase
        .from('payments')
        .update({
          status: 'settled',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['detailed-balances'] });
      toast({
        title: "Payment confirmed",
        description: "The payment has been confirmed and settled.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to confirm payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    payments,
    isLoading,
    error,
    createPayment: createPaymentMutation.mutate,
    confirmPayment: confirmPaymentMutation.mutate,
    isCreatingPayment: createPaymentMutation.isPending,
    isConfirmingPayment: confirmPaymentMutation.isPending,
  };
};
