// Utility to zip a single file in the browser using JSZip
import JSZip from 'jszip';

export async function zipFile(file) {
  const zip = new JSZip();
  zip.file(file.name, file);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  return new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.zip', { type: 'application/zip' });
}
