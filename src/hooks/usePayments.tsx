
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
      if (!user || !tripId) throw new Error('User not authenticated or trip not selected');

      // Get the user ID for the target participant
      const toUserId = await getParticipantUserId(toParticipantId);
      if (!toUserId) {
        throw new Error('The recipient does not have a linked user account. They need to sign up and link their account to receive payments.');
      }

      const paymentData = {
        from_user_id: initiatedBy === 'payer' ? user.id : toUserId,
        to_user_id: initiatedBy === 'payer' ? toUserId : user.id,
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
          title: "Payment claim submitted",
          description: "The recipient will be notified to confirm the payment.",
        });
      } else {
        toast({
          title: "Payment confirmed",
          description: "The payment has been marked as received.",
        });
      }
    },
    onError: (error) => {
      console.error('Payment creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process payment. Please try again.",
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
