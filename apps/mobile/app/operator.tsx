import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getOperatorSafetyReports, reviewSafetyReport } from '@/lib/activity-repository';
import type { OperatorSafetyReport, SafetyReportStatus } from '@/types/safety';

const REPORT_STATUSES: SafetyReportStatus[] = ['open', 'reviewing', 'resolved', 'dismissed'];

export default function OperatorScreen() {
  const [reports, setReports] = useState<OperatorSafetyReport[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<SafetyReportStatus>('open');

  const load = useCallback(async () => {
    setStatus('loading');
    const result = await getOperatorSafetyReports(selectedStatus);
    if (!result.ok) { setMessage(result.message); setStatus('error'); return; }
    setReports(result.reports); setMessage(null); setStatus('ready');
  }, [selectedStatus]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function decide(report: OperatorSafetyReport, decision: SafetyReportStatus) {
    setWorkingId(report.reportId);
    const result = await reviewSafetyReport(report.reportId, decision, decision === 'resolved' ? 'Reviewed by operator.' : '');
    setWorkingId(null);
    if (!result.ok) { setMessage(result.message); return; }
    await load();
  }

  function confirmDecision(report: OperatorSafetyReport, decision: SafetyReportStatus) {
    const label = decision === 'open' ? 'Reopen' : decision === 'reviewing' ? 'Mark reviewing' : decision === 'resolved' ? 'Resolve' : 'Dismiss';
    Alert.alert(label, `Change report ${report.reportId.slice(0, 8)} to ${decision}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, onPress: () => void decide(report, decision) },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>PRIVATE OPERATIONS</Text>
        <Text style={styles.title}>Safety review</Text>
        <Text style={styles.subtitle}>This screen is useful only to accounts explicitly provisioned as operators. The database remains the authorization boundary.</Text>
        <View style={styles.filters}>
          {REPORT_STATUSES.map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selectedStatus === item }}
              key={item}
              onPress={() => setSelectedStatus(item)}
              style={[styles.filter, selectedStatus === item && styles.filterSelected]}>
              <Text style={[styles.filterText, selectedStatus === item && styles.filterTextSelected]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        {status === 'loading' && <ActivityIndicator color="#FF6B4A" style={styles.spinner} />}
        {message && <View style={styles.error}><Text style={styles.errorText}>{message}</Text></View>}
        {status === 'ready' && reports.length === 0 && <Text style={styles.empty}>No {selectedStatus} reports.</Text>}
        {reports.map((report) => (
          <View key={report.reportId} style={styles.card}>
            <View style={styles.cardHeader}><Text style={styles.reason}>{report.reason}</Text><Text style={styles.status}>{report.status}</Text></View>
            <Text style={styles.detail}>{report.details || 'No additional details.'}</Text>
            <Text style={styles.meta}>Created {new Date(report.createdAt).toLocaleString()}</Text>
            {report.resolution && <Text style={styles.resolution}>Resolution: {report.resolution}</Text>}
            <View style={styles.actions}>
              {report.status !== 'reviewing' && <Action label="Review" disabled={workingId !== null} onPress={() => confirmDecision(report, 'reviewing')} />}
              {report.status !== 'resolved' && <Action label="Resolve" disabled={workingId !== null} onPress={() => confirmDecision(report, 'resolved')} />}
              {report.status !== 'dismissed' && <Action label="Dismiss" disabled={workingId !== null} onPress={() => confirmDecision(report, 'dismissed')} />}
              {(report.status === 'resolved' || report.status === 'dismissed') && <Action label="Reopen" disabled={workingId !== null} onPress={() => confirmDecision(report, 'open')} />}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, disabled && styles.disabled]}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F7F4EE', flex: 1 },
  content: { padding: 24 },
  eyebrow: { color: '#FF6B4A', fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginTop: 20 },
  title: { color: '#16202A', fontSize: 34, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#66717D', fontSize: 14, lineHeight: 21, marginTop: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  filter: { borderColor: 'rgba(22,32,42,0.14)', borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  filterSelected: { backgroundColor: '#16202A', borderColor: '#16202A' },
  filterText: { color: '#66717D', fontSize: 11, fontWeight: '900', textTransform: 'capitalize' },
  filterTextSelected: { color: '#FFFFFF' },
  spinner: { marginTop: 28 },
  error: { backgroundColor: '#FBE4DF', borderRadius: 14, marginTop: 20, padding: 14 },
  errorText: { color: '#9D3E2B', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  empty: { color: '#66717D', fontSize: 14, marginTop: 28 },
  card: { backgroundColor: '#FFFFFF', borderColor: 'rgba(22,32,42,0.08)', borderRadius: 18, borderWidth: 1, marginTop: 18, padding: 16 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  reason: { color: '#16202A', flex: 1, fontSize: 15, fontWeight: '900' },
  status: { color: '#66717D', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  detail: { color: '#394652', fontSize: 13, lineHeight: 19, marginTop: 9 },
  meta: { color: '#8A929A', fontSize: 11, marginTop: 12 },
  resolution: { color: '#66717D', fontSize: 12, lineHeight: 18, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  action: { borderColor: 'rgba(22,32,42,0.16)', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  actionText: { color: '#16202A', fontSize: 11, fontWeight: '900' },
  disabled: { opacity: 0.45 },
});
