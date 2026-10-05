// react-native-web ignores the legacy shadow* props and warns about them,
// so the web build renders equivalent CSS shadows instead.
export const shadows = {
  sm: { boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)" },
  md: { boxShadow: "0 4px 8px rgba(15, 23, 42, 0.08)" },
  lg: { boxShadow: "0 8px 16px rgba(15, 23, 42, 0.12)" },
};
