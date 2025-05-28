import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getAuthHeaders } from "@/lib/auth";

interface ExpenseQuickEntryProps {
  journeyId: number;
}

export default function ExpenseQuickEntry({ journeyId }: ExpenseQuickEntryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [amounts, setAmounts] = useState<{ [key: string]: string }>({});

  // All expense categories with role-based filtering
  const allExpenseCategories = [
    { value: "loading", label: "Loading" },
    { value: "rope", label: "Rope" },
    { value: "fuel", label: "Fuel" },
    { value: "food", label: "Food" },
    { value: "maintenance", label: "Maintenance" },
    { value: "rto", label: "RTO" },
    { value: "unloading", label: "Unloading" },
    { value: "miscellaneous", label: "Miscellaneous" },
    { value: "mechanical", label: "Mechanical" },
    { value: "body_works", label: "Body Works" },
    { value: "tires_air", label: "Tires Air" },
    { value: "weighment", label: "Weighment" },
    { value: "adblue", label: "AdBlue" },
    { value: "other", label: "Other" },
    { value: "toll", label: "Toll", adminOnly: true },
    { value: "hyd_inward", label: "HYD Inward", adminOnly: true },
  ];

  // Filter categories based on user role
  const expenseCategories = allExpenseCategories.filter(category => {
    if (!category.adminOnly) return true;
    return user?.role === 'admin';
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (data: { category: string; amount: number }) => {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          journeyId,
          category: data.category,
          amount: data.amount.toString(),
          description: "",
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to add expense");
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${journeyId}/expenses`] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys/active"] });
      
      // Clear the amount for this category
      setAmounts(prev => ({
        ...prev,
        [variables.category]: ""
      }));
      
      toast({
        title: "Added expense",
        description: `₹${variables.amount.toLocaleString()}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Expense",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleAddExpense = (category: string) => {
    const amount = parseFloat(amounts[category] || "0");
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    addExpenseMutation.mutate({ category, amount });
  };

  const handleAmountChange = (category: string, value: string) => {
    setAmounts(prev => ({
      ...prev,
      [category]: value
    }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {expenseCategories.map((category) => (
        <Card key={category.value} className="p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="font-medium text-gray-700 min-w-0 flex-1">
              {category.label}
            </div>
            <div className="flex items-center space-x-3 ml-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={amounts[category.value] || ""}
                  onChange={(e) => handleAmountChange(category.value, e.target.value)}
                  className="pl-8 w-32 h-10 text-center"
                  min="0"
                  step="0.01"
                />
              </div>
              <Button
                onClick={() => handleAddExpense(category.value)}
                disabled={!amounts[category.value] || parseFloat(amounts[category.value] || "0") <= 0 || addExpenseMutation.isPending}
                size="sm"
                className="bg-green-600 hover:bg-green-700 h-10 px-4"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}