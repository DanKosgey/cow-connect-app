import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatAPI } from '@/services/ApiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Define types for chat messages
interface ChatMessage {
  from_user: string;
  text: string;
  timestamp?: string;
}

// Function to send chat message to backend
const sendChatMessage = async (message: string, userId: string): Promise<ChatMessage> => {
  try {
    const response = await ChatAPI.sendMessage(message, `Staff support for user ${userId}`);
    return {
      from_user: 'assistant',
      text: response.response,
      timestamp: response.timestamp
    };
  } catch (error) {
    console.error('Chat API error:', error);
    throw error;
  }
};

export function StaffChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from_user: 'system', text: 'Welcome to Staff Support! How can we help?' }
  ]);
  const [input, setInput] = useState('');
  const { user } = useAuth();

  const send = async () => {
    if (!input.trim() || !user) return;
    
    // Add user message to chat immediately for better UX
    const userMessage: ChatMessage = { from_user: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    try {
      // Send to backend and get response
      const response = await sendChatMessage(input, user.id);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      setMessages(prev => [...prev, { from_user: 'system', text: 'Failed to send message. Please try again.' }]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="w-80 bg-white rounded-xl shadow-lg border p-4 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-emerald-700">Staff Chat</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-red-500"
            >
              ✕
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto mb-2 max-h-60">
            {messages.map((m, i) => (
              <div key={i} className={`mb-2 ${m.from_user === 'user' ? 'text-right' : ''}`}>
                <span className={`inline-block px-3 py-1 rounded-lg ${m.from_user === 'user' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>{m.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={e => e.key === 'Enter' && send()}
              className="flex-1"
            />
            <Button 
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={send}
            >
              Send
            </Button>
          </div>
        </div>
      ) : (
        <Button 
          className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-full shadow-lg"
          onClick={() => setOpen(true)}
        >
          💬 Staff Chat
        </Button>
      )}
    </div>
  );
}