import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";

interface SettlementProgressProps {
  tripId: string;
  totalExpenses: number;
}

const SettlementProgress: React.FC<SettlementProgressProps> = ({ tripId, totalExpenses }) => {
  const { payments, isLoading } = usePayments(tripId);

  // Calculate total confirmed/settled payments
  const settledPayments = payments.filter(p => p.status === 'settled' || p.status === 'confirmed');
  const totalSettled = settledPayments.reduce((sum, p) => sum + p.amount, 0);

  // Calculate percentage (avoid division by zero)
  const settlementPercentage = totalExpenses > 0 
    ? Math.min((totalSettled / totalExpenses) * 100, 100) 
    : 0;

  const remainingAmount = Math.max(totalExpenses - totalSettled, 0);
  const isFullySettled = settlementPercentage >= 100;

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="animate-pulse h-16 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
          {isFullySettled ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600" />
          )}
          Settlement Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">
              ${totalSettled.toFixed(2)} of ${totalExpenses.toFixed(2)} settled
            </span>
            <span className={`font-semibold ${isFullySettled ? 'text-green-600' : 'text-amber-600'}`}>
              {settlementPercentage.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={settlementPercentage} 
            className="h-3"
          />
        </div>
        
        <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-green-600">${totalSettled.toFixed(2)}</div>
            <div className="text-slate-500 text-xs">Settled</div>
          </div>
          <div className="text-center flex-1 border-l border-slate-100">
            <div className="text-lg font-bold text-amber-600">${remainingAmount.toFixed(2)}</div>
            <div className="text-slate-500 text-xs">Remaining</div>
          </div>
          <div className="text-center flex-1 border-l border-slate-100">
            <div className="text-lg font-bold text-slate-700">{settledPayments.length}</div>
            <div className="text-slate-500 text-xs">Payments</div>
          </div>
        </div>

        {isFullySettled && (
          <div className="text-center py-2 bg-green-50 rounded-lg">
            <span className="text-green-700 font-medium text-sm">
              🎉 All expenses have been settled!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SettlementProgress;
