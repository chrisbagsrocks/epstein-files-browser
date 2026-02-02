# Ingestion Guide: Adding New Epstein Files

This guide explains the process of adding new volumes of Epstein files to the browser.

## 1. Download New Data
Visit the [DOJ Epstein Disclosures](https://www.justice.gov/epstein/doj-disclosures) page and download the new "Data Set" zip files (e.g., `DataSet 8.zip`).

## 2. Prepare Local Files
Extract the contents of the zip file into the `files/` directory in the root of the project.
Ensure the structure follows the existing pattern:
`files/VOL00008/IMAGES/0001/EFTA02730265.pdf`

## 3. Run Celebrity Recognition
This script uses AWS Rekognition to detect celebrities in the new PDFs. You will need AWS credentials configured.

```bash
bun run scripts/recognize-celebrities.ts [limit]
```
- `limit`: (Optional) Limit the number of files to process for testing.
- The script will update `celebrity-results.json`. It supports resuming if interrupted.

## 4. Sync Celebrity Data for Web
Transform the raw results into the format used by the web app:

```bash
bun run scripts/generate-celebrity-data.ts
```
- This updates `lib/celebrity-data.ts`.

## 5. Generate Page Images
Pre-render PDF pages as JPEGs for faster viewing in the browser:

```bash
bun run scripts/generate-pdf-images.ts generate
```
- This creates JPEGs in the `pdfs-as-jpegs/` directory and updates `manifest.json`.

## 6. Generate Thumbnails
Create thumbnails for the file browser:

```bash
bun run scripts/generate-thumbnails.ts
```

## 7. Upload to R2 Storage
The site serves PDFs and images from Cloudflare R2. You need `rclone` configured with a remote named `r2`.

```bash
# Upload PDFs
rclone copy files/ r2:epstein-files/ --progress

# Upload Pre-rendered Images
bun run scripts/generate-pdf-images.ts upload

# Upload Thumbnails
rclone copy thumbnails/ r2:epstein-files/thumbnails/ --progress
```

## 8. Deployment
The web app automatically detects new volumes based on the R2 bucket contents. Once the files are uploaded and the worker is listing them, they will appear in the "Collection" filter.

If you made changes to the worker or the web app data (`lib/celebrity-data.ts`), deploy them:

```bash
# Deploy Web App
npm run build && vercel deploy --prod

# Deploy Worker
npm run worker:deploy
```
