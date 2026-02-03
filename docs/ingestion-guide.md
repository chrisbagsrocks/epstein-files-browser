# Ingestion Guide: Adding New Epstein Files

This guide explains the process of adding new volumes of Epstein files to the browser.

## 1. Download New Data
Visit the [DOJ Epstein Disclosures](https://www.justice.gov/epstein/doj-disclosures) page.

- **Data Set 12**: A smaller batch, approximately **114MB**.
- **Data Sets 8-11**: Large datasets (Data Set 8 is ~10GB). These may not have working zip links. You may need to use a download manager or a script to download individual PDFs from the index pages (e.g., [Data Set 9 Files](https://www.justice.gov/epstein/doj-disclosures/data-set-9-files)).

> [!WARNING]
> **Do NOT add these files to GitHub.** Even at 114MB, standard GitHub repositories are for code, not binary data like PDFs. Adding them will bloat your repository history and potentially exceed GitHub's usage limits for free accounts. Always use **Cloudflare R2** for the storage and serving of these documents.

## 2. Prepare Local Files
Extract the contents of the Data Set zip files into the `files/` directory. You must use the **exact** folder names below to ensure the app detects them correctly.

### Mapping Table:
| DOJ Data Set | Folder Name (under `files/`) | Display Name in App |
|--------------|------------------------------|---------------------|
| Data Set 1   | `VOL00001`                   | Volume 1            |
| Data Set 2   | `VOL00002`                   | Volume 2            |
| Data Set 3   | `VOL00003`                   | Volume 3            |
| Data Set 4   | `VOL00004`                   | Volume 4            |
| Data Set 5   | `VOL00005`                   | Volume 5            |
| Data Set 6   | `VOL00006`                   | Volume 6            |
| Data Set 7   | `VOL00007`                   | Volume 7            |
| Data Set 8   | `VOL00008`                   | Volume 8            |
| Data Set 9   | `VOL00009`                   | Volume 9            |
| Data Set 10  | `VOL00010`                   | Volume 10           |
| Data Set 11  | `VOL00011`                   | Volume 11           |
| Data Set 12  | `VOL00012`                   | Volume 12           |

Ensure the structure follows the existing pattern:
`files/VOL00008/IMAGES/0001/EFTA02730265.pdf`

> [!NOTE]
> The app expects the `VOL` prefix followed by a number. Using at least 5 digits (e.g., `00001`) is recommended to maintain alphabetical sorting.

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

## 7. Setup Cloudflare R2 (For Forkers)
Since you forked this project, you need your own storage bucket. Cloudflare R2 is chosen because it has **zero egress fees**, which is critical for a high-traffic site with large files.

### R2 Pricing Breakdown:
- **Storage**: The first **10GB** is free. After that, it's roughly **$0.015 per GB per month**. 
    - *Example*: If you store 15GB, you'll pay about $0.07/month for the extra 5GB.
- **Egress (Bandwidth)**: **$0.00 (Always Free)**. This is the biggest benefit. Even if 1 million people download your files, Cloudflare won't charge you for the data transfer.
- **Operations**:
    - **Class A (Uploads)**: 1 million free per month.
    - **Class B (Views/Downloads)**: 10 million free per month.
    - *Note*: Every time a user views a PDF page or a thumbnail, it counts as 1 operation. 10 million is a very high limit for a hobby project.

### Setup Steps:
1. Create a Cloudflare account.
2. Go to **R2 Storage** and create a bucket named `epstein-files`.
3. Update `wrangler.json` with your bucket name if you chose a different one.
4. Configure `rclone` to point to your R2 bucket.

## 8. Upload to R2 Storage
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

## 9. Strategies for Staying Free (Zero Cost)
If you want to keep your project 100% free even with 200GB+ datasets, consider these strategies:

### A. Only Host "Celebrity" Files
Instead of uploading every single PDF to R2, only upload the ones where the recognition script (`recognize-celebrities.ts`) actually found something. 
- You still process everything locally.
- You only run the `rclone copy` command for files with matches.
- For files not in R2, the app can show a "View on DOJ Website" button instead.

### B. PDF Compression
DOJ PDFs are often poorly optimized. You can use tools like `ghostscript` or `qpdf` to shrink them significantly (sometimes up to 90% reduction) before uploading.
- This helps you fit much more data into the **10GB free tier**.

### C. Host Selective Volumes
Prioritize Data Set 12 (114MB) and other smaller ones first. You can choose to skip the 200GB Data Set 9 entirely if the cost ($3/month) is a concern.

### E. Use Justice.gov for Free PDF Hosting (Recommended)
I have updated the Cloudflare Worker to support **Direct DOJ Redirects**. 

This means you can browse the files using the app's fast interface (pre-rendered images and thumbnails) but when you click **"Download PDF"**, the app will redirect the user directly to the DOJ's official site.

**Benefits:**
- **Zero Storage Cost** for PDFs: You don't need to host the heavy 200GB+ of original PDFs in R2.
- **Fast Experience**: Users still get the page-by-page viewing experience (hosted in R2, which is small).

**How to use it:**
1. Download the Data Sets locally.
2. Run the processing scripts (`recognize-celebrities.ts`, `generate-pdf-images.ts`).
3. **Upload the JPEGs** (`pdfs-as-jpegs/`) to R2.
4. **DO NOT upload the PDFs** (`files/`) to R2.
5. The app will automatically see the files from your `manifest.json` and link them to `justice.gov`.
