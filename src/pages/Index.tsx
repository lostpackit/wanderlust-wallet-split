
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ParticipantManager from "@/components/ParticipantManager";
import ExpenseEntry from "@/components/ExpenseEntry";
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
import { Trip } from "@/types/trip";
import { PlusCircle, Users, Receipt, Calculator, LogOut } from "lucide-react";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [view, setView] = useState<'dashboard' | 'trip'>('dashboard');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  
  const { trips, tripsLoading, createTrip, isCreatingTrip } = useTrips();
  const { participants, expenses, participantsLoading, expensesLoading } = useTripData(selectedTrip?.id || null);
  
  // Use the actual participants hook for the selected trip
  const {
    participants: realParticipants,
    participantsLoading: realParticipantsLoading,
    addParticipant,
    removeParticipant,
    isAddingParticipant,
    isRemovingParticipant,
  } = useParticipants(selectedTrip?.id || null);

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

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Mock dashboard data - will be replaced with real data
  const dashboardData = {
    totalOwed: 0,
    totalOwing: 0,
    activeTrips: trips,
    recentExpenses: expenses.slice(-5),
  };

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
            <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
          
          {tripsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading trips...
            </div>
          ) : (
            <UserDashboard 
              dashboardData={dashboardData}
              onSelectTrip={handleSelectTrip}
            />
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
                      Add everyone who will be sharing expenses on this trip
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold">Participants ({realParticipants.length})</h3>
                      <AddParticipantModal 
                        onAddParticipant={addParticipant}
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
                        onAddParticipant={(participant) => addParticipant({ name: participant.name, email: participant.email })}
                        onRemoveParticipant={removeParticipant}
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
                    {expensesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading expenses...
                      </div>
                    ) : (
                      <ExpenseEntry 
                        participants={realParticipants}
                        expenses={expenses}
                        onAddExpense={() => {}} // Will be implemented
                      />
                    )}
                  </CardContent>
                </Card>
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
                      expenses={expenses}
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
