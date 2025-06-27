
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
  console.log('calculateDetailedBalances called with:', {
    tripsCount: trips.length,
    expensesKeys: Object.keys(allExpenses),
    participantsKeys: Object.keys(allParticipants),
    currentUserId
  });

  const owedByMeMap = new Map<string, PersonBalance>();
  const owedToMeMap = new Map<string, PersonBalance>();

  // Process each trip
  trips.forEach(trip => {
    console.log(`Processing trip ${trip.id} - ${trip.name}`);
    
    const tripExpenses = allExpenses[trip.id] || [];
    const tripParticipants = allParticipants[trip.id] || [];
    
    console.log(`Trip ${trip.name}: ${tripExpenses.length} expenses, ${tripParticipants.length} participants`);

    if (tripExpenses.length === 0 || tripParticipants.length === 0) {
      console.log(`Skipping trip ${trip.name} - no expenses or participants`);
      return;
    }

    // Find current user's participant ID for this trip
    const currentUserParticipant = tripParticipants.find(p => 
      p.userId === currentUserId || p.email === currentUserId
    );
    
    if (!currentUserParticipant) {
      console.log(`Current user not found in trip ${trip.name} participants`);
      return;
    }

    console.log(`Current user participant in ${trip.name}:`, currentUserParticipant);

    // Calculate balances for this trip using the same logic as the original balance calculator
    const balances: { [participantId: string]: number } = {};
    tripParticipants.forEach(p => {
      balances[p.id] = 0;
    });

    // Process each expense
    tripExpenses.forEach(expense => {
      const splitAmount = expense.amount / expense.splitBetween.length;
      console.log(`Processing expense ${expense.description}: $${expense.amount}, split ${splitAmount} between ${expense.splitBetween.length} people`);
      
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

    console.log(`Balances for trip ${trip.name}:`, balances);

    // Now calculate what current user owes to or is owed by each other participant
    const currentUserBalance = balances[currentUserParticipant.id] || 0;
    console.log(`Current user balance in ${trip.name}: ${currentUserBalance}`);

    tripParticipants.forEach(participant => {
      if (participant.id === currentUserParticipant.id) return;

      const participantBalance = balances[participant.id] || 0;
      
      // If current user has negative balance and other participant has positive balance,
      // then current user owes money to that participant
      if (currentUserBalance < 0 && participantBalance > 0) {
        const amountOwed = Math.min(Math.abs(currentUserBalance), participantBalance);
        
        if (amountOwed > 0.01) { // Skip negligible amounts
          console.log(`Current user owes ${participant.name} $${amountOwed} from trip ${trip.name}`);
          
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
          personBalance.totalAmount += amountOwed;
          personBalance.trips.push({ trip, amount: amountOwed });
        }
      }
      
      // If current user has positive balance and other participant has negative balance,
      // then that participant owes money to current user
      else if (currentUserBalance > 0 && participantBalance < 0) {
        const amountOwed = Math.min(currentUserBalance, Math.abs(participantBalance));
        
        if (amountOwed > 0.01) { // Skip negligible amounts
          console.log(`${participant.name} owes current user $${amountOwed} from trip ${trip.name}`);
          
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
          personBalance.totalAmount += amountOwed;
          personBalance.trips.push({ trip, amount: amountOwed });
        }
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

  const result = {
    owedByMe: roundBalances(Array.from(owedByMeMap.values())),
    owedToMe: roundBalances(Array.from(owedToMeMap.values()))
  };

  console.log('Final detailed balances result:', result);
  return result;
};
