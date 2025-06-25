
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Trip, Participant, Expense, UserDashboardData } from '@/types/trip';

export const useDashboardData = () => {
  const { user } = useAuth();

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError
  } = useQuery({
    queryKey: ['dashboard-data', user?.id],
    queryFn: async () => {
      if (!user) return null;

      console.log('Fetching dashboard data for user:', user.id);

      // Get all trips for the user (either created by them or they're a participant)
      const { data: allTrips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;

      console.log('All trips found:', allTrips?.length || 0);

      let totalOwed = 0;
      let totalOwing = 0;
      const allRecentExpenses: (Expense & { tripName: string })[] = [];
      const userTrips: Trip[] = [];

      // For each trip, check if user is involved and calculate balances
      for (const trip of allTrips || []) {
        let isUserInTrip = false;
        let currentUserParticipantId = '';

        // Check if user is the creator
        const isCreator = trip.created_by === user.id;
        
        // Get all participants for this trip
        const { data: tripParticipants, error: participantsError } = await supabase
          .from('trip_participants')
          .select('participant_id, role')
          .eq('trip_id', trip.id);

        if (participantsError) {
          console.error('Error fetching trip participants:', participantsError);
          continue;
        }

        const participants: (Participant & { role: string })[] = [];
        
        // Check each participant to see if current user is involved
        for (const tp of tripParticipants || []) {
          const { data: participantData, error: participantDataError } = await supabase
            .from('participants')
            .select('*')
            .eq('id', tp.participant_id)
            .single();

          if (!participantDataError && participantData) {
            participants.push({
              id: participantData.id,
              name: participantData.name,
              email: participantData.email,
              avatar: participantData.avatar,
              userId: participantData.user_id,
              role: tp.role,
            });

            // Check if this participant is the current user
            if (participantData.user_id === user.id || participantData.email === user.email) {
              isUserInTrip = true;
              currentUserParticipantId = participantData.id;
            }
          }
        }

        // Skip trips where user is not involved
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

        const expenses: Expense[] = tripExpenses.map((expense): Expense => ({
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

        // Add recent expenses with trip name
        const expensesWithTrip = expenses.slice(0, 3).map(expense => ({
          ...expense,
          tripName: trip.name,
        }));
        allRecentExpenses.push(...expensesWithTrip);

        // Calculate balances for this trip if user is involved and there are expenses
        if ((isCreator || isUserInTrip) && expenses.length > 0) {
          console.log(`Calculating balances for trip: ${trip.name}`);
          console.log(`User participant ID: ${currentUserParticipantId}`);
          console.log(`Is creator: ${isCreator}`);
          console.log(`Number of expenses: ${expenses.length}`);
          console.log(`Number of participants: ${participants.length}`);
          
          // Initialize balances for all participants
          const balances: { [participantId: string]: number } = {};
          participants.forEach(p => {
            balances[p.id] = 0;
          });

          // If user is creator but not a participant, add them to balances
          if (isCreator && !currentUserParticipantId) {
            // Find or create a participant record for the creator
            const { data: creatorParticipant } = await supabase
              .from('participants')
              .select('*')
              .eq('user_id', user.id)
              .single();
            
            if (creatorParticipant) {
              currentUserParticipantId = creatorParticipant.id;
              balances[creatorParticipant.id] = 0;
            }
          }

          // Calculate balances from expenses
          expenses.forEach(expense => {
            const splitAmount = expense.amount / expense.splitBetween.length;
            
            console.log(`Processing expense: ${expense.description}, amount: ${expense.amount}, split: ${splitAmount}`);
            console.log(`Paid by: ${expense.paidBy}, split between: ${expense.splitBetween}`);
            
            // The person who paid gets credited
            if (balances.hasOwnProperty(expense.paidBy)) {
              balances[expense.paidBy] += expense.amount;
            }
            
            // Everyone who should split it gets debited
            expense.splitBetween.forEach(participantId => {
              if (balances.hasOwnProperty(participantId)) {
                balances[participantId] -= splitAmount;
              }
            });
          });

          console.log('Calculated balances:', balances);

          // Get current user's balance
          const currentUserBalance = balances[currentUserParticipantId] || 0;
          
          console.log(`User balance for trip ${trip.name}: ${currentUserBalance}`);
          
          if (currentUserBalance > 0) {
            totalOwed += currentUserBalance;
          } else if (currentUserBalance < 0) {
            totalOwing += Math.abs(currentUserBalance);
          }
        }
      }

      // Sort recent expenses by date and take the most recent 5
      const recentExpenses = allRecentExpenses
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      const dashboardData: UserDashboardData & { recentExpenses: (Expense & { tripName: string })[] } = {
        totalOwed: Math.round(totalOwed * 100) / 100,
        totalOwing: Math.round(totalOwing * 100) / 100,
        activeTrips: userTrips,
        recentExpenses,
      };

      console.log('Final dashboard data:', dashboardData);
      return dashboardData;
    },
    enabled: !!user,
  });

  return {
    dashboardData,
    dashboardLoading,
    dashboardError,
  };
};
