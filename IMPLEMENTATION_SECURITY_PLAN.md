# ClearBoard Security and Implementation Plan

This document outlines the implementation plan for enhancing ClearBoard's security, multi-tenancy, and file management capabilities.

## 1. Security Checklist (✅ / ⚠️ / ❌)

| Feature | Status | Details |
| :--- | :---: | :--- |
| Tenant Isolation | ⚠️ | Currently logic exists but not enforced at the database level via tenant IDs. |
| Role-Based Access Control (RBAC) | ✅ | Basic Admin/User roles implemented; needs expansion to Manager/Contributor/Read-only. |
| File Lifecycle Enforcement | ❌ | Not yet implemented (Draft/Approved/Archived). |
| Secure File Access | ✅ | Signed URLs via GCS implemented. |
| Audit Logging | ⚠️ | Basic morgan logging; needs comprehensive user action logs. |
| Secrets Handling | ✅ | Using `.env` and GCP secrets where applicable. |
| Session/Token Handling | ✅ | JWT with 15m expiry and refresh logic. |
| Docker Isolation | ✅ | Dockerfile exists for containerized deployment. |

## 2. Benchmark Notes

### Platform Comparison: Security & Access Control

| Feature | ClearBoard (Target) | Notion | SharePoint | Google Drive |
| :--- | :--- | :--- | :--- | :--- |
| **Role Hierarchy** | Admin > Manager > Contributor > Read-only | Workspace Owner > Member > Guest | Site Owner > Member > Visitor | Manager > Content Manager > Contributor > Commenter/Viewer |
| **Default Restrictions** | Private by default; tenant-isolated. | Teamspace-based; public links possible. | Highly granular; inheritance-based. | Org-wide or restricted; link-sharing common. |
| **Misuse Prevention** | Size limits, type validation, duplicate checks. | Version history, workspace locks. | DLP policies, check-in/out. | Virus scanning, suspect file flags. |
| **Audit/Logging** | Action-level logs (Who, what, when). | Audit logs (Enterprise only). | Detailed compliance logs. | Activity dashboard. |

## 3. Implementation Roadmap

### Phase 1: Models & Infrastructure Updates
- **Tenant Model**: Create `Company.js` to store organization metadata and configurations.
- **User Model Update**: 
    - Add `companyId` (Relation to Company).
    - Update `role` enum: `['admin', 'manager', 'contributor', 'read-only']`.
- **File Model Update**:
    - Add `companyId` for tenant isolation.
    - Add `status` enum: `['draft', 'approved', 'archived']`.
    - Add `hash` field for duplicate detection.

### Phase 2: Multi-Tenancy Enforcement
- Implement `tenantMiddleware.js` to ensure users only access data belonging to their `companyId`.
- Update all CRUD operations in `server.js` to include `companyId` filters.

### Phase 3: File Lifecycle & RBAC
- **Draft**: Uploaded by Contributor/Manager. Only visible to same team/department.
- **Approved**: Moved from Draft by Manager/Admin. Becomes "Official".
- **Archived**: Moved by Admin. Read-only for all, hidden from default views.
- **RBAC Logic**:
    - `Admin`: Full control over company data.
    - `Manager`: Approve files, manage team members.
    - `Contributor`: Upload drafts, edit own files.
    - `Read-only`: Only view Approved/Archived files.

### Phase 4: Misuse Prevention & Testing
- **Upload Validation**:
    - Check for duplicates via file hash.
    - Enforce MIME type allowlist.
    - Max file size (e.g., 100MB).
- **Audit Logging**:
    - Create `AuditLog` model.
    - Log: Login, Upload, Download, Status Change, Delete.

### Phase 5: Demo Data Seeding (Completed)
- **Script**: `server/scripts/seed-demo.js`
- **Companies Created**:
    1. **GlobalCorp Solutions** (Tenant ID: `GC-001`, Slug: `globalcorp`)
    2. **TechStart Innovations** (Tenant ID: `TS-001`, Slug: `techstart`)
- **User Structure**:
    - 30 users per company (Total 60 demo users).
    - Roles: 1 Admin, 4 Managers, 15 Contributors, 10 Read-only users per company.
    - Departments: Software Development, Business Development, HR, Operations, Finance.
    - Default password for all: `password123`.

## 4. Visual Evidence & Deliverables

### Screenshots / Recording Guide
To verify the implementation, capture the following:
1. **Admin Dashboard**: Showing the multi-tenant file list (verify only company files are visible).
2. **Role Restriction**: Screenshot of a 403 error when a `Read-only` user tries to upload.
3. **Draft -> Approved**: Recording of a `Manager` changing a file status from Draft to Approved.
4. **Duplicate Detection**: Screenshot of the 409 error when uploading a file with identical content.

## 5. Risk Notes for Real Client Usage

1. **Storage Costs**: High volume of large files can rapidly increase GCS/S3 costs. Implement lifecycle policies at the storage provider level for archived files.
2. **Metadata sync**: If GCS files are deleted manually without updating MongoDB, the system will have "ghost" files. Always use the service layer for deletions.
3. **Large File Processing**: Streaming 100MB+ files through the Express server can consume memory. Ensure Busboy streaming is correctly implemented to avoid buffering.
4. **Token Security**: JWTs in localStorage are vulnerable to XSS. Recommend moving to HttpOnly cookies for better security in production.
