"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import {
    Shield,
    Activity,
    AlertTriangle,
    Camera,
    Clock,
    User,
    Search,
    CheckCircle,
    BarChart3,
    Plus,
    Upload,
    Trash2,
    QrCode
} from "lucide-react";

export default function Home() {
    const webcamRef = useRef(null);
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(false);
    const [isAuto, setIsAuto] = useState(false);
    const [logs, setLogs] = useState([]);
    const [counts, setCounts] = useState({ total: 0, alerts: 0 });
    const [currentTime, setCurrentTime] = useState("");
    const [uploadName, setUploadName] = useState("");
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState("");
    const [suspects, setSuspects] = useState([]);

    // Update time
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchSuspects = useCallback(async () => {
        try {
            const res = await axios.get("http://localhost:8000/suspects");
            setSuspects(res.data.suspects || []);
        } catch (err) {
            console.error("Fetch suspects failed", err);
        }
    }, []);

    useEffect(() => {
        fetchSuspects();
        const interval = setInterval(fetchSuspects, 5000);
        return () => clearInterval(interval);
    }, [fetchSuspects]);

    const deleteSuspect = async (name) => {
        if (!confirm(`Are you sure you want to remove ${name}?`)) return;
        try {
            await axios.delete(`http://localhost:8000/suspects/${name}`);
            addLog(`Suspect removed: ${name}`, "secondary");
            fetchSuspects();
        } catch (err) {
            console.error("Delete failed", err);
            addLog(`Error deleting ${name}`, "red");
        }
    };

    const addLog = (msg, type) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [{ time, msg, type }, ...prev].slice(0, 50));
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile || !uploadName) {
            setUploadStatus("Please provide both name and photo.");
            return;
        }

        setLoading(true);
        setUploadStatus("Uploading...");
        try {
            const formData = new FormData();
            formData.append("file", uploadFile);

            const res = await axios.post(`http://localhost:8000/upload?name=${encodeURIComponent(uploadName)}`, formData);

            if (res.data.status === "success") {
                setUploadStatus("Success! Suspect added.");
                addLog(`New suspect added: ${uploadName}`, "green");
                setUploadName("");
                setUploadFile(null);
                fetchSuspects();
            } else {
                setUploadStatus(`Error: ${res.data.message}`);
            }
        } catch (err) {
            console.error(err);
            setUploadStatus("Upload failed. System error.");
        } finally {
            setLoading(false);
        }
    };

    const capture = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get("http://localhost:8000/check");
            const status = res.data.alert;

            setResult(status);
            setCounts(prev => ({
                total: prev.total + 1,
                alerts: status === "RED ALERT" ? prev.alerts + 1 : prev.alerts
            }));

            if (status === "RED ALERT") {
                addLog(`ALERT: ${res.data.message}`, "red");
            } else if (status === "SAFE") {
                addLog("Security Check: AUTHORISED", "green");
            } else {
                addLog(res.data.message, "secondary");
            }

        } catch (err) {
            console.error(err);
            addLog("Scanner System: Off-line", "red");
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto scan interval
    useEffect(() => {
        let interval;
        if (isAuto) {
            interval = setInterval(() => {
                capture();
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isAuto, capture]);

    return (
        <div className="dashboard-container">
            {/* Header */}
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Shield color="var(--accent-cyan)" size={32} />
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>AI SURVEILLANCE</h1>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PREMIUM THREAT DETECTION SYSTEM</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <div className="system-status">
                        <div className="status-dot"></div>
                        System Online
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={18} />
                        {currentTime}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="main-grid">
                {/* Left: Video Feed */}
                <section className="camera-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Camera size={20} color="var(--accent-cyan)" />
                            LIVE FEED - CAMERA 01
                        </h2>
                        <div style={{ padding: '0.25rem 0.75rem', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            REC <div style={{ width: 6, height: 6, background: 'var(--accent-red)', borderRadius: '50%' }}></div>
                        </div>
                    </div>

                    <div className={`video-wrapper ${loading ? 'detecting' : ''} ${result === "RED ALERT" ? 'red-alert' : ''}`}>
                        {/* Backend MJPEG Stream */}
                        <img
                            src="http://localhost:8000/video"
                            alt="Live Surveillance Feed"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '0.5rem'
                            }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                console.error("Stream failed to load");
                            }}
                        />

                        {/* 
                           Webcam component removed to prevent camera locking conflict with backend.
                           The backend now handles the camera and streams the feed with overlays.
                        */}

                        {loading && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}>
                                <Search size={48} className="animate-pulse" color="var(--accent-cyan)" />
                            </div>
                        )}

                        {/* Scan Line Effect */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, height: '2px',
                            background: 'var(--accent-cyan)',
                            boxShadow: '0 0 10px var(--accent-cyan)',
                            animation: 'scan 4s linear infinite',
                            opacity: 0.3
                        }}></div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button
                            className="btn btn-primary btn-scan"
                            onClick={capture}
                            disabled={loading || isAuto}
                        >
                            <Search size={20} /> SCAN NOW
                        </button>
                        <button
                            className={`btn btn-scan ${isAuto ? 'btn-danger' : 'btn-primary'}`}
                            style={{ backgroundColor: isAuto ? 'var(--accent-red)' : 'transparent', border: '1px solid var(--accent-cyan)' }}
                            onClick={() => setIsAuto(!isAuto)}
                        >
                            <Clock size={20} /> {isAuto ? "STOP AUTO" : "AUTO SCAN"}
                        </button>
                    </div>

                    <style jsx>{`
            @keyframes scan {
              0% { top: 0%; }
              100% { top: 100%; }
            }
          `}</style>
                </section>

                {/* Right: Info Panels */}
                <aside className="info-panel">
                    {/* Alert Card */}
                    <div className={`card alert-card ${result === "RED ALERT" ? "active" : ""}`}>
                        <div className="alert-title">
                            <AlertTriangle size={28} />
                            RED ALERT
                        </div>
                        <p style={{ textAlign: 'center', color: '#fff', fontSize: '0.9rem' }}>
                            Suspect match identified. Security protocol initiated.
                        </p>
                    </div>

                    {/* Success Card */}
                    <div className={`card`} style={{ border: result === "SAFE" ? '1px solid var(--accent-green)' : '1px solid var(--glass-border)', background: result === "SAFE" ? 'rgba(34, 197, 94, 0.1)' : 'var(--glass)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            {result === "SAFE" ? <CheckCircle color="var(--accent-green)" /> : <User color="var(--text-secondary)" />}
                            <div>
                                <h3 style={{ fontSize: '1rem' }}>Status: {result || "Awaiting Scan"}</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Threat Level: {result === "RED ALERT" ? "CRITICAL" : "LOW"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Upload Suspect */}
                    <div className="card">
                        <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <Plus size={18} color="var(--accent-cyan)" />
                            Register Suspect
                        </h3>
                        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <input
                                type="text"
                                placeholder="Suspect Name"
                                value={uploadName}
                                onChange={(e) => setUploadName(e.target.value)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '0.5rem',
                                    padding: '0.5rem',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    outline: 'none'
                                }}
                            />
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setUploadFile(e.target.files[0])}
                                    style={{ display: 'none' }}
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem',
                                        border: '1px dashed var(--accent-cyan)',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        color: uploadFile ? 'var(--accent-green)' : 'var(--text-secondary)'
                                    }}
                                >
                                    <Upload size={16} />
                                    {uploadFile ? (uploadFile.name.length > 20 ? uploadFile.name.substring(0, 17) + "..." : uploadFile.name) : "Select Photo"}
                                </label>
                            </div>
                            <button className="btn btn-primary" type="submit" disabled={loading} style={{ padding: '0.5rem', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                {loading ? "Processing..." : "ADD TO DATABASE"}
                            </button>
                            {uploadStatus && (
                                <p style={{
                                    fontSize: '0.7rem',
                                    textAlign: 'center',
                                    marginTop: '0.25rem',
                                    color: uploadStatus.includes("Error") || uploadStatus.includes("failed") ? 'var(--accent-red)' : 'var(--accent-green)'
                                }}>
                                    {uploadStatus}
                                </p>
                            )}
                        </form>
                    </div>

                    {/* Analytics */}
                    <div className="card">
                        <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <BarChart3 size={18} color="var(--accent-cyan)" />
                            Analytics (Today)
                        </h3>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <div className="stat-value">{counts.total}</div>
                                <div className="stat-label">Total Scans</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{counts.alerts}</div>
                                <div className="stat-label">Suspects</div>
                            </div>
                        </div>
                    </div>

                    {/* Suspect Database */}
                    <div className="card">
                        <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <User size={18} color="var(--accent-cyan)" />
                            Registered Suspects ({suspects.length})
                        </h3>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {suspects.map((name, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.4rem 0.6rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '0.4rem',
                                    fontSize: '0.8rem'
                                }}>
                                    <span>{name}</span>
                                    <button
                                        onClick={() => deleteSuspect(name)}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '0.2rem' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {suspects.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>No suspects registered.</p>}
                        </div>
                    </div>

                    {/* Mobile Access QR */}
                    <div className="card" style={{ textAlign: 'center' }}>
                        <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
                            <QrCode size={18} color="var(--accent-cyan)" />
                            Mobile Registration
                        </h3>
                        <div style={{
                            background: 'white',
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            display: 'inline-block',
                            marginBottom: '0.75rem'
                        }}>
                            <QRCodeSVG
                                value={`http://10.169.182.245:3000/upload`}
                                size={120}
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            Scan to register suspect from phone
                        </p>
                    </div>

                    {/* Logs */}
                    <div className="card" style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <Activity size={18} color="var(--accent-cyan)" />
                            System Activities
                        </h3>
                        <div className="logs">
                            {logs.map((log, i) => (
                                <div key={i} className="log-entry">
                                    <span className="log-time">[{log.time}]</span>
                                    <span className={`log-msg ${log.type}`}>
                                        {log.msg}
                                    </span>
                                </div>
                            ))}
                            {logs.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>No activity logged yet.</p>}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
