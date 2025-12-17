import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const CollectorOnlyLogin = () => {
  const navigate = useNavigate();

  // Redirect to unified login page
  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);

  // Render nothing while redirecting
  return null;
};

export default CollectorOnlyLogin;