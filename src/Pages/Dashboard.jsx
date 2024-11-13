import React, { useEffect } from 'react';
import './Dashboard.css'; // Assuming you will create a CSS file for styling
import { Link } from 'react-router-dom';
import FotoNestIcon from '../images/fotoNestIcon.png';
import UserImage from '../images/user.jpg';
import { useNavigate } from 'react-router-dom';
import { storage, ref, uploadBytes, getDownloadURL, db } from '../firebase-config';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import axios from 'axios';
import Card from '../Components/Card';
import './css/takefive.min.css';
// import google speech to text

const Dashboard = ({ userData, Logout }) => {

    const [imageMetadata, setImageMetadata] = React.useState([]);
    const [lablesPerLine, setLablesPerLine] = React.useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        let user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
        if (!user) {
            navigate('/');
        }else{
            userData = user;
        }
    }, []);



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
            for (let i = 0; i < ImageData.length; i++) {
                const userRef = doc(db, "imageMetadata", ImageData[i].id);

                // check if image already exists in Firestore
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    console.log("Image metadata already exists in Firestore");
                    return;
                }



                // Upload the image to Firebase Storage
                const downloadURL = await uploadImage(ImageData[i].imageUrl, ImageData[i].userId, ImageData[i].id);

                ImageData[i].imageUrl = downloadURL;
                // Store image metadata in Firestore
                await setDoc(userRef, {
                    ...ImageData[i],
                });
            }



            console.log("Image metadata stored successfully in Firestore " +ImageData.length + " images");
        } catch (error) {
            console.error("Error storing image metadata in Firestore", error);
        }
    }

    async function processFacebookImage() {
        try {
            
            var userId = userData.id;
            
            await getImageMetadata();


            var facebookImages = [];
            var photos = userData.albums[0].photos.data;
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
                }
                );
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
                    imagesExists++;
                }
            });

            console.log('Images Already Exists in Firestore: '+imagesExists);
            console.log('FaceBookImagesToUpload');
            console.log(FaceBookImagesToUpload);

            // upload image to firebase storage ImageMetadata
            storeImagesToFirestore(facebookImages);
            

        } catch (error) {
            console.error("Error processing Facebook image", error);
        }
    }

    async function fetchFaceBookData() {
        window.FB.getLoginStatus(function (response) {
            console.log('User is loggedd in');
            console.log(response)
            if (response.status === 'connected') {
                processFacebookImage();

            }else{
                console.log('User is not logged in');
                window.FB.logout();
                window.FB.login(function(response) {
                    if (response.authResponse) {
                        console.log('Welcome! Fetching your information.... ');
                        window.FB.api(
                            '/me',
                            'GET',
                            { "fields": "id,name,albums{photos.limit(10){images,link,name,created_time}},email,birthday,gender" },
                            function (response) {
                                console.log('Facebook API response:', response);
                            }
                        );
                    
                    }
                });
                processFacebookImage();
            }
        });
    };

    async function getAndSaveVisionApiResults() {

        console.log('Getting Vision API Started');

        await getImageMetadata();



        var apiKey = process.env.REACT_APP_GOOGLE_VISION_API_KEY;
        console.log('API Key:', apiKey);
        console.log('Query Snapshot:', imageMetadata);

        imageMetadata.forEach(async (data) => {
            if(data.gotVisionApiResults){
                console.log('Vision API Results already exists');
                return;
            }
            let id = data.id;
            let imageUrl = data.imageUrl;
            let userId = data.userId;
            let visionApiResults = [];
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


    return (
        <div className="container-fluid w-100 p-0 m-0">
            <div className="header px-4 py-2 d-flex justify-content-between align-items-center bg-black">
                <div className="company-name d-flex align-items-center">
                    <img src={FotoNestIcon} alt="logo" className="logo" width="30px" height="30px" />
                    <h2 className="company-name mx-2 text-white my-0">FotoNest</h2>
                </div>
                <div className="user d-flex align-items-center mx-5">
                    <div className="search-bar p-2">
                        <input className="search-input" type="text" />
                        <a href="#" className="search_icon">
                            <div className="fa fa-search"></div>
                        </a>
                    </div>
                    <div className="nav">
                        <ul className="nav justify-content-around">
                            <li className="nav-item">
                                <Link className="nav-link text-white" to="#">B2B Memories</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link text-white" to="#">People</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link text-white" to="#">Explore</Link>
                            </li>
                        </ul>
                    </div>
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
                            <Link className="dropdown-item" onClick={processLables} to="#">Fetch Data</Link>
                            <Link className="dropdown-item" onClick={handleLogout} to="/">Logout</Link>
                            {/* start speech */}
                            {/* <Link className="dropdown-item" onClick={getTextFromSpeechRealTime} to="#">Speech to Text</Link>
                            {/* end speech */}
                            {/* <Link className="dropdown-item" onClick={endSpeechToText} to="#">End Speech to Text</Link> */} 
                        </div>
                    </div>
                </div>
            </div>
            <div className="container-fluid w-100 p image-lables-marquee my-4 py-3 px-0" style={{ backgroundColor: 'powderblue' }}>
                
                    {lablesPerLine.map((line, index) => (
                        <div key={index} className="image-lables">
                            <marquee behavior="alternate" direction={index % 2 === 0 ? "left" : "right"} loop="infinite" scrollamount="3">
                                {line.map((label, index) => (
                                        <span key={index} className="btn rounded-pill btn-info mx-1">{label}</span>
                                ))}
                            </marquee>
                        </div>
                    ))}
                
            </div>
            <div className="container-fluid w-100 p-0 m-0">
                <div className="image-gallery">
                    <ul className="cards">
                    {imageMetadata.map((image, index) => (
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
                        />
                    ))}
                    </ul>
                </div>

            </div>

            {/* Image ovelay */}

            <section itemscope itemtype="https://schema.org/ImageGallery">
                <article className="foyer verbose slide" id="open-image" itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
                    <header>
                        <h2>Slide 5 of 10</h2>
                    </header>
                    <figure>
                        <img src={activeImage?.imageUrl} alt={activeImage?.id} itemprop="contentUrl" />
                        <figcaption itemprop="caption">The old castle</figcaption>
                    </figure>
                    <article className="roomy">
                        <h3>Lorem ipsum</h3>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin sagittis libero et nulla ultricies,
                            vitae interdum diam vestibulum. Sed ut convallis est, ac tristique turpis. Fusce ipsum est, fermentum in facilisis imperdiet, tincidunt ac justo. Nunc quis tortor sed nunc ornare ornare.</p>

                        <p>Nullam accumsan ipsum risus, sed auctor enim varius eu. In ipsum sem, suscipit eget tortor nec,
                            laoreet auctor metus. Integer quis erat nisl. In hac habitasse platea dictumst. Phasellus a finibus
                            libero. Etiam lacus elit, tempor nec elit eu, bibendum dignissim magna.</p>
                        <p>Phasellus nec odio velit. In hac habitasse platea dictumst. Aliquam blandit nec nulla a aliquam.
                            Donec eget erat a leo dapibus egestas sed a nunc. Phasellus elementum laoreet urna, vel porttitor
                            lectus iaculis vitae. Duis a euismod lorem. Pellentesque quis auctor eros, at mollis mauris. Etiam
                            sit amet finibus nulla. Cras at mi vitae lorem ultricies tristique.</p>
                    </article>
                    <nav>
                        <a href="#nowhere" rel="parent">Memories
                        
                        
                        
                        
                        
                        
                        </a>
                        <a href="#open-image" className="prev" onClick={previousImage} rel="prev" itemprop="prev">❮</a>
                        <a href="#open-image" className="next" onClick={nextImage} rel="next" itemprop="next">❯</a>
                    </nav>
                </article>
            </section>

        </div>
    );
};

export default Dashboard;
