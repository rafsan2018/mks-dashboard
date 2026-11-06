import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Genset from './pages/Genset';
import DPM from './pages/DPM';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Profile from './pages/Profile';
import AlertRecipients from './pages/AlertRecipients';

import { LoadingProvider } from './context/LoadingContext';
import GlobalLoadingSpinner from './components/GlobalLoadingSpinner';

function App() {
  return (
    <LoadingProvider>
      <GlobalLoadingSpinner />
      <Router>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/"          element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/genset"    element={<Genset />} />
                <Route path="/dpm"       element={<DPM />} />
                <Route path="/settings"  element={<Settings />} />
                <Route path="/recipients" element={<AlertRecipients />} />
                <Route path="/users"     element={<Users />} />
                <Route path="/profile"   element={<Profile />} />
                <Route path="*"          element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
      </Router>
    </LoadingProvider>
  );
}

export default App;
