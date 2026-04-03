import { useMemo, useState } from 'react';
import {
  generateAllCombinations,
  filterPossibilities,
  suggestNextGuess,
  getPairedGuesses,
  isValidFeedback,
  type Guess,
  type Combination,
  type Feedback,
} from '../lib/mastermind.ts';

const RUNE_IMAGES = import.meta.glob('../assets/runes/rune_*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const RUNES = Array.from({ length: 12 }, (_, i) => RUNE_IMAGES[`../assets/runes/rune_${i}.png`]);

const MODAL_BG = '#332a29';
const MODAL_BORDER = '#201b1a';
const TITLE_COLOR = '#c1a97d';
const GRAY_PILL = '#919090';
const BTN_BG = '#48271e';
const BTN_BORDER = '#723c2f';
const BTN_TEXT = '#ffefd0';

function GameButton({ onClick, disabled, children, danger }: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded font-medium text-sm border transition-all ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-125 cursor-pointer'
      }`}
      style={{
        backgroundColor: BTN_BG,
        borderColor: BTN_BORDER,
        color: danger ? '#e88' : BTN_TEXT,
      }}
    >
      {children}
    </button>
  );
}

export function MinotaurLock() {
  const [activeRunes, setActiveRunes] = useState<Set<number>>(new Set());
  const [solving, setSolving] = useState(false);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [exactInput, setExactInput] = useState('0');
  const [misplacedInput, setMisplacedInput] = useState('0');

  const activeRuneList = useMemo(() => [...activeRunes].sort((a, b) => a - b), [activeRunes]);

  const allCombinations = useMemo(
    () => generateAllCombinations(activeRuneList.length),
    [activeRuneList.length]
  );

  const possibilities = useMemo(
    () => guesses.reduce((remaining, guess) => filterPossibilities(remaining, guess), allCombinations),
    [allCombinations, guesses]
  );

  const usePairedStrategy = activeRuneList.length === 6;
  const pairedGuesses = useMemo(() => getPairedGuesses(), []);

  const suggestion = useMemo(() => {
    if (guesses.length > 0 && guesses[guesses.length - 1].feedback.exact === 4) return null;
    if (usePairedStrategy && guesses.length < 3) return pairedGuesses[guesses.length];
    return suggestNextGuess(possibilities);
  }, [usePairedStrategy, guesses, pairedGuesses, possibilities]);

  const solved = guesses.length > 0 && guesses[guesses.length - 1].feedback.exact === 4;

  function toggleRune(index: number) {
    setActiveRunes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else if (next.size < 6) {
        next.add(index);
      }
      return next;
    });
  }

  function handleStartSolving() {
    setSolving(true);
    setGuesses([]);
    setExactInput('0');
    setMisplacedInput('0');
  }

  function handleAddGuess() {
    if (!suggestion) return;
    const feedback: Feedback = {
      exact: parseInt(exactInput, 10),
      misplaced: parseInt(misplacedInput, 10),
    };
    if (!isValidFeedback(feedback)) return;
    setGuesses((prev) => [...prev, { combination: suggestion, feedback }]);
    setExactInput('0');
    setMisplacedInput('0');
  }

  function handleReset() {
    setGuesses([]);
    setExactInput('0');
    setMisplacedInput('0');
  }

  function handleFullReset() {
    setActiveRunes(new Set());
    setSolving(false);
    setGuesses([]);
    setExactInput('0');
    setMisplacedInput('0');
  }

  function runeImage(comboIndex: number): string {
    return RUNES[activeRuneList[comboIndex]];
  }

  function renderCombination(combo: Combination, highlight?: boolean) {
    return (
      <div className="flex gap-1">
        {combo.map((runeIdx, i) => (
          <img
            key={i}
            src={runeImage(runeIdx)}
            alt={`Rune ${activeRuneList[runeIdx]}`}
            className={`w-10 h-10 rounded ${highlight ? 'brightness-125' : 'opacity-80'}`}
          />
        ))}
      </div>
    );
  }

  const feedbackValid =
    exactInput !== '' &&
    misplacedInput !== '' &&
    isValidFeedback({
      exact: parseInt(exactInput, 10),
      misplaced: parseInt(misplacedInput, 10),
    });

  return (
    <div className="flex justify-center">
      <div
        className="inline-flex flex-col rounded-lg border-2 overflow-hidden"
        style={{ backgroundColor: MODAL_BG, borderColor: MODAL_BORDER }}
      >
        {/* Title bar */}
        <div className="px-4 py-2 border-b" style={{ borderColor: MODAL_BORDER }}>
          <h1 className="text-lg font-semibold" style={{ color: TITLE_COLOR }}>Minotaur Lock</h1>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Instructions */}
          <p className="text-xs leading-relaxed max-w-sm" style={{ color: '#a89880' }}>
            Find the 6 active runes on the vault walls and select them below.
            Then hit Start Solving — the solver will tell you what to try in-game.
            Enter the result after each guess (exact matches, misplaced matches)
            and it will narrow down the combination.
          </p>

          {/* Rune palette */}
          <div className="rounded-md p-3" style={{ backgroundColor: GRAY_PILL }}>
            <div className="grid grid-cols-6 gap-2">
              {RUNES.map((src, index) => (
                <button
                  key={index}
                  onClick={() => toggleRune(index)}
                  disabled={solving}
                  className={`w-14 h-14 rounded-md transition-all ${
                    solving
                      ? activeRunes.has(index) ? '' : 'invisible'
                      : activeRunes.has(index) ? 'brightness-125' : 'opacity-60 hover:opacity-80 cursor-pointer'
                  } ${solving ? 'cursor-not-allowed' : ''}`}
                >
                  <img src={src} alt={`Rune ${index}`} className="w-full h-full rounded" />
                </button>
              ))}
            </div>
          </div>

          {/* Selected runes display */}
          {activeRunes.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: TITLE_COLOR }}>
                Active ({activeRunes.size}/6):
              </span>
              <div className="flex gap-1">
                {[...activeRunes].map((runeIdx) => (
                  <img
                    key={runeIdx}
                    src={RUNES[runeIdx]}
                    alt={`Rune ${runeIdx}`}
                    className="w-8 h-8 rounded"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Start button */}
          {!solving && (
            <div className="flex gap-3">
              <GameButton onClick={handleStartSolving} disabled={activeRunes.size < 1}>
                Start Solving
              </GameButton>
            </div>
          )}

          {/* Guesses */}
          {solving && (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: TITLE_COLOR }}>
                Guesses:
                {!solved && possibilities.length > 0 && (
                  <span className="ml-2 opacity-60">{possibilities.length.toLocaleString()} remaining</span>
                )}
              </p>

              {/* Past guesses */}
              {guesses.map((guess, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-md px-3 py-2"
                  style={{ backgroundColor: GRAY_PILL }}
                >
                  {renderCombination(guess.combination)}
                  <span className="text-sm font-medium" style={{ color: '#332a29' }}>
                    {guess.feedback.exact}, {guess.feedback.misplaced}
                  </span>
                </div>
              ))}

              {/* Status messages */}
              {solved && (
                <p className="text-green-400 font-bold text-sm">Solved!</p>
              )}
              {!solved && possibilities.length === 0 && (
                <p className="text-red-400 text-sm">No valid combinations remain — check your results above.</p>
              )}
              {!solved && possibilities.length === 1 && suggestion && (
                <p className="font-bold text-sm" style={{ color: TITLE_COLOR }}>Solution found — try it!</p>
              )}

              {/* Current guess input row */}
              {!solved && suggestion && (
                <div
                  className="flex items-center gap-3 rounded-md px-3 py-2"
                  style={{ backgroundColor: GRAY_PILL }}
                >
                  {renderCombination(suggestion, true)}
                  <div className="flex items-center gap-1 ml-2">
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={exactInput}
                      onChange={(e) => setExactInput(e.target.value)}
                      className="w-10 rounded px-1 py-1 text-sm text-center focus:outline-none"
                      style={{ backgroundColor: '#b0b0b0', color: '#332a29' }}
                    />
                    <span style={{ color: '#332a29' }}>,</span>
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={misplacedInput}
                      onChange={(e) => setMisplacedInput(e.target.value)}
                      className="w-10 rounded px-1 py-1 text-sm text-center focus:outline-none"
                      style={{ backgroundColor: '#b0b0b0', color: '#332a29' }}
                    />
                  </div>
                  <GameButton onClick={handleAddGuess} disabled={!feedbackValid}>
                    Add
                  </GameButton>
                </div>
              )}
            </div>
          )}

          {/* Reset/Clear buttons */}
          {solving && (
            <div className="flex gap-3">
              <GameButton onClick={handleReset}>Reset Guesses</GameButton>
              <GameButton onClick={handleFullReset} danger>Clear Solver</GameButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
