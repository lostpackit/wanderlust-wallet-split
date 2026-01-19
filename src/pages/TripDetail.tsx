
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Users, DollarSign, Receipt, BarChart3, Trash2, CreditCard } from "lucide-react";
import { Expense } from '@/types/trip';
import { useTripData, useTrips } from "@/hooks/useTrips";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useParticipants } from "@/hooks/useParticipants";
import { useExpenses } from "@/hooks/useExpenses";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AddParticipantModal from "@/components/AddParticipantModal";
import AddExpenseModal from "@/components/AddExpenseModal";
import TripHeader from "@/components/TripHeader";
import ParticipantManager from "@/components/ParticipantManager";
import ExpensesList from "@/components/ExpensesList";
import BalanceView from "@/components/BalanceView";
import PaymentHistory from "@/components/PaymentHistory";
import ExpenseCategoryChart from "@/components/ExpenseCategoryChart";
import SettlementProgress from "@/components/SettlementProgress";

const TripDetail = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const highlightExpenseId = searchParams.get('expenseId');
  
  // Redirect to home if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { 
        state: { 
          message: "Please sign in to view trip details",
          redirectTo: `/trip/${tripId}`
        }
      });
    }
  }, [authLoading, user, navigate, tripId]);

  const { trip, participants, expenses, tripLoading, participantsLoading, expensesLoading } = useTripData(tripId!);
  const { deleteTrip, isDeletingTrip, updateTrip } = useTrips();
  const { createNotification } = useNotifications();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(highlightExpenseId ? "expenses" : "overview");
  
  // Use the dedicated hooks for mutations
  const { 
    addParticipant, 
    isAddingParticipant, 
    updateParticipantShares, 
    updateAdditionalAmount,
    removeParticipant,
    isUpdatingShares,
    isRemovingParticipant 
  } = useParticipants(tripId);
  const { 
    addExpense, 
    isAddingExpense,
    updateExpense,
    isUpdatingExpense,
    deleteExpense, 
    isDeletingExpense 
  } = useExpenses(tripId);

  const isCreator = trip && user && trip.createdBy === user.id;

  console.log('TripDetail - tripId:', tripId);
  console.log('TripDetail - participants:', participants);
  console.log('TripDetail - expenses:', expenses);
  console.log('TripDetail - loading states:', { participantsLoading, expensesLoading });

  const handleDeleteTrip = () => {
    if (!tripId) return;
    
    if (isCreator) {
      // Creator can delete directly
      deleteTrip(tripId, {
        onSuccess: () => {
          navigate('/');
        }
      });
    } else {
      // Non-creator requests deletion
      if (trip && user) {
        const requesterName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'A participant';
        createNotification({
          userId: trip.createdBy,
          title: "Trip Deletion Request",
          message: `${requesterName} has requested to delete the trip "${trip.name}"`,
          data: {
            type: 'trip_deletion_request',
            tripId: tripId,
            requesterId: user.id,
            requesterName: requesterName,
            tripName: trip.name
          }
        });
        
        // Show success message to requester
        navigate('/', { 
          state: { 
            message: "Deletion request sent to trip creator" 
          }
        });
      }
    }
    setIsDeleteDialogOpen(false);
  };

  const handleTripNameChange = (name: string) => {
    if (trip && isCreator) {
      updateTrip({ 
        id: trip.id, 
        name 
      });
    }
  };

  const handleAddParticipant = (participantData: { name: string; email: string; shares?: number }) => {
    addParticipant(participantData);
  };

  const handleUpdateShares = (participantId: string, shares: number) => {
    updateParticipantShares({ participantId, shares });
  };

  const handleUpdateAdditionalAmount = (participantId: string, additionalAmount: number) => {
    updateAdditionalAmount({ participantId, additionalAmount });
  };

  const handleRemoveParticipant = (participantId: string) => {
    removeParticipant(participantId);
  };
  
  const handleDeleteExpense = (expenseId: string) => {
    deleteExpense(expenseId);
  };

  const handleUpdateExpense = (expenseId: string, expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    updateExpense({ id: expenseId, ...expenseData });
  };

  // Calculate totals for display
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalShares = participants.reduce((sum, p) => sum + ((p as any).shares || 1), 0);

  // Show loading while checking authentication or loading trip data
  if (authLoading || tripLoading || participantsLoading || expensesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{authLoading ? 'Checking authentication...' : 'Loading trip details...'}</p>
        </div>
      </div>
    );
  }

  // Don't render content if user is not authenticated
  if (!user) {
    return null;
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
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="shadow-md">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isCreator ? 'Delete Trip' : 'Request Deletion'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isCreator ? 'Delete Trip' : 'Request Trip Deletion'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isCreator 
                      ? `Are you sure you want to delete "${trip?.name}"? This will permanently remove all participants, expenses, and data associated with this trip. This action cannot be undone.`
                      : `Are you sure you want to request deletion of "${trip?.name}"? The trip creator will be notified of your request and can choose to delete the trip.`
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteTrip}
                    disabled={isDeletingTrip}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeletingTrip ? 'Processing...' : (isCreator ? 'Delete Trip' : 'Send Request')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Trip Header */}
          {trip && (
            <TripHeader
              tripName={trip.name}
              onTripNameChange={handleTripNameChange}
              participantCount={participants.length}
              totalExpenses={totalExpenses}
            />
          )}
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participants
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="balances" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Balances
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payments
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {trip && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Trip Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trip.description && (
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-2">Description</h3>
                      <p className="text-slate-600">{trip.description}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-2">Dates</h3>
                    <p className="text-slate-600">
                      {format(new Date(trip.startDate), "MMMM d, yyyy")} - {format(new Date(trip.endDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    <button 
                      onClick={() => setActiveTab("participants")}
                      className="text-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-slate-800">{participants.length}</div>
                      <div className="text-sm text-slate-600">Participants</div>
                    </button>
                    <button 
                      onClick={() => setActiveTab("balances")}
                      className="text-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                    >
                      <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-slate-800">${totalExpenses.toFixed(2)}</div>
                      <div className="text-sm text-slate-600">Total Expenses</div>
                    </button>
                    <button 
                      onClick={() => setActiveTab("expenses")}
                      className="text-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer"
                    >
                      <Receipt className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-slate-800">{expenses.length}</div>
                      <div className="text-sm text-slate-600">Expenses</div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Settlement Progress */}
            <SettlementProgress 
              tripId={tripId!}
              totalExpenses={totalExpenses}
              expenses={expenses}
              participants={participants}
            />
            
            {/* Expense Category Chart */}
            {expenses.length > 0 && (
              <ExpenseCategoryChart 
                expenses={expenses} 
                variant="bar"
                title="Spending by Category"
              />
            )}
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Manage Participants</h3>
              <AddParticipantModal
                onAddParticipant={handleAddParticipant}
                isLoading={isAddingParticipant}
              />
            </div>
            <ParticipantManager
              participants={participants}
              onAddParticipant={handleAddParticipant}
              onRemoveParticipant={handleRemoveParticipant}
              onUpdateShares={handleUpdateShares}
              onUpdateAdditionalAmount={handleUpdateAdditionalAmount}
              hideAddForm={true}
            />
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Expenses</h2>
               <AddExpenseModal 
                tripId={tripId!} 
                participants={participants as any} 
                onAddExpense={addExpense} 
                isLoading={isAddingExpense}
                baseCurrency={trip?.baseCurrency || 'USD'}
              />
            </div>
            <ExpensesList
              expenses={expenses}
              participants={participants}
              onDeleteExpense={handleDeleteExpense}
              onUpdateExpense={handleUpdateExpense}
              isDeleting={isDeletingExpense}
              isUpdating={isUpdatingExpense}
              tripBaseCurrency={trip?.baseCurrency || 'USD'}
              highlightExpenseId={highlightExpenseId}
              onHighlightComplete={() => setSearchParams({})}
            />
          </TabsContent>

          {/* Balances Tab */}
          <TabsContent value="balances">
            <BalanceView
              participants={participants}
              expenses={expenses}
              tripId={tripId!}
            />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <PaymentHistory
              tripId={tripId!}
              participants={participants}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TripDetail;
