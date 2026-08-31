import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  BarChart3,
  HardDrive,
  Shield,
  Sliders,
  Check,
  Download,
  Trash2,
  Maximize2,
  Minimize2,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Calendar,
  Camera,
  Image as ImageIcon,
  QrCode,
  Printer,
  Clock,
  Layers,
  Heart,
  Palette,
  HelpCircle,
  FileArchive,
  Database,
  Smartphone,
  Flame,
  CheckCircle2,
  Smile,
  Cake,
  Building2,
  Zap,
  Film,
  Upload,
  Home,
  LayoutGrid,
  ArrowLeft,
  ChevronRight,
  Wifi,
  Loader2,
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import {
  EventConfig,
  CapturedPhoto,
  AnalyticsStats,
  KioskSecurityConfig,
  EventTheme,
  SlotPreviewMode,
} from '../types';
import { FILTER_PRESETS } from '../constants/filters';
import type { PairingStatus } from '../hooks/usePhoneCameraPairing';
import { isCloudStorageConfigured, listCloudObjects, deleteCloudObject, type CloudObjectInfo } from '../utils/cloudStorage';

const PRESET_EVENT_IMAGES = [
  {
    label: 'Ảnh Cưới Cặp Đôi',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80',
    icon: '💍',
  },
  {
    label: 'Nhẫn Cưới Kim Cương',
    url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=400&auto=format&fit=crop&q=80',
    icon: '💎',
  },
  {
    label: 'Bong Bóng Sinh Nhật',
    url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&auto=format&fit=crop&q=80',
    icon: '🎈',
  },
  {
    label: 'Logo Sự Kiện / Công Ty',
    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&auto=format&fit=crop&q=80',
    icon: '🏢',
  },
];

export type AdminTab = 'idle_screen' | 'capture_settings' | 'analytics' | 'storage' | 'security' | 'booth_config';

