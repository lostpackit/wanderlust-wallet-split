import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, DollarSign, TrendingUp, TrendingDown, Users } from "lucide-react";
import { Participant, Expense } from "@/types/trip";
import PaymentInfoModal from "./PaymentInfoModal";
import PaymentStatusIndicator from "./PaymentStatusIndicator";
import { usePayments } from "@/hooks/usePayments";

interface BalanceViewProps {
  participants: (Participant & { shares?: number; additional_amount?: number })[];
  expenses: Expense[];
  tripId: string;
}

const BalanceView = ({ participants, expenses, tripId }: BalanceViewProps) => {
  const { payments } = usePayments(tripId);
  const calculateBalances = () => {
    const balances: { [participantId: string]: number } = {};
    
    // Initialize balances
    participants.forEach(p => {
      balances[p.id] = 0;
    });

    // Calculate total shares for proper splitting
    const totalShares = participants.reduce((sum, p) => sum + (p.shares || 1), 0);
    const totalAdditionalAmounts = participants.reduce((sum, p) => sum + (p.additional_amount || 0), 0);

    expenses.forEach(expense => {
      const participantsInExpense = participants.filter(p => 
        expense.splitBetween.includes(p.id)
      );
      
      // The person who paid gets credited with full amount
      balances[expense.paidBy] += expense.amount;
      
      if (expense.transactionShares) {
        // Use transaction-specific shares (ignore additional amounts for transaction shares)
        const totalTransactionShares = participantsInExpense.reduce((sum, p) => 
          sum + (expense.transactionShares![p.id] || 1), 0
        );
        
        expense.splitBetween.forEach(participantId => {
          if (balances.hasOwnProperty(participantId)) {
            const transactionShare = expense.transactionShares![participantId] || 1;
            const participantShare = expense.amount * transactionShare / totalTransactionShares;
            balances[participantId] -= participantShare;
          }
        });
      } else {
        // Use default trip shares with additional amounts
        const totalSharesInExpense = participantsInExpense.reduce((sum, p) => 
          sum + (p.shares || 1), 0
        );
        
        const additionalAmountsInExpense = participantsInExpense.reduce((sum, p) => 
          sum + (p.additional_amount || 0), 0
        );
        
        // Amount remaining after additional amounts to be split by shares
        const shareableAmount = expense.amount - additionalAmountsInExpense;
        
        // Everyone who should split it gets debited based on their shares + additional amounts
        expense.splitBetween.forEach(participantId => {
          const participant = participants.find(p => p.id === participantId);
          if (participant && balances.hasOwnProperty(participantId)) {
            const participantShares = participant.shares || 1;
            const shareAmount = shareableAmount > 0 ? (shareableAmount * participantShares) / totalSharesInExpense : 0;
            const additionalAmount = participant.additional_amount || 0;
            balances[participantId] -= (shareAmount + additionalAmount);
          }
        });
      }
    });

    // Apply confirmed/settled payments to adjust balances
    // Build user ID to participant ID mapping
    const userToParticipantMap: { [userId: string]: string } = {};
    participants.forEach(p => {
      const userId = p.userId || p.user_id;
      if (userId) {
        userToParticipantMap[userId] = p.id;
      }
    });

    // Filter for confirmed/settled payments only
    const settledPayments = payments.filter(p => 
      p.status === 'confirmed' || p.status === 'settled'
    );

    settledPayments.forEach(payment => {
      const fromParticipantId = userToParticipantMap[payment.from_user_id];
      const toParticipantId = userToParticipantMap[payment.to_user_id];
      
      if (fromParticipantId && toParticipantId) {
        // Payment: 'from' paid money to 'to'
        // This increases 'from' balance (they paid, so less in debt)
        if (balances.hasOwnProperty(fromParticipantId)) {
          balances[fromParticipantId] += payment.amount;
        }
        // This decreases 'to' balance (they received, so less owed to them)
        if (balances.hasOwnProperty(toParticipantId)) {
          balances[toParticipantId] -= payment.amount;
        }
      }
    });

    return balances;
  };

  const calculateSettlements = () => {
    const balances = calculateBalances();
    const settlements: Array<{from: string, to: string, amount: number}> = [];
    
    const creditors = Object.entries(balances)
      .filter(([_, balance]) => balance > 0.01)
      .sort(([_, a], [__, b]) => b - a);
    
    const debtors = Object.entries(balances)
      .filter(([_, balance]) => balance < -0.01)
      .sort(([_, a], [__, b]) => a - b);

    let i = 0, j = 0;
    
    while (i < creditors.length && j < debtors.length) {
      const [creditorId, creditAmount] = creditors[i];
      const [debtorId, debtAmount] = debtors[j];
      
      const settlementAmount = Math.min(creditAmount, -debtAmount);
      
      if (settlementAmount > 0.01) {
        settlements.push({
          from: debtorId,
          to: creditorId,
          amount: settlementAmount
        });
      }
      
      creditors[i][1] -= settlementAmount;
      debtors[j][1] += settlementAmount;
      
      if (creditors[i][1] <= 0.01) i++;
      if (debtors[j][1] >= -0.01) j++;
    }
    
    return settlements;
  };

  const getParticipantName = (id: string) => {
    return participants.find(p => p.id === id)?.name || 'Unknown';
  };

  const getParticipantShares = (id: string) => {
    return participants.find(p => p.id === id)?.shares || 1;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getParticipantUserId = (participantId: string) => {
    return participants.find(p => p.id === participantId)?.user_id;
  };

  const balances = calculateBalances();
  const settlements = calculateSettlements();
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalShares = participants.reduce((sum, p) => sum + (p.shares || 1), 0);
  const totalAdditionalAmounts = participants.reduce((sum, p) => sum + (p.additional_amount || 0), 0);
  const shareableAmount = totalExpenses - totalAdditionalAmounts;

  if (participants.length === 0 || expenses.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-8 text-center">
          <DollarSign className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-green-700 font-medium">No expenses to calculate</p>
          <p className="text-green-600 text-sm mt-2">Add participants and expenses to see who owes what</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Total Expenses</p>
            <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Total Shares</p>
            <p className="text-2xl font-bold">{totalShares}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Per Share</p>
            <p className="text-2xl font-bold">${(shareableAmount / totalShares).toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Additional Amounts</p>
            <p className="text-2xl font-bold">${totalAdditionalAmounts.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <ArrowRight className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Transactions</p>
            <p className="text-2xl font-bold">{settlements.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Balances */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Individual Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {participants.map(participant => {
              const balance = balances[participant.id];
              const shares = participant.shares || 1;
              const isPositive = balance > 0.01;
              const isNegative = balance < -0.01;
              
              return (
                <div key={participant.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="bg-gradient-to-br from-blue-500 to-purple-600">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium text-slate-800">{participant.name}</span>
                      <div className="text-xs text-slate-500 space-y-0.5">
                        {shares > 1 && <div>{shares} shares</div>}
                        {(participant.additional_amount || 0) !== 0 && (
                          <div>+${(participant.additional_amount || 0).toFixed(2)} additional</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {isPositive ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-semibold">+${balance.toFixed(2)}</span>
                      </div>
                    ) : isNegative ? (
                      <div className="flex items-center gap-1 text-red-600">
                        <TrendingDown className="w-4 h-4" />
                        <span className="font-semibold">-${Math.abs(balance).toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-medium">Even</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Settlement Suggestions */}
      {settlements.length > 0 && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <ArrowRight className="w-5 h-5 text-green-600" />
              Suggested Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settlements.map((settlement, index) => {
                const fromUserId = getParticipantUserId(settlement.from);
                const toUserId = getParticipantUserId(settlement.to);
                
                return (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-red-500 to-orange-500 text-white text-xs">
                            {getInitials(getParticipantName(settlement.from))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-slate-800 block truncate">{getParticipantName(settlement.from)}</span>
                          {getParticipantShares(settlement.from) > 1 && (
                            <div className="text-xs text-slate-500">
                              {getParticipantShares(settlement.from)} shares
                            </div>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0 self-center sm:self-auto" />
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-500 text-white text-xs">
                            {getInitials(getParticipantName(settlement.to))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-slate-800 block truncate">{getParticipantName(settlement.to)}</span>
                          {getParticipantShares(settlement.to) > 1 && (
                            <div className="text-xs text-slate-500">
                              {getParticipantShares(settlement.to)} shares
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-slate-800">${settlement.amount.toFixed(2)}</span>
                        <PaymentInfoModal
                          recipientId={settlement.to}
                          recipientName={getParticipantName(settlement.to)}
                          amount={settlement.amount}
                          tripId={tripId}
                          recipientUserId={toUserId}
                        />
                      </div>
                      {fromUserId && toUserId && (
                        <PaymentStatusIndicator
                          fromUserId={fromUserId}
                          toUserId={toUserId}
                          tripId={tripId}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BalanceView;
