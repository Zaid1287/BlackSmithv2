import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Receipt, Eye, TrendingDown, TrendingUp, Calculator } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAuthHeaders } from '@/lib/auth';

interface JourneyExpenseBreakdownProps {
  journeyId: number;
  journeyData?: any;
}

export default function JourneyExpenseBreakdown({ journeyId, journeyData }: JourneyExpenseBreakdownProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: [`/api/journeys/${journeyId}/expenses`],
    queryFn: async () => {
      const response = await fetch(`/api/journeys/${journeyId}/expenses`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
    enabled: open,
  });

  // Function to get translated expense category name
  const getTranslatedCategory = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'fuel': t('fuel'),
      'food': t('food'),
      'maintenance': t('maintenance'),
      'loading': t('loading'),
      'rope': t('rope'),
      'rto': t('rto'),
      'hyd_unloading': t('hydUnloading'),
      'nzb_unloading': t('nzbUnloading'),
      'miscellaneous': t('miscellaneous'),
      'mechanical': t('mechanical'),
      'electrical': t('electrical'),
      'body_works': t('bodyWorks'),
      'tires_air': t('tiresAir'),
      'weighment': t('weighment'),
      'adblue': t('adblue'),
      'fines': t('fines'),
      'driver_fees': t('driverFees'),
      'tire_grease': t('tireGrease'),
      'tire_change': 'Tire Change',
      'tire_greasing': 'Tire Greasing',
      'toll': t('toll'),
      'top_up': t('topUp'),
      'hyd_inward': 'HYD Inward'
    };
    
    return categoryMap[category] || category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Separate expenses into categories
  const regularExpenses = expenses.filter((exp: any) => 
    exp.category !== 'hyd_inward' && exp.category !== 'top_up'
  );
  
  const revenueItems = expenses.filter((exp: any) => 
    exp.category === 'hyd_inward' || exp.category === 'top_up'
  );

  // Group expenses by category
  const expensesByCategory = regularExpenses.reduce((acc: any, expense: any) => {
    const category = expense.category;
    if (!acc[category]) {
      acc[category] = {
        items: [],
        total: 0,
        count: 0
      };
    }
    acc[category].items.push(expense);
    acc[category].total += parseFloat(expense.amount);
    acc[category].count += 1;
    return acc;
  }, {});

  // Calculate totals
  const totalExpenses = regularExpenses.reduce((sum: number, exp: any) => 
    sum + parseFloat(exp.amount), 0
  );
  
  const totalRevenue = revenueItems.reduce((sum: number, exp: any) => 
    sum + parseFloat(exp.amount), 0
  );

  const journeyRevenue = (parseFloat(journeyData?.pouch || '0') + 
                         parseFloat(journeyData?.security || '0') + totalRevenue);
  
  const netProfit = journeyRevenue - totalExpenses;

  // Define category colors for visual distinction
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      fuel: 'bg-red-100 text-red-800',
      food: 'bg-orange-100 text-orange-800',
      loading: 'bg-blue-100 text-blue-800',
      rto: 'bg-green-100 text-green-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      mechanical: 'bg-purple-100 text-purple-800',
      electrical: 'bg-indigo-100 text-indigo-800',
      rope: 'bg-teal-100 text-teal-800',
      weighment: 'bg-pink-100 text-pink-800',
      default: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.default;
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Calculate total of all expenses (including revenue items)
  const grandTotal = expenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Receipt className="w-4 h-4" />
          View Breakdown
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Journey Expense Breakdown - ID: {journeyId}
            </div>
            <div className="text-lg font-bold text-blue-600">
              Total: ₹{grandTotal.toLocaleString()}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Expense Categories Only */}
              {Object.keys(expensesByCategory).length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Expense Categories</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(expensesByCategory)
                      .sort(([,a], [,b]) => b.total - a.total)
                      .map(([category, data]: [string, any]) => (
                      <div key={category} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge className={getCategoryColor(category)}>
                              {getTranslatedCategory(category)}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {data.count} transaction{data.count > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg">
                              ₹{data.total.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {((data.total / totalExpenses) * 100).toFixed(1)}% of total
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {data.items.map((expense: any) => (
                            <div key={expense.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                              <div className="flex-1">
                                <p className="text-sm font-medium">₹{parseFloat(expense.amount).toLocaleString()}</p>
                                {expense.description && (
                                  <p className="text-xs text-gray-600">{expense.description}</p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDate(expense.timestamp)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Receipt className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No expenses recorded for this journey yet.</p>
                  </CardContent>
                </Card>
              )}

              {/* Revenue Items (if any) */}
              {revenueItems.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-700">Additional Revenue</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {revenueItems.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-green-50 rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              {getTranslatedCategory(item.category)}
                            </Badge>
                            <span className="font-medium text-green-700">
                              +₹{parseFloat(item.amount).toLocaleString()}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(item.timestamp)}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}