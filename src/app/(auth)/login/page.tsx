'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Mail, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [activationPopupMessage, setActivationPopupMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isActivationError = error.toLowerCase().includes('not activated');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/dashboard',
      });

      if (result?.error) {
        setError(result.error);

        if (result.error.toLowerCase().includes('not activated')) {
          setActivationPopupMessage(result.error);
        }
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient lights matching landing page */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-[#FBCFE8] to-[#E0E7FF] blur-[150px] opacity-40 mix-blend-multiply pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[55%] rounded-full bg-gradient-to-br from-[#E0E7FF] to-[#D1FAE5] blur-[130px] opacity-40 mix-blend-multiply pointer-events-none" />

      <div className="relative z-10 max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-1.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#F472B6] opacity-0 group-hover:opacity-100 transition duration-500 blur-sm" />
              <Heart className="relative h-10 w-10 text-[#2563EB]" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#111827]">CareNest</span>
          </Link>
          <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">Welcome back</h2>
          <p className="mt-2 text-[#6B7280]">Sign in to your account</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-[#E5E7EB]">
          <form onSubmit={handleSubmit} className="space-y-6">

            {error && !isActivationError && (
              <div className="p-3 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-[#111827] bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-shadow"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg text-[#111827] bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-shadow"
                  placeholder="Enter your password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me / Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-[#2563EB] rounded border-gray-300 focus:ring-[#2563EB]"
                />
                <span className="ml-2 text-sm text-[#6B7280]">Remember me</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-sm text-[#2563EB] hover:text-[#1E40AF] font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In */}
            <Button
              type="submit"
              className="w-full !bg-[#2563EB] hover:!bg-[#1E40AF] !rounded-lg !py-2.5"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          {/* Register */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#6B7280]">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="text-[#2563EB] hover:text-[#1E40AF] font-medium"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Activation Modal */}
      <Modal
        isOpen={Boolean(activationPopupMessage)}
        onClose={() => setActivationPopupMessage('')}
        title="Account Activation Required"
        size="md"
      >
        <div className="space-y-4">

          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />

            <p className="text-sm text-amber-900">
              {activationPopupMessage}
            </p>
          </div>

          <p className="text-sm text-gray-700">
            Please contact your nearest MOH office, or use the contacts below
            for assistance.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 space-y-2">
            <p>
              <span className="font-semibold">Email:</span>{' '}

              <a
                href="mailto:support@carenest.lk"
                className="text-[#2563EB] underline font-medium"
              >
                support@carenest.lk
              </a>
            </p>

            <p>
              <span className="font-semibold">Phone:</span>{' '}

              <a
                href="tel:+94112345678"
                className="text-[#2563EB] underline font-medium"
              >
                +94 11 234 5678
              </a>
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setActivationPopupMessage('')}>
              Got it
            </Button>
          </div>

        </div>
      </Modal>
    </div>
  );
}