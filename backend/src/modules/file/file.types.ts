import type { FileUploadFolder } from './file.constants.js';

export interface MultipartFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface AuthenticatedFileUser {
  id: number;
  roleCode: string;
}

export interface UploadedFileResponse {
  objectKey: string;
  folder: FileUploadFolder;
  originalName: string;
  contentType: string;
  size: number;
  etag: string | null;
  accessUrl: string;
  accessUrlExpiresIn: number | null;
  uploadedAt: Date;
}

export interface FileAccessResponse {
  objectKey: string;
  accessUrl: string;
  accessUrlExpiresIn: number | null;
}
