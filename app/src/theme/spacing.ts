export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16,
  xl: 20, '2xl': 24, '3xl': 32, '4xl': 40,
} as const;

export const radii = {
  sm: 6, md: 12, lg: 16, xl: 20, '2xl': 24, full: 9999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
} as const;
