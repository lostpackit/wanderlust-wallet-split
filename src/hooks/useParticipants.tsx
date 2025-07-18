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
          shares,
          additional_amount,
          participants!fk_trip_participants_participant (
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
          shares: tp.shares,
          additional_amount: tp.additional_amount,
        })) as (Participant & { role: string; shares: number; additional_amount: number; user_id?: string })[];
    },
    enabled: !!tripId && !!user,
  });

  const addParticipantMutation = useMutation({
    mutationFn: async ({ name, email, userId, shares = 1 }: { name: string; email: string; userId?: string; shares?: number }) => {
      if (!tripId) {
        throw new Error('No trip selected');
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Adding participant:', { name, email, userId, shares });

      // If no userId is provided, try to find an existing user with this email
      let resolvedUserId = userId;
      if (!resolvedUserId) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        
        if (existingProfile) {
          resolvedUserId = existingProfile.id;
          console.log('Found existing user for email:', email, 'with ID:', resolvedUserId);
        }
      }

      // First, create or get the participant
      const { data: existingParticipant, error: existingError } = await supabase
        .from('participants')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      let participantId: string;

      if (existingParticipant) {
        console.log('Using existing participant:', existingParticipant.id);
        participantId = existingParticipant.id;
        
        // Update the participant record with user_id if resolved and not already set
        if (resolvedUserId && !existingParticipant.user_id) {
          const { error: updateError } = await supabase
            .from('participants')
            .update({ user_id: resolvedUserId })
            .eq('id', existingParticipant.id);
          
          if (updateError) {
            console.error('Error updating participant user_id:', updateError);
          }
        }
      } else {
        console.log('Creating new participant');
        const { data: newParticipant, error: participantError } = await supabase
          .from('participants')
          .insert([{ 
            name, 
            email,
            user_id: resolvedUserId || null
          }])
          .select()
          .single();

        if (participantError) {
          throw participantError;
        }
        participantId = newParticipant.id;
      }

      // Check if participant is already in the trip
      const { data: existingTripParticipant, error: tripPartError } = await supabase
        .from('trip_participants')
        .select('*')
        .eq('trip_id', tripId)
        .eq('participant_id', participantId)
        .maybeSingle();

      if (tripPartError) {
        throw tripPartError;
      }

      if (existingTripParticipant) {
        throw new Error('Participant is already in this trip');
      }

      // Add participant to trip with shares
      const { data, error } = await supabase
        .from('trip_participants')
        .insert([{
          trip_id: tripId,
          participant_id: participantId,
          role: 'participant',
          shares: shares
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // If the participant has a user_id, create a notification
      if (resolvedUserId) {
        console.log('Creating notification for user:', resolvedUserId);
        
        // Get trip name for notification
        const { data: tripData } = await supabase
          .from('trips')
          .select('name')
          .eq('id', tripId)
          .single();

        const tripName = tripData?.name || 'a trip';

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert([{
            user_id: resolvedUserId,
            title: 'Added to Trip',
            message: `You've been added to "${tripName}" by ${user.email}`,
            data: {
              trip_id: tripId,
              trip_name: tripName,
              added_by: user.email
            }
          }]);

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
          // Don't throw here as the main operation succeeded
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', tripId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast({
        title: "Participant added!",
        description: "The participant has been added to the trip.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add participant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateParticipantSharesMutation = useMutation({
    mutationFn: async ({ participantId, shares }: { participantId: string; shares: number }) => {
      if (!tripId) throw new Error('No trip selected');

      const { error } = await supabase
        .from('trip_participants')
        .update({ shares })
        .eq('trip_id', tripId)
        .eq('participant_id', participantId);

      if (error) {
        console.error('Update shares error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', tripId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast({
        title: "Shares updated!",
        description: "The participant's shares have been updated.",
      });
    },
    onError: (error: Error) => {
      console.error('Update shares mutation error:', error);
      toast({
        title: "Failed to update shares",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAdditionalAmountMutation = useMutation({
    mutationFn: async ({ participantId, additionalAmount }: { participantId: string; additionalAmount: number }) => {
      if (!tripId) throw new Error('No trip selected');

      const { error } = await supabase
        .from('trip_participants')
        .update({ additional_amount: additionalAmount })
        .eq('trip_id', tripId)
        .eq('participant_id', participantId);

      if (error) {
        console.error('Update additional amount error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', tripId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast({
        title: "Additional amount updated!",
        description: "The participant's additional amount has been updated.",
      });
    },
    onError: (error: Error) => {
      console.error('Update additional amount mutation error:', error);
      toast({
        title: "Failed to update additional amount",
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
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
    updateParticipantShares: updateParticipantSharesMutation.mutate,
    updateAdditionalAmount: updateAdditionalAmountMutation.mutate,
    removeParticipant: removeParticipantMutation.mutate,
    isAddingParticipant: addParticipantMutation.isPending,
    isUpdatingShares: updateParticipantSharesMutation.isPending,
    isUpdatingAdditionalAmount: updateAdditionalAmountMutation.isPending,
    isRemovingParticipant: removeParticipantMutation.isPending,
  };
};
