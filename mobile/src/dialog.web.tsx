import React, { useCallback, useEffect, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, radius, shadows, spacing } from "./theme";
import type { DialogButton } from "./dialogTypes";

export type { DialogButton };

interface DialogState {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

let pending: DialogState | null = null;
let notify: (() => void) | null = null;

export function showDialog(title: string, message?: string, buttons?: DialogButton[]): void {
  pending = {
    title,
    message,
    buttons: buttons && buttons.length ? buttons : [{ text: "OK" }],
  };
  notify?.();
}

/**
 * Renders the dialog queue imperatively. Mount once near the app root; call
 * `showDialog` from anywhere to open it.
 */
export function DialogHost() {
  const [state, setState] = useState<DialogState | null>(null);

  useEffect(() => {
    notify = () => setState(pending ? { ...pending } : null);
    notify();
    return () => {
      notify = null;
    };
  }, []);

  const dismiss = useCallback(() => {
    pending = null;
    setState(null);
  }, []);

  useEffect(() => {
    if (!state || Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, dismiss]);

  const press = useCallback(
    (button: DialogButton) => {
      dismiss();
      button.onPress?.();
    },
    [dismiss],
  );

  return (
    <Modal
      visible={state !== null}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={[styles.card, shadows.lg]} onPress={() => {}}>
          <Text style={styles.title}>{state?.title}</Text>
          {state?.message ? <Text style={styles.message}>{state.message}</Text> : null}
          <View style={styles.actions}>
            {state?.buttons.map((button, i) => (
              <Pressable
                key={`${button.text}-${i}`}
                onPress={() => press(button)}
                style={({ pressed }) => [
                  styles.action,
                  button.style === "destructive" && styles.actionDestructive,
                  pressed && styles.actionPressed,
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    button.style === "destructive" && styles.actionTextDestructive,
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  action: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionDestructive: {
    backgroundColor: colors.dangerBg,
    borderColor: "#FECACA",
  },
  actionPressed: {
    opacity: 0.65,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.primary,
  },
  actionTextDestructive: {
    color: colors.dangerDark,
  },
});
