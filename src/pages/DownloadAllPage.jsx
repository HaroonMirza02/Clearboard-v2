import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_ENDPOINTS } from '../utils/api';

function DownloadAllPage() {
    const { token } = useParams();
    const [status, setStatus] = useState('preparing');
    const [error, setError] = useState('');

    useEffect(() => {
        const download = async () => {
            try {
                const url = API_ENDPOINTS.DOWNLOAD_ALL_WITH_TOKEN(token);
                // Trigger download by setting window location
                window.location.href = url;

                // Show success message after a delay
                setTimeout(() => {
                    setStatus('success');

                    // Redirect to dashboard after 3 more seconds
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 3000);
                }, 1000);
            } catch (err) {
                setStatus('error');
                setError(err.message);
            }
        };
        download();
    }, [token]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f4f7fb',
            padding: '20px'
        }}>
            <div style={{
                background: '#fff',
                borderRadius: '14px',
                boxShadow: '0 6px 28px rgba(16,24,40,0.08)',
                padding: '40px',
                maxWidth: '500px',
                textAlign: 'center'
            }}>
                {status === 'preparing' && (
                    <>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>📦</div>
                        <h2 style={{ color: '#1f2a37', marginBottom: '12px' }}>Preparing Your Files...</h2>
                        <p style={{ color: '#64748b' }}>We're creating a ZIP file with all your selected files.</p>
                        <div style={{
                            width: '100%',
                            height: '4px',
                            background: '#e5e7eb',
                            borderRadius: '2px',
                            marginTop: '20px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                                animation: 'progress 1.5s ease-in-out infinite'
                            }}></div>
                        </div>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
                        <h2 style={{ color: '#10b981', marginBottom: '12px' }}>Download Started!</h2>
                        <p style={{ color: '#64748b', marginBottom: '8px' }}>
                            All files are being downloaded as a ZIP archive.
                        </p>
                        <p style={{ color: '#64748b', fontSize: '14px' }}>
                            Check your downloads folder for the ZIP file.
                        </p>
                        <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '16px' }}>
                            Redirecting to dashboard...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>❌</div>
                        <h2 style={{ color: '#dc2626', marginBottom: '12px' }}>Download Failed</h2>
                        <p style={{ color: '#64748b', marginBottom: '20px' }}>
                            {error || 'The download link may have expired or is invalid. Download links are valid for 24 hours.'}
                        </p>
                        <button
                            onClick={() => window.location.href = '/'}
                            style={{
                                padding: '12px 24px',
                                background: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '15px'
                            }}
                        >
                            Go to Dashboard
                        </button>
                    </>
                )}
            </div>

            <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
        </div>
    );
}

export default DownloadAllPage;
