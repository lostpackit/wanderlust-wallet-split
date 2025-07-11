
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
      if (!user) throw new Error('User not authenticated');

      console.log('Creating trip with automatic creator participation...');

      // Step 1: Create the trip
      const { data: tripRecord, error: tripError } = await supabase
        .from('trips')
        .insert([{
          name: tripData.name,
          description: tripData.description,
          start_date: tripData.startDate,
          end_date: tripData.endDate,
          settlement_deadline: tripData.settlementDeadline,
          created_by: user.id,
        }])
        .select()
        .single();

      if (tripError) {
        console.error('Error creating trip:', tripError);
        throw tripError;
      }

      console.log('Trip created:', tripRecord.id);

      // Step 2: Create or get participant record for the creator
      let participantRecord;
      
      // First, check if a participant record already exists for this user
      const { data: existingParticipants, error: existingParticipantError } = await supabase
        .from('participants')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (existingParticipantError) {
        console.error('Error checking for existing participant:', existingParticipantError);
        throw existingParticipantError;
      }

      if (existingParticipants && existingParticipants.length > 0) {
        console.log('Using existing participant record:', existingParticipants[0].id);
        participantRecord = existingParticipants[0];
      } else {
        // Create a new participant record for the creator
        const creatorName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Trip Creator';
        
        const { data: newParticipant, error: participantError } = await supabase
          .from('participants')
          .insert([{
            name: creatorName,
            email: user.email!,
            user_id: user.id,
          }])
          .select()
          .single();

        if (participantError) {
          console.error('Error creating participant:', participantError);
          throw participantError;
        }

        console.log('Created new participant record:', newParticipant.id);
        participantRecord = newParticipant;
      }

      // Step 3: Add the creator as a participant to the trip with admin role
      const { error: tripParticipantError } = await supabase
        .from('trip_participants')
        .insert([{
          trip_id: tripRecord.id,
          participant_id: participantRecord.id,
          role: 'admin', // Trip creator gets admin role
        }]);

      if (tripParticipantError) {
        console.error('Error adding creator as trip participant:', tripParticipantError);
        throw tripParticipantError;
      }

      console.log('Creator added as trip participant with admin role');

      // Transform the returned trip data to match our Trip interface
      return {
        id: tripRecord.id,
        name: tripRecord.name,
        description: tripRecord.description,
        startDate: tripRecord.start_date,
        endDate: tripRecord.end_date,
        settlementDeadline: tripRecord.settlement_deadline,
        createdBy: tripRecord.created_by,
        createdAt: tripRecord.created_at,
        updatedAt: tripRecord.updated_at,
      };
    },
    onSuccess: () => {
      // Invalidate multiple queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      
      toast({
        title: "Trip created!",
        description: "Your new trip has been created and you've been added as an admin.",
      });
    },
    onError: (error) => {
      console.error('Trip creation failed:', error);
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
      if (!tripId || !user) return [];
      
      // First check if this trip exists and if user has access
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) {
        console.error('Error fetching trip:', tripError);
        throw tripError;
      }

      // Get trip participants
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

      if (error) {
        console.error('Error fetching participants:', error);
        throw error;
      }

      const participants = data
        .filter(tp => tp.participants !== null)
        .map(tp => ({
          ...((tp.participants as any) || {}),
          role: tp.role,
        }));

      // If no participants found but user is creator, return basic trip info
      if (participants.length === 0 && tripData.created_by === user.id) {
        console.log('No participants found, but user is creator. Trip may need participant setup.');
        return [{
          id: 'temp-creator',
          name: user.email?.split('@')[0] || 'Trip Creator',
          email: user.email || '',
          role: 'admin',
          user_id: user.id,
        }];
      }

      return participants;
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
