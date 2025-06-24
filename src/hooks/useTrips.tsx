
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
      return data;
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
      return data;
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
      return data.map(tp => ({
        ...tp.participants,
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
      return data;
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
