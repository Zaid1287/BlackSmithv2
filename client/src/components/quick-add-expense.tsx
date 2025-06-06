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
  { value: "fines", label: "Fines" },
  { value: "driver_fees", label: "Driver Fees" },
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
          amount: data.amount,
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl font-bold text-center">Add Journey Expenses</DialogTitle>
            <p className="text-gray-600 text-center mt-2">Select expense type and enter amount</p>
          </DialogHeader>

          <div className="space-y-8 p-2">
            {/* Income Section - Enhanced Layout */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-green-800 mb-6 text-center">Revenue Items</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* HYD Inward */}
                <div className="bg-white rounded-lg p-5 border border-green-200 shadow-sm">
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-green-700 font-bold text-lg">HYD Inward</h4>
                      <p className="text-green-600 text-sm font-medium">Revenue Collection</p>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-600 font-bold text-lg">₹</span>
                      <Input
                        type="text"
                        placeholder="Enter amount"
                        value={amounts['hyd_inward'] || ''}
                        onChange={(e) => handleAmountChange('hyd_inward', e.target.value)}
                        className="pl-10 h-12 text-center text-lg border-green-300 focus:border-green-500 focus:ring-green-200"
                      />
                    </div>
                    {amounts['hyd_inward'] && (
                      <Button
                        onClick={() => handleAddExpense('hyd_inward')}
                        disabled={addExpenseMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700 text-white h-11 text-base font-semibold"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Add HYD Inward ₹{amounts['hyd_inward']}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Top Up */}
                <div className="bg-white rounded-lg p-5 border border-green-200 shadow-sm">
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-green-700 font-bold text-lg">Top Up</h4>
                      <p className="text-green-600 text-sm font-medium">Additional Revenue</p>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-600 font-bold text-lg">₹</span>
                      <Input
                        type="text"
                        placeholder="Enter amount"
                        value={amounts['top_up'] || ''}
                        onChange={(e) => handleAmountChange('top_up', e.target.value)}
                        className="pl-10 h-12 text-center text-lg border-green-300 focus:border-green-500 focus:ring-green-200"
                      />
                    </div>
                    {amounts['top_up'] && (
                      <Button
                        onClick={() => handleAddExpense('top_up')}
                        disabled={addExpenseMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700 text-white h-11 text-base font-semibold"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Top Up ₹{amounts['top_up']}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Regular Expenses Section - Enhanced Grid */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800 text-center">Journey Expenses</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {regularExpenseTypes.map((expenseType) => (
                  <div key={expenseType.value} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      <div className="text-center">
                        <h4 className="font-bold text-gray-800 text-base">{expenseType.label}</h4>
                      </div>
                      
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                        <Input
                          type="text"
                          placeholder="Amount"
                          value={amounts[expenseType.value] || ''}
                          onChange={(e) => handleAmountChange(expenseType.value, e.target.value)}
                          className="pl-8 h-10 text-center bg-gray-50 border-gray-300 focus:bg-white focus:border-blue-400"
                        />
                      </div>
                      
                      <Button
                        onClick={() => handleAddExpense(expenseType.value)}
                        disabled={addExpenseMutation.isPending || !amounts[expenseType.value] || parseFloat(amounts[expenseType.value] || '0') <= 0}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm font-medium disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}