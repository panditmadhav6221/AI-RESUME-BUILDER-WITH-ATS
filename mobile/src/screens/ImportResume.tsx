import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { aiApi } from "../api";
import {
  Button,
  Card,
  ErrorBanner,
  Loading,
  SectionHeading,
  TextField,
} from "../components";
import { useNav } from "../navigation";
import { colors, fontSize, radius, shadows, spacing } from "../theme";

const SAMPLE_RAW_RESUME = `Alex Chen
San Francisco, CA | alex.chen@example.com | (555) 345-6789 | linkedin.com/in/alexchen

PROFESSIONAL SUMMARY
Senior Full-Stack Engineer with 6+ years of experience architecting resilient cloud platforms and high-throughput web applications. Expert in React, TypeScript, Node.js, and AWS.

EXPERIENCE
Senior Software Engineer | Stripe | San Francisco, CA | 03/2021 - Present
- Architected and led payment orchestration microservices handling $40M+ daily volume with 99.99% availability.
- Reduced checkout transaction latency by 38% through Redis caching and query optimization.
- Mentored 5 junior engineers and standardized TypeScript and automated unit testing across 3 core teams.

Software Engineer | Uber | Seattle, WA | 06/2018 - 02/2021
- Developed real-time dispatch dashboard utilizing React, WebSockets, and Go, serving 150K+ active drivers.
- Spearheaded database sharding initiative that cut query timeouts by 52% during peak rush hours.

EDUCATION
University of Washington | Bachelor of Science in Computer Science | 09/2014 - 05/2018 | GPA: 3.8

SKILLS
JavaScript, TypeScript, React, Node.js, Python, Go, AWS, Docker, Kubernetes, PostgreSQL, Redis, GraphQL

PROJECTS
CloudScale: Open-source distributed load testing framework with 1,200+ GitHub stars. Built with Go & Docker.`;

export function ImportResumeScreen() {
  const { navigate } = useNav();
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const handleImport = async () => {
    if (!rawText.trim()) {
      setError("Please paste your resume or LinkedIn profile text first.");
      return;
    }
    setBusy("AI parsing your career history…");
    setError("");
    try {
      const parsed = await aiApi.parseRawResume(rawText);
      const title =
        parsed.experience[0]?.position ||
        (parsed.contact.fullName ? `${parsed.contact.fullName}'s Resume` : "Imported Resume");
      const targetRole = parsed.experience[0]?.position ?? null;

      Alert.alert(
        "Import Successful! 🎉",
        `Parsed ${parsed.experience.length} experience positions, ${parsed.education.length} degrees, and ${parsed.skills.length} skills.\n\nOpening builder now...`,
        [
          {
            text: "Continue to Builder",
            onPress: () =>
              navigate({
                name: "builder",
                title,
                targetRole,
                data: parsed,
              }),
          },
        ],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  const loadSample = () => {
    setRawText(SAMPLE_RAW_RESUME);
    setError("");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? <ErrorBanner message={error} /> : null}

        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.iconWrap}>
              <Text style={{ fontSize: 24 }}>📥</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>1-Click Resume & LinkedIn Importer</Text>
              <Text style={styles.heroSubtitle}>
                Paste any unformatted resume, PDF text, or LinkedIn profile. The AI will extract all fields, normalize dates to MM/YYYY, and build your resume automatically.
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <SectionHeading
              title="Paste Resume / LinkedIn Text"
              subtitle="Copy all text from your existing resume or LinkedIn profile"
            />
            <Button
              title="Load Sample"
              variant="outline"
              small
              icon="📄"
              onPress={loadSample}
            />
          </View>

          <TextField
            multiline
            numberOfLines={12}
            value={rawText}
            onChangeText={setRawText}
            placeholder="Paste raw text here... (e.g. John Doe, Experience, Education, Skills)"
            style={styles.textArea}
          />

          <Button
            title={busy || "Auto-Extract & Populate Resume"}
            icon="⚡"
            variant="primary"
            onPress={handleImport}
            loading={Boolean(busy)}
            style={{ marginTop: spacing.md }}
          />
        </Card>

        {busy ? <Loading label={busy} /> : null}

        {/* Benefits Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>✦ What Gets Extracted Automatically:</Text>
          <View style={styles.benefitRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.benefitText}>
              <Text style={{ fontWeight: "700" }}>Contact Details:</Text> Full Name, Email, Phone, City, LinkedIn.
            </Text>
          </View>
          <View style={styles.benefitRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.benefitText}>
              <Text style={{ fontWeight: "700" }}>Experience & Dates:</Text> Role titles, companies, MM/YYYY normalized dates, and individual achievement bullets.
            </Text>
          </View>
          <View style={styles.benefitRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.benefitText}>
              <Text style={{ fontWeight: "700" }}>Education & Skills:</Text> Degrees, majors, GPAs, and parsed technical skill tags.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },

  heroCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: fontSize.md + 2,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: fontSize.xs + 1,
    color: colors.textMuted,
    lineHeight: 18,
  },

  inputCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  textArea: {
    minHeight: 220,
    textAlignVertical: "top",
    fontSize: fontSize.sm,
    lineHeight: 20,
  },

  infoCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
  },
  infoTitle: {
    fontSize: fontSize.xs + 1,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs + 2,
    gap: spacing.xs + 2,
  },
  checkIcon: {
    fontSize: 13,
    color: colors.success,
    fontWeight: "700",
  },
  benefitText: {
    flex: 1,
    fontSize: fontSize.xs + 1,
    color: colors.text,
    lineHeight: 18,
  },
});
