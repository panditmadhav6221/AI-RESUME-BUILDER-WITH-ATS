import { Alert } from "react-native";

import type { DialogButton } from "./dialogTypes";

export type { DialogButton };

/**
 * Native uses the platform alert sheet. The web build swaps in a rendered
 * modal (see dialog.web.tsx) because react-native-web's Alert is a no-op stub.
 */
export function showDialog(title: string, message?: string, buttons?: DialogButton[]): void {
  Alert.alert(title, message, buttons);
}

/** No-op on native; the web host needs a mounted tree to render its modal. */
export function DialogHost(): null {
  return null;
}
