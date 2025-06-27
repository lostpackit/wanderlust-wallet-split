
export interface Participant {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  userId?: string; // Link to authenticated user
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  settlementDeadline: string;
  createdBy: string; // user id
  createdAt: string;
  updatedAt: string;
}

export interface TripParticipant {
  id: string;
  tripId: string;
  userId: string;
  participantId: string;
  role: 'admin' | 'participant';
  shares: number; // Number of shares this participant represents
  joinedAt: string;
}

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  paidBy: string; // participant id
  splitBetween: string[]; // array of participant ids
  category: string;
  date: string;
  receipt?: string; // file path or url
  createdAt: string;
  updatedAt: string;
}

export interface Balance {
  participantId: string;
  owes: { [participantId: string]: number };
  isOwed: { [participantId: string]: number };
  netBalance: number;
}

export interface UserDashboardData {
  totalOwed: number;
  totalOwing: number;
  activeTrips: Trip[];
  recentExpenses: Expense[];
}
