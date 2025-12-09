/* 
 * MODERN FILTER SECTION UI - REPLACEMENT CODE
 * Replace lines 1548-1752 in FileList.jsx with this code
 * 
 * Features:
 * - All 4 filters in one line (responsive grid)
 * - Modern, clean design with gradients
 * - Semantic search bar appears below when category selected
 * - Beautiful animations and hover effects
 */

<div style={{ marginTop: 12 }}>
    {/* Admin filters: by Owner (Teams path) or by Project (Projects path) */}
    {userRole === 'admin' && adminFilterMode === 'owner' && (
        <div style={{ marginBottom: 12 }}>
            <AdminUserFilter
                users={uniqueOwners}
                selectedUser={adminOwnerFilter}
                onChange={setAdminOwnerFilter}
            />
        </div>
    )}
    {userRole === 'admin' && adminFilterMode === 'project' && (
        <div style={{ marginBottom: 12 }}>
            <label style={label}>Filter by Project</label>
            <select
                value={adminProjectFilter}
                onChange={e => setAdminProjectFilter(e.target.value)}
                style={select}
            >
                <option value="">All Projects</option>
                {ADMIN_PROJECTS.map(project => (
                    <option key={project} value={project}>{project}</option>
                ))}
            </select>
        </div>
    )}

    {/* ✨ MODERN 4-COLUMN FILTER GRID ✨ */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>
        {/* Category Filter */}
        <div>
            <label style={{ ...label, fontSize: 13, marginBottom: 8 }}>Category</label>
            <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{
                    ...select,
                    height: '44px',
                    fontSize: 14,
                    fontWeight: 500,
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                }}
                onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                }}
            >
                <option value="">All Categories</option>
                {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
        </div>

        {/* Date From Filter */}
        <div>
            <label style={{ ...label, fontSize: 13, marginBottom: 8 }}>Date From</label>
            <div style={{ position: 'relative' }}>
                <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '16px',
                    color: '#9ca3af',
                    pointerEvents: 'none',
                    zIndex: 1
                }}>📅</span>
                <input
                    type="date"
                    value={filterDateFrom}
                    onChange={e => setFilterDateFrom(e.target.value)}
                    style={{
                        ...input,
                        height: '44px',
                        paddingLeft: '44px',
                        fontSize: 14,
                        fontWeight: 500,
                        border: '2px solid #e5e7eb',
                        borderRadius: 10,
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = '#4f46e5';
                        e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                    }}
                />
            </div>
        </div>

        {/* Date To Filter */}
        <div>
            <label style={{ ...label, fontSize: 13, marginBottom: 8 }}>Date To</label>
            <div style={{ position: 'relative' }}>
                <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '16px',
                    color: '#9ca3af',
                    pointerEvents: 'none',
                    zIndex: 1
                }}>📅</span>
                <input
                    type="date"
                    value={filterDateTo}
                    onChange={e => setFilterDateTo(e.target.value)}
                    style={{
                        ...input,
                        height: '44px',
                        paddingLeft: '44px',
                        fontSize: 14,
                        fontWeight: 500,
                        border: '2px solid #e5e7eb',
                        borderRadius: 10,
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = '#4f46e5';
                        e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                    }}
                />
            </div>
        </div>

        {/* Filename Search */}
        <div>
            <label style={{ ...label, fontSize: 13, marginBottom: 8 }}>Search by Filename</label>
            <div style={{ position: 'relative' }}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                        pointerEvents: 'none',
                        zIndex: 1
                    }}
                >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    placeholder="Type to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        ...input,
                        height: '44px',
                        paddingLeft: '44px',
                        fontSize: 14,
                        fontWeight: 500,
                        border: '2px solid #e5e7eb',
                        borderRadius: 10,
                        transition: 'all 0.2s ease',
                        backgroundColor: '#fafbfc'
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = '#4f46e5';
                        e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                        e.target.style.backgroundColor = '#fff';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                        e.target.style.backgroundColor = '#fafbfc';
                    }}
                />
            </div>
        </div>
    </div>

    {/* Filter Status & Clear Button */}
    {(filterCategory || filterDateFrom || filterDateTo || searchQuery) && (
        <div style={{
            marginTop: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderRadius: 10,
            border: '1px solid #bae6fd'
        }}>
            <span style={{
                fontSize: 14,
                color: '#0369a1',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
            }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Showing {filteredFiles.length} of {files.length} files
            </span>
            <button
                onClick={() => {
                    setFilterCategory('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setSearchQuery('');
                }}
                style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: '#0284c7',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 13,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
                }}
                onMouseEnter={(e) => {
                    e.target.style.background = '#0369a1';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px rgba(2, 132, 199, 0.3)';
                }}
                onMouseLeave={(e) => {
                    e.target.style.background = '#0284c7';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(2, 132, 199, 0.2)';
                }}
            >
                Clear All Filters
            </button>
        </div>
    )}
</div>

{/* ✨ SEMANTIC SEARCH BAR - Shows only when category is selected ✨ */ }
{
    filterCategory && (
        <div style={{
            marginTop: 20,
            padding: '20px',
            background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
            borderRadius: 12,
            border: '2px solid #e9d5ff',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.08)'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12
            }}>
                <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                </div>
                <div>
                    <h3 style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#6b21a8',
                        letterSpacing: '-0.01em'
                    }}>
                        Semantic Search in {filterCategory}
                    </h3>
                    <p style={{
                        margin: 0,
                        fontSize: 12,
                        color: '#9333ea',
                        fontWeight: 500
                    }}>
                        Search by meaning, not just keywords
                    </p>
                </div>
            </div>
            <SemanticSearchBar
                onResults={handleSemanticSearchResults}
                onResultClick={handleSemanticResultClick}
                placeholder={`Search "${filterCategory}" by content meaning...`}
                showDropdown={true}
                category={filterCategory}
            />
        </div>
    )
}

{/* Semantic Search Results Indicator */ }
{
    isSemanticSearchActive && (
        <div style={{
            marginTop: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            padding: '14px 18px',
            background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
            borderRadius: 10,
            border: '2px solid #c4b5fd',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.12)'
        }}>
            <span style={{
                fontSize: 14,
                color: '#6b21a8',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8
            }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                {semanticSearchResults.length} semantic {semanticSearchResults.length === 1 ? 'result' : 'results'} found in {filterCategory}
            </span>
            <button
                onClick={() => {
                    setSemanticSearchResults([]);
                    setIsSemanticSearchActive(false);
                }}
                style={{
                    padding: '7px 16px',
                    borderRadius: 8,
                    background: '#7c3aed',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 13,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
                    marginLeft: 'auto'
                }}
                onMouseEnter={(e) => {
                    e.target.style.background = '#6d28d9';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 10px rgba(124, 58, 237, 0.35)';
                }}
                onMouseLeave={(e) => {
                    e.target.style.background = '#7c3aed';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 6px rgba(124, 58, 237, 0.25)';
                }}
            >
                Clear Search
            </button>
        </div>
    )
}
