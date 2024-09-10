import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Gallery.css'; // Importe o arquivo CSS

function Gallery() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const result = await axios.get('https://gallery-viewer-swart.vercel.app/items');
            setItems(result.data);
        };
        fetchData();
    }, []);

    return (
        <div className="gallery-container">
            {items.map((item, index) => (
                <div key={index} className="gallery-item">
                    <img src={`https://gallery-viewer-swart.vercel.app/${item.imageUrl}`} alt={item.name} />
                    <p>{item.name}</p>
                </div>
            ))}
        </div>
    );
}

export default Gallery;
