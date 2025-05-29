import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { Plus, X } from "lucide-react";

interface QuickAddExpenseProps {
  journeyId: number;
  onClose?: () => void;
}

const regularExpenseTypes = [
  { value: "loading", label: "Loading" },
  { value: "fuel", label: "Fuel" },
  { value: "toll", label: "Toll" },
  { value: "rto", label: "RTO" },
  { value: "hyd_unloading", label: "HYD Unloading" },
  { value: "mechanical", label: "Mechanical" },
  { value: "body_works", label: "Body Works" },
  { value: "tire_change", label: "Tire Change" },
  { value: "weighment", label: "Weighment" },
  { value: "rope", label: "Rope" },
  { value: "food", label: "Food" },
  { value: "maintenance", label: "Maintenance" },
  { value: "nzb_unloading", label: "NZB Unloading" },
  { value: "miscellaneous", label: "Miscellaneous" },
  { value: "electrical", label: "Electrical" },
  { value: "tires_air", label: "Tires Air" },
  { value: "tire_greasing", label: "Tire Greasing" },
  { value: "adblue", label: "AdBlue" },
];

export default function QuickAddExpense({ journeyId, onClose }: QuickAddExpenseProps) {
  const [amounts, setAmounts] = useState<{[key: string]: string}>({});
  const [showModal, setShowModal] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addExpenseMutation = useMutation({
    mutationFn: async (data: { type: string; amount: number }) => {
      const response = await fetch(`/api/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          journeyId: journeyId,
          category: data.type,
          amount: data.amount.toString(),
          description: `${regularExpenseTypes.find(t => t.value === data.type)?.label || data.type} expense`,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to add expense");
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      const expenseLabel = variables.type === 'hyd_inward' ? 'HYD Inward Income' : 
                          regularExpenseTypes.find(t => t.value === variables.type)?.label || variables.type;
      
      toast({
        title: "Success",
        description: `${expenseLabel} added: ₹${variables.amount.toLocaleString()}`,
      });
      
      // Force refresh all related data
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Clear the amount for this specific expense type
      setAmounts(prev => ({
        ...prev,
        [variables.type]: ""
      }));
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const handleAddExpense = (type: string) => {
    const amount = amounts[type];
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    addExpenseMutation.mutate({
      type: type,
      amount: parseFloat(amount),
    });
  };

  const handleAmountChange = (type: string, value: string) => {
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmounts(prev => ({
        ...prev,
        [type]: value
      }));
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        size="lg"
      >
        <Plus className="w-5 h-5 mr-2" />
        Add Expense
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add Expenses</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 p-4">
            {/* Income Section - Special Green Container */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 space-y-4">
              {/* HYD Inward */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-green-700 font-semibold text-lg">HYD Inward</h4>
                  <h5 className="text-green-700 font-medium">Income</h5>
                  <p className="text-green-600 text-sm">(This is an income item)</p>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    type="text"
                    placeholder="Amount"
                    value={amounts['hyd_inward'] || ''}
                    onChange={(e) => handleAmountChange('hyd_inward', e.target.value)}
                    className="pl-8 w-40 bg-white border-green-300 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Top Up */}
              <div className="flex items-center justify-between border-t border-green-200 pt-4">
                <div className="flex-1">
                  <h4 className="text-green-700 font-semibold text-lg">Top Up</h4>
                  <h5 className="text-green-700 font-medium">Income</h5>
                  <p className="text-green-600 text-sm">(This is an income item)</p>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    type="text"
                    placeholder="Amount"
                    value={amounts['top_up'] || ''}
                    onChange={(e) => handleAmountChange('top_up', e.target.value)}
                    className="pl-8 w-40 bg-white border-green-300 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Submit Income Button */}
              <div className="border-t border-green-200 pt-4 flex gap-3">
                {amounts['hyd_inward'] && (
                  <Button
                    onClick={() => handleAddExpense('hyd_inward')}
                    disabled={addExpenseMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add HYD Inward
                  </Button>
                )}
                {amounts['top_up'] && (
                  <Button
                    onClick={() => handleAddExpense('top_up')}
                    disabled={addExpenseMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Top Up
                  </Button>
                )}
              </div>
            </div>

            {/* Regular Expenses Grid */}
            <div className="grid grid-cols-2 gap-4">
              {regularExpenseTypes.map((expenseType) => (
                <div key={expenseType.value} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-3">{expenseType.label}</h4>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                        <Input
                          type="text"
                          placeholder="Amount"
                          value={amounts[expenseType.value] || ''}
                          onChange={(e) => handleAmountChange(expenseType.value, e.target.value)}
                          className="pl-8 bg-white"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAddExpense(expenseType.value)}
                      disabled={addExpenseMutation.isPending}
                      variant="outline"
                      className="ml-3 px-4"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}