
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
          .eq('trip_id', trip.id)
          .or(`participants.user_id.eq.${user.id},participants.email.eq.${user.email}`);

        const isCreator = trip.created_by === user.id;
        const isParticipant = userParticipant && userParticipant.length > 0;

        if (!isCreator && !isParticipant) {
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
        const { data: tripParticipants, error: allParticipantsError } = await supabase
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

        if (allParticipantsError) continue;

        const participants = tripParticipants
          .filter(tp => tp.participants !== null)
          .map(tp => ({
            ...(tp.participants as any),
            role: tp.role,
          })) as (Participant & { role: string })[];

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
