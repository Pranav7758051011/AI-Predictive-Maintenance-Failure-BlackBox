import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import EquipmentDetails from './pages/EquipmentDetails';
import Predictions from './pages/Predictions';
import Sensors from './pages/Sensors';
import BlackBoxes from './pages/BlackBoxes';
import BlackBoxDetails from './pages/BlackBoxDetails';
import Anomalies from './pages/Anomalies';
import MLInsights from './pages/MLInsights';
import Maintenance from './pages/Maintenance';
import History from './pages/History';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/equipment/:id" element={<EquipmentDetails />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/sensors" element={<Sensors />} />
          <Route path="/blackboxes" element={<BlackBoxes />} />
          <Route path="/blackboxes/:id" element={<BlackBoxDetails />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/ml-insights" element={<MLInsights />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
