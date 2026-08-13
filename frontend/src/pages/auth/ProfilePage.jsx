import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import authService from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { changePasswordRules, profileRules } from '../../validations/authValidation';
import PasswordInput from '../../components/common/PasswordInput';
import UserAvatar from '../../components/common/UserAvatar';
import { formatRoleName } from '../../utils/auth';

const ProfilePage = () => {
  const { user, updateSession } = useAuth();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm();

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    watch,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm();

  const newPassword = watch('newPassword');

  useEffect(() => {
    if (user) {
      resetProfile({
        fullName: user.fullName || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user, resetProfile]);

  useEffect(() => {
    if (window.location.hash === '#password') {
      document.getElementById('password-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleAvatarUpload = async (file) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2 MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const response = await authService.uploadAvatar(file);
      const { user: updatedUser, token } = response.data.data;
      updateSession(token, updatedUser);
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onProfileSubmit = async (data) => {
    setSavingProfile(true);
    try {
      const response = await authService.updateProfile(data);
      const { user: updatedUser, token } = response.data.data;
      updateSession(token, updatedUser);
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      const response = await authService.changePassword(
        data.currentPassword,
        data.newPassword,
        data.confirmPassword
      );
      toast.success(response.data.message);
      resetPassword();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Password change failed');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-2 py-4 sm:px-0">
      <div className="w-full text-center">
        <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
        <p className="mt-1 text-sm text-slate-500">
          Update your account details, photo, and password.
        </p>
      </div>

      <div className="mt-8 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center text-center">
          <UserAvatar
            user={user}
            size="lg"
            showUpload
            uploading={uploadingAvatar}
            onUpload={handleAvatarUpload}
          />
          <p className="mt-4 text-lg font-semibold text-slate-900">{user?.fullName}</p>
          <p className="text-sm capitalize text-slate-500">{formatRoleName(user?.roleName)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {uploadingAvatar ? 'Uploading photo...' : 'Click the camera icon to upload a photo'}
          </p>
        </div>

        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="mt-8 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
            <input
              type="text"
              {...registerProfile('fullName', profileRules.fullName)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            {profileErrors.fullName && (
              <p className="mt-1 text-xs text-red-600">{profileErrors.fullName.message}</p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Username</label>
              <input
                type="text"
                {...registerProfile('username', profileRules.username)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              {profileErrors.username && (
                <p className="mt-1 text-xs text-red-600">{profileErrors.username.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                {...registerProfile('email', profileRules.email)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              {profileErrors.email && (
                <p className="mt-1 text-xs text-red-600">{profileErrors.email.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
            <input
              type="text"
              {...registerProfile('phone', profileRules.phone)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            {profileErrors.phone && (
              <p className="mt-1 text-xs text-red-600">{profileErrors.phone.message}</p>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-lg bg-primary-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      <div
        id="password-section"
        className="mt-6 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-900">Change Password</h3>
          <p className="mt-1 text-sm text-slate-500">Use a strong password with letters, numbers, and symbols.</p>
        </div>

        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Current Password</label>
            <PasswordInput {...registerPassword('currentPassword', changePasswordRules.currentPassword)} />
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-xs text-red-600">{passwordErrors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
            <PasswordInput
              {...registerPassword('newPassword', changePasswordRules.newPassword)}
              autoComplete="new-password"
            />
            {passwordErrors.newPassword && (
              <p className="mt-1 text-xs text-red-600">{passwordErrors.newPassword.message}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Must include uppercase, lowercase, number, and special character.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm New Password</label>
            <PasswordInput
              {...registerPassword('confirmPassword', {
                ...changePasswordRules.confirmPassword,
                validate: (value) => value === newPassword || 'Passwords do not match',
              })}
              autoComplete="new-password"
            />
            {passwordErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{passwordErrors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-lg bg-slate-800 px-8 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-70"
            >
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
