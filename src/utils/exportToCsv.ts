import { Expense, Participant, ParticipantWithShares } from '@/types/trip';
import { format } from 'date-fns';

interface ExportData {
  expenses: Expense[];
  participants: (Participant | ParticipantWithShares)[];
  tripName: string;
  baseCurrency: string;
}

interface ParticipantBalance {
  [participantId: string]: {
    [currency: string]: number;
  };
}

export const exportTripExpensesToCsv = ({ expenses, participants, tripName, baseCurrency }: ExportData) => {
  if (expenses.length === 0) {
    return;
  }

  // Create a map of participant IDs to names
  const participantMap = new Map(participants.map(p => [p.id, p.name]));
  
  // Track balances per participant per currency
  const balances: ParticipantBalance = {};
  participants.forEach(p => {
    balances[p.id] = {};
  });

  // Build header row
  const participantNames = participants.map(p => p.name);
  const headers = ['Date', 'Description', 'Category', 'Cost', 'Currency', ...participantNames];
  
  // Build expense rows and calculate balances
  const rows: string[][] = [];
  
  expenses.forEach(expense => {
    const currency = expense.originalCurrency || baseCurrency;
    const amount = expense.originalAmount || expense.amount;
    
    // Calculate shares for this expense
    const splitParticipants = expense.splitBetween;
    const totalShares = splitParticipants.reduce((sum, pId) => {
      const customShares = expense.transactionShares?.[pId];
      return sum + (customShares ?? 1);
    }, 0);
    
    const perShareAmount = totalShares > 0 ? amount / totalShares : 0;
    
    // Create a row for each expense
    const row: string[] = [
      format(new Date(expense.date), 'M/d/yy'),
      expense.description,
      expense.category,
      amount.toString(),
      currency,
    ];
    
    // Calculate each participant's share/balance for this expense
    participants.forEach(p => {
      const participantShares = expense.transactionShares?.[p.id] ?? 
        (splitParticipants.includes(p.id) ? 1 : 0);
      const owedAmount = perShareAmount * participantShares;
      
      let balance = 0;
      
      if (p.id === expense.paidBy) {
        // Payer: they paid the full amount, so they are owed (amount - their share)
        balance = -(amount - owedAmount); // Negative means they're owed money
      } else if (splitParticipants.includes(p.id)) {
        // Non-payer who owes: positive means they owe
        balance = owedAmount;
      }
      
      // Track cumulative balance by currency
      if (!balances[p.id][currency]) {
        balances[p.id][currency] = 0;
      }
      balances[p.id][currency] += balance;
      
      row.push(balance !== 0 ? balance.toFixed(0) : '');
    });
    
    rows.push(row);
  });
  
  // Add empty row before totals
  rows.push(Array(headers.length).fill(''));
  
  // Add total balance rows per currency
  const currencies = new Set<string>();
  expenses.forEach(e => currencies.add(e.originalCurrency || baseCurrency));
  
  currencies.forEach(currency => {
    const totalRow: string[] = [
      format(new Date(), 'M/d/yy'),
      'Total balance',
      '',
      '',
      currency,
    ];
    
    participants.forEach(p => {
      const balance = balances[p.id][currency] || 0;
      totalRow.push(balance !== 0 ? balance.toFixed(0) : '');
    });
    
    rows.push(totalRow);
  });
  
  // Convert to CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // Escape cells containing commas or quotes
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','))
  ].join('\n');
  
  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const sanitizedTripName = tripName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.setAttribute('href', url);
  link.setAttribute('download', `${sanitizedTripName}_expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
