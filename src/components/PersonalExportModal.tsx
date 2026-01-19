import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, CalendarIcon, Loader2, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { 
  DateRangePreset, 
  getDateRange, 
  fetchPersonalExpenses, 
  exportPersonalExpensesToCsv 
} from "@/utils/exportPersonalExpenses";

interface PersonalExportModalProps {
  trigger?: React.ReactNode;
  variant?: 'default' | 'compact';
}

const PersonalExportModal = ({ trigger, variant = 'default' }: PersonalExportModalProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('30days');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [isExporting, setIsExporting] = useState(false);

  const presets: { value: DateRangePreset; label: string }[] = [
    { value: '30days', label: 'Last 30 Days' },
    { value: '60days', label: 'Last 60 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: '1year', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const handleExport = async () => {
    if (!user) {
      toast.error('Please sign in to export expenses');
      return;
    }

    setIsExporting(true);
    try {
      const { start, end } = getDateRange(selectedPreset, customStartDate, customEndDate);
      
      const expenses = await fetchPersonalExpenses(
        user.id,
        user.email || '',
        start,
        end
      );

      if (expenses.length === 0) {
        toast.info('No expenses found in the selected date range');
        return;
      }

      const userName = profile?.full_name || user.email?.split('@')[0] || 'user';
      exportPersonalExpensesToCsv(expenses, userName);
      
      toast.success(`Exported ${expenses.length} expenses to CSV`);
      setOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export expenses');
    } finally {
      setIsExporting(false);
    }
  };

  const defaultTrigger = variant === 'compact' ? (
    <Button variant="outline" size="sm" className="gap-2">
      <Download className="w-4 h-4" />
      Export
    </Button>
  ) : (
    <Button variant="outline" className="gap-2 bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg">
      <FileSpreadsheet className="w-4 h-4" />
      Export My Expenses
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Export My Expenses
          </DialogTitle>
          <DialogDescription>
            Export all your expenses across trips to a CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Range Presets */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.value}
                  variant={selectedPreset === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPreset(preset.value)}
                  className="w-full"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          {selectedPreset === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Export Info */}
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
            <p>The export includes:</p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
              <li>All expenses you paid for</li>
              <li>All expenses you're included in</li>
              <li>Your share and net balance per expense</li>
              <li>Totals by currency</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || (selectedPreset === 'custom' && (!customStartDate || !customEndDate))}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonalExportModal;
