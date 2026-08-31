// Hook quản lý việc "ghép nối" camera điện thoại vào máy đang chạy PhotoBag (máy chủ / tablet)
// qua Wifi nội bộ, dùng PeerJS (WebRTC) + máy chủ giới thiệu (signaling) miễn phí có sẵn của PeerJS.
//
// Cách hoạt động:
// 1. Máy chủ (tablet) bấm "Tạo Mã Ghép Nối" -> hook này tạo 1 mã ngẫu nhiên 6 số, mở kết nối
//    Peer với id dạng "photobag-cam-<mã>", rồi chờ điện thoại gọi tới.
// 2. Điện thoại mở trang gửi camera (PhoneCameraSender), nhập/quét đúng mã đó, gọi tới đúng id trên.
// 3. Khi cuộc gọi tới, máy chủ trả lời (answer) không kèm hình của mình, chỉ nhận hình
//    (remote MediaStream) từ điện thoại và đưa vào state để CameraScreen dùng làm nguồn camera.
//
// Lưu ý: chỉ lúc bắt cặp cần Internet để liên lạc với máy chủ giới thiệu miễn phí của PeerJS;
// sau khi đã ghép xong, hình truyền thẳng qua Wifi nội bộ giữa 2 máy.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Peer as PeerType, MediaConnection } from 'peerjs';

export type PairingStatus = 'idle' | 'starting' | 'waiting' | 'connected' | 'error';

const PEER_ID_PREFIX = 'photobag-cam-';

function generatePairingCode(): string {
  // Mã 6 số, dễ đọc/gõ trên điện thoại
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function usePhoneCameraPairing() {
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [status, setStatus] = useState<PairingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  // Tên thiết bị điện thoại đang kết nối, do chính điện thoại đó tự đặt/gõ trước khi kết nối
  const [connectedDeviceLabel, setConnectedDeviceLabel] = useState<string | null>(null);

  const peerRef = useRef<PeerType | null>(null);
  const callRef = useRef<MediaConnection | null>(null);

  const cleanupCall = useCallback(() => {
    if (callRef.current) {
      callRef.current.close();
      callRef.current = null;
    }
    setRemoteStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setConnectedDeviceLabel(null);
  }, []);

  const stopPairing = useCallback(() => {
    cleanupCall();
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setPairingCode(null);
    setStatus('idle');
    setErrorMessage(null);
  }, [cleanupCall]);

  const startPairing = useCallback(async () => {
    // Nếu đang có phiên cũ thì dọn trước khi tạo phiên mới
    stopPairing();
    setStatus('starting');
    setErrorMessage(null);

    const { Peer } = await import('peerjs');
    const code = generatePairingCode();
    const peer = new Peer(`${PEER_ID_PREFIX}${code}`);
    peerRef.current = peer;

    peer.on('open', () => {
      setPairingCode(code);
      setStatus('waiting');
    });

    peer.on('call', (call: MediaConnection) => {
      // Trả lời cuộc gọi từ điện thoại mà không gửi hình của mình lên, chỉ nhận hình từ điện thoại
      call.answer();
      callRef.current = call;
      // Điện thoại tự gửi kèm tên thiết bị (call.metadata.label) khi gọi tới — hiển thị cho Admin biết
      // đang dùng đúng máy nào làm camera.
      const label = (call.metadata as { label?: string } | undefined)?.label;
      setConnectedDeviceLabel(label && label.trim() ? label.trim() : 'Điện thoại (chưa đặt tên)');

      const handleLostConnection = () => {
        // Tránh dọn 2 lần nếu nhiều sự kiện cùng báo mất kết nối gần như đồng thời
        if (callRef.current !== call) return;
        cleanupCall();
        setStatus(peerRef.current ? 'waiting' : 'idle');
      };

      call.on('stream', (stream: MediaStream) => {
        setRemoteStream(stream);
        setStatus('connected');

        // Phát hiện mất kết nối SỚM — không chờ PeerJS tự nhận ra (có thể mất tới ~1 phút):
        // 1) track 'ended' khi trình duyệt/điện thoại thật sự đóng camera hoặc đóng kết nối.
        stream.getVideoTracks().forEach((track) => {
          track.addEventListener('ended', handleLostConnection);
        });
      });
      // 2) trạng thái ICE của kết nối WebRTC bên dưới chuyển sang disconnected/failed — PeerJS phát
      //    sự kiện này sẵn (call.peerConnection.oniceconnectionstatechange), thường phát hiện trong
      //    vài giây, nhanh hơn nhiều so với timeout mặc định của PeerJS (~1 phút).
      call.on('iceStateChanged', (iceState) => {
        if (iceState === 'disconnected' || iceState === 'failed') {
          handleLostConnection();
        }
      });
      call.on('close', handleLostConnection);
      call.on('error', handleLostConnection);
    });

    peer.on('disconnected', () => {
      setStatus((prev) => (prev === 'connected' ? prev : 'error'));
    });

    peer.on('error', (err: Error) => {
      setErrorMessage('Không thể tạo mã ghép nối. Kiểm tra kết nối Internet/Wifi rồi thử lại.');
      setStatus('error');
      console.warn('[usePhoneCameraPairing] peer error', err);
    });
  }, [cleanupCall, stopPairing]);

  // Dọn dẹp khi component gỡ bỏ
  useEffect(() => {
    return () => {
      callRef.current?.close();
      peerRef.current?.destroy();
    };
  }, []);

  return {
    pairingCode,
    status,
    errorMessage,
    remoteStream,
    connectedDeviceLabel,
    startPairing,
    stopPairing,
  };
}
