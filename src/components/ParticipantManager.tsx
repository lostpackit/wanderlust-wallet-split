
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlusCircle, Trash2, Users } from "lucide-react";
import { Participant } from "@/types/trip";
import { toast } from "@/hooks/use-toast";

interface ParticipantManagerProps {
  participants: Participant[];
  onAddParticipant: (participant: Participant) => void;
  onRemoveParticipant: (id: string) => void;
}

const ParticipantManager = ({ participants, onAddParticipant, onRemoveParticipant }: ParticipantManagerProps) => {
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const handleAddParticipant = () => {
    if (!newName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the participant",
        variant: "destructive",
      });
      return;
    }

    const participant: Participant = {
      id: Date.now().toString(),
      name: newName.trim(),
      email: newEmail.trim(),
    };

    onAddParticipant(participant);
    setNewName('');
    setNewEmail('');
    
    toast({
      title: "Participant added",
      description: `${participant.name} has been added to the trip`,
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          placeholder="Enter name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
          className="bg-white border-slate-200"
        />
        <div className="flex gap-2">
          <Input
            placeholder="Email (optional)"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
            className="bg-white border-slate-200 flex-1"
          />
          <Button 
            onClick={handleAddParticipant}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {participants.length === 0 ? (
        <Card className="bg-slate-50 border-dashed border-2 border-slate-300">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500">No participants added yet</p>
            <p className="text-sm text-slate-400 mt-2">Add people to start splitting expenses</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {participants.map((participant) => (
            <Card key={participant.id} className="bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="bg-gradient-to-br from-blue-500 to-purple-600">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-800">{participant.name}</p>
                      {participant.email && (
                        <p className="text-sm text-slate-500">{participant.email}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveParticipant(participant.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParticipantManager;
