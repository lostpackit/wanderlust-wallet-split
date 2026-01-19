
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapIcon, DollarSignIcon, TrendingUpIcon, TrendingDownIcon, CalendarIcon } from "lucide-react";
import { Trip, UserDashboardData, Expense } from "@/types/trip";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface UserDashboardProps {
  dashboardData: UserDashboardData & { recentExpenses: (Expense & { tripName: string; tripId: string })[] };
  onSelectTrip: (trip: Trip, expenseId?: string) => void;
}

const UserDashboard = ({ dashboardData, onSelectTrip }: UserDashboardProps) => {
  const navigate = useNavigate();
  const { totalOwed, totalOwing, activeTrips, recentExpenses } = dashboardData;

  const handleBalanceClick = () => {
    navigate('/balance-breakdown');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 cursor-pointer hover:from-green-600 hover:to-green-700 transition-all"
          onClick={handleBalanceClick}
        >
          <CardContent className="p-4 text-center">
            <TrendingUpIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">You're Owed</p>
            <p className="text-2xl font-bold">${totalOwed.toFixed(2)}</p>
            <p className="text-xs opacity-75 mt-1">Click for details</p>
          </CardContent>
        </Card>
        
        <Card 
          className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 cursor-pointer hover:from-red-600 hover:to-red-700 transition-all"
          onClick={handleBalanceClick}
        >
          <CardContent className="p-4 text-center">
            <TrendingDownIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">You Owe</p>
            <p className="text-2xl font-bold">${totalOwing.toFixed(2)}</p>
            <p className="text-xs opacity-75 mt-1">Click for details</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <MapIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Active Trips</p>
            <p className="text-2xl font-bold">{activeTrips.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Trips */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <MapIcon className="w-5 h-5 text-blue-600" />
            Your Active Trips
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTrips.length === 0 ? (
            <div className="text-center py-8">
              <MapIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">No active trips</p>
              <p className="text-sm text-slate-400 mt-2">Create a new trip to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTrips.map((trip) => (
                <div 
                  key={trip.id} 
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer active:bg-slate-200"
                  onClick={() => onSelectTrip(trip)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{trip.name}</h3>
                    {trip.description && (
                      <p className="text-sm text-slate-600 mt-1">{trip.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Settlement: {format(new Date(trip.settlementDeadline), "MMM d")}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTrip(trip);
                    }}
                    className="ml-4 hidden md:inline-flex"
                  >
                    View Trip
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      {recentExpenses.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <DollarSignIcon className="w-5 h-5 text-green-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentExpenses.slice(0, 5).map((expense: Expense & { tripName: string; tripId: string }) => (
                <div 
                  key={expense.id} 
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 active:bg-slate-200 transition-colors"
                  onClick={() => {
                    const trip = activeTrips.find(t => t.id === expense.tripId);
                    if (trip) onSelectTrip(trip, expense.id);
                  }}
                >
                  <div>
                    <p className="font-medium text-slate-800">{expense.description}</p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(expense.date), "MMM d, yyyy")} • {expense.category}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Trip: {expense.tripName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">${expense.amount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserDashboard;
