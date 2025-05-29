import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Fuel, Car, Coffee, ParkingCircle, Wrench, Package, PackageOpen, DollarSign, Banknote, MoreHorizontal, FileText, Cog, Zap, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuickAddExpenseProps {
  journeyId: number;
  onClose?: () => void;
}

const expenseTypes = [
  { value: "loading", label: "Loading", icon: Package, color: "bg-indigo-500" },
  { value: "fuel", label: "Fuel", icon: Fuel, color: "bg-orange-500" },
  { value: "toll", label: "Toll", icon: Car, color: "bg-blue-500" },
  { value: "rto", label: "RTO", icon: FileText, color: "bg-purple-600" },
  { value: "hyd_unloading", label: "HYD Unloading", icon: PackageOpen, color: "bg-emerald-500" },
  { value: "mechanical", label: "Mechanical", icon: Cog, color: "bg-red-600" },
  { value: "body_works", label: "Body Works", icon: Wrench, color: "bg-gray-600" },
  { value: "tire_change", label: "Tire Change", icon: Circle, color: "bg-slate-600" },
  { value: "weighment", label: "Weighment", icon: MoreHorizontal, color: "bg-amber-600" },
  { value: "rope", label: "Rope", icon: MoreHorizontal, color: "bg-brown-500" },
  { value: "food", label: "Food", icon: Coffee, color: "bg-green-500" },
  { value: "maintenance", label: "Maintenance", icon: Wrench, color: "bg-red-500" },
  { value: "nzb_unloading", label: "NZB Unloading", icon: PackageOpen, color: "bg-teal-600" },
  { value: "miscellaneous", label: "Miscellaneous", icon: MoreHorizontal, color: "bg-gray-500" },
  { value: "electrical", label: "Electrical", icon: Zap, color: "bg-yellow-600" },
  { value: "tires_air", label: "Tires Air", icon: Circle, color: "bg-cyan-500" },
  { value: "tire_greasing", label: "Tire Greasing", icon: Circle, color: "bg-violet-500" },
  { value: "adblue", label: "AdBlue", icon: MoreHorizontal, color: "bg-blue-700" },
  { value: "hyd_inward", label: "HYD Inward", icon: DollarSign, color: "bg-emerald-600" },
  { value: "top_up", label: "Top-up", icon: Banknote, color: "bg-yellow-500" },
];

export default function QuickAddExpense({ journeyId, onClose }: QuickAddExpenseProps) {
  const [selectedType, setSelectedType] = useState("");
  const [amount, setAmount] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAmountInput, setShowAmountInput] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addExpenseMutation = useMutation({
    mutationFn: async (data: { type: string; amount: number }) => {
      const response = await fetch(`/api/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: "include",
        body: JSON.stringify({
          journeyId: journeyId,
          category: data.type,
          amount: data.amount.toString(),
          description: `${expenseTypes.find(t => t.value === data.type)?.label} expense`,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to add expense");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      // Force refresh all related data
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.refetchQueries({ queryKey: ["/api/journeys"] });
      queryClient.refetchQueries({ queryKey: ["/api/dashboard/financial"] });
      
      // Reset form
      setSelectedType("");
      setAmount("");
      setShowAmountInput(false);
      setIsExpanded(false);
      
      if (onClose) onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const handleExpenseTypeClick = (type: string) => {
    setSelectedType(type);
    setShowAmountInput(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType || !amount) {
      toast({
        title: "Error",
        description: "Please enter amount",
        variant: "destructive",
      });
      return;
    }

    addExpenseMutation.mutate({
      type: selectedType,
      amount: parseFloat(amount),
    });
  };

  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        size="sm"
        variant="outline"
        className="text-xs"
      >
        <Plus className="w-3 h-3 mr-1" />
        Add Expense
      </Button>
    );
  }

  if (showAmountInput) {
    const selectedExpenseType = expenseTypes.find(t => t.value === selectedType);
    const IconComponent = selectedExpenseType?.icon || MoreHorizontal;
    
    return (
      <Card className="border-2 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded ${selectedExpenseType?.color} flex items-center justify-center`}>
                <IconComponent className="w-3 h-3 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{selectedExpenseType?.label}</h3>
            </div>
            <Button
              onClick={() => {
                setShowAmountInput(false);
                setSelectedType("");
                setAmount("");
              }}
              size="sm"
              variant="ghost"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 text-sm"
                step="0.01"
                min="0"
                autoFocus
              />
            </div>

            <div className="flex space-x-2">
              <Button
                type="submit"
                size="sm"
                className="flex-1 h-8 text-xs"
                disabled={addExpenseMutation.isPending || !amount}
              >
                {addExpenseMutation.isPending ? "Adding..." : "Add Expense"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAmountInput(false);
                  setSelectedType("");
                  setAmount("");
                }}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Select Expense Type</h3>
          <Button
            onClick={() => {
              setIsExpanded(false);
              setSelectedType("");
              setAmount("");
            }}
            size="sm"
            variant="ghost"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {expenseTypes.map((type) => {
            const IconComponent = type.icon;
            return (
              <Button
                key={type.value}
                onClick={() => handleExpenseTypeClick(type.value)}
                variant="outline"
                className="w-full h-10 text-sm flex items-center justify-start space-x-3 hover:bg-gray-50"
              >
                <div className={`w-6 h-6 rounded ${type.color} flex items-center justify-center`}>
                  <IconComponent className="w-3 h-3 text-white" />
                </div>
                <span>{type.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}