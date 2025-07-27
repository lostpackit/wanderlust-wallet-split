
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Receipt, Users, Scan, Edit, Coins } from "lucide-react";
import { Expense, Participant } from '@/types/trip';
import { format } from 'date-fns';

interface ExpensesListProps {
  expenses: Expense[];
  participants: (Participant & { role: string })[];
  onDeleteExpense: (expenseId: string) => void;
  isDeleting: boolean;
}

const ExpensesList = ({ expenses, participants, onDeleteExpense, isDeleting }: ExpensesListProps) => {
  const getParticipantName = (id: string) => {
    const participant = participants.find(p => p.id === id);
    return participant?.name || 'Unknown';
  };

  const getParticipantAvatar = (id: string) => {
    const participant = participants.find(p => p.id === id);
    return participant?.avatar;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const calculateParticipantShare = (expense: Expense, participantId: string) => {
    if (expense.transactionShares) {
      // Use transaction-specific shares
      const totalShares = Object.values(expense.transactionShares).reduce((sum, shares) => sum + shares, 0);
      const participantShares = expense.transactionShares[participantId] || 0;
      return expense.amount * participantShares / totalShares;
    } else {
      // Fall back to equal split
      return expense.amount / expense.splitBetween.length;
    }
  };

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No expenses yet</h3>
            <p className="text-sm text-muted-foreground">Add your first expense to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense) => (
        <Card key={expense.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{expense.description}</CardTitle>
                  <Badge 
                    variant={expense.expenseSource === 'scanned_receipt' ? 'default' : 'outline'}
                    className="flex items-center gap-1"
                  >
                    {expense.expenseSource === 'scanned_receipt' ? (
                      <>
                        <Scan className="h-3 w-3" />
                        Scanned
                      </>
                    ) : (
                      <>
                        <Edit className="h-3 w-3" />
                        Manual
                      </>
                    )}
                  </Badge>
                  {expense.originalCurrency && expense.originalCurrency !== 'USD' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      {expense.originalCurrency}
                    </Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-2">
                  <span>{format(new Date(expense.date), 'MMM dd, yyyy')}</span>
                  <Badge variant="secondary">{expense.category}</Badge>
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(expense.amount)}
                </div>
                {expense.originalCurrency && expense.originalAmount && expense.originalCurrency !== 'USD' && (
                  <div className="text-sm text-muted-foreground">
                    Originally {formatCurrency(expense.originalAmount, expense.originalCurrency)}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteExpense(expense.id)}
                  disabled={isDeleting}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Paid by:</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={getParticipantAvatar(expense.paidBy)} />
                    <AvatarFallback className="text-xs">
                      {getParticipantName(expense.paidBy).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{getParticipantName(expense.paidBy)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Split between {expense.splitBetween.length} participant{expense.splitBetween.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-muted-foreground">Split breakdown:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {expense.splitBetween.map((participantId) => {
                  const participantShare = calculateParticipantShare(expense, participantId);
                  const participantName = getParticipantName(participantId);
                  const shares = expense.transactionShares?.[participantId];
                  
                  return (
                    <div key={participantId} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={getParticipantAvatar(participantId)} />
                          <AvatarFallback className="text-xs">
                            {participantName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{participantName}</span>
                        {shares && shares !== 1 && (
                          <Badge variant="secondary" className="text-xs">
                            {shares} {shares === 1 ? 'share' : 'shares'}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-bold text-slate-700">
                        {formatCurrency(participantShare)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ExpensesList;
