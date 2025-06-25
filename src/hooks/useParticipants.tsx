
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
      
      console.log('Fetching participants for trip:', tripId);
      console.log('Current user:', user?.id);
      
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
      
      console.log('Raw participants data:', data);
      
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
      if (!tripId) throw new Error('No trip selected');

      console.log('Adding participant:', { name, email, tripId });
      console.log('Current authenticated user:', user?.id);

      // First, create or get the participant
      const { data: existingParticipant } = await supabase
        .from('participants')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      console.log('Existing participant check:', existingParticipant);

      let participantId: string;

      if (existingParticipant) {
        participantId = existingParticipant.id;
        console.log('Using existing participant:', participantId);
      } else {
        console.log('Creating new participant with data:', { name, email });
        
        const { data: newParticipant, error: participantError } = await supabase
          .from('participants')
          .insert([{ name, email }])
          .select()
          .single();

        console.log('Participant creation result:', { data: newParticipant, error: participantError });

        if (participantError) {
          console.error('Participant creation error:', participantError);
          throw participantError;
        }
        participantId = newParticipant.id;
      }

      // Check if participant is already in the trip
      const { data: existingTripParticipant } = await supabase
        .from('trip_participants')
        .select('*')
        .eq('trip_id', tripId)
        .eq('participant_id', participantId)
        .maybeSingle();

      console.log('Existing trip participant check:', existingTripParticipant);

      if (existingTripParticipant) {
        throw new Error('Participant is already in this trip');
      }

      // Add participant to trip
      console.log('Adding participant to trip:', { tripId, participantId });
      
      const { data, error } = await supabase
        .from('trip_participants')
        .insert([{
          trip_id: tripId,
          participant_id: participantId,
          role: 'participant'
        }])
        .select()
        .single();

      console.log('Trip participant creation result:', { data, error });

      if (error) {
        console.error('Trip participant creation error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      console.log('Participant added successfully');
      queryClient.invalidateQueries({ queryKey: ['participants', tripId] });
      toast({
        title: "Participant added!",
        description: "The participant has been added to the trip.",
      });
    },
    onError: (error: Error) => {
      console.error('Add participant mutation error:', error);
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

      console.log('Removing participant:', { participantId, tripId });

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
      console.log('Participant removed successfully');
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
