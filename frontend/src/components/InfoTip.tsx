import { useState } from 'react';

export function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="text-gray-500 cursor-help text-xs">&#9432;</span>
      {show && (
        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-xs text-gray-300 w-56 shadow-lg">
          {text}
        </div>
      )}
    </span>
  );
}
