const tintColorLight = '#007AFF';
const tintColorDark = '#fff';
const accentColor = '#007AFF'; // The new accent color for buttons

export default {
  light: {
    text: '#333',
    background: '#F2F2F7',
    tint: tintColorLight,
    accent: accentColor, // Add accent here
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    card: '#fff',
    borderColor: '#E5E5EA',
    inputBackground: '#F9F9F9',
    subtleText: '#666',
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark, // This remains white for tab icons
    accent: accentColor, // Add accent here (it's blue)
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
    card: '#1C1C1E',
    borderColor: '#38383A',
    inputBackground: '#2C2C2E',
    subtleText: '#999',
  },
};