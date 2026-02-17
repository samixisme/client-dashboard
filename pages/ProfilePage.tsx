
import React, { useState, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { db, storage } from '../utils/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Mail, Shield, Camera, Save, X, CheckCircle } from 'lucide-react';

const ProfilePage = () => {
  const { user, loading, refreshUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: '',
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        avatarUrl: user.avatarUrl || '',
      });
    }
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingImage(true);
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setFormData(prev => ({ ...prev, avatarUrl: downloadURL }));

      // Auto-save avatar immediately
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { avatarUrl: downloadURL });
      await refreshUser();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        avatarUrl: formData.avatarUrl,
      });

      await refreshUser();
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        avatarUrl: user.avatarUrl || '',
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">No user data available</p>
      </div>
    );
  }

  const displayName = user.name || `${user.firstName} ${user.lastName}`.trim() || 'User';
  const avatarUrl = formData.avatarUrl || user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=84CC16&color=fff&size=200`;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Profile</h1>
        {saveSuccess && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <span>Profile updated successfully!</span>
          </div>
        )}
      </div>

      <div className="bg-glass p-8 rounded-lg shadow-md border border-border-color max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex flex-col md:flex-row items-center">
            <div className="relative">
              <img
                className="h-32 w-32 rounded-full object-cover border-4 border-primary/20"
                src={avatarUrl}
                alt={displayName}
              />
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {uploadingImage ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="mt-6 md:mt-0 md:ml-8 text-center md:text-left">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="First Name"
                      className="px-3 py-2 bg-surface border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Last Name"
                      className="px-3 py-2 bg-surface border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              ) : (
                <h2 className="text-2xl font-bold text-text-primary">{displayName}</h2>
              )}
              <div className="flex items-center gap-2 mt-2 text-text-secondary justify-center md:justify-start">
                <Mail className="h-4 w-4" />
                <p>{user.email}</p>
              </div>
              <div className="flex items-center gap-2 mt-1 text-text-secondary justify-center md:justify-start">
                <Shield className="h-4 w-4" />
                <p className="capitalize">Role: {user.role}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 md:mt-0 flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-color text-text-primary text-sm font-medium rounded-lg hover:bg-glass focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary"
              >
                <User className="h-4 w-4" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Account Details Section */}
        <div className="mt-8 pt-8 border-t border-border-color">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Account Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-secondary">User ID</label>
              <p className="text-text-primary font-mono text-sm mt-1 p-2 bg-surface rounded border border-border-color">{user.uid}</p>
            </div>
            <div>
              <label className="text-sm text-text-secondary">Account Status</label>
              <p className="text-text-primary mt-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  user.status === 'approved'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                }`}>
                  {user.status === 'approved' ? '✓ Approved' : '⏳ Pending'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-8 pt-8 border-t border-border-color">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface rounded-lg border border-border-color">
              <p className="text-sm text-text-secondary">Account Type</p>
              <p className="text-2xl font-bold text-primary mt-1 capitalize">{user.role}</p>
            </div>
            <div className="p-4 bg-surface rounded-lg border border-border-color">
              <p className="text-sm text-text-secondary">Email Verified</p>
              <p className="text-2xl font-bold text-green-400 mt-1">✓ Yes</p>
            </div>
            <div className="p-4 bg-surface rounded-lg border border-border-color">
              <p className="text-sm text-text-secondary">Member Since</p>
              <p className="text-lg font-semibold text-text-primary mt-1">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;