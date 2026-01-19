
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Expense } from '@/types/trip';
import { useToast } from '@/hooks/use-toast';

export const useExpenses = (tripId: string | null) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: expenses = [],
    isLoading: expensesLoading,
    error: expensesError
  } = useQuery({
    queryKey: ['expenses', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map((expense): Expense => ({
        id: expense.id,
        tripId: expense.trip_id,
        description: expense.description,
        amount: expense.amount,
        paidBy: expense.paid_by,
        splitBetween: expense.split_between,
        transactionShares: expense.transaction_shares as { [participantId: string]: number } | undefined,
        category: expense.category,
        date: expense.date,
        receipt: expense.receipt,
        originalCurrency: expense.original_currency,
        originalAmount: expense.original_amount,
        exchangeRate: expense.exchange_rate,
        receiptData: expense.receipt_data,
        expenseSource: expense.expense_source as 'manual' | 'scanned_receipt',
        createdAt: expense.created_at,
        updatedAt: expense.updated_at,
      }));
    },
    enabled: !!tripId && !!user,
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      // Step 1: Session validation
      if (!session || !user) {
        throw new Error('User not authenticated or session expired');
      }

      console.log('=== Starting expense creation debugging ===');
      
      // Step 2: Get fresh session and access token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('Failed to get valid session');
      }

      const accessToken = sessionData.session.access_token;
      console.log('Access token exists:', !!accessToken);
      console.log('User ID from session:', sessionData.session.user.id);

      // Step 3: Test database auth context with debug function
      try {
        console.log('Testing database auth context...');
        const { data: authDebug, error: debugError } = await supabase
          .rpc('debug_auth_context');
        
        console.log('Database auth context:', authDebug);
        
        if (debugError) {
          console.error('Debug function error:', debugError);
        }
      } catch (debugErr) {
        console.error('Failed to call debug function:', debugErr);
      }

      // Step 4: Force client to use current session
      try {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: sessionData.session.refresh_token
        });
        console.log('Session set on client');
      } catch (setSessionErr) {
        console.error('Failed to set session:', setSessionErr);
      }

      // Step 5: Try expense creation with permissive policy
      console.log('Creating expense with data:', {
        trip_id: expenseData.tripId,
        description: expenseData.description,
        amount: expenseData.amount,
        paid_by: expenseData.paidBy,
        split_between: expenseData.splitBetween,
        transaction_shares: expenseData.transactionShares,
        category: expenseData.category,
        date: expenseData.date,
        receipt: expenseData.receipt
      });
      
      try {
        const { data, error } = await supabase
          .from('expenses')
          .insert([{
            trip_id: expenseData.tripId,
            description: expenseData.description,
            amount: expenseData.amount,
            paid_by: expenseData.paidBy,
            split_between: expenseData.splitBetween,
            transaction_shares: expenseData.transactionShares,
            category: expenseData.category,
            date: expenseData.date,
            receipt: expenseData.receipt,
            original_currency: expenseData.originalCurrency,
            original_amount: expenseData.originalAmount,
            exchange_rate: expenseData.exchangeRate,
            receipt_data: expenseData.receiptData,
            expense_source: expenseData.expenseSource,
          }])
          .select()
          .single();

        if (error) {
          console.error('Supabase insert failed:', error);
          
          // Step 6: Try manual fetch with explicit headers as fallback
          console.log('Trying manual fetch with explicit headers...');
          
          const baseUrl = 'https://suriubspgymcogfqnabm.supabase.co';
          const response = await fetch(`${baseUrl}/rest/v1/expenses`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cml1YnNwZ3ltY29nZnFuYWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTk3OTMsImV4cCI6MjA2NjMzNTc5M30.fKtl1sR99Gff4GV1wQGBZo_x9gBQw_o7w3gv97dFnYw'
            },
            body: JSON.stringify({
              trip_id: expenseData.tripId,
              description: expenseData.description,
              amount: expenseData.amount,
              paid_by: expenseData.paidBy,
              split_between: expenseData.splitBetween,
              transaction_shares: expenseData.transactionShares,
              category: expenseData.category,
              date: expenseData.date,
              receipt: expenseData.receipt
            })
          });

          console.log('Manual fetch response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Manual fetch failed:', response.status, errorText);
            throw new Error(`Both Supabase client and manual fetch failed. Supabase error: ${error.message}. Fetch error: ${response.status} ${errorText}`);
          }

          const manualResult = await response.json();
          console.log('Manual fetch succeeded:', manualResult);
          return Array.isArray(manualResult) ? manualResult[0] : manualResult;
        }

        console.log('Supabase insert succeeded:', data);
        return data;
      } catch (err) {
        console.error('All expense creation attempts failed:', err);
        throw err;
      }
      
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['detailed-balances'] });
      toast({
        title: "Expense added!",
        description: "Your expense has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Add expense mutation failed:', error);
      
      let errorMessage = error.message;
      if (error.message.includes('row-level security')) {
        errorMessage = 'Permission denied. Please ensure you have access to this trip.';
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = 'Access denied. Please refresh the page and try again.';
      }
      
      toast({
        title: "Failed to add expense",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, ...expenseData }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update({
          description: expenseData.description,
          amount: expenseData.amount,
          paid_by: expenseData.paidBy,
          split_between: expenseData.splitBetween,
          transaction_shares: expenseData.transactionShares,
          category: expenseData.category,
          date: expenseData.date,
          receipt: expenseData.receipt,
          original_currency: expenseData.originalCurrency,
          original_amount: expenseData.originalAmount,
          exchange_rate: expenseData.exchangeRate,
          receipt_data: expenseData.receiptData,
          expense_source: expenseData.expenseSource,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['detailed-balances'] });
      toast({
        title: "Expense updated!",
        description: "Your expense has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['detailed-balances'] });
      toast({
        title: "Expense deleted",
        description: "The expense has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    expenses,
    expensesLoading,
    expensesError,
    addExpense: addExpenseMutation.mutate,
    updateExpense: updateExpenseMutation.mutate,
    deleteExpense: deleteExpenseMutation.mutate,
    isAddingExpense: addExpenseMutation.isPending,
    isUpdatingExpense: updateExpenseMutation.isPending,
    isDeletingExpense: deleteExpenseMutation.isPending,
  };
};
