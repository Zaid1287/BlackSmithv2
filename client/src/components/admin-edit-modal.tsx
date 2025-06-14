import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Save, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AdminEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journeyData: any;
  expenses: any[];
}

export default function AdminEditModal({ open, onOpenChange, journeyData, expenses }: AdminEditModalProps) {
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [journeyFinancials, setJourneyFinancials] = useState({
    pouch: journeyData?.pouch || '',
    security: journeyData?.security || ''
  });
  const [expenseData, setExpenseData] = useState({
    amount: '',
    description: '',
    category: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const expenseCategories = [
    'fuel', 'toll', 'loading', 'unloading', 'rto', 'police', 'repair', 'food',
    'lodging', 'hyd_unloading', 'adblue', 'mechanical', 'electrical', 'body_works',
    'tire_change', 'tire_greasing', 'oil_change', 'battery', 'coolant', 'brake_fluid',
    'hyd_inward', 'top_up', 'other'
  ];

  const getCategoryDisplayName = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      fuel: 'Fuel',
      toll: 'Toll',
      loading: 'Loading',
      unloading: 'Unloading',
      rto: 'RTO',
      police: 'Police',
      repair: 'Repair',
      food: 'Food',
      lodging: 'Lodging',
      hyd_unloading: 'HYD Unloading',
      adblue: 'Adblue',
      mechanical: 'Mechanical',
      electrical: 'Electrical',
      body_works: 'Body Works',
      tire_change: 'Tire Change',
      tire_greasing: 'Tire Greasing',
      oil_change: 'Oil Change',
      battery: 'Battery',
      coolant: 'Coolant',
      brake_fluid: 'Brake Fluid',
      hyd_inward: 'HYD Inward',
      top_up: 'Top-up',
      other: 'Other'
    };
    return categoryMap[category] || category;
  };

  const updateFinancialsMutation = useMutation({
    mutationFn: async (data: { pouch: string; security: string }) => {
      return apiRequest(`/api/admin/journeys/${journeyData.id}/financials`, 'PUT', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Journey financials updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/journeys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/journeys/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/financial'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update journey financials",
        variant: "destructive",
      });
    }
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/admin/expenses/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
      setEditingExpense(null);
      setExpenseData({ amount: '', description: '', category: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/journeys'] });
      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${journeyData.id}/expenses`] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/financial'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      });
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/expenses/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/journeys'] });
      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${journeyData.id}/expenses`] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/financial'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  });

  const handleUpdateFinancials = () => {
    if (!journeyFinancials.pouch || !journeyFinancials.security) {
      toast({
        title: "Error",
        description: "Please fill in both pouch and security amounts",
        variant: "destructive",
      });
      return;
    }
    updateFinancialsMutation.mutate(journeyFinancials);
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setExpenseData({
      amount: expense.amount,
      description: expense.description || '',
      category: expense.category
    });
  };

  const handleUpdateExpense = () => {
    if (!expenseData.amount || !expenseData.category) {
      toast({
        title: "Error",
        description: "Please fill in amount and category",
        variant: "destructive",
      });
      return;
    }
    updateExpenseMutation.mutate({
      id: editingExpense.id,
      data: expenseData
    });
  };

  const handleDeleteExpense = (expenseId: number) => {
    if (confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
      deleteExpenseMutation.mutate(expenseId);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Admin Edit - Journey ID: {journeyData?.id}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="financials" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="financials">Journey Financials</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="financials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Edit Journey Financials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pouch">Pouch Amount (₹)</Label>
                    <Input
                      id="pouch"
                      type="number"
                      value={journeyFinancials.pouch}
                      onChange={(e) => setJourneyFinancials(prev => ({ ...prev, pouch: e.target.value }))}
                      placeholder="Enter pouch amount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="security">Security Deposit (₹)</Label>
                    <Input
                      id="security"
                      type="number"
                      value={journeyFinancials.security}
                      onChange={(e) => setJourneyFinancials(prev => ({ ...prev, security: e.target.value }))}
                      placeholder="Enter security deposit"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleUpdateFinancials}
                  disabled={updateFinancialsMutation.isPending}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateFinancialsMutation.isPending ? 'Updating...' : 'Update Financials'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Journey Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><span className="font-medium">License Plate:</span> {journeyData?.licensePlate}</p>
                    <p><span className="font-medium">Destination:</span> {journeyData?.destination}</p>
                    <p><span className="font-medium">Status:</span> {journeyData?.status}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Current Pouch:</span> ₹{parseFloat(journeyData?.pouch || '0').toLocaleString()}</p>
                    <p><span className="font-medium">Current Security:</span> ₹{parseFloat(journeyData?.security || '0').toLocaleString()}</p>
                    <p><span className="font-medium">Balance:</span> ₹{parseFloat(journeyData?.balance || '0').toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            {editingExpense && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800">Edit Expense</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-amount">Amount (₹)</Label>
                      <Input
                        id="edit-amount"
                        type="number"
                        value={expenseData.amount}
                        onChange={(e) => setExpenseData(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="Enter amount"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-category">Category</Label>
                      <Select 
                        value={expenseData.category} 
                        onValueChange={(value) => setExpenseData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {getCategoryDisplayName(category)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-description">Description</Label>
                      <Input
                        id="edit-description"
                        value={expenseData.description}
                        onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter description (optional)"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleUpdateExpense}
                      disabled={updateExpenseMutation.isPending}
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateExpenseMutation.isPending ? 'Updating...' : 'Update Expense'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingExpense(null);
                        setExpenseData({ amount: '', description: '', category: '' });
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>All Expenses ({expenses.length} total)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {expenses.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No expenses recorded for this journey.</p>
                ) : (
                  expenses.map((expense: any) => (
                    <div key={expense.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            {getCategoryDisplayName(expense.category)}
                          </Badge>
                          <span className="font-semibold text-lg">
                            ₹{parseFloat(expense.amount).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditExpense(expense)}
                            disabled={editingExpense?.id === expense.id}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteExpense(expense.id)}
                            disabled={deleteExpenseMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      {expense.description && (
                        <p className="text-sm text-gray-600 mb-2">{expense.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Added on {formatDate(expense.timestamp)} • ID: {expense.id}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}