import React, { useState } from 'react';
import './Login.css'; // Assuming you will create a CSS file for styling
import FacebookLogin from './FacebookLogin';
import { useNavigate } from 'react-router-dom';
import B2B from '../images/b2b.jpg';
import People from '../images/people.jpg';
import Explore from '../images/explore.jpg';
import Surprise from '../images/surprise.jpg';
import FotoNestLogo from '../images/fotoNestLogo.jpg';

const Login = ({ onLogin }) => { // Add onLogin prop

    const navigate = useNavigate();
    
    if (localStorage.getItem('user')) {
        console.log('User already logged in');
        console.log('User data:', localStorage.getItem('user'));
        navigate('/dashboard');
    }

    const responseFacebook = (response) => {
        console.log('Facebook login response:', response);
        // Implement Facebook login logic here
        onLogin(response); // Pass the response to the onLogin callback
        navigate('/dashboard');
    };

    

    return (
        <div className="container-fluid w-100 p-0 m-0">
            <div className="container-fluid hero" style={{ height: '50vh' }}>
                <div className="row h-100">
                    <div className="col-md-6 d-flex flex-column justify-content-center align-items-start h-100 text-white p-5">
                        <h1 className="hero-title">Your Memories, Our Promise!</h1>
                        <p className="hero-subtitle w-50">
                            "Every photo tells a story, and every story deserves to be cherished. We are here to help you
                            preserve your most precious memories, turning fleeting moments into lasting treasures that you can
                            relive anytime, anywhere. With our care and expertise, your memories will always remain safe and
                            beautiful."
                        </p>
                        <div className="login-options-facebook">
                            <FacebookLogin setUser={responseFacebook} />
                        </div>
                    </div>
                    <div className="col-md-6 d-flex justify-content-end align-items-center h-100 p-4">
                        <div className="foto-logo">
                            <img src={FotoNestLogo} className="img-fluid" alt="hero" width="300px" height="200px" />
                            <div className="text-center">
                                <h3 className="text-white bg-dark p-2 company-name">FotoNest</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="container-fluid services" style={{ height: '40vh' }}>
                <div className="row w-100 d-flex justify-content-center align-items-center">
                    <div className="col-md-12 d-flex justify-content-center align-items-center w-75 p-2">
                        <h1 className="text-center">Our Features</h1>
                    </div>
                    <hr className="w-75" />
                </div>
                <div className="row">
                    {[B2B, People, Explore, Surprise].map((image, index) => (
                        <div className="col-md-3 d-flex justify-content-center align-items-center h-100 p-3" key={index}>
                            <div className="card" style={{ width: '22rem' }}>
                                <div className="position-relative">
                                    <img src={image} className="card-img-top" alt="..." style={{ height: '200px', objectFit: 'cover' }} />
                                    <div className="card-img-overlay d-flex justify-content-center align-items-center text-center bg-dark bg-opacity-50">
                                        <h5 className="card-title text-white">{['B2B Memories', 'People', 'Explore', 'Surprise Me!'][index]}</h5>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <p className="card-text">{[
                                        "Relive your most cherished moments through the lens of your photos. Import your Facebook memories, and let us help you rediscover the hidden stories behind each one. Ready to dive back into your unforgettable moments?",
                                        "Your photos capture the people who matter most. Let us analyze your Facebook albums and bring their faces, names, and memories to life in ways you've never seen before. Rekindle connections and moments of joy.",
                                        "What if you could discover more than just memories in your photos? Unlock insights and deeper connections with your Facebook photos through cutting-edge technology. The story of your life is waiting to be told in a whole new way.",
                                        "Look back at your memories and discover hidden stories you never expected. You never know what might pop up—like that hilarious photo of you in pajamas at a party. Ready to relive the unexpected and laugh at what your past has been keeping from you? The surprises are waiting!"
                                    ][index]}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Login;