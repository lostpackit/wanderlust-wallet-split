
import { Expense, Participant, Balance } from '@/types/trip';

export const calculateBalances = (
  expenses: Expense[],
  participants: (Participant & { role: string })[]
): Balance[] => {
  const balances: { [participantId: string]: Balance } = {};

  // Initialize balances for all participants
  participants.forEach(participant => {
    balances[participant.id] = {
      participantId: participant.id,
      owes: {},
      isOwed: {},
      netBalance: 0,
    };
  });

  // Process each expense
  expenses.forEach(expense => {
    const splitAmount = expense.amount / expense.splitBetween.length;
    const paidBy = expense.paidBy;

    expense.splitBetween.forEach(participantId => {
      if (participantId !== paidBy) {
        // This participant owes money to the person who paid
        if (!balances[participantId].owes[paidBy]) {
          balances[participantId].owes[paidBy] = 0;
        }
        balances[participantId].owes[paidBy] += splitAmount;

        // The person who paid is owed money by this participant
        if (!balances[paidBy].isOwed[participantId]) {
          balances[paidBy].isOwed[participantId] = 0;
        }
        balances[paidBy].isOwed[participantId] += splitAmount;
      }
    });
  });

  // Calculate net balances
  Object.keys(balances).forEach(participantId => {
    const balance = balances[participantId];
    const totalOwed = Object.values(balance.isOwed).reduce((sum, amount) => sum + amount, 0);
    const totalOwes = Object.values(balance.owes).reduce((sum, amount) => sum + amount, 0);
    balance.netBalance = totalOwed - totalOwes;
  });

  return Object.values(balances);
};

export const getSettlementSuggestions = (balances: Balance[], participants: (Participant & { role: string })[]) => {
  const settlements: { from: string; to: string; amount: number }[] = [];
  
  // Create copies of balances to work with
  const workingBalances = { ...balances.reduce((acc, balance) => {
    acc[balance.participantId] = balance.netBalance;
    return acc;
  }, {} as { [key: string]: number }) };

  const getParticipantName = (id: string) => {
    return participants.find(p => p.id === id)?.name || 'Unknown';
  };

  // Sort participants by balance (debtors first, creditors last)
  const sortedParticipants = Object.entries(workingBalances)
    .sort(([, a], [, b]) => a - b);

  let debtorIndex = 0;
  let creditorIndex = sortedParticipants.length - 1;

  while (debtorIndex < creditorIndex) {
    const [debtorId, debtorBalance] = sortedParticipants[debtorIndex];
    const [creditorId, creditorBalance] = sortedParticipants[creditorIndex];

    if (debtorBalance >= 0) {
      debtorIndex++;
      continue;
    }

    if (creditorBalance <= 0) {
      creditorIndex--;
      continue;
    }

    const settlementAmount = Math.min(-debtorBalance, creditorBalance);
    
    settlements.push({
      from: debtorId,
      to: creditorId,
      amount: settlementAmount,
    });

    // Update working balances
    sortedParticipants[debtorIndex][1] += settlementAmount;
    sortedParticipants[creditorIndex][1] -= settlementAmount;

    if (sortedParticipants[debtorIndex][1] === 0) {
      debtorIndex++;
    }
    if (sortedParticipants[creditorIndex][1] === 0) {
      creditorIndex--;
    }
  }

  return settlements.map(settlement => ({
    ...settlement,
    fromName: getParticipantName(settlement.from),
    toName: getParticipantName(settlement.to),
  }));
};
