import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateQuestion, useUpdateQuestion, getGetExamQuestionsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const schema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  optionA: z.string().min(1, "Option A is required"),
  optionB: z.string().min(1, "Option B is required"),
  optionC: z.string().min(1, "Option C is required"),
  optionD: z.string().min(1, "Option D is required"),
  correctOption: z.enum(["A", "B", "C", "D"]),
});

export default function QuestionForm({ 
  examId, 
  initialData, 
  onSuccess 
}: { 
  examId: number; 
  initialData?: any;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useCreateQuestion();
  const updateMutation = useUpdateQuestion();

  const isEdit = !!initialData;

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      questionText: initialData?.questionText || "",
      optionA: initialData?.optionA || "",
      optionB: initialData?.optionB || "",
      optionC: initialData?.optionC || "",
      optionD: initialData?.optionD || "",
      correctOption: initialData?.correctOption || "A",
    },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    if (isEdit) {
      updateMutation.mutate({
        examId,
        questionId: initialData.id,
        data: values as any,
      }, {
        onSuccess: () => {
          toast({ title: "Question updated" });
          queryClient.invalidateQueries({ queryKey: getGetExamQuestionsQueryKey(examId) });
          onSuccess();
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to update", description: err.data?.error });
        }
      });
    } else {
      createMutation.mutate({
        examId,
        data: values as any,
      }, {
        onSuccess: () => {
          toast({ title: "Question added" });
          queryClient.invalidateQueries({ queryKey: getGetExamQuestionsQueryKey(examId) });
          onSuccess();
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to add", description: err.data?.error });
        }
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="questionText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question Text</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter the question here..." className="min-h-[100px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="optionA"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Option A</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="optionB"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Option B</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="optionC"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Option C</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="optionD"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Option D</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="correctOption"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correct Option</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct option" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="A">Option A</SelectItem>
                  <SelectItem value="B">Option B</SelectItem>
                  <SelectItem value="C">Option C</SelectItem>
                  <SelectItem value="D">Option D</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Update Question" : "Add Question"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
