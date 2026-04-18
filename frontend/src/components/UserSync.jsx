import React, { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000';

export default function UserSync() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const syncUserData = async () => {
        try {
          // 1. Sync User to MongoDB
          await axios.post(`${API_BASE_URL}/api/users`, {
            clerkId: user.id,
            name: user.fullName || '',
            email: user.primaryEmailAddress?.emailAddress || '',
            profileImage: user.imageUrl || ''
          });

          // 2. Sync Local Storage session to MongoDB
          const localSession = localStorage.getItem('eduface_video_session');
          if (localSession) {
            const data = JSON.parse(localSession);
            if (data.jobId && data.videoUrl) {
              await axios.post(`${API_BASE_URL}/api/videos`, {
                userId: user.id,
                videoId: data.jobId,
                videoUrl: data.videoUrl,
                videoData: JSON.stringify(data),
                title: 'Generated Video Session',
                createdAt: Date.now()
              });
            }
          }
        } catch (error) {
          console.error('Error syncing user data to MongoDB:', error);
        }
      };
      
      syncUserData();
    }
  }, [isLoaded, isSignedIn, user]);

  return null; // Silent component
}
