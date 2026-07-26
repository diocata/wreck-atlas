export type HighlightedTextPart = {
  text: string;
  match: boolean;
};

export function splitHighlightedText(
  text: string,
  query: string,
): HighlightedTextPart[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [{ text, match: false }];

  const normalizedText = text.toLocaleLowerCase();
  const parts: HighlightedTextPart[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const matchIndex = normalizedText.indexOf(normalizedQuery, cursor);
    if (matchIndex === -1) {
      parts.push({ text: text.slice(cursor), match: false });
      break;
    }

    if (matchIndex > cursor) {
      parts.push({
        text: text.slice(cursor, matchIndex),
        match: false,
      });
    }
    parts.push({
      text: text.slice(matchIndex, matchIndex + normalizedQuery.length),
      match: true,
    });
    cursor = matchIndex + normalizedQuery.length;
  }

  return parts;
}

export function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  return splitHighlightedText(text, query).map((part, index) =>
    part.match
      ? <mark key={`${index}-${part.text}`}>{part.text}</mark>
      : <span key={`${index}-${part.text}`}>{part.text}</span>
  );
}
