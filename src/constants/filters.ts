import { FilterPreset } from '../types';

export const SAMPLE_STUDIO_VIEWFINDER = 'https://lh3.googleusercontent.com/aida-public/AB6AXuA5EyQSVtcfEoVosqE55CFfBP4zjeuhw2hEBMqFOgXz_DigtzCFqceYoPTSo8Sz6Di-C65C89QPNh2tSNIWpJ_JTC6Ppf44NmHbA7GEe75O199R2vvVBVaz5MH43Kj27swZx4XaLCStNSWWilhvKa_oq4XH5hf04PZwmNU57eD3xIbX-2ArkwmjDq3iWFpF8tgZXUYuutyVuZxgO6buA2bXvemZsYXw462FW2e4rVeTJq8czS1j-pvneA';

export const SAMPLE_PHOTO_FRIENDS = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQEUR_nXn5yXZo_5o-w1QC3RIubvfbRxGA4xsu3WldqXIcHVgejD4c6nM4XAZ3HfOS8rlx_WiEewfzkiQtKNMptDNhbosbTL-spJfDTDoZ5p_7G9HIiZJYjMAMT2ak4vfeJhs7MzgKVURC3pfumvfAIPbyPtNuqNaK6fGwm3JvkUrkCndzgEB_yJZaINfSlONEyOO_3Wh_qqGVpAIjBkepw8D27loXUGw2boU98DvwqVkBEM5SsUbhxQ';

export const SAMPLE_PHOTO_SOLO = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop';
export const SAMPLE_PHOTO_DUO = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1000&auto=format&fit=crop';
export const SAMPLE_PHOTO_STUDIO = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop';

