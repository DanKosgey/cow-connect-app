import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface AuthLoadingScreenProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

/**
 * Authentication Loading Screen
 * Provides a visually appealing loading experience during authentication operations
 */
export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({ 
  message = 'Securing your session...', 
  showProgress = false,
  progress = 0 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 shadow-xl bg-card/80 backdrop-blur-sm border-border/50">
          <div className="text-center space-y-6">
            {/* Animated Logo */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="flex justify-center"
            >
              <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-medium">
                <Loader2 className="w-8 h-8 text-primary-foreground" />
              </div>
            </motion.div>

            {/* Loading Message */}
            <div className="space-y-2">
              <h2 className="text-2xl font-heading font-bold text-foreground">
                Authenticating
              </h2>
              <p className="text-muted-foreground">
                {message}
              </p>
            </div>

            {/* Progress Bar */}
            {showProgress && (
              <div className="space-y-2">
                <div className="w-full bg-secondary rounded-full h-2">
                  <motion.div 
                    className="bg-primary h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(progress)}% complete
                </p>
              </div>
            )}

            {/* Status Indicators */}
            <div className="flex justify-center space-x-2">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-primary rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};