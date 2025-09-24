import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

// Public mode: no login page, redirect to dashboard
const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/dashboard', { replace: true }), 0);
    return () => clearTimeout(t);
  }, [navigate]);

  return <Navigate to="/dashboard" replace />;
};

export default LoginPage;