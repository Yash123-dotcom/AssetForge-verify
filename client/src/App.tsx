import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { SiteFooter } from './components/SiteFooter';
import { BetaOnboarding } from './components/BetaOnboarding';
import { HomePage } from './pages/HomePage';
import { ReportPage } from './pages/ReportPage';
import { VerifyPage } from './pages/VerifyPage';
import { AuthPage } from './pages/AuthPage';
import { PricingPage } from './pages/PricingPage';
import { DashboardPage } from './pages/DashboardPage';
import { AccountPage } from './pages/AccountPage';
import { PaymentResultPage } from './pages/PaymentResultPage';
import { RequireAuth } from './components/RequireAuth';

export default function App() {
  return <BrowserRouter>
    <RouteEffects />
    <a className="skip-link" href="#main-content">Skip to content</a>
    <Navbar />
    <BetaOnboarding />
    <div id="main-content" tabIndex={-1}><Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/report/:id" element={<ReportPage />} />
        <Route path="/demo" element={<ReportPage demo />} />
        <Route path="/login" element={<AuthPage mode="LOGIN" />} />
        <Route path="/signup" element={<AuthPage mode="SIGNUP" />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="/payment/success" element={<RequireAuth><PaymentResultPage /></RequireAuth>} />
        <Route path="/payment/cancelled" element={<PaymentResultPage cancelled />} />
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
