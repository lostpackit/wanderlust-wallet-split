import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowRight } from "lucide-react";
import { ParticipantWithShares, Expense } from '@/types/trip';
import ReceiptScanner from './ReceiptScanner';
import { supabase } from "@/integrations/supabase/client";

interface ExpenseFormProps {
  participants: ParticipantWithShares[];
  onSubmit: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel?: () => void;
  isLoading: boolean;
  tripId: string;
  baseCurrency?: string;
  initialValues?: {
    description?: string;
    amount?: string;
    paidBy?: string;
    splitBetween?: string[];
    transactionShares?: { [participantId: string]: number };
    category?: string;
    date?: string;
    expenseCurrency?: string;
  };
}

const categories = [
  'Food & Dining',
  'Transportation',
  'Accommodation',
  'Entertainment',
  'Shopping',
  'Other'
];

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' }
];

const ExpenseForm = ({ participants, onSubmit, onCancel, isLoading, tripId, baseCurrency = 'USD', initialValues }: ExpenseFormProps) => {
  const [description, setDescription] = useState(initialValues?.description || '');
  const [amount, setAmount] = useState(initialValues?.amount || '');
  const [paidBy, setPaidBy] = useState(initialValues?.paidBy || '');
  const [splitBetween, setSplitBetween] = useState<string[]>(initialValues?.splitBetween || []);
  const [transactionShares, setTransactionShares] = useState<{ [participantId: string]: number }>(initialValues?.transactionShares || {});
  const [category, setCategory] = useState(initialValues?.category || 'Other');
  const [date, setDate] = useState(initialValues?.date || new Date().toISOString().split('T')[0]);
  const [expenseCurrency, setExpenseCurrency] = useState(initialValues?.expenseCurrency || baseCurrency);
  const [originalCurrency, setOriginalCurrency] = useState<string | undefined>();
  const [originalAmount, setOriginalAmount] = useState<number | undefined>();
  const [exchangeRate, setExchangeRate] = useState<number | undefined>();
  const [receiptData, setReceiptData] = useState<any>();
  const [expenseSource, setExpenseSource] = useState<'manual' | 'scanned_receipt'>('manual');
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);
  const [convertedAmount, setConvertedAmount] = useState<number | undefined>();

  // Convert currency when expense currency changes or amount changes
  useEffect(() => {
    const convertCurrency = async () => {
      if (!amount || !expenseCurrency || expenseCurrency === baseCurrency) {
        setConvertedAmount(undefined);
        setOriginalCurrency(undefined);
        setOriginalAmount(undefined);
        setExchangeRate(undefined);
        return;
      }

      setIsConvertingCurrency(true);
      try {
        const { data, error } = await supabase.functions.invoke('convert-currency', {
          body: {
            fromCurrency: expenseCurrency,
            toCurrency: baseCurrency,
            amount: parseFloat(amount),
            date: date
          }
        });

        if (error) {
          console.error('Currency conversion error:', error);
          setConvertedAmount(parseFloat(amount));
          setExchangeRate(1);
        } else {
          setConvertedAmount(data.convertedAmount);
          setOriginalCurrency(data.fromCurrency);
          setOriginalAmount(data.originalAmount);
          setExchangeRate(data.exchangeRate);
        }
      } catch (error) {
        console.error('Currency conversion failed:', error);
        setConvertedAmount(parseFloat(amount));
        setExchangeRate(1);
      } finally {
        setIsConvertingCurrency(false);
      }
    };

    convertCurrency();
  }, [expenseCurrency, baseCurrency, amount, date]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (description.trim() && amount && paidBy && splitBetween.length > 0) {
      let finalAmount = parseFloat(amount);
      let finalOriginalCurrency = originalCurrency;
      let finalOriginalAmount = originalAmount;
      let finalExchangeRate = exchangeRate;
      
      if (expenseCurrency !== baseCurrency && convertedAmount !== undefined) {
        finalAmount = convertedAmount;
        finalOriginalCurrency = expenseCurrency;
        finalOriginalAmount = parseFloat(amount);
        finalExchangeRate = exchangeRate;
      }

      onSubmit({
        tripId,
        description: description.trim(),
        amount: finalAmount,
        paidBy,
        splitBetween,
        transactionShares,
        category,
        date: new Date(date).toISOString(),
        originalCurrency: finalOriginalCurrency,
        originalAmount: finalOriginalAmount,
        exchangeRate: finalExchangeRate,
        receiptData,
        expenseSource,
      });
    }
  };

  const handleReceiptScan = (scanResult: any) => {
    setDescription(scanResult.description);
    setAmount(scanResult.amount.toString());
    setCategory(scanResult.category);
    setDate(scanResult.date);
    setExpenseCurrency(scanResult.originalCurrency || baseCurrency);
    setOriginalCurrency(scanResult.originalCurrency);
    setOriginalAmount(scanResult.originalAmount);
    setExchangeRate(scanResult.exchangeRate);
    setReceiptData(scanResult.receiptData);
    setExpenseSource('scanned_receipt');
  };

  const handleSplitChange = (participantId: string, checked: boolean) => {
    if (checked) {
      setSplitBetween([...splitBetween, participantId]);
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
    <>
      {/* Receipt Scanner */}
      <div className="mb-4">
        <ReceiptScanner 
          baseCurrency={baseCurrency}
          onScanComplete={handleReceiptScan}
          disabled={isLoading}
        />
      </div>

      <Separator />

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
            <div className="flex gap-2">
              <Select value={expenseCurrency} onValueChange={setExpenseCurrency}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`flex-1 ${!amount ? 'border-red-300 focus:border-red-500' : ''}`}
                required
              />
            </div>
            {!amount && (
              <p className="text-sm text-red-500">Amount is required</p>
            )}
            {expenseCurrency !== baseCurrency && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <span>Will be converted to {baseCurrency}</span>
                  {isConvertingCurrency && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>
                {convertedAmount !== undefined && !isConvertingCurrency && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-blue-700">
                    <span>{amount} {expenseCurrency}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-medium">{convertedAmount.toFixed(2)} {baseCurrency}</span>
                    {exchangeRate && (
                      <span className="text-xs opacity-75">
                        (Rate: {exchangeRate.toFixed(4)})
                      </span>
                    )}
                  </div>
                )}
              </div>
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

        <div className="flex gap-2 justify-end pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
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
    </>
  );
};

export default ExpenseForm;
