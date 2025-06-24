
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Trip } from "@/types/trip";
import { toast } from "@/hooks/use-toast";

interface CreateTripModalProps {
  onCreateTrip: (trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const CreateTripModal = ({ onCreateTrip }: CreateTripModalProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [settlementDeadline, setSettlementDeadline] = useState<Date>();

  const handleSubmit = () => {
    if (!name.trim() || !startDate || !endDate || !settlementDeadline) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (startDate >= endDate) {
      toast({
        title: "Invalid dates",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    const newTrip = {
      name: name.trim(),
      description: description.trim(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      settlementDeadline: settlementDeadline.toISOString(),
      createdBy: 'current-user-id', // This will be replaced with actual user ID from Supabase
    };

    onCreateTrip(newTrip);
    
    // Reset form
    setName('');
    setDescription('');
    setStartDate(undefined);
    setEndDate(undefined);
    setSettlementDeadline(undefined);
    setOpen(false);

    toast({
      title: "Trip created",
      description: `${newTrip.name} has been created successfully`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <PlusCircle className="w-4 h-4 mr-2" />
          Create New Trip
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Trip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="trip-name">Trip Name *</Label>
            <Input
              id="trip-name"
              placeholder="e.g., Barcelona Adventure 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the trip..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Settlement Deadline *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !settlementDeadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {settlementDeadline ? format(settlementDeadline, "PPP") : "Pick deadline"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={settlementDeadline}
                  onSelect={setSettlementDeadline}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Create Trip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTripModal;
