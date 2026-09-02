// Tiện ích liên quan tới phần cứng camera (khác với utils/canvas.ts — chỗ đó lo phần dựng hình).

/**
 * Cố gắng bật chế độ "lấy nét liên tục" (continuous autofocus) cho 1 luồng camera, để máy tự bám
 * nét theo khách khi họ vừa bước vào khung hình thay vì chỉ lấy nét đúng 1 lần lúc mở camera rồi
 * đứng yên. Đây là khả năng thử nghiệm của trình duyệt (Chromium là chính), không phải camera/máy
 * nào cũng hỗ trợ — nên đây là cố gắng hết sức (best-effort): dò khả năng trước, có mới áp dụng,
 * không hỗ trợ thì lặng lẽ bỏ qua, không ảnh hưởng gì tới việc mở camera bình thường.
 *
 * Lưu ý quan trọng: tốc độ lấy nét thật sự vẫn do phần cứng camera quyết định — hàm này chỉ đảm
 * bảo trình duyệt YÊU CẦU đúng chế độ bám nét liên tục, không "ép" máy nhanh hơn khả năng vốn có.
 *
 * Áp dụng ngay sau khi có MediaStream (getUserMedia) — dùng ở cả 2 nơi: camera chính của máy đang
 * chạy PhotoBag (CameraScreen.tsx), và camera điện thoại gửi qua Wifi (PhoneCameraSender.tsx) —
 * riêng trường hợp điện thoại thì phải áp dụng ngay trên chính điện thoại (nơi mở getUserMedia
 * thật), vì track nhận về ở đầu máy chính (qua WebRTC) không cho phép chỉnh lại focus của camera.
 */
export async function tryEnableContinuousAutofocus(stream: MediaStream): Promise<void> {
  try {
    const [track] = stream.getVideoTracks();
    if (!track || typeof track.getCapabilities !== 'function') return;

    const capabilities = track.getCapabilities() as MediaTrackCapabilities & { focusMode?: string[] };
    if (!capabilities.focusMode || !capabilities.focusMode.includes('continuous')) return;

    await track.applyConstraints({
      advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
    });
  } catch {
    // Trình duyệt/camera không hỗ trợ chỉnh focusMode — bỏ qua, camera vẫn hoạt động bình thường.
  }
}
