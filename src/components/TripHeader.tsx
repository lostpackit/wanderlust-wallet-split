
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapIcon, DollarSignIcon, UsersIcon } from "lucide-react";

interface TripHeaderProps {
  tripName: string;
  onTripNameChange: (name: string) => void;
  participantCount: number;
  totalExpenses: number;
  onTabChange?: (tab: string) => void;
}

const TripHeader = ({ tripName, onTripNameChange, participantCount, totalExpenses, onTabChange }: TripHeaderProps) => {
  return (
    <div className="text-center space-y-6">
      <div className="space-y-2">
        <Input
          value={tripName}
          onChange={(e) => onTripNameChange(e.target.value)}
          className="text-3xl font-bold text-center border-0 bg-transparent text-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/20"
          placeholder="Enter trip name..."
        />
        <p className="text-slate-600 text-lg">Manage expenses and split costs with ease</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <Card 
          className="bg-white/60 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
          onClick={() => onTabChange?.("overview")}
        >
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
              <MapIcon className="w-5 h-5" />
              <span className="font-semibold">Trip</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 truncate">{tripName}</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-white/60 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
          onClick={() => onTabChange?.("participants")}
        >
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-orange-600 mb-2">
              <UsersIcon className="w-5 h-5" />
              <span className="font-semibold">People</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{participantCount}</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-white/60 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
          onClick={() => onTabChange?.("balances")}
        >
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
              <DollarSignIcon className="w-5 h-5" />
              <span className="font-semibold">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">${totalExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TripHeader;
