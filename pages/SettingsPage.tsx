import React, { useState, useEffect, useRef } from 'react';
import { auth, db, uploadFile } from '../utils/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { toast } from 'sonner';
import ImageCropper from '../components/ImageCropper';
import { useUser } from '../contexts/UserContext';

interface SettingsData {
  firstName: string;
  lastName: string;
  avatarUrl: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  theme: string;
}

const SettingsPage = () => {
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [theme, setTheme] = useState('dark');

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Refs
  const originalDataRef = useRef<SettingsData | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const userIdRef = useRef<string | null>(null);

  // User context for refreshing avatar
  const { refreshUser } = useUser();

  // Fetch user data on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      userIdRef.current = user.uid;
      setIsLoading(true);

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Populate form state
          const fName = userData.firstName || '';
          const lName = userData.lastName || '';
          const mail = user.email || '';
          const avatar = userData.avatarUrl || '';
          const emailNot = userData.notificationPreferences?.emailNotifications ?? true;
          const pushNot = userData.notificationPreferences?.pushNotifications ?? false;
          const themeVal = userData.theme || 'dark';

          setFirstName(fName);
          setLastName(lName);
          setEmail(mail);
          setAvatarUrl(avatar);
          setEmailNotifications(emailNot);
          setPushNotifications(pushNot);
          setTheme(themeVal);

          // Store original data for change detection
          originalDataRef.current = {
            firstName: fName,
            lastName: lName,
            avatarUrl: avatar,
            emailNotifications: emailNot,
            pushNotifications: pushNot,
            theme: themeVal,
          };
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load settings', {
          description: 'Please refresh the page'
        });
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Change detection
  useEffect(() => {
    if (!originalDataRef.current || isLoading) return;

    const changed =
      firstName !== originalDataRef.current.firstName ||
      lastName !== originalDataRef.current.lastName ||
      avatarUrl !== originalDataRef.current.avatarUrl ||
      emailNotifications !== originalDataRef.current.emailNotifications ||
      pushNotifications !== originalDataRef.current.pushNotifications ||
      theme !== originalDataRef.current.theme;

    setHasChanges(changed);
  }, [firstName, lastName, avatarUrl, emailNotifications, pushNotifications, theme, isLoading]);

  // Handle save
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error('Not authenticated', {
        description: 'Please sign in again'
      });
      return;
    }

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Validation failed', {
        description: 'First and last name are required'
      });
      return;
    }

    setIsSaving(true);
    try {
      const userDocRef = doc(db, "users", user.uid);

      await updateDoc(userDocRef, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        avatarUrl,
        notificationPreferences: {
          emailNotifications,
          pushNotifications,
        },
        theme,
        updatedAt: new Date(),
      });

      // Update original data ref
      originalDataRef.current = {
        firstName,
        lastName,
        avatarUrl,
        emailNotifications,
        pushNotifications,
        theme,
      };
      setHasChanges(false);

      toast.success('Settings saved', {
        description: 'Your changes have been saved successfully'
      });

      // Refresh user context to update avatar everywhere
      await refreshUser();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save settings', {
        description: 'Please try again'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle avatar file selection
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Please upload a JPG, PNG, GIF, or WebP image'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('File too large', {
        description: 'Please upload an image smaller than 5MB'
      });
      return;
    }

    // Create temporary URL for cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      setTempImageUrl(e.target?.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);

    // Reset file input
    e.target.value = '';
  };

  // Handle cropped image upload
  const handleCroppedImage = async (croppedBlob: Blob) => {
    setShowCropper(false);
    setTempImageUrl(null);
    setUploadingAvatar(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error('Not authenticated', {
          description: 'Please sign in again'
        });
        return;
      }

      // Convert blob to file
      const file = new File([croppedBlob], 'avatar.png', { type: 'image/png' });

      // Upload to Firebase Storage
      const downloadURL = await uploadFile(file, `avatars`);

      setAvatarUrl(downloadURL);
      toast.success('Avatar uploaded', {
        description: 'Remember to save your changes'
      });
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCancelCrop = () => {
    setShowCropper(false);
    setTempImageUrl(null);
  };

  // Handle password change
  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      toast.error('Not authenticated', {
        description: 'Please sign in again'
      });
      return;
    }

    // Validation
    if (!currentPassword) {
      toast.error('Current password required');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password too weak', {
        description: 'Password must be at least 8 characters'
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      // Re-authenticate user (Firebase requirement)
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      // Clear fields and close section
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordSection(false);

      toast.success('Password updated', {
        description: 'Your password has been changed successfully'
      });
    } catch (error: unknown) {
      console.error('Password change error:', error);
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
        toast.error('Incorrect password', {
          description: 'Current password is incorrect'
        });
      } else {
        toast.error('Failed to update password', {
          description: 'Please try again'
        });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // Get initials for avatar placeholder
  const getInitials = () => {
    const f = firstName.charAt(0).toUpperCase();
    const l = lastName.charAt(0).toUpperCase();
    return f + l || 'U';
  };

  const inputClasses = "flex-1 appearance-none w-full px-3 py-2 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
  const disabledInputClasses = "flex-1 appearance-none w-full px-3 py-2 border border-border-color bg-glass placeholder-text-secondary text-text-secondary rounded-lg cursor-not-allowed opacity-60 sm:text-sm";

  // Loading skeleton
  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-8">Settings</h1>
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="bg-glass p-8 rounded-lg shadow-md border border-border-color animate-pulse">
            <div className="h-6 bg-glass-light rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-10 bg-glass-light rounded"></div>
              <div className="h-10 bg-glass-light rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-8">Settings</h1>

      {/* Image Cropper Modal */}
      {showCropper && tempImageUrl && (
        <ImageCropper
          image={tempImageUrl}
          onCropComplete={handleCroppedImage}
          onCancel={handleCancelCrop}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-12">
        {/* Account Settings */}
        <div className="bg-glass p-8 rounded-lg shadow-md border border-border-color">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-color pb-4 mb-6">Account</h2>
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <label className="w-full md:w-1/4 text-sm font-medium text-text-secondary">Profile Picture</label>
              <div className="flex items-center gap-4 flex-1">
                <div className="relative group">
                  {avatarUrl ? (
                    <>
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover border-2 border-primary shadow-lg cursor-pointer transition-all group-hover:opacity-75"
                        onClick={() => avatarInputRef.current?.click()}
                      />
                      <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg cursor-pointer hover:opacity-75 transition-all"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {getInitials()}
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg border border-border-color hover:bg-glass hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingAvatar ? 'Uploading...' : (avatarUrl ? 'Change Avatar' : 'Upload Avatar')}
                  </button>
                  <p className="text-xs text-text-secondary mt-1">
                    {avatarUrl ? 'Click avatar or button to change. ' : ''}JPG, PNG, GIF or WebP. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center">
              <label htmlFor="firstName" className="w-full md:w-1/4 text-sm font-medium text-text-secondary">First Name</label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isSaving}
                className={inputClasses}
                placeholder="Enter your first name"
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-center">
              <label htmlFor="lastName" className="w-full md:w-1/4 text-sm font-medium text-text-secondary">Last Name</label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isSaving}
                className={inputClasses}
                placeholder="Enter your last name"
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-center">
              <label htmlFor="email" className="w-full md:w-1/4 text-sm font-medium text-text-secondary">Email Address</label>
              <div className="flex-1">
                <input
                  type="email"
                  id="email"
                  value={email}
                  readOnly
                  className={disabledInputClasses}
                />
                <p className="text-xs text-text-secondary mt-1">Email cannot be changed</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Settings */}
        <div className="bg-glass p-8 rounded-lg shadow-md border border-border-color">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-color pb-4 mb-6">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">Email Notifications</p>
                <p className="text-sm text-text-secondary">Receive notifications about updates and new features.</p>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                disabled={isSaving}
                className="relative inline-flex items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className={`w-11 h-6 rounded-full transition-colors ${emailNotifications ? 'bg-primary' : 'bg-glass-light'}`}>
                  <div className={`absolute top-0.5 left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${emailNotifications ? 'translate-x-full' : ''}`}></div>
                </div>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">Push Notifications</p>
                <p className="text-sm text-text-secondary">Get push notifications on your devices.</p>
              </div>
              <button
                onClick={() => setPushNotifications(!pushNotifications)}
                disabled={isSaving}
                className="relative inline-flex items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className={`w-11 h-6 rounded-full transition-colors ${pushNotifications ? 'bg-primary' : 'bg-glass-light'}`}>
                  <div className={`absolute top-0.5 left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${pushNotifications ? 'translate-x-full' : ''}`}></div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-glass p-8 rounded-lg shadow-md border border-border-color">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-color pb-4 mb-6">Appearance</h2>
          <div className="flex flex-col md:flex-row md:items-center">
            <label htmlFor="theme" className="w-full md:w-1/4 text-sm font-medium text-text-secondary">Theme</label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              disabled={isSaving}
              className="mt-1 md:mt-0 flex-1 appearance-none w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            >
              <option value="dark">Dark Mode</option>
              <option disabled>Light Mode (Coming Soon)</option>
            </select>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-glass p-8 rounded-lg shadow-md border border-border-color">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-color pb-4 mb-6">Security</h2>

          {!showPasswordSection ? (
            <button
              onClick={() => setShowPasswordSection(true)}
              className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg border border-border-color hover:bg-glass hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Change Password
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center">
                <label htmlFor="currentPassword" className="w-full md:w-1/4 text-sm font-medium text-text-secondary">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={changingPassword}
                  className={inputClasses}
                  placeholder="Enter current password"
                />
              </div>

              <div className="flex flex-col md:flex-row md:items-center">
                <label htmlFor="newPassword" className="w-full md:w-1/4 text-sm font-medium text-text-secondary">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={changingPassword}
                  className={inputClasses}
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>

              <div className="flex flex-col md:flex-row md:items-center">
                <label htmlFor="confirmNewPassword" className="w-full md:w-1/4 text-sm font-medium text-text-secondary">Confirm Password</label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={changingPassword}
                  className={inputClasses}
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowPasswordSection(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                  }}
                  disabled={changingPassword}
                  className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg border border-border-color hover:bg-glass hover:border-border-color focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
