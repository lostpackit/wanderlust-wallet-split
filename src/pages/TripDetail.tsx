import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Users, DollarSign, Plus, UserPlus } from "lucide-react";
import { useTripData } from "@/hooks/useTrips";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import AddParticipantModal from "@/components/AddParticipantModal";
import AddExpenseModal from "@/components/AddExpenseModal";
import { useParticipants } from "@/hooks/useParticipants";
import { useExpenses } from "@/hooks/useExpenses";

const TripDetail = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { participants, expenses, participantsLoading, expensesLoading } = useTripData(tripId!);
  
  // Use the dedicated hooks for mutations
  const { addParticipant, isAddingParticipant } = useParticipants(tripId);
  const { addExpense, isAddingExpense } = useExpenses(tripId);

  console.log('TripDetail - tripId:', tripId);
  console.log('TripDetail - participants:', participants);
  console.log('TripDetail - expenses:', expenses);
  console.log('TripDetail - loading states:', { participantsLoading, expensesLoading });

  if (participantsLoading || expensesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (!tripId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Trip</h1>
          <p className="text-gray-600 mb-4">No trip ID provided</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!participants || participants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Trip not found</h1>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Participants */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Users className="w-5 h-5 text-blue-600" />
                  Participants ({participants.length})
                </CardTitle>
                <AddParticipantModal onAddParticipant={addParticipant} isLoading={isAddingParticipant} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{participant.name}</p>
                      <p className="text-sm text-slate-500">{participant.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Expenses ({expenses.length})
                </CardTitle>
                <AddExpenseModal tripId={tripId!} participants={participants} onAddExpense={addExpense} isLoading={isAddingExpense} />
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No expenses yet</p>
                  <p className="text-sm text-slate-400 mt-2">Add expenses to track trip costs</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{expense.description}</p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(expense.date), "MMM d, yyyy")} • {expense.category}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">${expense.amount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TripDetail;