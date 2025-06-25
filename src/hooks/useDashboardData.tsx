
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
        // Check if user is the creator or a participant
        const { data: userParticipant, error: participantError } = await supabase
          .from('trip_participants')
          .select('participant_id, role')
          .eq('trip_id', trip.id);

        if (participantError) {
          console.error('Error fetching trip participants:', participantError);
          continue;
        }

        // Get participant details separately to avoid foreign key issues
        let isUserInTrip = false;
        let currentUserParticipantId = '';

        if (userParticipant && userParticipant.length > 0) {
          // Check each participant to see if any match the current user
          for (const tp of userParticipant) {
            const { data: participantData, error: participantDataError } = await supabase
              .from('participants')
              .select('*')
              .eq('id', tp.participant_id)
              .single();

            if (!participantDataError && participantData) {
              if (participantData.user_id === user.id || participantData.email === user.email) {
                isUserInTrip = true;
                currentUserParticipantId = participantData.id;
                break;
              }
            }
          }
        }

        const isCreator = trip.created_by === user.id;

        if (!isCreator && !isUserInTrip) {
          continue; // Skip trips where user is not involved
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

        // Get all participants for this trip
        const { data: allTripParticipants, error: allParticipantsError } = await supabase
          .from('trip_participants')
          .select('participant_id, role')
          .eq('trip_id', trip.id);

        if (allParticipantsError) continue;

        const participants: (Participant & { role: string })[] = [];
        
        // Get participant details for each trip participant
        for (const tp of allTripParticipants || []) {
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
          }
        }

        // Get expenses for this trip
        const { data: tripExpenses, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .eq('trip_id', trip.id)
          .order('created_at', { ascending: false });

        if (expensesError) continue;

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

        // Find the current user's participant record in this trip
        const currentUserParticipant = participants.find(p => 
          p.userId === user.id || p.email === user.email
        );

        if (currentUserParticipant && expenses.length > 0) {
          console.log(`Calculating balances for trip: ${trip.name}`);
          
          // Calculate balances for this trip
          const balances: { [participantId: string]: number } = {};
          
          // Initialize balances
          participants.forEach(p => {
            balances[p.id] = 0;
          });

          // Calculate balances
          expenses.forEach(expense => {
            const splitAmount = expense.amount / expense.splitBetween.length;
            
            // The person who paid gets credited
            balances[expense.paidBy] += expense.amount;
            
            // Everyone who should split it gets debited
            expense.splitBetween.forEach(participantId => {
              balances[participantId] -= splitAmount;
            });
          });

          const currentUserBalance = balances[currentUserParticipant.id] || 0;
          
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
