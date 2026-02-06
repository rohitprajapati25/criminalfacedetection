"use client";

import React, { useState, useCallback } from "react";
import axios from "axios";
import { Camera, Shield, User, CheckCircle, AlertTriangle, Search, Activity, RefreshCw } from "lucide-react";

const getBackendUrl = () => {
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
        return process.env.NEXT_PUBLIC_BACKEND_URL;
    }
    // New Cloudflare Tunnel URL
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return `https://popular-criticism-lions-appliances.trycloudflare.com`;
    }
    return "http://localhost:8000";
};

export default function PublicDetect() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null); // { alert: "", message: "", confidence: 0 }
    const [preview, setPreview] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFile(file);
            setPreview(URL.createObjectURL(file));
            setResult(null);
        }
    };

    const handleDetect = async () => {
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await axios.post(`${getBackendUrl()}/detect`, formData);
            setResult(res.data);
        } catch (err) {
            console.error(err);
            setResult({ alert: "ERROR", message: "Connection to security server failed." });
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
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
            <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <div style={{
                    display: 'inline-flex',
                    padding: '1rem',
                    background: 'rgba(6, 182, 212, 0.1)',
                    borderRadius: '50%',
                    marginBottom: '1rem',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    boxShadow: '0 0 20px rgba(6, 182, 212, 0.15)'
                }}>
                    <Shield color="#06B6D4" size={56} style={{ filter: 'drop-shadow(0 0 8px #06B6D4)' }} />
                </div>
                <h1 style={{ fontSize: '2.2rem', margin: '0', fontWeight: '800', letterSpacing: '-0.5px', background: 'linear-gradient(to bottom, #fff, #94A3B8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SECURITY SCANNER</h1>
                <p style={{ color: '#06B6D4', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '2px', opacity: 0.8 }}>BIOMETRIC THREAT DETECTION</p>
            </header>

            <div style={{
                width: '100%',
                maxWidth: '450px',
                background: 'rgba(30, 41, 59, 0.4)',
                padding: '2rem',
                borderRadius: '2rem',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Preview / Selection Area */}
                {!preview ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            id="capture-file"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="capture-file" style={{
                            height: '250px',
                            border: '2px dashed #06B6D4',
                            borderRadius: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '1rem',
                            cursor: 'pointer',
                            background: 'rgba(6, 182, 212, 0.05)',
                            transition: 'all 0.3s ease'
                        }}>
                            <Camera size={48} color="#06B6D4" />
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#E2E8F0', display: 'block' }}>Take a Photo</span>
                                <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>or upload from gallery</span>
                            </div>
                        </label>
                    </div>
                ) : (
                    <div style={{ position: 'relative', width: '100%', borderRadius: '1rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={preview} alt="Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                        {loading && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
                                <div className="animate-pulse-custom" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                    <Search size={48} color="#06B6D4" />
                                    <span style={{ fontSize: '1rem', fontWeight: '700', letterSpacing: '2px' }}>ANALYZING...</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                {preview && !loading && !result && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={reset} style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '0.75rem', color: 'white', fontWeight: '600', cursor: 'pointer' }}>
                            RETAKE
                        </button>
                        <button onClick={handleDetect} style={{ flex: 2, padding: '1rem', background: '#06B6D4', border: 'none', borderRadius: '0.75rem', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(6, 182, 212, 0.39)' }}>
                            START AI SCAN
                        </button>
                    </div>
                )}

                {/* Results Section */}
                {result && (
                    <div className="fade-in" style={{
                        padding: '1.5rem',
                        borderRadius: '1rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                        background: result.alert === 'RED ALERT' ? 'rgba(239, 68, 68, 0.15)' : result.alert === 'SAFE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${result.alert === 'RED ALERT' ? '#EF444455' : result.alert === 'SAFE' ? '#22C55E55' : '#FFFFFF22'}`,
                    }}>
                        {result.alert === 'RED ALERT' ? (
                            <>
                                <AlertTriangle size={48} color="#EF4444" />
                                <div>
                                    <h2 style={{ color: '#EF4444', margin: '0', fontSize: '1.5rem', fontWeight: '800' }}>{result.alert}</h2>
                                    <p style={{ margin: '0.5rem 0', fontSize: '1.1rem', fontWeight: '600' }}>{result.message}</p>
                                    <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Confidence: {(result.confidence * 100).toFixed(1)}%</p>
                                </div>
                            </>
                        ) : result.alert === 'SAFE' ? (
                            <>
                                <CheckCircle size={48} color="#22C55E" />
                                <div>
                                    <h2 style={{ color: '#22C55E', margin: '0', fontSize: '1.5rem', fontWeight: '800' }}>AUTHORIZED</h2>
                                    <p style={{ margin: '0.5rem 0', color: '#E2E8F0' }}>No threat detected in database.</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <Activity size={48} color="#94A3B8" />
                                <p style={{ margin: '0' }}>{result.message}</p>
                            </>
                        )}

                        <button onClick={reset} style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'white', color: '#0F172A', border: 'none', borderRadius: '2rem', fontWeight: '700', cursor: 'pointer' }}>
                            <RefreshCw size={18} /> NEW SCAN
                        </button>
                    </div>
                )}
            </div>

            <footer style={{ marginTop: 'auto', padding: '2rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    <Shield size={14} /> AI SURVEILLANCE PROTOCOL 4.2.0
                </div>
                <div style={{ color: '#475569', fontSize: '0.7rem' }}>
                    AUTHORIZED ACCESS ONLY • BIOMETRIC ENCRYPTED
                </div>
            </footer>
        </div>
    );
}
