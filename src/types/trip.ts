
export interface Participant {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string; // participant id
  splitBetween: string[]; // array of participant ids
  category: string;
  date: string;
  receipt?: string; // base64 encoded image or url
}

export interface Balance {
  participantId: string;
  owes: { [participantId: string]: number };
  isOwed: { [participantId: string]: number };
  netBalance: number;
}
