
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Trip, Participant, Expense } from '@/types/trip';
import { calculateDetailedBalances, DetailedBalances } from '@/utils/detailedBalanceCalculator';

export const useDetailedBalances = () => {
  const { user } = useAuth();

  const {
    data: detailedBalances,
    isLoading: balancesLoading,
    error: balancesError
  } = useQuery({
    queryKey: ['detailed-balances', user?.id],
    queryFn: async (): Promise<DetailedBalances | null> => {
      if (!user) return null;

      console.log('Fetching detailed balances for user:', user.id);

      // Get all trips for the user
      const { data: allTrips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;

      const allExpenses: { [tripId: string]: Expense[] } = {};
      const allParticipants: { [tripId: string]: (Participant & { role: string })[] } = {};
      const userTrips: Trip[] = [];

      // Process each trip
      for (const trip of allTrips || []) {
        const isCreator = trip.created_by === user.id;
        
        // Get participants for this trip
        const { data: tripParticipants, error: participantsError } = await supabase
          .from('trip_participants')
          .select(`
            participant_id,
            role,
            participants!fk_trip_participants_participant (
              id,
              name,
              email,
              avatar,
              user_id
            )
          `)
          .eq('trip_id', trip.id);

        if (participantsError) {
          console.error('Error fetching trip participants:', participantsError);
          continue;
        }

        const participants: (Participant & { role: string })[] = tripParticipants
          ?.filter(tp => tp.participants !== null)
          .map(tp => ({
            ...(tp.participants as any),
            role: tp.role,
          })) || [];

        // Check if user is involved in this trip
        const isUserInTrip = participants.some(p => 
          p.userId === user.id || p.email === user.email
        );

        if (!isCreator && !isUserInTrip) {
          continue;
        }

        // Add to user's trips
        userTrips.push({
          id: trip.id,
          name: trip.name,
          description: trip.description,
          startDate: trip.start_date,
          endDate: trip.end_date,
          settlementDeadline: trip.settlement_deadline,
          createdBy: trip.created_by,
          createdAt: trip.created_at,
          updatedAt: trip.updated_at,
        });

        // Get expenses for this trip
        const { data: tripExpenses, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .eq('trip_id', trip.id)
          .order('created_at', { ascending: false });

        if (expensesError) {
          console.error('Error fetching expenses:', expensesError);
          continue;
        }

        const expenses: Expense[] = tripExpenses?.map((expense): Expense => ({
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
        })) || [];

        allExpenses[trip.id] = expenses;
        allParticipants[trip.id] = participants;
      }

      // Calculate detailed balances
      const detailedBalances = calculateDetailedBalances(
        userTrips,
        allExpenses,
        allParticipants,
        user.id
      );

      console.log('Calculated detailed balances:', detailedBalances);
      return detailedBalances;
    },
    enabled: !!user,
  });

  return {
    detailedBalances,
    balancesLoading,
    balancesError,
  };
};
