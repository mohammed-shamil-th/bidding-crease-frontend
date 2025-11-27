'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { playerAPI, tournamentAPI } from '@/lib/api';
import { useToast } from '@/components/shared/Toast';
import ImageCropModal from '@/components/shared/ImageCropModal';
import { getCategoryIcon } from '@/lib/utils';

const ROLE_OPTIONS = [
  { value: 'Batter', label: 'Batter' },
  { value: 'Bowler', label: 'Bowler' },
  { value: 'All-Rounder', label: 'All-Rounder' },
  { value: 'Wicket Keeper', label: 'Wicket Keeper' },
];

const BATTING_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'Right', label: 'Right-handed' },
  { value: 'Left', label: 'Left-handed' },
];

const BOWLING_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'Right-arm medium', label: 'Right-arm medium' },
  { value: 'Right-arm fast', label: 'Right-arm fast' },
  { value: 'Right-arm spin', label: 'Right-arm spin' },
  { value: 'Left-arm medium', label: 'Left-arm medium' },
  { value: 'Left-arm fast', label: 'Left-arm fast' },
  { value: 'Left-arm orthodox', label: 'Left-arm orthodox' },
  { value: 'Left-arm unorthodox', label: 'Left-arm unorthodox' },
];

const getInitialFormState = () => ({
  name: '',
  mobile: '',
  location: '',
  role: 'Batter',
  battingStyle: '',
  bowlingStyle: '',
  categoryId: '',
  note: '',
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

export default function PlayerInvitePage({ params }) {
  const { token } = params;
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState('');
  const [formValues, setFormValues] = useState(getInitialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageToCrop, setImageToCrop] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const categories = inviteData?.tournament?.categories || [];

  useEffect(() => {
    fetchInviteDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!formValues.categoryId && categories.length === 1) {
      const onlyCategory = categories[0];
      setFormValues((prev) => ({
        ...prev,
        categoryId: onlyCategory?._id?.toString() || '',
      }));
    }
  }, [categories, formValues.categoryId]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleNoteChange = (e) => {
    if (e.target.value.length <= 500) {
      handleInputChange(e);
    }
  };

  const handleFileChange = (e) => {
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
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    const previewUrl = URL.createObjectURL(croppedFile);
    setImagePreview(previewUrl);
    setImageFile(croppedFile);
  };

  const handleCropClose = () => {
    setShowCropModal(false);
    setImageToCrop(null);
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview('');
    setImageFile(null);
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

  const validateForm = () => {
    const errors = {};
    if (!formValues.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formValues.mobile.trim()) {
      errors.mobile = 'Mobile number is required';
    } else if (!/^[0-9]{10,15}$/.test(formValues.mobile.trim())) {
      errors.mobile = 'Mobile must be 10-15 digits';
    }
    if (!formValues.role || !ROLE_OPTIONS.some((opt) => opt.value === formValues.role)) {
      errors.role = 'Select a valid role';
    }
    if (!formValues.categoryId) {
      errors.categoryId = 'Category is required';
    }
    if (formValues.note && formValues.note.length > 500) {
      errors.note = 'Note must be 500 characters or fewer';
    }
    return errors;
  };

  const resetForm = () => {
    setFormValues((prev) => ({
      ...getInitialFormState(),
      categoryId: prev.categoryId,
    }));
    setFormErrors({});
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview('');
    setImageToCrop(null);
    setShowCropModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteData) return;

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', formValues.name.trim());
      formData.append('mobile', formValues.mobile.trim());
      if (formValues.location) formData.append('location', formValues.location.trim());
      formData.append('role', formValues.role);
      if (formValues.battingStyle) formData.append('battingStyle', formValues.battingStyle);
      if (formValues.bowlingStyle) formData.append('bowlingStyle', formValues.bowlingStyle);
      formData.append('categoryId', formValues.categoryId);
      if (formValues.note) formData.append('note', formValues.note.trim());
      if (imageFile) formData.append('image', imageFile);

      await playerAPI.createPublic(token, formData);

      setSuccessMessage('Your details were submitted successfully. Our team will review your profile and contact you if needed.');
      showToast('Player submitted successfully', 'success');
      // Scroll to the top of the page when showing the success message
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      resetForm();
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
  };

  const renderStatusBadge = () => {
    if (!inviteData?.invite) return null;
    const active = inviteData.invite.isActive;
    const badgeClasses = active
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badgeClasses}`}>
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
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={fetchInviteDetails}
                className="mt-6 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
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
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Inactive</h2>
              <p className="text-gray-600 mb-4">
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
                    <p className="text-blue-100 text-base sm:text-lg">{tournament?.location || 'Complete your registration to participate in the auction'}</p>
                    <div className="mt-4">
                      {renderStatusBadge()}
                    </div>
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
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {invite.label || 'Player Registration'}
                </h2>
                <p className="text-gray-600">Fill in your details to complete your registration</p>
              </div>

              {successMessage && (
                <div className="mb-6 bg-green-50 border-l-4 border-green-500 rounded-lg p-4 flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-green-700 font-medium">{successMessage}</p>
                </div>
              )}

              {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Player Image Upload Section - Reduced Size */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 sm:p-6 border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors">
                  <label className="block mb-3">
                    <span className="text-base font-bold text-gray-900 mb-1 block">Profile Photo (Optional)</span>
                    <span className="text-xs text-gray-600">Add a photo to personalize your profile</span>
                  </label>
                  <div className="flex flex-col items-center">
                    {/* Avatar Preview - Smaller */}
                    <div
                      className={`relative w-24 h-24 mb-4 rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 shadow-md transition-all duration-300 ${
                        isDragging ? 'scale-105 ring-4 ring-primary-500' : ''
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-600 to-blue-600 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {imagePreview ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium transition-colors"
                      >
                        Remove Photo
                      </button>
                    )}
                    <p className="mt-3 text-xs text-gray-500 text-center">
                      Drag and drop or click to upload<br />
                      PNG, JPG up to 2MB
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
                        value={formValues.name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                          formErrors.name
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-primary-400 focus:border-primary-500'
                        } focus:outline-none focus:ring-2 focus:ring-primary-200`}
                        placeholder="Enter your full name"
                      />
                      {formErrors.name && (
                        <p className="mt-1.5 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {formErrors.name}
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
                        value={formValues.mobile}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                          formErrors.mobile
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-primary-400 focus:border-primary-500'
                        } focus:outline-none focus:ring-2 focus:ring-primary-200`}
                        placeholder="10-15 digits"
                      />
                      {formErrors.mobile && (
                        <p className="mt-1.5 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {formErrors.mobile}
                        </p>
                      )}
                    </div>

                    {/* Location */}
                    <div>
                      <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                        City / Location
                      </label>
                      <input
                        id="location"
                        name="location"
                        type="text"
                        value={formValues.location}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200"
                        placeholder="Where are you based?"
                      />
                    </div>
                  </div>
                </div>

                {/* Cricket Information Section */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 pb-2 border-b-2 border-gray-200">Cricket Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Role - Modern Select */}
                    <div>
                      <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                        Playing Role <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="role"
                          name="role"
                          value={formValues.role}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 pr-10 rounded-xl border-2 transition-all duration-200 appearance-none cursor-pointer bg-white ${
                            formErrors.role
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300 hover:border-primary-400 focus:border-primary-500'
                          } focus:outline-none focus:ring-2 focus:ring-primary-200`}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {formErrors.role && (
                        <p className="mt-1.5 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {formErrors.role}
                        </p>
                      )}
                    </div>

                    {/* Category - Modern Select with Icons */}
                    <div>
                      <label htmlFor="categoryId" className="block text-sm font-semibold text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="categoryId"
                          name="categoryId"
                          value={formValues.categoryId}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 pr-10 rounded-xl border-2 transition-all duration-200 appearance-none cursor-pointer bg-white ${
                            formErrors.categoryId
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300 hover:border-primary-400 focus:border-primary-500'
                          } focus:outline-none focus:ring-2 focus:ring-primary-200`}
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat._id?.toString()} value={cat._id?.toString()}>
                              {cat.icon ? `${cat.icon} ${cat.name || 'Unnamed Category'}` : cat.name || 'Unnamed Category'}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {formErrors.categoryId && (
                        <p className="mt-1.5 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {formErrors.categoryId}
                        </p>
                      )}
                    </div>

                    {/* Batting Style - Modern Select */}
                    <div>
                      <label htmlFor="battingStyle" className="block text-sm font-semibold text-gray-700 mb-2">
                        Batting Style
                      </label>
                      <div className="relative">
                        <select
                          id="battingStyle"
                          name="battingStyle"
                          value={formValues.battingStyle}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-gray-300 hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200 appearance-none cursor-pointer bg-white"
                        >
                          {BATTING_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Bowling Style - Modern Select */}
                    <div>
                      <label htmlFor="bowlingStyle" className="block text-sm font-semibold text-gray-700 mb-2">
                        Bowling Style
                      </label>
                      <div className="relative">
                        <select
                          id="bowlingStyle"
                          name="bowlingStyle"
                          value={formValues.bowlingStyle}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-gray-300 hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200 appearance-none cursor-pointer bg-white"
                        >
                          {BOWLING_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information Section */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 pb-2 border-b-2 border-gray-200">Additional Information</h3>
                  {/* Note */}
                  <div>
                    <label htmlFor="note" className="block text-sm font-semibold text-gray-700 mb-2">
                      Note
                    </label>
                    <textarea
                      id="note"
                      name="note"
                      value={formValues.note}
                      onChange={handleNoteChange}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all duration-200 resize-none"
                      placeholder="Share any availability issues or additional information we should know"
                    />
                    <p className="mt-1.5 text-xs text-gray-500 text-right">
                      {formValues.note.length}/500 characters
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-primary-600 to-blue-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                  >
                    {submitting ? (
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
              Powered by BiddingCrease • <Link href="/" className="text-primary-600 hover:text-primary-700">Visit home</Link>
            </p>
          </div>
        </div>

        <ImageCropModal
          isOpen={showCropModal}
          onClose={handleCropClose}
          imageFile={imageToCrop}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
        />
      </div>
    );
  };

  return renderContent();
}
