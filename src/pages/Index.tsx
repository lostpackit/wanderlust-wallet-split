
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
import { Participant, Expense, Trip, UserDashboardData } from "@/types/trip";
import { PlusCircle, Users, Receipt, Calculator, Home } from "lucide-react";

const Index = () => {
  const [view, setView] = useState<'dashboard' | 'trip'>('dashboard');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  
  // Mock data - this will be replaced with Supabase data
  const [trips, setTrips] = useState<Trip[]>([
    {
      id: '1',
      name: 'Barcelona Adventure 2024',
      description: 'Amazing trip to Barcelona with friends',
      startDate: '2024-07-01T00:00:00Z',
      endDate: '2024-07-07T00:00:00Z',
      settlementDeadline: '2024-07-15T00:00:00Z',
      createdBy: 'user1',
      createdAt: '2024-06-01T00:00:00Z',
      updatedAt: '2024-06-01T00:00:00Z',
    }
  ]);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Mock dashboard data
  const dashboardData: UserDashboardData = {
    totalOwed: 250.50,
    totalOwing: 180.25,
    activeTrips: trips,
    recentExpenses: expenses.slice(-5),
  };

  const addTrip = (tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTrip: Trip = {
      ...tripData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTrips([...trips, newTrip]);
  };

  const addParticipant = (participant: Participant) => {
    setParticipants([...participants, participant]);
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const addExpense = (expenseData: Omit<Expense, 'id' | 'tripId' | 'createdAt' | 'updatedAt'>) => {
    if (!selectedTrip) return;
    
    const expense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
      tripId: selectedTrip.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setExpenses([...expenses, expense]);
  };

  const handleSelectTrip = (trip: Trip | null) => {
    setSelectedTrip(trip);
    if (trip) {
      setView('trip');
      // In real implementation, load trip-specific data here
    }
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setSelectedTrip(null);
  };

  const totalExpenses = expenses
    .filter(e => selectedTrip ? e.tripId === selectedTrip.id : true)
    .reduce((sum, expense) => sum + expense.amount, 0);

  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="text-center space-y-6 mb-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-slate-800">Trip Expense Manager</h1>
              <p className="text-slate-600 text-lg">Manage all your travel expenses in one place</p>
            </div>
            <CreateTripModal onCreateTrip={addTrip} />
          </div>
          
          <UserDashboard 
            dashboardData={dashboardData}
            onSelectTrip={handleSelectTrip}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <TripSelector
          trips={trips}
          selectedTrip={selectedTrip}
          onSelectTrip={handleSelectTrip}
          onBackToDashboard={handleBackToDashboard}
        />

        {selectedTrip && (
          <>
            <TripHeader 
              tripName={selectedTrip.name} 
              onTripNameChange={() => {}} // Will be implemented with Supabase
              participantCount={participants.length}
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
                    <ParticipantManager 
                      participants={participants}
                      onAddParticipant={addParticipant}
                      onRemoveParticipant={removeParticipant}
                    />
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
                    <ExpenseEntry 
                      participants={participants}
                      expenses={expenses.filter(e => e.tripId === selectedTrip.id)}
                      onAddExpense={addExpense}
                    />
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
                      participants={participants}
                      expenses={expenses.filter(e => e.tripId === selectedTrip.id)}
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
