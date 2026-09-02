// Trang gọn nhẹ mở TRÊN ĐIỆN THOẠI để biến điện thoại thành camera rời cho PhotoBag.
// Được mở qua link/QR có dạng: <địa-chỉ-máy-chủ>/?camera=<mã 6 số> (hoặc tự gõ mã nếu mở link trần).
// Không dùng chung giao diện chụp ảnh chính — chỉ có 1 nhiệm vụ: giữ camera điện thoại
// mở và gửi hình sang máy chủ (tablet/PC) đang chạy PhotoBag qua Wifi nội bộ.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Peer as PeerType, MediaConnection } from 'peerjs';
import { Camera, RotateCcw, CheckCircle2, AlertTriangle, Wifi } from 'lucide-react';
import { tryEnableContinuousAutofocus } from '../utils/camera';

const PEER_ID_PREFIX = 'photobag-cam-';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

type SendStatus = 'entering_code' | 'requesting_camera' | 'connecting' | 'connected' | 'reconnecting' | 'error';

function getInitialCodeFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get('camera') || '').replace(/\D/g, '').slice(0, 6);
  } catch {
    return '';
  }
}

// Đoán tên thiết bị dựa theo trình duyệt để điền sẵn — người dùng vẫn có thể sửa lại trước khi kết nối.
// Tên này sẽ hiển thị cho Admin biết đang dùng đúng điện thoại nào làm camera.
function guessDeviceName(): string {
  const ua = navigator.userAgent || '';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Điện thoại Android';
  return 'Điện thoại';
}

