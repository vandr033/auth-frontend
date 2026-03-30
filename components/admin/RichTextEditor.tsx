"use client";

import React from "react";
import { Bold, Code2, Italic, Link2, List, ListOrdered, Pilcrow, Type, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
};

function normalizeHtmlOutput(html: string): string {
  const plainText = html
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, "")
    .trim();
  return plainText.length === 0 ? "" : html;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "",
  minHeightClassName = "min-h-[140px]",
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const [sourceMode, setSourceMode] = React.useState(false);

  React.useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [value]);

  const syncEditorValue = React.useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(normalizeHtmlOutput(editor.innerHTML));
  }, [onChange]);

  const runCommand = React.useCallback((command: string, commandValue?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, commandValue);
    syncEditorValue();
  }, [syncEditorValue]);

  const handleInsertLink = React.useCallback(() => {
    const url = window.prompt("URL", "https://");
    if (!url) return;
    runCommand("createLink", url.trim());
  }, [runCommand]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 rounded-md border border-slate-200 bg-slate-50 p-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => runCommand("bold")} title="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => runCommand("italic")} title="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => runCommand("underline")} title="Underline">
          <Underline className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => runCommand("insertUnorderedList")} title="Bullet list">
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => runCommand("insertOrderedList")} title="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => runCommand("formatBlock", "p")} title="Paragraph">
          <Pilcrow className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => runCommand("formatBlock", "h2")} title="Heading">
          <Type className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleInsertLink} title="Insert link">
          <Link2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setSourceMode((prev) => !prev)} title="HTML source">
          <Code2 className="h-4 w-4" />
        </Button>
      </div>

      {sourceMode ? (
        <textarea
          className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-mono ${minHeightClassName}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={`w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand ${minHeightClassName}`}
          onInput={syncEditorValue}
          data-placeholder={placeholder}
          style={{ whiteSpace: "pre-wrap" }}
        />
      )}
    </div>
  );
}

