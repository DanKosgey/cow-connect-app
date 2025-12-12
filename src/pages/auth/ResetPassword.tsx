import { useNavigate } from "react-router-dom";
import { PasswordResetForm } from "@/components/auth/PasswordReset";

const ResetPassword = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <PasswordResetForm />
      </div>
    </div>
  );
};

export default ResetPassword;