import React, { useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { Home as HomeIcon, Eye, Activity, FileText, FolderOpen, Save, RotateCcw, Sun, Moon } from 'lucide-react';
import { isFsAccessSupported, chooseConfigDirectory } from '@/utils/fsAccess';
import Home from '@/pages/Home';
import SavedConfigs from '@/pages/SavedConfigs';
import Overview from '@/pages/Overview';
import Prediction from '@/pages/Prediction';
import Report from '@/pages/Report';
import Visualization from '@/pages/Visualization';
import { useTheme } from '@/components/ThemeContext';

// Create a layout component that contains the nav and an Outlet for child routes
function MainLayout() {
  const { bgMain, textPrimary, isDarkTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasCalculated, setHasCalculated] = useState(false);
  const currentPath = (location.pathname || '').toLowerCase();

  // Check if calculation has been done
  useEffect(() => {
    const checkCalculation = () => {
      const calculated = sessionStorage.getItem('subbito_calculation_done') === 'true';
      setHasCalculated(calculated);
    };
    
    checkCalculation();
    
    // Listen for storage changes (when calculation is done)
    window.addEventListener('storage', checkCalculation);
    // Also check on location change
    checkCalculation();
    
    return () => window.removeEventListener('storage', checkCalculation);
  }, [location]);

  const NavButton = ({ to, icon: Icon, label, disabled = false }) => {
    const isActive = (location.pathname || '').toLowerCase() === (to || '').toLowerCase();
    
    return (
      <button
        onClick={() => !disabled && navigate(to)}
        disabled={disabled}
        className={`
          w-full py-3 px-4 rounded-lg flex items-center gap-3 transition-all
          ${disabled 
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
            : isActive
              ? 'bg-blue-600 text-white'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }
        `}
      >
        <Icon size={20} />
        <span className="font-semibold text-sm uppercase">{label}</span>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }} className={`${bgMain} ${textPrimary}`}>
      {/* Mobile top bar (only on small screens) - icons only, full-width */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 bg-slate-950/95 text-white border-b border-slate-800">
        <div className="h-14 grid grid-cols-8">
          {/* HOME */}
          <button
            aria-label="Home"
            onClick={() => navigate('/')}
            className={`w-full h-full flex items-center justify-center ${currentPath === '/' ? 'bg-slate-800' : 'hover:bg-slate-800'}`}
          >
            <HomeIcon size={22} />
          </button>
          {/* OVERVIEW */}
          <button
            aria-label="Overview"
            onClick={() => hasCalculated && navigate('/overview')}
            disabled={!hasCalculated}
            className={`w-full h-full flex items-center justify-center ${!hasCalculated ? 'text-slate-500 cursor-not-allowed' : (currentPath === '/overview' ? 'bg-slate-800' : 'hover:bg-slate-800')}`}
          >
            <Eye size={22} />
          </button>
          {/* PREDIZIONE */}
          <button
            aria-label="Predizione"
            onClick={() => hasCalculated && navigate('/prediction')}
            disabled={!hasCalculated}
            className={`w-full h-full flex items-center justify-center ${!hasCalculated ? 'text-slate-500 cursor-not-allowed' : (currentPath === '/prediction' ? 'bg-slate-800' : 'hover:bg-slate-800')}`}
          >
            <Activity size={22} />
          </button>
          {/* REPORT */}
          <button
            aria-label="Report"
            onClick={() => hasCalculated && navigate('/report')}
            disabled={!hasCalculated}
            className={`w-full h-full flex items-center justify-center ${!hasCalculated ? 'text-slate-500 cursor-not-allowed' : (currentPath === '/report' ? 'bg-slate-800' : 'hover:bg-slate-800')}`}
          >
            <FileText size={22} />
          </button>
          {/* APRI */}
          <button
            aria-label="Apri"
            onClick={async () => {
              try {
                if (!isFsAccessSupported()) {
                  navigate('/saved');
                  return;
                }
                const handle = await chooseConfigDirectory();
                if (handle) {
                  navigate('/saved');
                }
              } catch (_) {
                navigate('/saved');
              }
            }}
            className={`w-full h-full flex items-center justify-center ${currentPath === '/saved' ? 'bg-slate-800' : 'hover:bg-slate-800'}`}
          >
            <FolderOpen size={22} />
          </button>
          {/* SALVA - stesso stile degli altri (hover scuro, nessun blu pieno) */}
          <button
            aria-label="Salva"
            onClick={() => {
              if (location.pathname !== '/') {
                navigate('/');
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('subbito-save-config'));
                }, 250);
              } else {
                window.dispatchEvent(new CustomEvent('subbito-save-config'));
              }
            }}
            className="w-full h-full flex items-center justify-center text-white hover:bg-slate-800"
          >
            <Save size={22} />
          </button>
          {/* RESET (rosso) */}
          <button
            aria-label="Reset"
            onClick={() => {
              sessionStorage.removeItem('subbito_calculation_done');
              sessionStorage.removeItem('subbito_results');
              sessionStorage.removeItem('subbito_current_config');
              window.dispatchEvent(new Event('storage'));
              navigate('/');
            }}
            className="w-full h-full flex items-center justify-center text-white bg-red-600 hover:bg-red-700"
          >
            <RotateCcw size={22} />
          </button>
          {/* TEMA (sole/luna) */}
          <button
            aria-label="Toggle tema"
            onClick={toggleTheme}
            className="w-full h-full flex items-center justify-center hover:bg-slate-800"
            title={isDarkTheme ? 'Tema chiaro' : 'Tema scuro'}
          >
            {isDarkTheme ? <Sun size={22} /> : <Moon size={22} />}
          </button>
        </div>
      </div>

      <nav style={{ width: 260, padding: 16 }} className="hidden md:flex bg-slate-950 text-white flex-col gap-2">
        <NavButton to="/" icon={HomeIcon} label="HOME" />
        <NavButton to="/overview" icon={Eye} label="OVERVIEW" disabled={!hasCalculated} />
        <NavButton to="/prediction" icon={Activity} label="PREDIZIONE" disabled={!hasCalculated} />
        <NavButton to="/report" icon={FileText} label="REPORT" disabled={!hasCalculated} />
        {/* APRI: apri sempre il selettore di cartella (seed su ultima scelta), poi naviga */}
        <button
          onClick={async () => {
            try {
              if (!isFsAccessSupported()) {
                navigate('/saved');
                return;
              }
              const handle = await chooseConfigDirectory();
              if (handle) {
                navigate('/saved');
              }
            } catch (_) {
              // In caso di problemi, lascia comunque accedere alla pagina Saved
              navigate('/saved');
            }
          }}
          className={`
          w-full py-3 px-4 rounded-lg flex items-center gap-3 transition-all
          ${location.pathname === '/saved' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}
        `}
        >
          <FolderOpen size={20} />
          <span className="font-semibold text-sm uppercase">APRI</span>
        </button>
        
        <div className="h-px bg-gray-700 my-2" />
        
        {/* Toggle tema (Sole/Luna) su desktop */}
        <button
          onClick={() => {
            // Toggle tema tramite ThemeContext
            if (typeof toggleTheme === 'function') toggleTheme();
          }}
          className="w-full py-3 px-4 rounded-lg flex items-center gap-3 bg-slate-800 hover:bg-slate-700 text-white transition-all"
        >
          {isDarkTheme ? <Sun size={20} /> : <Moon size={20} />}
          <span className="font-semibold text-sm uppercase">TEMA</span>
        </button>

        {/* SALVA e RESET disponibili su tutte le pagine */}
        <button
          onClick={() => {
            // Se non siamo in Home, naviga in Home e poi apri il modal di salvataggio
            if (location.pathname !== '/') {
              navigate('/');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('subbito-save-config'));
              }, 250);
            } else {
              window.dispatchEvent(new CustomEvent('subbito-save-config'));
            }
          }}
          className="w-full py-3 px-4 rounded-lg flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white transition-all"
        >
          <Save size={20} />
          <span className="font-semibold text-sm uppercase">SALVA</span>
        </button>

        <button
          onClick={() => {
            // Esegui il reset globale anche fuori da Home
            sessionStorage.removeItem('subbito_calculation_done');
            sessionStorage.removeItem('subbito_results');
            sessionStorage.removeItem('subbito_current_config');
            // Notifica gli altri componenti (Layout ascolta 'storage')
            window.dispatchEvent(new Event('storage'));
            // Torna alla Home
            navigate('/');
          }}
          className="w-full py-3 px-4 rounded-lg flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white transition-all"
        >
          <RotateCcw size={20} />
          <span className="font-semibold text-sm uppercase">RESET</span>
        </button>

        {/* Brand text under RESET: uppercase, bold, no box (same vertical space as a button) */}
        <div className="w-full flex items-center justify-center py-3 select-none">
          <span
            className="uppercase font-extrabold tracking-widest text-blue-300 leading-none"
            style={{ fontSize: '2.22rem' }}
          >
            SUBBITO
          </span>
        </div>
      </nav>

      {/* Rimuovo il padding inline (che sovrascriveva pt-14) e uso solo classi Tailwind */}
      <main style={{ flex: 1 }} className="px-5 pb-5 pt-14 md:pt-0">
        {/* Brand grande solo in Home, subito sotto la barra fissa, visibile solo su mobile */}
        {location.pathname === '/' && (
          <div className="md:hidden w-full flex items-center justify-center py-2 select-none">
            <span
              className="uppercase font-extrabold tracking-widest text-blue-300 leading-none"
              style={{ fontSize: '2.5rem' }}
            >
              SUBBITO
            </span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}

// Define routes and opt into v7 future flags to remove warnings
const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'overview', element: <Overview /> },
      { path: 'prediction', element: <Prediction /> },
      { path: 'visualization', element: <Visualization /> },
      { path: 'report', element: <Report /> },
      { path: 'saved', element: <SavedConfigs /> },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
], {
  future: {
    // opt-in early to v7 behaviors to silence the warnings shown in dev
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true
  }
});

export default function Layout() {
  return <RouterProvider router={router} />;
}


