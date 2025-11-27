'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Image from 'next/image';
import { playerAPI, tournamentAPI } from '@/lib/api';
import ImageCropModal from '@/components/shared/ImageCropModal';

const playerSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  mobile: Yup.string()
    .required('Mobile is required')
    .matches(/^[0-9]{10,15}$/, 'Mobile must be 10-15 digits'),
  location: Yup.string(),
  role: Yup.string()
    .oneOf(['Batter', 'Bowler', 'All-Rounder'], 'Invalid role')
    .required('Role is required'),
  battingStyle: Yup.string().oneOf(['Right', 'Left'], 'Invalid batting style'),
  bowlingStyle: Yup.string().oneOf(
    [
      'Right-arm medium',
      'Right-arm fast',
      'Right-arm spin',
      'Left-arm medium',
      'Left-arm fast',
      'Left-arm orthodox',
      'Left-arm unorthodox',
    ],
    'Invalid bowling style'
  ),
  category: Yup.string()
    .oneOf(['Icon', 'Regular'], 'Invalid category')
    .required('Category is required'),
  basePrice: Yup.number()
    .required('Base price is required')
    .min(0, 'Base price must be 0 or greater')
    .typeError('Base price must be a number'),
  age: Yup.number()
    .min(10, 'Age must be at least 10')
    .max(100, 'Age must be less than 100')
    .typeError('Age must be a number'),
  description: Yup.string()
    .max(500, 'Description must be less than 500 characters'),
  note: Yup.string()
    .max(500, 'Note must be less than 500 characters'),
});

