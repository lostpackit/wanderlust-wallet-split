
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calculator, Coins } from "lucide-react";
import { ParticipantWithShares } from '@/types/trip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReceiptScanner from './ReceiptScanner';

interface AddExpenseModalProps {
  tripId: string;
  participants: ParticipantWithShares[];
  onAddExpense: (expense: any) => void;
  isLoading: boolean;
  baseCurrency?: string;
}

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Accommodation',
  'Entertainment',
  'Shopping',
  'Activities',
  'Other'
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
];

const AddExpenseModal = ({ tripId, participants, onAddExpense, isLoading, baseCurrency = 'USD' }: AddExpenseModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [originalCurrency, setOriginalCurrency] = useState(baseCurrency);
  const [paidBy, setPaidBy] = useState('');
  const [category, setCategory] = useState('');
  const [splitBetween, setSplitBetween] = useState<string[]>([]);
  const [customShares, setCustomShares] = useState<{ [key: string]: number }>({});
  const [useCustomShares, setUseCustomShares] = useState(false);
  const [conversionData, setConversionData] = useState<{
    convertedAmount: number;
    exchangeRate: number;
  } | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const { toast } = useToast();

  const handleConvertCurrency = async () => {
    if (!amount || !originalCurrency || originalCurrency === baseCurrency) {
      setConversionData(null);
      return;
    }

    setIsConverting(true);
    try {
      const { data, error } = await supabase.functions.invoke('convert-currency', {
        body: {
          fromCurrency: originalCurrency,
          toCurrency: baseCurrency,
          amount: parseFloat(amount),
          date: new Date().toISOString().split('T')[0]
        }
      });

      if (error) throw error;

      setConversionData({
        convertedAmount: data.convertedAmount,
        exchangeRate: data.exchangeRate
      });
    } catch (error) {
      console.error('Currency conversion error:', error);
      toast({
        title: "Currency conversion failed",
        description: "Using original amount. Please try again.",
        variant: "destructive",
      });
      setConversionData(null);
    } finally {
      setIsConverting(false);
    }
  };

  React.useEffect(() => {
    if (amount && originalCurrency !== baseCurrency) {
      handleConvertCurrency();
    } else {
      setConversionData(null);
    }
  }, [amount, originalCurrency, baseCurrency]);

  const handleParticipantToggle = (participantId: string) => {
    setSplitBetween(prev => 
      prev.includes(participantId) 
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleShareChange = (participantId: string, shares: number) => {
    setCustomShares(prev => ({
      ...prev,
      [participantId]: shares
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !amount || !paidBy || !category || splitBetween.length === 0) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const finalAmount = conversionData ? conversionData.convertedAmount : parseFloat(amount);
    const transactionShares = useCustomShares ? customShares : undefined;

    const expenseData = {
      tripId,
      description,
      amount: finalAmount,
      originalAmount: originalCurrency !== baseCurrency ? parseFloat(amount) : undefined,
      originalCurrency: originalCurrency !== baseCurrency ? originalCurrency : undefined,
      exchangeRate: conversionData ? conversionData.exchangeRate : undefined,
      paidBy,
      splitBetween,
      transactionShares,
      category,
      date: new Date().toISOString().split('T')[0],
      expenseSource: 'manual',
    };

    onAddExpense(expenseData);
    
    // Reset form
    setDescription('');
    setAmount('');
    setOriginalCurrency(baseCurrency);
    setPaidBy('');
    setCategory('');
    setSplitBetween([]);
    setCustomShares({});
    setUseCustomShares(false);
    setConversionData(null);
    setIsOpen(false);
  };

  const handleScanComplete = (scanResult: any) => {
    // Populate form with scanned data
    setDescription(scanResult.description);
    setAmount(scanResult.amount.toString());
    setOriginalCurrency(scanResult.originalCurrency || baseCurrency);
    setCategory(scanResult.category);
    
    // If there's conversion data from scanning
    if (scanResult.originalAmount && scanResult.exchangeRate && scanResult.originalCurrency !== baseCurrency) {
      setConversionData({
        convertedAmount: scanResult.amount,
        exchangeRate: scanResult.exchangeRate
      });
    }

    // Switch to manual tab to complete the form
    setActiveTab('manual');

    toast({
      title: "Receipt data loaded",
      description: "Please review and complete the expense details",
    });
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setOriginalCurrency(baseCurrency);
    setPaidBy('');
    setCategory('');
    setSplitBetween([]);
    setCustomShares({});
    setUseCustomShares(false);
    setConversionData(null);
    setActiveTab('manual');
  };

  const handleModalOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="scan">Scan Receipt</TabsTrigger>
          </TabsList>
          
          <TabsContent value="scan" className="space-y-4">
            <ReceiptScanner 
              baseCurrency={baseCurrency}
              onScanComplete={handleScanComplete}
              disabled={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What was this expense for?"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={originalCurrency} onValueChange={setOriginalCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {conversionData && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Currency Conversion</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Original Amount:</span>
                      <span className="font-medium">{parseFloat(amount).toFixed(2)} {originalCurrency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Converted Amount:</span>
                      <span className="font-medium">{conversionData.convertedAmount.toFixed(2)} {baseCurrency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Exchange Rate:</span>
                      <span className="font-medium">1 {originalCurrency} = {conversionData.exchangeRate.toFixed(4)} {baseCurrency}</span>
                    </div>
                  </div>
                </div>
              )}

              {isConverting && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-600 animate-spin" />
                    <span className="text-yellow-800">Converting currency...</span>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="paidBy">Paid by *</Label>
                <Select value={paidBy} onValueChange={setPaidBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who paid" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants.map((participant) => (
                      <SelectItem key={participant.id} value={participant.id}>
                        {participant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Split between * (select participants)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={participant.id}
                        checked={splitBetween.includes(participant.id)}
                        onCheckedChange={() => handleParticipantToggle(participant.id)}
                      />
                      <Label htmlFor={participant.id} className="text-sm">
                        {participant.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="customShares"
                  checked={useCustomShares}
                  onCheckedChange={(checked) => setUseCustomShares(checked === true)}
                />
                <Label htmlFor="customShares" className="text-sm">
                  Use custom shares (instead of equal split)
                </Label>
              </div>

              {useCustomShares && (
                <div>
                  <Label>Custom shares for selected participants</Label>
                  <div className="space-y-2 mt-2">
                    {splitBetween.map((participantId) => {
                      const participant = participants.find(p => p.id === participantId);
                      if (!participant) return null;
                      
                      return (
                        <div key={participantId} className="flex items-center space-x-2">
                          <Label className="w-32 text-sm">{participant.name}:</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={customShares[participantId] || 1}
                            onChange={(e) => handleShareChange(participantId, parseFloat(e.target.value) || 1)}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">shares</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || isConverting}>
                  {isLoading ? 'Adding...' : 'Add Expense'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseModal;
