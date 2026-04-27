import { StyleSheet } from "react-native";
import { colors } from "./colors";

export const shared = StyleSheet.create({
  // ── Layout ──────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  content: {
    padding: 24,
  },

  // ── Header (franja degradado superior) ──────────────────────────────────
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "600",
  },
  headerSubtitle: {
    color: colors.headerSubtitle,
    fontSize: 12,
  },

  // ── Tipografía ───────────────────────────────────────────────────────────
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },

  // ── Tarjetas ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },

  // ── Formulario ───────────────────────────────────────────────────────────
  label: {
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.grayLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: colors.errorRed,
    fontSize: 12,
    marginTop: 6,
  },

  // ── Botón primario ───────────────────────────────────────────────────────
  primaryButton: {
    backgroundColor: colors.primaryGradientStart,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },

  // ── Círculo de icono ─────────────────────────────────────────────────────
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primaryGradientStart,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },

  // ── Fila genérica ────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
