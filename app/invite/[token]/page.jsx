'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { playerAPI, tournamentAPI } from '@/lib/api';
import FormInput from '@/components/shared/FormInput';
import { useToast } from '@/components/shared/Toast';
import ImageCropModal from '@/components/shared/ImageCropModal';

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
      categoryId: prev.categoryId, // Preserve auto-selected category if available
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
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <p className="text-gray-600">Loading invitation details...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center space-y-4">
          <p className="text-red-600 font-semibold">{error}</p>
          <p className="text-sm text-gray-500">
            If you believe this is a mistake, please contact the tournament organizer for a new link.
          </p>
          <button
            onClick={fetchInviteDetails}
            className="px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (!inviteData?.invite?.isActive) {
      return (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center space-y-4">
          <p className="text-gray-800 font-semibold">
            This invitation link is no longer active.
          </p>
          {inviteData?.invite?.deactivatedAt && (
            <p className="text-sm text-gray-500">
              Deactivated on {formatDateTime(inviteData.invite.deactivatedAt)}.
            </p>
          )}
          <p className="text-sm text-gray-500">
            Please reach out to the tournament admin to request a new link.
          </p>
        </div>
      );
    }

    const tournament = inviteData.tournament;
    const invite = inviteData.invite;

    return (
      <>
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-6 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {tournament.logo ? (
              <Image
                src={tournament.logo}
                alt={tournament.name}
                width={72}
                height={72}
                className="rounded-xl border border-gray-100 object-cover w-18 h-18"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xl">
                {tournament.name?.charAt(0) || 'T'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm text-gray-500">You are registering for</p>
              <h1 className="text-2xl font-bold text-gray-900 truncate">{tournament.name}</h1>
              <p className="text-sm text-gray-500">
                {tournament.location}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            {renderStatusBadge()}
            {/* <div className="text-xs text-gray-500">
              {invite.maxUses
                ? `${invite.maxUses - invite.usageCount} submission(s) remaining`
                : `${invite.usageCount} submission(s) received`}
            </div> */}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {invite.label || 'Player Registration'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Share accurate information so team owners can evaluate you during the auction.
            </p>
          </div>

          {successMessage && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Player Photo (optional)
              </label>
              <div className="flex items-center gap-4">
                <div className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Player preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-400 text-center px-4">
                      No photo selected
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary-50 file:text-primary-700
                      hover:file:bg-primary-100"
                  />
                  <p className="text-xs text-gray-500">
                    JPG or PNG up to 2MB. You can crop the photo after selecting it.
                  </p>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-sm text-red-600 hover:text-red-700 text-left"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <FormInput
              label="Full Name"
              name="name"
              required
              value={formValues.name}
              onChange={handleInputChange}
              error={formErrors.name}
              touched={!!formErrors.name}
              placeholder="Enter your full name"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Mobile Number"
                name="mobile"
                required
                value={formValues.mobile}
                onChange={handleInputChange}
                error={formErrors.mobile}
                touched={!!formErrors.mobile}
                placeholder="10-15 digit mobile number"
              />
              <FormInput
                label="City / Location"
                name="location"
                value={formValues.location}
                onChange={handleInputChange}
                placeholder="Where are you based?"
              />
            </div>

            <FormInput
              label="Playing Role"
              name="role"
              type="select"
              required
              value={formValues.role}
              onChange={handleInputChange}
              error={formErrors.role}
              touched={!!formErrors.role}
              options={ROLE_OPTIONS}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Batting Style"
                name="battingStyle"
                type="select"
                value={formValues.battingStyle}
                onChange={handleInputChange}
                options={BATTING_OPTIONS}
              />
              <FormInput
                label="Bowling Style"
                name="bowlingStyle"
                type="select"
                value={formValues.bowlingStyle}
                onChange={handleInputChange}
                options={BOWLING_OPTIONS}
              />
            </div>

            <FormInput
              label="Category"
              name="categoryId"
              type="select"
              required
              value={formValues.categoryId}
              onChange={handleInputChange}
              error={formErrors.categoryId}
              touched={!!formErrors.categoryId}
              options={[
                { value: '', label: 'Select Category' },
                ...categories.map((cat) => ({
                  value: cat._id?.toString(),
                  label: cat.name || 'Unnamed Category',
                })),
              ]}
            />

            <div>
              <FormInput
                label="Note"
                name="note"
                type="textarea"
                value={formValues.note}
                onChange={handleNoteChange}
                error={formErrors.note}
                touched={!!formErrors.note}
                placeholder="Share any availability issues or additional information we should know (max 500 characters)"
              />
              <p className="mt-1 text-right text-xs text-gray-500">
                {formValues.note.length}/500 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex justify-center items-center px-4 py-3 rounded-lg text-white text-base font-semibold bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Details'}
            </button>
            <p className="text-xs text-gray-500 text-center">
              By submitting, you agree to share your information with the tournament organizers.
            </p>
          </form>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {renderContent()}
        <div className="text-center text-xs text-gray-400">
          Powered by BiddingCrease • <Link href="/" className="text-primary-600 hover:text-primary-700">Visit home</Link>
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
}

