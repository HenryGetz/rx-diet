// ─── Reactive Resume V5 Data Model Types ────────────────────────────────
// Shared type definitions for the rx-diet project.
// Mirrors the Reactive Resume V5 JSON schema (resume.schema.json).

// ─── Base types ─────────────────────────────────────────────────────────

export interface ResumeData {
  picture: Picture;
  basics: Basics;
  summary: SummarySection;
  sections: Sections;
  customSections: CustomSection[];
  metadata: Metadata;
  [key: string]: unknown; // allow extra fields from real exports
}

export interface Picture {
  hidden: boolean;
  url: string;
  size: number;
  rotation: number;
  aspectRatio: number;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
  shadowColor: string;
  shadowWidth: number;
}

export interface Basics {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: Website;
  customFields: CustomField[];
}

export interface Website {
  url: string;
  label: string;
}

export interface CustomField {
  id: string;
  icon: string;
  text: string;
}

export interface BaseSection {
  title: string;
  columns: number;
  hidden: boolean;
}

export interface BaseItem {
  id: string;
  hidden: boolean;
}

export interface SummarySection extends BaseSection {
  content: string; // HTML
}

// ─── Section container ──────────────────────────────────────────────────

export interface Sections {
  profiles: ProfilesSection;
  experience: ExperienceSection;
  education: EducationSection;
  projects: ProjectsSection;
  skills: SkillsSection;
  languages: LanguagesSection;
  interests: InterestsSection;
  awards: AwardsSection;
  certifications: CertificationsSection;
  publications: PublicationsSection;
  volunteer: VolunteerSection;
  references: ReferencesSection;
}

// ─── Profiles ───────────────────────────────────────────────────────────

export interface ProfilesSection extends BaseSection {
  items: ProfileItem[];
}

export interface ProfileItem extends BaseItem {
  icon: string;
  iconColor: string;
  network: string;
  username: string;
  website: Website;
}

// ─── Experience ─────────────────────────────────────────────────────────

export interface ExperienceSection extends BaseSection {
  items: ExperienceItem[];
}

export interface ExperienceItem extends BaseItem {
  company: string;
  position: string;
  location: string;
  period: string;
  website: Website;
  description: string; // HTML
  roles?: RoleItem[];
}

export interface RoleItem {
  id: string;
  position: string;
  period: string;
  description: string;
}

// ─── Education ──────────────────────────────────────────────────────────

export interface EducationSection extends BaseSection {
  items: EducationItem[];
}

export interface EducationItem extends BaseItem {
  school: string;
  degree: string;
  area: string;
  grade: string;
  location: string;
  period: string;
  website: Website;
  description: string;
}

// ─── Projects ───────────────────────────────────────────────────────────

export interface ProjectsSection extends BaseSection {
  items: ProjectItem[];
}

export interface ProjectItem extends BaseItem {
  name: string;
  period: string;
  website: Website;
  description: string;
}

// ─── Skills ─────────────────────────────────────────────────────────────

export interface SkillsSection extends BaseSection {
  items: SkillItem[];
}

export interface SkillItem extends BaseItem {
  name: string;
  proficiency: string;
  level: number;
  icon: string;
  iconColor: string;
  keywords: string[];
}

// ─── Languages ──────────────────────────────────────────────────────────

export interface LanguagesSection extends BaseSection {
  items: LanguageItem[];
}

export interface LanguageItem extends BaseItem {
  language: string;
  fluency: string;
  level: number;
}

// ─── Interests ──────────────────────────────────────────────────────────

export interface InterestsSection extends BaseSection {
  items: InterestItem[];
}

export interface InterestItem extends BaseItem {
  name: string;
  icon: string;
  iconColor: string;
  keywords: string[];
}

// ─── Awards ─────────────────────────────────────────────────────────────

export interface AwardsSection extends BaseSection {
  items: AwardItem[];
}

export interface AwardItem extends BaseItem {
  title: string;
  awarder: string;
  date: string;
  website: Website;
  description: string;
}

// ─── Certifications ─────────────────────────────────────────────────────

export interface CertificationsSection extends BaseSection {
  items: CertificationItem[];
}

export interface CertificationItem extends BaseItem {
  title: string;
  issuer: string;
  date: string;
  website: Website;
  description: string;
}

// ─── Publications ───────────────────────────────────────────────────────

export interface PublicationsSection extends BaseSection {
  items: PublicationItem[];
}

export interface PublicationItem extends BaseItem {
  title: string;
  publisher: string;
  date: string;
  website: Website;
  description: string;
}

// ─── Volunteer ──────────────────────────────────────────────────────────

export interface VolunteerSection extends BaseSection {
  items: VolunteerItem[];
}

export interface VolunteerItem extends BaseItem {
  organization: string;
  position: string;
  location: string;
  period: string;
  website: Website;
  description: string;
}

// ─── References ─────────────────────────────────────────────────────────

export interface ReferencesSection extends BaseSection {
  items: ReferenceItem[];
}

export interface ReferenceItem extends BaseItem {
  name: string;
  position: string;
  phone: string;
  website: Website;
  description: string;
}

// ─── Custom sections ────────────────────────────────────────────────────

export interface CustomSection extends BaseSection {
  id: string;
  type: string;
  items: Record<string, unknown>[];
}

// ─── Metadata ───────────────────────────────────────────────────────────

export interface Metadata {
  template: string;
  layout: { sidebarWidth: number; pages: PageLayout[] };
  page: {
    gapX: number;
    gapY: number;
    marginX: number;
    marginY: number;
    format: string;
    locale: string;
    hideIcons: boolean;
  };
  design: {
    level: { icon: string; type: string };
    colors: { primary: string; text: string; background: string };
  };
  typography: {
    body: TypographyItem;
    heading: TypographyItem;
  };
  notes: string;
}

export interface PageLayout {
  fullWidth: boolean;
  main: string[];
  sidebar: string[];
}

export interface TypographyItem {
  fontFamily: string;
  fontWeights: string[];
  fontSize: number;
  lineHeight: number;
}

// ─── Frontmatter type ───────────────────────────────────────────────────

export interface RxFrontmatter {
  rx_diet_version: number;
  rxresume_schema: string;
  source: string;
  generated: string;
  id_map?: Record<string, string>; // optional — now stored in .rxresume.lock.json
}

// ─── Identity resolution ────────────────────────────────────────────────

export type SectionName = keyof Sections;

// ─── Asset sentinel ─────────────────────────────────────────────────────

export const ASSET_SENTINEL_PREFIX = '__rx_diet_asset__:';
