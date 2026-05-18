import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ModelsRegistry from "./pages/ModelsRegistry";
import ModelDetails from "./pages/ModelDetails";
import UploadModel from "./pages/UploadModel";
import TestPrediction from "./pages/TestPrediction";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import "./index.css";

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="models" element={<ModelsRegistry />} />
          <Route path="models/upload" element={<UploadModel />} />
          <Route path="models/:id" element={<ModelDetails />} />
          <Route path="models/:id/test" element={<TestPrediction />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
