import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, provider } from '../firebase-config';

const FacebookLogin = ({setUser}) => {

    function login(){
        window.FB.login(function(response) {
            if (response.authResponse) {
                handleLogin();
            } else {
                console.log('User cancelled login or did not fully authorize.');
            }
        });
    }

    async function storeDataInFirestore(userData) {
        try {
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

    const handleLogin = async () => {
        var userData = null;
        try {
            window.FB.api(
                '/me',
                'GET',
                { "fields": "id,name,albums{photos.limit(10){images,link,name,created_time}},email,birthday,gender" },
                function (response) {
                    console.log('Facebook API response:', response);
                    userData = {
                        id: response.id,
                        name: response.name,
                        albums: response.albums.data || [],
                        email: response?.email || 'Not specified',
                        birthday: response?.birthday || 'Not specified',
                        gender: response?.gender || 'Not specified',
                    }
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
