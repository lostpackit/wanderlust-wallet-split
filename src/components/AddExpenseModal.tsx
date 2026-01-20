import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Receipt } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ParticipantWithShares, Expense } from '@/types/trip';
import ExpenseForm from './ExpenseForm';
import { useGuestStatus } from '@/hooks/useGuestStatus';

interface AddExpenseModalProps {
  participants: ParticipantWithShares[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  isLoading: boolean;
  tripId: string;
  baseCurrency?: string;
  trigger?: React.ReactNode;
}

const AddExpenseModal = ({ participants, onAddExpense, isLoading, tripId, baseCurrency = 'USD', trigger }: AddExpenseModalProps) => {
  const [open, setOpen] = useState(false);
  const { isGuest } = useGuestStatus();

  const handleSubmit = (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    onAddExpense(expense);
    setOpen(false);
  };

  // Guest user - show disabled button with tooltip
  if (isGuest) {
    const disabledButton = (
      <Button size="sm" className="gap-2" disabled variant="secondary">
        <Plus className="h-4 w-4" />
        Add Expense
      </Button>
    );

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="cursor-not-allowed">
              {trigger ? (
                <span className="pointer-events-none opacity-50">{trigger}</span>
              ) : (
                disabledButton
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-center">
            <p className="font-medium">Guest accounts cannot add expenses</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sign up for a full account to add and manage expenses.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const defaultTrigger = (
    <Button size="sm" className="gap-2">
      <Plus className="h-4 w-4" />
      Add Expense
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Add Expense
          </DialogTitle>
          <DialogDescription>
            Record a new expense for this trip and split it among participants.
          </DialogDescription>
        </DialogHeader>
        
        <ExpenseForm
          participants={participants}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
          tripId={tripId}
          baseCurrency={baseCurrency}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseModal;
