import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, UnderlineIcon, Image as ImageIcon, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: true, allowBase64: true }),
    ],
    content: value || "",
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[100px] p-3 outline-none",
      },
    },
  });

  // Sync external value changes (e.g. when form resets)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value]);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image too large — max 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = evt => {
      const src = evt.target?.result as string;
      editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  if (!editor) return null;

  const toolbarBtn = (active: boolean, onClick: () => void, title: string, children: React.ReactNode) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded transition-colors text-sm",
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-slate-100 text-slate-600"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-1.5 border-b bg-slate-50 flex-wrap">
        {toolbarBtn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold", <Bold className="h-4 w-4" />)}
        {toolbarBtn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Italic", <Italic className="h-4 w-4" />)}
        {toolbarBtn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "Underline", <UnderlineIcon className="h-4 w-4" />)}
        <div className="w-px h-5 bg-slate-200 mx-1" />
        {toolbarBtn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Bullet list", <List className="h-4 w-4" />)}
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button
          type="button"
          title="Insert image"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>

      {/* Editor area */}
      <div className="relative">
        {editor.isEmpty && placeholder && (
          <p className="absolute top-3 left-3 text-sm text-muted-foreground pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// Renders stored HTML safely in read-only contexts (e.g. exam questions)
export function RichTextDisplay({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn("prose prose-sm max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
