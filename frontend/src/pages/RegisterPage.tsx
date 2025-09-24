import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

// Public mode: no registration, redirect to dashboard
const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/dashboard', { replace: true }), 0);
    return () => clearTimeout(t);
  }, [navigate]);

  return <Navigate to="/dashboard" replace />;
};

export default RegisterPage;