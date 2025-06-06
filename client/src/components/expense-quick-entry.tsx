import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [pendingExpense, setPendingExpense] = useState<{category: string; amount: number} | null>(null);
  const [description, setDescription] = useState("");

  // All expense categories with role-based filtering
  const allExpenseCategories = [
    { value: "hyd_inward", label: "HYD Inward", adminOnly: true, isRevenue: true },
    { value: "loading", label: "Loading" },
    { value: "rope", label: "Rope" },
    { value: "fuel", label: "Fuel" },
    { value: "food", label: "Food" },
    { value: "maintenance", label: "Maintenance" },
    { value: "rto", label: "RTO" },
    { value: "hyd_unloading", label: "HYD Unloading" },
    { value: "nzb_unloading", label: "NZB Unloading" },
    { value: "miscellaneous", label: "Miscellaneous" },
    { value: "mechanical", label: "Mechanical" },
    { value: "electrical", label: "Electrical" },
    { value: "body_works", label: "Body Works" },
    { value: "tires_air", label: "Tires Air" },
    { value: "weighment", label: "Weighment" },
    { value: "adblue", label: "AdBlue" },
    { value: "fines", label: "Fines" },
    { value: "driver_fees", label: "Driver Fees" },
    { value: "other", label: "Other" },
    { value: "toll", label: "Toll", adminOnly: true },
    { value: "top_up", label: "Top Up", isRevenue: true },
  ];

  // Filter categories based on user role
  const expenseCategories = allExpenseCategories.filter(category => {
    if (!category.adminOnly) return true;
    return user?.role === 'admin';
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (data: { category: string; amount: number; description?: string }) => {
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
          description: data.description || "",
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

  const categoriesRequiringDescription = ['miscellaneous', 'maintenance', 'mechanical', 'electrical', 'body_works', 'fines'];

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

    // Check if this category requires a description
    if (categoriesRequiringDescription.includes(category)) {
      setPendingExpense({ category, amount });
      setShowDescriptionModal(true);
      return;
    }

    addExpenseMutation.mutate({ category, amount });
  };

  const handleSubmitWithDescription = () => {
    if (!pendingExpense) return;
    
    if (description.trim().length < 3) {
      toast({
        title: "Description Required",
        description: "Please provide at least 3 characters for the description",
        variant: "destructive",
      });
      return;
    }

    addExpenseMutation.mutate({ 
      category: pendingExpense.category, 
      amount: pendingExpense.amount,
      description: description.trim()
    });
    
    // Close modal and reset state
    setShowDescriptionModal(false);
    setPendingExpense(null);
    setDescription("");
  };

  const handleCancelDescription = () => {
    setShowDescriptionModal(false);
    setPendingExpense(null);
    setDescription("");
  };

  const handleAmountChange = (category: string, value: string) => {
    setAmounts(prev => ({
      ...prev,
      [category]: value
    }));
  };

  // Separate categories for layout
  const hydInwardCategory = expenseCategories.find(cat => cat.value === 'hyd_inward');
  const topUpCategory = expenseCategories.find(cat => cat.value === 'top_up');
  const regularCategories = expenseCategories.filter(cat => cat.value !== 'hyd_inward' && cat.value !== 'top_up');

  const renderCategoryCard = (category: any, isFullWidth = false) => {
    const requiresDescription = categoriesRequiringDescription.includes(category.value);
    
    return (
      <Card 
        key={category.value} 
        className={`p-3 border ${
          category.isRevenue ? 'border-green-300 bg-green-50' : 
          requiresDescription ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
        } ${isFullWidth ? 'col-span-full' : ''} ${
          requiresDescription ? 'relative' : ''
        }`}
      >
        {requiresDescription && (
          <div className="absolute top-1 right-1">
            <span className="bg-orange-500 text-white text-xs px-1 py-0.5 rounded">Description</span>
          </div>
        )}
        
        {/* Mobile Layout: Stack vertically */}
        <div className="flex flex-col space-y-3 sm:hidden">
          <div className={`font-medium ${
            category.isRevenue ? 'text-green-700' : 
            requiresDescription ? 'text-orange-700' : 'text-gray-700'
          }`}>
            {category.label}
            {category.isRevenue && <span className="text-xs text-green-600 block">+Revenue</span>}
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                category.isRevenue ? 'text-green-500' : 'text-gray-400'
              }`}>₹</span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Amount"
                value={amounts[category.value] || ""}
                onChange={(e) => handleAmountChange(category.value, e.target.value)}
                className={`pl-8 h-10 text-center ${
                  category.isRevenue ? 'border-green-300 focus:border-green-500' : ''
                }`}
                min="0"
                step="0.01"
              />
            </div>
            <Button
              onClick={() => handleAddExpense(category.value)}
              disabled={!amounts[category.value] || parseFloat(amounts[category.value] || "0") <= 0 || addExpenseMutation.isPending}
              size="sm"
              className="bg-green-600 hover:bg-green-700 h-10 px-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Desktop Layout: Side by side */}
        <div className="hidden sm:flex items-center justify-between">
          <div className={`font-medium min-w-0 flex-1 ${
            category.isRevenue ? 'text-green-700' : 
            requiresDescription ? 'text-orange-700' : 'text-gray-700'
          }`}>
            {category.label}
            {category.isRevenue && <span className="text-xs text-green-600 block">+Revenue</span>}
          </div>
          <div className="flex items-center space-x-3 ml-4">
            <div className="relative">
              <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                category.isRevenue ? 'text-green-500' : 'text-gray-400'
              }`}>₹</span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Amount"
                value={amounts[category.value] || ""}
                onChange={(e) => handleAmountChange(category.value, e.target.value)}
                className={`pl-8 w-32 h-10 text-center ${
                  category.isRevenue ? 'border-green-300 focus:border-green-500' : ''
                }`}
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
    );
  };

  return (
    <div className="space-y-4">
      {/* HYD Inward at top - centered full width */}
      {hydInwardCategory && (
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            {renderCategoryCard(hydInwardCategory)}
          </div>
        </div>
      )}

      {/* Regular expense categories in grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {regularCategories.map((category) => renderCategoryCard(category))}
      </div>

      {/* Top Up at bottom - centered full width */}
      {topUpCategory && (
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            {renderCategoryCard(topUpCategory)}
          </div>
        </div>
      )}

      {/* Description Modal */}
      <Dialog open={showDescriptionModal} onOpenChange={setShowDescriptionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Description</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Adding <strong>₹{pendingExpense?.amount}</strong> for <strong>{pendingExpense && allExpenseCategories.find(cat => cat.value === pendingExpense.category)?.label}</strong>
              </p>
              <p className="text-sm text-orange-600">
                This category requires a description. Please provide details about this expense.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide details about this expense..."
                rows={3}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 3 characters required
              </p>
            </div>
            
            <div className="flex space-x-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={handleCancelDescription}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleSubmitWithDescription}
                disabled={addExpenseMutation.isPending || description.trim().length < 3}
              >
                {addExpenseMutation.isPending ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}