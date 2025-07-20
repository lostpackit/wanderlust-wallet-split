
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, CheckCircle, DollarSign, AlertCircle } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { format } from "date-fns";

interface PaymentHistoryProps {
  tripId: string;
  participants: Array<{ id: string; name: string; user_id?: string }>;
}

const PaymentHistory = ({ tripId, participants }: PaymentHistoryProps) => {
  const { payments, confirmPayment, isConfirmingPayment } = usePayments(tripId);

  const getParticipantName = (userId: string) => {
    const participant = participants.find(p => p.user_id === userId);
    return participant?.name || 'Unknown User';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'confirmed':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmed
          </Badge>
        );
      case 'settled':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Settled
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  if (payments.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-8 text-center">
          <DollarSign className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No payment history</p>
          <p className="text-slate-500 text-sm mt-2">Payment confirmations will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <DollarSign className="w-5 h-5 text-green-600" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                    {getInitials(getParticipantName(payment.from_user_id))}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-800">
                      {getParticipantName(payment.from_user_id)}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="font-medium text-slate-800">
                      {getParticipantName(payment.to_user_id)}
                    </span>
                    <span className="font-bold text-slate-800 ml-2">
                      ${payment.amount.toFixed(2)}
                    </span>
                  </div>
                  {payment.description && (
                    <p className="text-sm text-slate-600">{payment.description}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {format(new Date(payment.created_at), "MMM d, yyyy 'at' h:mm a")}
                    {payment.confirmed_at && (
                      <span className="ml-2">
                        • Confirmed {format(new Date(payment.confirmed_at), "MMM d, yyyy")}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(payment.status)}
                {payment.status === 'pending' && payment.initiated_by === 'payer' && (
                  <Button
                    size="sm"
                    onClick={() => confirmPayment(payment.id)}
                    disabled={isConfirmingPayment}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Confirm Receipt
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentHistory;
