
import { Trip, Participant, Expense } from '@/types/trip';

export interface Payment {
  id: string;
  from_user_id: string;
  to_user_id: string;
  trip_id: string;
  amount: number;
  status: string;
}

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
  allExpenses: Expense[];
}

export const calculateDetailedBalances = (
  trips: Trip[],
  allExpenses: { [tripId: string]: Expense[] },
  allParticipants: { [tripId: string]: (Participant & { role: string; shares?: number; additional_amount?: number })[] },
  allPayments: { [tripId: string]: Payment[] },
  currentUserId: string,
  currentUserEmail: string
): DetailedBalances => {
  console.log('calculateDetailedBalances called with:', {
    tripsCount: trips.length,
    expensesKeys: Object.keys(allExpenses),
    participantsKeys: Object.keys(allParticipants),
    paymentsKeys: Object.keys(allPayments),
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

    // Calculate balances for this trip using shares-based logic with additional amounts
    const balances: { [participantId: string]: number } = {};
    tripParticipants.forEach(p => {
      balances[p.id] = 0;
    });

    // Calculate balances for this trip using shares-based logic with additional amounts

    // Process each expense
    tripExpenses.forEach(expense => {
      // Calculate shares-based split
      const participantsInExpense = tripParticipants.filter(p => 
        expense.splitBetween.includes(p.id)
      );
      
      // The person who paid gets credited for the full amount
      if (balances.hasOwnProperty(expense.paidBy)) {
        balances[expense.paidBy] += expense.amount;
      }
      
      if (expense.transactionShares) {
        // Use transaction-specific shares
        const transactionShares = expense.transactionShares as { [key: string]: number };
        const totalTransactionShares = participantsInExpense.reduce((sum, p) => 
          sum + (transactionShares[p.id] || 1), 0
        );
        
        expense.splitBetween.forEach(participantId => {
          if (balances.hasOwnProperty(participantId)) {
            const share = transactionShares[participantId] || 1;
            const participantAmount = expense.amount * share / totalTransactionShares;
            balances[participantId] -= participantAmount;
          }
        });
      } else {
        // Use default trip shares with additional amounts
        const totalSharesInExpense = participantsInExpense.reduce((sum, p) => 
          sum + (p.shares || 1), 0
        );
        
        const additionalAmountsInExpense = participantsInExpense.reduce((sum, p) => 
          sum + (p.additional_amount || 0), 0
        );
        
        // Amount available for shares after additional amounts
        const shareableAmount = expense.amount - additionalAmountsInExpense;
        
        // Everyone who should split it gets debited based on their shares + additional amounts
        expense.splitBetween.forEach(participantId => {
          const participant = tripParticipants.find(p => p.id === participantId);
          if (participant && balances.hasOwnProperty(participantId)) {
            const participantShares = participant.shares || 1;
            const shareAmount = shareableAmount > 0 ? (shareableAmount * participantShares) / totalSharesInExpense : 0;
            const additionalAmount = participant.additional_amount || 0;
            balances[participantId] -= (shareAmount + additionalAmount);
          }
        });
      }
    });

    // Apply confirmed/settled payments to adjust balances
    const tripPayments = allPayments[trip.id] || [];
    
    // Build user ID to participant ID mapping
    const userToParticipantMap: { [userId: string]: string } = {};
    tripParticipants.forEach(p => {
      if (p.userId) {
        userToParticipantMap[p.userId] = p.id;
      }
    });

    tripPayments.forEach(payment => {
      if (payment.status === 'confirmed' || payment.status === 'settled') {
        const fromParticipantId = userToParticipantMap[payment.from_user_id];
        const toParticipantId = userToParticipantMap[payment.to_user_id];
        
        if (fromParticipantId && toParticipantId) {
          // Payment: 'from' paid money to 'to'
          // This increases 'from' balance (they paid, so less in debt)
          if (balances.hasOwnProperty(fromParticipantId)) {
            balances[fromParticipantId] += payment.amount;
          }
          // This decreases 'to' balance (they received, so less owed to them)
          if (balances.hasOwnProperty(toParticipantId)) {
            balances[toParticipantId] -= payment.amount;
          }
        }
      }
    });

    console.log(`Balances for trip ${trip.name} (after payments):`, balances);

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

  // Flatten all expenses into a single array
  const flattenedExpenses: Expense[] = Object.values(allExpenses).flat();

  const result: DetailedBalances = {
    owedByMe: roundBalances(Array.from(owedByMeMap.values())),
    owedToMe: roundBalances(Array.from(owedToMeMap.values())),
    allExpenses: flattenedExpenses,
  };

  console.log('Final detailed balances result:', result);
  return result;
};
