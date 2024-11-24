import React, { useEffect } from 'react';
import './Dashboard.css'; // Assuming you will create a CSS file for styling
import { Link } from 'react-router-dom';
import FotoNestIcon from '../images/fotoNestIcon.png';
import UserImage from '../images/user.jpg';
import { useNavigate } from 'react-router-dom';
import { storage, ref, uploadBytes, getDownloadURL, db } from '../firebase-config';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import axios, { all } from 'axios';
import Card from '../Components/Card';
import './css/takefive.min.css';
import SpeechToText from '../Components/SpeechToText';
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ToastContainer, toast, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { JsonData } from '../Components/JsonData';
// import google speech to text

/**
 * Dashboard Component - Main application interface for FotoNest
 * Manages image gallery, search, AI analysis, and user interactions
 */
const Dashboard = ({ userData, Logout }) => {

    // State management for various features
    const [loading, setLoading] = React.useState(true);
    const [imageMetadata, setImageMetadata] = React.useState([]); // Stores all image data
    const [lablesPerLine, setLablesPerLine] = React.useState([]); // Labels organized for display
    const [fetchingData, setFetchingData] = React.useState(false);
    const navigate = useNavigate();
    const [wittyText, setWittyText] = React.useState('');
    const [wittyTextLoader, setWittyTextLoader] = React.useState(false);
    const [searchResults, setSearchResults] = React.useState([]);

    /**
     * Filters and returns images based on provided labels
     * @param {string[]} labels - Array of labels to filter images by
     * @returns {void} - Updates searchResults state with filtered images
     */
    function getSelectedLables(labels) {
        let images = []
        // Normalize labels by removing whitespace and converting to lowercase
        labels = labels.map(label => label.replace(/\s+$/g, '').toLowerCase());
        imageMetadata.forEach((data) => {
            // Convert image labels to lowercase for case-insensitive comparison
            let l = data.imageLables;
            l = l.map(label => label.toLowerCase());
            // Check if any of the search labels match the image labels
            let found =  l.some(r=> labels.includes(r));
            if (found) {
                images.push(data);
            }
        });
        setSearchResults(images);
        console.log('Search Results:', images);
    }

    /**
     * Authentication check on component mount
     */
    useEffect(() => {
        let user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
        if (!user) {
            navigate('/');
        }else{
            userData = user;
        }
    }, []);

    /**
     * Generates AI content using Google's Gemini API
     * @param {string} prompt - Input prompt for AI generation
     */
    async function getDataFromPrompt(prompt) {
        const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        if(!prompt){
            return;
        }
        console.log('Prompt:', prompt);
        const result = await model.generateContent([prompt]);
        let response = result.response.text()
        // setWittyText(response);
        console.log('Witty Text:', response);
        return response;
    }

    /**
     * Processes search text to find matching labels
     * @param {string} search - Search query text
     */
    async function getMeAllMatchingLables(search){
        setFetchingData(true);
        // Get all unique labels from images
        let lables = lablesPerLine.flat();
        let allLabels = lables.map(label => label.toLowerCase());
        allLabels = [...new Set(allLabels)];
        allLabels = allLabels.join(',');
        
        // Construct prompt for AI to find matching labels
        let prompt = `
        return exact lables
        only return me all lables that are matched to the search text ${search} from the following list of lables
        in a single line plain text with no backtick seperated by comma 
        ${allLabels}
        seperated by comma
        `
        // Get AI response and process matches
        let result = await getDataFromPrompt(prompt);
        result = result.replace(/\n$/, '');
        let matchedLables = result.split(',');
        
        // Filter images based on matched labels
        getSelectedLables(matchedLables);
        setFetchingData(false);
        setSelectedLable(search);
    }

    /**
     * Fetches and updates image metadata from Firestore
     * @param {boolean} refresh - Force refresh flag
     */
    async function getImageMetadata(refresh=false) {
        if(!refresh){
            return;
        }
        try {
            const q = query(collection(db, "imageMetadata"), where("userId", "==", userData.id));
            const querySnapshot = await getDocs(q);
            let imageMetadata = [];
            querySnapshot.forEach((doc) => {
                imageMetadata.push(doc.data());
            });
            setImageMetadata(imageMetadata);
            let lables = [];
            console.log("Image Metadata:", imageMetadata);
            let index = 0;
            // set index

            imageMetadata.forEach((data) => {
                data.index = index++;
                data.imageLables?.forEach((label) => {
                    lables.push(label)
                }
                );
            });

            console.log("Labels:", lables);
            console.log("Image Metadata:", imageMetadata);
            let numberOflines = 4;
            let lablesPerLine = Math.ceil(lables.length / numberOflines);
            let lines = [];
            for (let i = 0; i < numberOflines; i++) {
                let line = lables.slice(i * lablesPerLine, (i + 1) * lablesPerLine);
                lines.push(line);
            }
            console.log("Lines:", lines);
            setLablesPerLine(lines);
            console.log("Image Labels:", lables);
            setLoading(false);
            // toastSucessMessage('Image Metadata fetched successfully');
        } catch (error) {
            console.error("Error getting image metadata", error);
        }
    }

    /**
     * Handles user logout and Facebook disconnect
     */
    const handleLogout = () => {
        Logout();
        window.FB.getLoginStatus(function (response) {
            if (response.authResponse) {
                console.log('User is logged in');
                window.FB.logout();
            } else {
                console.log('User is not logged in');
            }
        });
        navigate('/');
    };

    /**
     * Uploads image to Firebase Storage
     * @param {string} imageUrl - Source image URL
     * @param {string} userId - User identifier
     * @param {string} imageName - Name for stored image
     */
    async function uploadImage(imageUrl, userId, imageName) {
        try {
            // Download the image using axios
            const response = await axios.get(imageUrl, { responseType: 'blob' });

            // Create a reference to Firebase Storage location
            const storageRef = ref(storage, `images / ${userId}/${imageName}`);

            // Upload image to Firebase Storage
            await uploadBytes(storageRef, response.data);

            // Get the download URL of the uploaded image
            const downloadURL = await getDownloadURL(storageRef);

            // Return the download URL
            return downloadURL;
        } catch (error) {
            console.error("Error uploading image to Firebase Storage", error);
            throw new Error("Image upload failed");
        }
    }

    /**
     * Stores image metadata in Firestore
     * @param {Array} ImageData - Array of image metadata objects
     */
    async function storeImagesToFirestore(ImageData) {
        if (ImageData.length === 0) {
            toastSucessMessage('No new images to store in Firestore');
            return;
        }
        try {
            // Loop through each image
            toast.info('Found ' + ImageData.length + ' new images');
            for (let i = 0; i < ImageData.length; i++) {
                const userRef = doc(db, "imageMetadata", ImageData[i].id);

                // check if image already exists in Firestore
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    console.log("Image metadata already exists in Firestore");
                }



                // Upload the image to Firebase Storage
                const downloadURL = await uploadImage(ImageData[i].imageUrl, ImageData[i].userId, ImageData[i].id);
                ImageData[i].faceBookImageUrl = ImageData[i].imageUrl;
                ImageData[i].imageUrl = downloadURL;
                // Store image metadata in Firestore
                console.log("Storing image metadata in Firestore", ImageData[i]);
                await setDoc(userRef, {
                    ...ImageData[i],
                }, { merge: true });
                toastSucessMessage('Image metadata stored successfully in Firestore');
            }
            console.log("Image metadata stored successfully in Firestore " +ImageData.length + " images");
            getAndSaveVisionApiResults();
        } catch (error) {
            console.error("Error storing image metadata in Firestore", error);
        }
    }

    /**
     * Handles Facebook image processing and storage
     * @param {Object} facebookData - Facebook API response containing image data
     * @returns {Promise<void>} - Processes and stores images in Firebase
     */
    async function processFacebookImage(facebookData) {
        try {
            
            var userId = userData.id;
            
            await getImageMetadata();
            
            
            var facebookImages = [];
            var photos = facebookData.albums.data[0].photos.data;
            console.log('Photos:', photos);
            photos.forEach(photo => {
                let id = photo.images[0].source.split('/').pop().split('?')[0].split('.')[0];
                console.log(photo.images[0].source);
                
                console.log(id);
                facebookImages.push({
                    id: id,
                    created_time: photo.created_time,
                    link: photo.link,
                    imageUrl: photo.images[0].source,
                    userId: userId,
                    height: photo.images[0].height,
                    width: photo.images[0].width,
                });
            });
            console.log(facebookImages);
            
            // face book image data not uploaded to firebase storage
            
            var FaceBookImagesToUpload = [];
            let imagesExists = 0;
            facebookImages.forEach(async (image) => {
                let id = image.id;
                // check if image exists in querySnapshot
                let img = imageMetadata.find(doc => doc.id === id);
                if (!img) {
                    FaceBookImagesToUpload.push(image);
                }else{
                    // FaceBookImagesToUpload.push(image);
                    imagesExists++;
                }
            });

            console.log('Images Already Exists in Firestore: '+imagesExists);
            console.log('FaceBookImagesToUpload');
            console.log(FaceBookImagesToUpload);
            
            // upload image to firebase storage ImageMetadata
            toastSucessMessage('Fetched Facebook Images');
            storeImagesToFirestore(FaceBookImagesToUpload);
            

        } catch (error) {
            console.error("Error processing Facebook image", error);
            setFetchingData(false);
        }
    }

    /**
     * Fetches user's Facebook photos
     * Handles Facebook authentication and API calls
     * @returns {Promise<void>} - Initiates Facebook data processing
     */
    async function fetchFaceBookData() {
        setFetchingData(true);
        window.FB.getLoginStatus(function (response) {
            let facebookData = {};
            // console.log('User is loggedd in');
            // console.log(response)
            if (response.status === 'connected' && 0) {
                console.log('User is logged in');
                window.FB.api(
                    '/me',
                    'GET',
                    { "fields": "id,name,albums{photos.limit(100){images,link,name,created_time}},email,birthday,gender" },
                    function (response) {
                        console.log(response)
                        facebookData = response;
                        processFacebookImage(facebookData);
                    }
                );
            }else{
                console.log('User is not logged in');
                window.FB.logout();
                window.FB.login(function(response) {
                    if (response.authResponse) {
                        console.log('Welcome! Fetching your information.... ');
                        window.FB.api(
                            '/me',
                            'GET',
                            { "fields": "id,name,albums{photos.limit(100){images,link,name,created_time}},email,birthday,gender" },
                            function (response) {
                                console.log(response)
                                facebookData = response;
                                processFacebookImage(facebookData);
                            }
                        );
                    
                    }else{  
                        toast.error('User cancelled login or did not fully authorize.');
                        setFetchingData(false);
                    }
                });
            }
        });
    };

    /**
     * Processes and analyzes images using Google Vision API
     */
    async function getAndSaveVisionApiResults() {

        
        console.log('Getting Vision API Started');
        
        await getImageMetadata();

        
        
        var apiKey = process.env.REACT_APP_GOOGLE_VISION_API_KEY;
        console.log('API Key:', apiKey);
        console.log('Query Snapshot:', imageMetadata);
        
        imageMetadata.forEach(async (data) => {
            let id = data.id;
            let imageUrl = data.imageUrl;
            let userId = data.userId;
            let visionApiResults = [];
            if (data.gotVisionApiResults) {
                console.log('Vision API Results already exists in Firestore');
                return;
            }
            try {
                const response = await axios.post(
                    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
                    {
                        requests: [
                            {
                                image: {
                                    source: {
                                        imageUri: imageUrl,
                                    },
                                },
                                features: [
                                    { type: 'LABEL_DETECTION' },
                                    { type: 'TEXT_DETECTION' },
                                    { type: 'FACE_DETECTION' },
                                    { type: 'LANDMARK_DETECTION' },
                                    { type: 'LOGO_DETECTION' },
                                    { type: 'SAFE_SEARCH_DETECTION' },
                                    { type: 'IMAGE_PROPERTIES' },
                                    { type: 'CROP_HINTS' }
                                    
                                ],
                            },
                        ],
                    }
                );
                visionApiResults = response.data.responses[0];
                console.log('Vision API Results:', visionApiResults);
                console.log('Image data:', data);
                toastSucessMessage('Successfully fetched Vision API results');
            } catch (error) {
                console.error("Error getting Vision API results", error);
            }

            try {
                const userRef =  doc(db, "imageMetadata", id);
                let imageLables = [];
                let textAnnotations = [];
                visionApiResults.labelAnnotations?.forEach((label) => {
                    imageLables.push(label.description);
                }
                );
                visionApiResults.textAnnotations?.forEach((text) => {
                    textAnnotations.push(text.description);
                }
                );


                await setDoc(userRef, {
                    ...data,
                    visionApiResults: visionApiResults,
                    gotVisionApiResults: true,
                    imageLables: imageLables,
                    textAnnotations: textAnnotations,
                },
                { merge: true }
                );
                console.log('Vision API Results stored in Firestore');
            } catch (error) {
                console.error("Error storing Vision API results in Firestore", error);

            }
            
        });
        setFetchingData(false);
        processLables();
        
        
    }

    /**
     * Processes and stores image labels from Vision API results
     * @returns {Promise<void>} Updates image metadata with processed labels
     */
    async function processLables(){
        const q = query(collection(db, "imageMetadata"), where("userId", "==", userData.id));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async(doc) => {
            let data = doc.data();
            let imageLables = [];
            data.visionApiResults.labelAnnotations?.forEach((label) => {
                imageLables.push(label.description);
            }
            );
            console.log("Image Lables:", imageLables);
            await setDoc(doc.ref, {
                ...data,
                imageLables: imageLables,
            },
            { merge: true }
            );
        });
        getImageMetadata(true);

    }
    useEffect(() => {
        getImageMetadata(true);
    }
    , []);

    const [activeImage, setActiveImage] = React.useState(null);

    // Image navigation and display functions
    /**
     * Handles image overlay navigation
     * @param {number} index - Index of image to display
     */
    function openImageOverlay(index) {
        console.log('Open Image Overlay:', index);
        console.log('Image Metadata:', imageMetadata[index]);
        setActiveImage(imageMetadata[index]);
    }

    /**
     * Navigates to next image in overlay
     */
    function nextImage() {
        console.log('Next Image');
        setActiveImage(imageMetadata[(activeImage.index + 1) % imageMetadata.length]);
    }

    /**
     * Navigates to previous image in overlay
     */
    function previousImage() {

        console.log('Previous Image');
        setActiveImage(imageMetadata[(activeImage.index - 1 + imageMetadata.length) % imageMetadata.length]);
    }

    /**
     * Updates search box with provided text
     * @param {string} text - Text to set in search box
     */
    function setTextInsearchBox(text){
        // clear search box
        document.getElementById('search-box').value = '';
        document.getElementById('search-box').value = text;
        // focus on search box
        document.getElementById('search-box').focus();
        setSearchText(text);
    }

    /**
     * Displays success toast message
     * @param {string} msg - Message to display
     */
    function toastSucessMessage(msg) {
        toast.success(msg);
    }

    

    /**
     * Wraps function execution in a Promise
     * @param {Function} func - Function to execute
     * @returns {Promise} Promise wrapping the function execution
     */
    function returnPromise(func){
        return new Promise((resolve, reject) => {
            try {
                func();
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Displays toast with promise status
     * @param {Function} func - Function to execute with toast feedback
     */
    function toastPromise(func){
        toast.promise(
            returnPromise(func),
            {
                pending: 'Fetching Data 🕒',
                success: 'Job Done 🚀',
                error: 'Promise rejected 🤯'
            }
        )
    }

    /**
     * Initiates label matching based on search input
     */
    function getGeneratedText(){
        let text = document.getElementById('search-box').value;
        console.log('Generating Text:', text);
        // getDataFromPrompt(text);
        getMeAllMatchingLables(text);
    }

    /**
     * Prepares and generates AI prompt for image description
     * @param {number} index - Index of image to generate description for
     */
    async function preparePrompt(index){
        setWittyTextLoader(true);
        try {

            let prompt = JsonData(imageMetadata[index].visionApiResults);

            let result = await getDataFromPrompt(prompt);
            setWittyText(result);
        }
        catch (error) {
            console.error('Error preparing prompt:', error);
        }
        setWittyTextLoader(false);
        
    }

    const [searchText, setSearchText] = React.useState('');


    /**
     * Gets dominant color from active image for overlay background
     * @returns {string} RGB color string
     */
    const dominantColor = () => {
        let colorCode = activeImage?.visionApiResults?.imagePropertiesAnnotation?.dominantColors?.colors[0]?.color;
        console.log('Dominant Color:', colorCode);
        console.log(activeImage)
        return 'rgb(' + colorCode?.red + ',' + colorCode?.green + ',' + colorCode?.blue + ',0.8)';
    }

    /**
     * Handles notification display
     */
    const openNotification = () => {
        toastSucessMessage('Notification');
    }

    const [selectedLable, setSelectedLable] = React.useState('');
    /**
     * Updates selected label and filters images
     * @param {string} label - Selected label to filter by
     */
    function onSelectLabel(label) {
        setSelectedLable(label);
        getSelectedLables([label]);
    }

    /**
     * Clears current search/filter state
     */
    const clearFilter = () => {
        setSelectedLable('');
        setSearchResults([]);
    }


    return !loading ? (
        <div className="container-fluid w-100 p-0 m-0">

            <ToastContainer
                position="bottom-right"
                autoClose={5000}
                hideProgressBar
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
                transition= {Bounce}
            />
            <div className="dashboard-header px-4 py-2 d-flex flex-wrap justify-content-between align-items-center bg-black w-100">
                <div className="company-name d-flex align-items-center">
                    <img src={FotoNestIcon} alt="logo" className="logo" width="50px" height="50px" />
                    <h2 className="mx-2 text-white my-0">FotoNest</h2>
                </div>
                <div className="user d-flex flex-wrap align-items-center justify-content-end mx-0">
                    <div className="search d-flex align-items-center justify-content-end">

                        <div className="search-bar d-flex justify-content-between align-items-center">
                            <img  src={FotoNestIcon} alt="logo" className="mobile-logo mx-2" width="40px" height="40px" />
                            <input
                                className={`search-input ${searchText.length > 0 ? 'search-box-expanded' : ''}`}
                                id="search-box"
                                type="text"
                                onKeyUp={(e) => setSearchText(e.target.value)}
                            />
                            <button className="search-icon btn fa fa-search" onClick={getGeneratedText}></button>
                        </div>
                        <SpeechToText setText={setTextInsearchBox} />
                        <div className="mobile-dropdown">
                            <button
                                className="btn dropdown-toggle"
                                type="button"
                                id="dropdownMenuButton"
                                data-toggle="dropdown"
                                aria-haspopup="true"
                                aria-expanded="false"
                            >
                                <img src={UserImage} className="rounded-circle" alt="user" width="30px" height="30px" />
                            </button>
                            <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                                <Link className="dropdown-item" to="#">{userData?.name}</Link>
                                <Link className="dropdown-item" onClick={() => fetchFaceBookData()} to="#">Fetch data</Link>
                                {/* open notification */}
                                <button className="dropdown-item" onClick={openNotification}>Notification</button>
                                <Link className="dropdown-item" onClick={handleLogout} to="/">Logout</Link>
                            </div>
                        </div>
                    </div>
                    <div className="web-dropdown">
                        <button
                            className="btn dropdown-toggle"
                            type="button"
                            id="dropdownMenuButton"
                            data-toggle="dropdown"
                            aria-haspopup="true"
                            aria-expanded="false"
                        >
                            <img src={UserImage} className="rounded-circle" alt="user" width="50px" height="50px" />
                        </button>
                        <div className="dropdown-menu dropdown-menu-left" aria-labelledby="dropdownMenuButton">
                            <Link className="dropdown-item" to="#">{userData?.name}</Link>
                            <Link className="dropdown-item" onClick={() => fetchFaceBookData()} to="#">Fetch data</Link>
                            <Link className="dropdown-item" onClick={handleLogout} to="/">Logout</Link>
                            <button className="dropdown-item" onClick={openNotification}>Notification</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container-fluid w-100 p image-lables-marquee my-4 py-3 px-0" style={{ backgroundColor: 'powderblue' }}>
                
                    {lablesPerLine.map((line, index) => (
                        <div key={index} className="image-lables">
                            <marquee behavior="alternate" direction={index % 2 === 0 ? "left" : "right"} loop="infinite" scrollamount="3">
                                {line.map((label, index) => (
                                    <span key={index} className={`btn rounded-pill mx-1 ${selectedLable === label ? "btn-info" : "bg-light"}`} onClick={() => onSelectLabel(label)}>{label}</span>
                                ))}
                            </marquee>
                        </div>
                    ))}
                
            </div>
            <div className="container-fluid w-100 p-0 m-0">
                {fetchingData ? (
                    <div className="container-fluid w-100 p-0 m-0 d-flex justify-content-center align-items-center">
                        <div className='loader'></div>
                    </div>
                ) : (
                <div>
                {searchResults.length > 0 ? 
                        (
                            <div className="container-fluid w-100 p-0 m-0 d-flex justify-content-end align-items-center">
                                        <button className="btn btn-secondary mb-3 mx-3 rounded-pill" onClick={clearFilter}>{selectedLable}
                                            <i class="fa fa-times-circle ms-2" aria-hidden="true"></i>
                                        </button>
                            </div>
                        ) : null
                }
                <div className="d-flex justify-content-center align-items-center">
                    <ul className="image-gallery gallery px-4 w-100">
                        {
                            searchResults.length > 0 ? 
                            searchResults.map((image) => (
                                <Card
                                    key={image.index}
                                    image={image.imageUrl}
                                    thumb={image.imageUrl}
                                    title={image.id}
                                    tagline={image.created_time}
                                    status={image.gotVisionApiResults ? 'Processed' : 'Not Processed'}
                                    description={image.imageLables}
                                    timeAgo={image.created_time}
                                    openImage={openImageOverlay}
                                    index={image.index}
                                    height={image.height}
                                    width={image.width}
                                />
                            ))
                            :
                            imageMetadata.map((image, index) => (
                                <Card
                                    key={index}
                                    image={image.imageUrl}
                                    thumb={image.imageUrl}
                                    title={image.id}
                                    tagline={image.created_time}
                                    status={image.gotVisionApiResults ? 'Processed' : 'Not Processed'}
                                    description={image.imageLables}
                                    timeAgo={image.created_time}
                                    openImage={openImageOverlay}
                                    index={index}
                                    height={image.height}
                                    width={image.width}
                                />
                            ))
                        }
                    </ul>
                </div>
                </div>
                )}
            </div>

            {/* Image ovelay */}

            <section itemscope itemtype="https://schema.org/ImageGallery">
                <article className="foyer verbose slide" id="open-image" itemprop="image" itemscope itemtype="https://schema.org/ImageObject" style={{ display: activeImage ? 'block' : 'none', backgroundColor: dominantColor() }}>    
                    <header>
                        <h2>{activeImage?.index + 1} of {imageMetadata.length}</h2>
                    </header>
                    <figure>
                        <img src={activeImage?.imageUrl} alt={activeImage?.id} itemprop="contentUrl" />
                    </figure>
                    <article className="roomy">
                        {/* button to generate witty message */}
                        <button className="btn btn-primary" onClick={() => preparePrompt(activeImage.index)} >Generate Witty Text</button>
                        {wittyTextLoader ? <div className='loader'></div> : <p>{wittyText}</p>}
                        <h3>From Image</h3>
                        <p >
                            {/*no of faces in image */}
                            {activeImage?.visionApiResults?.faceAnnotations?.length} faces detected <br />
                            Detected Text: <br />{activeImage?.visionApiResults?.textAnnotations?.map((text) => text.description).join(', ')} <br />
                            Detected Labels:<br /> {activeImage?.imageLables?.join(', ')} <br />
                        </p>
                    </article>
                    <nav>
                        <a href="#nowhere" rel="parent">Memories</a>
                        <a href="#open-image" className="prev" onClick={previousImage} rel="prev" itemprop="prev">❮</a>
                        <a href="#open-image" className="next" onClick={nextImage} rel="next" itemprop="next">❯</a>
                    </nav>
                </article>
            </section>
            

        </div>
    ) : (
        <div className="container-fluid w-100 p-0 m-0 d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
            <div className='loader'></div>
        </div>
    )
};

export default Dashboard;
