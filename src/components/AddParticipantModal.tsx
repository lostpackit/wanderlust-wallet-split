
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
  onAddParticipant: (participant: { name: string; email: string; userId?: string; shares?: number }) => void;
  isLoading: boolean;
}

const AddParticipantModal = ({ onAddParticipant, isLoading }: AddParticipantModalProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [shares, setShares] = useState('1');
  const [tab, setTab] = useState<'search' | 'manual'>('search');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sharesNum = parseInt(shares) || 1;
    if (name.trim() && email.trim() && sharesNum >= 1) {
      onAddParticipant({ 
        name: name.trim(), 
        email: email.trim(), 
        shares: sharesNum 
      });
      setName('');
      setEmail('');
      setShares('1');
      setOpen(false);
    }
  };

  const handleSelectUser = (user: UserProfile) => {
    setSelectedUser(user);
  };

  const handleAddSelectedUser = () => {
    if (!selectedUser) return;
    const sharesNum = parseInt(shares) || 1;
    onAddParticipant({
      name: selectedUser.full_name || selectedUser.email,
      email: selectedUser.email,
      userId: selectedUser.id,
      shares: sharesNum,
    });
    setShares('1');
    setSelectedUser(null);
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
      <DialogContent className="max-w-md flex flex-col max-h-[85vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Participant
          </DialogTitle>
          <DialogDescription>
            Search for existing users or add someone new to this trip. Set how many shares they represent.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'search' | 'manual')} className="w-full flex-1 flex flex-col min-h-0">
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

          <TabsContent value="search" className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Find existing users</Label>
                <UserSearchInput onSelectUser={handleSelectUser} />
                {selectedUser && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm font-medium text-green-900">
                      Selected: {selectedUser.full_name || selectedUser.email}
                    </p>
                    <p className="text-xs text-green-700">{selectedUser.email}</p>
                  </div>
                )}
                <p className="text-xs text-slate-500">Search and select a user, then adjust shares and click Add.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-shares">Shares (people they represent)</Label>
                <Input
                  id="search-shares"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    setShares(val >= 1 ? val.toString() : '1');
                  }}
                  placeholder="Number of shares"
                />
                <p className="text-xs text-slate-500">
                  If they represent a family of 3, set this to 3
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end flex-shrink-0 pt-4 border-t bg-background sticky bottom-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleAddSelectedUser} disabled={!selectedUser || isLoading}>
                {isLoading ? 'Adding...' : 'Add User'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="flex-1 flex flex-col min-h-0">
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 pb-4">
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
                <div className="space-y-2">
                  <Label htmlFor="participant-shares">Shares (people they represent)</Label>
                  <Input
                    id="participant-shares"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      setShares(val >= 1 ? val.toString() : '1');
                    }}
                    placeholder="Number of shares"
                  />
                  <p className="text-xs text-slate-500">
                    If they represent a family of 3, set this to 3
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end flex-shrink-0 pt-4 border-t bg-background sticky bottom-0">
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
