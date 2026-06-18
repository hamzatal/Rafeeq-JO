import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AiMessage } from '@rafeeq/shared';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';
import { Icon } from '../../src/components/Icon';
import { EmptyState } from '../../src/components/ui';

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
  }, [messages]);

  const send = async () => {
    const text = input.trim();
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

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View style={s.botIcon}><Icon name="message-circle" size={20} color={theme.colors.onPrimary} /></View>
        <Text style={s.title}>{t('assistant.title')}</Text>
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={s.messages} showsVerticalScrollIndicator={false}>
          {messages.length === 0 ? (
            <EmptyState icon="message-circle" title={t('assistant.empty')} />
          ) : (
            messages.map((m) => (
              <View key={m.id} style={[s.bubble, m.role === 'user' ? s.userBubble : s.botBubble]}>
                <Text style={[s.bubbleText, m.role === 'user' && s.userText]}>{m.content}</Text>
              </View>
            ))
          )}
          {sending && <Text style={s.typing}>…</Text>}
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
          <Pressable onPress={send} disabled={sending} style={s.sendBtn}>
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
    header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: t.spacing.lg, paddingBottom: t.spacing.sm },
    botIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: t.fontFamily.extrabold, fontSize: 20, color: t.colors.text },
    messages: { padding: t.spacing.lg, gap: t.spacing.sm, flexGrow: 1 },
    bubble: { maxWidth: '85%', borderRadius: t.radius.lg, padding: t.spacing.md },
    userBubble: { alignSelf: 'flex-start', backgroundColor: t.colors.primary, borderBottomLeftRadius: 4 },
    botBubble: { alignSelf: 'flex-end', backgroundColor: t.colors.card, borderWidth: 1, borderColor: t.colors.border, borderBottomRightRadius: 4 },
    bubbleText: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.text, textAlign: 'right', lineHeight: 21 },
    userText: { color: t.colors.onPrimary },
    typing: { fontFamily: t.fontFamily.bold, fontSize: 20, color: t.colors.muted, textAlign: 'right' },
    inputRow: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8, padding: t.spacing.base, borderTopWidth: 1, borderTopColor: t.colors.border, backgroundColor: t.colors.surface },
    input: { flex: 1, maxHeight: 110, minHeight: 44, backgroundColor: t.colors.background, borderRadius: t.radius.lg, paddingHorizontal: t.spacing.base, paddingTop: 12, fontFamily: t.fontFamily.regular, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  });
