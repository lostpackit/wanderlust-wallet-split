import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt } from "lucide-react";
import { ParticipantWithShares, Expense } from '@/types/trip';
import ExpenseForm from './ExpenseForm';

interface EditExpenseModalProps {
  expense: Expense;
  participants: ParticipantWithShares[];
  onUpdateExpense: (expenseId: string, expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseCurrency?: string;
}

const EditExpenseModal = ({ 
  expense, 
  participants, 
  onUpdateExpense, 
  isLoading, 
  open, 
  onOpenChange,
  baseCurrency = 'USD' 
}: EditExpenseModalProps) => {
  const handleSubmit = (updatedExpense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    onUpdateExpense(expense.id, updatedExpense);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Edit Expense
          </DialogTitle>
          <DialogDescription>
            Update the expense details below
          </DialogDescription>
        </DialogHeader>
        
        <ExpenseForm
          participants={participants}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
          tripId={expense.tripId}
          baseCurrency={baseCurrency}
          initialValues={{
            description: expense.description,
            amount: expense.originalAmount?.toString() || expense.amount.toString(),
            paidBy: expense.paidBy,
            splitBetween: expense.splitBetween,
            transactionShares: expense.transactionShares || {},
            category: expense.category,
            date: new Date(expense.date).toISOString().split('T')[0],
            expenseCurrency: expense.originalCurrency || baseCurrency,
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditExpenseModal;
