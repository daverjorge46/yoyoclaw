/**
 * 成果物管理の型定義
 *
 * S3 + DynamoDBでθサイクルの成果物を保存・配信する
 */

/**
 * 成果物の種類
 */
export enum ArtifactType {
  /** ファイル (汎用) */
  FILE = "file",
  /** コードスニペット */
  CODE = "code",
  /** レポート */
  REPORT = "report",
  /** 画像 */
  IMAGE = "image",
  /** ログ */
  LOG = "log",
  /** JSONデータ */
  JSON = "json",
}

/**
 * 成果物メタデータ
 */
export interface ArtifactMetadata {
  /** 成果物ID */
  id: string;
  /** セッションID (θサイクル) */
  sessionId?: string;
  /** ユーザーID */
  userId?: string;
  /** 種類 */
  type: ArtifactType;
  /** ファイル名 */
  filename: string;
  /** MIMEタイプ */
  mimeType: string;
  /** サイズ (bytes) */
  size: number;
  /** S3キー */
  s3Key: string;
  /** S3バケット */
  s3Bucket: string;
  /** 作成時刻 */
  createdAt: number;
  /** 有効期限 (Unix timestamp) */
  expiresAt: number;
  /** タグ */
  tags?: string[];
  /** 説明 */
  description?: string;
}

/**
 * 成果物
 */
export interface Artifact {
  /** メタデータ */
  metadata: ArtifactMetadata;
  /** バイナリデータ (保存時のみ使用) */
  buffer?: Buffer;
  /** テキストデータ (保存時のみ使用) */
  text?: string;
}

/**
 * 保存オプション
 */
export interface SaveArtifactOptions {
  /** TTL (秒), デフォルト: 24時間 */
  ttl?: number;
  /** タグ */
  tags?: string[];
  /** 説明 */
  description?: string;
  /** 公開設定 */
  public?: boolean;
}

/**
 * ダウンロードURLオプション
 */
export interface DownloadUrlOptions {
  /** 有効期限 (秒), デフォルト: 1時間 */
  expires?: number;
}

/**
 * 成果物検索フィルタ
 */
export interface ArtifactFilter {
  /** セッションID */
  sessionId?: string;
  /** ユーザーID */
  userId?: string;
  /** 種類 */
  type?: ArtifactType;
  /** タグ */
  tags?: string[];
}
