import { Expense, Trip } from '@/types/trip';
import { format, subDays, subMonths, subYears, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export type DateRangePreset = '30days' | '60days' | '90days' | '1year' | 'custom';

interface PersonalExpenseData {
  expense: Expense;
  tripName: string;
  tripBaseCurrency: string;
  youPaid: number;
  yourShare: number;
  net: number;
}

export const getDateRange = (preset: DateRangePreset, customStart?: Date, customEnd?: Date) => {
  const now = new Date();
  const endDate = startOfDay(now);
  
  switch (preset) {
    case '30days':
      return { start: subDays(endDate, 30), end: now };
    case '60days':
      return { start: subDays(endDate, 60), end: now };
    case '90days':
      return { start: subDays(endDate, 90), end: now };
    case '1year':
      return { start: subYears(endDate, 1), end: now };
    case 'custom':
      return { 
        start: customStart || subDays(endDate, 30), 
        end: customEnd || now 
      };
    default:
      return { start: subDays(endDate, 30), end: now };
  }
};

export const fetchPersonalExpenses = async (
  userId: string,
  userEmail: string,
  startDate: Date,
  endDate: Date
): Promise<PersonalExpenseData[]> => {
  // First, find all participant records for this user
  const { data: userParticipants, error: participantsError } = await supabase
    .from('participants')
    .select('id')
    .or(`user_id.eq.${userId},email.eq.${userEmail}`);

  if (participantsError) throw participantsError;

  const userParticipantIds = userParticipants?.map(p => p.id) || [];
  
  if (userParticipantIds.length === 0) {
    return [];
  }

  // Get all expenses where user is involved (paid or in split)
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('*, trips!inner(name, base_currency)')
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString())
    .order('date', { ascending: false });

  if (expensesError) throw expensesError;

  // Filter expenses where user is involved
  const userExpenses: PersonalExpenseData[] = [];

  for (const expense of expenses || []) {
    const isPayer = userParticipantIds.includes(expense.paid_by);
    const isInSplit = expense.split_between.some((id: string) => userParticipantIds.includes(id));
    
    if (!isPayer && !isInSplit) continue;

    // Get participant shares for this expense
    const { data: tripParticipants } = await supabase
      .from('trip_participants')
      .select('participant_id, shares, additional_amount')
      .eq('trip_id', expense.trip_id);

    const sharesMap: { [id: string]: { shares: number; additional_amount: number } } = {};
    tripParticipants?.forEach(tp => {
      sharesMap[tp.participant_id] = {
        shares: tp.shares || 1,
        additional_amount: tp.additional_amount || 0
      };
    });

    // Calculate user's share
    let yourShare = 0;
    const userParticipantInSplit = expense.split_between.find((id: string) => userParticipantIds.includes(id));
    
    if (userParticipantInSplit) {
      if (expense.transaction_shares) {
        const transactionShares = expense.transaction_shares as { [key: string]: number };
        const totalShares = expense.split_between.reduce((sum: number, id: string) => 
          sum + (transactionShares[id] || 1), 0
        );
        const userShares = transactionShares[userParticipantInSplit] || 1;
        yourShare = (expense.amount * userShares) / totalShares;
      } else {
        const participantsInExpense = expense.split_between
          .filter((id: string) => sharesMap[id])
          .map((id: string) => ({ id, ...sharesMap[id] }));
        
        const totalShares = participantsInExpense.reduce((sum, p) => sum + p.shares, 0);
        const additionalAmounts = participantsInExpense.reduce((sum, p) => sum + p.additional_amount, 0);
        const shareableAmount = expense.amount - additionalAmounts;
        
        const userData = sharesMap[userParticipantInSplit];
        if (userData) {
          yourShare = shareableAmount > 0 
            ? (shareableAmount * userData.shares) / totalShares + userData.additional_amount
            : userData.additional_amount;
        }
      }
    }

    const youPaid = isPayer ? expense.amount : 0;
    const net = youPaid - yourShare;

    userExpenses.push({
      expense: {
        id: expense.id,
        tripId: expense.trip_id,
        description: expense.description,
        amount: expense.amount,
        paidBy: expense.paid_by,
        splitBetween: expense.split_between,
        transactionShares: expense.transaction_shares as { [key: string]: number } | undefined,
        category: expense.category,
        date: expense.date,
        receipt: expense.receipt,
        originalCurrency: expense.original_currency,
        originalAmount: expense.original_amount,
        exchangeRate: expense.exchange_rate,
        createdAt: expense.created_at,
        updatedAt: expense.updated_at,
      },
      tripName: (expense.trips as any).name,
      tripBaseCurrency: (expense.trips as any).base_currency || 'USD',
      youPaid,
      yourShare,
      net,
    });
  }

  return userExpenses;
};

export const exportPersonalExpensesToCsv = (expenses: PersonalExpenseData[], userName: string) => {
  if (expenses.length === 0) {
    return;
  }

  const headers = ['Date', 'Trip', 'Description', 'Category', 'Cost', 'Currency', 'You Paid', 'Your Share', 'Net'];
  
  const rows: string[][] = [];
  const totalsByCurrency: { [currency: string]: { paid: number; share: number; net: number } } = {};

  expenses.forEach(({ expense, tripName, tripBaseCurrency, youPaid, yourShare, net }) => {
    const currency = expense.originalCurrency || tripBaseCurrency;
    const amount = expense.originalAmount || expense.amount;
    
    // Track totals by currency
    if (!totalsByCurrency[currency]) {
      totalsByCurrency[currency] = { paid: 0, share: 0, net: 0 };
    }
    totalsByCurrency[currency].paid += youPaid;
    totalsByCurrency[currency].share += yourShare;
    totalsByCurrency[currency].net += net;

    rows.push([
      format(new Date(expense.date), 'M/d/yy'),
      tripName,
      expense.description,
      expense.category,
      amount.toFixed(2),
      currency,
      youPaid > 0 ? youPaid.toFixed(2) : '',
      yourShare.toFixed(2),
      net >= 0 ? `+${net.toFixed(2)}` : net.toFixed(2),
    ]);
  });

  // Add empty row before totals
  rows.push(Array(headers.length).fill(''));

  // Add total rows per currency
  Object.entries(totalsByCurrency).forEach(([currency, totals]) => {
    rows.push([
      '',
      'TOTALS',
      '',
      '',
      '',
      currency,
      totals.paid.toFixed(2),
      totals.share.toFixed(2),
      totals.net >= 0 ? `+${totals.net.toFixed(2)}` : totals.net.toFixed(2),
    ]);
  });

  // Convert to CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
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
  
  const sanitizedName = userName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.setAttribute('href', url);
  link.setAttribute('download', `${sanitizedName}_expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