const THEME_STYLES: Record<
  EventTheme,
  {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  korean: {
    name: 'Hàn Quốc Tối Giản',
    icon: Smile,
  },
  wedding: {
    name: 'Đám Cưới Lãng Mạn',
    icon: Heart,
  },
  birthday: {
    name: 'Sinh Nhật Vui Vẻ',
    icon: Cake,
  },
  corporate: {
    name: 'Doanh Nghiệp Sang Trọng',
    icon: Building2,
  },
  neon: {
    name: 'Party Neon & Y2K',
    icon: Zap,
  },
  vintage: {
    name: 'Phim Cổ Điển Vintage',
    icon: Film,
  },
};

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventConfig: EventConfig;
  onUpdateEventConfig: (newConfig: EventConfig) => void;
  capturedPhotos: CapturedPhoto[];
  onResetPhotos: () => void;
  analyticsStats: AnalyticsStats;
  onResetAnalytics: () => void;
  // Các cài đặt nhanh khác
  soundEnabled: boolean;
  onToggleSound: () => void;
  flashEnabled: boolean;
  onToggleFlash: () => void;
  gridVisible: boolean;
  onToggleGrid: () => void;
  recordVideoEnabled: boolean;
  onToggleRecordVideo: () => void;
  previewMode: SlotPreviewMode;
  onSetPreviewMode: (mode: SlotPreviewMode) => void;
  selectedCameraId?: string | null;
  onSelectCameraId?: (deviceId: string | null) => void;
  // Ghép nối camera điện thoại qua Wifi (PeerJS)
  phonePairingStatus?: PairingStatus;
  phonePairingCode?: string | null;
  phonePairingError?: string | null;
  phonePairingDeviceLabel?: string | null;
  onStartPhonePairing?: () => void;
  onStopPhonePairing?: () => void;
  initialTab?: AdminTab | null;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  eventConfig,
  onUpdateEventConfig,
  capturedPhotos,
  onResetPhotos,
  analyticsStats,
  onResetAnalytics,
  soundEnabled,
  onToggleSound,
  flashEnabled,
  onToggleFlash,
  gridVisible,
  onToggleGrid,
  recordVideoEnabled,
  onToggleRecordVideo,
  previewMode,
  onSetPreviewMode,
  selectedCameraId = null,
  onSelectCameraId,
  phonePairingStatus = 'idle',
  phonePairingCode = null,
  phonePairingError = null,
  phonePairingDeviceLabel = null,
  onStartPhonePairing,
  onStopPhonePairing,
  initialTab = null,
}) => {
  // Trạng thái Xác thực PIN
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [rememberAuth, setRememberAuth] = useState<boolean>(true);

  // File input ref for custom event emblem / logo upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Danh sách camera thật đọc từ trình duyệt (tab Camera & Thiết Bị)
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDevicesError, setCameraDevicesError] = useState<string | null>(null);

  // Mã QR thật (có thể quét được) cho link ghép camera điện thoại — tạo lại mỗi khi có mã mới
  const [pairingQrSvg, setPairingQrSvg] = useState<string | null>(null);
  useEffect(() => {
    if (!phonePairingCode) {
      setPairingQrSvg(null);
      return;
    }
    const pairingUrl = `${window.location.origin}${window.location.pathname}?camera=${phonePairingCode}`;
    let cancelled = false;
    QRCode.toString(pairingUrl, { type: 'svg', margin: 1, color: { dark: '#1A1A1A', light: '#00000000' } })
      .then((svg) => {
        if (!cancelled) setPairingQrSvg(svg);
      })
      .catch(() => {
        if (!cancelled) setPairingQrSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [phonePairingCode]);

  // Tab đang chọn trong Dashboard: null (màn hình 6 Widgets) hoặc 'idle_screen' | 'capture_settings' | 'analytics' | 'storage' | 'security' | 'booth_config'
  const [activeTab, setActiveTab] = useState<AdminTab | null>(initialTab ?? null);

  // Danh sách ảnh/video đã lưu trên đám mây (Cloudflare R2, qua Worker) — dùng để xem & dọn dẹp
  // thủ công trong tab Quản Lý Ảnh & Bộ Nhớ. Chỉ tải khi mở đúng tab này, tránh gọi mạng thừa.
  const [cloudObjects, setCloudObjects] = useState<CloudObjectInfo[]>([]);
  const [cloudObjectsStatus, setCloudObjectsStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [cloudObjectsError, setCloudObjectsError] = useState<string | null>(null);
  const [deletingCloudKey, setDeletingCloudKey] = useState<string | null>(null);

  const refreshCloudObjects = async () => {
    if (!isCloudStorageConfigured(eventConfig.cloudStorage)) return;
    setCloudObjectsStatus('loading');
    setCloudObjectsError(null);
    try {
      const objects = await listCloudObjects(eventConfig.cloudStorage!);
      objects.sort((a, b) => (a.uploaded < b.uploaded ? 1 : -1));
      setCloudObjects(objects);
      setCloudObjectsStatus('done');
    } catch (err) {
      setCloudObjectsStatus('error');
      setCloudObjectsError(err instanceof Error ? err.message : 'Không tải được danh sách ảnh trên đám mây.');
    }
  };

  useEffect(() => {
    if (activeTab === 'storage' && isCloudStorageConfigured(eventConfig.cloudStorage)) {
      refreshCloudObjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, eventConfig.cloudStorage?.workerUrl, eventConfig.cloudStorage?.uploadToken]);

  const handleDeleteCloudObject = async (key: string) => {
    if (!isCloudStorageConfigured(eventConfig.cloudStorage)) return;
    setDeletingCloudKey(key);
    try {
      await deleteCloudObject(eventConfig.cloudStorage!, key);
      setCloudObjects((prev) => prev.filter((o) => o.key !== key));
    } catch (err) {
      setCloudObjectsError(err instanceof Error ? err.message : 'Xóa ảnh thất bại.');
    } finally {
      setDeletingCloudKey(null);
    }
  };

  const formatCloudSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Khi vào tab Camera & Thiết Bị, hỏi trình duyệt danh sách camera thật đang có trên máy
  useEffect(() => {
    if (activeTab !== 'booth_config') return;
    let cancelled = false;

    const loadDevices = async () => {
      try {
        // Cần xin quyền camera trước thì trình duyệt mới trả về đầy đủ tên thiết bị (label)
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStream.getTracks().forEach((track) => track.stop());
        } catch {
          // Nếu người dùng chưa cấp quyền, vẫn thử liệt kê (có thể thiếu tên thiết bị)
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        setCameraDevices(devices.filter((d) => d.kind === 'videoinput'));
        setCameraDevicesError(null);
      } catch (err) {
        if (cancelled) return;
        setCameraDevicesError('Không thể đọc danh sách camera từ trình duyệt.');
      }
    };

    loadDevices();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // Mỗi khi mở modal, nếu không chỉ định initialTab thì mở ngay màn hình 6 Widgets
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab ?? null);
    }
  }, [isOpen, initialTab]);

  // Trạng thái cấu hình tạm thời
  const [tempConfig, setTempConfig] = useState<EventConfig>(eventConfig);

  // Xử lý upload ảnh logo sự kiện
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setTempConfig((prev) => ({
          ...prev,
          eventLogoUrl: result,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Trạng thái đổi mã PIN
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Trạng thái xuất ZIP
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  // Trạng thái xác nhận xóa dữ liệu
  const [showConfirmResetData, setShowConfirmResetData] = useState<boolean>(false);
  const [confirmText, setConfirmText] = useState<string>('');

  // Trạng thái Toàn Màn Hình
  const [isFullScreen, setIsFullScreen] = useState<boolean>(() => {
    return typeof document !== 'undefined' && !!document.fullscreenElement;
  });

  // Đồng bộ cấu hình khi mở modal
  useEffect(() => {
    if (isOpen) {
      setTempConfig(eventConfig);
      setPinError(null);
      setPinChangeMsg(null);
      setShowConfirmResetData(false);
      setConfirmText('');
      setExportSuccess(false);

      // Kiểm tra phiên đăng nhập đã ghi nhớ
      const savedAuthTime = sessionStorage.getItem('photobooth_admin_auth_time');
      if (savedAuthTime) {
        const elapsed = Date.now() - parseInt(savedAuthTime, 10);
        if (elapsed < 30 * 60 * 1000) {
          // Ghi nhớ trong 30 phút
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setPinInput('');
        }
      } else {
        setIsAuthenticated(false);
        setPinInput('');
      }
    }
  }, [isOpen, eventConfig]);

  if (!isOpen) return null;

  const currentAdminPin = eventConfig.security?.adminPin || '1234';

  // Xử lý xác thực PIN
  const handleVerifyPin = (inputVal?: string) => {
    const code = inputVal !== undefined ? inputVal : pinInput;
    if (code === currentAdminPin) {
      setIsAuthenticated(true);
      setPinError(null);
      if (rememberAuth) {
        sessionStorage.setItem('photobooth_admin_auth_time', Date.now().toString());
      }
    } else {
      setPinError('Mã PIN không chính xác. Vui lòng thử lại!');
      setPinInput('');
    }
  };

  // Nhập số trên keypad
  const handleKeypadPress = (digit: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setPinError(null);
      if (nextPin.length === 4) {
        // Tự động kiểm tra khi đủ 4 số
        handleVerifyPin(nextPin);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError(null);
  };


  // Xử lý đổi mã PIN
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinChangeMsg({ type: 'error', text: 'Mã PIN mới phải gồm đúng 4 chữ số!' });
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeMsg({ type: 'error', text: 'Mã PIN xác nhận không khớp!' });
      return;
    }

    const updatedSec: KioskSecurityConfig = {
      adminPin: newPin,
      enableKioskLock: eventConfig.security?.enableKioskLock ?? false,
      enableFullScreenKiosk: eventConfig.security?.enableFullScreenKiosk ?? false,
      hideAdminGearButton: eventConfig.security?.hideAdminGearButton ?? false,
      autoResetAfterShareSeconds: eventConfig.security?.autoResetAfterShareSeconds ?? 45,
    };

    const updatedConfig: EventConfig = {
      ...eventConfig,
      security: updatedSec,
    };

    onUpdateEventConfig(updatedConfig);
    setTempConfig(updatedConfig);
    setPinChangeMsg({ type: 'success', text: `Đổi mã PIN thành công! Mã mới: ${newPin}` });
    setNewPin('');
    setConfirmPin('');
  };

  // Bật/Tắt Toàn Màn Hình (Full-screen)
  const handleToggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullScreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullScreen(false);
        }
      }
    } catch {
      // Fullscreen not supported or blocked by browser policy
    }
  };

  // Tính dung lượng xấp xỉ đang lưu trữ trong LocalStorage
  const calculateStorageSizeMB = () => {
    try {
      let totalBytes = 0;
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          totalBytes += (localStorage[key].length + key.length) * 2;
        }
      }
      return (totalBytes / (1024 * 1024)).toFixed(2);
    } catch {
      return '0.00';
    }
  };

  // Tải trọn bộ ảnh dạng file ZIP
  const handleExportAllZip = async () => {
    if (capturedPhotos.length === 0) {
      alert('Chưa có bức ảnh nào được lưu để xuất file ZIP.');
      return;
    }

    try {
      setIsExportingZip(true);
      setExportProgress('Đang chuẩn bị đóng gói file ZIP...');
      setExportSuccess(false);

      const zip = new JSZip();
      const folderName = `Photobag_${(eventConfig.eventMainSubject || eventConfig.eventName || 'Event')
        .replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
      const eventFolder = zip.folder(folderName) || zip;

      // 1. Thêm từng ảnh chụp vào ZIP
      for (let i = 0; i < capturedPhotos.length; i++) {
        const photo = capturedPhotos[i];
        setExportProgress(`Đang nén ảnh ${i + 1} / ${capturedPhotos.length}...`);

        if (photo.dataUrl.startsWith('data:image/')) {
          const base64Data = photo.dataUrl.split(',')[1];
          const ext = photo.dataUrl.includes('image/png') ? 'png' : 'jpg';
          const filename = `Photo_${i + 1}_${new Date(photo.timestamp).toISOString().slice(11, 19).replace(/:/g, '-')}.${ext}`;
          eventFolder.file(filename, base64Data, { base64: true });
        }
      }

      // 2. Thêm file JSON thống kê & cấu hình sự kiện
      const reportContent = {
        event: {
          name: eventConfig.eventName,
          mainSubject: eventConfig.eventMainSubject,
          date: eventConfig.eventDate,
          theme: eventConfig.theme,
        },
        exportDate: new Date().toISOString(),
        totalPhotos: capturedPhotos.length,
        analytics: analyticsStats,
      };
      eventFolder.file('event_report_summary.json', JSON.stringify(reportContent, null, 2));

      setExportProgress('Đang tạo file nén và tải về...');
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${folderName}.zip`);

      setExportProgress('Đã xuất file ZIP thành công!');
      setExportSuccess(true);
    } catch (err) {
      console.error('Lỗi khi xuất ZIP:', err);
      alert('Không thể tạo file ZIP. Vui lòng thử lại!');
    } finally {
      setIsExportingZip(false);
    }
  };

  // Xác nhận Xóa Dữ Liệu Sự Kiện
  const handleConfirmResetData = () => {
    if (confirmText.toLowerCase().trim() !== 'xoa' && confirmText.toLowerCase().trim() !== 'delete') {
      alert('Vui lòng nhập chính xác chữ "xoa" để xác nhận thao tác!');
      return;
    }
    onResetPhotos();
    onResetAnalytics();
    setShowConfirmResetData(false);
    setConfirmText('');
    alert('Đã xóa toàn bộ ảnh và dữ liệu thống kê của sự kiện vừa rồi thành công!');
  };

  // Lưu cấu hình chung
  const handleSaveAllConfig = () => {
    onUpdateEventConfig(tempConfig);
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none ${
      !isAuthenticated ? 'p-3 sm:p-4' : 'p-0'
    }`}>
      {/* ============================================================== */}
      {/* 1. MÀN HÌNH NHẬP MÃ PIN ADMIN NẾU CHƯA XÁC THỰC                 */}
      {/* ============================================================== */}
      {!isAuthenticated ? (
        <div className="w-full max-w-sm bg-[#F9F7F2] rounded-3xl border border-black/15 shadow-2xl overflow-hidden p-6 sm:p-7 flex flex-col items-center animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="font-artistic-serif text-base sm:text-lg font-black text-[#1A1A1A] tracking-tight uppercase">
            Quản Trị Viên Photobag
          </h2>
          <p className="text-xs text-[#1A1A1A]/70 text-center mt-1 mb-4">
            Vui lòng nhập mã PIN bảo mật để mở bảng điều khiển Kiosk
          </p>

          {/* Ô hiển thị 4 chấm PIN */}
          <div className="flex items-center gap-3.5 mb-4">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pinInput.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-11 h-12 rounded-xl border flex items-center justify-center transition-all ${
                    isFilled
                      ? 'border-amber-500 bg-amber-400/20 text-amber-700 shadow-xs'
                      : 'border-[#1A1A1A]/20 bg-white'
                  }`}
                >
                  {isFilled ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-600 animate-in zoom-in duration-150"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-neutral-300"></span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Thông báo lỗi */}
          {pinError && (
            <div className="w-full py-1.5 px-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-bold text-center mb-3 animate-shake">
              {pinError}
            </div>
          )}

          {/* Bàn phím số Keypad */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[240px] mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="h-12 rounded-xl bg-white hover:bg-amber-100/60 active:scale-90 border border-[#1A1A1A]/15 text-lg font-bold font-mono text-[#1A1A1A] transition-all flex items-center justify-center shadow-xs cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPinInput('')}
              className="h-12 rounded-xl bg-neutral-200/70 hover:bg-neutral-300 text-xs font-bold text-neutral-700 transition-all flex items-center justify-center border border-transparent cursor-pointer"
            >
              Xóa
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="h-12 rounded-xl bg-white hover:bg-amber-100/60 active:scale-90 border border-[#1A1A1A]/15 text-lg font-bold font-mono text-[#1A1A1A] transition-all flex items-center justify-center shadow-xs cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="h-12 rounded-xl bg-neutral-200/70 hover:bg-neutral-300 text-xs font-bold text-neutral-700 transition-all flex items-center justify-center border border-transparent cursor-pointer"
            >
              ⌫
            </button>
          </div>

          <div className="w-full flex items-center justify-between pt-2 border-t border-[#1A1A1A]/10 text-xs text-[#1A1A1A]/70">
            <span className="text-[11px] italic">Mã PIN mặc định: <strong>1234</strong></span>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-neutral-600 hover:text-black cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* 2. TRUNG TÂM QUẢN TRỊ TOÀN DIỆN (UNIFIED ADMIN DASHBOARD)       */
        /* ============================================================== */
        <div className="w-full h-full max-w-full max-h-full bg-[#F9F7F2] overflow-hidden flex flex-col animate-in fade-in duration-150 text-[#1A1A1A]">
          {/* TOP NAVIGATION BAR - TINH GỌN, HIỆN ĐẠI */}
          <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-[#DDD6C8] flex items-center justify-between shrink-0 shadow-xs">
            {/* GÓC TRÁI: TIÊU ĐỀ MỤC */}
            <div className="flex items-center gap-2.5">
              {activeTab === null ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <span className="font-artistic-serif text-sm font-black uppercase tracking-wider text-neutral-900">
                    Cài Đặt Photobooth
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center shadow-2xs">
                    {activeTab === 'idle_screen' && <Clock className="w-4 h-4 text-amber-500" />}
                    {activeTab === 'capture_settings' && <Camera className="w-4 h-4 text-purple-600" />}
                    {activeTab === 'analytics' && <BarChart3 className="w-4 h-4 text-emerald-600" />}
                    {activeTab === 'storage' && <HardDrive className="w-4 h-4 text-amber-600" />}
                    {activeTab === 'security' && <Shield className="w-4 h-4 text-red-600" />}
                    {activeTab === 'booth_config' && <Sliders className="w-4 h-4 text-blue-600" />}
                  </div>
                  <span className="font-artistic-serif text-sm font-black uppercase tracking-wider text-neutral-900">
                    {activeTab === 'idle_screen' && 'Màn Hình Chờ'}
                    {activeTab === 'capture_settings' && 'Thiết Lập Chụp'}
                    {activeTab === 'analytics' && 'Thống Kê & Báo Cáo'}
                    {activeTab === 'storage' && 'Quản Lý Ảnh & Bộ Nhớ'}
                    {activeTab === 'security' && 'Bảo Mật & Mã PIN'}
                    {activeTab === 'booth_config' && 'Camera & Thiết Bị'}
                  </span>
                </div>
              )}
            </div>

            {/* GÓC PHẢI CỐ ĐỊNH: NÚT HOME + NÚT ÁP DỤNG DUY NHẤT (thay cho Khóa Lại + Lưu&Áp Dụng + X trước đây) */}
            <div className="flex items-center gap-2">
              {/* Nút HOME: Cho phép quay lại 6 Widget */}
              {activeTab !== null && (
                <button
                  type="button"
                  onClick={() => setActiveTab(null)}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 border border-blue-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                  title="Quay lại danh mục 6 Widget"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Trang Chủ</span>
                </button>
              )}

              {/* Nút ÁP DỤNG: Lưu toàn bộ thay đổi & đóng bảng quản trị lại (thay cho 3 nút Khóa Lại/Lưu&Áp Dụng/X cũ) */}
              <button
                type="button"
                onClick={handleSaveAllConfig}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                title="Lưu thay đổi và đóng bảng quản trị"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Áp Dụng</span>
              </button>
            </div>
          </div>

          {/* NỘI DUNG CHÍNH */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 flex flex-col">
            {/* ============================================================== */}
            {/* VIEW 1: TRANG CHỦ 6 WIDGET TỔNG QUAN (CÂN ĐỐI, ĐẦY ĐẶN, ZERO-SCROLL) */}
            {/* ============================================================== */}
            {activeTab === null && (
              <div className="max-w-5xl mx-auto w-full my-auto py-2 sm:py-4 animate-in fade-in zoom-in-95 duration-150">
                {/* GRID 6 WIDGETS CÂN ĐỐI, SANG TRỌNG, TOUCH-TARGET LỚN */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  {/* WIDGET 1: MÀN HÌNH CHỜ & SỰ KIỆN */}
                  <div
                    onClick={() => setActiveTab('idle_screen')}
                    className="p-5 sm:p-6 rounded-2xl bg-white border border-[#DDD6C8] hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.98] select-none min-h-[160px] sm:min-h-[180px]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Clock className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div>
                        <h4 className="font-artistic-serif text-base sm:text-lg font-bold text-neutral-900 group-hover:text-blue-600 transition-colors">
                          Màn Hình Chờ
                        </h4>
                        <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                          Tiêu đề, logo & chủ đề sự kiện
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                          {THEME_STYLES[tempConfig.theme]?.name || tempConfig.theme}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 text-xs font-mono">
                          {tempConfig.idleTimeoutSeconds || 60}s
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* WIDGET 2: THIẾT LẬP CHỤP */}
                  <div
                    onClick={() => setActiveTab('capture_settings')}
                    className="p-5 sm:p-6 rounded-2xl bg-white border border-[#DDD6C8] hover:border-purple-500 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.98] select-none min-h-[160px] sm:min-h-[180px]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white transition-all">
                        <Camera className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div>
                        <h4 className="font-artistic-serif text-base sm:text-lg font-bold text-neutral-900 group-hover:text-purple-600 transition-colors">
                          Thiết Lập Chụp
                        </h4>
                        <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                          Đếm ngược, chụp tự do & âm thanh
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          tempConfig.enableFreeCaptureMode ? 'bg-purple-100 text-purple-800' : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {tempConfig.enableFreeCaptureMode ? 'Chụp Tự Do' : 'Quy Trình Chuẩn'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 text-xs font-mono">
                          Đếm {tempConfig.countdownSeconds || 3}s
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* WIDGET 3: THỐNG KÊ & BÁO CÁO */}
                  <div
                    onClick={() => setActiveTab('analytics')}
                    className="p-5 sm:p-6 rounded-2xl bg-white border border-[#DDD6C8] hover:border-emerald-500 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.98] select-none min-h-[160px] sm:min-h-[180px]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div>
                        <h4 className="font-artistic-serif text-base sm:text-lg font-bold text-neutral-900 group-hover:text-emerald-600 transition-colors">
                          Thống Kê
                        </h4>
                        <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                          Lượt khách & tần suất in ảnh
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold">
                          {analyticsStats.totalSessions} lượt chụp
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 text-xs font-mono">
                          {analyticsStats.totalPhotosTaken} ảnh
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* WIDGET 4: QUẢN LÝ ẢNH & BỘ NHỚ */}
                  <div
                    onClick={() => setActiveTab('storage')}
                    className="p-5 sm:p-6 rounded-2xl bg-white border border-[#DDD6C8] hover:border-amber-500 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.98] select-none min-h-[160px] sm:min-h-[180px]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all">
                        <HardDrive className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div>
                        <h4 className="font-artistic-serif text-base sm:text-lg font-bold text-neutral-900 group-hover:text-amber-600 transition-colors">
                          Quản Lý Ảnh
                        </h4>
                        <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                          Xem bộ sưu tập & xuất file ZIP
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-semibold">
                          {capturedPhotos.length} ảnh đã lưu
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 text-xs font-mono">
                          Xuất ZIP
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* WIDGET 5: BẢO MẬT & KHÓA KIOSK */}
                  <div
                    onClick={() => setActiveTab('security')}
                    className="p-5 sm:p-6 rounded-2xl bg-white border border-[#DDD6C8] hover:border-red-500 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.98] select-none min-h-[160px] sm:min-h-[180px]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-red-600 group-hover:text-white transition-all">
                        <Shield className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div>
                        <h4 className="font-artistic-serif text-base sm:text-lg font-bold text-neutral-900 group-hover:text-red-600 transition-colors">
                          Bảo Mật & PIN
                        </h4>
                        <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                          Khóa Kiosk & đổi mã PIN mở máy
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Đang Bật PIN</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 text-xs">
                          Khóa Kiosk
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* WIDGET 6: CAMERA & THIẾT BỊ */}
                  <div
                    onClick={() => setActiveTab('booth_config')}
                    className="p-5 sm:p-6 rounded-2xl bg-white border border-[#DDD6C8] hover:border-indigo-500 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.98] select-none min-h-[160px] sm:min-h-[180px]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Sliders className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div>
                        <h4 className="font-artistic-serif text-base sm:text-lg font-bold text-neutral-900 group-hover:text-indigo-600 transition-colors">
                          Camera & Thiết Bị
                        </h4>
                        <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                          Độ phân giải & cấu hình máy in
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-semibold">
                          Full HD 1080p
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 text-xs">
                          Máy In
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* ============================================================== */}
            {/* TAB 1: CÀI ĐẶT MÀN HÌNH CHỜ & SỰ KIỆN                          */}
            {/* ============================================================== */}
            {activeTab === 'idle_screen' && (
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in fade-in duration-200">
                {/* CỘT TRÁI: TIÊU ĐỀ SỰ KIỆN & HÌNH ẢNH LOGO */}
                <div className="space-y-5">
                  {/* 1. Chế Độ Chiếu Tiêu Đề Sự Kiện */}
                  <div className="p-5 bg-white rounded-2xl border border-[#DDD6C8] shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                          <span>Chế Độ Chiếu Tiêu Đề Sự Kiện</span>
                        </h4>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={tempConfig.enableEventTitleMode ?? true}
                          onChange={(e) =>
                            setTempConfig({ ...tempConfig, enableEventTitleMode: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* Interval selection if enabled */}
                    {(tempConfig.enableEventTitleMode ?? true) && (
                      <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-neutral-600">Thời gian chiếu Tiêu đề:</span>
                        <div className="flex gap-1.5">
                          {[
                            { label: '30s', val: 30 },
                            { label: '60s', val: 60 },
                            { label: '90s', val: 90 },
                            { label: '120s', val: 120 },
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() =>
                                setTempConfig({ ...tempConfig, titleAlternateIntervalSeconds: opt.val })
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                (tempConfig.titleAlternateIntervalSeconds || 60) === opt.val
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Các trường thông tin chi tiết sự kiện - Chỉ hiển thị khi BẬT Chế Độ Chiếu Tiêu Đề Sự Kiện */}
                  {(tempConfig.enableEventTitleMode ?? true) ? (
                    <>
                      {/* 2. CHỖ CHỌN HÌNH (LOGO CTY / SỰ KIỆN / ẢNH CẶP ĐÔI / NHÂN VẬT) */}
                      <div className="p-5 bg-white rounded-2xl border border-[#DDD6C8] shadow-xs space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-rose-600" />
                            <span>Ảnh Nhân Vật / Logo Sự Kiện</span>
                          </h4>
                          {tempConfig.eventLogoUrl && (
                            <button
                              type="button"
                              onClick={() => setTempConfig({ ...tempConfig, eventLogoUrl: '' })}
                              className="text-[11px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Xóa ảnh</span>
                            </button>
                          )}
                        </div>

                        {/* Current Image Preview & Upload Buttons */}
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 aspect-square bg-white border border-neutral-300 p-0.5 overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-xs rounded-xl">
                            {tempConfig.eventLogoUrl ? (
                              <img
                                src={tempConfig.eventLogoUrl}
                                alt="Event Logo"
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <ImageIcon className="w-7 h-7 text-neutral-400" />
                            )}
                          </div>

                          <div className="flex-1">
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Tải Ảnh Lên Từ Máy</span>
                            </button>
                          </div>
                        </div>

                        {/* Bật / Tắt Khung Viền Bao Ngoài */}
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                          <span className="text-xs font-semibold text-neutral-700">
                            Khung Viền Bao Ngoài
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tempConfig.showLogoBorder ?? true}
                              onChange={(e) =>
                                setTempConfig({
                                  ...tempConfig,
                                  showLogoBorder: e.target.checked,
                                })
                              }
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        {/* Quick Presets for 1-Click Selection */}
                        <div className="pt-2 border-t border-neutral-100">
                          <span className="block text-[11px] font-semibold text-neutral-600 mb-2">
                            Hoặc chọn nhanh biểu tượng mẫu:
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {PRESET_EVENT_IMAGES.map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setTempConfig({ ...tempConfig, eventLogoUrl: preset.url })}
                                className={`px-2.5 py-2 rounded-xl text-[11px] font-medium border flex items-center gap-2 transition-all text-left cursor-pointer ${
                                  tempConfig.eventLogoUrl === preset.url
                                    ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-blue-50'
                                }`}
                              >
                                <span className="text-base">{preset.icon}</span>
                                <span className="truncate font-semibold">{preset.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 3. BỐ CỤC TIÊU ĐỀ */}
                      <div className="space-y-3 p-5 bg-white rounded-2xl border border-[#DDD6C8] shadow-xs animate-in fade-in duration-200">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                          Bố Cục Chữ Tiêu Đề
                        </h4>

                        {/* Kích Thước Chữ Tiêu Đề */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                            Kích Thước Tiêu Đề
                          </label>
                          <div className="grid grid-cols-4 gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
                            {[
                              { key: 'sm', label: 'Nhỏ (S)' },
                              { key: 'md', label: 'Vừa (M)' },
                              { key: 'lg', label: 'Lớn (L)' },
                              { key: 'xl', label: 'Cực Đại (XL)' },
                            ].map((sizeOpt) => (
                              <button
                                key={sizeOpt.key}
                                type="button"
                                onClick={() => setTempConfig({ ...tempConfig, titleSize: sizeOpt.key as any })}
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                                  (tempConfig.titleSize || 'md') === sizeOpt.key
                                    ? 'bg-blue-600 text-white shadow-xs scale-[1.02]'
                                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                                }`}
                              >
                                {sizeOpt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dòng Tiêu Đề Ngày Tổ Chức */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                            Tiêu Đề Ngày Tổ Chức (Tagline)
                          </label>
                          <input
                            type="text"
                            value={tempConfig.eventTagline ?? 'Save the Date • 29/08/2026'}
                            onChange={(e) => setTempConfig({ ...tempConfig, eventTagline: e.target.value })}
                            placeholder="VD: Save the Date • 29/08/2026 hoặc Our Special Day"
                            className="w-full px-3.5 py-2.5 bg-white border border-[#DDD6C8] rounded-xl text-sm italic font-medium text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>

                        {/* Loại sự kiện */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                            Loại Sự Kiện
                          </label>
                          <input
                            type="text"
                            value={tempConfig.eventCategory ?? 'HAPPY WEDDING'}
                            onChange={(e) => {
                              const newCategory = e.target.value;
                              const mainSub = tempConfig.eventMainSubject ?? 'MINH & TRANG';
                              setTempConfig({
                                ...tempConfig,
                                eventCategory: newCategory,
                                eventName: `${newCategory}\n${mainSub}`,
                              });
                            }}
                            placeholder="VD: HAPPY WEDDING, HAPPY BIRTHDAY, YEAR END PARTY"
                            className="w-full px-3.5 py-2.5 bg-white border border-[#DDD6C8] rounded-xl text-sm font-medium text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>

                        {/* Tên đối tượng chính */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                            Tên Đối Tượng Chính
                          </label>
                          <input
                            type="text"
                            value={tempConfig.eventMainSubject ?? 'MINH & TRANG'}
                            onChange={(e) => {
                              const newMainSub = e.target.value;
                              const cat = tempConfig.eventCategory ?? 'HAPPY WEDDING';
                              setTempConfig({
                                ...tempConfig,
                                eventMainSubject: newMainSub,
                                eventName: `${cat}\n${newMainSub}`,
                              });
                            }}
                            placeholder="VD: MINH & TRANG, HOÀNG & LINH, CÔNG TY XYZ"
                            className="w-full px-3.5 py-2.5 bg-white border border-[#DDD6C8] rounded-xl text-sm font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>

                        {/* Phụ đề / Khẩu hiệu */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                            Phụ Đề / Khẩu Hiệu Sự Kiện
                          </label>
                          <input
                            type="text"
                            value={tempConfig.eventSubtitle}
                            onChange={(e) => setTempConfig({ ...tempConfig, eventSubtitle: e.target.value })}
                            placeholder="VD: Bắt trọn khoảnh khắc • Lưu giữ kỷ niệm"
                            className="w-full px-3.5 py-2.5 bg-white border border-[#DDD6C8] rounded-xl text-sm font-medium text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>

                {/* CỘT PHẢI: CHỦ ĐỀ, THỜI GIAN CHỜ & CÀI ĐẶT TRÌNH CHIẾU */}
                <div className="space-y-5">
                  {/* 4. Event Theme Picker */}
                  <div className="p-5 bg-white rounded-2xl border border-[#DDD6C8] shadow-xs">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-3">
                      Chủ Đề & Phong Cách Màu Sắc
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {(Object.keys(THEME_STYLES) as EventTheme[]).map((themeKey) => {
                        const style = THEME_STYLES[themeKey];
                        const isSelected = tempConfig.theme === themeKey;
                        const Icon = style.icon;

                        return (
                          <button
                            key={themeKey}
                            type="button"
                            onClick={() => setTempConfig({ ...tempConfig, theme: themeKey })}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]'
                                : 'bg-white text-neutral-700 border-[#DDD6C8] hover:bg-neutral-50'
                            }`}
                          >
                            <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-amber-200' : 'text-neutral-600'}`} />
                            <span className="text-xs font-bold">{style.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. Idle Timeout Setting */}
                  <div className="p-5 bg-white rounded-2xl border border-[#DDD6C8] shadow-xs">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                      Thời Gian Tự Động Quay Về Màn Hình Chờ
                    </label>
                    <p className="text-[11px] text-neutral-500 mb-3">
                      Tự động reset về màn hình chờ nếu khách không tương tác sau khoảng thời gian.
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: '30s', val: 30 },
                        { label: '60s', val: 60 },
                        { label: '90s', val: 90 },
                        { label: 'Tắt', val: 0 },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setTempConfig({ ...tempConfig, idleTimeoutSeconds: opt.val })}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            tempConfig.idleTimeoutSeconds === opt.val
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-neutral-700 border-[#DDD6C8] hover:bg-neutral-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 6. Toggle Live Photos Social Proof */}
                  <div className="p-5 bg-white rounded-2xl border border-[#DDD6C8] shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                          Trình Chiếu Ảnh Vừa Chụp
                        </h4>
                        <p className="text-[11px] text-neutral-500">
                          Hiển thị các ảnh kỷ niệm gần nhất ở góc màn hình chờ.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={tempConfig.showRecentPhotos}
                        onChange={(e) => setTempConfig({ ...tempConfig, showRecentPhotos: e.target.checked })}
                        className="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Privacy Consent Setting */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                          Chỉ Chiếu Ảnh Có Sự Đồng Ý
                        </h4>
                        <p className="text-[11px] text-neutral-500">
                          Chỉ hiển thị ảnh nếu khách tích chọn "Đồng ý hiển thị" khi xuất ảnh.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={tempConfig.requireConsentForFeed}
                        onChange={(e) => setTempConfig({ ...tempConfig, requireConsentForFeed: e.target.checked })}
                        className="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: THIẾT LẬP CHỤP & QUY TRÌNH (CAPTURE SETTINGS)           */}
            {/* ============================================================== */}
            {activeTab === 'capture_settings' && (
              <div className="max-w-3xl mx-auto animate-in fade-in duration-200">
                {/* Card: Chế Độ Chụp Tự Do (Free Capture Mode) — cài đặt duy nhất còn ở tab này,
                    các mục còn lại (đếm ngược, xem trước khung hình, âm thanh/flash/lưới/video)
                    đã có sẵn và hoạt động thật trong popup "Tùy Chỉnh" trên màn hình chụp. */}
                <div className={`p-6 rounded-3xl border transition-all shadow-sm ${
                  tempConfig.enableFreeCaptureMode
                    ? 'bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white border-blue-300'
                    : 'bg-white border-[#DDD6C8]'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          tempConfig.enableFreeCaptureMode ? 'bg-blue-600 text-white' : 'bg-neutral-200 text-neutral-700'
                        }`}>
                          <Camera className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-wider text-neutral-900">
                          Chế Độ Chụp Tự Do
                        </h4>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={tempConfig.enableFreeCaptureMode ?? false}
                        onChange={(e) =>
                          setTempConfig({
                            ...tempConfig,
                            enableFreeCaptureMode: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: THỐNG KÊ & BÁO CÁO (ANALYTICS)                           */}
            {/* ============================================================== */}
            {activeTab === 'analytics' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* 4 Cards Thống Kê Chính */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-white rounded-2xl border border-black/10 shadow-xs flex flex-col">
                    <span className="text-[10.5px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-600" /> Tổng Lượt Chụp
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-[#1A1A1A] mt-1">
                      {analyticsStats.totalSessions}
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">Lượt khách trải nghiệm</span>
                  </div>

                  <div className="p-3.5 bg-white rounded-2xl border border-black/10 shadow-xs flex flex-col">
                    <span className="text-[10.5px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600" /> Tổng Số Ảnh Đơn
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-[#1A1A1A] mt-1">
                      {analyticsStats.totalPhotosCaptured}
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">{capturedPhotos.length} ảnh trong kho máy</span>
                  </div>

                  <div className="p-3.5 bg-white rounded-2xl border border-black/10 shadow-xs flex flex-col">
                    <span className="text-[10.5px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-purple-600" /> Quét Mã QR Chia Sẻ
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-[#1A1A1A] mt-1">
                      {analyticsStats.totalQrShares}
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">Lượt quét nhận ảnh</span>
                  </div>

                  <div className="p-3.5 bg-white rounded-2xl border border-black/10 shadow-xs flex flex-col">
                    <span className="text-[10.5px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5 text-amber-600" /> Dải Ảnh Đã Xuất/In
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-[#1A1A1A] mt-1">
                      {analyticsStats.totalStripsExported}
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">Dải ảnh photostrip</span>
                  </div>
                </div>

                {/* Bố cục & Bộ lọc ưa chuộng */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-2xl border border-black/10 shadow-xs flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-black/10 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-600" /> Bố Cục Được Chọn Nhiều Nhất
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {Object.keys(analyticsStats.popularLayouts).length > 0 ? (
                        Object.entries(analyticsStats.popularLayouts)
                          .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
                          .slice(0, 4)
                          .map(([layoutName, count], idx) => (
                            <div key={layoutName} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                                  #{idx + 1}
                                </span>
                                <span className="font-medium text-neutral-800">{layoutName}</span>
                              </div>
                              <span className="font-mono font-bold text-neutral-600">{count} lượt</span>
                            </div>
                          ))
                      ) : (
                        <p className="text-xs text-neutral-400 italic py-2">Chưa có dữ liệu thống kê bố cục.</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-black/10 shadow-xs flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-black/10 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                        <Palette className="w-4 h-4 text-purple-600" /> Bộ Lọc Màu Được Thích Nhất
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {Object.keys(analyticsStats.popularFilters).length > 0 ? (
                        Object.entries(analyticsStats.popularFilters)
                          .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
                          .slice(0, 4)
                          .map(([filterId, count], idx) => {
                            const filterPreset = FILTER_PRESETS.find((p) => p.id === filterId);
                            return (
                              <div key={filterId} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center">
                                    #{idx + 1}
                                  </span>
                                  <span className="font-medium text-neutral-800">
                                    {filterPreset?.name || filterId}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-neutral-600">{count} lượt</span>
                              </div>
                            );
                          })
                      ) : (
                        <p className="text-xs text-neutral-400 italic py-2">Chưa có dữ liệu thống kê bộ lọc.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hoạt động gần đây */}
                <div className="p-4 bg-white rounded-2xl border border-black/10 shadow-xs flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-black/10 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" /> Nhật Ký Phiên Chụp Sự Kiện
                    </h4>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      Cập nhật theo thời gian thực
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {analyticsStats.sessionHistory.length > 0 ? (
                      analyticsStats.sessionHistory.slice(0, 8).map((session, idx) => (
                        <div
                          key={session.id || idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-neutral-500">
                              {new Date(session.timestamp).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                            <span className="font-bold text-[#1A1A1A]">
                              Phiên #{analyticsStats.sessionHistory.length - idx}
                            </span>
                            <span className="text-neutral-500 text-[11px]">
                              ({session.photoCount} ảnh)
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-[10px] font-medium text-neutral-700">
                            {session.layout || 'Bố cục chuẩn'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-neutral-400 italic py-2">Chưa có phiên chụp nào diễn ra.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: QUẢN LÝ DỮ LIỆU & BỘ NHỚ (STORAGE & EXPORT)              */}
            {/* ============================================================== */}
            {activeTab === 'storage' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Thanh Giám Sát Bộ Nhớ Máy */}
                <div className="p-4 bg-white rounded-2xl border border-black/10 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-black/10 pb-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                        Bộ Nhớ Thiết Bị Đang Sử Dụng
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-700">
                      {calculateStorageSizeMB()} MB / ~10 MB (Quota Cục Bộ)
                    </span>
                  </div>

                  <div className="w-full bg-neutral-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(8, (parseFloat(calculateStorageSizeMB()) / 8) * 100))}%`,
                      }}
                    ></div>
                  </div>

                  <p className="text-[11px] text-neutral-500">
                    💡 Khuyến nghị: Sau khi kết thúc sự kiện, hãy bấm nút <strong>"Tải Trọn Bộ File ZIP"</strong> để gửi file cho khách, sau đó bấm <strong>"Xóa Dữ Liệu Sự Kiện"</strong> để giải phóng bộ nhớ cho sự kiện tiếp theo.
                  </p>
                </div>

                {/* Khối Lưu Trữ Ảnh Trên Đám Mây (Cloudflare R2) — nguồn cho mã QR thật ở màn Chia Sẻ */}
                <div className="p-4 bg-white rounded-2xl border border-purple-200 shadow-xs flex flex-col gap-3.5 bg-purple-50/20">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-purple-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950">
                        Lưu Trữ Ảnh Trên Đám Mây
                      </h4>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isCloudStorageConfigured(tempConfig.cloudStorage)
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {isCloudStorageConfigured(tempConfig.cloudStorage) ? 'Đã Cấu Hình' : 'Chưa Cấu Hình'}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600">
                    Nơi lưu ảnh thật để mã QR ở màn Chia Sẻ trỏ tới đúng link tải của khách. Xem hướng
                    dẫn tạo miễn phí trong thư mục <code className="bg-neutral-100 px-1 rounded">cloudflare-worker</code> đi
                    kèm dự án. Mỗi máy có thể dùng 1 tài khoản riêng — đổi lại bất cứ lúc nào (ví dụ
                    khi tài khoản cũ đầy dung lượng).
                  </p>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                        Địa Chỉ Worker
                      </label>
                      <input
                        type="text"
                        value={tempConfig.cloudStorage?.workerUrl || ''}
                        onChange={(e) =>
                          setTempConfig({
                            ...tempConfig,
                            cloudStorage: { ...(tempConfig.cloudStorage || {}), workerUrl: e.target.value },
                          })
                        }
                        placeholder="https://photobag-upload-worker.ten-tai-khoan.workers.dev"
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono text-neutral-800 focus:outline-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                        Mã Token
                      </label>
                      <input
                        type="text"
                        value={tempConfig.cloudStorage?.uploadToken || ''}
                        onChange={(e) =>
                          setTempConfig({
                            ...tempConfig,
                            cloudStorage: { ...(tempConfig.cloudStorage || {}), uploadToken: e.target.value },
                          })
                        }
                        placeholder="Mã bí mật đã đặt bằng lệnh wrangler secret put UPLOAD_TOKEN"
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono text-neutral-800 focus:outline-purple-400"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-neutral-400">
                    Nhớ bấm nút <strong>"Áp Dụng"</strong> ở góc trên để lưu lại 2 ô trên.
                  </p>

                  {/* Danh sách ảnh đã lưu trên đám mây (dùng cấu hình ĐÃ ÁP DỤNG, không phải ô đang gõ) */}
                  {isCloudStorageConfigured(eventConfig.cloudStorage) && (
                    <div className="pt-2 border-t border-purple-200/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                          Ảnh Đã Lưu ({cloudObjects.length})
                        </span>
                        <button
                          type="button"
                          onClick={refreshCloudObjects}
                          disabled={cloudObjectsStatus === 'loading'}
                          className="text-[10px] font-bold text-purple-700 flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${cloudObjectsStatus === 'loading' ? 'animate-spin' : ''}`} />
                          Làm Mới
                        </button>
                      </div>

                      {cloudObjectsError && <p className="text-[11px] text-rose-600">{cloudObjectsError}</p>}

                      {cloudObjectsStatus === 'done' && cloudObjects.length === 0 && (
                        <p className="text-[11px] text-neutral-500">Chưa có ảnh nào được lưu.</p>
                      )}

                      {cloudObjects.length > 0 && (
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {cloudObjects.map((obj) => (
                            <div
                              key={obj.key}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                            >
                              <a
                                href={obj.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-neutral-700 font-mono truncate hover:underline flex-1"
                              >
                                {obj.key}
                              </a>
                              <span className="text-[10px] text-neutral-400 shrink-0">{formatCloudSize(obj.size)}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteCloudObject(obj.key)}
                                disabled={deletingCloudKey === obj.key}
                                className="shrink-0 text-rose-500 hover:text-rose-700 disabled:opacity-50 cursor-pointer"
                                title="Xóa ảnh này"
                              >
                                {deletingCloudKey === obj.key ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Khối Xuất Trọn Bộ File ZIP */}
                <div className="p-4 bg-white rounded-2xl border border-blue-200 shadow-xs flex flex-col gap-3.5 bg-blue-50/20">
                  <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                    <div className="flex items-center gap-2">
                      <FileArchive className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                        Đóng Gói & Xuất Toàn Bộ Ảnh Sự Kiện (File ZIP)
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-blue-700 font-mono">
                      {capturedPhotos.length} Bức Ảnh
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600">
                    Hệ thống sẽ nén tất cả các bức ảnh gốc chất lượng cao + file báo cáo thống kê JSON thành 1 file ZIP duy nhất để lưu trữ hoặc gửi qua Google Drive/Zalo cho khách hàng.
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isExportingZip || capturedPhotos.length === 0}
                      onClick={handleExportAllZip}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      {isExportingZip ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>{isExportingZip ? 'Đang Đóng Gói ZIP...' : 'Tải Về Trọn Bộ File ZIP'}</span>
                    </button>

                    {exportProgress && (
                      <span className="text-xs text-blue-800 font-medium italic">
                        {exportProgress}
                      </span>
                    )}
                  </div>

                  {exportSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Đã tải file ZIP về thư mục Downloads của máy tính thành công!</span>
                    </div>
                  )}
                </div>

                {/* Khối Xóa Dữ Liệu Sự Kiện (Reset) */}
                <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-xs flex flex-col gap-3 bg-rose-50/20">
                  <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-950">
                        Xóa Dữ Liệu Sự Kiện (Dọn Sạch Máy Cho Tiệc Mới)
                      </h4>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-600">
                    Thao tác này sẽ xóa tất cả ảnh chụp trong bộ nhớ tạm và đặt lại các chỉ số thống kê về 0. Hãy chắc chắn bạn đã tải file ZIP trước khi xóa.
                  </p>

                  {!showConfirmResetData ? (
                    <button
                      type="button"
                      onClick={() => setShowConfirmResetData(true)}
                      className="self-start px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa Sạch Dữ Liệu Máy</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-rose-100/70 border border-rose-300 rounded-xl flex flex-col gap-2 animate-in fade-in">
                      <div className="flex items-center gap-1.5 text-rose-800 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Cảnh Báo: Thao tác này không thể hoàn tác!</span>
                      </div>
                      <p className="text-xs text-rose-900">
                        Để xác nhận, vui lòng nhập chữ <strong>xoa</strong> vào ô bên dưới:
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          placeholder='Nhập "xoa"'
                          className="px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-bold text-black w-32 focus:outline-rose-500"
                        />
                        <button
                          type="button"
                          onClick={handleConfirmResetData}
                          className="px-3 py-1.5 bg-rose-700 text-white rounded-lg text-xs font-bold hover:bg-rose-800 cursor-pointer"
                        >
                          Xác Nhận Xóa
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowConfirmResetData(false);
                            setConfirmText('');
                          }}
                          className="px-3 py-1.5 bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold hover:bg-neutral-300 cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: KHÓA KIOSK & BẢO MẬT PIN (KIOSK LOCK & SECURITY)         */}
            {/* ============================================================== */}
            {activeTab === 'security' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Đổi Mã PIN Admin */}
                <form onSubmit={handleChangePin} className="p-4 bg-white rounded-2xl border border-black/10 shadow-xs flex flex-col gap-3.5">
                  <div className="flex items-center justify-between border-b border-black/10 pb-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                        Đổi Mã PIN Quản Trị Viên (4 Chữ Số)
                      </h4>
                    </div>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      Mã hiện tại: <strong>••••</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                        Mã PIN Mới (4 số):
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="VD: 5678"
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-mono font-bold tracking-widest text-center focus:bg-white focus:outline-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                        Xác Nhận Lại Mã PIN Mới:
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Nhập lại 4 số"
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-mono font-bold tracking-widest text-center focus:bg-white focus:outline-emerald-500"
                      />
                    </div>
                  </div>

                  {pinChangeMsg && (
                    <div
                      className={`p-2 rounded-xl text-xs font-bold ${
                        pinChangeMsg.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {pinChangeMsg.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="self-end px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                  >
                    Lưu Mã PIN Mới
                  </button>
                </form>

                {/* Các Tùy Chọn Khóa Kiosk */}
                <div className="p-4 bg-white rounded-2xl border border-black/10 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-black/10 pb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                        Thiết Lập Chế Độ Khóa Kiosk
                      </h4>
                    </div>
                  </div>

                  {/* 1. Khóa chuột phải & phím tắt */}
                  <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
                    <div>
                      <h5 className="text-xs font-bold text-neutral-800">
                        Khóa Chuột Phải & Phím Tắt Trình Duyệt
                      </h5>
                      <p className="text-[11px] text-neutral-500">
                        Ngăn khách bấm chuột phải hoặc bấm phím F12, Ctrl+U để soi mã nguồn.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={tempConfig.security?.enableKioskLock ?? true}
                        onChange={(e) =>
                          setTempConfig({
                            ...tempConfig,
                            security: {
                              ...(tempConfig.security || {
                                adminPin: currentAdminPin,
                                enableFullScreenKiosk: false,
                                hideAdminGearButton: false,
                                autoResetAfterShareSeconds: 45,
                              }),
                              enableKioskLock: e.target.checked,
                            },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* 2. Ẩn nút cài đặt trên màn hình (Mở bằng chạm 3 lần Logo) */}
                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <h5 className="text-xs font-bold text-neutral-800">
                        Ẩn Biểu Tượng Cài Đặt (Mở Bằng Chạm 3 Lần Vào Logo)
                      </h5>
                      <p className="text-[11px] text-neutral-500">
                        Ẩn nút bánh răng trên màn hình chờ để giao diện sạch sẽ, chỉ kỹ thuật viên chạm 3 lần logo mới mở bảng PIN.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={tempConfig.security?.hideAdminGearButton ?? false}
                        onChange={(e) =>
                          setTempConfig({
                            ...tempConfig,
                            security: {
                              ...(tempConfig.security || {
                                adminPin: currentAdminPin,
                                enableKioskLock: true,
                                enableFullScreenKiosk: false,
                                autoResetAfterShareSeconds: 45,
                              }),
                              hideAdminGearButton: e.target.checked,
                            },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 6: CẤU HÌNH CAMERA & PHẦN CỨNG (CAMERA & HARDWARE)         */}
            {/* ============================================================== */}
            {activeTab === 'booth_config' && (
              <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
                {/* 1. Danh Sách Camera Thật (đọc trực tiếp từ trình duyệt) */}
                <div className="p-5 bg-white rounded-2xl border border-[#DDD6C8] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Camera className="w-5 h-5 text-purple-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                        Camera Đang Có Trên Máy Này
                      </h4>
                    </div>
                  </div>

                  {cameraDevicesError && (
                    <p className="text-[11px] text-red-600">{cameraDevicesError}</p>
                  )}

                  {!cameraDevicesError && cameraDevices.length === 0 && (
                    <p className="text-[11px] text-neutral-500">
                      Đang tìm camera... Nếu không thấy gì, hãy cấp quyền camera cho trình duyệt rồi mở lại tab này.
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {/* Tuỳ chọn "Tự động" — dùng cameraFacing mặc định thay vì chỉ định 1 thiết bị cụ thể */}
                    <button
                      type="button"
                      onClick={() => onSelectCameraId && onSelectCameraId(null)}
                      title="Tự Động (Mặc Định) — để hệ thống tự chọn camera trước/sau của máy."
                      className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-left transition-all ${
                        !selectedCameraId
                          ? 'bg-purple-50 border-purple-300'
                          : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      <span className="text-[11px] font-bold text-neutral-800 truncate">Tự Động (Mặc Định)</span>
                      {!selectedCameraId && (
                        <span className="px-1.5 py-0.5 bg-purple-600 text-white text-[9px] font-bold rounded-full shrink-0">
                          ĐANG DÙNG
                        </span>
                      )}
                    </button>

                    {cameraDevices.map((device, index) => {
                      const isSelected = selectedCameraId === device.deviceId;
                      const label = device.label || `Camera ${index + 1}`;
                      return (
                        <button
                          key={device.deviceId || index}
                          type="button"
                          onClick={() => onSelectCameraId && onSelectCameraId(device.deviceId)}
                          title={label}
                          className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'bg-purple-50 border-purple-300'
                              : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          <span className="text-[11px] font-bold text-neutral-800 truncate">{label}</span>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 bg-purple-600 text-white text-[9px] font-bold rounded-full shrink-0">
                              ĐANG DÙNG
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-neutral-400">
                    Mẹo: nếu máy đang chạy PhotoBag là máy tính (Windows/Mac), có thể dùng app webcam ảo (DroidCam, Iriun Webcam, EpocCam...) rồi chọn tên thiết bị đó ở trên. Nếu máy đang chạy PhotoBag là máy tính bảng, dùng mục "Ghép Camera Điện Thoại Qua Wifi" bên dưới.
                  </p>
                </div>

                {/* 1.5. Ghép Camera Điện Thoại Qua Wifi (không cần cài phần mềm trên máy chính) */}
                <div className="p-5 bg-white rounded-2xl border border-[#DDD6C8] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-5 h-5 text-purple-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                        Ghép Camera Điện Thoại Qua Wifi
                      </h4>
                    </div>
                    {phonePairingStatus === 'connected' && (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{phonePairingDeviceLabel ? `Đã Kết Nối: ${phonePairingDeviceLabel}` : 'Đã Kết Nối'}</span>
                      </span>
                    )}
                  </div>

                  {(phonePairingStatus === 'idle' || phonePairingStatus === 'error') && (
                    <div className="space-y-3">
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        Dùng một điện thoại khác làm camera rời, gửi hình sang máy này qua Wifi — không cần cài phần mềm gì trên máy này.
                      </p>
                      {phonePairingError && (
                        <p className="text-[11px] text-red-600">{phonePairingError}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => onStartPhonePairing && onStartPhonePairing()}
                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                      >
                        Tạo Mã Ghép Nối
                      </button>
                    </div>
                  )}

                  {phonePairingStatus === 'starting' && (
                    <div className="flex items-center gap-2 text-xs text-neutral-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tạo mã ghép nối...
                    </div>
                  )}

                  {(phonePairingStatus === 'waiting' || phonePairingStatus === 'connected') && phonePairingCode && (
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      {pairingQrSvg && (
                        <div
                          className="w-32 h-32 shrink-0 bg-white rounded-xl border border-neutral-200 p-2"
                          dangerouslySetInnerHTML={{ __html: pairingQrSvg }}
                        />
                      )}
                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <p className="text-[11px] text-neutral-500">
                          Trên điện thoại: quét mã QR này, hoặc mở trình duyệt và nhập mã số bên dưới.
                        </p>
                        <div className="text-3xl font-mono font-black tracking-[0.2em] text-neutral-900">
                          {phonePairingCode}
                        </div>
                        <p className="text-[11px] font-bold">
                          {phonePairingStatus === 'connected' ? (
                            <span className="text-emerald-600">
                              {phonePairingDeviceLabel ? `"${phonePairingDeviceLabel}" đã kết nối` : 'Điện thoại đã kết nối'} — đang dùng làm camera chính.
                            </span>
                          ) : (
                            <span className="text-neutral-400">Đang chờ điện thoại kết nối...</span>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => onStopPhonePairing && onStopPhonePairing()}
                          className="text-[11px] text-red-600 underline underline-offset-2"
                        >
                          {phonePairingStatus === 'connected' ? 'Xóa Thiết Bị Này / Ngắt Kết Nối' : 'Hủy Ghép Nối'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Máy In */}
                <div className="p-5 bg-white rounded-2xl border border-[#DDD6C8] shadow-xs space-y-2">
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                    <Printer className="w-5 h-5 text-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                      Máy In
                    </h4>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Khi in, chọn máy in mong muốn trong hộp thoại in của trình duyệt.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Đã bỏ footer Lưu & Áp Dụng riêng — thay bằng 1 nút "Áp Dụng" duy nhất
              ở góc trên bên phải (cạnh Trang Chủ), áp dụng cho mọi tab. */}
        </div>
      )}
    </div>
  );
};
