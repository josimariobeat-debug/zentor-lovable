/**
 * ⚠️ ROUTING RULES:
 * - Routes are defined here using <Routes> + <Route>
 * - BrowserRouter is already in main.tsx
 * - Use Navigate for redirects
 */
import { Routes, Route, Navigate } from 'react-router';
import { useEffect } from 'react';

import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeusApps from '@/pages/MeusApps';
import LojaApps from '@/pages/LojaApps';
import Tutoriais from '@/pages/Tutoriais';
import Assinaturas from '@/pages/Assinaturas';
import Perfil from '@/pages/Perfil';
import StoriesVideosApp from '@/pages/StoriesVideosApp';
import AdicionarStory from '@/pages/AdicionarStory';
import AppearanceEditor from '@/pages/AppearanceEditor';
import MobileUpload from '@/pages/MobileUpload';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import DevStoryViewer from '@/pages/DevStoryViewer';


export default function App() {
  useEffect(() => {
    document.title = 'Zentor';
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/mobile-upload/:token" element={<MobileUpload />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MeusApps />} />
        <Route path="loja" element={<LojaApps />} />
        <Route path="tutoriais" element={<Tutoriais />} />
        <Route path="assinaturas" element={<Assinaturas />} />
        <Route path="perfil" element={<Perfil />} />
        
        <Route path="app/:appId" element={<StoriesVideosApp />} />
        <Route path="app/:appId/aparencia/:presetId" element={<AppearanceEditor />} />
        <Route path="app/:appId/story/:storyId" element={<AdicionarStory />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
