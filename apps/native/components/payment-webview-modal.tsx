import { useCallback, useRef } from "react";
import { Modal, SafeAreaView, StyleSheet } from "react-native";
import type { WebViewNavigation } from "react-native-webview";
import { WebView } from "react-native-webview";

type PaymentResult = "success" | "fail" | "cancel";

interface PaymentWebViewModalProps {
  cancelUrl: string;
  failUrl: string;
  gatewayUrl: string;
  onResult: (result: PaymentResult, tranId?: string) => void;
  successUrl: string;
  visible: boolean;
}

function extractTranId(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.searchParams.get("tran_id") ?? undefined;
  } catch {
    return;
  }
}

export function PaymentWebViewModal({
  visible,
  gatewayUrl,
  successUrl,
  failUrl,
  cancelUrl,
  onResult,
}: PaymentWebViewModalProps) {
  const resolved = useRef(false);

  const handleNavigationChange = useCallback(
    (nav: WebViewNavigation) => {
      if (resolved.current) {
        return;
      }
      const url = nav.url;

      if (url.startsWith(successUrl)) {
        resolved.current = true;
        onResult("success", extractTranId(url));
      } else if (url.startsWith(failUrl)) {
        resolved.current = true;
        onResult("fail", extractTranId(url));
      } else if (url.startsWith(cancelUrl)) {
        resolved.current = true;
        onResult("cancel", extractTranId(url));
      }
    },
    [successUrl, failUrl, cancelUrl, onResult]
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!resolved.current) {
          resolved.current = true;
          onResult("cancel");
        }
      }}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView style={styles.container}>
        <WebView
          onNavigationStateChange={handleNavigationChange}
          source={{ uri: gatewayUrl }}
          startInLoadingState
          style={styles.webview}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  webview: { flex: 1 },
});