export default function InviteRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (params.token) {
      verifyTokenAndFetchTournament();
    }
  }, [params.token]);

  const verifyTokenAndFetchTournament = async () => {
    try {
      setLoading(true);
      // For now, we'll fetch the first tournament
      // In production, you'd verify the token and get the associated tournament
      const response = await tournamentAPI.getAll();
      if (response.data.data.length > 0) {
        setTournament(response.data.data[0]);
      } else {
        setSubmitError('Invalid invitation link');
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      setSubmitError('Invalid or expired invitation link');
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      name: '',
      mobile: '',
      location: '',
      role: 'Batter',
      battingStyle: '',
      bowlingStyle: '',
      category: 'Regular',
      basePrice: '',
      age: '',
      description: '',
      note: '',
    },
    validationSchema: playerSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setSubmitError('');
        const formData = new FormData();

        formData.append('tournamentId', tournament._id);
        Object.keys(values).forEach((key) => {
          if (values[key] !== '' && values[key] !== null) {
            formData.append(key, values[key]);
          }
        });

        if (imageFile) {
          formData.append('image', imageFile);
        }

        await playerAPI.create(formData);
        setSubmitSuccess(true);

        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } catch (error) {
        console.error('Error registering player:', error);
        setSubmitError(error.response?.data?.message || 'Registration failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError('Image size must be less than 5MB');
        return;
      }
      setImageToCrop(file);
      setShowCropModal(true);
      e.target.value = '';
    }
  };

  const handleCropComplete = (croppedFile) => {
    setImageFile(croppedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(croppedFile);
    setShowCropModal(false);
    setImageToCrop(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError('Image size must be less than 5MB');
        return;
      }
      setImageToCrop(file);
      setShowCropModal(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (submitError && !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-600">{submitError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome Aboard!</h2>
            <p className="text-lg text-gray-600 mb-2">Registration successful</p>
            <p className="text-sm text-gray-500">Redirecting you to the homepage...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Tournament Header Card */}
        <div className="mb-8 sm:mb-10">
          <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-3xl shadow-2xl p-8 sm:p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <p className="text-blue-100 text-sm font-medium mb-2 uppercase tracking-wider">You're Invited To Join</p>
                  <h1 className="text-3xl sm:text-4xl font-bold mb-3">{tournament?.name || 'Tournament'}</h1>
                  <p className="text-blue-100 text-base sm:text-lg">Complete your registration to participate in the auction</p>
                </div>
                {tournament?.logo && (
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl p-3 shadow-lg flex-shrink-0">
                    <Image
                      src={tournament.logo}
                      alt={tournament.name}
                      fill
                      className="object-contain p-2"
                      sizes="96px"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Registration Form Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-10">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Player Registration</h2>
              <p className="text-gray-600">Fill in your details to complete your registration</p>
            </div>

            {submitError && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700 font-medium">{submitError}</p>
              </div>
            )}

            <form onSubmit={formik.handleSubmit} className="space-y-8">
              {/* Player Image Upload Section */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 sm:p-8 border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors">
                <label className="block mb-4">
                  <span className="text-lg font-bold text-gray-900 mb-2 block">Profile Photo</span>
                  <span className="text-sm text-gray-600">Add a photo to personalize your profile</span>
                </label>

                <div className="flex flex-col items-center">
                  {/* Avatar Preview */}
                  <div
                    className={`relative w-40 h-40 mb-6 rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 shadow-lg transition-all duration-300 ${
                      isDragging ? 'scale-105 ring-4 ring-primary-500' : ''
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="Profile preview"
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {imagePreview ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                    >
                      Remove Photo
                    </button>
                  )}
                  <p className="mt-4 text-xs text-gray-500 text-center">
                    Drag and drop or click to upload
                    <br />
                    PNG, JPG up to 5MB
                  </p>
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 pb-2 border-b-2 border-gray-200">Personal Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                        formik.touched.name && formik.errors.name
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 hover:border-primary-400 focus:border-primary-500'
                      } focus:outline-none focus:ring-2 focus:ring-primary-200`}
                      placeholder="Enter your full name"
                    />
                    {formik.touched.name && formik.errors.name && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {formik.errors.name}
                      </p>
                    )}
                  </div>

                  {/* Mobile */}
                  <div>
                    <label htmlFor="mobile" className="block text-sm font-semibold text-gray-700 mb-2">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="mobile"
                      name="mobile"
                      type="tel"
                      value={formik.values.mobile}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                        formik.touched.mobile && formik.errors.mobile
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 hover:border-primary-400 focus:border-primary-500'
                      } focus:outline-none focus:ring-2 focus:ring-primary-200`}
                      placeholder="10-15 digits"
                    />
                    {formik.touched.mobile && formik.errors.mobile && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {formik.errors.mobile}
                      </p>
                    )}
                  </div>

                  {/* Age */}
                  <div>
                    <label htmlFor="age" className="block text-sm font-semibold text-gray-700 mb-2">
                      Age
                    </label>
                    <input
                      id="age"
                      name="age"
                      type="number"
                      value={formik.values.age}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                        formik.touched.age && formik.errors.age
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 hover:border-primary-400 focus:border-primary-500'
                      } focus:outline-none focus:ring-2 focus:ring-primary-200`}
                      placeholder="Your age"
                      min="10"
                      max="100"
                    />
                    {formik.touched.age && formik.errors.age && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {formik.errors.age}
                      </p>
                    )}
                  </div>

                  {/* Location */}
                  <div className="md:col-span-2">
                    <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      value={formik.values.location}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200"
                      placeholder="City or area"
                    />
                  </div>
                </div>
              </div>

              {/* Cricket Information Section */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 pb-2 border-b-2 border-gray-200">Cricket Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Role */}
                  <div>
                    <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formik.values.role}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                        formik.touched.role && formik.errors.role
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 hover:border-primary-400 focus:border-primary-500'
                      } focus:outline-none focus:ring-2 focus:ring-primary-200`}
                    >
                      <option value="Batter">Batter</option>
                      <option value="Bowler">Bowler</option>
                      <option value="All-Rounder">All-Rounder</option>
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formik.values.category}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                        formik.touched.category && formik.errors.category
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 hover:border-primary-400 focus:border-primary-500'
                      } focus:outline-none focus:ring-2 focus:ring-primary-200`}
                    >
                      <option value="Icon">Icon</option>
                      <option value="Regular">Regular</option>
                    </select>
                  </div>

                  {/* Batting Style */}
                  <div>
                    <label htmlFor="battingStyle" className="block text-sm font-semibold text-gray-700 mb-2">
                      Batting Style
                    </label>
                    <select
                      id="battingStyle"
                      name="battingStyle"
                      value={formik.values.battingStyle}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200"
                    >
                      <option value="">Select</option>
                      <option value="Right">Right</option>
                      <option value="Left">Left</option>
                    </select>
                  </div>

                  {/* Bowling Style */}
                  <div>
                    <label htmlFor="bowlingStyle" className="block text-sm font-semibold text-gray-700 mb-2">
                      Bowling Style
                    </label>
                    <select
                      id="bowlingStyle"
                      name="bowlingStyle"
                      value={formik.values.bowlingStyle}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200"
                    >
                      <option value="">Select</option>
                      <option value="Right-arm medium">Right-arm medium</option>
                      <option value="Right-arm fast">Right-arm fast</option>
                      <option value="Right-arm spin">Right-arm spin</option>
                      <option value="Left-arm medium">Left-arm medium</option>
                      <option value="Left-arm fast">Left-arm fast</option>
                      <option value="Left-arm orthodox">Left-arm orthodox</option>
                      <option value="Left-arm unorthodox">Left-arm unorthodox</option>
                    </select>
                  </div>

                  {/* Base Price */}
                  <div className="md:col-span-2">
                    <label htmlFor="basePrice" className="block text-sm font-semibold text-gray-700 mb-2">
                      Base Price <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                      <input
                        id="basePrice"
                        name="basePrice"
                        type="number"
                        value={formik.values.basePrice}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className={`w-full pl-8 pr-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                          formik.touched.basePrice && formik.errors.basePrice
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-primary-400 focus:border-primary-500'
                        } focus:outline-none focus:ring-2 focus:ring-primary-200`}
                        placeholder="Enter your base price"
                        min="0"
                      />
                    </div>
                    {formik.touched.basePrice && formik.errors.basePrice && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {formik.errors.basePrice}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 pb-2 border-b-2 border-gray-200">Additional Information</h3>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200 resize-none"
                    placeholder="Tell us about yourself, your achievements, playing style, etc."
                  />
                  <p className="mt-1.5 text-xs text-gray-500">Maximum 500 characters</p>
                </div>

                {/* Note */}
                <div>
                  <label htmlFor="note" className="block text-sm font-semibold text-gray-700 mb-2">
                    Note
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    value={formik.values.note}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200 resize-none"
                    placeholder="Any additional notes or special requirements"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">Maximum 500 characters</p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={formik.isSubmitting}
                  className="w-full bg-gradient-to-r from-primary-600 to-blue-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                >
                  {formik.isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      Complete Registration
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Need help? Contact the tournament organizers
          </p>
        </div>
      </div>

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setImageToCrop(null);
        }}
        imageFile={imageToCrop}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
      />
    </div>
  );
}