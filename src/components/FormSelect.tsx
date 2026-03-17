import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { colors } from "../theme/colors";

type Props = {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
};

const FormSelect = ({ label, value, options, onSelect }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={styles.select}
        onPress={() => setOpen(!open)}
      >
        <Text style={{ color: value ? colors.textPrimary : colors.textMuted }}>
          {value || "Selecciona el nivel"}
        </Text>

        <MaterialDesignIcons name="chevron-down" size={20} />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={styles.option}
              onPress={() => {
                onSelect(opt);
                setOpen(false);
              }}
            >
              <Text>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default FormSelect;

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  label: {
    fontWeight: "600",
    marginBottom: 6,
  },
  select: {
    borderWidth: 1,
    borderColor: colors.grayLight,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.grayLight,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  option: {
    padding: 12,
  },
});