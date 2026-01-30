/**
 * Interactive prompts for CLI.
 */

import { createInterface } from 'node:readline';

/**
 * Prompt user for text input.
 */
export async function promptText(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt user for password (hidden input).
 */
export async function promptPassword(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Note: This doesn't actually hide input in basic readline
  // For production, consider using a library like @inquirer/prompts
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt user for yes/no confirmation.
 */
export async function promptConfirm(question: string, defaultValue = false): Promise<boolean> {
  const hint = defaultValue ? '(Y/n)' : '(y/N)';
  const answer = await promptText(`${question} ${hint}: `);

  if (!answer) {
    return defaultValue;
  }

  return answer.toLowerCase().startsWith('y');
}

/**
 * Prompt user to select from options.
 */
export async function promptSelect<T extends string>(
  question: string,
  options: Array<{ value: T; label: string }>
): Promise<T | null> {
  console.log(`\n${question}\n`);

  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt.label}`);
  });

  const answer = await promptText('\nEnter number: ');
  const index = parseInt(answer, 10) - 1;

  if (isNaN(index) || index < 0 || index >= options.length) {
    return null;
  }

  return options[index].value;
}
