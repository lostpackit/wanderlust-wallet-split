
import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftIcon } from "lucide-react";
import { Trip } from "@/types/trip";

interface TripSelectorProps {
  trips: Trip[];
  selectedTrip: Trip | null;
  onSelectTrip: (trip: Trip | null) => void;
  onBackToDashboard: () => void;
}

const TripSelector = ({ trips, selectedTrip, onSelectTrip, onBackToDashboard }: TripSelectorProps) => {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Button
        variant="outline"
        onClick={onBackToDashboard}
        className="flex items-center gap-2"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Dashboard
      </Button>
      
      <Select
        value={selectedTrip?.id || ""}
        onValueChange={(value) => {
          const trip = trips.find(t => t.id === value);
          onSelectTrip(trip || null);
        }}
      >
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select a trip" />
        </SelectTrigger>
        <SelectContent>
          {trips.map((trip) => (
            <SelectItem key={trip.id} value={trip.id}>
              {trip.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TripSelector;
