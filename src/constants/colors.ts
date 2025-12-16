const palette = {
  primary: '#007AFF',
  white: '#fff',
  black: '#000',
  success: '#34C759',
  successDark: '#32D74B',
  danger: '#FF3B30',
  dangerDark: '#FF453A',
  warning: '#FF9500',
  info: '#5AC8FA',
  gray1: '#8E8E93',
  gray2: '#AEAEB2',
  gray3: '#C7C7CC',
  gray4: '#D1D1D6',
  gray5: '#E5E5EA',
  gray6: '#F2F2F7',
  grayDark1: '#8E8E93',
  grayDark2: '#636366',
  grayDark3: '#48484A',
  grayDark4: '#3A3A3C',
  grayDark5: '#2C2C2E',
  grayDark6: '#1C1C1E',
  charts: [
    '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'
  ]
};

const tintColorLight = palette.primary;
const tintColorDark = palette.primary;
const accentColor = palette.primary;

export default {
  light: {
    text: '#333',
    background: palette.gray6,
    tint: tintColorLight,
    accent: accentColor,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    card: palette.white,
    borderColor: palette.gray5,
    inputBackground: '#F9F9F9',
    subtleText: '#666',
    income: palette.success,
    expense: palette.danger,
    transfer: palette.warning,
    charts: palette.charts,
    icon: '#000',
  },
  dark: {
    text: palette.white,
    background: palette.black,
    tint: tintColorDark,
    accent: accentColor,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
    card: palette.grayDark6,
    borderColor: '#38383A',
    inputBackground: palette.grayDark5,
    subtleText: '#999',
    income: palette.successDark,
    expense: palette.dangerDark,
    transfer: palette.warning,
    charts: palette.charts,
    icon: palette.white,
  },
};