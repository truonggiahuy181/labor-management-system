export const FILE_UPLOAD_FOLDERS = ['avatars', 'logos', 'documents'] as const;

export type FileUploadFolder = (typeof FILE_UPLOAD_FOLDERS)[number];

export const IMAGE_UPLOAD_FOLDERS: readonly FileUploadFolder[] = [
  'avatars',
  'logos',
];

export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_UPLOAD_FILE_SIZE = MAX_DOCUMENT_FILE_SIZE;

export const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
] as const;

export const DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
] as const;

export const STORAGE_OBJECT_KEY_PATTERN =
  /^(avatars|logos|documents)\/([1-9]\d*)\/(\d{4})\/(0[1-9]|1[0-2])\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx)$/;