export const FILTER_PRESETS: FilterPreset[] = [
  // 1. NGUYÊN BẢN (Natural)
  {
    id: 'original',
    name: 'Nguyên Bản',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQEUR_nXn5yXZo_5o-w1QC3RIubvfbRxGA4xsu3WldqXIcHVgejD4c6nM4XAZ3HfOS8rlx_WiEewfzkiQtKNMptDNhbosbTL-spJfDTDoZ5p_7G9HIiZJYjMAMT2ak4vfeJhs7MzgKVURC3pfumvfAIPbyPtNuqNaK6fGwm3JvkUrkCndzgEB_yJZaINfSlONEyOO_3Wh_qqGVpAIjBkepw8D27loXUGw2boU98DvwqVkBEM5SsUbhxQ',
    description: 'Màu sắc chân thực và tự nhiên trực tiếp từ cảm biến máy ảnh.',
    defaultIntensity: 0,
    filterCss: () => 'none',
  },

  // 2. K-PHOTOBOOTHS HÀN QUỐC (Trắng hồng, mịn da, trong trẻo như Haru Film / Life4Cuts)
  {
    id: 'k-photobooth',
    name: 'Hàn Quốc Trắng Hồng',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzrOBnA49-H2L8vvjrlvjNXSx349VQIPSe9205KFbn1xJ40UweagY2-8lbHp__30sJP_7Lk6_zpAgw6XNi0DzJwLq1-6sc7NEOP01fQ6_rr_yRq61J9h2Q3Zv3LtCvVZTw5HqOqWDM5vlKBIEXJX___gBq0Piv4d-6Yne7LG6X6wTRud69NTtELaPWLtzEzfQLV6IaWni5UmgsVBpmKyiZVg5grMzVpfSRR7VcRJkMp-kvVX74lJm8WA',
    description: 'Nâng tone trắng hồng mịn màng chuẩn buồng chụp Life4Cuts & Haru Film nổi tiếng Hàn Quốc.',
    defaultIntensity: 80,
    overlayColor: 'rgba(255, 228, 230, 0.15)',
    blendMode: 'screen',
    filterCss: (intensity: number) => {
      const val = intensity / 100;
      return `brightness(${100 + val * 10}%) contrast(${100 - val * 6}%) saturate(${100 + val * 8}%)`;
    },
  },

  // 3. PEACH BLOSSOM (Hồng Đào Ngọt Ngào cho Trẻ Em & Bạn Bè)
  {
    id: 'peach-blossom',
    name: 'Hồng Đào Ngọt Ngào',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzrOBnA49-H2L8vvjrlvjNXSx349VQIPSe9205KFbn1xJ40UweagY2-8lbHp__30sJP_7Lk6_zpAgw6XNi0DzJwLq1-6sc7NEOP01fQ6_rr_yRq61J9h2Q3Zv3LtCvVZTw5HqOqWDM5vlKBIEXJX___gBq0Piv4d-6Yne7LG6X6wTRud69NTtELaPWLtzEzfQLV6IaWni5UmgsVBpmKyiZVg5grMzVpfSRR7VcRJkMp-kvVX74lJm8WA',
    description: 'Tone màu ấm ửng hồng dễ thương, tôn da sáng hồng hào tự nhiên.',
    defaultIntensity: 75,
    overlayColor: 'rgba(251, 113, 133, 0.12)',
    blendMode: 'soft-light',
    filterCss: (intensity: number) => {
      const val = intensity / 100;
      return `brightness(${100 + val * 6}%) contrast(${100 + val * 4}%) saturate(${100 + val * 15}%) sepia(${val * 12}%)`;
    },
  },

  // 4. TOKYO BREEZE (Phim Nhật Bản Trong Vắt)
  {
    id: 'tokyo-breeze',
    name: 'Nhật Bản Trong Vắt',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvoi8pNtM0C6XBSSbSvjrk7XmrAcf8NeUjkt389N9avcsJZx8m2j36_5_MyloPL3Q1KZjhfYQ81HQurtH1mv8VW9HMF0Fy5Fh5ZwrNIzQyp5zYuZkPJsnapXUxLwHVGo04foNPBTmu_Zm8XEiIRFVAqyzufTZ7ib5YiEU1CQ2DElv6Emc5M2pyqiGSu2IcWEDU-ojiMGxyAjODH1K9u6B8VGia0mFyIC-j9dfUpVu9FHOQjCIgPG5E6Q',
    description: 'Tông màu lam ngọc trong veo dịu mát phong cách thanh xuân Nhật Bản.',
    defaultIntensity: 75,
    overlayColor: 'rgba(56, 189, 248, 0.12)',
    blendMode: 'soft-light',
    filterCss: (intensity: number) => {
      const val = intensity / 100;
      return `brightness(${100 + val * 8}%) contrast(${100 - val * 8}%) saturate(${100 - val * 10}%) hue-rotate(${val * 8}deg)`;
    },
  },

  // 5. KODAK PORTRA 400 (Phim Analog Vàng Hổ Phách Kinh Điển)
  {
    id: 'kodak-portra',
    name: 'Kodak Portra 400',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDO_0Ri6cW0Sc0Z4jSVNQ6tXenhWU7UPFm7h4Z1HhNdl3Mu7l7IJK43gEikZQw1m904xDR6qUIsGvwGpaL5H0FyXcvYhqoag0FocuSg90kfszeAuoeyF6rKeHcgEdcuiTuZLJj9zjyoKPRlLzlHMv3UTzlGdPNNg2AblchwMBQ2_tVB7nnFLy9RkpswaQrO87LzQ8EdtZDIBNZyYA9P4isecWI8H_BcEVNLL6RvS8rIdHtlnwTA3PLguA',
    description: 'Màu phim cuộn 35mm danh tiếng với ánh ấm hổ phách và sắc da chân dung tuyệt đẹp.',
    defaultIntensity: 80,
    overlayColor: 'rgba(245, 158, 11, 0.12)',
    blendMode: 'color-burn',
    filterCss: (intensity: number) => {
      const val = intensity / 100;
      return `sepia(${val * 28}%) contrast(${100 + val * 16}%) brightness(${100 + val * 4}%) saturate(${100 - val * 8}%)`;
    },
  },

  // 6. FUJI 90s COLOR (Màu Phim Thập Niên 90)
  {
    id: 'fuji-film',
    name: 'Phim Fuji 90s',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDO_0Ri6cW0Sc0Z4jSVNQ6tXenhWU7UPFm7h4Z1HhNdl3Mu7l7IJK43gEikZQw1m904xDR6qUIsGvwGpaL5H0FyXcvYhqoag0FocuSg90kfszeAuoeyF6rKeHcgEdcuiTuZLJj9zjyoKPRlLzlHMv3UTzlGdPNNg2AblchwMBQ2_tVB7nnFLy9RkpswaQrO87LzQ8EdtZDIBNZyYA9P4isecWI8H_BcEVNLL6RvS8rIdHtlnwTA3PLguA',
    description: 'Chất màu hoài niệm thập niên 90 với sắc xanh lá dịu và vùng bóng ám vàng cát.',
    defaultIntensity: 75,
    overlayColor: 'rgba(168, 85, 247, 0.08)',
    blendMode: 'overlay',
    filterCss: (intensity: number) => {
      const val = intensity / 100;
      return `contrast(${100 + val * 20}%) brightness(${100 - val * 2}%) saturate(${100 + val * 12}%) sepia(${val * 18}%) hue-rotate(-${val * 6}deg)`;
    },
  },

  // 7. Y2K FLASH (Đèn Flash & Tương Phản Thập Niên 2000)
  {
    id: 'y2k-flash',
    name: 'Y2K Flash 2000s',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDiqxW4KmZKaxpmXL-c0HW2M5E0k6s5lzoFbsWKb1Ez7ZvnfQsOR5TYaHcDFY78Km3H3UNgISFQ223LrnffTI6B7xPrmJYbBRLviTKKZPUjE_xiFB-hHbffJ8ukX82jF-zghz2tUVRkuYrKL5gwwH-_M0jmAavHQ-ueZRV_zrzY7KfQdq_Ae6pbw9o2OCvDZZ-_idsnvs_168yy2t8g6PqjfzHBRKrZn9BDBs-ZH5cRaAIh0FsB6eQIWA',
    description: 'Hiệu ứng chụp flash trực diện sắc nét, sáng rực rỡ và cá tính của thời kỳ Y2K.',
    defaultIntensity: 85,
    overlayColor: 'rgba(255, 255, 255, 0.1)',
    blendMode: 'screen',
    filterCss: (intensity: number) => {
      const val = intensity / 100;
      return `brightness(${100 + val * 14}%) contrast(${100 + val * 35}%) saturate(${100 + val * 25}%)`;
    },
  },

  // 8. CANDY POP (Kẹo Ngọt Rực Rỡ cho Trẻ Em)
  {
    id: 'candy-pop',
    name: 'Candy Pop Vui Nhộn',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDiqxW4KmZKaxpmXL-c0HW2M5E0k6s5lzoFbsWKb1Ez7ZvnfQsOR5TYaHcDFY78Km3H3UNgISFQ223LrnffTI6B7xPrmJYbBRLviTKKZPUjE_xiFB-hHbffJ8ukX82jF-zghz2tUVRkuYrKL5gwwH-_M0jmAavHQ-ueZRV_zrzY7KfQdq_Ae6pbw9o2OCvDZZ-_idsnvs_168yy2t8g6PqjfzHBRKrZn9BDBs-ZH5cRaAIh0FsB6eQIWA',
    description: 'Tăng cường các gam màu tươi sáng, sinh động và vui tươi thích hợp cho ảnh trẻ em.',
    defaultIntensity: 80,
    overlayColor: 'rgba(244, 63, 94, 0.08)',
    blendMode: 'color-dodge',
    filterCss: (intensity: number) => {
      const val = intensity / 100;
      return `saturate(${100 + val * 55}%) contrast(${100 + val * 18}%) brightness(${100 + val * 6}%)`;
    },
  },

  // 9. VINTAGE RETRO (Phim Cổ Điển Thập Niên 70)
  {
    id: 'vintage',
    name: 'Phim Cổ Điển 70s',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDO_0Ri6cW0Sc0Z4jSVNQ6tXenhWU7UPFm7h4Z1HhNdl3Mu7l7IJK43gEikZQw1m904xDR6qUIsGvwGpaL5H0FyXcvYhqoag0FocuSg90kfszeAuoeyF6rKeHcgEdcuiTuZLJj9zjyoKPRlLzlHMv3UTzlGdPNNg2AblchwMBQ2_tVB7nnFLy9RkpswaQrO87LzQ8EdtZDIBNZyYA9P4isecWI8H_BcEVNLL6RvS8rIdHtlnwTA3PLguA',
    description: 'Tông màu phim analog thập niên 70 ấm áp, ánh vàng hổ phách dịu nhẹ.',
    defaultIntensity: 75,
    overlayColor: 'rgba(217, 119, 6, 0.14)',
    blendMode: 'color-burn',
    filterCss: (intensity: number) => {
      const val = intensity / 100;
      return `sepia(${val * 55}%) contrast(${100 + val * 18}%) brightness(${100 + val * 4}%) saturate(${100 - val * 15}%)`;
    },
  },

  // 10. NEON DREAM (Tím Mộng Mơ Lung Linh)
  {
    id: 'neon-dream',
    name: 'Tím Mộng Mơ',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDiqxW4KmZKaxpmXL-c0HW2M5E0k6s5lzoFbsWKb1Ez7ZvnfQsOR5TYaHcDFY78Km3H3UNgISFQ223LrnffTI6B7xPrmJYbBRLviTKKZPUjE_xiFB-hHbffJ8ukX82jF-zghz2tUVRkuYrKL5gwwH-_M0jmAavHQ-ueZRV_zrzY7KfQdq_Ae6pbw9o2OCvDZZ-_idsnvs_168yy2t8g6PqjfzHBRKrZn9BDBs-ZH5cRaAIh0FsB6eQIWA',
    description: 'Ánh tím hồng lung linh huyền ảo tạo cảm giác hiện đại và cuốn hút.',
    defaultIntensity: 75,
    overlayColor: 'rgba(168, 85, 247, 0.14)',
    blendMode: 'overlay',
    filterCss: (intensity: number) => {
      const val = intensity / 100;
      return `contrast(${100 + val * 22}%) brightness(${100 - val * 2}%) saturate(${100 + val * 28}%) hue-rotate(${val * 20}deg)`;
    },
  },

  // 11. CINE TEAL & ORANGE (Điện Ảnh Hollywood)
  {
    id: 'cine',
    name: 'Điện Ảnh Hollywood',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvoi8pNtM0C6XBSSbSvjrk7XmrAcf8NeUjkt389N9avcsJZx8m2j36_5_MyloPL3Q1KZjhfYQ81HQurtH1mv8VW9HMF0Fy5Fh5ZwrNIzQyp5zYuZkPJsnapXUxLwHVGo04foNPBTmu_Zm8XEiIRFVAqyzufTZ7ib5YiEU1CQ2DElv6Emc5M2pyqiGSu2IcWEDU-ojiMGxyAjODH1K9u6B8VGia0mFyIC-j9dfUpVu9FHOQjCIgPG5E6Q',
    description: 'Tông xanh lam kết hợp ánh vàng cam sâu lắng chuẩn điện ảnh đương đại.',
    defaultIntensity: 75,
    overlayColor: 'rgba(14, 116, 144, 0.12)',
    blendMode: 'overlay',
    filterCss: (intensity: number) => {
      const val = intensity / 100;
      return `hue-rotate(${val * 18}deg) contrast(${100 + val * 28}%) saturate(${100 + val * 15}%) brightness(${100 - val * 4}%)`;
    },
  },

  // 12. HOÀNG HÔN (Sunset Gold)
  {
    id: 'sunset',
    name: 'Hoàng Hôn Ấm Áp',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDO_0Ri6cW0Sc0Z4jSVNQ6tXenhWU7UPFm7h4Z1HhNdl3Mu7l7IJK43gEikZQw1m904xDR6qUIsGvwGpaL5H0FyXcvYhqoag0FocuSg90kfszeAuoeyF6rKeHcgEdcuiTuZLJj9zjyoKPRlLzlHMv3UTzlGdPNNg2AblchwMBQ2_tVB7nnFLy9RkpswaQrO87LzQ8EdtZDIBNZyYA9P4isecWI8H_BcEVNLL6RvS8rIdHtlnwTA3PLguA',
    description: 'Ánh nắng hoàng hôn vàng cam lãng mạn phủ nhẹ lên làn da.',
    defaultIntensity: 75,
    overlayColor: 'rgba(251, 146, 60, 0.16)',
    blendMode: 'screen',
    filterCss: (intensity: number) => {
      const val = intensity / 100;
      return `sepia(${val * 35}%) saturate(${100 + val * 30}%) brightness(${100 + val * 8}%) hue-rotate(-6deg)`;
    },
  },

  // 13. SILVER STUDIO BW (Đen Trắng Bạc Cao Cấp)
  {
    id: 'bw',
    name: 'Đen Trắng Studio',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAEhKaZWSSsr76mdL6ksTwFncaQjgF0p2DAITDmKHj2DvqZBL-O3qS-LNu1mNFiY184R8xCzksdIPdS0VhjEK0codlKn3FxHkDa9Oxyr81I5xzSmJAWuHK5aOzhSoEwLfkpRPztcLJB-sxhIBzu-ScFVnPK9t1Towmikc9jLmiSLwqd5neAdvDxeToJ5qa8wXxZ9Yn5eVwA5bms9IsynqT1CfE7chQNfQSG8MNV3_u3aeZYNZj3c0fgvw',
    description: 'Đen trắng tương phản cao chuẩn studio với vùng tối sâu và vùng sáng sắc nét.',
    defaultIntensity: 85,
    filterCss: (intensity: number) => {
      const val = intensity / 100;
      return `grayscale(${val * 100}%) contrast(${100 + val * 35}%) brightness(${100 - val * 4}%)`;
    },
  },

  // 14. NOIR CINEMA (Phim Noir Đậm Chất Nghệ Thuật)
  {
    id: 'noir',
    name: 'Phim Noir Sâu Lắng',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAEhKaZWSSsr76mdL6ksTwFncaQjgF0p2DAITDmKHj2DvqZBL-O3qS-LNu1mNFiY184R8xCzksdIPdS0VhjEK0codlKn3FxHkDa9Oxyr81I5xzSmJAWuHK5aOzhSoEwLfkpRPztcLJB-sxhIBzu-ScFVnPK9t1Towmikc9jLmiSLwqd5neAdvDxeToJ5qa8wXxZ9Yn5eVwA5bms9IsynqT1CfE7chQNfQSG8MNV3_u3aeZYNZj3c0fgvw',
    description: 'Bóng đổ huyền bí lấy cảm hứng từ điện ảnh kinh điển nước Pháp.',
    defaultIntensity: 90,
    filterCss: (intensity: number) => {
      const val = intensity / 100;
      return `grayscale(100%) contrast(${100 + val * 65}%) brightness(${100 - val * 15}%)`;
    },
  },
];

