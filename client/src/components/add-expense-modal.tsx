import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const expenseSchema = z.object({
  journeyId: z.number(),
  category: z.string().min(1, "Please select a category"),
  amount: z.string()
    .min(1, "Amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Please enter a valid amount (e.g., 100 or 100.50)")
    .refine((val) => parseFloat(val) > 0, "Amount must be greater than 0")
    .refine((val) => parseFloat(val) <= 100000, "Amount cannot exceed ₹1,00,000"),
  description: z.string()
    .min(3, "Description must be at least 3 characters")
    .max(200, "Description cannot exceed 200 characters"),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journeyId: number;
}

const allExpenseCategories = [
  { value: "loading", label: "Loading" },
  { value: "rope", label: "Rope" },
  { value: "fuel", label: "Fuel" },
  { value: "food", label: "Food" },
  { value: "toll", label: "Toll", adminOnly: true },
  { value: "maintenance", label: "Maintenance" },
  { value: "rto", label: "RTO" },
  { value: "unloading", label: "Unloading" },
  { value: "hyd_inward", label: "HYD Inward", adminOnly: true },
  { value: "miscellaneous", label: "Miscellaneous" },
  { value: "mechanical", label: "Mechanical" },
  { value: "body_works", label: "Body Works" },
  { value: "tires_air", label: "Tires Air" },
  { value: "weighment", label: "Weighment" },
  { value: "adblue", label: "AdBlue" },
  { value: "other", label: "Other" },
];

export default function AddExpenseModal({ open, onOpenChange, journeyId }: AddExpenseModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Filter categories based on user role
  const expenseCategories = allExpenseCategories.filter(category => {
    if (!category.adminOnly) return true; // Show regular categories to everyone
    return user?.role === 'admin'; // Only show admin-only categories to admins
  });

  // Log the filtered categories for debugging
  console.log('User role:', user?.role);
  console.log('All categories:', allExpenseCategories.map(c => ({ label: c.label, adminOnly: c.adminOnly || false })));
  console.log('Filtered categories for user:', expenseCategories.map(c => c.label));



  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      journeyId,
      category: "",
      amount: "",
      description: "",
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const response = await apiRequest("POST", "/api/expenses", {
        journeyId: data.journeyId,
        category: data.category,
        amount: data.amount,
        description: data.description,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense Added",
        description: "Your expense has been recorded successfully!",
      });
      // Immediately refresh all relevant data for smoother experience
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys/active"] });
      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${journeyId}/expenses`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    createExpenseMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                      <Input 
                        {...field} 
                        type="number" 
                        inputMode="numeric"
                        placeholder="0" 
                        className="pl-8"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Enter expense description (optional)" 
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={createExpenseMutation.isPending}
              >
                {createExpenseMutation.isPending ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
