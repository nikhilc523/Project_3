import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, provider } from '../firebase-config';

/**
 * FacebookLogin component handles Facebook authentication and user data storage
 * @param {Function} setUser - Function to update user state in parent component
 * @returns {JSX.Element} Facebook login button
 */
const FacebookLogin = ({setUser}) => {

    /**
     * Initiates the Facebook login popup
     */
    function login(){
        window.FB.login(function(response) {
            if (response.authResponse) {
                handleLogin();
            } else {
                console.log('User cancelled login or did not fully authorize.');
            }
        });
    }

    /**
     * Stores or updates user data in Firestore database
     * @param {Object} userData - User information from Facebook
     * @throws {Error} If storing data fails
     */
    async function storeDataInFirestore(userData) {
        try {
            // Check if user already exists in database
            const userRef = doc(db, "users", userData.id);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                console.log("User already exists in Firestore");
                return;
            }
            await setDoc(userRef, {
                ...userData,
                createdAt: new Date(),
            });
        } catch (error) {
            console.error("Error storing user data in Firestore:", error);
            throw new Error("Error storing user data in Firestore");
        }
        
    }

    /**
     * Handles the Facebook login process and retrieves user data
     * Makes API call to fetch user profile information including:
     * - Basic profile (id, name)
     * - Albums and photos
     * - Additional info (email, birthday, gender)
     */
    const handleLogin = async () => {
        var userData = null;
        try {
            window.FB.api(
                '/me',
                'GET',
                // Request specific fields from Facebook API
                { "fields": "id,name,albums{photos.limit(10){images,link,name,created_time}},email,birthday,gender" },
                function (response) {
                    console.log('Facebook API response:', response);
                    // Structure user data for storage
                    userData = {
                        id: response.id,
                        name: response.name,
                        albums: response.albums.data || [],
                        email: response?.email || 'Not specified',
                        birthday: response?.birthday || 'Not specified',
                        gender: response?.gender || 'Not specified',
                    }
                    // Store data and update application state
                    storeDataInFirestore(userData);
                    setUser(userData);
                }
            );
        } catch (error) {
            console.error('Error during Facebook login:', error);
        }
    };

    return (
        <button onClick={login}>Login with Facebook</button>
    );

};

export default FacebookLogin;
