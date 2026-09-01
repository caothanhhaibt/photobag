import { useEffect, useState } from 'react';

// Ngưỡng phân biệt "máy tính bảng trở lên" và "điện thoại", áp dụng đồng thời
// cho CẢ chiều rộng LẪN chiều cao khả dụng (viewport), nhờ đó không phụ thuộc
// vào hướng xoay máy: điện thoại nằm ngang tuy rộng hơn 745px nhưng luôn có
// chiều còn lại (chiều cao) thấp hơn ngưỡng, nên vẫn được coi là "điện thoại".
// Máy tính bảng, dù xoay dọc hay ngang, luôn có cả hai chiều đủ lớn.
const TABLET_BREAKPOINT_PX = 745;

function getQuery(): string {
  return `(min-width: ${TABLET_BREAKPOINT_PX}px) and (min-height: ${TABLET_BREAKPOINT_PX}px)`;
}

/**
 * Trả về true nếu thiết bị hiện tại nên được coi là "máy tính bảng trở lên"
 * (bất kể đang xoay dọc hay ngang), false nếu là điện thoại.
 */
export function useIsTabletOrLarger(): boolean {
  const [isTabletOrLarger, setIsTabletOrLarger] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(getQuery()).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(getQuery());
    const handleChange = () => setIsTabletOrLarger(mql.matches);
    handleChange();
    if (mql.addEventListener) {
      mql.addEventListener('change', handleChange);
      return () => mql.removeEventListener('change', handleChange);
    }
    // Fallback cho trình duyệt cũ hơn
    mql.addListener(handleChange);
    return () => mql.removeListener(handleChange);
  }, []);

  return isTabletOrLarger;
}