export const PhoneCameraSender: React.FC = () => {
  const [codeInput, setCodeInput] = useState<string>(getInitialCodeFromUrl());
  const [status, setStatus] = useState<SendStatus>('entering_code');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('environment');
  const [deviceName, setDeviceName] = useState<string>(() => guessDeviceName());
  // Giữ ở state (không chỉ ở ref) để có thể "gắn lại" vào thẻ <video> mỗi khi thẻ đó được mount —
  // tránh lỗi gắn srcObject trước khi thẻ <video> tồn tại trong DOM (màn hình đen dù đã có hình).
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<PeerType | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  // Đếm số lần đã tự thử ghép lại sau khi rớt kết nối (không phải do người dùng chủ động ngắt)
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  // true khi người dùng chủ động bấm "Ngắt kết nối"/"Thử Lại" — để KHÔNG tự động ghép lại trong trường hợp đó
  const manualStopRef = useRef(false);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const stopEverything = useCallback(() => {
    clearReconnectTimer();
    callRef.current?.close();
    callRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, [clearReconnectTimer]);

  useEffect(() => {
    return () => stopEverything();
  }, [stopEverything]);

  // Gắn nguồn hình vào thẻ <video> mỗi khi có stream mới HOẶC thẻ <video> vừa được mount —
  // chạy sau khi React đã dựng xong DOM nên đảm bảo videoRef.current không còn null.
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
      videoRef.current.play().catch(() => {});
    }
  }, [localStream, status]);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // Một số trình duyệt/điện thoại không hỗ trợ — bỏ qua, không ảnh hưởng chức năng chính
    }
  }, []);

  // Mở kết nối tới máy chính bằng đúng mã + stream camera đã có sẵn. Được gọi lại nhiều lần khi
  // tự động ghép lại sau khi rớt kết nối (không phải chỉ gọi 1 lần lúc bấm "Kết Nối").
  const startCall = useCallback(
    (code: string, stream: MediaStream) => {
      import('peerjs').then(({ Peer }) => {
        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', () => {
          // Gửi kèm tên thiết bị để Admin biết đang dùng đúng điện thoại nào làm camera
          const call = peer.call(`${PEER_ID_PREFIX}${code}`, stream, { metadata: { label: deviceName.trim() || guessDeviceName() } });
          if (!call) {
            setErrorMessage('Không thể kết nối. Kiểm tra lại Wifi rồi thử lại.');
            setStatus('error');
            return;
          }
          callRef.current = call;
          call.on('close', () => handleUnexpectedDrop(code, stream));
        });

        peer.on('error', (err: Error & { type?: string }) => {
          if (err.type === 'peer-unavailable') {
            // Sai mã hoặc máy chính chưa mở/đã đổi mã khác — tự thử lại vô ích, cần người dùng can thiệp
            clearReconnectTimer();
            setErrorMessage('Không tìm thấy máy chính với mã này. Kiểm tra lại mã, hoặc bấm "Tạo Mã Ghép Nối" lại trên màn hình chính.');
            setStatus('error');
            return;
          }
          // Lỗi mạng/máy chủ giới thiệu — đáng để tự thử lại
          handleUnexpectedDrop(code, stream);
        });

        // Xem như đã "kết nối" ngay khi cuộc gọi được gửi đi thành công (không lỗi peer-unavailable
        // trong vài giây) — vì bên nhận (host) không gửi hình ngược lại nên không có sự kiện 'stream' để chờ.
        window.setTimeout(() => {
          setStatus((prev) => (prev === 'connecting' || prev === 'reconnecting' ? 'connected' : prev));
          reconnectAttemptRef.current = 0;
          requestWakeLock();
        }, 1500);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deviceName, requestWakeLock]
  );

  // Rớt kết nối ngoài ý muốn (không phải người dùng chủ động ngắt) — tự thử ghép lại vài lần
  // trước khi báo lỗi hẳn, đỡ phải quét QR / gõ mã lại từ đầu mỗi khi wifi chập chờn.
  const handleUnexpectedDrop = useCallback(
    (code: string, stream: MediaStream) => {
      if (manualStopRef.current) return; // người dùng đã chủ động ngắt, không tự ghép lại
      callRef.current?.close();
      callRef.current = null;
      peerRef.current?.destroy();
      peerRef.current = null;

      // Camera trên điện thoại đã tắt hẳn (ví dụ mất quyền) thì không thể tự ghép lại được nữa
      if (stream.getVideoTracks().every((t) => t.readyState === 'ended')) {
        setStatus('error');
        setErrorMessage('Camera điện thoại đã tắt. Bấm thử lại để mở camera và ghép nối lại.');
        return;
      }

      if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setStatus('error');
        setErrorMessage('Đã mất kết nối với máy chính và thử ghép lại nhiều lần không được. Kiểm tra lại Wifi rồi bấm thử lại.');
        return;
      }

      reconnectAttemptRef.current += 1;
      setStatus('reconnecting');
      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        if (manualStopRef.current) return;
        startCall(code, stream);
      }, RECONNECT_DELAY_MS);
    },
    [clearReconnectTimer, startCall]
  );

  const connect = useCallback(
    async (code: string) => {
      if (code.length !== 6) {
        setErrorMessage('Mã ghép nối gồm 6 số. Kiểm tra lại mã hiển thị trên màn hình chính.');
        setStatus('error');
        return;
      }

      manualStopRef.current = false;
      reconnectAttemptRef.current = 0;
      setErrorMessage(null);
      setStatus('requesting_camera');

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
      } catch (err) {
        setErrorMessage('Chưa cấp quyền camera cho trình duyệt. Vào Cài đặt trình duyệt để cấp quyền rồi thử lại.');
        setStatus('error');
        return;
      }

      // Cố gắng bật lấy nét liên tục ngay trên điện thoại — phải làm ở đây (nơi mở camera thật) vì
      // máy chính nhận hình qua Wifi không chỉnh lại được focus của camera điện thoại từ xa.
      tryEnableContinuousAutofocus(stream);

      localStreamRef.current = stream;
      setLocalStream(stream);

      setStatus('connecting');
      startCall(code, stream);
    },
    [facing, startCall]
  );

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    connect(codeInput);
  };

  const handleRetry = () => {
    manualStopRef.current = true;
    stopEverything();
    setStatus('entering_code');
  };

  const handleCancelReconnect = () => {
    manualStopRef.current = true;
    stopEverything();
    setStatus('entering_code');
  };

  return (
    <div className="fixed inset-0 bg-[#111111] text-white flex flex-col items-center justify-center p-6 font-sans-vietnam">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-2">
            <Camera className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-black uppercase tracking-wider">Camera Điện Thoại</h1>
          <p className="text-xs text-white/50">Biến điện thoại này thành camera cho PhotoBag</p>
        </div>

        {status === 'entering_code' && (
          <form onSubmit={handleSubmitCode} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-bold">
                Nhập mã 6 số hiển thị trên màn hình chính
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-3xl font-mono font-black tracking-[0.3em] bg-white/5 border border-white/15 rounded-2xl py-4 outline-none focus:border-white/40"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-bold">
                Tên thiết bị (để máy chính nhận ra)
              </label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value.slice(0, 30))}
                placeholder="VD: iPhone của Hải"
                className="w-full text-sm bg-white/5 border border-white/15 rounded-xl py-2.5 px-3 outline-none focus:border-white/40"
              />
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-white/40">
              <button
                type="button"
                onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Ống kính: {facing === 'environment' ? 'Sau' : 'Trước'}
              </button>
            </div>

            <button
              type="submit"
              disabled={codeInput.length !== 6}
              className="w-full py-3.5 rounded-2xl bg-white text-black font-black uppercase tracking-wider text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Kết Nối
            </button>
          </form>
        )}

        {(status === 'requesting_camera' || status === 'connecting') && (
          <div className="text-center space-y-3 py-6">
            <Wifi className="w-8 h-8 mx-auto text-white/60 animate-pulse" />
            <p className="text-sm text-white/70">
              {status === 'requesting_camera' ? 'Đang mở camera điện thoại...' : 'Đang kết nối tới màn hình chính...'}
            </p>
          </div>
        )}

        {status === 'reconnecting' && (
          <div className="text-center space-y-3 py-6">
            <Wifi className="w-8 h-8 mx-auto text-amber-400 animate-pulse" />
            <p className="text-sm text-white/70">
              Mất kết nối tạm thời — đang tự ghép lại... (lần {reconnectAttemptRef.current}/{MAX_RECONNECT_ATTEMPTS})
            </p>
            <button
              onClick={handleCancelReconnect}
              className="text-[11px] text-white/40 underline underline-offset-2"
            >
              Hủy
            </button>
          </div>
        )}

        {/* Thẻ <video> luôn được mount (chỉ ẩn/hiện bằng CSS) để videoRef không bao giờ null
            vào lúc cần gắn stream — tránh lỗi màn hình đen do gắn hình trước khi thẻ tồn tại. */}
        <div
          className={`rounded-2xl overflow-hidden border border-white/15 aspect-[3/4] bg-black ${
            status === 'connected' ? '' : 'hidden'
          }`}
        >
          <video ref={videoRef} muted playsInline autoPlay className="w-full h-full object-cover -scale-x-100" />
        </div>

        {status === 'connected' && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Đã kết nối — giữ điện thoại cố định tại đây
            </div>
            <p className="text-[11px] text-white/40">Đừng tắt màn hình hoặc đóng trang này trong lúc chụp.</p>
            <button
              onClick={handleRetry}
              className="text-[11px] text-white/40 underline underline-offset-2"
            >
              Ngắt kết nối
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <AlertTriangle className="w-8 h-8 mx-auto text-amber-400" />
            <p className="text-sm text-white/70">{errorMessage}</p>
            <button
              onClick={handleRetry}
              className="w-full py-3 rounded-2xl bg-white/10 border border-white/15 font-bold uppercase tracking-wider text-xs"
            >
              Thử Lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
