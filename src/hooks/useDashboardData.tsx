
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

      // Get all trips for the user
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;

      let totalOwed = 0;
      let totalOwing = 0;
      const allRecentExpenses: Expense[] = [];

      // For each trip, calculate the user's balance
      for (const trip of trips) {
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

        if (participantsError) continue; // Skip this trip if we can't get participants

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

        if (expensesError) continue; // Skip this trip if we can't get expenses

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

        // Add recent expenses to the global list
        allRecentExpenses.push(...expenses.slice(0, 3));

        // Find the current user's participant record in this trip
        const currentUserParticipant = participants.find(p => 
          p.userId === user.id || p.email === user.email
        );

        if (currentUserParticipant && expenses.length > 0) {
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
          
          if (currentUserBalance > 0) {
            totalOwed += currentUserBalance;
          } else if (currentUserBalance < 0) {
            totalOwing += Math.abs(currentUserBalance);
          }
        }
      }

      // Transform trips to match our Trip interface
      const transformedTrips: Trip[] = trips.map((trip): Trip => ({
        id: trip.id,
        name: trip.name,
        description: trip.description,
        startDate: trip.start_date,
        endDate: trip.end_date,
        settlementDeadline: trip.settlement_deadline,
        createdBy: trip.created_by,
        createdAt: trip.created_at,
        updatedAt: trip.updated_at,
      }));

      // Sort recent expenses by date and take the most recent 5
      const recentExpenses = allRecentExpenses
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      const dashboardData: UserDashboardData = {
        totalOwed: Math.round(totalOwed * 100) / 100, // Round to 2 decimal places
        totalOwing: Math.round(totalOwing * 100) / 100,
        activeTrips: transformedTrips,
        recentExpenses,
      };

      console.log('Dashboard data calculated:', dashboardData);
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
