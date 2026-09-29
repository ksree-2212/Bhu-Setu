import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Overview } from './pages/Overview'
import { Profile } from './pages/Profile'
import { Notifications } from './pages/Notifications'
import { Settings } from './pages/Settings'
import { Research } from './pages/Research'
import { AiEvidence } from './pages/AiEvidence'
import { GisStudio } from './pages/GisStudio'
import { SavedResearch } from './pages/SavedResearch'
import { HelpSupport } from './pages/HelpSupport'
import { Publications } from './pages/Publications'
import { PolicyLab } from './pages/PolicyLab'
import { PolicyDocuments } from './pages/PolicyDocuments'
import { LandUseAnalysis } from './pages/LandUseAnalysis'
import { ClimateRisk } from './pages/ClimateRisk'
import { Analytics } from './pages/Analytics'
import { DataCatalog } from './pages/DataCatalog'
import { InnovationPortal } from './pages/InnovationPortal'
import { Provenance } from './pages/Provenance'
import { Reports } from './pages/Reports'
import { Admin } from './pages/Admin'
import { AuditLogs } from './pages/AuditLogs'
import { Workspaces } from './pages/Workspaces'
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    const applyAccessibility = () => {
      const settingsStr = localStorage.getItem('bhu_settings');
      if (settingsStr) {
        const p = JSON.parse(settingsStr);
        if (p.accMotion) document.body.classList.add('reduce-motion');
        else document.body.classList.remove('reduce-motion');
        
        if (p.accLargerText) document.body.classList.add('larger-text');
        else document.body.classList.remove('larger-text');

        if (p.accContrast) document.body.classList.add('high-contrast');
        else document.body.classList.remove('high-contrast');
      } else {
        document.body.classList.remove('reduce-motion', 'larger-text', 'high-contrast');
      }
    };
    applyAccessibility();
    window.addEventListener('bhu_settings_changed', applyAccessibility);
    return () => window.removeEventListener('bhu_settings_changed', applyAccessibility);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/landing" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Overview />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<HelpSupport />} />
          <Route path="/research/repository" element={<Research />} />
          <Route path="/research/saved" element={<SavedResearch />} />
          <Route path="/research/publications" element={<Publications />} />
          <Route path="/research/*" element={<Navigate to="/research/repository" replace />} />
          <Route path="/ai" element={<AiEvidence />} />
          
          {/* Policy Group */}
          <Route path="/policy/documents" element={<PolicyDocuments />} />
          <Route path="/policy/simulation" element={<PolicyLab />} />
          <Route path="/policy" element={<Navigate to="/policy/simulation" replace />} />

          {/* GIS Group */}
          <Route path="/gis/maps" element={<GisStudio />} />
          <Route path="/gis/analysis" element={<LandUseAnalysis />} />
          <Route path="/gis/climate" element={<ClimateRisk />} />
          <Route path="/gis" element={<Navigate to="/gis/maps" replace />} />

          {/* Data & Analytics Group */}
          <Route path="/data/datasets" element={<DataCatalog />} />
          <Route path="/data/insights" element={<Reports />} />
          <Route path="/data" element={<Navigate to="/data/datasets" replace />} />

          <Route path="/analytics" element={<Analytics />} />
          
          {/* Collaboration Group */}
          <Route path="/workspaces" element={<Workspaces />} />
          <Route path="/workspaces/:id" element={<Workspaces />} />
          <Route path="/innovation" element={<InnovationPortal />} />
          <Route path="/collaboration" element={<Navigate to="/workspaces" replace />} />
          <Route path="/collaboration/workspaces" element={<Navigate to="/workspaces" replace />} />
          <Route path="/collaboration/innovation" element={<Navigate to="/innovation" replace />} />

          <Route path="/governance/provenance" element={<Provenance />} />
          <Route path="/governance/audit" element={<AuditLogs />} />
          <Route path="/reports" element={<Navigate to="/data/insights" replace />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
