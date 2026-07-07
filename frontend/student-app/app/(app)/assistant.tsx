import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AiMessage } from '@rafeeq/shared';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';
import { Icon } from '../../src/components/Icon';

/** Small pulsing teal dot — signals the AI is online / thinking (Stitch). */
function PulseDot({ color, size = 8 }: { color: string; size?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [a]);
  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] });
  const opacity = a.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  return <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ scale }], opacity }} />;
}

export default function Assistant() {
  const { t } = useI18n();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, sending]);

  const sendText = async (text: string) => {
    if (!text || sending) return;
    setInput('');
    const optimistic: AiMessage = { id: `tmp-${Date.now()}`, conversation_id: conversationId ?? '', role: 'user', content: text, created_at: null };
    setMessages((m) => [...m, optimistic]);
    setSending(true);
    try {
      const reply = await api.assistant.send(text, conversationId);
      setConversationId(reply.conversation_id);
      setMessages((m) => [...m, reply.message]);
    } catch {
      setMessages((m) => [...m, { id: `err-${Date.now()}`, conversation_id: '', role: 'assistant', content: t('common.error'), created_at: null }]);
    } finally {
      setSending(false);
    }
  };

  const suggestions = [t('assistant.suggest1'), t('assistant.suggest2'), t('assistant.suggest3')];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header with AI identity + online pulse */}
      <View style={s.header}>
        <View style={s.botIcon}>
          <Icon name="message-circle" size={22} color={theme.colors.onPrimary} />
          <View style={s.onlineRing}>
            <PulseDot color={theme.colors.accent} size={9} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t('assistant.title')}</Text>
          <View style={s.onlineRow}>
            <PulseDot color={theme.colors.accent} size={6} />
            <Text style={s.online}>{t('assistant.online')}</Text>
          </View>
        </View>
      </View>
      <View style={s.gradientBar} />

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={s.messages} showsVerticalScrollIndicator={false}>
          {messages.length === 0 ? (
            <View style={s.welcome}>
              <View style={s.welcomeIcon}>
                <Icon name="message-circle" size={30} color={theme.colors.primary} />
              </View>
              <Text style={s.welcomeText}>{t('assistant.empty')}</Text>
              <View style={s.suggestions}>
                {suggestions.map((sug) => (
                  <Pressable key={sug} onPress={() => sendText(sug)} style={({ pressed }) => [s.suggestChip, pressed && { opacity: 0.7 }]}>
                    <Icon name="corner-down-left" size={14} color={theme.colors.accent} />
                    <Text style={s.suggestText}>{sug}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            messages.map((m) => (
              <View key={m.id} style={[s.bubble, m.role === 'user' ? s.userBubble : s.botBubble]}>
                <Text style={[s.bubbleText, m.role === 'assistant' && s.botText]}>{m.content}</Text>
              </View>
            ))
          )}
          {sending && (
            <View style={[s.bubble, s.botBubble, s.typingBubble]}>
              <PulseDot color={theme.colors.accent} size={7} />
              <Text style={s.typingText}>{t('assistant.thinking')}</Text>
            </View>
          )}
        </ScrollView>

        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={t('assistant.placeholder')}
            placeholderTextColor={theme.colors.muted}
            multiline
          />
          <Pressable onPress={() => sendText(input.trim())} disabled={sending} style={s.sendBtn}>
            <Icon name="send" size={20} color={theme.colors.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    flex: { flex: 1 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md },
    botIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    onlineRing: { position: 'absolute', bottom: -2, left: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.primary, textAlign: 'right' },
    onlineRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 2 },
    online: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.accent },
    // Gradient-like accent bar under the header (navy → teal) via layered views.
    gradientBar: { height: 2, backgroundColor: t.colors.accent, opacity: 0.5 },

    messages: { padding: t.spacing.lg, gap: t.spacing.sm, flexGrow: 1 },
    bubble: { maxWidth: '85%', borderRadius: t.radius.lg, paddingHorizontal: t.spacing.base, paddingVertical: t.spacing.md },
    // User = light gray (dark text); AI = navy (white text) — per Stitch DESIGN.
    userBubble: { alignSelf: 'flex-start', backgroundColor: '#F0F3FF', borderBottomLeftRadius: 4 },
    botBubble: { alignSelf: 'flex-end', backgroundColor: t.colors.primary, borderBottomRightRadius: 4 },
    bubbleText: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.text, textAlign: 'right', lineHeight: 22 },
    botText: { color: t.colors.onPrimary },
    typingBubble: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    typingText: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.onPrimary },

    welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing.base, paddingTop: t.spacing['3xl'] },
    welcomeIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    welcomeText: { fontFamily: t.fontFamily.regular, fontSize: 15, lineHeight: 24, color: t.colors.textSecondary, textAlign: 'center', maxWidth: 300 },
    suggestions: { gap: t.spacing.sm, marginTop: t.spacing.sm, alignSelf: 'stretch' },
    suggestChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.hairline, borderRadius: t.radius.md, paddingHorizontal: t.spacing.base, paddingVertical: 12 },
    suggestText: { flex: 1, fontFamily: t.fontFamily.semibold, fontSize: 14, color: t.colors.primary, textAlign: 'right' },

    inputRow: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8, padding: t.spacing.base, borderTopWidth: 1, borderTopColor: t.colors.hairline, backgroundColor: t.colors.surface },
    input: { flex: 1, maxHeight: 110, minHeight: 48, backgroundColor: '#F0F3FF', borderRadius: t.radius.md, paddingHorizontal: t.spacing.base, paddingTop: 13, fontFamily: t.fontFamily.regular, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  });
