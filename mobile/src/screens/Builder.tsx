import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { aiApi, resumesApi } from "../api";
import {
  AiAssistantModal,
  Button,
  Card,
  Chip,
  ErrorBanner,
  PillTabs,
  SectionHeading,
  TextField,
} from "../components";
import { showDialog } from "../dialog";
import { useNav } from "../navigation";
import { buildSourceText } from "../resumeText";
import { colors, fontSize, radius, shadows, spacing } from "../theme";
import { emptyResumeData, nextId, ResumeData, WorkExperience } from "../types";
import { getUserId } from "../userStore";

type Tab = "contact" | "summary" | "experience" | "education" | "skills" | "projects" | "certs";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "contact", label: "Contact", icon: "👤" },
  { key: "summary", label: "Summary", icon: "📝" },
  { key: "experience", label: "Experience", icon: "💼" },
  { key: "education", label: "Education", icon: "🎓" },
  { key: "skills", label: "Skills", icon: "⚡" },
  { key: "projects", label: "Projects", icon: "🚀" },
  { key: "certs", label: "Certs", icon: "🏆" },
];

interface BuilderProps {
  resumeId?: string;
  title?: string;
  targetRole?: string | null;
  data?: ResumeData;
}

export function BuilderScreen(props: BuilderProps) {
  const { navigate } = useNav();
  const [tab, setTab] = useState<Tab>("contact");
  const [title, setTitle] = useState(props.title ?? "Untitled Resume");
  const [targetRole, setTargetRole] = useState(props.targetRole ?? "");
  const [data, setData] = useState<ResumeData>(props.data ?? emptyResumeData());
  const [saving, setSaving] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState("");

  // AI Modal State
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiModalTitle, setAiModalTitle] = useState("");
  const [aiModalOriginal, setAiModalOriginal] = useState("");
  const [aiModalProposed, setAiModalProposed] = useState("");
  const [aiModalOnAccept, setAiModalOnAccept] = useState<(() => void) | null>(null);

  const patch = (p: Partial<ResumeData>) => setData((d) => ({ ...d, ...p }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const userId = await getUserId();
      if (props.resumeId) {
        await resumesApi.update(userId, props.resumeId, {
          title,
          data,
          targetRole: targetRole || null,
        });
      } else {
        await resumesApi.save(
          userId,
          title || "Untitled Resume",
          data,
          "modern",
          targetRole || null,
        );
      }
      navigate({ name: "dashboard" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const preview = () => {
    navigate({
      name: "preview",
      resumeId: props.resumeId,
      title: title || "Untitled Resume",
      data,
      unsaved: true,
    });
  };

  const aiSummary = async () => {
    setError("");
    const source = buildSourceText(data);
    if (!source.trim()) {
      setError("Please add some experience or education first so the AI has context.");
      return;
    }
    setBusyLabel("AI Generating Summary…");
    try {
      const result = await aiApi.generateSummary(source, targetRole || null);
      setAiModalTitle("AI Professional Summary");
      setAiModalOriginal(data.summary);
      setAiModalProposed(result.summary.trim());
      setAiModalOnAccept(() => () => {
        patch({ summary: result.summary.trim() });
        setAiModalVisible(false);
      });
      setAiModalVisible(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyLabel("");
    }
  };

  const aiSkills = async () => {
    setError("");
    const role = targetRole.trim() || (data.experience[0]?.position ?? "");
    if (!role) {
      setError("Please specify a Target Role at the top of the builder so AI can recommend relevant skills.");
      return;
    }
    setBusyLabel("Suggesting ATS Skills…");
    try {
      const current = data.skills.map((s) => s.name);
      const result = await aiApi.suggestSkills(role, current);
      const missing = result.skills.filter(
        (s) => !current.some((c) => c.toLowerCase() === s.toLowerCase()),
      );
      if (!missing.length) {
        showDialog("All Matched", "Your skills list already covers all top AI recommendations!");
        return;
      }
      setAiModalTitle("ATS In-Demand Skills");
      setAiModalOriginal(`Current Skills: ${current.join(", ") || "None"}`);
      setAiModalProposed(missing.join(" • "));
      setAiModalOnAccept(() => () => {
        patch({
          skills: [
            ...data.skills,
            ...missing.map((name) => ({ id: nextId("sk"), name })),
          ],
        });
        setAiModalVisible(false);
      });
      setAiModalVisible(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyLabel("");
    }
  };

  const aiSharpenBullets = async (expIndex: number) => {
    const exp = data.experience[expIndex];
    if (!exp) return;
    const raw = exp.bullets.filter(Boolean).join("\n");
    if (!raw.trim()) {
      setError("Add at least one bullet to sharpen first.");
      return;
    }
    setBusyLabel("Polishing bullets with ATS metrics…");
    setError("");
    try {
      const result = await aiApi.improveBullet(raw, exp.position);
      setAiModalTitle("Sharpened Experience Bullets");
      setAiModalOriginal(raw);
      setAiModalProposed(result.improved.trim());
      setAiModalOnAccept(() => () => {
        const lines = result.improved
          .split("\n")
          .map((l) => l.replace(/^[-•*]\s*/, "").trim())
          .filter(Boolean);
        const updated = [...data.experience];
        updated[expIndex] = { ...exp, bullets: lines };
        patch({ experience: updated });
        setAiModalVisible(false);
      });
      setAiModalVisible(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyLabel("");
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Sticky Header */}
      <View style={[styles.topBar, shadows.sm]}>
        {/* Row 1: Title Input + Preview & Save Buttons */}
        <View style={styles.topBarHeader}>
          <View style={styles.titleInputWrap}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Resume Title (e.g. Tech Lead)"
              placeholderTextColor={colors.textSubtle}
              style={styles.compactTitleInput}
            />
          </View>
          <View style={styles.topActionBtns}>
            <Button
              title="Preview"
              icon="👁️"
              variant="outline"
              small
              onPress={preview}
              style={styles.compactBtn}
            />
            <Button
              title={saving ? "Saving…" : "Save"}
              icon="💾"
              variant="primary"
              small
              onPress={save}
              loading={saving}
              style={styles.compactBtnSave}
            />
          </View>
        </View>

        {/* Row 2: Target Role Inline Editor */}
        <View style={styles.targetRoleSubRow}>
          <Text style={styles.targetRolePrefix}>🎯 Role:</Text>
          <TextInput
            value={targetRole ?? ""}
            onChangeText={setTargetRole}
            placeholder="Target role (e.g. Senior React Native Dev)"
            placeholderTextColor={colors.textSubtle}
            style={styles.targetRoleInput}
          />
        </View>

        {/* Row 3: Tab Navigation */}
        <PillTabs tabs={TABS} activeTab={tab} onTabChange={setTab} />
      </View>

      {/* Main Scroll Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? <ErrorBanner message={error} /> : null}

        {/* 1. CONTACT TAB */}
        {tab === "contact" ? (
          <Card style={styles.sectionCard}>
            <SectionHeading
              title="Contact Information"
              subtitle="Essential details for recruiter contact & ATS parsing"
            />
            <TextField
              label="Full Name *"
              value={data.contact.fullName}
              onChangeText={(fullName) =>
                patch({ contact: { ...data.contact, fullName } })
              }
              placeholder="e.g. Alex Morgan"
            />
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Email *"
                  value={data.contact.email}
                  onChangeText={(email) =>
                    patch({ contact: { ...data.contact, email } })
                  }
                  placeholder="alex@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Phone *"
                  value={data.contact.phone}
                  onChangeText={(phone) =>
                    patch({ contact: { ...data.contact, phone } })
                  }
                  placeholder="+1 (555) 019-2834"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <TextField
              label="Location (City, State / Country)"
              value={data.contact.location}
              onChangeText={(location) =>
                patch({ contact: { ...data.contact, location } })
              }
              placeholder="e.g. San Francisco, CA"
            />
            <TextField
              label="LinkedIn URL"
              value={data.contact.linkedin ?? ""}
              onChangeText={(linkedin) =>
                patch({ contact: { ...data.contact, linkedin: linkedin || undefined } })
              }
              placeholder="linkedin.com/in/alexmorgan"
              autoCapitalize="none"
            />
            <TextField
              label="Portfolio / GitHub URL"
              value={data.contact.website ?? ""}
              onChangeText={(website) =>
                patch({ contact: { ...data.contact, website: website || undefined } })
              }
              placeholder="github.com/alexmorgan"
              autoCapitalize="none"
            />
          </Card>
        ) : null}

        {/* 2. SUMMARY TAB */}
        {tab === "summary" ? (
          <Card style={styles.sectionCard}>
            <SectionHeading
              title="Professional Summary"
              subtitle="2-4 sentences highlighting your core impact and target role"
              rightAction={
                <Button
                  title="AI Generate"
                  icon="✨"
                  variant="sparkle"
                  small
                  loading={busyLabel.includes("Summary")}
                  onPress={aiSummary}
                />
              }
            />
            <TextField
              multiline
              numberOfLines={6}
              value={data.summary}
              onChangeText={(summary) => patch({ summary })}
              placeholder="Results-driven professional with 5+ years of experience in..."
              style={styles.summaryInput}
            />
            <View style={styles.atsTipBox}>
              <Text style={styles.atsTipIcon}>💡</Text>
              <Text style={styles.atsTipText}>
                ATS Tip: Include your target job title, years of experience, and 2-3 key technical proficiencies in your summary.
              </Text>
            </View>
          </Card>
        ) : null}

        {/* 3. EXPERIENCE TAB */}
        {tab === "experience" ? (
          <View>
            <View style={styles.sectionHeaderRow}>
              <SectionHeading
                title="Work Experience"
                subtitle="Quantified bullets starting with strong action verbs"
              />
              <Button
                title="+ Add Position"
                variant="outline"
                small
                onPress={() => {
                  const item: WorkExperience = {
                    id: nextId("exp"),
                    company: "",
                    position: "",
                    location: "",
                    startDate: "",
                    endDate: "",
                    current: false,
                    bullets: [""],
                  };
                  patch({ experience: [...data.experience, item] });
                }}
              />
            </View>

            {data.experience.length === 0 ? (
              <Card style={styles.emptyNotice}>
                <Text style={styles.emptyNoticeText}>
                  No work experience added yet. Tap “+ Add Position” to build your career history.
                </Text>
              </Card>
            ) : null}

            {data.experience.map((exp, idx) => (
              <Card key={exp.id || idx} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryNumber}>POSITION #{idx + 1}</Text>
                  <Pressable
                    onPress={() => {
                      const updated = data.experience.filter((_, i) => i !== idx);
                      patch({ experience: updated });
                    }}
                    hitSlop={10}
                  >
                    <Text style={styles.removeText}>Remove ✕</Text>
                  </Pressable>
                </View>

                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Company / Employer *"
                      value={exp.company}
                      onChangeText={(val) => {
                        const updated = [...data.experience];
                        updated[idx] = { ...exp, company: val };
                        patch({ experience: updated });
                      }}
                      placeholder="e.g. Acme Corp"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Job Title / Role *"
                      value={exp.position}
                      onChangeText={(val) => {
                        const updated = [...data.experience];
                        updated[idx] = { ...exp, position: val };
                        patch({ experience: updated });
                      }}
                      placeholder="e.g. Lead Engineer"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Start Date (MM/YYYY)"
                      value={exp.startDate}
                      onChangeText={(val) => {
                        const updated = [...data.experience];
                        updated[idx] = { ...exp, startDate: val };
                        patch({ experience: updated });
                      }}
                      placeholder="06/2021"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label={exp.current ? "End Date" : "End Date (MM/YYYY)"}
                      value={exp.current ? "Present" : exp.endDate}
                      editable={!exp.current}
                      onChangeText={(val) => {
                        const updated = [...data.experience];
                        updated[idx] = { ...exp, endDate: val };
                        patch({ experience: updated });
                      }}
                      placeholder="08/2023"
                    />
                  </View>
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>I currently work here</Text>
                  <Switch
                    value={exp.current}
                    onValueChange={(val) => {
                      const updated = [...data.experience];
                      updated[idx] = {
                        ...exp,
                        current: val,
                        endDate: val ? "Present" : "",
                      };
                      patch({ experience: updated });
                    }}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={exp.current ? colors.primary : "#f4f3f4"}
                  />
                </View>

                {/* Bullets Section */}
                <View style={styles.bulletsHeader}>
                  <Text style={styles.bulletsTitle}>Achievement Bullets</Text>
                  <Button
                    title="AI Polish"
                    icon="✨"
                    variant="sparkle"
                    small
                    loading={busyLabel.includes("Polishing")}
                    onPress={() => aiSharpenBullets(idx)}
                  />
                </View>

                {exp.bullets.map((b, bIdx) => (
                  <View key={bIdx} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <TextField
                      multiline
                      value={b}
                      onChangeText={(val) => {
                        const updated = [...data.experience];
                        const bullets = [...exp.bullets];
                        bullets[bIdx] = val;
                        updated[idx] = { ...exp, bullets };
                        patch({ experience: updated });
                      }}
                      placeholder="e.g. Spearheaded microservice migration reducing latency by 42%..."
                      style={styles.bulletInput}
                    />
                    <Pressable
                      onPress={() => {
                        const updated = [...data.experience];
                        const bullets = exp.bullets.filter((_, i) => i !== bIdx);
                        updated[idx] = { ...exp, bullets };
                        patch({ experience: updated });
                      }}
                      hitSlop={10}
                      style={styles.bulletRemoveBtn}
                    >
                      <Text style={styles.bulletRemoveText}>✕</Text>
                    </Pressable>
                  </View>
                ))}

                <Button
                  title="+ Add Bullet"
                  variant="ghost"
                  small
                  onPress={() => {
                    const updated = [...data.experience];
                    updated[idx] = { ...exp, bullets: [...exp.bullets, ""] };
                    patch({ experience: updated });
                  }}
                  style={{ alignSelf: "flex-start", marginTop: spacing.xs }}
                />
              </Card>
            ))}
          </View>
        ) : null}

        {/* 4. EDUCATION TAB */}
        {tab === "education" ? (
          <View>
            <View style={styles.sectionHeaderRow}>
              <SectionHeading
                title="Education"
                subtitle="Degrees, colleges/universities, and graduation dates"
              />
              <Button
                title="+ Add Degree"
                variant="outline"
                small
                onPress={() => {
                  const item = {
                    id: nextId("edu"),
                    institution: "",
                    degree: "",
                    field: "",
                    startDate: "",
                    endDate: "",
                    gpa: "",
                  };
                  patch({ education: [...data.education, item] });
                }}
              />
            </View>

            {data.education.map((edu, idx) => (
              <Card key={edu.id || idx} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryNumber}>DEGREE #{idx + 1}</Text>
                  <Pressable
                    onPress={() => {
                      const updated = data.education.filter((_, i) => i !== idx);
                      patch({ education: updated });
                    }}
                  >
                    <Text style={styles.removeText}>Remove ✕</Text>
                  </Pressable>
                </View>
                <TextField
                  label="Institution / University *"
                  value={edu.institution}
                  onChangeText={(val) => {
                    const updated = [...data.education];
                    updated[idx] = { ...edu, institution: val };
                    patch({ education: updated });
                  }}
                  placeholder="e.g. Stanford University"
                />
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Degree *"
                      value={edu.degree}
                      onChangeText={(val) => {
                        const updated = [...data.education];
                        updated[idx] = { ...edu, degree: val };
                        patch({ education: updated });
                      }}
                      placeholder="e.g. Bachelor of Science"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Major / Field of Study"
                      value={edu.field}
                      onChangeText={(val) => {
                        const updated = [...data.education];
                        updated[idx] = { ...edu, field: val };
                        patch({ education: updated });
                      }}
                      placeholder="Computer Science"
                    />
                  </View>
                </View>
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Graduation Date"
                      value={edu.endDate}
                      onChangeText={(val) => {
                        const updated = [...data.education];
                        updated[idx] = { ...edu, endDate: val };
                        patch({ education: updated });
                      }}
                      placeholder="05/2021"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="GPA (Optional)"
                      value={edu.gpa ?? ""}
                      onChangeText={(val) => {
                        const updated = [...data.education];
                        updated[idx] = { ...edu, gpa: val || undefined };
                        patch({ education: updated });
                      }}
                      placeholder="e.g. 3.8 / 4.0"
                    />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {/* 5. SKILLS TAB */}
        {tab === "skills" ? (
          <Card style={styles.sectionCard}>
            <SectionHeading
              title="Skills & Competencies"
              subtitle="Core hard skills & technologies recognizable by ATS parsers"
              rightAction={
                <Button
                  title="AI Suggest"
                  icon="⚡"
                  variant="sparkle"
                  small
                  loading={busyLabel.includes("Skills")}
                  onPress={aiSkills}
                />
              }
            />

            <View style={styles.skillsCloud}>
              {data.skills.map((skill, idx) => (
                <Chip
                  key={skill.id || idx}
                  label={skill.name}
                  tone="primary"
                  onPress={() => {
                    const updated = data.skills.filter((_, i) => i !== idx);
                    patch({ skills: updated });
                  }}
                  icon="✕"
                />
              ))}
            </View>

            <View style={styles.addSkillRow}>
              <View style={{ flex: 1 }}>
                <TextField
                  placeholder="Type a skill and tap Add (e.g. Python, Docker)…"
                  onSubmitEditing={(e) => {
                    const name = e.nativeEvent.text.trim();
                    if (name) {
                      patch({
                        skills: [...data.skills, { id: nextId("sk"), name }],
                      });
                    }
                  }}
                />
              </View>
            </View>
          </Card>
        ) : null}

        {/* 6. PROJECTS TAB */}
        {tab === "projects" ? (
          <View>
            <View style={styles.sectionHeaderRow}>
              <SectionHeading
                title="Projects"
                subtitle="Highlight key portfolio projects & technical stack"
              />
              <Button
                title="+ Add Project"
                variant="outline"
                small
                onPress={() => {
                  patch({
                    projects: [
                      ...data.projects,
                      {
                        id: nextId("proj"),
                        name: "",
                        description: "",
                        url: undefined,
                        technologies: [],
                      },
                    ],
                  });
                }}
              />
            </View>

            {data.projects.map((proj, idx) => (
              <Card key={proj.id || idx} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryNumber}>PROJECT #{idx + 1}</Text>
                  <Pressable
                    onPress={() => {
                      const updated = data.projects.filter((_, i) => i !== idx);
                      patch({ projects: updated });
                    }}
                  >
                    <Text style={styles.removeText}>Remove ✕</Text>
                  </Pressable>
                </View>
                <TextField
                  label="Project Name *"
                  value={proj.name}
                  onChangeText={(val) => {
                    const updated = [...data.projects];
                    updated[idx] = { ...proj, name: val };
                    patch({ projects: updated });
                  }}
                  placeholder="e.g. Real-Time Analytics Engine"
                />
                <TextField
                  label="Description"
                  multiline
                  value={proj.description}
                  onChangeText={(val) => {
                    const updated = [...data.projects];
                    updated[idx] = { ...proj, description: val };
                    patch({ projects: updated });
                  }}
                  placeholder="Describe impact, architecture, and results..."
                />
                <TextField
                  label="Live URL / Repository"
                  value={proj.url ?? ""}
                  onChangeText={(val) => {
                    const updated = [...data.projects];
                    updated[idx] = { ...proj, url: val || undefined };
                    patch({ projects: updated });
                  }}
                  placeholder="https://github.com/alex/analytics"
                  autoCapitalize="none"
                />
              </Card>
            ))}
          </View>
        ) : null}

        {/* 7. CERTIFICATIONS TAB */}
        {tab === "certs" ? (
          <View>
            <View style={styles.sectionHeaderRow}>
              <SectionHeading
                title="Certifications & Licenses"
                subtitle="Recognized credentials with issuer & dates"
              />
              <Button
                title="+ Add Cert"
                variant="outline"
                small
                onPress={() => {
                  patch({
                    certifications: [
                      ...data.certifications,
                      {
                        id: nextId("cert"),
                        name: "",
                        issuer: "",
                        date: "",
                        url: undefined,
                      },
                    ],
                  });
                }}
              />
            </View>

            {data.certifications.map((cert, idx) => (
              <Card key={cert.id || idx} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryNumber}>CERTIFICATE #{idx + 1}</Text>
                  <Pressable
                    onPress={() => {
                      const updated = data.certifications.filter((_, i) => i !== idx);
                      patch({ certifications: updated });
                    }}
                  >
                    <Text style={styles.removeText}>Remove ✕</Text>
                  </Pressable>
                </View>
                <TextField
                  label="Certification Name *"
                  value={cert.name}
                  onChangeText={(val) => {
                    const updated = [...data.certifications];
                    updated[idx] = { ...cert, name: val };
                    patch({ certifications: updated });
                  }}
                  placeholder="e.g. AWS Certified Solutions Architect"
                />
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Issuer"
                      value={cert.issuer}
                      onChangeText={(val) => {
                        const updated = [...data.certifications];
                        updated[idx] = { ...cert, issuer: val };
                        patch({ certifications: updated });
                      }}
                      placeholder="Amazon Web Services"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Date Received"
                      value={cert.date}
                      onChangeText={(val) => {
                        const updated = [...data.certifications];
                        updated[idx] = { ...cert, date: val };
                        patch({ certifications: updated });
                      }}
                      placeholder="04/2023"
                    />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* AI Assistant Modal for Bullet Polishing & Summaries */}
      <AiAssistantModal
        visible={aiModalVisible}
        title={aiModalTitle}
        originalText={aiModalOriginal}
        proposedText={aiModalProposed}
        onAccept={() => {
          if (aiModalOnAccept) aiModalOnAccept();
        }}
        onDiscard={() => setAiModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    backgroundColor: colors.surface,
    paddingTop: spacing.xs + 2,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  titleInputWrap: {
    flex: 1,
  },
  compactTitleInput: {
    height: 38,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.text,
    backgroundColor: colors.surfaceSubtle,
  },
  topActionBtns: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  compactBtn: {
    minHeight: 38,
    paddingHorizontal: spacing.sm + 2,
  },
  compactBtnSave: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  targetRoleSubRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs + 2,
    gap: 4,
  },
  targetRolePrefix: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.primary,
  },
  targetRoleInput: {
    flex: 1,
    height: 28,
    fontSize: fontSize.xs,
    color: colors.text,
    paddingVertical: 0,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryInput: {
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: fontSize.sm + 1,
    lineHeight: 22,
  },
  atsTipBox: {
    flexDirection: "row",
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
    gap: spacing.xs + 2,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  atsTipIcon: { fontSize: 16 },
  atsTipText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.primaryDark,
    lineHeight: 18,
    fontWeight: "500",
  },
  entryCard: {
    marginBottom: spacing.md,
    padding: spacing.md + 2,
    borderRadius: radius.lg,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  entryNumber: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  removeText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  switchLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "500",
  },
  bulletsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: spacing.xs,
  },
  bulletsTitle: {
    fontSize: fontSize.xs + 1,
    fontWeight: "700",
    color: colors.text,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  bulletDot: {
    fontSize: 18,
    color: colors.primary,
    marginTop: 8,
  },
  bulletInput: {
    flex: 1,
    minHeight: 44,
    fontSize: fontSize.sm,
  },
  bulletRemoveBtn: {
    padding: 8,
    marginTop: 6,
  },
  bulletRemoveText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  skillsCloud: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: spacing.sm,
  },
  addSkillRow: {
    marginTop: spacing.sm,
  },
  emptyNotice: {
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  emptyNoticeText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});