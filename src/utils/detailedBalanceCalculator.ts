
import { Trip, Participant, Expense } from '@/types/trip';

export interface PersonBalance {
  participantId: string;
  participantName: string;
  participantEmail: string;
  totalAmount: number;
  trips: {
    trip: Trip;
    amount: number;
  }[];
}

export interface DetailedBalances {
  owedByMe: PersonBalance[];
  owedToMe: PersonBalance[];
}

export const calculateDetailedBalances = (
  trips: Trip[],
  allExpenses: { [tripId: string]: Expense[] },
  allParticipants: { [tripId: string]: (Participant & { role: string })[] },
  currentUserId: string
): DetailedBalances => {
  const owedByMeMap = new Map<string, PersonBalance>();
  const owedToMeMap = new Map<string, PersonBalance>();

  // Process each trip
  trips.forEach(trip => {
    const tripExpenses = allExpenses[trip.id] || [];
    const tripParticipants = allParticipants[trip.id] || [];
    
    if (tripExpenses.length === 0 || tripParticipants.length === 0) {
      return;
    }

    // Find current user's participant ID for this trip
    const currentUserParticipant = tripParticipants.find(p => 
      p.userId === currentUserId || p.email === currentUserId
    );
    
    if (!currentUserParticipant) {
      return;
    }

    // Calculate balances for this trip
    const balances: { [participantId: string]: number } = {};
    tripParticipants.forEach(p => {
      balances[p.id] = 0;
    });

    // Process each expense
    tripExpenses.forEach(expense => {
      const splitAmount = expense.amount / expense.splitBetween.length;
      
      // The person who paid gets credited
      if (balances.hasOwnProperty(expense.paidBy)) {
        balances[expense.paidBy] += expense.amount;
      }
      
      // Everyone who should split it gets debited
      expense.splitBetween.forEach(participantId => {
        if (balances.hasOwnProperty(participantId)) {
          balances[participantId] -= splitAmount;
        }
      });
    });

    // Get current user's balance for this trip
    const currentUserBalance = balances[currentUserParticipant.id] || 0;

    // Process balances with other participants
    tripParticipants.forEach(participant => {
      if (participant.id === currentUserParticipant.id) return;

      const participantBalance = balances[participant.id] || 0;
      const netBalance = currentUserBalance - participantBalance;

      if (Math.abs(netBalance) < 0.01) return; // Skip negligible amounts

      if (netBalance < 0) {
        // Current user owes this participant
        const amount = Math.abs(netBalance);
        
        if (!owedByMeMap.has(participant.id)) {
          owedByMeMap.set(participant.id, {
            participantId: participant.id,
            participantName: participant.name,
            participantEmail: participant.email,
            totalAmount: 0,
            trips: []
          });
        }
        
        const personBalance = owedByMeMap.get(participant.id)!;
        personBalance.totalAmount += amount;
        personBalance.trips.push({ trip, amount });
      } else {
        // This participant owes current user
        const amount = netBalance;
        
        if (!owedToMeMap.has(participant.id)) {
          owedToMeMap.set(participant.id, {
            participantId: participant.id,
            participantName: participant.name,
            participantEmail: participant.email,
            totalAmount: 0,
            trips: []
          });
        }
        
        const personBalance = owedToMeMap.get(participant.id)!;
        personBalance.totalAmount += amount;
        personBalance.trips.push({ trip, amount });
      }
    });
  });

  // Round totals to 2 decimal places
  const roundBalances = (balances: PersonBalance[]) => 
    balances.map(balance => ({
      ...balance,
      totalAmount: Math.round(balance.totalAmount * 100) / 100,
      trips: balance.trips.map(tripBalance => ({
        ...tripBalance,
        amount: Math.round(tripBalance.amount * 100) / 100
      }))
    }));

  return {
    owedByMe: roundBalances(Array.from(owedByMeMap.values())),
    owedToMe: roundBalances(Array.from(owedToMeMap.values()))
  };
};
