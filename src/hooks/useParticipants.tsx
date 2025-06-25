import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Participant } from '@/types/trip';
import { useToast } from '@/hooks/use-toast';

export const useParticipants = (tripId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: participants = [],
    isLoading: participantsLoading,
    error: participantsError
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

      if (error) {
        console.error('Error fetching participants:', error);
        throw error;
      }
      
      return data
        .filter(tp => tp.participants !== null)
        .map(tp => ({
          ...(tp.participants as any),
          role: tp.role,
        })) as (Participant & { role: string })[];
    },
    enabled: !!tripId && !!user,
  });

  const addParticipantMutation = useMutation({
    mutationFn: async ({ name, email }: { name: string; email: string }) => {
      console.log('🔍 DEBUG: Starting addParticipant mutation');
      console.log('🔍 DEBUG: tripId:', tripId);
      console.log('🔍 DEBUG: user:', user);
      console.log('🔍 DEBUG: auth.uid() should be:', user?.id);
      console.log('🔍 DEBUG: Input data:', { name, email });

      if (!tripId) {
        console.error('🔍 DEBUG: No trip selected');
        throw new Error('No trip selected');
      }

      if (!user) {
        console.error('🔍 DEBUG: No user authenticated');
        throw new Error('User not authenticated');
      }

      // First, create or get the participant
      console.log('🔍 DEBUG: Checking for existing participant with email:', email);
      const { data: existingParticipant, error: existingError } = await supabase
        .from('participants')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (existingError) {
        console.error('🔍 DEBUG: Error checking existing participant:', existingError);
        throw existingError;
      }

      console.log('🔍 DEBUG: Existing participant found:', existingParticipant);

      let participantId: string;

      if (existingParticipant) {
        participantId = existingParticipant.id;
        console.log('🔍 DEBUG: Using existing participant ID:', participantId);
      } else {
        console.log('🔍 DEBUG: Creating new participant...');
        console.log('🔍 DEBUG: Insert data:', { name, email });
        
        // Test the current user's authentication status
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
        console.log('🔍 DEBUG: Current authenticated user:', currentUser);
        console.log('🔍 DEBUG: Auth error:', authError);

        const { data: newParticipant, error: participantError } = await supabase
          .from('participants')
          .insert([{ name, email }])
          .select()
          .single();

        console.log('🔍 DEBUG: Participant creation result:', { newParticipant, participantError });

        if (participantError) {
          console.error('🔍 DEBUG: Participant creation error details:', {
            error: participantError,
            code: participantError.code,
            message: participantError.message,
            details: participantError.details,
            hint: participantError.hint
          });
          throw participantError;
        }
        participantId = newParticipant.id;
        console.log('🔍 DEBUG: Created new participant with ID:', participantId);
      }

      // Check if participant is already in the trip
      console.log('🔍 DEBUG: Checking if participant is already in trip...');
      const { data: existingTripParticipant, error: tripPartError } = await supabase
        .from('trip_participants')
        .select('*')
        .eq('trip_id', tripId)
        .eq('participant_id', participantId)
        .maybeSingle();

      if (tripPartError) {
        console.error('🔍 DEBUG: Error checking trip participant:', tripPartError);
        throw tripPartError;
      }

      console.log('🔍 DEBUG: Existing trip participant:', existingTripParticipant);

      if (existingTripParticipant) {
        console.log('🔍 DEBUG: Participant already in trip');
        throw new Error('Participant is already in this trip');
      }

      // Add participant to trip
      console.log('🔍 DEBUG: Adding participant to trip...');
      const tripParticipantData = {
        trip_id: tripId,
        participant_id: participantId,
        role: 'participant'
      };
      console.log('🔍 DEBUG: Trip participant insert data:', tripParticipantData);

      const { data, error } = await supabase
        .from('trip_participants')
        .insert([tripParticipantData])
        .select()
        .single();

      console.log('🔍 DEBUG: Trip participant creation result:', { data, error });

      if (error) {
        console.error('🔍 DEBUG: Trip participant creation error:', error);
        throw error;
      }

      console.log('🔍 DEBUG: Successfully created trip participant:', data);
      return data;
    },
    onSuccess: () => {
      console.log('🔍 DEBUG: Mutation successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['participants', tripId] });
      toast({
        title: "Participant added!",
        description: "The participant has been added to the trip.",
      });
    },
    onError: (error: Error) => {
      console.error('🔍 DEBUG: Mutation error:', error);
      console.error('🔍 DEBUG: Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      toast({
        title: "Failed to add participant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: string) => {
      if (!tripId) throw new Error('No trip selected');

      const { error } = await supabase
        .from('trip_participants')
        .delete()
        .eq('trip_id', tripId)
        .eq('participant_id', participantId);

      if (error) {
        console.error('Remove participant error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', tripId] });
      toast({
        title: "Participant removed",
        description: "The participant has been removed from the trip.",
      });
    },
    onError: (error: Error) => {
      console.error('Remove participant mutation error:', error);
      toast({
        title: "Failed to remove participant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    participants,
    participantsLoading,
    participantsError,
    addParticipant: addParticipantMutation.mutate,
    removeParticipant: removeParticipantMutation.mutate,
    isAddingParticipant: addParticipantMutation.isPending,
    isRemovingParticipant: removeParticipantMutation.isPending,
  };
};
