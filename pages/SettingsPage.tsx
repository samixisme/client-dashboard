
import React from 'react';

const SettingsPage = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-8">Settings</h1>
      
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Account Settings */}
        <div className="bg-glass p-8 rounded-lg shadow-md border border-border-color">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-color pb-4 mb-6">Account</h2>
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center">
              <label htmlFor="name" className="w-full md:w-1/4 text-sm font-medium text-text-secondary">Full Name</label>
              <input type="text" id="name" defaultValue="Alex Doe" className="mt-1 md:mt-0 flex-1 appearance-none w-full px-3 py-2 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div className="flex flex-col md:flex-row md:items-center">
              <label htmlFor="email" className="w-full md:w-1/4 text-sm font-medium text-text-secondary">Email Address</label>
              <input type="email" id="email" defaultValue="alex.doe@example.com" className="mt-1 md:mt-0 flex-1 appearance-none w-full px-3 py-2 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div className="flex justify-end">
                <button className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary">
                Save Changes
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
              <label htmlFor="email-notifications" className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="email-notifications" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-glass-light rounded-full peer peer-focus:ring-2 peer-focus:ring-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">Push Notifications</p>
                <p className="text-sm text-text-secondary">Get push notifications on your devices.</p>
              </div>
              <label htmlFor="push-notifications" className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="push-notifications" className="sr-only peer" />
                <div className="w-11 h-6 bg-glass-light rounded-full peer peer-focus:ring-2 peer-focus:ring-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

         {/* Appearance Settings */}
        <div className="bg-glass p-8 rounded-lg shadow-md border border-border-color">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-color pb-4 mb-6">Appearance</h2>
           <div className="flex flex-col md:flex-row md:items-center">
              <label htmlFor="theme" className="w-full md:w-1/4 text-sm font-medium text-text-secondary">Theme</label>
              <select id="theme" className="mt-1 md:mt-0 flex-1 appearance-none w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                <option>Dark Mode</option>
                <option disabled>Light Mode (Coming Soon)</option>
              </select>
            </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;