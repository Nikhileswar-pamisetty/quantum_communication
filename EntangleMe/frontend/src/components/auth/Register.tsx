import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';

export const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.register(username, password);
      toast.success('Registration successful. Please log in.');
      navigate('/login');
    } catch (err: any) {
      console.error('Registration error:', err);
      // The error message from client.ts register() is already the text from the response
      toast.error(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black/95">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-white/10 bg-black/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">Create an Account</h2>
          <p className="mt-2 text-sm text-gray-400">Join the Quantum Chat</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <Input
                type="text"
                required
                className="w-full bg-white/5 border-white/10 text-white"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="password"
                required
                className="w-full bg-white/5 border-white/10 text-white"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Register'}
          </Button>
          <div className="text-center mt-4">
            <button type="button" onClick={() => navigate('/login')} className="text-sm text-blue-400 hover:text-blue-300">
              Already have an account? Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
