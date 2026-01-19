import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Receipt } from "lucide-react";
import { ParticipantWithShares, Expense } from '@/types/trip';
import ExpenseForm from './ExpenseForm';

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

  const handleSubmit = (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    onAddExpense(expense);
    setOpen(false);
  };

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
