import axios from 'axios';
import React, { useState, useEffect } from 'react';
import './SpeechToText.css'; // Assuming you will create a CSS file for styling

// Function to convert audio blob to base64 encoded string
const audioBlobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const arrayBuffer = reader.result;
            const base64Audio = btoa(
                new Uint8Array(arrayBuffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ''
                )
            );
            resolve(base64Audio);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
};

const SpeechToText = ({setText}) => {

    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [transcription, setTranscription] = useState('');

    // Cleanup function to stop recording and release media resources
    useEffect(() => {
        return () => {
            if (mediaRecorder) {
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [mediaRecorder]);

    if (!process.env.REACT_APP_GEMINI_API_KEY) {
        throw new Error("REACT_APP_GEMINI_API_KEY not found in the environment");
    }

    const apiKey = process.env.REACT_APP_GOOGLE_VISION_API_KEY;
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            recorder.start();
            console.log('Recording started');

            // Event listener to handle data availability
            recorder.addEventListener('dataavailable', async (event) => {
                console.log('Data available event triggered');
                const audioBlob = event.data;

                const base64Audio = await audioBlobToBase64(audioBlob);
                //console.log('Base64 audio:', base64Audio);

                try {
                    const startTime = performance.now();

                    const response = await axios.post(
                        `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
                        {
                            config: {
                                encoding: 'WEBM_OPUS',
                                sampleRateHertz: 48000,
                                languageCode: 'en-US',
                            },
                            audio: {
                                content: base64Audio,
                            },
                        }
                    );

                    const endTime = performance.now();
                    const elapsedTime = endTime - startTime;

                    //console.log('API response:', response);
                    console.log('Time taken (ms):', elapsedTime);

                    if (response.data.results && response.data.results.length > 0) {
                        let t = response.data.results[0].alternatives[0].transcript;
                        setTranscription(response.data.results[0].alternatives[0].transcript);
                        console.log('Transcription',t);
                        setText(t);
                    } else {
                        console.log('No transcription results in the API response:', response.data);
                        setTranscription('No transcription available');
                    }
                } catch (error) {
                    console.error('Error with Google Speech-to-Text API:', error);
                }
            });

            setRecording(true);
            setMediaRecorder(recorder);
        } catch (error) {
            console.error('Error getting user media:', error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            console.log('Recording stopped');
            setRecording(false);
        }
    };

    const controllRecording = () => {
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    const content = recording ? (
        <div class="box" onClick={controllRecording}>
            <div class="circle_ripple"></div>
            <div class="circle_ripple-2"></div>
            <div class="circle">
                <div class="circle-2">
                    <i class="fa fa-microphone"></i>
                </div>
            </div>
        </div>
    ) : (
        <div class="box" onClick={controllRecording}>
            <div class="circle">
                <div class="circle-2">
                    <i class="fa fa-microphone"></i>
                </div>
            </div>
        </div>
    );

    return (content);
}

export default SpeechToText;