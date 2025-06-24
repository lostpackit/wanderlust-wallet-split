import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Trip, Participant, Expense } from '@/types/trip';
import { useToast } from '@/hooks/use-toast';

export const useTrips = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: trips = [],
    isLoading: tripsLoading,
    error: tripsError
  } = useQuery({
    queryKey: ['trips', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our Trip interface
      return data.map((trip): Trip => ({
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
    },
    enabled: !!user,
  });

  const createTripMutation = useMutation({
    mutationFn: async (tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      const { data, error } = await supabase
        .from('trips')
        .insert([{
          ...tripData,
          start_date: tripData.startDate,
          end_date: tripData.endDate,
          settlement_deadline: tripData.settlementDeadline,
          created_by: user!.id,
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Transform the returned data to match our Trip interface
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        startDate: data.start_date,
        endDate: data.end_date,
        settlementDeadline: data.settlement_deadline,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast({
        title: "Trip created!",
        description: "Your new trip has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create trip",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    trips,
    tripsLoading,
    tripsError,
    createTrip: createTripMutation.mutate,
    isCreatingTrip: createTripMutation.isPending,
  };
};

// Keep the existing useTripData hook for compatibility
export const useTripData = (tripId: string | null) => {
  const { user } = useAuth();

  const {
    data: participants = [],
    isLoading: participantsLoading,
  } = useQuery({
    queryKey: ['participants', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await supabase
        .from('trip_participants')
        .select(`
          participant_id,
          role,
          participants (
            id,
            name,
            email,
            avatar,
            user_id
          )
        `)
        .eq('trip_id', tripId);

      if (error) throw error;
      return data
        .filter(tp => tp.participants !== null)
        .map(tp => ({
          ...(tp.participants as any),
          role: tp.role,
        }));
    },
    enabled: !!tripId && !!user,
  });

  const {
    data: expenses = [],
    isLoading: expensesLoading,
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
      
      // Transform the data to match our Expense interface
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

  return {
    participants,
    expenses,
    participantsLoading,
    expensesLoading,
  };
};
