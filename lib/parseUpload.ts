export const SUPPORTED_UPLOAD_EXTENSIONS = ["txt", "md", "docx"] as const;
export const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024;
export const UPLOAD_ACCEPT =
  ".txt,.md,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type Mammoth = {
  convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string; messages: unknown[] }>;
};

export class UnsupportedFileError extends Error {}

export function fileExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function titleFromFilename(filename: string) {
  return filename.replace(/\.(txt|md|docx)$/i, "");
}

export async function parseFileToHtml(file: File): Promise<string> {
  const ext = fileExtension(file.name);

  if (ext === "docx") {
    const mod = (await import("mammoth/mammoth.browser")) as unknown as Mammoth & {
      default?: Mammoth;
    };
    const mammoth = mod.default ?? mod;
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value || "<p></p>";
  }

  if (ext === "md") {
    return markdownToHtml(await file.text());
  }

  if (ext === "txt") {
    return textToHtml(await file.text());
  }

  throw new UnsupportedFileError(`Unsupported file type: .${ext}`);
}

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineFormat(text: string) {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  out = out.replace(/_(.+?)_/g, "<em>$1</em>");
  return out;
}

export function textToHtml(text: string): string {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return "<p></p>";

  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let paragraphBuffer: string[] = [];

  function flushParagraph() {
    if (paragraphBuffer.length) {
      html.push(`<p>${inlineFormat(paragraphBuffer.join(" "))}</p>`);
      paragraphBuffer = [];
    }
  }

  function closeList() {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineFormat(heading[2])}</h${level}>`);
      continue;
    }

    const blockquote = line.match(/^>\s?(.*)$/);
    if (blockquote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote><p>${inlineFormat(blockquote[1])}</p></blockquote>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${inlineFormat(bullet[1])}</li>`);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${inlineFormat(ordered[1])}</li>`);
      continue;
    }

    closeList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  closeList();

  return html.join("") || "<p></p>";
}