// ============================================================================
// CÂN CHỈNH CAMERA GỐC (Admin) — lớp hiệu chỉnh nền áp dụng ngầm lên MỌI ảnh chụp, TRƯỚC khi tới
// phong cách lọc màu khách tự chọn ở trên (FILTER_PRESETS). Dùng để bù ánh sáng thực tế của buổi
// chụp (đèn vàng/yếu, camera điện thoại lên màu khác nhau...) — chỉnh đúng 1 lần cho cả sự kiện.
// ============================================================================
export interface CameraCalibrationPreset {
  id: import('../types').CameraCalibrationConfig['presetId'];
  name: string;
  description: string;
  values: Omit<import('../types').CameraCalibrationConfig, 'presetId'>;
}

export const CAMERA_CALIBRATION_PRESETS: CameraCalibrationPreset[] = [
  {
    id: 'natural',
    name: 'Tự Nhiên Chuẩn',
    description: 'Gần như giữ nguyên màu gốc, chỉ chỉnh nhẹ cho cân đối — hợp không gian đủ sáng.',
    values: { brightness: 0, contrast: 0, saturation: 0, warmth: 0, skinSmooth: 15, sharpen: 10 },
  },
  {
    id: 'warm-skin',
    name: 'Da Đẹp Ấm Áp',
    description: 'Nâng tông ấm, da hồng hào mịn màng — hợp studio đèn vàng, tiệc cưới, sự kiện trong nhà.',
    values: { brightness: 8, contrast: 4, saturation: 6, warmth: 14, skinSmooth: 35, sharpen: 15 },
  },
  {
    id: 'vivid-studio',
    name: 'Studio Rực Rỡ',
    description: 'Tương phản & bão hòa cao, sắc nét rõ ràng — hợp sự kiện nhiều đèn, sân khấu, ban đêm.',
    values: { brightness: 6, contrast: 14, saturation: 18, warmth: 4, skinSmooth: 10, sharpen: 25 },
  },
  {
    id: 'soft-light',
    name: 'Ánh Sáng Dịu Nhẹ',
    description: 'Sáng dịu, tương phản thấp, da mềm mại như phim analog — hợp chụp ngoài trời/ánh sáng tự nhiên.',
    values: { brightness: 10, contrast: -8, saturation: -4, warmth: 6, skinSmooth: 45, sharpen: 5 },
  },
];

