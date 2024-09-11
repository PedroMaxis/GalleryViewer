import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Form.css'; 
import Header from './header';


function UploadForm() {
    const [name, setName] = useState('');
    const [image, setImage] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', name);
        formData.append('image', image);

        try {
            await axios.post('http://localhost:5000/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            navigate('/gallery');
        } catch (error) {
            console.error('Error uploading image', error);
        }
    };

    return (
        <>
        <Header></Header>
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
            />
            <input
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
                required
            />
            <button type="submit">Upload</button>
        </form>
        </>
    );
}

export default UploadForm;
