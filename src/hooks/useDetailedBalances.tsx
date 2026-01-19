
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
      if (!user) {
        console.log('No user found, returning null');
        return null;
      }

      console.log('Fetching detailed balances for user:', user.id);

      // Get all trips for the user (created by them or participating in)
      const { data: allTrips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (tripsError) {
        console.error('Error fetching trips:', tripsError);
        throw tripsError;
      }

      console.log('All trips from database:', allTrips?.length || 0);

      const allExpenses: { [tripId: string]: Expense[] } = {};
      const allParticipants: { [tripId: string]: (Participant & { role: string; shares: number })[] } = {};
      const userTrips: Trip[] = [];

      // Process each trip to see if user is involved
      for (const trip of allTrips || []) {
        console.log(`Processing trip: ${trip.name} (${trip.id})`);
        
        const isCreator = trip.created_by === user.id;
        console.log(`User is creator of ${trip.name}:`, isCreator);
        
        // Get participants for this trip with shares
        const { data: tripParticipants, error: participantsError } = await supabase
          .from('trip_participants')
          .select(`
            participant_id,
            role,
            shares,
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

        console.log(`Trip participants for ${trip.name}:`, tripParticipants);

        const participants: (Participant & { role: string; shares: number })[] = tripParticipants
          ?.filter(tp => tp.participants !== null)
          .map(tp => ({
            id: (tp.participants as any).id,
            name: (tp.participants as any).name,
            email: (tp.participants as any).email,
            avatar: (tp.participants as any).avatar,
            userId: (tp.participants as any).user_id,
            role: tp.role,
            shares: tp.shares || 1,
          })) || [];

        console.log(`Processed participants for ${trip.name}:`, participants);

        // Check if user is involved in this trip (creator or participant)
        // For creators, they might not have a participant record, so we check both ways
        const userParticipant = participants.find(p => 
          p.userId === user.id || p.email === user.email
        );
        
        const isUserInTrip = isCreator || !!userParticipant;
        console.log(`User is in trip ${trip.name}:`, isUserInTrip);

        if (!isUserInTrip) {
          console.log(`Skipping trip ${trip.name} - user not involved`);
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

        console.log(`Expenses for trip ${trip.name}:`, tripExpenses?.length || 0);

        const expenses: Expense[] = tripExpenses?.map((expense): Expense => ({
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
          createdAt: expense.created_at,
          updatedAt: expense.updated_at,
        })) || [];

        allExpenses[trip.id] = expenses;
        allParticipants[trip.id] = participants;
      }

      console.log('User trips:', userTrips.length);
      console.log('All expenses keys:', Object.keys(allExpenses));
      console.log('All participants keys:', Object.keys(allParticipants));

      // Calculate detailed balances
      const detailedBalances = calculateDetailedBalances(
        userTrips,
        allExpenses,
        allParticipants,
        user.id,
        user.email // Pass user email as well for better matching
      );

      console.log('Final calculated detailed balances:', detailedBalances);
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
