
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
        category: expense.category,
        date: expense.date,
        receipt: expense.receipt,
        createdAt: expense.created_at,
        updatedAt: expense.updated_at,
      }));
    },
    enabled: !!tripId && !!user,
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      // Step 1: Session validation before database operations
      if (!session || !user) {
        throw new Error('User not authenticated or session expired');
      }

      console.log('Starting expense creation...');
      console.log('User ID:', user?.id);
      console.log('Session exists:', !!session);
      console.log('Session access token exists:', !!session.access_token);

      // Step 2: Force session refresh to ensure valid JWT token
      try {
        console.log('Refreshing session...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Session refresh failed:', refreshError);
          throw new Error('Failed to refresh authentication session');
        }
        
        console.log('Session refreshed successfully');
        console.log('Refreshed session user:', refreshData.session?.user?.id);
      } catch (refreshErr) {
        console.error('Session refresh error:', refreshErr);
        // Continue anyway, the session might still be valid
      }

      // Step 3: Verify session state before proceeding
      const currentSession = await supabase.auth.getSession();
      if (!currentSession.data.session) {
        throw new Error('No valid session found after refresh');
      }

      console.log('Current session user after refresh:', currentSession.data.session.user.id);

      // Step 4: Log authentication state for debugging
      console.log('Authentication state verified:', {
        hasAccessToken: !!currentSession.data.session.access_token,
        userIdFromSession: currentSession.data.session.user.id,
        tokenPreview: currentSession.data.session.access_token.substring(0, 20) + '...'
      });

      // Attempt expense creation with retry logic
      let attempt = 0;
      const maxAttempts = 3;
      
      while (attempt < maxAttempts) {
        attempt++;
        console.log(`Expense creation attempt ${attempt}/${maxAttempts}`);
        
        try {
          // Use the refreshed session's supabase client
          const { data, error } = await supabase
            .from('expenses')
            .insert([{
              trip_id: expenseData.tripId,
              description: expenseData.description,
              amount: expenseData.amount,
              paid_by: expenseData.paidBy,
              split_between: expenseData.splitBetween,
              category: expenseData.category,
              date: expenseData.date,
              receipt: expenseData.receipt,
            }])
            .select()
            .single();

          if (error) {
            console.error(`Attempt ${attempt} failed:`, error);
            console.error('Error details:', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            
            // If it's an RLS error and we have attempts left, try refreshing auth again
            if (error.message.includes('row-level security') && attempt < maxAttempts) {
              console.log('RLS error detected, attempting auth refresh...');
              await supabase.auth.refreshSession();
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            
            if (attempt === maxAttempts) {
              throw error;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }

          console.log('Expense created successfully:', data);
          return data;
        } catch (err) {
          console.error(`Attempt ${attempt} error:`, err);
          if (attempt === maxAttempts) {
            throw err;
          }
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }

      throw new Error('Failed to create expense after multiple attempts');
      
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
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
          category: expenseData.category,
          date: expenseData.date,
          receipt: expenseData.receipt,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
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
