import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ChatMessage } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { Banner } from '../../src/components/Banner';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { api } from '../../src/lib/api';
import { useTheme, type AppTheme } from '../../src/theme';

const POLL_MS = 4000;

/**
 * 1:1 chat thread. Open with either:
 *  - { conversationId } to resume an existing thread, or
 *  - { tripId, studentUserId?, title? } to open/create the trip thread.
 */
export default function Chat() {
  const { t } = useI18n();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const params = useLocalSearchParams<{ conversationId?: string; tripId?: string; studentUserId?: string; title?: string }>();

  const [conversationId, setConversationId] = useState<string | null>(params.conversationId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Resolve the conversation id (open the trip thread if needed).
  useEffect(() => {
    let active = true;
    (async () => {
      if (conversationId) return;
      if (!params.tripId) {
        setError(t('chat.loadError'));
        return;
      }
      try {
        const conv = await api.chat.openForTrip(params.tripId, params.studentUserId);
        if (active) setConversationId(conv.id);
      } catch (e) {
        if (active) setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('chat.loadError'));
      }
    })();
    return () => { active = false; };
  }, [conversationId, params.tripId, params.studentUserId, t]);

  const load = useCallback(async () => {
    if (!conversationId) return;
    try {
      const list = await api.chat.messages(conversationId);
      setMessages(list);
      void api.chat.markRead(conversationId).catch(() => undefined);
    } catch {
      /* transient */
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [conversationId, load]);

  const send = async () => {
    const body = text.trim();
    if (!body || !conversationId) return;
    setSending(true);
    setText('');
    try {
      const msg = await api.chat.send(conversationId, body);
      setMessages((prev) => [...prev, msg]);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('common.error'));
      setText(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevron-right" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{params.title ?? t('chat.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <Banner message={error} />

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={s.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<Text style={s.empty}>{t('chat.empty')}</Text>}
          renderItem={({ item }) => (
            <View style={[s.bubbleRow, item.mine ? s.mineRow : s.theirsRow]}>
              <View style={[s.bubble, item.mine ? s.mine : s.theirs]}>
                <Text style={[s.bubbleText, item.mine && s.bubbleTextMine]}>{item.body}</Text>
                {item.created_at ? (
                  <Text style={[s.time, item.mine && s.timeMine]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        />

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={theme.colors.muted}
            multiline
          />
          <Pressable onPress={send} disabled={sending || !text.trim()} style={[s.sendBtn, (sending || !text.trim()) && s.sendDisabled]}>
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
    header: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.sm, borderBottomWidth: 1, borderBottomColor: t.colors.border, backgroundColor: t.colors.surface },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontFamily: t.fontFamily.bold, fontSize: 17, color: t.colors.text },
    list: { padding: t.spacing.md, flexGrow: 1 },
    empty: { textAlign: 'center', color: t.colors.textSecondary, fontFamily: t.fontFamily.regular, marginTop: t.spacing['2xl'] },
    bubbleRow: { marginBottom: t.spacing.sm, flexDirection: 'row' },
    mineRow: { justifyContent: 'flex-start' },
    theirsRow: { justifyContent: 'flex-end' },
    bubble: { maxWidth: '80%', borderRadius: t.radius.lg, paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.sm },
    mine: { backgroundColor: t.colors.primary, borderBottomLeftRadius: 4 },
    theirs: { backgroundColor: t.colors.card, borderWidth: 1, borderColor: t.colors.border, borderBottomRightRadius: 4 },
    bubbleText: { fontFamily: t.fontFamily.regular, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    bubbleTextMine: { color: t.colors.onPrimary },
    time: { fontFamily: t.fontFamily.regular, fontSize: 10, color: t.colors.textSecondary, textAlign: 'left', marginTop: 4 },
    timeMine: { color: t.colors.onPrimary, opacity: 0.8 },
    inputBar: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8, padding: t.spacing.sm, borderTopWidth: 1, borderTopColor: t.colors.border, backgroundColor: t.colors.surface },
    input: { flex: 1, maxHeight: 120, backgroundColor: t.colors.background, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, paddingHorizontal: t.spacing.md, paddingVertical: 10, fontFamily: t.fontFamily.regular, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
    sendDisabled: { opacity: 0.5 },
  });
