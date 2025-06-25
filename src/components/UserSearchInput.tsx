
import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Search, User } from "lucide-react";
import { useUserSearch, UserProfile } from "@/hooks/useUserSearch";

interface UserSearchInputProps {
  onSelectUser: (user: UserProfile) => void;
  placeholder?: string;
}

const UserSearchInput = ({ onSelectUser, placeholder = "Search for users by email or name..." }: UserSearchInputProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { users, isLoading } = useUserSearch(searchTerm);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUser = (user: UserProfile) => {
    onSelectUser(user);
    setSearchTerm('');
    setShowResults(false);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="pl-10"
        />
      </div>

      {showResults && searchTerm.length >= 2 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto">
          <CardContent className="p-2">
            {isLoading ? (
              <div className="p-4 text-center text-slate-500">Searching...</div>
            ) : users.length === 0 ? (
              <div className="p-4 text-center text-slate-500">No users found</div>
            ) : (
              <div className="space-y-1">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">
                        {user.full_name || user.email}
                      </p>
                      {user.full_name && (
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      )}
                    </div>
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserSearchInput;
