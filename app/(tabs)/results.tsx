import {
  AppHeader,
  Card,
  InfoRow,
  MetricCard,
  ScreenContainer,
  StatusBadge,
} from "@/components/ElectionUI";
import { mockPollingUnits, parties, publicResults } from "@/assets/constants/data";
import { styled } from "nativewind";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

export default function Results() {
  const [selectedPuId, setSelectedPuId] = useState(mockPollingUnits[0].id);
  const selectedPu = useMemo(
    () => mockPollingUnits.find((unit) => unit.id === selectedPuId) ?? mockPollingUnits[0],
    [selectedPuId],
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScreenContainer padded={false}>
        <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-30 pt-5">
          <AppHeader title="Public Results" subtitle="Neutral election monitoring and location exploration." />
          <Card className="gap-4 bg-primary">
            <Text className="text-sm font-sans-semibold text-white/70">National Collation Progress</Text>
            <Text className="text-5xl font-sans-extrabold text-white">{publicResults.nationalProgress}%</Text>
            <View className="h-3 overflow-hidden rounded-full bg-white/20">
              <View className="h-full rounded-full bg-gold" style={{ width: `${publicResults.nationalProgress}%` }} />
            </View>
            <Text className="text-sm font-sans-medium text-white/75">
              {publicResults.pollingUnitsReported.toLocaleString()} of {publicResults.pollingUnitsTotal.toLocaleString()} polling units reported
            </Text>
          </Card>

          <View className="flex-row gap-3">
            <MetricCard label="Reported PUs" value={publicResults.pollingUnitsReported.toLocaleString()} />
            <MetricCard label="States" value={publicResults.statesReported} />
            <MetricCard label="LGAs" value={publicResults.lgasReported} />
          </View>

          <Card className="gap-4">
            <Text className="text-lg font-sans-bold text-primary">Leading Parties</Text>
            {publicResults.leadingParties.map((item) => (
              <View key={item.party.id} className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="font-sans-bold text-primary">{item.party.abbreviation}</Text>
                  <Text className="font-sans-bold text-primary">{item.percentage}%</Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-muted">
                  <View className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.party.color }} />
                </View>
              </View>
            ))}
          </Card>

          <Card className="gap-4">
            <Text className="text-lg font-sans-bold text-primary">Location Explorer</Text>
            <View className="flex-row gap-2">
              {["Lagos", "Ikeja", "Ward 07"].map((item) => (
                <View key={item} className="rounded-xl border border-border bg-background px-3 py-2">
                  <Text className="text-xs font-sans-bold text-primary">{item}</Text>
                </View>
              ))}
            </View>
            {mockPollingUnits.map((unit) => (
              <Pressable
                key={unit.id}
                className={`rounded-xl border p-3 ${selectedPuId === unit.id ? "border-accent bg-accent/10" : "border-border bg-background"}`}
                onPress={() => setSelectedPuId(unit.id)}
              >
                <View className="flex-row items-center justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="font-sans-bold text-primary">{unit.name}</Text>
                    <Text className="text-xs font-sans-medium text-muted-foreground">
                      {unit.state} • {unit.lga} • {unit.ward}
                    </Text>
                  </View>
                  <StatusBadge status={unit.reportedStatus} />
                </View>
              </Pressable>
            ))}
          </Card>

          <Card className="gap-3">
            <Text className="text-lg font-sans-bold text-primary">Polling Unit Result</Text>
            <InfoRow label="Polling Unit" value={selectedPu.name} />
            <InfoRow label="Code" value={selectedPu.code} />
            <InfoRow label="Election" value={publicResults.activeElection.name} />
            <StatusBadge status={selectedPu.reportedStatus} />
            {parties.map((party, index) => (
              <InfoRow key={party.id} label={party.abbreviation} value={[132, 87, 45, 22, 10][index]} />
            ))}
            <InfoRow label="Valid votes" value={296} />
            <InfoRow label="Rejected votes" value={16} />
            <InfoRow label="Reported" value="11:23 AM" />
          </Card>
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
