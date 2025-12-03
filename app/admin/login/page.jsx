'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authAPI } from '@/lib/api';
import { useToast } from '@/components/shared/Toast';
import AppLogo from '@/components/shared/AppLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);
      if (response.data.success) {
        Cookies.set('token', response.data.token, { expires: 7 });
        showToast('Login successful!', 'success');
        router.push('/admin/dashboard');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Login failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 sm:p-6 font-sans">
      
    {/* Card-style center container (requirements 1, 2, 3, 4) */}
    <div className="max-w-md w-full bg-white p-8 sm:p-10 lg:p-12 shadow-2xl rounded-2xl space-y-8 transition-all duration-300">
      
      {/* Header Section */}
      <div>
        <div className="flex justify-center mb-6">
          <AppLogo />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 mt-4">
          Admin Login
        </h2>
        <p className="mt-2 text-center text-base text-gray-500">
          Sign in to your account
        </p>
      </div>
      
      {/* Form Section */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Inputs are now separated for clean, modern spacing (requirement 2) */}
        <div className="space-y-4">
          
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              // Updated input styling: rounded-xl, increased padding, subtle border (requirement 5)
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl transition duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 sm:text-sm shadow-sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          {/* Password Input */}
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              // Updated input styling: rounded-xl, increased padding, subtle border (requirement 5)
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl transition duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 sm:text-sm shadow-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={loading}
            // Updated button styling: full primary color, rounded-xl, shadow-md, and better hover/disabled states
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-semibold rounded-xl text-white bg-indigo-600 shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                {/* Tailwind CSS spinner for loading state */}
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </form>
    </div>
    
  </div>
  );
}

