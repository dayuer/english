export const typography = {
  family: 'Inter',
  sizes: {
    xs: 11, sm: 13, base: 15, md: 16,
    lg: 18, xl: 22, '2xl': 28, '3xl': 32, display: 48,
  },
  weights: {
    regular: '400', medium: '500',
    semibold: '600', bold: '700', extrabold: '800',
  },
  lineHeights: {
    tight: 18, normal: 22, relaxed: 26, spacious: 28, loose: 32,
  },
} as const;
