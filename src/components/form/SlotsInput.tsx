import { View, Text, TextInput, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onValidChange?: (isValid: boolean) => void;
};

const SlotsInput = ({ label, value, onChangeText, onValidChange }: Props) => {
  const handleChange = (text: string) => {
    // Solo permitir números
    const numericOnly = text.replace(/[^0-9]/g, "");
    onChangeText(numericOnly);

    // Validar: debe ser >= 2
    const numValue = parseInt(numericOnly, 10);
    const isValid = !Number.isNaN(numValue) && numValue >= 2;
    onValidChange?.(isValid || numericOnly === ""); // válido si está vacío o >= 2
  };

  const numValue = parseInt(value, 10);
  const isValid = !Number.isNaN(numValue) && numValue >= 2;
  const isEmpty = value === "";
  const showError = !isEmpty && !isValid;

  return (
    <View>
      <Text style={styles.label}>{label} *</Text>
      <TextInput
        style={[styles.input, showError && styles.inputError]}
        value={value}
        onChangeText={handleChange}
        placeholder="Mínimo 2 plazas"
        keyboardType="numeric"
        placeholderTextColor={colors.textMuted}
      />
      {showError && (
        <Text style={styles.errorText}>Mínimo 2 plazas</Text>
      )}
      {!isEmpty && isValid && (
        <Text style={styles.successText}>✓ {value} plazas</Text>
      )}
    </View>
  );
};

export default SlotsInput;

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.grayLight,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputError: {
    borderColor: colors.errorRed,
    backgroundColor: colors.hardBg,
  },
  errorText: {
    color: colors.errorRed,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  successText: {
    color: colors.successGreen,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
});
