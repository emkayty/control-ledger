export function isImageReceipt(contentType: string) {
  return contentType.startsWith("image/");
}

export function canExtractOpayReceipt(contentType: string) {
  return isImageReceipt(contentType);
}
