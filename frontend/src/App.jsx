import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import UploadForm from './UploadForm';
import Gallery from './Gallery';

function App() {
    return (
        <Router>
            <div>
                <Routes>
                    <Route path="/" element={<UploadForm />} />
                    <Route path="/gallery" element={<Gallery />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
