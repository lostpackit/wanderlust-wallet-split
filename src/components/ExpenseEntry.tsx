
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlusCircle, DollarSign, CalendarIcon, Upload, Receipt } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Participant, Expense } from "@/types/trip";
import { toast } from "@/hooks/use-toast";

interface ExpenseEntryProps {
  participants: Participant[];
  expenses: Expense[];
  tripId: string;
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const ExpenseEntry = ({ participants, expenses, tripId, onAddExpense }: ExpenseEntryProps) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitBetween, setSplitBetween] = useState<string[]>([]);
  const [transactionShares, setTransactionShares] = useState<{ [participantId: string]: number }>({});
  const [category, setCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());

  const categories = [
    'Food & Dining',
    'Transportation',
    'Accommodation',
    'Activities',
    'Shopping',
    'Other'
  ];

  const handleAddExpense = () => {
    if (!description.trim() || !amount || !paidBy || splitBetween.length === 0) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select who to split with",
        variant: "destructive",
      });
      return;
    }

    const expense = {
      tripId,
      description: description.trim(),
      amount: parseFloat(amount),
      paidBy,
      splitBetween,
      transactionShares,
      category: category || 'Other',
      date: expenseDate.toISOString(),
    };

    onAddExpense(expense);
    
    // Reset form
    setDescription('');
    setAmount('');
    setPaidBy('');
    setSplitBetween([]);
    setTransactionShares({});
    setCategory('');
    setExpenseDate(new Date());
  };

  const handleSplitToggle = (participantId: string, checked: boolean) => {
    if (checked) {
      setSplitBetween([...splitBetween, participantId]);
      // Set default shares (assume 1 since ExpenseEntry doesn't have access to participant shares)
      setTransactionShares(prev => ({
        ...prev,
        [participantId]: 1
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
      acc[p.id] = 1; // Default to 1 share since ExpenseEntry doesn't have access to trip shares
      return acc;
    }, {} as { [key: string]: number });
    setTransactionShares(allShares);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  if (participants.length === 0) {
    return (
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-8 text-center">
          <Receipt className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <p className="text-orange-700 font-medium">Add participants first</p>
          <p className="text-orange-600 text-sm mt-2">You need to add people to the trip before recording expenses</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-orange-50 border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <PlusCircle className="w-5 h-5 text-blue-600" />
          New Expense
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="e.g., Dinner at restaurant"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Paid by *</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger className="bg-white">
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
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select category" />
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
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white",
                    !expenseDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expenseDate ? format(expenseDate, "PPP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expenseDate}
                  onSelect={(date) => date && setExpenseDate(date)}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Receipt Upload Section */}
        <div className="space-y-2">
          <Label>Receipt (Optional)</Label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-white">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Drop receipt image here or click to upload</p>
            <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 10MB</p>
            <Button variant="outline" size="sm" className="mt-2">
              Choose File
            </Button>
          </div>
        </div>

        {/* Split Between Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Split between *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAllParticipants}
              className="text-xs"
            >
              Select All
            </Button>
          </div>
           <div className="space-y-2">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border">
                <div className="flex items-center space-x-3 flex-1">
                  <Checkbox
                    id={participant.id}
                    checked={splitBetween.includes(participant.id)}
                    onCheckedChange={(checked) => handleSplitToggle(participant.id, checked as boolean)}
                  />
                  <Avatar className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                      {getInitials(participant.name)}
                    </AvatarFallback>
                  </Avatar>
                  <Label htmlFor={participant.id} className="flex-1 cursor-pointer">
                    {participant.name}
                  </Label>
                </div>
                {splitBetween.includes(participant.id) && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-500">Shares:</Label>
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

        <Button 
          onClick={handleAddExpense}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExpenseEntry;
