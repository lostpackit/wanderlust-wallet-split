
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, UserPlus, Loader2, Search } from "lucide-react";
import UserSearchInput from "./UserSearchInput";
import { UserProfile } from "@/hooks/useUserSearch";

interface AddParticipantModalProps {
  onAddParticipant: (participant: { name: string; email: string; userId?: string }) => void;
  isLoading: boolean;
}

const AddParticipantModal = ({ onAddParticipant, isLoading }: AddParticipantModalProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && email.trim()) {
      onAddParticipant({ name: name.trim(), email: email.trim() });
      setName('');
      setEmail('');
      setOpen(false);
    }
  };

  const handleSelectUser = (user: UserProfile) => {
    onAddParticipant({
      name: user.full_name || user.email,
      email: user.email,
      userId: user.id,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Participant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Participant
          </DialogTitle>
          <DialogDescription>
            Search for existing users or add someone new to this trip.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Users
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add Manually
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="space-y-2">
              <Label>Find existing users</Label>
              <UserSearchInput onSelectUser={handleSelectUser} />
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="participant-name">Name</Label>
                <Input
                  id="participant-name"
                  type="text"
                  placeholder="Enter participant's name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="participant-email">Email</Label>
                <Input
                  id="participant-email"
                  type="email"
                  placeholder="Enter participant's email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Participant'
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddParticipantModal;
