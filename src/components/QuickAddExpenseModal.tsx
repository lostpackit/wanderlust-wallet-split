import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Receipt, Loader2 } from "lucide-react";
import { Trip, Expense, ParticipantWithShares } from '@/types/trip';
import AddExpenseModal from './AddExpenseModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useExpenses } from '@/hooks/useExpenses';

interface QuickAddExpenseModalProps {
  activeTrips: Trip[];
}

const QuickAddExpenseModal = ({ activeTrips }: QuickAddExpenseModalProps) => {
  const [open, setOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);

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
  const { addExpense, isAddingExpense } = useExpenses(selectedTripId);

  const handleTripSelect = (tripId: string) => {
    setSelectedTripId(tripId);
    setShowExpenseForm(true);
  };

  const handleAddExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    addExpense(expense);
    // Reset and close
    setSelectedTripId('');
    setShowExpenseForm(false);
    setOpen(false);
  };

  const handleClose = () => {
    setSelectedTripId('');
    setShowExpenseForm(false);
    setOpen(false);
  };

  if (activeTrips.length === 0) {
    return null; // Don't show button if no active trips
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        handleClose();
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Quick Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Quick Add Expense
          </DialogTitle>
          <DialogDescription>
            {!showExpenseForm 
              ? "Select a trip to add the expense to"
              : `Adding expense to ${selectedTrip?.name}`
            }
          </DialogDescription>
        </DialogHeader>

        {!showExpenseForm ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="trip-select">Select Trip</Label>
              <Select value={selectedTripId} onValueChange={handleTripSelect}>
                <SelectTrigger>
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
            </div>
          </div>
        ) : participantsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading participants...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowExpenseForm(false);
                setSelectedTripId('');
              }}
            >
              ← Change Trip
            </Button>
            
            {/* Embed the expense form */}
            <AddExpenseModal
              participants={participants}
              onAddExpense={handleAddExpense}
              isLoading={isAddingExpense}
              tripId={selectedTripId}
              baseCurrency={selectedTrip?.baseCurrency}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddExpenseModal;
