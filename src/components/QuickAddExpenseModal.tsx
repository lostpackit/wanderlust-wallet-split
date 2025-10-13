import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Receipt, Loader2 } from "lucide-react";
import { Trip, Expense, ParticipantWithShares } from '@/types/trip';
import ExpenseForm from './ExpenseForm';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useExpenses } from '@/hooks/useExpenses';

interface QuickAddExpenseModalProps {
  activeTrips: Trip[];
}

const QuickAddExpenseModal = ({ activeTrips }: QuickAddExpenseModalProps) => {
  const [open, setOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>('');

  // Fetch participants for the selected trip
  const { data: participants = [], isLoading: participantsLoading } = useQuery({
    queryKey: ['trip-participants', selectedTripId],
    queryFn: async () => {
      if (!selectedTripId) return [];
      
      const { data, error } = await supabase
        .from('trip_participants')
        .select(`
          id,
          shares,
          additional_amount,
          role,
          participants!trip_participants_participant_id_fkey(
            id,
            name,
            email,
            avatar,
            user_id
          )
        `)
        .eq('trip_id', selectedTripId);

      if (error) throw error;

      return data.map((tp: any) => ({
        id: tp.participants.id,
        name: tp.participants.name,
        email: tp.participants.email,
        avatar: tp.participants.avatar,
        userId: tp.participants.user_id,
        role: tp.role,
        shares: tp.shares,
        additional_amount: tp.additional_amount,
      })) as ParticipantWithShares[];
    },
    enabled: !!selectedTripId,
  });

  const selectedTrip = activeTrips.find(t => t.id === selectedTripId);
  const { addExpense, isAddingExpense } = useExpenses(selectedTripId || activeTrips[0]?.id);

  const handleAddExpense = (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!selectedTripId) return;
    addExpense(expense);
    setSelectedTripId('');
    setOpen(false);
  };

  const handleClose = () => {
    setSelectedTripId('');
    setOpen(false);
  };

  // Set default trip when opening
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !selectedTripId && activeTrips.length > 0) {
      setSelectedTripId(activeTrips[0].id);
    }
    if (!newOpen) {
      handleClose();
    }
  };

  if (activeTrips.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Quick Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Add Expense
          </DialogTitle>
          <DialogDescription>
            Select a trip and add your expense details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trip Selector at the top */}
          <div className="space-y-2 pb-4 border-b">
            <Label htmlFor="trip-select" className="flex items-center gap-1">
              Trip
              <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedTripId} onValueChange={setSelectedTripId}>
              <SelectTrigger className={!selectedTripId ? 'border-red-300' : ''}>
                <SelectValue placeholder="Choose a trip..." />
              </SelectTrigger>
              <SelectContent>
                {activeTrips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedTripId && (
              <p className="text-sm text-red-500">Please select a trip</p>
            )}
          </div>

          {/* Show loading or expense form */}
          {participantsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading participants...</span>
            </div>
          ) : selectedTripId && participants.length > 0 ? (
            <ExpenseForm
              participants={participants}
              onSubmit={handleAddExpense}
              onCancel={handleClose}
              isLoading={isAddingExpense}
              tripId={selectedTripId}
              baseCurrency={selectedTrip?.baseCurrency}
            />
          ) : selectedTripId ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No participants found for this trip.</p>
              <p className="text-sm mt-2">Add participants to the trip first.</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddExpenseModal;
