import React from 'react';
import './Card.css'; // Assuming you will create a CSS file for styling

// Card component to display individual card details
const Card = ({ index, image, thumb, title, tagline, status, description, timeAgo, openImage , height, width}) => {
    return (
        <a href="#open-image" className={`image-container ${height > width ? 'tall' : ''}`} onClick={() => openImage(index)}>
            <img src={image} alt={title} onClick={() => openImage(index)} />
        </a>
    );
};


export default Card;