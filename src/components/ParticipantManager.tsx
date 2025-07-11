
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Trash2, Users, UserCheck, Mail, Edit2, Check, X } from "lucide-react";
import { Participant } from "@/types/trip";
import { toast } from "@/hooks/use-toast";

interface ParticipantManagerProps {
  participants: (Participant & { role?: string; shares?: number })[];
  onAddParticipant: (participant: { name: string; email: string; shares?: number }) => void;
  onRemoveParticipant: (id: string) => void;
  onUpdateShares?: (participantId: string, shares: number) => void;
  hideAddForm?: boolean;
}

const ParticipantManager = ({ 
  participants, 
  onAddParticipant, 
  onRemoveParticipant,
  onUpdateShares,
  hideAddForm = false
}: ParticipantManagerProps) => {
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newShares, setNewShares] = useState(1);
  const [editingShares, setEditingShares] = useState<string | null>(null);
  const [tempShares, setTempShares] = useState<number>(1);

  const handleAddParticipant = () => {
    if (!newName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the participant",
        variant: "destructive",
      });
      return;
    }

    if (!newEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email for the participant",
        variant: "destructive",
      });
      return;
    }

    if (newShares < 1) {
      toast({
        title: "Invalid shares",
        description: "Shares must be at least 1",
        variant: "destructive",
      });
      return;
    }

    onAddParticipant({
      name: newName.trim(),
      email: newEmail.trim(),
      shares: newShares,
    });
    
    setNewName('');
    setNewEmail('');
    setNewShares(1);
  };

  const handleEditShares = (participantId: string, currentShares: number) => {
    setEditingShares(participantId);
    setTempShares(currentShares);
  };

  const handleSaveShares = (participantId: string) => {
    if (tempShares < 1) {
      toast({
        title: "Invalid shares",
        description: "Shares must be at least 1",
        variant: "destructive",
      });
      return;
    }

    if (onUpdateShares) {
      onUpdateShares(participantId, tempShares);
    }
    setEditingShares(null);
  };

  const handleCancelEdit = () => {
    setEditingShares(null);
    setTempShares(1);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getParticipantStatus = (participant: Participant & { role?: string }) => {
    if (participant.userId) {
      return {
        label: 'Member',
        icon: UserCheck,
        variant: 'default' as const,
        description: 'Registered user'
      };
    } else {
      return {
        label: 'Invited',
        icon: Mail,
        variant: 'secondary' as const,
        description: 'Invitation sent'
      };
    }
  };

  const totalShares = participants.reduce((sum, p) => sum + (p.shares || 1), 0);

  return (
    <div className="space-y-6">
      {/* Add Participant Form - only show if not hidden */}
      {!hideAddForm && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Enter name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
            className="bg-white border-slate-200"
          />
          <Input
            placeholder="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
            className="bg-white border-slate-200"
          />
          <Input
            placeholder="Shares"
            type="number"
            min="1"
            value={newShares}
            onChange={(e) => setNewShares(Math.max(1, parseInt(e.target.value) || 1))}
            onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
            className="bg-white border-slate-200"
          />
          <Button 
            onClick={handleAddParticipant}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      )}

      {/* Total Shares Summary */}
      {participants.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">
                  Total: {participants.length} participants representing {totalShares} shares
                </span>
              </div>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                {totalShares} people
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

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
          {participants.map((participant) => {
            const status = getParticipantStatus(participant);
            const StatusIcon = status.icon;
            const shares = participant.shares || 1;
            const isEditing = editingShares === participant.id;
            
            return (
              <Card key={participant.id} className="bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                          {getInitials(participant.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 truncate">{participant.name}</p>
                        {participant.email && (
                          <p className="text-sm text-slate-500 truncate">{participant.email}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {participant.role && (
                            <Badge variant="outline" className="text-xs">
                              {participant.role}
                            </Badge>
                          )}
                          <Badge variant={status.variant} className="text-xs flex items-center gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </div>
                        
                        {/* Shares display/edit */}
                        <div className="flex items-center gap-2 mt-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="1"
                                value={tempShares}
                                onChange={(e) => setTempShares(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 h-6 text-xs"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveShares(participant.id)}
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {shares} {shares === 1 ? 'share' : 'shares'}
                              </Badge>
                              {onUpdateShares && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditShares(participant.id, shares)}
                                  className="h-5 w-5 p-0 text-slate-400 hover:text-slate-600"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveParticipant(participant.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ParticipantManager;
