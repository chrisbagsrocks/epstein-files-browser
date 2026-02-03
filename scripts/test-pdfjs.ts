import * as pdfjs from 'pdfjs-dist';
import * as fs from 'fs';

async function main() {
    const pdfPath = process.argv[2];
    if (!pdfPath) {
        console.error('Usage: tsx scripts/test-pdfjs.ts <pdf-path>');
        process.exit(1);
    }

    try {
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;
        console.log(`Pages: ${pdf.numPages}`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
