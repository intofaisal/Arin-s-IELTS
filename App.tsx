import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/Upload';
import ReadingPage from './pages/Reading';
import WritingPage from './pages/Writing';
import SpeakingPage from './pages/Speaking';
import HistoryPage from './pages/History';
import LoginPage from './pages/Login';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/reading" element={<ReadingPage />} />
          <Route path="/writing" element={<WritingPage />} />
          <Route path="/speaking" element={<SpeakingPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;