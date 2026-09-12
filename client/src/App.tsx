import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { SiteFooter } from './components/SiteFooter';
import { HomePage } from './pages/HomePage';
import { ReportPage } from './pages/ReportPage';
import { VerifyPage } from './pages/VerifyPage';

export default function App() {
  return <BrowserRouter>
    <RouteEffects />
    <a className="skip-link" href="#main-content">Skip to content</a>
    <Navbar />
    <div id="main-content" tabIndex={-1}><Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/report/:id" element={<ReportPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes></div>
    <SiteFooter />
  </BrowserRouter>;
}

function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (pathname === '/') document.title = 'AssetForge Verify — Know before you import';
    if (pathname === '/verify') document.title = 'Verify a Unity asset — AssetForge Verify';
    const frame = window.requestAnimationFrame(() => {
      if (hash) {
        try { document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        catch { window.scrollTo({ top: 0, behavior: 'auto' }); }
      }
      else window.scrollTo({ top: 0, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}
