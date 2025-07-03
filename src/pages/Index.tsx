import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ParticipantManager from "@/components/ParticipantManager";
import ExpenseEntry from "@/components/ExpenseEntry";
import ExpensesList from "@/components/ExpensesList";
import BalanceView from "@/components/BalanceView";
import TripHeader from "@/components/TripHeader";
import UserDashboard from "@/components/UserDashboard";
import CreateTripModal from "@/components/CreateTripModal";
import TripSelector from "@/components/TripSelector";
import AddParticipantModal from "@/components/AddParticipantModal";
import AuthPage from "@/components/AuthPage";
import { useAuth } from "@/hooks/useAuth";
import { useTrips, useTripData } from "@/hooks/useTrips";
import { useParticipants } from "@/hooks/useParticipants";
import { useExpenses } from "@/hooks/useExpenses";
import { Trip } from "@/types/trip";
import { PlusCircle, Users, Receipt, Calculator, LogOut, User } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useLocation } from "react-router-dom";

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const location = useLocation();
  const [view, setView] = useState<'dashboard' | 'trip'>('dashboard');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  
  const { trips, tripsLoading, createTrip, isCreatingTrip } = useTrips();
  const { participants, expenses, participantsLoading, expensesLoading } = useTripData(selectedTrip?.id || null);
  
  // Use the dashboard data hook for calculating totals across all trips
  const { dashboardData, dashboardLoading } = useDashboardData();
  
  // Use the actual participants hook for the selected trip
  const {
    participants: realParticipants,
    participantsLoading: realParticipantsLoading,
    addParticipant,
    removeParticipant,
    updateParticipantShares,
    isAddingParticipant,
    isRemovingParticipant,
  } = useParticipants(selectedTrip?.id || null);

  // Use the expenses hook for the selected trip
  const {
    expenses: realExpenses,
    expensesLoading: realExpensesLoading,
    addExpense,
    deleteExpense,
    isAddingExpense,
    isDeletingExpense,
  } = useExpenses(selectedTrip?.id || null);

  // Handle navigation from balance breakdown page
  useEffect(() => {
    const state = location.state as { selectedTripId?: string } | null;
    if (state?.selectedTripId && trips.length > 0) {
      const trip = trips.find(t => t.id === state.selectedTripId);
      if (trip) {
        handleSelectTrip(trip);
      }
    }
  }, [location.state, trips]);

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Show auth page if user is not logged in
  if (!user) {
    return <AuthPage />;
  }

  const handleSelectTrip = (trip: Trip | null) => {
    setSelectedTrip(trip);
    if (trip) {
      setView('trip');
    }
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setSelectedTrip(null);
  };

  const handleCreateTrip = (tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    createTrip(tripData);
  };

  const handleAddExpense = (expenseData: any) => {
    if (selectedTrip) {
      addExpense({
        ...expenseData,
        tripId: selectedTrip.id,
      });
    }
  };

  // Enhanced add participant handler that accepts userId
  const handleAddParticipant = (participantData: { name: string; email: string; userId?: string }) => {
    addParticipant(participantData);
  };

  // Wrapper function to match the expected interface for updateParticipantShares
  const handleUpdateParticipantShares = (participantId: string, shares: number) => {
    updateParticipantShares({ participantId, shares });
  };

  const totalExpenses = realExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-slate-800">Trip Expense Manager</h1>
                <p className="text-slate-600 text-lg">Welcome back, {user.email}!</p>
              </div>
              <CreateTripModal onCreateTrip={handleCreateTrip} />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => window.location.href = '/profile'} className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </Button>
              <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
          
          {dashboardLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading dashboard...
            </div>
          ) : dashboardData ? (
            <UserDashboard 
              dashboardData={dashboardData}
              onSelectTrip={handleSelectTrip}
            />
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-slate-600">No dashboard data available</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <TripSelector
            trips={trips}
            selectedTrip={selectedTrip}
            onSelectTrip={handleSelectTrip}
            onBackToDashboard={handleBackToDashboard}
          />
          <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        {selectedTrip && (
          <>
            <TripHeader 
              tripName={selectedTrip.name} 
              onTripNameChange={() => {}} // Will be implemented later
              participantCount={realParticipants.length}
              totalExpenses={totalExpenses}
            />
            
            <Tabs defaultValue="participants" className="w-full mt-8">
              <TabsList className="grid w-full grid-cols-3 mb-8 bg-white/80 backdrop-blur-sm">
                <TabsTrigger value="participants" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  People
                </TabsTrigger>
                <TabsTrigger value="expenses" className="flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Expenses
                </TabsTrigger>
                <TabsTrigger value="balances" className="flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Balances
                </TabsTrigger>
              </TabsList>

              <TabsContent value="participants" className="space-y-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                      <Users className="w-5 h-5 text-blue-600" />
                      Trip Participants
                    </CardTitle>
                    <CardDescription>
                      Search for existing users or add new people to share expenses on this trip
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold">Participants ({realParticipants.length})</h3>
                      <AddParticipantModal 
                        onAddParticipant={handleAddParticipant}
                        isLoading={isAddingParticipant}
                      />
                    </div>
                    {realParticipantsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading participants...
                      </div>
                    ) : (
                      <ParticipantManager 
                        participants={realParticipants}
                        onAddParticipant={(participant) => handleAddParticipant({ name: participant.name, email: participant.email })}
                        onRemoveParticipant={removeParticipant}
                        onUpdateShares={handleUpdateParticipantShares}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="expenses" className="space-y-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                      <Receipt className="w-5 h-5 text-orange-600" />
                      Add Expenses
                    </CardTitle>
                    <CardDescription>
                      Record expenses and split them among participants
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {realExpensesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading expenses...
                      </div>
                    ) : (
                      <ExpenseEntry 
                        participants={realParticipants}
                        expenses={realExpenses}
                        onAddExpense={handleAddExpense}
                      />
                    )}
                  </CardContent>
                </Card>

                {realExpenses.length > 0 && (
                  <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-slate-800">
                        <Receipt className="w-5 h-5 text-green-600" />
                        Expense History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ExpensesList
                        expenses={realExpenses}
                        participants={realParticipants}
                        onDeleteExpense={deleteExpense}
                        isDeleting={isDeletingExpense}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="balances" className="space-y-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                      <Calculator className="w-5 h-5 text-green-600" />
                      Who Owes What
                    </CardTitle>
                    <CardDescription>
                      See the breakdown of who owes money to whom
                    </CardDescription>
                    </CardHeader>
                  <CardContent>
                    <BalanceView 
                      participants={realParticipants}
                      expenses={realExpenses}
                      tripId={selectedTrip.id}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
