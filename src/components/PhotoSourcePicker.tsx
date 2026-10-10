import { Camera, Check, ImagePlus, LoaderCircle, RotateCcw, ScanLine, X } from 'lucide-react';
import { useRef, useState } from 'react';

type PhotoStatus = 'idle' | 'reading' | 'compressing' | 'ready' | 'submitting' | 'success' | 'error';
export type PhotoSelection = { dataUrl: string; fileName: string; source: 'camera' | 'gallery' };

type PhotoSourcePickerProps = {
  onReady: (selection: PhotoSelection) => void;
  preview?: string;
  status?: PhotoStatus;
  statusText?: string;
  error?: string;
  disabled?: boolean;
  onClear?: () => void;
  className?: string;
};

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_EDGE = 1600;

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败，请重试。'));
    reader.readAsDataURL(file);
  });
}

function compressDataUrl(dataUrl: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        resolve(dataUrl);
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => reject(new Error('图片无法读取，请换一张图片。'));
    image.src = dataUrl;
  });
}

export function PhotoSourcePicker({ onReady, preview, status = 'idle', statusText, error, disabled = false, onClear, className = '' }: PhotoSourcePickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [internalStatus, setInternalStatus] = useState<PhotoStatus>('idle');
  const [internalError, setInternalError] = useState('');
  const currentStatus = status === 'idle' ? internalStatus : status;
  const currentError = error ?? internalError;

  const selectFile = async (file: File | undefined, source: PhotoSelection['source']) => {
    if (!file) return;
    setInternalError('');
    if (!file.type.startsWith('image/')) {
      setInternalStatus('error');
      setInternalError('请选择图片文件。');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setInternalStatus('error');
      setInternalError('图片超过 12MB，请先压缩后再上传。');
      return;
    }
    try {
      setInternalStatus('reading');
      const original = await readAsDataUrl(file);
      setInternalStatus('compressing');
      const dataUrl = await compressDataUrl(original);
      setInternalStatus('ready');
      onReady({ dataUrl, fileName: file.name || 'photo.jpg', source });
    } catch (reason) {
      setInternalStatus('error');
      setInternalError(reason instanceof Error ? reason.message : '图片处理失败，请重试。');
    }
  };

  const label = currentStatus === 'reading' ? '读取图片…' : currentStatus === 'compressing' ? '压缩图片…' : currentStatus === 'submitting' ? '提交中…' : currentStatus === 'success' ? '识别完成' : currentStatus === 'ready' ? '已读取，可提交' : currentStatus === 'error' ? '重新选择' : '选择图片';
  const Icon = currentStatus === 'reading' || currentStatus === 'compressing' || currentStatus === 'submitting' ? LoaderCircle : currentStatus === 'success' ? Check : currentStatus === 'error' ? RotateCcw : ScanLine;

  return <div className={`photo-picker ${className}`}>
    {preview ? <div className="photo-preview-wrap">
      <img className="photo-preview" src={preview} alt="待识别的图片预览" />
      <button className="photo-clear" type="button" aria-label="移除图片" onClick={() => { setInternalStatus('idle'); setInternalError(''); onClear?.(); }} disabled={disabled}><X size={16} /></button>
    </div> : null}
    <div className="photo-picker-actions">
      <button className="secondary-btn photo-source-btn" type="button" onClick={() => cameraRef.current?.click()} disabled={disabled || ['reading', 'compressing', 'submitting'].includes(currentStatus)} aria-label="拍照" title="拍照"><Camera size={22} /></button>
      <button className="secondary-btn photo-source-btn" type="button" onClick={() => galleryRef.current?.click()} disabled={disabled || ['reading', 'compressing', 'submitting'].includes(currentStatus)} aria-label="打开相册" title="相册"><ImagePlus size={22} /></button>
    </div>
    <input ref={cameraRef} className="visually-hidden" aria-hidden="true" tabIndex={-1} type="file" accept="image/*" capture="environment" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void selectFile(file, 'camera'); }} />
    <input ref={galleryRef} className="visually-hidden" aria-hidden="true" tabIndex={-1} type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void selectFile(file, 'gallery'); }} />
    <p className={`photo-picker-status ${currentStatus === 'error' ? 'is-error' : ''}`} role="status" aria-live="polite"><Icon size={15} className={currentStatus === 'reading' || currentStatus === 'compressing' || currentStatus === 'submitting' ? 'spin' : ''} />{currentError || statusText || label}</p>
  </div>;
}
