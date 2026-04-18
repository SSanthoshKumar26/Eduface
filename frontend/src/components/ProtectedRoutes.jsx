import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';

const ProtectedRoute = ({ children }) => {
    const { isSignedIn, isLoaded } = useUser();

    // Wait for Clerk to load
    if (!isLoaded) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (!isSignedIn) {
        toast.error('Please sign in to access this feature!');
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;