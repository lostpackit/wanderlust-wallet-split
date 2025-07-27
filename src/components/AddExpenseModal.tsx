
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Receipt, Loader2 } from "lucide-react";
import { ParticipantWithShares, Expense } from '@/types/trip';
import ReceiptScanner from './ReceiptScanner';

interface AddExpenseModalProps {
  participants: ParticipantWithShares[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  isLoading: boolean;
  tripId: string;
  baseCurrency?: string;
}

const categories = [
  'Food & Dining',
  'Transportation',
  'Accommodation',
  'Entertainment',
  'Shopping',
  'Other'
];

const AddExpenseModal = ({ participants, onAddExpense, isLoading, tripId, baseCurrency = 'USD' }: AddExpenseModalProps) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitBetween, setSplitBetween] = useState<string[]>([]);
  const [transactionShares, setTransactionShares] = useState<{ [participantId: string]: number }>({});
  const [category, setCategory] = useState('Other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [originalCurrency, setOriginalCurrency] = useState<string | undefined>();
  const [originalAmount, setOriginalAmount] = useState<number | undefined>();
  const [exchangeRate, setExchangeRate] = useState<number | undefined>();
  const [receiptData, setReceiptData] = useState<any>();
  const [expenseSource, setExpenseSource] = useState<'manual' | 'scanned_receipt'>('manual');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('AddExpenseModal - handleSubmit called');
    console.log('Form validation:', {
      description: description.trim(),
      amount,
      paidBy,
      splitBetween: splitBetween.length,
      hasOnAddExpense: !!onAddExpense
    });
    
    if (description.trim() && amount && paidBy && splitBetween.length > 0) {
      console.log('AddExpenseModal - submitting expense data:', {
        tripId,
        description: description.trim(),
        amount: parseFloat(amount),
        paidBy,
        splitBetween,
        transactionShares,
        category,
        date: new Date(date).toISOString(),
        originalCurrency,
        originalAmount,
        exchangeRate,
        receiptData,
        expenseSource,
      });
      
      onAddExpense({
        tripId,
        description: description.trim(),
        amount: parseFloat(amount),
        paidBy,
        splitBetween,
        transactionShares,
        category,
        date: new Date(date).toISOString(),
        originalCurrency,
        originalAmount,
        exchangeRate,
        receiptData,
        expenseSource,
      });
      resetForm();
      setOpen(false);
    } else {
      console.log('AddExpenseModal - form validation failed');
    }
  };

  const handleReceiptScan = (scanResult: any) => {
    setDescription(scanResult.description);
    setAmount(scanResult.amount.toString());
    setCategory(scanResult.category);
    setDate(scanResult.date);
    setOriginalCurrency(scanResult.originalCurrency);
    setOriginalAmount(scanResult.originalAmount);
    setExchangeRate(scanResult.exchangeRate);
    setReceiptData(scanResult.receiptData);
    setExpenseSource('scanned_receipt');
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setPaidBy('');
    setSplitBetween([]);
    setTransactionShares({});
    setCategory('Other');
    setDate(new Date().toISOString().split('T')[0]);
    setOriginalCurrency(undefined);
    setOriginalAmount(undefined);
    setExchangeRate(undefined);
    setReceiptData(undefined);
    setExpenseSource('manual');
  };

  const handleSplitChange = (participantId: string, checked: boolean) => {
    if (checked) {
      setSplitBetween([...splitBetween, participantId]);
      // Set default shares based on participant's trip shares
      const participant = participants.find(p => p.id === participantId);
      const participantShares = participant?.shares || 1;
      setTransactionShares(prev => ({
        ...prev,
        [participantId]: participantShares
      }));
    } else {
      setSplitBetween(splitBetween.filter(id => id !== participantId));
      setTransactionShares(prev => {
        const newShares = { ...prev };
        delete newShares[participantId];
        return newShares;
      });
    }
  };

  const handleSharesChange = (participantId: string, shares: number) => {
    setTransactionShares(prev => ({
      ...prev,
      [participantId]: shares
    }));
  };

  const selectAllParticipants = () => {
    const allParticipantIds = participants.map(p => p.id);
    setSplitBetween(allParticipantIds);
    // Set default shares for all participants
    const allShares = participants.reduce((acc, p) => {
      acc[p.id] = p.shares || 1;
      return acc;
    }, {} as { [key: string]: number });
    setTransactionShares(allShares);
  };

  const clearAllParticipants = () => {
    setSplitBetween([]);
    setTransactionShares({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Add Expense
          </DialogTitle>
          <DialogDescription>
            Record a new expense for this trip and split it among participants.
          </DialogDescription>
        </DialogHeader>
        
        {/* Receipt Scanner */}
        <div className="mb-4">
          <ReceiptScanner 
            baseCurrency={baseCurrency}
            onScanComplete={handleReceiptScan}
            disabled={isLoading}
          />
        </div>

        <Separator />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense-description" className="flex items-center gap-1">
                Description
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="expense-description"
                type="text"
                placeholder="What was this expense for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${!description.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                required
              />
              {!description.trim() && (
                <p className="text-sm text-red-500">Description is required</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount" className="flex items-center gap-1">
                Amount
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${!amount ? 'border-red-300 focus:border-red-500' : ''}`}
                required
              />
              {!amount && (
                <p className="text-sm text-red-500">Amount is required</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paid-by" className="flex items-center gap-1">
                Paid By
                <span className="text-red-500">*</span>
              </Label>
              <Select value={paidBy} onValueChange={setPaidBy} required>
                <SelectTrigger className={`${!paidBy ? 'border-red-300' : ''}`}>
                  <SelectValue placeholder="Who paid for this?" />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((participant) => (
                    <SelectItem key={participant.id} value={participant.id}>
                      {participant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!paidBy && (
                <p className="text-sm text-red-500">Please select who paid for this expense</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-date">Date</Label>
            <Input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  Split Between
                  <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-slate-600">
                  Defaults to each participant's trip shares. You can adjust individual shares below.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllParticipants}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearAllParticipants}
                >
                  Clear All
                </Button>
              </div>
            </div>
            <div className={`space-y-2 max-h-48 overflow-y-auto border rounded-md p-3 ${splitBetween.length === 0 ? 'border-red-300' : ''}`}>
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between gap-3 p-2 border rounded-md">
                  <div className="flex items-center space-x-2 flex-1">
                    <Checkbox
                      id={`split-${participant.id}`}
                      checked={splitBetween.includes(participant.id)}
                      onCheckedChange={(checked) => 
                        handleSplitChange(participant.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={`split-${participant.id}`} className="text-sm flex-1">
                      {participant.name}
                    </Label>
                  </div>
                  {splitBetween.includes(participant.id) && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Shares:</Label>
                      <Input
                        type="number"
                        min="1"
                        className="w-16 h-8 text-sm"
                        value={transactionShares[participant.id] || 1}
                        onChange={(e) => handleSharesChange(participant.id, parseInt(e.target.value) || 1)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            </div>
            {splitBetween.length === 0 && (
              <p className="text-sm text-red-500">Please select at least one person to split this expense with</p>
            )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || splitBetween.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Expense'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseModal;
