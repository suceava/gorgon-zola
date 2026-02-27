import { useState } from 'react';

export function Admin() {
  const [secret, setSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  if (!authenticated) {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-gray-400">Enter the admin secret to manage vendor prices.</p>
        <div className="flex gap-2">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin secret"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={() => setAuthenticated(secret.length > 0)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-md font-medium transition-colors"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vendor Price Management</h1>
      <p className="text-gray-400">Price editor coming soon.</p>
    </div>
  );
}
