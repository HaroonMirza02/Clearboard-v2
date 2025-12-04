# Category Migration Guide

## Overview
This guide explains how to migrate from the old category structure to the new one.

## New Category Structure

### Software Development (SoftDev)
1. **WebDev Assets** - Web development resources, templates, UI/UX designs
2. **General Research** - Technical research, documentation, cloud resources
3. **Project Demo** - Demonstrations, presentations, prototypes
4. **Source Code** - Code files, scripts, applications

### Business Development (BusDev)
1. **Websites** - Website projects, landing pages, web portals
2. **Software** - Software applications, tools, platforms
3. **Dashboards** - Analytics dashboards, BI tools, visualizations
4. **Financial Research** - Financial analysis, market research, ROI studies
5. **Company Research** - Business strategy, competitor analysis, proposals
6. **Graphic Design** - Logos, branding, visual designs
7. **Storage** - General storage, backups, archives

## Migration Process

### Step 1: Run the Migration Script

The migration script will:
1. Load all existing files from metadata
2. Map files from old categories to new categories
3. Use intelligent keyword matching for unmapped files
4. Randomly distribute remaining files
5. Save the updated metadata

**To run the migration:**

```bash
cd d:\ClearBoard\server
node migrate-categories.js
```

### Step 2: Review Migration Results

The script will output:
- Total files migrated
- Mapping method used for each file (Direct, Keyword, Random)
- Statistics by department and new category
- List of all file migrations

### Step 3: Verify in Application

1. Restart your application (if not auto-reloaded)
2. Navigate to `/dashboard`
3. Check that files appear in the correct new categories
4. Use filters to verify category distribution

## Migration Mapping Rules

### Direct Mappings (Old → New)

**SoftDev:**
- TechResearch → General Research
- ProductDemo → Project Demo
- WebDevAssets → WebDev Assets
- Cloud → General Research
- SourceCode → Source Code

**BusDev:**
- BusinessStrategyPlans → Company Research
- CompetitorAnalysis → Company Research
- MarketResearch → Financial Research
- SalesPitchDecks → Company Research
- LeadGenerationReports → Company Research

### Keyword-Based Mapping

If a file doesn't have a direct mapping, the script analyzes the filename for keywords:

**SoftDev Keywords:**
- WebDev Assets: web, html, css, javascript, react, frontend, ui, design
- General Research: research, study, documentation, tech, cloud, aws
- Project Demo: demo, presentation, showcase, prototype, mockup
- Source Code: code, src, script, program, app, function, class

**BusDev Keywords:**
- Websites: website, site, web, landing, page, portal
- Software: software, app, application, tool, program, system
- Dashboards: dashboard, analytics, metrics, kpi, chart, bi
- Financial Research: financial, finance, budget, revenue, market
- Company Research: company, business, competitor, strategy, pitch
- Graphic Design: design, graphic, logo, brand, visual, image
- Storage: storage, backup, archive, data, file, document

### Random Assignment

Files that don't match any keywords are randomly distributed across the new categories for their department.

## Post-Migration Tasks

### ✅ Completed Automatically
- [x] Metadata updated with new categories
- [x] Files mapped to new categories
- [x] FileList.jsx updated with new category lists
- [x] ADMIN_PROJECTS updated

### 📋 Manual Verification Needed
- [ ] Review migrated files in each category
- [ ] Move any incorrectly categorized files manually
- [ ] Update any hardcoded category references in custom code
- [ ] Inform users about the new category structure

## Troubleshooting

### Files Not Showing After Migration
1. Check browser console for errors
2. Clear browser cache and reload
3. Verify metadata was saved correctly
4. Check server logs for errors

### Files in Wrong Categories
1. Use the Edit function in Table View
2. Manually change the category
3. Save changes

### Migration Script Errors
1. Verify GCS credentials are correct
2. Check that metadata file exists
3. Ensure proper permissions on GCS bucket
4. Review error messages in console

## Rollback Plan

If you need to rollback:

1. **Backup First**: The script doesn't create backups automatically
2. **Manual Restore**: You'll need to manually restore from a GCS backup
3. **Revert Code**: Restore FileList.jsx to previous version

**To create a backup before migration:**

```bash
# Download current metadata
gsutil cp gs://YOUR_BUCKET/metadata/filemeta.json ./filemeta-backup.json
```

## Example Migration Output

```
============================================================
CATEGORY MIGRATION SCRIPT
============================================================

Step 1: Loading metadata...
Found 45 files to process.

Step 2: Migrating files...

  ✅ website-mockup.psd
     WebDevAssets → WebDev Assets (Direct)
  
  ✅ market-analysis-2024.pdf
     MarketResearch → Financial Research (Direct)
  
  ✅ react-dashboard-template.zip
     TechResearch → WebDev Assets (Keyword)
  
  ✅ company-logo-final.ai
     BusinessStrategyPlans → Graphic Design (Keyword)

Step 3: Saving updated metadata...

============================================================
MIGRATION COMPLETE
============================================================

Statistics:
  Total Files: 45
  Migrated: 42
  Unchanged: 3

Mapping Methods:
  Direct Mapping: 28
  Keyword Mapping: 10
  Random Assignment: 4

By Department:
  SoftDev: 18
  BusDev: 24
  Other: 3

By New Category:
  WebDev Assets: 8
  General Research: 6
  Project Demo: 3
  Source Code: 1
  Websites: 5
  Software: 4
  Dashboards: 3
  Financial Research: 7
  Company Research: 9
  Graphic Design: 2
  Storage: 2

✅ Migration completed successfully!
```

## Support

If you encounter issues:
1. Check the migration script output for errors
2. Review the console logs
3. Verify GCS bucket access
4. Check that all dependencies are installed

---

**Ready to migrate? Run the script now!**

```bash
cd d:\ClearBoard\server
node migrate-categories.js
```
