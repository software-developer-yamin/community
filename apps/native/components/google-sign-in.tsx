import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

export function GoogleSignIn() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);

    await authClient.signIn.social(
      { provider: "google" },
      {
        onError(error) {
          console.error("Google sign-in failed", error);
          setLoading(false);
        },
        onSuccess() {
          setLoading(false);
          queryClient.refetchQueries();
          // On native, the social sign-in typically opens a browser and
          // redirects back through a deep link; success here means the flow
          // completed and the session is active.
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        disabled={loading}
        onPress={handleGoogleSignIn}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Sign In with Google</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    marginTop: 16,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "500",
  },
}));
