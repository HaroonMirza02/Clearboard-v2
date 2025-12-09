/**
 * SemanticSearchBar Component
 * Provides intelligent semantic search with live suggestions
 * Debounced search requests to prevent excessive API calls
 * Supports both dropdown suggestions and results callback for list integration
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, Clock, TrendingUp } from 'lucide-react';
import '../styles/SemanticSearchBar.css';

const SemanticSearchBar = ({
    onResultClick,
    onResults,  // NEW: Callback to send results to parent
    placeholder = "Search documents by content...",
    showDropdown = true,  // NEW: Control whether to show dropdown
    apiUrl = null,  // NEW: Optional API URL override
    category = null  // NEW: Filter results by category
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [error, setError] = useState(null);
    const [searchTime, setSearchTime] = useState(0);

    const searchRef = useRef(null);
    const debounceTimerRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Close results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Perform search API call
    const performSearch = useCallback(async (searchQuery) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setShowResults(false);
            // Notify parent that search is cleared
            if (onResults) {
                onResults([]);
            }
            return;
        }

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        setIsSearching(true);
        setError(null);

        const startTime = Date.now();

        try {
            const token = localStorage.getItem('token');
            const baseUrl = apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:8080';
            const searchUrl = `${baseUrl}/api/search`;

            console.log('[SemanticSearch] Searching for:', searchQuery);
            console.log('[SemanticSearch] API URL:', searchUrl);

            const requestBody = {
                query: searchQuery,
                topK: 10
            };

            // Add category filter if provided
            if (category) {
                requestBody.category = category;
            }

            const response = await fetch(searchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestBody),
                signal: abortControllerRef.current.signal
            });

            console.log('[SemanticSearch] Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[SemanticSearch] Error response:', errorData);
                throw new Error(errorData.message || `Search failed with status ${response.status}`);
            }

            const data = await response.json();
            const endTime = Date.now();

            console.log('[SemanticSearch] Results received:', data.results?.length || 0);
            console.log('[SemanticSearch] Full response:', data);

            setResults(data.results || []);
            setSearchTime(endTime - startTime);
            setShowResults(showDropdown);
            setIsSearching(false);

            // Notify parent of search results
            if (onResults) {
                onResults(data.results || []);
            }

        } catch (err) {
            if (err.name === 'AbortError') {
                // Request was cancelled, ignore
                return;
            }

            console.error('[SemanticSearch] Search error:', err);
            console.error('[SemanticSearch] Error details:', {
                message: err.message,
                stack: err.stack
            });

            setError(err.message || 'Search failed. Please try again.');
            setIsSearching(false);
            setResults([]);

            // Notify parent of error/empty results
            if (onResults) {
                onResults([]);
            }
        }
    }, [onResults, showDropdown, apiUrl]);

    // Debounced search
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (query.trim()) {
            debounceTimerRef.current = setTimeout(() => {
                performSearch(query);
            }, 300); // 300ms debounce
        } else {
            setResults([]);
            setShowResults(false);
            // Notify parent that search is cleared
            if (onResults) {
                onResults([]);
            }
        }

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [query, performSearch, onResults]);

    const handleClear = () => {
        setQuery('');
        setResults([]);
        setShowResults(false);
        setError(null);
        // Notify parent that search is cleared
        if (onResults) {
            onResults([]);
        }
    };

    const handleResultClick = (result) => {
        setShowResults(false);
        if (onResultClick) {
            onResultClick(result);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'Unknown';
        const kb = bytes / 1024;
        const mb = kb / 1024;
        if (mb >= 1) return `${mb.toFixed(2)} MB`;
        return `${kb.toFixed(2)} KB`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const highlightSnippet = (snippet, searchQuery) => {
        if (!snippet || !searchQuery) return snippet;

        const terms = searchQuery.toLowerCase().split(/\s+/);
        let highlighted = snippet;

        terms.forEach(term => {
            if (term.length > 2) {
                const regex = new RegExp(`(${term})`, 'gi');
                highlighted = highlighted.replace(regex, '<mark>$1</mark>');
            }
        });

        return highlighted;
    };

    return (
        <div className="semantic-search-container" ref={searchRef}>
            <div className="search-input-wrapper">
                <Search className="search-icon" size={20} />
                <input
                    type="text"
                    className="search-input"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query && showDropdown && setShowResults(true)}
                />
                {query && (
                    <button className="clear-button" onClick={handleClear}>
                        <X size={18} />
                    </button>
                )}
                {isSearching && (
                    <div className="search-spinner"></div>
                )}
            </div>

            {showDropdown && showResults && (
                <div className="search-results-dropdown">
                    {error && (
                        <div className="search-error">
                            <p>{error}</p>
                        </div>
                    )}

                    {!error && results.length === 0 && !isSearching && (
                        <div className="no-results">
                            <FileText size={32} />
                            <p>No documents found</p>
                            <span>Try different keywords or check your spelling</span>
                        </div>
                    )}

                    {!error && results.length > 0 && (
                        <>
                            <div className="results-header">
                                <span className="results-count">
                                    {results.length} {results.length === 1 ? 'result' : 'results'}
                                </span>
                                <span className="search-time">
                                    <Clock size={14} /> {searchTime}ms
                                </span>
                            </div>

                            <div className="results-list">
                                {results.map((result, index) => (
                                    <div
                                        key={result.fileId}
                                        className="result-item"
                                        onClick={() => handleResultClick(result)}
                                    >
                                        <div className="result-header">
                                            <div className="result-title">
                                                <FileText size={16} />
                                                <span className="filename">{result.displayName || result.filename}</span>
                                            </div>
                                            <div className="result-score">
                                                <TrendingUp size={14} />
                                                <span>{(result.score * 100).toFixed(0)}%</span>
                                            </div>
                                        </div>

                                        <div
                                            className="result-snippet"
                                            dangerouslySetInnerHTML={{
                                                __html: highlightSnippet(result.snippet, query)
                                            }}
                                        />

                                        <div className="result-metadata">
                                            <span className="metadata-item">{result.category || 'Uncategorized'}</span>
                                            <span className="metadata-separator">•</span>
                                            <span className="metadata-item">{result.ownerUserId}</span>
                                            <span className="metadata-separator">•</span>
                                            <span className="metadata-item">{formatFileSize(result.size)}</span>
                                            <span className="metadata-separator">•</span>
                                            <span className="metadata-item">{formatDate(result.uploadedAt)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SemanticSearchBar;
