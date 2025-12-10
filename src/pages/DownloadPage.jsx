import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_ENDPOINTS } from '../utils/api';

function DownloadPage() {
    const { token } = useParams();
    const [status, setStatus] = useState('downloading');
    const [error, setError] = useState('');

    useEffect(() => {
        const download = async () => {
            try {
                const url = API_ENDPOINTS.DOWNLOAD_WITH_TOKEN(token);
                // Trigger download by setting window location
                window.location.href = url;
                setStatus('success');

                // Redirect to dashboard after 3 seconds
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
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
                {status === 'downloading' && (
                    <>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⬇️</div>
                        <h2 style={{ color: '#1f2a37', marginBottom: '12px' }}>Starting Download...</h2>
                        <p style={{ color: '#64748b' }}>Your file download will begin shortly.</p>
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
                                background: '#2563eb',
                                animation: 'progress 1.5s ease-in-out infinite'
                            }}></div>
                        </div>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
                        <h2 style={{ color: '#10b981', marginBottom: '12px' }}>Download Started!</h2>
                        <p style={{ color: '#64748b' }}>Check your downloads folder.</p>
                        <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '16px' }}>
                            Redirecting to dashboard...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>❌</div>
                        <h2 style={{ color: '#dc2626', marginBottom: '12px' }}>Download Failed</h2>
                        <p style={{ color: '#64748b', marginBottom: '20px' }}>{error || 'The download link may have expired or is invalid.'}</p>
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

export default DownloadPage;