export const DEFAULT_CAMERA_CALIBRATION: import('../types').CameraCalibrationConfig = {
  presetId: 'natural',
  ...CAMERA_CALIBRATION_PRESETS[0].values,
};

export const FRAME_COLORS: { id: import('../types').FrameColor; name: string; hex: string; textHex: string; borderHex: string }[] = [
  { id: 'white', name: 'Giấy Trắng Kem Studio', hex: '#F9F7F2', textHex: '#1A1A1A', borderHex: 'rgba(26, 26, 26, 0.12)' },
  { id: 'cream', name: 'Vải Lanh Ấm', hex: '#EFEEE8', textHex: '#1A1A1A', borderHex: 'rgba(26, 26, 26, 0.15)' },
  { id: 'charcoal', name: 'Than Chì Hiện Đại', hex: '#1A1A1A', textHex: '#F9F7F2', borderHex: '#2A2A2A' },
  { id: 'black', name: 'Đen Gỗ Mun', hex: '#111111', textHex: '#F9F7F2', borderHex: '#222222' },
  { id: 'pastel-pink', name: 'Hồng Phấn Cổ Điển', hex: '#F4ECE6', textHex: '#4A342B', borderHex: '#E2D3CA' },
  { id: 'slate', name: 'Vàng Đất Mỹ Thuật', hex: '#EBE5D8', textHex: '#3D3425', borderHex: 'rgba(140, 122, 91, 0.3)' },
];

