export type Combination = number[];

export interface Feedback {
  exact: number;
  misplaced: number;
}

export interface Guess {
  combination: Combination;
  feedback: Feedback;
}

export const COMBO_LENGTH = 4;

export function generateAllCombinations(runeCount: number): Combination[] {
  const combos: Combination[] = [];
  for (let a = 0; a < runeCount; a++) {
    for (let b = 0; b < runeCount; b++) {
      for (let c = 0; c < runeCount; c++) {
        for (let d = 0; d < runeCount; d++) {
          combos.push([a, b, c, d]);
        }
      }
    }
  }
  return combos;
}

export function evaluateGuess(secret: Combination, guess: Combination): Feedback {
  let exact = 0;
  const secretCounts: number[] = [];
  const guessCounts: number[] = [];
  const maxRune = Math.max(...secret, ...guess) + 1;

  for (let i = 0; i < maxRune; i++) {
    secretCounts.push(0);
    guessCounts.push(0);
  }

  for (let i = 0; i < COMBO_LENGTH; i++) {
    if (secret[i] === guess[i]) {
      exact++;
    } else {
      secretCounts[secret[i]]++;
      guessCounts[guess[i]]++;
    }
  }

  let misplaced = 0;
  for (let i = 0; i < maxRune; i++) {
    misplaced += Math.min(secretCounts[i], guessCounts[i]);
  }

  return { exact, misplaced };
}

export function filterPossibilities(possibilities: Combination[], guess: Guess): Combination[] {
  return possibilities.filter((combo) => {
    const result = evaluateGuess(combo, guess.combination);
    return result.exact === guess.feedback.exact && result.misplaced === guess.feedback.misplaced;
  });
}

export function suggestNextGuess(possibilities: Combination[]): Combination | null {
  return possibilities.length > 0 ? possibilities[0] : null;
}

export function getPairedGuesses(): Combination[] {
  return [
    [0, 0, 1, 1],
    [2, 2, 3, 3],
    [4, 4, 5, 5],
  ];
}

export function isValidFeedback(feedback: Feedback): boolean {
  return (
    feedback.exact >= 0 &&
    feedback.exact <= COMBO_LENGTH &&
    feedback.misplaced >= 0 &&
    feedback.misplaced <= COMBO_LENGTH &&
    feedback.exact + feedback.misplaced <= COMBO_LENGTH
  );
}
