import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, DollarSign, CheckCircle, Clock, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { usePayments } from "@/hooks/usePayments";
import { useAuth } from "@/hooks/useAuth";

interface PaymentInfoModalProps {
  recipientId: string;
  recipientName: string;
  amount: number;
  tripId: string;
}

const PaymentInfoModal = ({ recipientId, recipientName, amount, tripId }: PaymentInfoModalProps) => {
  const { user } = useAuth();
  const { useUserPaymentMethods } = useProfile();
  const { createPayment, isCreatingPayment } = usePayments(tripId);
  const { data: paymentMethods, isLoading } = useUserPaymentMethods(recipientId);
  const [customAmount, setCustomAmount] = useState(amount);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "IBAN number copied successfully.",
    });
  };

  const handleMarkAsPaid = () => {
    createPayment({
      toUserId: recipientId,
      amount: customAmount,
      description: `Payment to ${recipientName}`,
      initiatedBy: 'payer',
    });
    setOpen(false);
  };

  const handleMarkAsReceived = () => {
    createPayment({
      toUserId: recipientId,
      amount: customAmount,
      description: `Payment from ${recipientName}`,
      initiatedBy: 'payee',
    });
    setOpen(false);
  };

  const getPaymentLink = (method: string, value: string) => {
    switch (method) {
      case 'venmo':
        return `https://venmo.com/${value.replace('@', '')}`;
      case 'cashapp':
        return `https://cash.app/${value.replace('$', '')}`;
      case 'paypal':
        return `https://www.paypal.com/paypalme/${value}`;
      case 'zelle':
        return `https://www.zellepay.com/`;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
          Pay Now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Pay {recipientName}
          </DialogTitle>
          <DialogDescription>
            Contact information and payment methods for {recipientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={customAmount}
              onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
              className="text-lg font-semibold"
            />
          </div>

          <Separator />

          {isLoading ? (
            <div className="text-center py-4">Loading payment methods...</div>
          ) : paymentMethods ? (
            <div className="space-y-3">
              <h4 className="font-medium text-slate-800">Payment Methods</h4>
              
              {/* Email */}
              {paymentMethods.email && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Badge variant="secondary" className="mb-1">Email</Badge>
                    <p className="text-sm">{paymentMethods.email}</p>
                  </div>
                </div>
              )}

              {/* Venmo */}
              {paymentMethods.venmo_username && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Badge variant="secondary" className="mb-1">Venmo</Badge>
                    <p className="text-sm">{paymentMethods.venmo_username}</p>
                  </div>
                  {getPaymentLink('venmo', paymentMethods.venmo_username) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(getPaymentLink('venmo', paymentMethods.venmo_username)!, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* PayPal */}
              {paymentMethods.paypal_email && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Badge variant="secondary" className="mb-1">PayPal</Badge>
                    <p className="text-sm">{paymentMethods.paypal_email}</p>
                  </div>
                  {getPaymentLink('paypal', paymentMethods.paypal_email) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(getPaymentLink('paypal', paymentMethods.paypal_email)!, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* Zelle */}
              {paymentMethods.zelle_number && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Badge variant="secondary" className="mb-1">Zelle</Badge>
                    <p className="text-sm">{paymentMethods.zelle_number}</p>
                  </div>
                  {getPaymentLink('zelle', paymentMethods.zelle_number) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(getPaymentLink('zelle', paymentMethods.zelle_number)!, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* Cash App */}
              {paymentMethods.cashapp_tag && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Badge variant="secondary" className="mb-1">Cash App</Badge>
                    <p className="text-sm">{paymentMethods.cashapp_tag}</p>
                  </div>
                  {getPaymentLink('cashapp', paymentMethods.cashapp_tag) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(getPaymentLink('cashapp', paymentMethods.cashapp_tag)!, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* IBAN - Will be available after running the migration */}

              {/* Other Payment Info */}
              {paymentMethods.other_payment_info && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Badge variant="secondary" className="mb-1">Other</Badge>
                  <p className="text-sm whitespace-pre-wrap">{paymentMethods.other_payment_info}</p>
                </div>
              )}

              {/* No payment methods */}
              {!paymentMethods.venmo_username && 
               !paymentMethods.paypal_email && 
               !paymentMethods.zelle_number && 
               !paymentMethods.cashapp_tag && 
               !paymentMethods.other_payment_info && (
                <div className="text-center py-4 text-slate-500">
                  No payment methods available. Contact {recipientName} directly.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500">
              Unable to load payment methods.
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleMarkAsPaid}
              disabled={isCreatingPayment}
              className="w-full flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              I Paid ${customAmount.toFixed(2)}
            </Button>
            
            {user?.id === recipientId && (
              <Button
                onClick={handleMarkAsReceived}
                disabled={isCreatingPayment}
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                I Received ${customAmount.toFixed(2)}
              </Button>
            )}
          </div>

          <div className="text-xs text-slate-500 text-center">
            Marking as paid will notify {recipientName} to confirm the payment.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentInfoModal;
