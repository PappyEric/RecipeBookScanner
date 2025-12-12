import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RecipeDigitizer from './pages/RecipeDigitizer';
import RecipeDetails from './pages/RecipeDetails';
import { RecipeProvider } from './store/RecipeContext';

const App: React.FC = () => {
  return (
    <RecipeProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/digitize" element={<RecipeDigitizer />} />
            <Route path="/recipe/:id" element={<RecipeDetails />} />
          </Routes>
        </Layout>
      </HashRouter>
    </RecipeProvider>
  );
};

export default App;
