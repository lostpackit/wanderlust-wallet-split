import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PieChartIcon, BarChart3 } from 'lucide-react';
import { Expense } from '@/types/trip';

// Category colors - vibrant and distinct
const CATEGORY_COLORS: { [key: string]: string } = {
  'Food & Dining': '#f97316',    // Orange
  'Transportation': '#3b82f6',    // Blue
  'Accommodation': '#8b5cf6',     // Purple
  'Entertainment': '#ec4899',     // Pink
  'Activities': '#ec4899',        // Pink (alias)
  'Shopping': '#10b981',          // Green
  'Other': '#6b7280',             // Gray
  'Groceries': '#84cc16',         // Lime
};

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
}

interface ExpenseCategoryChartProps {
  expenses: Expense[];
  variant?: 'pie' | 'bar';
  title?: string;
  className?: string;
}

const ExpenseCategoryChart = ({ 
  expenses, 
  variant = 'pie', 
  title,
  className = ''
}: ExpenseCategoryChartProps) => {
  // Calculate totals by category
  const categoryTotals = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Other';
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {} as { [key: string]: number });

  const totalAmount = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  // Convert to chart data format and sort by value
  const chartData: CategoryData[] = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      percentage: totalAmount > 0 ? Math.round((value / totalAmount) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  if (expenses.length === 0 || chartData.length === 0) {
    return (
      <Card className={`bg-white/80 backdrop-blur-sm border-0 shadow-lg ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            {variant === 'pie' ? <PieChartIcon className="w-5 h-5 text-blue-600" /> : <BarChart3 className="w-5 h-5 text-blue-600" />}
            {title || 'Spending by Category'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-slate-500">
            No expense data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-medium text-slate-800">{data.name}</p>
          <p className="text-slate-600">{formatCurrency(data.value)}</p>
          <p className="text-sm text-slate-500">{data.percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show label for small slices
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className={`bg-white/80 backdrop-blur-sm border-0 shadow-lg ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          {variant === 'pie' ? <PieChartIcon className="w-5 h-5 text-blue-600" /> : <BarChart3 className="w-5 h-5 text-blue-600" />}
          {title || 'Spending by Category'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {variant === 'pie' ? (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS['Other']} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value: string) => <span className="text-slate-700">{value}</span>}
                />
              </PieChart>
            ) : (
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis 
                  type="number" 
                  tickFormatter={(value) => `$${value}`}
                  axisLine={false}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  width={75}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  radius={[0, 4, 4, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS['Other']} 
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Summary below chart */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Total Expenses</span>
            <span className="font-bold text-slate-800">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-slate-600">Categories</span>
            <span className="font-medium text-slate-700">{chartData.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseCategoryChart;
