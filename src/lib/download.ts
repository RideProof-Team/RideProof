// Save some text as a file on the user's device (used for backups).
export function downloadTextFile(fileName: string, contents: string, type = 'application/json') {
  // A "Blob" is a chunk of file data held in memory. We make a temporary
  // link to it, "click" the link to download it, then clean up.
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
