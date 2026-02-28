import { Route, Routes } from 'react-router-dom';
import { Nav } from './components/Nav.tsx';
import { Admin } from './pages/Admin.tsx';
import { Crafting } from './pages/Crafting.tsx';
import { Home } from './pages/Home.tsx';
import { ItemPage } from './pages/ItemPage.tsx';
import { Items } from './pages/Items.tsx';

export function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/crafting" element={<Crafting />} />
          <Route path="/items" element={<Items />} />
          <Route path="/items/:id" element={<ItemPage />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  );
}
