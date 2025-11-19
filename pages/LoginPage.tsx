import React, { useState } from 'react';
import { GoogleIcon } from '../components/icons/GoogleIcon';
import { GlobalLogoIcon } from '../components/icons/GlobalLogoIcon';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [view, setView] = useState<'signin' | 'reset' | 'reset_sent'>('signin');
  const [email, setEmail] = useState('demo@example.com');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd call Firebase here.
    console.log(`Password reset requested for ${email}`);
    setView('reset_sent');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-10 space-y-8 bg-glass rounded-2xl shadow-lg border border-border-color">
        <div className="flex flex-col items-center">
          <GlobalLogoIcon className="h-12 w-auto text-primary" />
          <h2 className="mt-4 text-3xl font-bold text-center text-text-primary">
            {view === 'signin' && 'Sign in to your account'}
            {view === 'reset' && 'Reset your password'}
            {view === 'reset_sent' && 'Check your email'}
          </h2>
          <p className="mt-2 text-sm text-center text-text-secondary">
            {view === 'signin' && 'Welcome back to the dashboard.'}
            {view === 'reset' && 'Enter your email to receive a password reset link.'}
            {view === 'reset_sent' && `We've sent a password reset link to ${email}.`}
          </p>
        </div>

        {view === 'signin' && (
          <>
            <button
              onClick={onLogin}
              type="button"
              className="w-full flex justify-center items-center py-3 px-4 border border-border-color rounded-lg shadow-sm text-sm font-medium text-text-primary bg-glass hover:bg-glass-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-colors"
            >
              <GoogleIcon className="w-5 h-5 mr-2" />
              Sign in with Google
            </button>

            <div className="flex items-center justify-center">
              <div className="flex-grow border-t border-border-color"></div>
              <span className="flex-shrink mx-4 text-sm text-text-secondary">Or continue with</span>
              <div className="flex-grow border-t border-border-color"></div>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
              <div className="space-y-4 rounded-md shadow-sm">
                <div>
                  <label htmlFor="email-address" className="sr-only">Email address</label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none relative block w-full px-3 py-3 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                    placeholder="Email address"
                    defaultValue="demo@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="appearance-none relative block w-full px-3 py-3 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                    placeholder="Password"
                    defaultValue="password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-primary bg-glass-light border-border-color rounded focus:ring-primary"/>
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-text-secondary">Remember me</label>
                </div>
                <div className="text-sm">
                  <a href="#" onClick={(e) => { e.preventDefault(); setView('reset'); }} className="font-medium text-primary hover:text-primary-hover">Forgot your password?</a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary"
                >
                  Sign in
                </button>
              </div>
            </form>
          </>
        )}

        {view === 'reset' && (
           <form className="mt-8 space-y-6" onSubmit={handleResetSubmit}>
             <div>
                <label htmlFor="email-reset" className="sr-only">Email address</label>
                <input
                  id="email-reset"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none relative block w-full px-3 py-3 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
               <div className="flex items-center justify-between">
                 <div className="text-sm">
                    <a href="#" onClick={(e) => { e.preventDefault(); setView('signin'); }} className="font-medium text-primary hover:text-primary-hover">Back to Sign in</a>
                 </div>
              </div>
              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary"
                >
                  Send Reset Link
                </button>
              </div>
           </form>
        )}

        {view === 'reset_sent' && (
             <div className="text-center">
                <button
                  onClick={() => setView('signin')}
                  className="font-medium text-primary hover:text-primary-hover text-sm"
                >
                  Back to Sign in
                </button>
              </div>
        )}

      </div>
    </div>
  );
};

export default LoginPage;