export interface LayoutOption {
  id: import('../types').StripLayout;
  category: 'double-vert' | 'double-horiz' | 'single-col' | 'editorial' | 'classic-strip';
  categoryLabel: string;
  name: string;
  shortName: string;
  photoCount: number;
  description: string;
  aspectRatio: string;
  iconName: string;
  hasNoteArea?: boolean;
}

export const LAYOUT_OPTIONS: LayoutOption[] = [
  // 1. DẢI THẺ ĐƠN CỔ ĐIỂN (In thẻ đánh dấu sách 2x6 inch)
  {
    id: 'strip-3',
    category: 'classic-strip',
    categoryLabel: 'Dải Thẻ Đơn (Bookmark 2x6 inch)',
    name: 'Dải Đơn 3 Ảnh (Layout A/B)',
    shortName: 'Dải Đơn 3',
    photoCount: 3,
    description: '1 dải dọc 3 tấm thẻ đơn chuẩn kích thước 2x6 inch.',
    aspectRatio: '2/6',
    iconName: 'square-slash',
  },
  {
    id: 'strip-4',
    category: 'classic-strip',
    categoryLabel: 'Dải Thẻ Đơn (Bookmark 2x6 inch)',
    name: 'Dải Đơn 4 Ảnh (Layout C/D)',
    shortName: 'Dải Đơn 4',
    photoCount: 4,
    description: '1 dải dọc 4 tấm thẻ đơn kỷ niệm cổ điển.',
    aspectRatio: '2/6',
    iconName: 'square-slash',
  },
  {
    id: 'grid-4',
    category: 'classic-strip',
    categoryLabel: 'Dải Thẻ Đơn (Bookmark 2x6 inch)',
    name: 'Lưới 4 Ô Vuông (2x2)',
    shortName: 'Lưới Vuông 2x2',
    photoCount: 4,
    description: '4 ảnh vuông xếp thành lưới 2 hàng 2 cột bưu thiếp.',
    aspectRatio: '1/1',
    iconName: 'grid-2x2',
  },

  // 2. DẢI ĐÔI DỌC (2 dải cắt đôi khổ 4x6 inch - chỉnh riêng từng ảnh hoặc đồng bộ)
  {
    id: 'double-2-vert',
    category: 'double-vert',
    categoryLabel: 'Dải Đôi Dọc (In 4x6 Cắt Đôi)',
    name: 'Đôi Dọc 2 Ảnh (4 ô ảnh chỉnh riêng)',
    shortName: 'Đôi Dọc 2 (4 ô)',
    photoCount: 4,
    description: '2 dải dọc song song (mỗi dải 2 ảnh), 4 ô chọn & chỉnh riêng biệt.',
    aspectRatio: '4/6',
    iconName: 'columns-2',
  },
  {
    id: 'double-3-vert',
    category: 'double-vert',
    categoryLabel: 'Dải Đôi Dọc (In 4x6 Cắt Đôi)',
    name: 'Đôi Dọc 3 Ảnh (6 ô ảnh chỉnh riêng - Layout A/B)',
    shortName: 'Đôi Dọc 3 (6 ô)',
    photoCount: 6,
    description: '2 dải dọc kinh điển 3 ảnh (Layout A/B), 6 ô ảnh chọn & chỉnh riêng.',
    aspectRatio: '4/6',
    iconName: 'columns-2',
  },
  {
    id: 'double-4-vert',
    category: 'double-vert',
    categoryLabel: 'Dải Đôi Dọc (In 4x6 Cắt Đôi)',
    name: 'Đôi Dọc 4 Ảnh (8 ô ảnh chỉnh riêng - Layout C/D)',
    shortName: 'Đôi Dọc 4 (8 ô)',
    photoCount: 8,
    description: '2 dải dọc 4 ảnh (Life Four Cuts / Layout C, D), 8 ô ảnh riêng biệt.',
    aspectRatio: '4/6',
    iconName: 'columns-2',
  },

  // 3. DẢI ĐÔI NGANG (2 dải cắt đôi ngang khổ 6x4 inch)
  {
    id: 'double-2-horiz',
    category: 'double-horiz',
    categoryLabel: 'Dải Đôi Ngang (In 6x4 Cắt Đôi)',
    name: 'Đôi Ngang 2 Ảnh (4 ô - Layout L)',
    shortName: 'Đôi Ngang 2',
    photoCount: 4,
    description: '2 dải ảnh ngang (Layout L), 4 ô ảnh chọn & chỉnh riêng từng hàng.',
    aspectRatio: '6/4',
    iconName: 'rows-2',
  },
  {
    id: 'double-3-horiz',
    category: 'double-horiz',
    categoryLabel: 'Dải Đôi Ngang (In 6x4 Cắt Đôi)',
    name: 'Đôi Ngang 3 Ảnh (6 ô ảnh)',
    shortName: 'Đôi Ngang 3',
    photoCount: 6,
    description: '2 dải ảnh nằm ngang song song, mỗi dải 3 ảnh panorama.',
    aspectRatio: '6/4',
    iconName: 'rows-2',
  },
  {
    id: 'double-4-horiz',
    category: 'double-horiz',
    categoryLabel: 'Dải Đôi Ngang (In 6x4 Cắt Đôi)',
    name: 'Đôi Ngang 4 Ảnh (8 ô ảnh)',
    shortName: 'Đôi Ngang 4',
    photoCount: 8,
    description: '2 dải ảnh nằm ngang, 8 ô ảnh kỷ niệm liên tục.',
    aspectRatio: '6/4',
    iconName: 'rows-2',
  },

  // 3. CỘT ĐƠN + VÙNG GHI CHÚ / LỜI CHÚC TRÊN TỜ IN 4x6 (Căn Trái / Giữa / Phải)
  {
    id: 'single-col-2',
    category: 'single-col',
    categoryLabel: 'Cột Đơn + Vùng Lời Chúc (Khổ 4x6 / 6x4)',
    name: 'Cột 2 Ảnh + Vùng Viết Lời Chúc',
    shortName: 'Cột 2 + Ghi Chú',
    photoCount: 2,
    description: 'Cột 2 ảnh (căn Trái / Giữa / Phải) + khoảng trắng ghi lời chúc / ký tên.',
    aspectRatio: '4/6',
    iconName: 'layout-list',
    hasNoteArea: true,
  },
  {
    id: 'single-col-3',
    category: 'single-col',
    categoryLabel: 'Cột Đơn + Vùng Lời Chúc (Khổ 4x6 / 6x4)',
    name: 'Cột 3 Ảnh + Vùng Viết Lời Chúc',
    shortName: 'Cột 3 + Ghi Chú',
    photoCount: 3,
    description: 'Cột 3 ảnh dọc + khoảng trắng ghi nội dung / quote kỷ niệm.',
    aspectRatio: '4/6',
    iconName: 'layout-list',
    hasNoteArea: true,
  },
  {
    id: 'single-col-4',
    category: 'single-col',
    categoryLabel: 'Cột Đơn + Vùng Lời Chúc (Khổ 4x6 / 6x4)',
    name: 'Cột 4 Ảnh + Vùng Viết Lời Chúc',
    shortName: 'Cột 4 + Ghi Chú',
    photoCount: 4,
    description: 'Cột 4 ảnh photobooth + phần trắng viết lưu bút kỷ yếu.',
    aspectRatio: '4/6',
    iconName: 'layout-list',
    hasNoteArea: true,
  },
  {
    id: 'layout-j',
    category: 'single-col',
    categoryLabel: 'Cột Đơn + Vùng Lời Chúc (Khổ 4x6 / 6x4)',
    name: 'Layout J (Cột 2 Ảnh Lệch Trái + Vùng Chữ Phải)',
    shortName: 'Layout J (2 Ảnh + Chữ)',
    photoCount: 2,
    description: 'Khổ ngang 6x4: Cột 2 ảnh lệch trái + vùng trắng lớn bên phải.',
    aspectRatio: '6/4',
    iconName: 'panel-left',
    hasNoteArea: true,
  },

  // 4. BỐ CỤC TẠP CHÍ & BÌA KỶ NIỆM (Layout F, G, H, I, K, M, E)
  {
    id: 'layout-f',
    category: 'editorial',
    categoryLabel: 'Bố Cục Tạp Chí & Kỷ Niệm (Layout Mẫu)',
    name: 'Layout F (1 Lớn + 3 Nhỏ + Vùng Chữ)',
    shortName: 'Layout F (4 Ảnh)',
    photoCount: 4,
    description: 'Khổ ngang 6x4: 1 ảnh lớn trên trái, vùng chữ trên phải, 3 ảnh nhỏ dưới.',
    aspectRatio: '6/4',
    iconName: 'layout-template',
    hasNoteArea: true,
  },
  {
    id: 'layout-g',
    category: 'editorial',
    categoryLabel: 'Bố Cục Tạp Chí & Kỷ Niệm (Layout Mẫu)',
    name: 'Layout G (Lưới 4 Ô + Tiêu Đề Riêng Từng Cột)',
    shortName: 'Layout G (Lưới 4)',
    photoCount: 4,
    description: 'Khổ ngang 6x4: Lưới 4 ảnh 2x2 với chữ đề tặng riêng dưới mỗi cột.',
    aspectRatio: '6/4',
    iconName: 'grid-2x2',
  },
  {
    id: 'layout-h',
    category: 'editorial',
    categoryLabel: 'Bố Cục Tạp Chí & Kỷ Niệm (Layout Mẫu)',
    name: 'Layout H (2 Dọc Trái + 1 Lớn & Chữ Phải)',
    shortName: 'Layout H (3 Ảnh)',
    photoCount: 3,
    description: 'Khổ ngang 6x4: 2 ảnh dọc bên trái, 1 ảnh lớn trên phải, vùng chữ dưới phải.',
    aspectRatio: '6/4',
    iconName: 'layout-dashboard',
    hasNoteArea: true,
  },
  {
    id: 'layout-i',
    category: 'editorial',
    categoryLabel: 'Bố Cục Tạp Chí & Kỷ Niệm (Layout Mẫu)',
    name: 'Layout I (3 Ảnh Nghệ Thuật + Ô Chữ)',
    shortName: 'Layout I (3 Ảnh)',
    photoCount: 3,
    description: 'Khổ ngang 6x4: 1 ảnh trên trái, 1 dưới trái, 1 dưới phải, ô chữ trên phải.',
    aspectRatio: '6/4',
    iconName: 'layout-grid',
    hasNoteArea: true,
  },
  {
    id: 'layout-k',
    category: 'editorial',
    categoryLabel: 'Bố Cục Tạp Chí & Kỷ Niệm (Layout Mẫu)',
    name: 'Layout K (2 Ảnh Ngang Ở Giữa + Tiêu Đề Trên/Dưới)',
    shortName: 'Layout K (2 Ảnh Ngang)',
    photoCount: 2,
    description: 'Khổ 4x6 / 6x4: Tiêu đề trên, 2 ảnh ngang song song ở giữa, ngày tháng ở đáy.',
    aspectRatio: '6/4',
    iconName: 'columns',
  },
  {
    id: 'single-2',
    category: 'editorial',
    categoryLabel: 'Bố Cục Tạp Chí & Kỷ Niệm (Layout Mẫu)',
    name: 'Layout E (2 Ảnh Lớn Dọc Khổ 4x6)',
    shortName: 'Layout E (2 Ảnh Lớn)',
    photoCount: 2,
    description: 'Khổ dọc 4x6: 2 ảnh chữ nhật lớn cân đối, chữ kỷ niệm ở đáy.',
    aspectRatio: '4/6',
    iconName: 'gallery-vertical-end',
  },
  {
    id: 'layout-m',
    category: 'editorial',
    categoryLabel: 'Bố Cục Tạp Chí & Kỷ Niệm (Layout Mẫu)',
    name: 'Layout M (1 Ảnh Panorama Lớn Duy Nhất)',
    shortName: 'Layout M (1 Ảnh Lớn)',
    photoCount: 1,
    description: 'Khổ ngang 6x4: 1 bức ảnh panorama trung tâm lớn nhất, chữ ở đáy.',
    aspectRatio: '6/4',
    iconName: 'image',
  },
  {
    id: 'featured-1-2',
    category: 'editorial',
    categoryLabel: 'Bố Cục Tạp Chí & Kỷ Niệm (Layout Mẫu)',
    name: '1 Ảnh Lớn + 2 Ảnh Nhỏ',
    shortName: '1 Lớn + 2 Nhỏ',
    photoCount: 3,
    description: '1 ảnh lớn tập thể phía trên và 2 ảnh khoảnh khắc phía dưới.',
    aspectRatio: '4/5',
    iconName: 'layout-grid',
  },
];

