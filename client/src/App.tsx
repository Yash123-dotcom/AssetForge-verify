import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { SiteFooter } from './components/SiteFooter';
import { HomePage } from './pages/HomePage';
import { ReportPage } from './pages/ReportPage';
import { VerifyPage } from './pages/VerifyPage';

export default function App() {
  return <BrowserRouter>
    <Navbar />
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/report/:id" element={<ReportPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
    <SiteFooter />
  </BrowserRouter>;
}
