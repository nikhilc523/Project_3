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
import { ToastContainer, toast, Flip } from 'react-toastify';
import { JsonData } from '../Components/JsonData';
// import google speech to text

const Dashboard = ({ userData, Logout }) => {

    const [loading, setLoading] = React.useState(true);

    const [imageMetadata, setImageMetadata] = React.useState([]);
    const [lablesPerLine, setLablesPerLine] = React.useState([]);
    const [fetchingData, setFetchingData] = React.useState(false);
    const navigate = useNavigate();
    const [wittyText, setWittyText] = React.useState('');
    const [wittyTextLoader, setWittyTextLoader] = React.useState(false);
    const [searchResults, setSearchResults] = React.useState([]);


    function getSelectedLables(labels) {
        let images = []
        // strip white spaces and new lines
        labels = labels.map(label => label.replace(/\s+$/g, '').toLowerCase());
        imageMetadata.forEach((data) => {
            let l = data.imageLables;
            l = l.map(label => label.toLowerCase());
            let found =  l.some(r=> labels.includes(r));
            if (found) {
                images.push(data);
            }
        });
        setSearchResults(images);
    }

    useEffect(() => {
        let user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
        if (!user) {
            navigate('/');
        }else{
            userData = user;
        }
    }, []);

    
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


    async function getMeAllMatchingLables(search){
        setFetchingData(true);
        let lables = lablesPerLine.flat();
        let allLabels = lables.map(label => label.toLowerCase());
        // unique lables
        allLabels = [...new Set(allLabels)];
        allLabels = allLabels.join(',');
        console.log('All Labels:', allLabels);
        let prompt = `
        return exact lables
        only return me all lables that are matched to the search text ${search} from the following list of lables ${allLabels}
        `
        let result = await getDataFromPrompt(prompt);
        console.log(result);
        let matchedLables = result.split(', ');
        console.log(matchedLables);
        getSelectedLables(matchedLables);
        setFetchingData(false);
    }

    





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
            toastSucessMessage('Image Metadata fetched successfully');
        } catch (error) {
            console.error("Error getting image metadata", error);
        }
    }


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

    async function storeImagesToFirestore(ImageData) {
        try {
            // Loop through each image
            toastSucessMessage('Storing Image Metadata in Firestore');
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
            }
            console.log("Image metadata stored successfully in Firestore " +ImageData.length + " images");
            getAndSaveVisionApiResults();
        } catch (error) {
            console.error("Error storing image metadata in Firestore", error);
        }
    }

    async function processFacebookImage(facebookData) {
        toastSucessMessage('Fetching Facebook Image');
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
            storeImagesToFirestore(FaceBookImagesToUpload);
            

        } catch (error) {
            console.error("Error processing Facebook image", error);
            setFetchingData(false);
        }
    }

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
                    
                    }
                });
            }
        });
    };

    async function getAndSaveVisionApiResults() {

        toastSucessMessage('Getting Data from Cloud Vision API');

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
            } catch (error) {
                console.error("Error storing Vision API results in Firestore", error);

            }
            
        });
        setFetchingData(false);
        processLables();
        
        
    }
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

    function openImageOverlay(index) {
        console.log('Open Image Overlay:', index);
        console.log('Image Metadata:', imageMetadata[index]);
        setActiveImage(imageMetadata[index]);
    }

    function nextImage() {
        console.log('Next Image');
        setActiveImage(imageMetadata[(activeImage.index + 1) % imageMetadata.length]);
    }

    function previousImage() {

        console.log('Previous Image');
        setActiveImage(imageMetadata[(activeImage.index - 1 + imageMetadata.length) % imageMetadata.length]);
    }

    function setTextInsearchBox(text){
        // clear search box
        document.getElementById('search-box').value = '';
        document.getElementById('search-box').value = text;
        // focus on search box
        document.getElementById('search-box').focus();
        setSearchText(text);
    }

    function toastSucessMessage(msg) {
        toast.success(msg, {
            position: "bottom-right",
            autoClose: 5000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
            transition: Flip,
        });
    }

    

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

    function getGeneratedText(){
        let text = document.getElementById('search-box').value;
        console.log('Generating Text:', text);
        // getDataFromPrompt(text);
        getMeAllMatchingLables(text);
    }

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


    const dominantColor = () => {
        let colorCode = activeImage?.visionApiResults?.imagePropertiesAnnotation?.dominantColors?.colors[0]?.color;
        console.log('Dominant Color:', colorCode);
        console.log(activeImage)
        return 'rgb(' + colorCode?.red + ',' + colorCode?.green + ',' + colorCode?.blue + ',0.8)';
    }




    return !loading ? (
        <div className="container-fluid w-100 p-0 m-0">
            {/* <ToastContainer /> */}
            <div className="header px-4 py-2 d-flex justify-content-between align-items-center bg-black">
                <div className="company-name d-flex align-items-center">
                    <img src={FotoNestIcon} alt="logo" className="logo" width="30px" height="30px" />
                    <h2 className="company-name mx-2 text-white my-0">FotoNest</h2>
                </div>
                <div className="user d-flex align-items-center mx-5">
                    <div className="search-bar p-2">
                        <input className={`search-input ${searchText.length>0 ? 'search-box-expanded' : ''}`} id="search-box" type="text" onKeyUp={(e) => setSearchText(e.target.value)} />
                        <button className="search-icon btn fa fa-search" onClick={getGeneratedText}>
                        </button>
                    </div>
                    <SpeechToText 
                        setText={setTextInsearchBox}
                    />
                    <div className="dropdown">
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
                        <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                            <Link className="dropdown-item" to="#">{userData?.name}</Link>
                            <Link className="dropdown-item" onClick={() => fetchFaceBookData()} to="#">Fetch data</Link>
                            <Link className="dropdown-item" onClick={handleLogout} to="/">Logout</Link>
                            {/* start speech */}
                            {/* <Link className="dropdown-item" onClick={getTextFromSpeechRealTime} to="#">Speech to Text</Link>
                            {/* end speech */}
                            {/* <Link className="dropdown-item" onClick={endSpeechToText} to="#">End Speech to Text</Link> */} 
                            <Link className="dropdown-item" onClick={preparePrompt} to="#">Generate Text</Link>
                            <Link className="dropdown-item" onClick={() => toastSucessMessage("hello")} to="#">tosdt Text</Link>
                        </div>
                    </div>
                </div>
            </div>
            <div className="container-fluid w-100 p image-lables-marquee my-4 py-3 px-0" style={{ backgroundColor: 'powderblue' }}>
                
                    {lablesPerLine.map((line, index) => (
                        <div key={index} className="image-lables">
                            <marquee behavior="alternate" direction={index % 2 === 0 ? "left" : "right"} loop="infinite" scrollamount="3">
                                {line.map((label, index) => (
                                    <span key={index} className="btn rounded-pill bg-light mx-1" onClick={() => getSelectedLables([label])}>{label}</span>
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
                                <button className="btn btn-dark mb-3 mx-3" onClick={() => setSearchResults([])}>Clear Filter</button>
                            </div>
                        ) : null
                }
                <div className="">
                    <ul className="image-gallery gallery">
                        {
                            searchResults.length > 0 ? 
                            searchResults.map((image, index) => (
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
                        <h2>Slide 5 of 10</h2>
                    </header>
                    <figure>
                        <img src={activeImage?.imageUrl} alt={activeImage?.id} itemprop="contentUrl" />
                        <figcaption itemprop="caption">The old castle</figcaption>
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
