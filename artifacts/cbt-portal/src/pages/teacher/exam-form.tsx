import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateExam, useUpdateExam, useGetTeacherExam, getGetTeacherExamsQueryKey, getGetTeacherExamQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const schema = z.object({
  subject: z.string().min(1, "Subject is required"),
  class: z.string().min(1, "Class is required"),
  durationMinutes: z.coerce.number().min(1, "Duration must be at least 1 minute"),
});

export default function ExamForm() {
  const { examId } = useParams();
  const isEdit = !!examId && examId !== "new";
  const id = isEdit ? parseInt(examId!, 10) : 0;
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exam, isLoading: isExamLoading } = useGetTeacherExam(id, {
    query: {
      enabled: isEdit,
    } as any
  });

  const createMutation = useCreateExam();
  const updateMutation = useUpdateExam();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: "",
      class: "",
      durationMinutes: 60,
    },
  });

  useEffect(() => {
    if (isEdit && exam) {
      form.reset({
        subject: exam.subject,
        class: exam.class,
        durationMinutes: exam.durationMinutes,
      });
    }
  }, [isEdit, exam, form]);

  const onSubmit = (values: z.infer<typeof schema>) => {
    if (isEdit) {
      updateMutation.mutate({
        examId: id,
        data: values,
      }, {
        onSuccess: () => {
          toast({ title: "Exam updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetTeacherExamsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTeacherExamQueryKey(id) });
          setLocation(`/teacher/exams/${id}`);
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Failed to update exam",
            description: err.data?.error || "Please try again.",
          });
        }
      });
    } else {
      createMutation.mutate({
        data: values,
      }, {
        onSuccess: (data) => {
          toast({ title: "Exam created successfully" });
          queryClient.invalidateQueries({ queryKey: getGetTeacherExamsQueryKey() });
          setLocation(`/teacher/exams/${data.id}`);
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Failed to create exam",
            description: err.data?.error || "Please try again.",
          });
        }
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isExamLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/teacher/exams">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            {isEdit ? "Edit Exam Settings" : "Create New Exam"}
          </h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Mathematics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class/Grade</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. JSS 1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Students in this class will see the exam on their dashboard.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Link href="/teacher/exams">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Save Changes" : "Create Exam"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
