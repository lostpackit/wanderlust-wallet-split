
export interface Participant {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  userId?: string; // Link to authenticated user
  user_id?: string; // Database field name
}

export interface ParticipantWithShares extends Participant {
  role: string;
  shares: number;
  additional_amount?: number;
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  settlementDeadline: string;
  baseCurrency?: string; // base currency for the trip
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
  additional_amount?: number; // Fixed additional amount for this participant
  joinedAt: string;
}

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  paidBy: string; // participant id
  splitBetween: string[]; // array of participant ids
  transactionShares?: { [participantId: string]: number }; // per-transaction shares
  category: string;
  date: string;
  receipt?: string; // file path or url
  originalCurrency?: string; // original currency from receipt
  originalAmount?: number; // original amount before conversion
  exchangeRate?: number; // exchange rate used for conversion
  receiptData?: any; // OCR extracted data
  expenseSource?: 'manual' | 'scanned_receipt'; // tracking source
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
