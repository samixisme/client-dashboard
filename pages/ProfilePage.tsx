
import React from 'react';

const ProfilePage = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-8">Profile</h1>
      <div className="bg-glass p-8 rounded-lg shadow-md border border-border-color max-w-2xl mx-auto">
        <div className="flex flex-col md:flex-row items-center">
          <img
            className="h-32 w-32 rounded-full object-cover"
            src="https://picsum.photos/100"
            alt="User Profile"
          />
          <div className="mt-6 md:mt-0 md:ml-8 text-center md:text-left">
            <h2 className="text-2xl font-bold text-text-primary">Alex Doe</h2>
            <p className="text-text-secondary mt-1">alex.doe@example.com</p>
            <p className="text-text-secondary mt-1">Role: Administrator</p>
            <button className="mt-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary">
              Edit Profile
            </button>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border-color">
          <h3 className="text-lg font-semibold text-text-primary">About</h3>
          <p className="mt-2 text-text-secondary">
            A highly motivated and experienced administrator with a passion for creating efficient and user-friendly systems. Enjoys tackling complex problems and collaborating with cross-functional teams to deliver high-quality products.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;