import { useState, useEffect } from "react";
import { lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, Eye, EyeOff, Mail, Phone, User, MapPin, FileText, Camera, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useToastNotifications from "@/hooks/useToastNotifications";
import { useAuth } from "@/contexts/SimplifiedAuthContext";
import { supabase } from "@/integrations/supabase/client";
import EnhancedFarmerSignup from "@/components/farmer/EnhancedFarmerSignup";

const FarmerSignup = () => {
  return <EnhancedFarmerSignup />;
};

export default FarmerSignup;
