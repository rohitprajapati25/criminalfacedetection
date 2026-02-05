"use client";

import React, { useState } from "react";
import axios from "axios";
import { Camera, Shield, User, CheckCircle, AlertCircle } from "lucide-react";

export default function MobileUpload() {
    const [name, setName] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!name || !file) {
            setMessage({ text: "Please provide both name and photo.", type: "error" });
            return;
        }

        setLoading(true);
        setMessage({ text: "Uploading to AI engine...", type: "info" });

        try {
            const formData = new FormData();
            formData.append("file", file);

            // Adjust this IP to your machine's local IP if needed, 
            // but localhost:8000 might not work if accessed via phone IP.
            // Using a dynamic approach or hardcoded local IP for this demo.
            const backendIp = window.location.hostname; // Should be the local IP of the server
            const res = await axios.post(`http://${backendIp}:8000/upload?name=${encodeURIComponent(name)}`, formData);

            if (res.data.status === "success") {
                setMessage({ text: `Suspect ${name} registered successfully!`, type: "success" });
                setName("");
                setFile(null);
            } else {
                setMessage({ text: `Error: ${res.data.message}`, type: "error" });
            }
        } catch (err) {
            console.error(err);
            setMessage({ text: "Upload failed. Check if phone is on the same WiFi as the server.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0F172A',
            color: 'white',
            fontFamily: 'sans-serif',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Shield color="#06B6D4" size={48} style={{ marginBottom: '1rem' }} />
                <h1 style={{ fontSize: '1.5rem', margin: '0' }}>MOBILE AGENT</h1>
                <p style={{ color: '#94A3B8', fontSize: '0.875rem' }}>SECURE SUSPECT REGISTRATION</p>
            </header>

            <form onSubmit={handleUpload} style={{
                width: '100%',
                maxWidth: '400px',
                background: 'rgba(255,255,255,0.05)',
                padding: '2rem',
                borderRadius: '1rem',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: '#94A3B8' }}>Suspect Name</label>
                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 2.5rem',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.5rem',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: '#94A3B8' }}>Suspect Photo</label>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        id="mobile-file"
                        onChange={(e) => setFile(e.target.files[0])}
                        style={{ display: 'none' }}
                    />
                    <label htmlFor="mobile-file" style={{
                        height: '120px',
                        border: '2px dashed #06B6D4',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        background: file ? 'rgba(34, 197, 94, 0.1)' : 'transparent'
                    }}>
                        <Camera size={32} color={file ? '#22C55E' : '#06B6D4'} />
                        <span style={{ fontSize: '0.875rem', color: file ? '#22C55E' : '#94A3B8' }}>
                            {file ? "Photo Selected" : "Tap to Open Camera"}
                        </span>
                    </label>
                    {file && <p style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center' }}>{file.name}</p>}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: '1rem',
                        background: '#06B6D4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        marginTop: '0.5rem'
                    }}
                >
                    {loading ? "PROCESSING..." : "REGISTER SUSPECT"}
                </button>

                {message.text && (
                    <div style={{
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                        color: message.type === 'success' ? '#22C55E' : message.type === 'error' ? '#EF4444' : '#06B6D4',
                        border: `1px solid ${message.type === 'success' ? '#22C55E33' : message.type === 'error' ? '#EF444433' : '#06B6D433'}`
                    }}>
                        {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {message.text}
                    </div>
                )}
            </form>

            <footer style={{ marginTop: 'auto', padding: '1rem', color: '#64748B', fontSize: '0.75rem' }}>
                AI SURVEILLANCE SYSTEM v1.0
            </footer>
        </div>
    );
}
