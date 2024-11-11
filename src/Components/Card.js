import React from 'react';
import './Card.css'; // Assuming you will create a CSS file for styling

// Card component to display individual card details
const Card = ({ image, thumb, title, tagline, status, description, timeAgo }) => {
    return (
        <li>
            <a href="" className="card">
                <img src={image} className="card__image" alt={title} />
                <div className="card__overlay">
                    <div className="card__header">
                        <img className="card__thumb" src={thumb} alt={title} />
                        <div className="card__header-text">
                            <h3 className="card__title">{title}</h3>
                            {tagline && <span className="card__tagline">{tagline}</span>}
                            <span className="card__status">{timeAgo} ago</span>
                        </div>
                    </div>
                    <p className="card__description">
                        {description?.map(desc => (
                            <span key={desc} className="btn rounded-pill btn-secondary m-1">{desc}</span>
                        )
                        )}
                    </p>
                </div>
            </a>
        </li>
    );
};


export default Card;