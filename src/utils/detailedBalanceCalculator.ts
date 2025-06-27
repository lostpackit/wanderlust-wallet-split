
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
  allParticipants: { [tripId: string]: (Participant & { role: string; shares?: number })[] },
  currentUserId: string,
  currentUserEmail: string
): DetailedBalances => {
  console.log('calculateDetailedBalances called with:', {
    tripsCount: trips.length,
    expensesKeys: Object.keys(allExpenses),
    participantsKeys: Object.keys(allParticipants),
    currentUserId,
    currentUserEmail
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
    // Try multiple matching strategies
    let currentUserParticipant = tripParticipants.find(p => 
      p.userId === currentUserId
    );
    
    // If not found by userId, try by email
    if (!currentUserParticipant) {
      currentUserParticipant = tripParticipants.find(p => 
        p.email === currentUserEmail
      );
    }
    
    // If still not found but user is the creator, try to find any participant with matching email
    if (!currentUserParticipant && trip.createdBy === currentUserId) {
      currentUserParticipant = tripParticipants.find(p => 
        p.email === currentUserEmail
      );
    }
    
    if (!currentUserParticipant) {
      console.log(`Current user not found in trip ${trip.name} participants`);
      console.log('Available participants:', tripParticipants.map(p => ({ id: p.id, email: p.email, userId: p.userId })));
      return;
    }

    console.log(`Current user participant in ${trip.name}:`, currentUserParticipant);

    // Calculate balances for this trip using shares-based logic
    const balances: { [participantId: string]: number } = {};
    tripParticipants.forEach(p => {
      balances[p.id] = 0;
    });

    // Process each expense
    tripExpenses.forEach(expense => {
      // Calculate shares-based split
      const participantsInExpense = tripParticipants.filter(p => 
        expense.splitBetween.includes(p.id)
      );
      
      const totalSharesInExpense = participantsInExpense.reduce((sum, p) => 
        sum + (p.shares || 1), 0
      );
      
      console.log(`Processing expense ${expense.description}: $${expense.amount}, total shares: ${totalSharesInExpense}`);
      
      // The person who paid gets credited
      if (balances.hasOwnProperty(expense.paidBy)) {
        balances[expense.paidBy] += expense.amount;
      }
      
      // Everyone who should split it gets debited based on their shares
      expense.splitBetween.forEach(participantId => {
        const participant = tripParticipants.find(p => p.id === participantId);
        if (participant && balances.hasOwnProperty(participantId)) {
          const participantShares = participant.shares || 1;
          const shareAmount = (expense.amount * participantShares) / totalSharesInExpense;
          balances[participantId] -= shareAmount;
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
      let amountOwed = 0;
      
      // Determine the settlement amount between current user and this participant
      if (currentUserBalance < 0 && participantBalance > 0) {
        // Current user owes money to this participant
        amountOwed = Math.min(Math.abs(currentUserBalance), participantBalance);
        
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
      } else if (currentUserBalance > 0 && participantBalance < 0) {
        // This participant owes money to current user
        amountOwed = Math.min(currentUserBalance, Math.abs(participantBalance));
        
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
