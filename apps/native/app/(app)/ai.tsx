import { useChat } from "@ai-sdk/react";
import { env } from "@community/env/native";
import { Ionicons } from "@expo/vector-icons";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  type TextInputSubmitEditingEvent,
  TouchableOpacity,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Container } from "@/components/container";

const generateAPIUrl = (relativePath: string) => {
  const serverUrl = env.EXPO_PUBLIC_SERVER_URL;
  if (!serverUrl) {
    throw new Error(
      "EXPO_PUBLIC_SERVER_URL environment variable is not defined"
    );
  }
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return serverUrl.concat(path);
};

export default function AIScreen() {
  const { theme } = useUnistyles();
  const [input, setInput] = useState("");
  const { messages, error, sendMessage } = useChat({
    onError: (chatError) => console.error(chatError, "AI Chat Error"),
    transport: new DefaultChatTransport({
      api: generateAPIUrl("/ai"),
    }),
  });

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const onSubmit = useCallback(() => {
    const value = input.trim();
    if (value) {
      sendMessage({ text: value });
      setInput("");
    }
  }, [input, sendMessage]);

  const handleSubmitEditing = useCallback(
    (e: TextInputSubmitEditingEvent) => {
      e.preventDefault();
      onSubmit();
    },
    [onSubmit]
  );

  if (error) {
    return (
      <Container>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error.message}</Text>
          <Text style={styles.errorSubtext}>
            Please check your connection and try again.
          </Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>AI Chat</Text>
            <Text style={styles.headerSubtitle}>
              Chat with our AI assistant
            </Text>
          </View>

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            style={styles.messagesContainer}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Ask me anything to get started!
                </Text>
              </View>
            ) : (
              <View style={styles.messagesWrapper}>
                {messages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageContainer,
                      message.role === "user"
                        ? styles.userMessage
                        : styles.assistantMessage,
                    ]}
                  >
                    <Text style={styles.messageRole}>
                      {message.role === "user" ? "You" : "AI Assistant"}
                    </Text>
                    <View style={styles.messageContentWrapper}>
                      {message.parts.map((part) => {
                        if (part.type === "text") {
                          return (
                            <Text
                              key={`${message.id}-text-${part.text}`}
                              style={styles.messageContent}
                            >
                              {part.text}
                            </Text>
                          );
                        }
                        return (
                          <Text
                            key={`${message.id}-${JSON.stringify(part)}`}
                            style={styles.messageContent}
                          >
                            {JSON.stringify(part)}
                          </Text>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <TextInput
                autoFocus={true}
                onChangeText={setInput}
                onSubmitEditing={handleSubmitEditing}
                placeholder="Type your message..."
                placeholderTextColor={theme.colors.border}
                style={styles.textInput}
                value={input}
              />
              <TouchableOpacity
                disabled={!input.trim()}
                onPress={onSubmit}
                style={[
                  styles.sendButton,
                  !input.trim() && styles.sendButtonDisabled,
                ]}
              >
                <Ionicons
                  color={
                    input.trim() ? theme.colors.background : theme.colors.border
                  }
                  name="send"
                  size={20}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
}

const styles = StyleSheet.create((theme) => ({
  assistantMessage: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    marginRight: theme.spacing.xl,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  emptyContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  emptyText: {
    color: theme.colors.typography,
    fontSize: 18,
    textAlign: "center",
  },
  errorContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
  },
  errorSubtext: {
    color: theme.colors.typography,
    fontSize: 16,
    textAlign: "center",
  },
  errorText: {
    color: theme.colors.destructive,
    fontSize: 18,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerSubtitle: {
    color: theme.colors.typography,
    fontSize: 16,
  },
  headerTitle: {
    color: theme.colors.typography,
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: theme.spacing.sm,
  },
  inputContainer: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  inputSection: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    paddingTop: theme.spacing.md,
  },
  messageContainer: {
    borderRadius: 8,
    padding: theme.spacing.md,
  },
  messageContent: {
    color: theme.colors.typography,
    lineHeight: 20,
  },
  messageContentWrapper: {
    gap: theme.spacing.xs,
  },
  messageRole: {
    color: theme.colors.typography,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
  },
  messagesContainer: {
    flex: 1,
    marginBottom: theme.spacing.md,
  },
  messagesWrapper: {
    gap: theme.spacing.md,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    padding: theme.spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  textInput: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: theme.colors.typography,
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: `${theme.colors.primary}20`,
    marginLeft: theme.spacing.xl,
  },
}));
