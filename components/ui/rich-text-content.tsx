import { cn } from "@/lib/utils";

type RichTextContentProps = {
  html: string;
  className?: string;
};

/**
 * Renders rich text that has already been sanitized by the API.
 *
 * `whitespace-pre-wrap` is intentional: older descriptions and content pasted
 * into the editor can contain literal line breaks instead of paragraph tags.
 * The editor preserves those line breaks, so the read-only view must as well.
 */
export function RichTextContent({ html, className }: RichTextContentProps) {
  return (
    <div
      className={cn(
        "whitespace-pre-wrap break-words leading-relaxed",
        "[&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2",
        "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-current/20 [&_blockquote]:pl-4 [&_blockquote]:italic",
        "[&_h1]:my-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight",
        "[&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:leading-tight",
        "[&_h3]:my-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-snug",
        "[&_h4]:my-2 [&_h4]:font-semibold [&_h5]:my-2 [&_h5]:font-semibold [&_h6]:my-2 [&_h6]:font-semibold",
        "[&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
