'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { playerAPI, tournamentAPI } from '@/lib/api';
import { useToast } from '@/components/shared/Toast';
import ImageCropModal from '@/components/shared/ImageCropModal';
import { useFormik } from 'formik';
import * as Yup from 'yup';

// Validation schema - same as admin form but without tournamentId and basePrice
const playerSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  mobile: Yup.string()
    .required('Mobile is required')
    .matches(/^[0-9]{10,15}$/, 'Mobile must be 10-15 digits'),
  location: Yup.string(),
  role: Yup.string()
    .oneOf(['Batter', 'Bowler', 'All-Rounder', 'Wicket Keeper'], 'Invalid role')
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
  categoryId: Yup.string()
    .required('Category is required'),
  note: Yup.string().max(500, 'Note must be 500 characters or fewer'),
});

const formatDateTime = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch (error) {
    return '';
  }
};

// Premium styled input components - defined outside to prevent re-creation on each render
const PremiumInput = ({ label, name, type = 'text', required = false, error, touched, value, onChange, onBlur, placeholder, className = '' }) => {
  const hasError = touched && error;
  const baseClasses = "w-full px-4 py-3.5 text-base text-gray-900 bg-white border rounded-xl shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:shadow-md hover:border-gray-400 hover:shadow-sm";
  const errorClasses = hasError ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 shadow-red-50" : "border-gray-300";
  
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-semibold text-gray-700 mb-2.5">
        {label}
        {required && <span className="text-red-500 ml-1.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`${baseClasses} ${errorClasses}`}
      />
      {hasError && (
        <p className="mt-2 text-sm text-red-600 flex items-center animate-fade-in">
          <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

const PremiumSelect = ({ label, name, required = false, error, touched, value, onChange, onBlur, options, className = '' }) => {
  const hasError = touched && error;
  const baseClasses = "w-full px-4 py-3.5 pr-12 text-base text-gray-900 bg-white border rounded-xl appearance-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:shadow-md hover:border-gray-400 hover:shadow-sm cursor-pointer";
  const errorClasses = hasError ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 shadow-red-50" : "border-gray-300";
  
  return (
    <div className={`relative ${className}`}>
      <label htmlFor={name} className="block text-sm font-semibold text-gray-700 mb-2.5">
        {label}
        {required && <span className="text-red-500 ml-1.5">*</span>}
      </label>
      <div className="relative focus-within:[&>div>svg]:text-primary-500">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={`${baseClasses} ${errorClasses}`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* Custom dropdown arrow with focus effect */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400 transition-colors duration-200 group-focus-within:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {hasError && (
        <p className="mt-2 text-sm text-red-600 flex items-center animate-fade-in">
          <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

const PremiumTextarea = ({ label, name, required = false, error, touched, value, onChange, onBlur, placeholder, rows = 4, className = '' }) => {
  const hasError = touched && error;
  const baseClasses = "w-full px-4 py-3.5 text-base text-gray-900 bg-white border rounded-xl shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:shadow-md hover:border-gray-400 hover:shadow-sm resize-none";
  const errorClasses = hasError ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 shadow-red-50" : "border-gray-300";
  
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-semibold text-gray-700 mb-2.5">
        {label}
        {required && <span className="text-red-500 ml-1.5">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className={`${baseClasses} ${errorClasses}`}
      />
      {hasError && (
        <p className="mt-2 text-sm text-red-600 flex items-center animate-fade-in">
          <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default function PlayerInvitePage() {
  const params = useParams();
  const token = params?.token;
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageToCrop, setImageToCrop] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const categories = inviteData?.tournament?.categories || [];

  useEffect(() => {
    fetchInviteDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const fetchInviteDetails = async () => {
    setLoading(true);
    setError('');
    setInviteData(null);
    setSuccessMessage('');
    try {
      const response = await tournamentAPI.getInviteByToken(token);
      setInviteData(response.data.data);
    } catch (err) {
      const message =
        err.response?.data?.message || 'Unable to load invitation details';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryOptionsForForm = () => {
    if (!inviteData?.tournament?.categories) return [];
    return inviteData.tournament.categories
      .filter((c) => c && c._id)
      .map((c) => ({
        value: c._id.toString(),
        label: c.icon ? `${c.icon} ${c.name || 'Unnamed Category'}` : (c.name || 'Unnamed Category')
      }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be smaller than 2MB', 'error');
      e.target.value = '';
      return;
    }

    setImageToCrop(file);
    setShowCropModal(true);
    e.target.value = '';
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
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image must be smaller than 2MB', 'error');
        return;
      }
      setImageToCrop(file);
      setShowCropModal(true);
    }
  };

  useEffect(() => {
    if (!formik.values.categoryId && categories.length === 1) {
      const onlyCategory = categories[0];
      formik.setFieldValue('categoryId', onlyCategory?._id?.toString() || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const formik = useFormik({
    initialValues: {
      name: '',
      mobile: '',
      location: '',
      role: 'Batter',
      battingStyle: '',
      bowlingStyle: '',
      categoryId: '',
      note: '',
    },
    validationSchema: playerSchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (!inviteData) return;

      setSubmitting(true);
      try {
        const formData = new FormData();
        formData.append('name', values.name.trim());
        formData.append('mobile', values.mobile.trim());
        if (values.location) formData.append('location', values.location.trim());
        formData.append('role', values.role);
        if (values.battingStyle) formData.append('battingStyle', values.battingStyle);
        if (values.bowlingStyle) formData.append('bowlingStyle', values.bowlingStyle);
        formData.append('categoryId', values.categoryId);
        if (values.note) formData.append('note', values.note.trim());
        if (imageFile) formData.append('image', imageFile);

        await playerAPI.createPublic(token, formData);

        setSuccessMessage('Your details were submitted successfully. Our team will review your profile and contact you if needed.');
        showToast('Player submitted successfully', 'success');
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        formik.resetForm();
        setImageFile(null);
        setImagePreview('');
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview);
        }
        setInviteData((prev) => {
          if (!prev) return prev;
          const newUsage = (prev.invite?.usageCount || 0) + 1;
          const reachedLimit =
            prev.invite?.maxUses && newUsage >= prev.invite.maxUses;
          return {
            ...prev,
            invite: {
              ...prev.invite,
              usageCount: newUsage,
              lastUsedAt: new Date().toISOString(),
              isActive: reachedLimit ? false : prev.invite?.isActive,
              deactivatedAt: reachedLimit ? new Date().toISOString() : prev.invite?.deactivatedAt,
            },
          };
        });
      } catch (err) {
        const message = err.response?.data?.message || 'Error submitting your details';
        showToast(message, 'error');
        setError(message);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const renderStatusBadge = () => {
    if (!inviteData?.invite) return null;
    const active = inviteData.invite.isActive;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
        active 
          ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' 
          : 'bg-red-100 text-red-700 ring-1 ring-red-200'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
        {active ? 'Accepting Submissions' : 'Link Inactive'}
      </span>
    );
  };

  const renderContent = () => {
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

    if (error && !inviteData) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={fetchInviteDetails}
                className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-lg hover:shadow-xl"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!inviteData?.invite?.isActive) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Inactive</h2>
              <p className="text-gray-600 mb-2">
                This invitation link is no longer active.
              </p>
              {inviteData?.invite?.deactivatedAt && (
                <p className="text-sm text-gray-500 mb-4">
                  Deactivated on {formatDateTime(inviteData.invite.deactivatedAt)}.
                </p>
              )}
              <p className="text-sm text-gray-500">
                Please reach out to the tournament admin to request a new link.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const tournament = inviteData.tournament;
    const invite = inviteData.invite;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
        {/* Background decorative elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        </div>

        <div className="relative py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Tournament Header Banner */}
            <div className="mb-8">
              <div className="relative bg-gradient-to-r from-primary-600 via-primary-700 to-blue-600 rounded-2xl shadow-2xl overflow-hidden">
                {/* Decorative background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                  <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
                </div>
                
                <div className="relative p-8 sm:p-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="mb-3">
                        <p className="text-primary-100 text-sm font-semibold uppercase tracking-wider mb-2">
                          You're Invited To Join
                        </p>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight">
                          {tournament?.name || 'Tournament'}
                        </h1>
                        {tournament?.location && (
                          <div className="flex items-center text-primary-100 mt-2">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm">{tournament.location}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        {renderStatusBadge()}
                      </div>
                    </div>
                    {tournament?.logo && (
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-2xl p-3 shadow-2xl flex-shrink-0 ring-4 ring-white/20">
                        <Image
                          src={tournament.logo}
                          alt={tournament.name}
                          fill
                          className="object-contain rounded-2xl"
                          sizes="112px"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Form Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="p-6 sm:p-8 lg:p-10">
                {/* Form Header */}
                <div className="mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {invite.label || 'Player Registration'}
                  </h2>
                  <p className="text-gray-600">Complete your profile to join the tournament</p>
                </div>

                {/* Success/Error Messages */}
                {successMessage && (
                  <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg p-4 flex items-start">
                    <svg className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-emerald-800 font-medium">{successMessage}</p>
                  </div>
                )}

                {error && (
                  <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                  </div>
                )}

                <form onSubmit={formik.handleSubmit} className="space-y-8">
                  {/* Premium Image Upload Section */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-dashed border-gray-300 hover:border-primary-400 transition-all duration-300">
                    <label className="block mb-4">
                      <span className="text-base font-semibold text-gray-900 mb-1 block">Profile Photo</span>
                      <span className="text-sm text-gray-600">Add a professional photo to personalize your profile</span>
                    </label>

                    <div className="flex flex-col items-center">
                      {/* Round Avatar Preview with Drag & Drop */}
                      <div
                        className={`relative w-32 h-32 mb-4 rounded-full overflow-hidden bg-white shadow-lg ring-4 ring-white transition-all duration-300 ${
                          isDragging ? 'scale-105 ring-primary-400 shadow-2xl' : 'ring-gray-200'
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
                            sizes="128px"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        {isDragging && (
                          <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                            <p className="text-white font-semibold text-sm">Drop image here</p>
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
                        className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:bg-primary-700 transform hover:scale-105 transition-all duration-200"
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
                            if (imagePreview) {
                              URL.revokeObjectURL(imagePreview);
                            }
                          }}
                          className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                        >
                          Remove Photo
                        </button>
                      )}
                      <p className="mt-4 text-xs text-gray-500 text-center">
                        Drag and drop or click to upload • PNG, JPG up to 2MB
                      </p>
                    </div>
                  </div>

                  {/* Personal Information Section */}
                  <div className="space-y-6">
                    <div className="border-b border-gray-200 pb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                      <p className="text-sm text-gray-500 mt-1">Tell us about yourself</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="sm:col-span-2">
                        <PremiumInput
                          label="Full Name"
                          name="name"
                          type="text"
                          required
                          value={formik.values.name}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={formik.errors.name}
                          touched={formik.touched.name}
                          placeholder="Enter your full name"
                        />
                      </div>

                      <PremiumInput
                        label="Mobile Number"
                        name="mobile"
                        type="text"
                        required
                        value={formik.values.mobile}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.errors.mobile}
                        touched={formik.touched.mobile}
                        placeholder="10-15 digits"
                      />

                      <PremiumInput
                        label="Location"
                        name="location"
                        type="text"
                        value={formik.values.location}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.errors.location}
                        touched={formik.touched.location}
                        placeholder="City or area"
                      />
                    </div>
                  </div>

                  {/* Cricket Information Section */}
                  <div className="space-y-6">
                    <div className="border-b border-gray-200 pb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Cricket Information</h3>
                      <p className="text-sm text-gray-500 mt-1">Your playing details</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <PremiumSelect
                        label="Playing Role"
                        name="role"
                        required
                        value={formik.values.role}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.errors.role}
                        touched={formik.touched.role}
                        options={[
                          { value: 'Batter', label: 'Batter' },
                          { value: 'Bowler', label: 'Bowler' },
                          { value: 'All-Rounder', label: 'All-Rounder' },
                          { value: 'Wicket Keeper', label: 'Wicket Keeper' },
                        ]}
                      />

                      <PremiumSelect
                        label="Category"
                        name="categoryId"
                        required
                        value={formik.values.categoryId}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.errors.categoryId}
                        touched={formik.touched.categoryId}
                        options={[
                          { value: '', label: 'Select Category' },
                          ...getCategoryOptionsForForm()
                        ]}
                      />

                      <PremiumSelect
                        label="Batting Style"
                        name="battingStyle"
                        value={formik.values.battingStyle}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.errors.battingStyle}
                        touched={formik.touched.battingStyle}
                        options={[
                          { value: '', label: 'Select' },
                          { value: 'Right', label: 'Right' },
                          { value: 'Left', label: 'Left' },
                        ]}
                      />

                      <PremiumSelect
                        label="Bowling Style"
                        name="bowlingStyle"
                        value={formik.values.bowlingStyle}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.errors.bowlingStyle}
                        touched={formik.touched.bowlingStyle}
                        options={[
                          { value: '', label: 'Select' },
                          { value: 'Right-arm medium', label: 'Right-arm medium' },
                          { value: 'Right-arm fast', label: 'Right-arm fast' },
                          { value: 'Right-arm spin', label: 'Right-arm spin' },
                          { value: 'Left-arm medium', label: 'Left-arm medium' },
                          { value: 'Left-arm fast', label: 'Left-arm fast' },
                          { value: 'Left-arm orthodox', label: 'Left-arm orthodox' },
                          { value: 'Left-arm unorthodox', label: 'Left-arm unorthodox' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Additional Information Section */}
                  <div className="space-y-6">
                    <div className="border-b border-gray-200 pb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
                      <p className="text-sm text-gray-500 mt-1">Any additional details you'd like to share</p>
                    </div>

                    <div>
                      <PremiumTextarea
                        label="Player Note"
                        name="note"
                        value={formik.values.note}
                        onChange={(e) => {
                          if (e.target.value.length <= 500) {
                            formik.handleChange(e);
                          }
                        }}
                        onBlur={formik.handleBlur}
                        error={formik.errors.note}
                        touched={formik.touched.note}
                        placeholder="Share any availability issues or additional information we should know (max 500 characters)"
                        rows={5}
                      />
                      <p className="text-xs text-gray-500 text-right mt-2">
                        {formik.values.note.length}/500 characters
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={formik.isSubmitting}
                      className="w-full sm:w-auto sm:min-w-[200px] px-8 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center mx-auto"
                    >
                      {formik.isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
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

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Powered by <span className="font-semibold text-primary-600">BiddingCrease</span> •{' '}
                <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  Visit home
                </Link>
              </p>
            </div>
          </div>
        </div>

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
  };

  return renderContent();
}
