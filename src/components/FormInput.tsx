import { View, TextInput, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
};

const FormInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
      />
    </View>
  );
};

export default FormInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  label: {
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.grayLight,
    borderRadius: 10,
    padding: 12,
    color: colors.textPrimary,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
});