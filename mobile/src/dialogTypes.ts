export interface DialogButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}
