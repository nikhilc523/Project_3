import React from 'react';
import './Card.css';

/**
 * Card component for displaying individual image items in the gallery
 * @param {Object} props Component props
 * @param {number} props.index The index of the card in the gallery
 * @param {string} props.image URL of the full-size image
 * @param {string} props.thumb URL of the thumbnail image
 * @param {string} props.title Title of the image
 * @param {string} props.tagline Short tagline/subtitle for the image
 * @param {string} props.status Status of the image (e.g., 'published', 'draft')
 * @param {string} props.description Detailed description of the image
 * @param {string} props.timeAgo Time elapsed since image upload
 * @param {Function} props.openImage Callback function to handle image click
 * @param {number} props.height Height of the image
 * @param {number} props.width Width of the image
 * @returns {React.ReactElement} Card component
 */
const Card = ({ index, image, thumb, title, tagline, status, description, timeAgo, openImage, height, width }) => {
    return (
        // Container with dynamic class based on image dimensions
        <a href="#open-image" 
           className={`image-container ${height > width ? 'tall' : ''}`} 
           onClick={() => openImage(index)}>
            <img src={image} alt={title} onClick={() => openImage(index)} />
        </a>
    );
};

export default Card;