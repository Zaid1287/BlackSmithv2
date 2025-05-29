import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface QuickAddExpenseProps {
  journeyId: number;
  onClose?: () => void;
}

const expenseTypes = [
  { value: "fuel", label: "Fuel" },
  { value: "toll", label: "Toll" },
  { value: "food", label: "Food" },
  { value: "parking", label: "Parking" },
  { value: "maintenance", label: "Maintenance" },
  { value: "loading", label: "Loading" },
  { value: "unloading", label: "Unloading" },
  { value: "hyd_inward", label: "HYD Inward" },
  { value: "top_up", label: "Top-up" },
  { value: "other", label: "Other" },
];

export default function QuickAddExpense({ journeyId, onClose }: QuickAddExpenseProps) {
  const [selectedType, setSelectedType] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addExpenseMutation = useMutation({
    mutationFn: async (data: { type: string; amount: number; description: string }) => {
      const response = await fetch(`/api/journeys/${journeyId}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          category: data.type,
          amount: data.amount,
          description: data.description,
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
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
      
      // Reset form
      setSelectedType("");
      setAmount("");
      setDescription("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType || !amount) {
      toast({
        title: "Error",
        description: "Please select expense type and enter amount",
        variant: "destructive",
      });
      return;
    }

    addExpenseMutation.mutate({
      type: selectedType,
      amount: parseFloat(amount),
      description: description || `${expenseTypes.find(t => t.value === selectedType)?.label} expense`,
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
        Quick Add Expense
      </Button>
    );
  }

  return (
    <Card className="border-2 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Quick Add Expense</h3>
          <Button
            onClick={() => {
              setIsExpanded(false);
              setSelectedType("");
              setAmount("");
              setDescription("");
            }}
            size="sm"
            variant="ghost"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-8 text-xs"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div>
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="flex space-x-2">
            <Button
              type="submit"
              size="sm"
              className="flex-1 h-8 text-xs"
              disabled={addExpenseMutation.isPending}
            >
              {addExpenseMutation.isPending ? "Adding..." : "Add Expense"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsExpanded(false);
                setSelectedType("");
                setAmount("");
                setDescription("");
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