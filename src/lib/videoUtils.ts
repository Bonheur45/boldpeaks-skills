/**
 * Converts various video URLs to embeddable format
 * Supports YouTube, Google Drive, Vimeo, and Loom
 */
export function getEmbedUrl(url: string): string {
  if (!url) return '';
  
  const trimmedUrl = url.trim();
  
  // YouTube - various formats
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID (already embed)
  const youtubeWatchMatch = trimmedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeWatchMatch) {
    return `https://www.youtube.com/embed/${youtubeWatchMatch[1]}`;
  }
  
  // Already a YouTube embed URL
  if (trimmedUrl.includes('youtube.com/embed/')) {
    return trimmedUrl;
  }
  
  // Google Drive - file view to preview/embed
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const driveMatch = trimmedUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  
  // Already a Google Drive preview URL
  if (trimmedUrl.includes('drive.google.com') && trimmedUrl.includes('/preview')) {
    return trimmedUrl;
  }
  
  // Vimeo - various formats
  // https://vimeo.com/VIDEO_ID
  // https://player.vimeo.com/video/VIDEO_ID (already embed)
  const vimeoMatch = trimmedUrl.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch && !trimmedUrl.includes('player.vimeo.com')) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  // Already a Vimeo player URL
  if (trimmedUrl.includes('player.vimeo.com')) {
    return trimmedUrl;
  }
  
  // Loom - convert share to embed
  // https://www.loom.com/share/VIDEO_ID
  // https://www.loom.com/embed/VIDEO_ID (already embed)
  const loomMatch = trimmedUrl.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return `https://www.loom.com/embed/${loomMatch[1]}`;
  }
  
  // Already a Loom embed URL
  if (trimmedUrl.includes('loom.com/embed/')) {
    return trimmedUrl;
  }
  
  // Return as-is for other URLs (assuming they're already embeddable)
  return trimmedUrl;
}
