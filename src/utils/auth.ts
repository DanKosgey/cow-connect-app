interface OtpAttempt {
  timestamp: number;
  email: string;
}

let otpAttempts: OtpAttempt[] = [];

export const getAttemptsForEmail = (email: string): OtpAttempt[] => {
  const now = Date.now();
  // Remove attempts older than 15 minutes
  otpAttempts = otpAttempts.filter(attempt => 
    now - attempt.timestamp < 15 * 60 * 1000 && attempt.email === email
  );
  return otpAttempts;
};

export const recordOtpAttempt = (email: string) => {
  otpAttempts.push({ timestamp: Date.now(), email });
};