import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppScreen, CapturedPhoto, SlotPreviewMode, CaptureTriggerMode, StripLayout, FrameColor, FrameStyle, CaptureMode, CameraCalibrationConfig } from '../types';
import { SAMPLE_STUDIO_VIEWFINDER, SAMPLE_PHOTO_FRIENDS, SAMPLE_PHOTO_SOLO, SAMPLE_PHOTO_DUO, FILTER_PRESETS, LAYOUT_OPTIONS } from '../constants/filters';
import { playShutterSound, playBeepSound, playSuccessChime } from '../utils/audio';
import { captureCalibratedFrame, buildCalibrationCssFilter } from '../utils/canvas';
import { tryEnableContinuousAutofocus } from '../utils/camera';
import { Language, TranslationKey } from '../i18n/translations';
import { X, RotateCcw, Camera } from 'lucide-react';

interface CameraScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onPhotoCaptured: (photo: CapturedPhoto, isPartOfBurst?: boolean) => void;
  onSessionComplete: (capturedPhotos: CapturedPhoto[], videoUrl?: string | null) => void;
  soundEnabled: boolean;
  recordVideoEnabled?: boolean;
  isLiveStream: boolean;
  onToggleLiveStream: () => void;
  defaultMode?: 'single' | 'strip-3' | 'strip-4';
  sessionMode?: 'single' | 'strip-3' | 'strip-4';
  selectedLayout?: StripLayout;
  onSelectLayout?: (layout: StripLayout) => void;
  onSetSessionMode?: (mode: 'single' | 'strip-3' | 'strip-4') => void;
  selectedFrameColor?: FrameColor;
  onSelectFrameColor?: (color: FrameColor) => void;
  selectedFrameStyle?: FrameStyle;
  onSelectFrameStyle?: (style: FrameStyle) => void;
  flashEnabled?: boolean;
  onToggleFlash?: () => void;
  gridVisible?: boolean;
  onToggleGrid?: () => void;
  timerSeconds?: 0 | 3 | 5 | 10;
  onSetTimerSeconds?: (seconds: 0 | 3 | 5 | 10) => void;
  cameraFacing?: 'user' | 'environment';
  onFlipCamera?: () => void;
  selectedCameraId?: string | null;
  externalStream?: MediaStream | null;
  previewMode?: SlotPreviewMode;
  onSetPreviewMode?: (mode: SlotPreviewMode) => void;
  captureTriggerMode?: CaptureTriggerMode;
  onSetCaptureTriggerMode?: (mode: CaptureTriggerMode) => void;
  onRegisterShutterTrigger?: (triggerFn: () => void) => void;
  onUpdateShutterLabel?: (label: string) => void;
  currentFilterId: string;
  currentFilterIntensity: number;
  onSelectFilter: (filterId: string, defaultIntensity?: number) => void;
  onChangeIntensity: (intensity: number) => void;
  brightness?: number;
  onChangeBrightness?: (brightness: number) => void;
  isFreeCapture?: boolean;
  captureMode?: CaptureMode;
  onRegisterQuickPrintTrigger?: (triggerFn: () => void) => void;
  onUpdateBurstPhotoCount?: (count: number) => void;
  // Lớp "Cân Chỉnh Camera Gốc" Admin cấu hình (sáng/tương phản/bão hòa/tông ấm-lạnh/mịn da/nét) —
  // áp dụng ngầm lên MỌI ảnh chụp ra, trước cả phong cách lọc màu khách tự chọn (currentFilterId).
  cameraCalibration?: CameraCalibrationConfig;
  language: Language;
  t: (key: TranslationKey) => string;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  onNavigate,
  onPhotoCaptured,
  onSessionComplete,
  soundEnabled,
  recordVideoEnabled = true,
  isLiveStream,
  onToggleLiveStream,
  defaultMode = 'strip-3',
  sessionMode: propSessionMode,
  selectedLayout = 'strip-3',
  onSelectLayout,
  onSetSessionMode,
  selectedFrameColor = 'white',
  onSelectFrameColor,
  selectedFrameStyle = 'classic',
  onSelectFrameStyle,
  flashEnabled: propFlashEnabled,
  onToggleFlash,
  gridVisible: propGridVisible,
  onToggleGrid,
  timerSeconds: propTimerSeconds,
  onSetTimerSeconds,
  cameraFacing: propCameraFacing,
  onFlipCamera: propOnFlipCamera,
  selectedCameraId,
  externalStream,
  previewMode: propPreviewMode,
  onSetPreviewMode,
  captureTriggerMode: propCaptureTriggerMode,
  onSetCaptureTriggerMode,
  onRegisterShutterTrigger,
  onUpdateShutterLabel,
  currentFilterId,
  currentFilterIntensity,
  onSelectFilter,
  onChangeIntensity,
  brightness: propBrightness,
  onChangeBrightness,
  isFreeCapture = false,
  captureMode = 'photobooth',
  onRegisterQuickPrintTrigger,
  onUpdateBurstPhotoCount,
  cameraCalibration,
  language,
  t,
}) => {
  const [internalFlash, setInternalFlash] = useState(true);
  const flashEnabled = propFlashEnabled !== undefined ? propFlashEnabled : internalFlash;
  const setFlashEnabled = onToggleFlash ? onToggleFlash : () => setInternalFlash((prev) => !prev);

  const [internalTimer, setInternalTimer] = useState<0 | 3 | 5 | 10>(3);
  const timerSeconds = propTimerSeconds !== undefined ? propTimerSeconds : internalTimer;
  const setTimerSeconds = onSetTimerSeconds ? onSetTimerSeconds : setInternalTimer;

  const [internalGrid, setInternalGrid] = useState(false);
  const gridVisible = propGridVisible !== undefined ? propGridVisible : internalGrid;
  const setGridVisible = onToggleGrid ? onToggleGrid : () => setInternalGrid((prev) => !prev);

  const [internalFacing, setInternalFacing] = useState<'user' | 'environment'>('user');
  const cameraFacing = propCameraFacing !== undefined ? propCameraFacing : internalFacing;
  const handleFlipCamera = propOnFlipCamera ? propOnFlipCamera : () => setInternalFacing((prev) => (prev === 'user' ? 'environment' : 'user'));

  const [internalMode, setInternalMode] = useState<'single' | 'strip-3' | 'strip-4'>(defaultMode);
  const sessionMode = propSessionMode !== undefined ? propSessionMode : internalMode;
  const setSessionMode = onSetSessionMode ? onSetSessionMode : setInternalMode;

  const [internalPreviewMode, setInternalPreviewMode] = useState<SlotPreviewMode>('bottom-slots');
  const previewMode = propPreviewMode !== undefined ? propPreviewMode : internalPreviewMode;
  const setPreviewMode = onSetPreviewMode ? onSetPreviewMode : setInternalPreviewMode;

  const [internalCaptureTriggerMode, setInternalCaptureTriggerMode] = useState<CaptureTriggerMode>('auto');
  const captureTriggerMode = propCaptureTriggerMode !== undefined ? propCaptureTriggerMode : internalCaptureTriggerMode;
  const setCaptureTriggerMode = onSetCaptureTriggerMode ? onSetCaptureTriggerMode : setInternalCaptureTriggerMode;

  // Độ sáng camera: mặc định 100%, có thể truyền từ App (điều khiển qua bảng "Tùy Chỉnh" ở logo) —
  // giữ 1 state nội bộ dự phòng nếu chưa nối prop từ bên ngoài.
  const [internalBrightness, setInternalBrightness] = useState<number>(100);
  const brightness = propBrightness !== undefined ? propBrightness : internalBrightness;

  // Trạng thái buổi chụp
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [currentBurstIndex, setCurrentBurstIndex] = useState(0);
  const [totalBurstCount, setTotalBurstCount] = useState(3);
  const [isBurstActive, setIsBurstActive] = useState(false);
  const [burstPhotos, setBurstPhotos] = useState<CapturedPhoto[]>([]);
  const [showManualTip, setShowManualTip] = useState(false);

  // Video Recording (BTS Video) state & refs
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Video & Canvas elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const manualTipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Thông tin bộ lọc phim đang áp dụng cho ống kính
  const activePreset = FILTER_PRESETS.find((p) => p.id === currentFilterId) || FILTER_PRESETS[0];

  // Chỉ dừng (stop) stream nếu nó do CHÍNH màn hình này mở — không đụng vào stream camera điện
  // thoại đã ghép nối qua Wifi, vì stream đó do usePhoneCameraPairing ở App.tsx quản lý riêng.
  const stopOwnedStream = useCallback(() => {
    if (streamRef.current && streamRef.current !== externalStream) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
  }, [externalStream]);

  // Khởi động webcam
  const startCamera = useCallback(async () => {
    // Ưu tiên tuyệt đối: nếu đã ghép nối camera điện thoại qua Wifi thì dùng luôn nguồn đó,
    // không mở camera của chính máy này nữa.
    if (externalStream) {
      stopOwnedStream();
      streamRef.current = externalStream;
      if (videoRef.current) {
        videoRef.current.srcObject = externalStream;
        videoRef.current.play().catch(() => {});
      }
      setCameraError(null);
      return;
    }

    if (!isLiveStream) {
      stopOwnedStream();
      return;
    }

    try {
      stopOwnedStream();

      // Nếu Admin đã chọn một camera cụ thể (qua Cài Đặt > Camera & Thiết Bị) thì ưu tiên
      // dùng đúng thiết bị đó (deviceId); nếu không, dùng facingMode như mặc định cũ.
      const videoConstraints: MediaTrackConstraints = selectedCameraId
        ? {
            deviceId: { exact: selectedCameraId },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          }
        : {
            facingMode: cameraFacing,
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      // Cố gắng bật lấy nét liên tục để bám nét khách nhanh hơn khi vừa vào khung hình — best-effort,
      // không hỗ trợ thì bỏ qua, không ảnh hưởng gì tới việc mở camera (xem utils/camera.ts).
      tryEnableContinuousAutofocus(stream);

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraError(null);
    } catch (err) {
      console.warn('Không thể truy cập camera, chuyển sang chế độ ống kính mẫu Studio', err);
      setCameraError('Chưa cấp quyền camera. Đang dùng ảnh mẫu.');
    }
  }, [isLiveStream, cameraFacing, selectedCameraId, externalStream, stopOwnedStream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopOwnedStream();
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (manualTipTimerRef.current) {
        clearTimeout(manualTipTimerRef.current);
      }
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [startCamera]);

  const layoutConfig = selectedLayout ? LAYOUT_OPTIONS.find((l) => l.id === selectedLayout) : null;
  const totalSlots = layoutConfig ? layoutConfig.photoCount : (sessionMode === 'single' ? 1 : sessionMode === 'strip-3' ? 3 : 4);

  // Chỉ riêng Chế Độ Sự Kiện mới còn chụp theo "đủ số ảnh của layout thì tự dừng & bật In Nhanh".
  // Photobooth và Chụp Tự Do đều chụp thoải mái không giới hạn — khách bấm liên tục bao nhiêu tấm
  // cũng được, không tự dừng, không tự chuyển màn hình; muốn in thì tự bấm vào Thư Viện. Vì vậy 2
  // chế độ này dùng chung 1 nhánh xử lý với Chụp Tự Do (vốn đã có sẵn cơ chế "chụp không giới hạn"),
  // và ẩn mọi khung/hiệu ứng hiện "số ảnh cần chụp" trên màn hình chụp.
  const isUnlimitedCapture = captureMode !== 'event';

  // Bắt đầu ghi video quá trình chụp (BTS Video)
  const startBtsRecording = useCallback(() => {
    // Không ghi video khi đang ở chế độ chụp tự do hoặc tính năng bị tắt
    if (isFreeCapture || !recordVideoEnabled) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') return;

    recordedChunksRef.current = [];
    setRecordingSeconds(0);

    let streamToRecord: MediaStream | null = streamRef.current;

    // Trường hợp không có live camera hoặc đang dùng ảnh mẫu: tạo canvas stream nếu có
    if (!streamToRecord && canvasRef.current) {
      try {
        streamToRecord = canvasRef.current.captureStream(30);
      } catch {
        streamToRecord = null;
      }
    }

    if (streamToRecord && typeof MediaRecorder !== 'undefined') {
      try {
        const mimeTypes = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4',
        ];
        const selectedMime = mimeTypes.find((type) => {
          try {
            return MediaRecorder.isTypeSupported(type);
          } catch {
            return false;
          }
        }) || '';

        const options: MediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : {};
        const recorder = new MediaRecorder(streamToRecord, options);

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.start(250);
        mediaRecorderRef.current = recorder;
        setIsRecordingVideo(true);

        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        recordTimerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.warn('Không thể khởi tạo MediaRecorder:', err);
        setIsRecordingVideo(false);
      }
    }
  }, [isFreeCapture, recordVideoEnabled]);

  // Dừng ghi video quá trình chụp và tạo Object URL
  const stopBtsRecording = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      setIsRecordingVideo(false);

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        try {
          if (recordedChunksRef.current.length > 0) {
            const mime = recorder.mimeType || 'video/webm';
            const blob = new Blob(recordedChunksRef.current, { type: mime });
            const url = URL.createObjectURL(blob);
            resolve(url);
          } else {
            resolve(null);
          }
        } catch (e) {
          console.warn('Lỗi khi xuất video BTS blob:', e);
          resolve(null);
        }
      };

      try {
        recorder.stop();
      } catch {
        resolve(null);
      }
    });
  }, []);

  // Cập nhật nhãn Shutter cho BottomNavBar
  useEffect(() => {
    if (!onUpdateShutterLabel) return;

    if (countdown !== null) {
      onUpdateShutterLabel(t('camera_counting'));
    } else if (isUnlimitedCapture) {
      if (burstPhotos.length === 0) {
        onUpdateShutterLabel(t('camera_takePhoto'));
      } else {
        onUpdateShutterLabel(`${t('camera_shootNext')} (${burstPhotos.length})`);
      }
    } else if (captureTriggerMode === 'manual' && isBurstActive && burstPhotos.length > 0 && burstPhotos.length < totalSlots) {
      onUpdateShutterLabel(`${t('camera_shot')} ${burstPhotos.length + 1}/${totalSlots}`);
    } else if (sessionMode === 'single') {
      onUpdateShutterLabel(t('camera_takePhoto'));
    } else if (captureTriggerMode === 'manual') {
      onUpdateShutterLabel(t('camera_shot1'));
    } else {
      onUpdateShutterLabel(t('camera_takePhoto'));
    }
  }, [countdown, captureTriggerMode, isBurstActive, burstPhotos.length, totalSlots, sessionMode, isUnlimitedCapture, onUpdateShutterLabel, t]);

  // Chuyển đổi bộ đếm: 0s -> 3s -> 5s -> 10s
  const handleCycleTimer = () => {
    if (timerSeconds === 0) setTimerSeconds(3);
    else if (timerSeconds === 3) setTimerSeconds(5);
    else if (timerSeconds === 5) setTimerSeconds(10);
    else setTimerSeconds(0);
  };

  // Hàm hoàn tất chế độ chụp tự do và chuyển sang Thư Viện để khách tự chọn ảnh đưa vào hậu kỳ
  // (Chụp Tự Do không thể là chế độ Sự Kiện nên luôn qua Thư Viện, không có đường tắt In Nhanh).
  const handleFinishFreeCapture = useCallback(async () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
    setIsBurstActive(false);

    if (burstPhotos.length === 0) {
      onNavigate('gallery');
      return;
    }

    if (soundEnabled) {
      playSuccessChime();
    }

    const videoUrl = await stopBtsRecording();
    onSessionComplete(burstPhotos, videoUrl);
    onNavigate('gallery');
  }, [burstPhotos, soundEnabled, stopBtsRecording, onSessionComplete, onNavigate]);

  // Hàm "In Nhanh" (chỉ dùng ở Chế Độ Sự Kiện, kích hoạt từ nút góc trên qua logo TopAppBar):
  // Lấy đúng các ảnh đang có ở khung xem trước hiện tại, hoàn tất buổi chụp và vào thẳng hậu kỳ
  // Chia Sẻ, bỏ qua bước chọn ảnh ở Thư Viện — phù hợp khi khách đông, mỗi nhóm chỉ chụp 1 lượt.
  const handleQuickPrint = useCallback(async () => {
    if (burstPhotos.length === 0) return;

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
    setIsBurstActive(false);

    if (soundEnabled) {
      playSuccessChime();
    }

    const videoUrl = await stopBtsRecording();
    onSessionComplete(burstPhotos, videoUrl);
    onNavigate('share');
  }, [burstPhotos, soundEnabled, stopBtsRecording, onSessionComplete, onNavigate]);

  // Hàm hủy buổi chụp
  const handleCancelBurst = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (manualTipTimerRef.current) {
      clearTimeout(manualTipTimerRef.current);
      manualTipTimerRef.current = null;
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    recordedChunksRef.current = [];
    setIsRecordingVideo(false);
    setRecordingSeconds(0);

    setShowManualTip(false);
    setIsBurstActive(false);
    setCountdown(null);
    setBurstPhotos([]);
    setCurrentBurstIndex(0);
  };

  // Hàm chụp lại tấm vừa rồi (Retake)
  const handleRetakeLastPhoto = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (manualTipTimerRef.current) {
      clearTimeout(manualTipTimerRef.current);
      manualTipTimerRef.current = null;
    }
    setShowManualTip(false);
    setCountdown(null);

    if (burstPhotos.length > 0) {
      const updated = burstPhotos.slice(0, -1);
      setBurstPhotos(updated);
      setCurrentBurstIndex(updated.length);
      setIsBurstActive(true);
    }
  };

  // Hàm chụp khung hình hiện tại — "nướng" (bake) thẳng lớp Cân Chỉnh Camera Gốc của Admin (sáng/
  // tương phản/bão hòa/tông ấm-lạnh/mịn da/nét) vào ảnh chụp ra ngay tại đây (xem utils/canvas.ts:
  // captureCalibratedFrame). Phong cách lọc màu khách tự chọn vẫn áp dụng riêng sau, lúc ghép vào
  // tờ in — không đổi so với trước.
  const captureFrame = useCallback((): string => {
    if (isLiveStream && videoRef.current && streamRef.current && videoRef.current.videoWidth > 0) {
      const dataUrl = captureCalibratedFrame(videoRef.current, cameraCalibration, cameraFacing === 'user');
      if (dataUrl) return dataUrl;
    }

    const samplePool = [SAMPLE_PHOTO_FRIENDS, SAMPLE_PHOTO_SOLO, SAMPLE_PHOTO_DUO, SAMPLE_STUDIO_VIEWFINDER];
    const chosen = samplePool[currentBurstIndex % samplePool.length] || SAMPLE_PHOTO_FRIENDS;
    return chosen;
  }, [isLiveStream, cameraFacing, currentBurstIndex, cameraCalibration]);

  // Thực hiện chụp ảnh đơn trong chuỗi
  const takeSnapshot = useCallback(async (burstIdx: number, totalBurst: number, collected: CapturedPhoto[]) => {
    // 1. Hiệu ứng Flash chớp sáng
    if (flashEnabled) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 350);
    }

    // 2. Âm thanh màn trập
    if (soundEnabled) {
      playShutterSound();
    }

    // 3. Lưu dữ liệu ảnh kèm bộ lọc đã chọn
    const dataUrl = captureFrame();
    const newPhoto: CapturedPhoto = {
      id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      dataUrl,
      timestamp: Date.now(),
      filterId: currentFilterId || 'bw',
      filterIntensity: currentFilterIntensity ?? 80,
      label: `Tấm ${burstIdx + 1}`,
    };

    const updated = [...collected, newPhoto];
    setBurstPhotos(updated);
    onPhotoCaptured(newPhoto, isFreeCapture ? false : totalBurst > 1);

    // Xử lý riêng cho chụp không giới hạn (Chụp Tự Do & Photobooth) — không tự dừng, không tự
    // chuyển màn hình dù đã chụp đủ số ảnh của layout, khách muốn chụp thêm bao nhiêu cũng được.
    if (isUnlimitedCapture) {
      setCountdown(null);
      setIsBurstActive(true);
      setCurrentBurstIndex(updated.length);
      return;
    }

    // Nếu còn ảnh cần chụp trong dải (Chế độ thông thường)
    if (burstIdx + 1 < totalBurst) {
      setCurrentBurstIndex(burstIdx + 1);

      if (captureTriggerMode === 'auto') {
        // Chế độ tự động liên tiếp: Chờ 900ms rồi tự đếm ngược tấm tiếp theo
        setTimeout(() => {
          runCountdown(burstIdx + 1, totalBurst, updated);
        }, 900);
      } else {
        // Chế độ từng tấm / Remote: Dừng lại và giữ trạng thái sẵn sàng cho người dùng tạo dáng & đổi màu
        setCountdown(null);
        setIsBurstActive(true);

        // Hiển thị thông báo hướng dẫn chỉ trong 2 giây
        setShowManualTip(true);
        if (manualTipTimerRef.current) {
          clearTimeout(manualTipTimerRef.current);
        }
        manualTipTimerRef.current = setTimeout(() => {
          setShowManualTip(false);
        }, 2000);
      }
    } else {
      // Hoàn tất buổi chụp!
      setIsBurstActive(false);
      setCountdown(null);
      setShowManualTip(false);
      if (manualTipTimerRef.current) {
        clearTimeout(manualTipTimerRef.current);
        manualTipTimerRef.current = null;
      }
      if (soundEnabled) {
        playSuccessChime();
      }

      // Dừng ghi video và nhận URL video hậu trường
      const videoUrl = await stopBtsRecording();

      // Nhánh này giờ chỉ còn Chế Độ Sự Kiện đi tới được (Photobooth & Chụp Tự Do đã rẽ ra ở early
      // return "isUnlimitedCapture" phía trên, không bao giờ "hoàn tất buổi chụp" giữa chừng nữa) —
      // dừng lại đúng ở màn hình chụp cho khách xem lại khung xem trước, chờ bấm "In Nhanh" ở góc
      // trên (qua logo) để xác nhận & qua thẳng Chia Sẻ. KHÔNG tự chuyển sang Thư Viện.
      onSessionComplete(updated, videoUrl);
    }
  }, [flashEnabled, soundEnabled, captureFrame, currentFilterId, currentFilterIntensity, onPhotoCaptured, onSessionComplete, captureTriggerMode, stopBtsRecording, isUnlimitedCapture]);

  // Chạy chuỗi đếm ngược (Nổi sắc nét trên camera, KHÔNG CÓ LỚP PHỦ MỜ KHUNG ẢNH)
  const runCountdown = useCallback((burstIdx: number, totalBurst: number, collected: CapturedPhoto[]) => {
    // Nếu là tấm đầu tiên của phiên chụp, kích hoạt quay video quá trình nếu được bật
    if (burstIdx === 0) {
      startBtsRecording();
    }

    // Ẩn thông báo khi bắt đầu đếm ngược
    setShowManualTip(false);
    if (manualTipTimerRef.current) {
      clearTimeout(manualTipTimerRef.current);
      manualTipTimerRef.current = null;
    }

    const delay = timerSeconds > 0 ? timerSeconds : 1;
    let count = delay;
    setCountdown(count);

    if (soundEnabled) {
      playBeepSound(780, 0.08);
    }

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    countdownTimerRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        // Số cuối cùng (count === 1) tự hiện thành chữ "Chụp!" thay vì số "1" — xem phần render bên
        // dưới (JSX kiểm tra countdown === 1). Ví dụ hẹn giờ 3 giây: 3 → 2 → Chụp! rồi chụp luôn,
        // không còn giai đoạn "Cười Lên Nào!" tách riêng như trước (đã bỏ, chụp ngay sau nhịp này).
        setCountdown(count);
        if (soundEnabled) {
          playBeepSound(780, 0.08);
        }
      } else {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setCountdown(null);
        if (soundEnabled) {
          playBeepSound(1100, 0.12, true);
        }
        takeSnapshot(burstIdx, totalBurst, collected);
      }
    }, 1000);
  }, [timerSeconds, soundEnabled, takeSnapshot]);

  // Kích hoạt chụp ảnh (Hỗ trợ cả Chụp Tự Động, Bấm Từng Tấm / Remote và Chụp Tự Do)
  const handleShutterTrigger = useCallback(() => {
    if (countdown !== null) return; // Đang trong lúc đếm ngược

    // Chụp không giới hạn (Chụp Tự Do & Photobooth): mỗi lần bấm chụp tiếp 1 tấm mới, không có
    // tổng số ảnh cố định, không tự dừng.
    if (isUnlimitedCapture) {
      setIsBurstActive(true);
      const nextIndex = burstPhotos.length;
      setCurrentBurstIndex(nextIndex);
      runCountdown(nextIndex, 999999, burstPhotos);
      return;
    }

    const total = totalSlots;
    setTotalBurstCount(total);

    if (captureTriggerMode === 'auto') {
      // Chế độ Tự Động: Bắt đầu từ đầu
      setCurrentBurstIndex(0);
      setBurstPhotos([]);
      setIsBurstActive(true);
      runCountdown(0, total, []);
    } else {
      // Chế độ Từng Tấm / Remote:
      if (!isBurstActive || burstPhotos.length === 0 || burstPhotos.length >= total) {
        // Bắt đầu phiên mới với Tấm 1
        setCurrentBurstIndex(0);
        setBurstPhotos([]);
        setIsBurstActive(true);
        runCountdown(0, total, []);
      } else {
        // Chụp tiếp tấm tiếp theo trong phiên hiện tại
        const nextIndex = burstPhotos.length;
        setCurrentBurstIndex(nextIndex);
        runCountdown(nextIndex, total, burstPhotos);
      }
    }
  }, [countdown, sessionMode, captureTriggerMode, isBurstActive, burstPhotos, runCountdown, isUnlimitedCapture, totalSlots]);

  const shutterTriggerRef = useRef(handleShutterTrigger);
  shutterTriggerRef.current = handleShutterTrigger;

  // Đăng ký trigger từ bên ngoài (như từ nút chụp nổi ở BottomNavBar)
  useEffect(() => {
    if (onRegisterShutterTrigger) {
      onRegisterShutterTrigger(() => {
        if (shutterTriggerRef.current) {
          shutterTriggerRef.current();
        }
      });
    }
  }, [onRegisterShutterTrigger]);

  const quickPrintTriggerRef = useRef(handleQuickPrint);
  quickPrintTriggerRef.current = handleQuickPrint;

  // Đăng ký trigger "In Nhanh" từ bên ngoài (nút góc trên phải trong TopAppBar, chỉ hiện ở Chế Độ Sự Kiện)
  useEffect(() => {
    if (onRegisterQuickPrintTrigger) {
      onRegisterQuickPrintTrigger(() => {
        if (quickPrintTriggerRef.current) {
          quickPrintTriggerRef.current();
        }
      });
    }
  }, [onRegisterQuickPrintTrigger]);

  // Báo số ảnh đang có ở khung xem trước hiện tại ra ngoài (để TopAppBar biết bật/tắt nút In Nhanh)
  useEffect(() => {
    if (onUpdateBurstPhotoCount) {
      onUpdateBurstPhotoCount(burstPhotos.length);
    }
  }, [burstPhotos.length, onUpdateBurstPhotoCount]);

  // Lắng nghe Phím Bấm (Space, Enter, Volume / Remote Bluetooth Shutter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (
        e.code === 'Space' ||
        e.key === ' ' ||
        e.key === 'Enter' ||
        e.key === 'AudioVolumeUp' ||
        e.key === 'VolumeUp'
      ) {
        e.preventDefault();
        if (shutterTriggerRef.current) {
          shutterTriggerRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full h-full inset-0 bg-[#1A1A1A] select-none overflow-hidden touch-none flex flex-col items-center justify-center">
      {/* Canvas xử lý ẩn */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Khung Hiển Thị Video Camera Toàn Màn Hình Kéo Hết Xuống Đáy */}
      <div className="absolute inset-0 w-full h-full bg-[#1A1A1A] overflow-hidden">
        {/* Nguồn Video Trực Tiếp hoặc Ảnh Mẫu với Bộ Lọc Real-Time & Độ Sáng */}
        {isLiveStream && !cameraError ? (
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            style={{
              filter: `${buildCalibrationCssFilter(cameraCalibration)} ${activePreset.filterCss(currentFilterIntensity)} brightness(${brightness}%)`,
            }}
            className={`w-full h-full object-cover transition-all duration-200 ${
              cameraFacing === 'user' ? '-scale-x-100' : ''
            }`}
          />
        ) : (
          <div
            className="w-full h-full bg-cover bg-center transition-all duration-200"
            style={{
              backgroundImage: `url('${SAMPLE_STUDIO_VIEWFINDER}')`,
              filter: `${buildCalibrationCssFilter(cameraCalibration)} ${activePreset.filterCss(currentFilterIntensity)} brightness(${brightness}%)`,
            }}
          />
        )}

        {/* Lớp phủ sắc màu đặc biệt của bộ lọc (nếu có) */}
        {activePreset.overlayColor && (
          <div
            className="absolute inset-0 pointer-events-none z-5 transition-all duration-200"
            style={{
              backgroundColor: activePreset.overlayColor,
              mixBlendMode: (activePreset.blendMode as any) || 'normal',
            }}
          />
        )}

        {/* Lưới Bố Cục 1/3 */}
        {gridVisible && (
          <div className="absolute inset-0 w-full h-full viewfinder-grid opacity-40 pointer-events-none z-10" />
        )}

        {/* Màn Chớp Sáng Flash */}
        {isFlashing && (
          <div className="absolute inset-0 w-full h-full bg-[#F9F7F2] z-45 flash-active pointer-events-none" />
        )}

        {/* Nút HỦY CHỤP (CANCEL) & CHỤP LẠI (RETAKE) & HUY HIỆU GHI VIDEO BTS CHO CHẾ ĐỘ THÔNG THƯỜNG */}
        {!isFreeCapture && isBurstActive && (
          <div className="absolute top-18 sm:top-20 right-4 z-35 flex items-center gap-2">
            {/* Huy hiệu Ghi Video Quá Trình BTS nhấp nháy */}
            {isRecordingVideo && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/60 backdrop-blur-md text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-in fade-in duration-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold tracking-wider text-red-200">
                  REC {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Nút Chụp Lại (Retake) tấm vừa rồi nếu ở chế độ Từng Tấm */}
            {captureTriggerMode === 'manual' && burstPhotos.length > 0 && countdown === null && (
              <button
                onClick={handleRetakeLastPhoto}
                className="px-2.5 sm:px-3 py-1 bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/30 text-white rounded-full text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg flex items-center gap-1.5 cursor-pointer"
                title={t('camera_retakeTitle')}
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>{t('camera_retake')}</span>
              </button>
            )}

            {/* Nút Hủy Buổi Chụp */}
            <button
              onClick={handleCancelBurst}
              className="px-2.5 sm:px-3 py-1 bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/30 text-white rounded-full text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg flex items-center gap-1 cursor-pointer"
              title={t('camera_cancelSessionTitle')}
            >
              <X className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>{t('camera_cancel')}</span>
            </button>
          </div>
        )}

        {/* Hướng Dẫn & Nút Chụp Tiếp Nổi Bật Khi Ở Chế Độ Từng Tấm (Tự ẩn sau 2 giây) */}
        {showManualTip && captureTriggerMode === 'manual' && isBurstActive && burstPhotos.length > 0 && burstPhotos.length < totalSlots && countdown === null && (
          <div className="absolute top-28 sm:top-30 left-1/2 -translate-x-1/2 z-35 w-[92%] max-w-sm pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="pointer-events-auto bg-black/75 backdrop-blur-xl border border-white/25 rounded-2xl p-2.5 sm:p-3 text-white shadow-[0_12px_35px_rgba(0,0,0,0.6)] flex flex-col items-center gap-2 text-center">
              <div className="flex items-center justify-center text-[#93C5FD]">
                <span className="text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-wider">
                  {t('camera_capturedPrefix')} {burstPhotos.length}/{totalSlots} {t('camera_capturedSuffix')}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/85 leading-snug">
                {t('camera_freeToChange')}
              </p>
              <div className="flex items-center gap-2 w-full pt-0.5">
                <button
                  onClick={handleShutterTrigger}
                  className="flex-1 py-1.5 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{t('camera_shootFrame')} {burstPhotos.length + 1}</span>
                </button>
              </div>
            </div>
          </div>
        )}


        {/* SỐ ĐẾM NGƯỢC NỔI TRỰC TIẾP TRÊN MÀN HÌNH (KHÔNG CÓ LỚP PHỦ MỜ KHUNG ẢNH - CHUẨN PHOTOBOOTH).
            Nhịp cuối cùng (countdown === 1) hiện chữ "Chụp!" thay vì số "1", rồi chụp ngay sau đó —
            không còn giai đoạn "Cười Lên Nào!" tách riêng như trước (đã bỏ theo yêu cầu). */}
        {countdown !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none select-none">
            <div className="flex flex-col items-center animate-in zoom-in-75 duration-200" key={countdown}>
              {countdown === 1 ? (
                <span className="text-[90px] sm:text-[130px] md:text-[160px] leading-none font-serif font-bold italic text-white tracking-wide uppercase drop-shadow-[0_6px_24px_rgba(0,0,0,0.95)]">
                  {t('camera_shootExclaim')}
                </span>
              ) : (
                <span className="text-[120px] sm:text-[150px] md:text-[190px] leading-none font-serif font-light italic text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.95)]">
                  {countdown}
                </span>
              )}
            </div>
          </div>
        )}

        {/* CHẾ ĐỘ 1: DẢI Ô NGANG BÊN DƯỚI (FLOATING PHOTO CARDS - KHÔNG BO GÓC, CHUẨN KIOSK THAM KHẢO) - CHỈ CÒN HIỆN Ở CHẾ ĐỘ SỰ KIỆN (Photobooth & Chụp Tự Do chụp không giới hạn, không hiện số ảnh cần chụp) */}
        {!isUnlimitedCapture && previewMode === 'bottom-slots' && (
          <div className="absolute left-0 right-0 z-25 flex justify-center pointer-events-none transition-all duration-300 bottom-32 sm:bottom-36 md:bottom-40">
            <div className="pointer-events-auto flex items-center justify-center gap-2.5 sm:gap-3.5 md:gap-4 px-2 max-w-full overflow-x-auto py-1">
              {Array.from({ length: totalSlots }).map((_, index) => {
                const photo = burstPhotos[index];
                const isActive = isBurstActive && index === currentBurstIndex;
                const isCompleted = !!photo;

                return (
                  <div
                    key={index}
                    className={`relative w-16 sm:w-20 md:w-24 h-12 sm:h-15 md:h-18 rounded-none overflow-hidden transition-all duration-200 flex items-center justify-center select-none shadow-[0_8px_25px_rgba(0,0,0,0.6)] ${
                      isCompleted
                        ? 'border border-white/90 bg-black/90 scale-100 ring-1 ring-black/40'
                        : isActive
                        ? 'border-2 border-white bg-black/75 shadow-[0_0_20px_rgba(255,255,255,0.35)] scale-105'
                        : 'border border-white/35 bg-[#2B2B2B]/75 backdrop-blur-xs hover:bg-[#353535]/85'
                    }`}
                  >
                    {/* Nếu đã chụp: Hiển thị thumbnail ảnh sắc nét trong khung chữ nhật vuông góc */}
                    {isCompleted ? (
                      <div className="relative w-full h-full">
                        <img
                          src={photo.dataUrl}
                          alt={`Slot ${index + 1}`}
                          className="w-full h-full object-cover animate-in fade-in duration-200"
                        />
                        {/* Vạch chỉ số thứ tự nhỏ góc dưới nếu cần */}
                        <div className="absolute bottom-0.5 right-0.5 px-1 bg-black/80 text-white text-[8px] sm:text-[9px] font-sans font-bold leading-none py-0.5">
                          #{index + 1}
                        </div>
                      </div>
                    ) : (
                      /* Nếu chưa chụp: Hiển thị số thứ tự to rõ nét trên nền kính mờ vuông góc chuẩn Photobooth Kiosk */
                      <div className="flex flex-col items-center justify-center">
                        <span
                          className={`text-xl sm:text-2xl md:text-3xl font-sans font-bold leading-none ${
                            isActive ? 'text-white scale-110 drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)]' : 'text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                          }`}
                        >
                          {index + 1}
                        </span>
                        {isActive && (
                          <span className="text-[7.5px] sm:text-[8.5px] font-mono font-bold text-white/90 uppercase tracking-widest mt-1">
                            READY
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CHẾ ĐỘ 2: KHUNG DẢI GIẤY IN TRỰC TIẾP (LIVE PHOTO STRIP PAPER PREVIEW) - CHỈ CÒN HIỆN Ở CHẾ ĐỘ SỰ KIỆN */}
        {!isUnlimitedCapture && previewMode === 'paper-strip' && (
          <div className="absolute top-28 sm:top-32 right-3 sm:right-5 z-25 pointer-events-auto">
            <div
              className={`w-18 sm:w-22 rounded-xl p-1.5 sm:p-2 shadow-[0_12px_40px_rgba(0,0,0,0.65)] border flex flex-col items-center gap-1 sm:gap-1.5 transition-all duration-300 hover:scale-105 select-none ${
                selectedFrameColor === 'charcoal' || selectedFrameColor === 'black'
                  ? 'bg-[#1A1A1A] text-[#F9F7F2] border-white/20'
                  : selectedFrameColor === 'pastel-pink'
                  ? 'bg-[#F4ECE6] text-[#4A342B] border-[#E2D3CA]'
                  : selectedFrameColor === 'slate'
                  ? 'bg-[#EBE5D8] text-[#3D3425] border-[#C5BAA5]'
                  : selectedFrameColor === 'cream'
                  ? 'bg-[#EFEEE8] text-[#1A1A1A] border-[#D6D3C8]'
                  : 'bg-[#FDFBF7] text-[#1A1A1A] border-white/60'
              }`}
            >
              {/* Header dải in */}
              <div className="flex items-center gap-0.5 leading-none pt-0.5">
                <span className="text-[7.5px] sm:text-[8.5px] font-extrabold opacity-90">Photo</span>
                <span className="text-[7.5px] sm:text-[8.5px] font-extrabold text-[#2563EB]">Bag</span>
              </div>

              {/* Các ô trên tờ giấy in */}
              <div className="w-full flex flex-col gap-1 sm:gap-1.5">
                {Array.from({ length: totalSlots }).map((_, index) => {
                  const photo = burstPhotos[index];
                  const isActive = isBurstActive && index === currentBurstIndex;
                  const isCompleted = !!photo;

                  return (
                    <div
                      key={index}
                      className={`w-full aspect-[4/3] rounded-sm overflow-hidden transition-all duration-300 relative flex items-center justify-center ${
                        isCompleted
                          ? 'bg-black shadow-inner'
                          : isActive
                          ? 'bg-blue-100/70 border-2 border-[#2563EB] animate-pulse'
                          : 'bg-black/10 border border-dashed border-current opacity-60'
                      }`}
                    >
                      {isCompleted ? (
                        <img
                          src={photo.dataUrl}
                          alt={`Paper slot ${index + 1}`}
                          className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-400"
                        />
                      ) : (
                        <span className={`text-[10px] sm:text-xs font-serif font-bold ${isActive ? 'text-[#2563EB]' : 'opacity-60'}`}>
                          {index + 1}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer dải in */}
              <div className="w-full text-center pt-0.5">
                <span className="text-[5.5px] sm:text-[6.5px] font-mono opacity-60 tracking-wider block">
                  {new Date().toISOString().slice(0, 10).replace(/-/g, '.')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tiến Trình Chụp Dải Nhiều Ảnh (Khi tắt khung xem trước) - CHỈ CÒN HIỆN Ở CHẾ ĐỘ SỰ KIỆN */}
        {!isUnlimitedCapture && previewMode === 'none' && totalBurstCount > 1 && isBurstActive && (
          <div className="absolute bottom-22 sm:bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="pointer-events-auto px-4 py-1.5 bg-black/80 backdrop-blur-md text-[#F9F7F2] text-[11px] font-sans uppercase tracking-widest border border-white/20 rounded-full shadow-lg animate-pulse">
              Đang Chụp: {currentBurstIndex + 1} / {totalBurstCount}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
