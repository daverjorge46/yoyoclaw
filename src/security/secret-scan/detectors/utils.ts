import RE2 from "re2";

export function execAll(re: RE2, text: string, onMatch: (match: RegExpExecArray) => void): void {
  re.lastIndex = 0;
  let match: RegExpExecArray | null = re.exec(text);
  while (match) {
    onMatch(match);
    if (!match[0]) {
      re.lastIndex += 1;
    }
    match = re.exec(text);
  }
}
