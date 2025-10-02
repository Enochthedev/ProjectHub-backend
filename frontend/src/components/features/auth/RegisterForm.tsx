'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth';
import { RegisterData } from '@/types/auth';

const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address')
      .refine((email) => email.endsWith('@ui.edu.ng'), {
        message: 'Must use University of Ibadan email (@ui.edu.ng)',
      }),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.enum(['student', 'supervisor'], {
      required_error: 'Please select your role',
    }),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    // Student-specific fields
    studentId: z.string().optional(),
    specialization: z.string().optional(),
    year: z.number().optional(),
    // Supervisor-specific fields
    supervisorName: z.string().optional(),
    supervisorSpecializations: z.array(z.string()).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.role === 'student') {
        return data.studentId && data.specialization && data.year;
      }
      return true;
    },
    {
      message: 'Student ID, specialization, and year are required for students',
      path: ['studentId'],
    }
  )
  .refine(
    (data) => {
      if (data.role === 'supervisor') {
        return data.supervisorName && data.supervisorSpecializations?.length;
      }
      return true;
    },
    {
      message: 'Name and specializations are required for supervisors',
      path: ['supervisorName'],
    }
  );

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  redirectTo = '/dashboard',
}) => {
  const router = useRouter();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'student',
      year: new Date().getFullYear(),
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearError();

      // Prepare registration data based on role to match backend RegisterDto
      const registrationData = {
        email: data.email,
        password: data.password,
        role: data.role,
        name: data.role === 'student' 
          ? `${data.firstName} ${data.lastName}` 
          : data.supervisorName!,
        ...(data.role === 'student' && {
          skills: [],
          interests: [],
        }),
        ...(data.role === 'supervisor' && {
          specializations: data.supervisorSpecializations || [],
        }),
      };

      await registerUser(registrationData);

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(redirectTo);
      }
    } catch (err: unknown) {
      // Handle specific validation errors
      if (err.response?.data?.errors) {
        const serverErrors = err.response.data.errors;
        Object.keys(serverErrors).forEach((field) => {
          setError(field as keyof RegisterFormData, {
            type: 'server',
            message: serverErrors[field],
          });
        });
      }
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-black">Create Account</h1>
        <p className="mt-2 text-sm text-gray-600">
          Join ProjectHub to start managing your projects.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded border-2 border-black bg-gray-50 p-3">
            <div className="flex items-center">
              <svg
                className="mr-2 h-4 w-4 text-black"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-black">{error}</span>
            </div>
          </div>
        )}

        {/* Role Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-black">
            I am a
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex cursor-pointer items-center space-x-2 rounded border-2 border-gray-300 p-3 hover:border-gray-400">
              <input
                {...register('role')}
                type="radio"
                value="student"
                className="h-4 w-4 border-2 border-gray-300 text-black focus:ring-2 focus:ring-gray-400"
              />
              <span className="text-sm font-medium">Student</span>
            </label>
            <label className="flex cursor-pointer items-center space-x-2 rounded border-2 border-gray-300 p-3 hover:border-gray-400">
              <input
                {...register('role')}
                type="radio"
                value="supervisor"
                className="h-4 w-4 border-2 border-gray-300 text-black focus:ring-2 focus:ring-gray-400"
              />
              <span className="text-sm font-medium">Supervisor</span>
            </label>
          </div>
          {errors.role && (
            <p className="mt-1 text-sm text-black">{errors.role.message}</p>
          )}
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            {...register('firstName')}
            label="First Name"
            placeholder="Enter your first name"
            error={errors.firstName?.message}
            autoComplete="given-name"
          />
          <Input
            {...register('lastName')}
            label="Last Name"
            placeholder="Enter your last name"
            error={errors.lastName?.message}
            autoComplete="family-name"
          />
        </div>

        <Input
          {...register('email')}
          type="email"
          label="Email Address"
          placeholder="student@ui.edu.ng"
          error={errors.email?.message}
          autoComplete="email"
        />

        {/* Role-specific fields */}
        {selectedRole === 'student' && (
          <>
            <Input
              {...register('studentId')}
              label="Student ID"
              placeholder="Enter your student ID"
              error={errors.studentId?.message}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-black">
                  Specialization
                </label>
                <select
                  {...register('specialization')}
                  className="flex h-10 w-full border-2 border-gray-300 bg-white px-3 py-2 text-sm focus-visible:border-black focus-visible:outline-none"
                >
                  <option value="">Select specialization</option>
                  <option value="Artificial Intelligence & Machine Learning">Artificial Intelligence & Machine Learning</option>
                  <option value="Web Development & Full Stack">Web Development & Full Stack</option>
                  <option value="Mobile Application Development">Mobile Application Development</option>
                  <option value="Cybersecurity & Information Security">Cybersecurity & Information Security</option>
                  <option value="Data Science & Analytics">Data Science & Analytics</option>
                  <option value="Cloud Computing & DevOps">Cloud Computing & DevOps</option>
                  <option value="Software Engineering & Architecture">Software Engineering & Architecture</option>
                  <option value="Human-Computer Interaction">Human-Computer Interaction</option>
                  <option value="Database Systems & Management">Database Systems & Management</option>
                  <option value="Network Systems & Administration">Network Systems & Administration</option>
                </select>
                {errors.specialization && (
                  <p className="mt-1 text-sm text-black">{errors.specialization.message}</p>
                )}
              </div>
              <Input
                {...register('year', { valueAsNumber: true })}
                type="number"
                label="Year"
                placeholder="2024"
                error={errors.year?.message}
                min={2020}
                max={2030}
              />
            </div>
          </>
        )}

        {selectedRole === 'supervisor' && (
          <>
            <Input
              {...register('supervisorName')}
              label="Full Name"
              placeholder="Enter your full name"
              error={errors.supervisorName?.message}
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Specializations
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  'Artificial Intelligence & Machine Learning',
                  'Web Development & Full Stack',
                  'Mobile Application Development',
                  'Cybersecurity & Information Security',
                  'Data Science & Analytics',
                  'Cloud Computing & DevOps',
                  'Software Engineering & Architecture',
                  'Human-Computer Interaction',
                  'Database Systems & Management',
                  'Network Systems & Administration',
                ].map((spec) => (
                  <label
                    key={spec}
                    className="flex cursor-pointer items-center space-x-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      value={spec}
                      {...register('supervisorSpecializations')}
                      className="h-4 w-4 border-2 border-gray-300 text-black focus:ring-2 focus:ring-gray-400"
                    />
                    <span>{spec}</span>
                  </label>
                ))}
              </div>
              {errors.supervisorSpecializations && (
                <p className="mt-1 text-sm text-black">
                  {errors.supervisorSpecializations.message}
                </p>
              )}
            </div>
          </>
        )}

        {/* Password fields */}
        <div>
          <div className="relative">
            <Input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Create a password"
              error={errors.password?.message}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-3 top-9 text-gray-400 hover:text-black focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div>
          <div className="relative">
            <Input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirm Password"
              placeholder="Confirm your password"
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-3 top-9 text-gray-400 hover:text-black focus:outline-none"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-black hover:underline focus:outline-none focus:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};