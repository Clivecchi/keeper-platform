import { useState } from 'react';
import './index.css'; // Make sure this includes Tailwind directives

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">
        Tailwind is finally working.
      </h1>
      <div className="bg-white shadow p-6 rounded-lg">
        <p className="text-lg mb-2">This is a basic Tailwind-styled box.</p>
        <button
          onClick={() => setCount((count) => count + 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Count is {count}
        </button>
      </div>
    </div>
  );
}

export default App;