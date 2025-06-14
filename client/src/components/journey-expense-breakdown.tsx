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
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Journey Expense Breakdown - ID: {journeyId}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Total Revenue</p>
                        <p className="text-2xl font-bold">₹{journeyRevenue.toLocaleString()}</p>
                        <p className="text-xs opacity-75">
                          Pouch: ₹{parseFloat(journeyData?.pouch || '0').toLocaleString()} | 
                          Security: ₹{parseFloat(journeyData?.security || '0').toLocaleString()}
                          {totalRevenue > 0 && ` | Extra: ₹${totalRevenue.toLocaleString()}`}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Total Expenses</p>
                        <p className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</p>
                        <p className="text-xs opacity-75">{regularExpenses.length} transactions</p>
                      </div>
                      <TrendingDown className="w-8 h-8" />
                    </div>
                  </CardContent>
                </Card>

                <Card className={`${netProfit >= 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-gray-500 to-gray-600'} text-white`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Net Profit</p>
                        <p className="text-2xl font-bold">₹{netProfit.toLocaleString()}</p>
                        <p className="text-xs opacity-75">
                          {netProfit >= 0 ? 'Profitable' : 'Loss'}
                        </p>
                      </div>
                      <Calculator className="w-8 h-8" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Balance</p>
                        <p className="text-2xl font-bold">₹{parseFloat(journeyData?.balance || '0').toLocaleString()}</p>
                        <p className="text-xs opacity-75">Available cash</p>
                      </div>
                      <Receipt className="w-8 h-8" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Expense Analysis */}
              {Object.keys(expensesByCategory).length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Expense Categories */}
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

                  {/* Expense Insights */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Journey Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Top Expense Category */}
                      {Object.keys(expensesByCategory).length > 0 && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <h4 className="font-semibold text-red-800 mb-2">Highest Expense Category</h4>
                          {(() => {
                            const topCategory = Object.entries(expensesByCategory)
                              .reduce((max, [cat, data]: [string, any]) => 
                                data.total > max.total ? { category: cat, ...data } : max, 
                                { category: '', total: 0 }
                              );
                            return (
                              <div>
                                <Badge className={getCategoryColor(topCategory.category)}>
                                  {getTranslatedCategory(topCategory.category)}
                                </Badge>
                                <p className="text-sm text-red-700 mt-1">
                                  ₹{topCategory.total.toLocaleString()} ({((topCategory.total / totalExpenses) * 100).toFixed(1)}% of total expenses)
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Profit Margin */}
                      <div className={`p-4 border rounded-lg ${netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                        <h4 className={`font-semibold mb-2 ${netProfit >= 0 ? 'text-green-800' : 'text-orange-800'}`}>
                          Profit Margin
                        </h4>
                        <div className="space-y-1">
                          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                            {journeyRevenue > 0 ? ((netProfit / journeyRevenue) * 100).toFixed(1) : '0.0'}%
                          </p>
                          <p className={`text-sm ${netProfit >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                            {netProfit >= 0 ? 'This journey was profitable' : 'This journey had a loss'}
                          </p>
                        </div>
                      </div>

                      {/* Expense Efficiency */}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Expense Efficiency</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">Expenses per ₹100 revenue:</span>
                            <span className="font-medium text-blue-800">
                              ₹{journeyRevenue > 0 ? ((totalExpenses / journeyRevenue) * 100).toFixed(2) : '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">Total categories used:</span>
                            <span className="font-medium text-blue-800">
                              {Object.keys(expensesByCategory).length}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">Average per transaction:</span>
                            <span className="font-medium text-blue-800">
                              ₹{regularExpenses.length > 0 ? (totalExpenses / regularExpenses.length).toFixed(2) : '0.00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cost Breakdown */}
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="font-semibold text-purple-800 mb-2">Cost Structure</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-purple-700">Revenue:</span>
                            <span className="font-medium text-purple-800">₹{journeyRevenue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-purple-700">Operating Costs:</span>
                            <span className="font-medium text-purple-800">₹{totalExpenses.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between border-t border-purple-200 pt-1">
                            <span className="text-purple-700 font-medium">Net Result:</span>
                            <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {netProfit >= 0 ? '+' : ''}₹{netProfit.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Revenue Items (HYD Inward, Top-ups) */}
              {revenueItems.length > 0 && (
                <Card>
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

              {expenses.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Receipt className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No expenses recorded for this journey yet.</p>
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