export interface FrameStyleOption {
  id: import('../types').FrameStyle;
  name: string;
  shortName: string;
  tag: string;
  description: string;
  previewBg: string;
  icon: string;
}

export const FRAME_STYLE_OPTIONS: FrameStyleOption[] = [
  {
    id: 'classic',
    name: 'Studio Tối Giản',
    shortName: 'Studio',
    tag: 'THANH LỊCH',
    description: 'Khung viền kem cao cấp với chữ dập nổi thanh lịch.',
    previewBg: 'bg-[#F9F7F2] text-[#1A1A1A]',
    icon: 'sparkles',
  },
  {
    id: 'instagram',
    name: 'Bài Đăng Instagram',
    shortName: 'Instagram',
    tag: 'MẠNG XÃ HỘI',
    description: 'Giao diện Instagram với avatar, nút tim, bình luận và hashtag.',
    previewBg: 'bg-white text-black',
    icon: 'instagram',
  },
  {
    id: 'magazine',
    name: 'Bìa Tạp Chí Thời Trang',
    shortName: 'Tạp Chí',
    tag: 'EDITORIAL',
    description: 'Phong cách bìa tạp chí Vogue nghệ thuật với mã vạch và tiêu đề.',
    previewBg: 'bg-[#1A1A1A] text-white',
    icon: 'book-open',
  },
  {
    id: 'onepiece-wanted',
    name: 'Lệnh Truy Nã One Piece',
    shortName: 'Truy Nã',
    tag: 'ANIME HOT',
    description: 'Giấy da cổ điển WANTED DEAD OR ALIVE với mức tiền thưởng Berries.',
    previewBg: 'bg-[#E5C38F] text-[#4A2E18]',
    icon: 'skull',
  },
  {
    id: 'cinema-film',
    name: 'Khung Phim Điện Ảnh 35mm',
    shortName: 'Phim 35mm',
    tag: 'CINEMA',
    description: 'Đục lỗ bánh răng phim 35mm hai bên cùng thông số Kodak Portra.',
    previewBg: 'bg-[#0F0F0F] text-[#E0C068]',
    icon: 'film',
  },
  {
    id: 'movie-ticket',
    name: 'Vé Xem Phim / Cuống Vé',
    shortName: 'Cuống Vé',
    tag: 'VINTAGE',
    description: 'Vết khuyết cuống vé, mã vạch Barcode và hóa đơn kỷ niệm.',
    previewBg: 'bg-[#FFFDF7] text-[#1A1A1A]',
    icon: 'ticket',
  },
  {
    id: 'polaroid',
    name: 'Polaroid / Instax Cổ Điển',
    shortName: 'Polaroid',
    tag: 'INSTAX',
    description: 'Khung viền đáy dày kinh điển với dòng chữ viết tay mềm mại.',
    previewBg: 'bg-[#FFFFFF] text-[#333333]',
    icon: 'camera',
  },
  {
    id: 'vinyl-cd',
    name: 'Đĩa Nhạc Vinyl / CD Cover',
    shortName: 'Đĩa Nhạc',
    tag: 'MUSIC',
    description: 'Rãnh đĩa than vinyl tròn bóng bẩy cùng danh sách bài hát Love Song.',
    previewBg: 'bg-[#2B2623] text-[#F3ECE4]',
    icon: 'disc',
  },
  {
    id: 'nutrition-label',
    name: 'Nhãn Dinh Dưỡng Kỷ Niệm',
    shortName: 'Dinh Dưỡng',
    tag: 'ĐỘC LẠ',
    description: 'Mô phỏng nhãn thành phần dinh dưỡng với danh sách "nguyên liệu" tình cảm và mã vạch.',
    previewBg: 'bg-white text-[#1A1A1A]',
    icon: 'tag',
  },
  {
    id: 'scrapbook',
    name: 'Sổ Lưu Niệm Cắt Dán',
    shortName: 'Lưu Niệm',
    tag: 'SCRAPBOOK',
    description: 'Nền phim cũ kiểu cuốn sổ cắt dán, có băng keo washi và vùng chữ viết tay.',
    previewBg: 'bg-[#EFE7D8] text-[#3A332A]',
    icon: 'pen-line',
  },
  {
    id: 'concert-ticket',
    name: 'Vé Concert / Bookmark',
    shortName: 'Vé Concert',
    tag: 'K-POP',
    description: 'Dạng vé dài hẹp có danh sách bài hát, viền răng cưa và ô mã QR trang trí.',
    previewBg: 'bg-[#1A1A2E] text-[#F5D67B]',
    icon: 'qr-code',
  },
  {
    id: 'vinyl-foldcard',
    name: 'Thiệp Gấp Đĩa Nhạc',
    shortName: 'Thiệp Đĩa',
    tag: 'FOLD CARD',
    description: 'In phẳng 1 tấm có đường gấp đôi ở giữa — 1 bên là đĩa than, 1 bên là ảnh. Khách tự gấp lại.',
    previewBg: 'bg-[#2B2623] text-[#F3ECE4]',
    icon: 'disc-3',
  },
  {
    id: 'branded-foldcard',
    name: 'Thiệp Gấp Thương Hiệu',
    shortName: 'Thiệp Gấp',
    tag: 'FOLD CARD',
    description: 'In phẳng có đường gấp đôi — 1 bên là bìa thương hiệu/logo sự kiện, 1 bên là ảnh Polaroid.',
    previewBg: 'bg-[#1A1A1A] text-white',
    icon: 'award',
  },
  {
    id: 'train-ticket',
    name: 'Vé Tàu Kỷ Niệm',
    shortName: 'Vé Tàu',
    tag: 'VÉ TÀU',
    description: 'Vé giấy viền răng cưa, có ô khung ảnh dạng "khe nhét" và dấu mộc kỷ niệm.',
    previewBg: 'bg-[#F5F0E4] text-[#4A3A24]',
    icon: 'train-front',
  },
];

// Bộ sticker (nhãn dán) cho khách kéo thả trang trí lên tờ ảnh ở màn Biên Tập — dùng emoji thay vì
// ảnh PNG rời để không phụ thuộc mạng/tải file, vừa hiển thị trên màn hình vừa vẽ lại được thẳng
// vào canvas in 300 DPI (ctx.fillText) mà không mất chất lượng dù phóng to.
export const STICKER_EMOJIS: string[] = [
  '❤️', '💕', '⭐', '✨', '🎉', '🎊', '🎈', '👑',
  '😂', '😍', '😎', '🥳', '😘', '🤍', '🌸', '🌈',
  '🔥', '💯', '👍', '🙌', '💋', '🎀', '🍰', '📸',
];
