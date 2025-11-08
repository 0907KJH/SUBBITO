import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Home from './Pages/Home.jsx';
import SavedConfigs from './Pages/SavedConfigs.jsx';
import Overview from './Pages/Overview.jsx';
import Prediction from './Pages/Prediction.jsx';
import Report from './Pages/Report.jsx';
import Visualization from './Pages/Visualization.jsx';

// Minimal, robust Layout: provides routing and a simple nav.
export default function Layout() {
  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <nav style={{ width: 240, padding: 16, background: '#0f172a', color: 'white' }}>
          <h2 style={{ marginTop: 0 }}>SUBBITO</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ margin: '8px 0' }}><Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Home</Link></li>
            <li style={{ margin: '8px 0' }}><Link to="/overview" style={{ color: 'white', textDecoration: 'none' }}>Overview</Link></li>
            <li style={{ margin: '8px 0' }}><Link to="/prediction" style={{ color: 'white', textDecoration: 'none' }}>Predizione</Link></li>
            <li style={{ margin: '8px 0' }}><Link to="/visualization" style={{ color: 'white', textDecoration: 'none' }}>Visualizzazione</Link></li>
            <li style={{ margin: '8px 0' }}><Link to="/report" style={{ color: 'white', textDecoration: 'none' }}>Report</Link></li>
            <li style={{ margin: '8px 0' }}><Link to="/saved" style={{ color: 'white', textDecoration: 'none' }}>Configurazioni</Link></li>
          </ul>
        </nav>

        <main style={{ flex: 1, padding: 20 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/prediction" element={<Prediction />} />
            <Route path="/visualization" element={<Visualization />} />
            <Route path="/report" element={<Report />} />
            <Route path="/saved" element={<SavedConfigs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}



