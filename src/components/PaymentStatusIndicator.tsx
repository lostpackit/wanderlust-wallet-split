
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";

interface PaymentStatusIndicatorProps {
  fromUserId: string;
  toUserId: string;
  tripId: string;
}

const PaymentStatusIndicator = ({ fromUserId, toUserId, tripId }: PaymentStatusIndicatorProps) => {
  const { payments } = usePayments(tripId);

  const pendingPayments = payments.filter(payment => 
    payment.from_user_id === fromUserId && 
    payment.to_user_id === toUserId && 
    payment.status === 'pending'
  );

  const totalPendingAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);

  if (pendingPayments.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        ${totalPendingAmount.toFixed(2)} pending confirmation
      </Badge>
    </div>
  );
};

export default PaymentStatusIndicator;
