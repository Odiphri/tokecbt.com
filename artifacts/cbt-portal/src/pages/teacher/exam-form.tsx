import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, ChevronsUpDown, Check, Shuffle } from "lucide-react";
import { Link } from "wouter";
import { CLASS_SECTIONS } from "@/lib/class-sections";
import { cn } from "@/lib/utils";

const schema = z.object({
  subject: z.string().min(1, "Subject is required"),
  class: z.string().min(1, "Class is required"),
  durationMinutes: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  shuffleQuestions: z.boolean().default(false),
});

function toLocalDatetimeString(isoString?: string | null) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ExamForm() {
  const { examId } = useParams();
  const isEdit = !!examId && examId !== "new";
  const id = isEdit ? parseInt(examId!, 10) : 0;
  const [classOpen, setClassOpen] = useState(false);

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exam, isLoading: isExamLoading } = useGetTeacherExam(id, {
    query: { enabled: isEdit } as any
  });

  const createMutation = useCreateExam();
  const updateMutation = useUpdateExam();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: "",
      class: "",
      durationMinutes: 60,
      startTime: "",
      endTime: "",
      shuffleQuestions: false,
    },
  });

  useEffect(() => {
    if (isEdit && exam) {
      form.reset({
        subject: exam.subject,
        class: exam.class,
        durationMinutes: exam.durationMinutes,
        startTime: toLocalDatetimeString(exam.startTime),
        endTime: toLocalDatetimeString(exam.endTime),
        shuffleQuestions: exam.shuffleQuestions ?? false,
      });
    }
  }, [isEdit, exam, form]);

  const onSubmit = (values: z.infer<typeof schema>) => {
    const data = {
      subject: values.subject,
      class: values.class,
      durationMinutes: values.durationMinutes,
      startTime: values.startTime ? new Date(values.startTime).toISOString() : null,
      endTime: values.endTime ? new Date(values.endTime).toISOString() : null,
      shuffleQuestions: values.shuffleQuestions,
    };

    if (isEdit) {
      updateMutation.mutate({ examId: id, data }, {
        onSuccess: () => {
          toast({ title: "Exam updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetTeacherExamsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTeacherExamQueryKey(id) });
          setLocation(`/teacher/exams/${id}`);
        },
        onError: (err: any) =>
          toast({ variant: "destructive", title: "Failed to update exam", description: err.data?.error || "Please try again." }),
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: (data) => {
          toast({ title: "Exam created successfully" });
          queryClient.invalidateQueries({ queryKey: getGetTeacherExamsQueryKey() });
          setLocation(`/teacher/exams/${data.id}`);
        },
        onError: (err: any) =>
          toast({ variant: "destructive", title: "Failed to create exam", description: err.data?.error || "Please try again." }),
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
                    <FormLabel>Class / Section</FormLabel>
                    <Popover open={classOpen} onOpenChange={setClassOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                          >
                            {field.value || "Select a class section"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search class..." />
                          <CommandList>
                            <CommandEmpty>No class found.</CommandEmpty>
                            <CommandGroup>
                              {CLASS_SECTIONS.map((cls) => (
                                <CommandItem
                                  key={cls}
                                  value={cls}
                                  onSelect={() => {
                                    field.onChange(cls);
                                    setClassOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", field.value === cls ? "opacity-100" : "opacity-0")} />
                                  {cls}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Only students in this class will see the exam.
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Students can't access before this time.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Exam expires after this time.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="shuffleQuestions"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4 bg-slate-50/60">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2 text-base cursor-pointer">
                        <Shuffle className="h-4 w-4 text-primary" />
                        Shuffle Questions
                      </FormLabel>
                      <FormDescription>
                        Each student will receive the questions in a different random order. Question numbers will differ per student.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
