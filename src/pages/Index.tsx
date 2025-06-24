
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ParticipantManager from "@/components/ParticipantManager";
import ExpenseEntry from "@/components/ExpenseEntry";
import BalanceView from "@/components/BalanceView";
import TripHeader from "@/components/TripHeader";
import { Participant, Expense } from "@/types/trip";
import { PlusCircle, Users, Receipt, Calculator } from "lucide-react";

const Index = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tripName, setTripName] = useState<string>("Amazing Trip 2024");

  const addParticipant = (participant: Participant) => {
    setParticipants([...participants, participant]);
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const addExpense = (expense: Expense) => {
    setExpenses([...expenses, expense]);
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <TripHeader 
          tripName={tripName} 
          onTripNameChange={setTripName}
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
                  expenses={expenses}
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
                  expenses={expenses}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
